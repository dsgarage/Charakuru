import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const empty = () => ({version: 1, jobs: []});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function statusFile() {
  if (process.env.CHARAKIT_WORK_STATUS_FILE) return path.resolve(process.env.CHARAKIT_WORK_STATUS_FILE);
  if (path.basename(here) === 'custom') return path.resolve(here, '../.local/work-status.json');
  const config = JSON.parse(await fs.readFile(path.join(here, 'dsgarage-workspace.json'), 'utf8'));
  if (typeof config.statusFile !== 'string' || !path.isAbsolute(config.statusFile)) throw Error('制作状況の保存先が不正です。');
  return config.statusFile;
}

export async function readWork(file) {
  file ||= await statusFile();
  try {
    const state = JSON.parse(await fs.readFile(file, 'utf8'));
    if (state.version !== 1 || !Array.isArray(state.jobs)) throw Error('制作状況の形式が不正です。');
    return state;
  } catch (error) {
    if (error.code === 'ENOENT') return empty();
    throw error;
  }
}

function short(value, field, max = 300) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw Error(`${field}が不正です。`);
  return value.trim();
}

export async function writeWork(event, file) {
  file ||= await statusFile();
  if (!event || !['start', 'update', 'finish', 'fail'].includes(event.action)) throw Error('制作状況の操作が不正です。');
  await fs.mkdir(path.dirname(file), {recursive: true});
  const lock = `${file}.lock`;
  let acquired = false;
  for (let i = 0; i < 60; i++) {
    try { await fs.mkdir(lock); acquired = true; break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let age;
      try { age = Date.now() - (await fs.stat(lock)).mtimeMs; }
      catch (missing) { if (missing.code === 'ENOENT') continue; throw missing; }
      if (age > 30000) await fs.rm(lock, {recursive: true, force: true});
      else await pause(25);
    }
  }
  if (!acquired) throw Error('制作状況の更新が混み合っています。');
  try {
    const state = await readWork(file), now = new Date().toISOString();
    let job;
    if (event.action === 'start') {
      job = {id: randomUUID(), stage: short(event.stage, '工程', 80), detail: short(event.detail, '作業内容'), state: 'running', startedAt: now, updatedAt: now, history: []};
      state.jobs.unshift(job);
      state.jobs = state.jobs.slice(0, 20);
    } else {
      job = state.jobs.find(item => item.id === event.id);
      if (!job || job.state !== 'running') throw Error('実行中の作業IDが見つかりません。');
      if (event.detail !== undefined) job.detail = short(event.detail, '作業内容');
      job.updatedAt = now;
      if (event.action === 'finish' || event.action === 'fail') {
        job.state = event.action === 'finish' ? 'complete' : 'failed';
        job.endedAt = now;
      }
    }
    if (event.action !== 'update' || job.history.at(-1)?.detail !== job.detail) {
      job.history.push({at: now, detail: job.detail, state: job.state});
      job.history = job.history.slice(-30);
    }
    const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
    try { await fs.writeFile(temp, JSON.stringify(state, null, 2) + '\n'); await fs.rename(temp, file); }
    finally { await fs.rm(temp, {force: true}); }
    return job;
  } finally { await fs.rm(lock, {recursive: true, force: true}); }
}

export function createWorkStatusHandler() {
  return async (req, res, pathname) => {
    if (pathname !== '/api/dsgarage/work') return false;
    const send = (code, value) => { res.writeHead(code, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}); res.end(JSON.stringify(value)); };
    try {
      if (req.method === 'GET') send(200, await readWork());
      else if (req.method === 'POST') {
        let input = '';
        for await (const chunk of req) { input += chunk; if (input.length > 8192) throw Error('制作状況の更新が大きすぎます。'); }
        send(200, await writeWork(JSON.parse(input)));
      } else send(405, {error: 'Method not allowed'});
    } catch (error) { send(400, {error: error.message}); }
    return true;
  };
}

async function run(stage, detail, command) {
  if (!command.length) throw Error('実行コマンドを指定してください。');
  const job = await writeWork({action: 'start', stage, detail});
  let child;
  try {
    child = spawn(command[0], command.slice(1), {stdio: 'inherit'});
    const heartbeat = setInterval(() => writeWork({action: 'update', id: job.id}).catch(error => console.error(error.message)), 5000);
    const result = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', code => resolve(code));
    }).finally(() => clearInterval(heartbeat));
    await writeWork({action: result === 0 ? 'finish' : 'fail', id: job.id, detail: result === 0 ? `${detail}：処理終了。結果を確認してください。` : `${detail}：終了コード ${result}`});
    if (result !== 0) process.exitCode = result || 1;
  } catch (error) {
    await writeWork({action: 'fail', id: job.id, detail: `${detail}：${error.message}`});
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [action, ...args] = process.argv.slice(2);
    if (action === 'run') {
      const marker = args.indexOf('--');
      if (marker < 2) throw Error('使用法: run 工程 作業内容 -- コマンド [引数...]');
      await run(args[0], args[1], args.slice(marker + 1));
    } else if (action === 'start') console.log((await writeWork({action, stage: args[0], detail: args[1]})).id);
    else if (['update', 'finish', 'fail'].includes(action)) await writeWork({action, id: args[0], detail: args[1]});
    else throw Error('使用法: start 工程 内容 / update|finish|fail ID 内容 / run 工程 内容 -- コマンド');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
