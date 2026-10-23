import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {readWork, writeWork} from '../custom/work-status.mjs';
const exec = promisify(execFile);
const cli = fileURLToPath(new URL('../custom/work-status.mjs', import.meta.url));

test('複数工程を同時記録し、終了後も履歴を確認できる', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'charakuru-work-'));
  t.after(() => fs.rm(temp, {recursive: true, force: true}));
  const file = path.join(temp, 'status.json');
  const [a, b] = await Promise.all([
    writeWork({action: 'start', stage: 'セグメント化', detail: '頭を処理'}, file),
    writeWork({action: 'start', stage: '画像', detail: '体を確認'}, file)
  ]);
  assert.equal((await readWork(file)).jobs.length, 2);
  await writeWork({action: 'update', id: a.id, detail: '結果を点検中'}, file);
  await writeWork({action: 'finish', id: a.id, detail: '確認待ち'}, file);
  await writeWork({action: 'fail', id: b.id, detail: '入力不足'}, file);
  const result = await readWork(file);
  assert.equal(result.jobs.find(j => j.id === a.id).state, 'complete');
  assert.equal(result.jobs.find(j => j.id === a.id).history.length, 3);
  assert.equal(result.jobs.find(j => j.id === b.id).state, 'failed');
  await assert.rejects(writeWork({action: 'update', id: a.id, detail: '再開'}, file), /実行中の作業ID/);
});

test('外部コマンドの成功・失敗を画面用状態に残す', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'charakuru-work-run-'));
  t.after(() => fs.rm(temp, {recursive: true, force: true}));
  const file = path.join(temp, 'status.json'), env = {...process.env, CHARAKIT_WORK_STATUS_FILE: file};
  await exec(process.execPath, [cli, 'run', 'セグメント化', 'Windows作業', '--', process.execPath, '-e', 'process.exit(0)'], {env});
  await assert.rejects(exec(process.execPath, [cli, 'run', 'UV', '展開作業', '--', process.execPath, '-e', 'process.exit(7)'], {env}));
  const result = await readWork(file);
  assert.equal(result.jobs[0].state, 'failed');
  assert.match(result.jobs[0].detail, /終了コード 7/);
  assert.equal(result.jobs[1].state, 'complete');
});
