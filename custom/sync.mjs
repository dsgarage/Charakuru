import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {root, latestRelease, upstream} from './release.mjs';
import {applyOverlay, overlayDigest, digest} from './overlay.mjs';
import {smoke} from './smoke.mjs';
const exec = promisify(execFile);

export function checkedPath(base, relative) {
  if (typeof relative !== 'string' || relative.includes('\\') || relative.includes(':')) throw Error('不正な相対パス');
  const full = path.resolve(base, relative);
  if (!full.startsWith(path.resolve(base) + path.sep)) throw Error('ディレクトリ外へのパス');
  return full;
}
export async function verifyManifest(directory, version) {
  const manifest = JSON.parse(await fs.readFile(path.join(directory, 'RELEASE-MANIFEST.json'), 'utf8'));
  if (manifest.product !== 'Charakuru' || manifest.version !== version || !Array.isArray(manifest.files) || !manifest.files.length) throw Error('公式マニフェストの版・形式が一致しません。');
  const seen = new Set();
  for (const entry of manifest.files) {
    const target = checkedPath(directory, entry.path);
    if (seen.has(target) || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw Error('公式マニフェストの項目が不正です。');
    seen.add(target);
    if (digest(await fs.readFile(target)) !== entry.sha256) throw Error(`公式ファイルのSHA-256不一致: ${entry.path}`);
  }
  for (const file of ['LICENSE', 'package.json', 'server.mjs', 'public/handoff.mjs', 'public/session-prompts.mjs']) {
    if (!seen.has(path.join(directory, file))) throw Error(`必須ファイルがマニフェストにありません: ${file}`);
  }
  const pkg = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'));
  if (pkg.version !== version) throw Error('package.jsonの版が一致しません。');
  const normalize = text => text.replaceAll('\r\n', '\n').trim();
  if (normalize(await fs.readFile(path.join(directory, 'LICENSE'), 'utf8')) !== normalize(await fs.readFile(path.join(root, 'LICENSE'), 'utf8'))) throw Error('公式ライセンスが変わっています。内容確認後に更新してください。');
}
async function treeHashes(directory, relative = '') {
  const result = {};
  for (const entry of await fs.readdir(path.join(directory, relative), {withFileTypes: true})) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw Error(`実行環境に予期しないリンクがあります: ${name}`);
    if (entry.isDirectory()) Object.assign(result, await treeHashes(directory, name));
    else if (entry.name !== '.installed.json') result[name] = digest(await fs.readFile(path.join(directory, name)));
  }
  return result;
}
export async function verifyInstalled(directory) {
  const installed = JSON.parse(await fs.readFile(path.join(directory, '.installed.json'), 'utf8'));
  for (const [name, expected] of Object.entries(installed.files)) {
    const actual = digest(await fs.readFile(checkedPath(directory, name)));
    if (actual !== expected) throw Error(`実行環境のローカル変更を検出しました: ${name}。上書きせず停止します。`);
  }
  return installed;
}
export async function activate(state, stateFile = path.join(root, '.runtime/current.json')) {
  await fs.writeFile(stateFile + '.new', JSON.stringify(state, null, 2) + '\n');
  await fs.rename(stateFile + '.new', stateFile);
}
export async function sync({locked = false, offline = false} = {}) {
  const cache = path.join(root, '.runtime');
  await fs.mkdir(cache, {recursive: true});
  const mutex = path.join(cache, 'sync.lock');
  try { await fs.mkdir(mutex); } catch (e) {
    if (e.code === 'EEXIST') throw Error('更新処理のロックがあります。別の更新処理がないことを確認してください。');
    throw e;
  }
  let staging;
  try {
    if (offline) {
      const state = JSON.parse(await fs.readFile(path.join(cache, 'current.json'), 'utf8'));
      await verifyInstalled(state.directory);
      if (state.overlay !== await overlayDigest()) throw Error('カスタムが変更されています。オンラインで再適用してください。');
      await smoke(state.directory);
      console.log(`明示指定のオフライン起動: ${state.release.tag}（最新版確認なし）`);
      return state;
    }
    const remote = (await exec('git', ['remote', 'get-url', 'upstream'], {cwd: root})).stdout.trim();
    if (![ `https://github.com/${upstream}.git`, `git@github.com:${upstream}.git` ].includes(remote)) throw Error('upstreamが公式リポジトリを指していません。');
    await exec('git', ['fetch', '--prune', 'upstream'], {cwd: root, timeout: 60000});
    const release = locked ? JSON.parse(await fs.readFile(path.join(root, 'custom/upstream-release.json'), 'utf8')) : await latestRelease();
    if (release.repository !== upstream || !/^v\d+\.\d+\.\d+$/.test(release.tag) || release.version !== release.tag.slice(1) || !/^[a-f0-9]{64}$/.test(release.sha256)
      || !release.url.startsWith(`https://github.com/${upstream}/releases/download/${release.tag}/`)) throw Error('Release取得記録が不正です。');
    const overlay = await overlayDigest();
    const destination = path.join(cache, 'releases', `${release.tag}-${release.sha256.slice(0, 12)}-${overlay.slice(0, 12)}`);
    let exists = false;
    try { await fs.access(destination); exists = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (exists) await verifyInstalled(destination);
    else {
      console.log(`公式 ${release.tag} を取得・検証しています。`);
      staging = await fs.mkdtemp(path.join(cache, 'staging-'));
      const response = await fetch(release.url, {signal: AbortSignal.timeout(120000)});
      if (!response.ok) throw Error(`公式ZIPの取得失敗: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (digest(bytes) !== release.sha256) throw Error('公式ZIPのSHA-256が一致しません。');
      const archive = path.join(staging, 'release.zip'), kit = path.join(staging, 'kit');
      await fs.writeFile(archive, bytes);
      const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
      await exec(python, [path.join(root, 'custom/extract.py'), archive, kit], {timeout: 60000});
      await verifyManifest(kit, release.version);
      await applyOverlay(kit);
      await smoke(kit);
      await fs.writeFile(path.join(kit, '.installed.json'), JSON.stringify({release, overlay, files: await treeHashes(kit)}, null, 2));
      await fs.mkdir(path.dirname(destination), {recursive: true});
      await fs.rename(kit, destination);
    }
    const verification = await smoke(destination);
    const state = {release, overlay, directory: destination, checkedAt: new Date().toISOString(), verification};
    await activate(state);
    console.log(`利用版: ${release.tag} / カスタム適用・起動検証済み`);
    return state;
  } finally {
    if (staging) await fs.rm(staging, {recursive: true, force: true});
    await fs.rm(mutex, {recursive: true, force: true});
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await sync({locked: process.argv.includes('--locked'), offline: process.argv.includes('--offline')}); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
