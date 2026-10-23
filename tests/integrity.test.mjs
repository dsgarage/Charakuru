import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {root} from '../custom/release.mjs';
import {digest} from '../custom/overlay.mjs';
import {checkedPath, verifyManifest, verifyInstalled, activate} from '../custom/sync.mjs';

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'charakuru-test-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const files = {'LICENSE': await fs.readFile(path.join(root, 'LICENSE'), 'utf8'),
    'package.json': JSON.stringify({version: '1.1.0'}), 'server.mjs': '// fixture',
    'public/handoff.mjs': '// fixture', 'public/session-prompts.mjs': '// fixture'};
  for (const [name, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(directory, name)), {recursive: true});
    await fs.writeFile(path.join(directory, name), content);
  }
  const manifest = {product: 'Charakuru', version: '1.1.0', files: Object.entries(files).map(([name, content]) => ({path: name, sha256: digest(content)}))};
  await fs.writeFile(path.join(directory, 'RELEASE-MANIFEST.json'), JSON.stringify(manifest));
  return {directory, manifest};
}
test('マニフェストを検証し、改変された公式ファイルを拒否する', async t => {
  const {directory} = await fixture(t);
  await verifyManifest(directory, '1.1.0');
  await fs.appendFile(path.join(directory, 'server.mjs'), 'changed');
  await assert.rejects(verifyManifest(directory, '1.1.0'), /SHA-256不一致/);
});
test('版・必須ファイル・ライセンスの不一致を拒否する', async t => {
  const {directory, manifest} = await fixture(t);
  await assert.rejects(verifyManifest(directory, '9.9.9'), /版・形式/);
  const removed = manifest.files.pop();
  await fs.writeFile(path.join(directory, 'RELEASE-MANIFEST.json'), JSON.stringify(manifest));
  await assert.rejects(verifyManifest(directory, '1.1.0'), /必須ファイル/);
  manifest.files.push(removed);
  await fs.writeFile(path.join(directory, 'LICENSE'), 'changed license');
  manifest.files.find(f => f.path === 'LICENSE').sha256 = digest('changed license');
  await fs.writeFile(path.join(directory, 'RELEASE-MANIFEST.json'), JSON.stringify(manifest));
  await assert.rejects(verifyManifest(directory, '1.1.0'), /ライセンスが変わって/);
});
test('パスの逸脱を拒否する', () => {
  for (const input of ['../outside', '/outside', 'C:\\outside', 'public\\file']) assert.throws(() => checkedPath('/kit', input));
  assert.equal(checkedPath('/kit', 'public/file'), '/kit/public/file');
});
test('ローカル改変を検出しても既存の利用版を変更しない', async t => {
  const {directory} = await fixture(t);
  await fs.writeFile(path.join(directory, '.installed.json'), JSON.stringify({files: {'server.mjs': digest('// fixture')}}));
  await verifyInstalled(directory);
  const pointer = path.join(directory, 'current.json');
  await activate({version: 'previous'}, pointer);
  await fs.appendFile(path.join(directory, 'server.mjs'), 'changed');
  await assert.rejects(async () => {
    await verifyInstalled(directory);
    await activate({version: 'new'}, pointer);
  }, /ローカル変更/);
  assert.equal(JSON.parse(await fs.readFile(pointer, 'utf8')).version, 'previous');
});
