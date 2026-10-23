import path from 'node:path';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {root} from './release.mjs';
import {sync} from './sync.mjs';

try {
  const state = await sync({offline: process.argv.includes('--offline')});
  const local = path.join(root, '.local');
  await fs.mkdir(path.join(local, 'projects'), {recursive: true});
  const env = {...process.env,
    PORT: process.env.PORT || '8767',
    CHARAKIT_PROJECTS_ROOT: process.env.CHARAKIT_PROJECTS_ROOT || path.join(local, 'projects'),
    CHARAKIT_SESSION_FILE: process.env.CHARAKIT_SESSION_FILE || path.join(local, 'session.json'),
    CHARAKIT_CONFIG: process.env.CHARAKIT_CONFIG || path.join(local, 'config.json')};
  console.log(`制作データ: ${env.CHARAKIT_PROJECTS_ROOT}`);
  const child = spawn(process.execPath, [path.join(state.directory, 'server.mjs')], {cwd: state.directory, env, stdio: 'inherit'});
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.once('error', error => { console.error(error.message); process.exitCode = 1; });
  child.once('exit', code => { process.exitCode = code ?? 1; });
} catch (error) {
  console.error(`起動を停止しました: ${error.message}\n前の環境・制作データは保持されています。明示的に前の版を使う場合は npm start -- --offline。`);
  process.exitCode = 1;
}
