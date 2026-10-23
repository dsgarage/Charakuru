import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const upstream = 'nanocle/Charakuru';
export function selectRelease(release) {
  if (release.draft || release.prerelease || !/^v\d+\.\d+\.\d+$/.test(release.tag_name)) throw Error('安定版Releaseを確認できません。');
  const version = release.tag_name.slice(1);
  const assets = release.assets.filter(a => a.name.startsWith(`charakuru-${version}-`) && a.name.endsWith('.zip'));
  if (assets.length !== 1) throw Error('公式キットZIPを一意に選択できません。');
  const asset = assets[0];
  if (!/^sha256:[0-9a-f]{64}$/.test(asset.digest || '')) throw Error('公式ZIPのSHA-256がありません。未検証の取得は行いません。');
  const url = new URL(asset.browser_download_url);
  if (url.origin !== 'https://github.com' || !url.pathname.startsWith(`/${upstream}/releases/download/${release.tag_name}/`)) throw Error('配布元URLが想定外です。');
  return {repository: upstream, tag: release.tag_name, version, publishedAt: release.published_at, asset: asset.name, url: url.href, sha256: asset.digest.slice(7)};
}
export async function latestRelease(fetcher = fetch) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const response = await fetcher(`https://api.github.com/repos/${upstream}/releases/latest`, {
    headers: {Accept: 'application/vnd.github+json', 'User-Agent': 'dsgarage-charakuru-custom', ...(token ? {Authorization: `Bearer ${token}`} : {})},
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw Error(`公式Releaseの取得に失敗しました: HTTP ${response.status}`);
  return selectRelease(await response.json());
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const release = await latestRelease();
  await fs.writeFile(path.join(root, 'custom/upstream-release.json'), JSON.stringify(release, null, 2) + '\n');
  console.log(`公式安定版: ${release.tag} / ${release.asset}`);
}
