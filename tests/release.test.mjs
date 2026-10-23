import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRelease, latestRelease} from '../custom/release.mjs';

function fixture() {
  return {tag_name: 'v1.1.0', published_at: '2026-10-23T00:59:23Z', assets: [{
    name: 'charakuru-1.1.0-test.zip', digest: `sha256:${'a'.repeat(64)}`,
    browser_download_url: 'https://github.com/nanocle/Charakuru/releases/download/v1.1.0/charakuru-1.1.0-test.zip'
  }]};
}
test('公式の安定版専用ZIPを選択する', () => {
  const selected = selectRelease(fixture());
  assert.equal(selected.version, '1.1.0');
  assert.equal(selected.sha256, 'a'.repeat(64));
});
test('先行版・不明なハッシュ・候補重複・外部URLを拒否する', () => {
  for (const change of [
    r => r.prerelease = true,
    r => r.draft = true,
    r => r.assets[0].digest = null,
    r => r.assets.push({...r.assets[0]}),
    r => r.assets[0].browser_download_url = 'https://example.com/kit.zip',
    r => r.tag_name = '../other'
  ]) {
    const release = fixture(); change(release);
    assert.throws(() => selectRelease(release));
  }
});
test('取得失敗を最新版扱いで隠さない', async () => {
  await assert.rejects(latestRelease(async () => ({ok: false, status: 403})), /HTTP 403/);
});
