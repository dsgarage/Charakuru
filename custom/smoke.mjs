import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {root} from './release.mjs';

export async function smoke(directory) {
  const skill = await fs.readFile(path.join(directory, 'skills/tripo-agent-workflow/SKILL.md'), 'utf8');
  if (skill.includes('**Smart Mesh P2.0、四角面、25,000、生成数4**') || !skill.includes('Smart UVを必ず実行')) throw Error('制作Skillにカスタム工程が反映されていません。');
  for (const file of ['scripts/export-segmentation.py', 'scripts/tripo-project.mjs', 'scripts/agent-session.mjs']) await fs.access(path.join(directory, file));
  const {sessionPrompt} = await import(pathToFileURL(path.join(directory, 'public/session-prompts.mjs')));
  const {productionHandoff} = await import(pathToFileURL(path.join(directory, 'public/handoff.mjs')));
  for (const locale of ['ja', 'en', 'ko', 'zh-CN']) {
    const candidate = sessionPrompt({kind: 'candidates', id: 'smoke'}, directory, 'http://127.0.0.1:18766', locale);
    const material = sessionPrompt({kind: 'materials', id: 'smoke'}, directory, 'http://127.0.0.1:18766', locale);
    if (!candidate.includes('ハイポリ原本') || candidate.includes('25,000') || !candidate.includes(' begin ')) throw Error('候補生成のカスタム依頼文が不正です。');
    if (!material.includes('Smart UVを必ず実行') || !material.includes('セグメント化')) throw Error('Smart UV必須の依頼文が不正です。');
    const handoff = productionHandoff({assets: []}, 'sample.charakit', locale, 'tripo-generate');
    if (!handoff.includes('ハイポリ原本') || handoff.includes('25,000')) throw Error('旧依頼経路に低ポリ指定が残っています。');
    const unchanged = sessionPrompt({kind: 'images', id: 'smoke'}, directory, 'http://127.0.0.1:18766', locale);
    if (!unchanged.includes('begin')) throw Error('公式の画像工程を保持できていません。');
  }
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const value = server.address().port; server.close(() => resolve(value)); });
  });
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'charakuru-smoke-'));
  const child = spawn(process.execPath, [path.join(directory, 'server.mjs')], {cwd: directory, env: {...process.env, PORT: String(port), CHARAKIT_PROJECTS_ROOT: path.join(temp, 'projects'), CHARAKIT_SESSION_FILE: path.join(temp, 'session.json'), CHARAKIT_CONFIG: path.join(temp, 'config.json')}, stdio: ['ignore', 'pipe', 'pipe']});
  let logs = ''; child.stdout.on('data', c => logs += c); child.stderr.on('data', c => logs += c);
  const ended = new Promise(resolve => child.once('close', resolve));
  let error; child.once('error', e => { error = e; });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (error || child.exitCode !== null) throw error || Error(`アプリ起動失敗: ${logs}`);
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`, {signal: AbortSignal.timeout(1000)});
        if (response.ok && (await response.text()).includes('dsgarage 非公式カスタム')) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw Error(`アプリ起動がタイムアウトしました: ${logs}`);
    const response = await fetch(`http://127.0.0.1:${port}/api/samples`);
    if (!response.ok || typeof (await response.json()) !== 'object') throw Error('API確認に失敗しました。');
  } finally {
    if (child.exitCode === null) child.kill();
    await ended;
    await fs.rm(temp, {recursive: true, force: true});
  }
  return {passed: true, locales: ['ja', 'en', 'ko', 'zh-CN'], http: true, projectData: 'isolated'};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const state = JSON.parse(await fs.readFile(path.join(root, '.runtime/current.json'), 'utf8'));
  console.log(JSON.stringify(await smoke(state.directory)));
}
