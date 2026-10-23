import test from 'node:test';
import assert from 'node:assert/strict';
import {customSessionPrompt, customHandoff, instructionFor, generationMode} from '../custom/production-policy.mjs';

test('全言語の候補依頼がハイポリ原本を指定し、セッションの操作を保持する', () => {
  for (const locale of ['ja', 'en', 'ko', 'zh-CN']) {
    const prompt = customSessionPrompt({kind: 'candidates', id: 'request-1'}, '/kit', 'http://localhost:8767', locale);
    assert.match(prompt, /ハイポリ原本/);
    assert.doesNotMatch(prompt, /25,000/);
    for (const action of ['begin', 'progress', 'complete', 'fail']) assert.ok(prompt.includes(`${action} http://localhost:8767 request-1`));
    assert.match(prompt, /採用せず確認画面で止め/);
  }
});
test('初回方式はHDが既定で、Smart Meshの明示選択は両依頼経路へ反映する', () => {
  const project = {dsgarage: {generationMode: 'smart-mesh'}};
  assert.equal(generationMode({}), 'hd');
  assert.equal(generationMode(project), 'smart-mesh');
  assert.match(customSessionPrompt({kind: 'candidates', id: 'request-2'}, '/kit', 'http://localhost:8767', 'ja', project), /選択されたSmart Mesh P2\.0/);
  assert.doesNotMatch(customSessionPrompt({kind: 'candidates', id: 'request-2'}, '/kit', 'http://localhost:8767', 'ja', project), /通常のHD Model/);
  assert.match(customHandoff(project, 'model.charakit', 'ja', 'tripo-generate'), /選択されたSmart Mesh P2\.0/);
  assert.match(customHandoff({}, 'model.charakit', 'ja', 'tripo-generate'), /通常のHD Model/);
});
test('テクスチャ工程はセグメント化→Smart UV→品質検査→再テクスチャを指定する', () => {
  const prompt = instructionFor('materials');
  assert.ok(prompt.indexOf('セグメント化') < prompt.indexOf('Smart UVを必ず実行'));
  assert.ok(prompt.indexOf('Smart UVを必ず実行') < prompt.indexOf('重なり・歪み・密度・余白'));
  assert.ok(prompt.indexOf('重なり・歪み・密度・余白') < prompt.indexOf('4Kで再テクスチャ'));
  assert.match(prompt, /未実行や失敗のまま次の工程へ進めません/);
  assert.match(prompt, /BlenderのSmart UV ProjectやANGLE_BASED展開でこの工程を代替しません/);
});
test('コピー依頼経路にも同じ工程を適用し、無関係な工程は公式へ戻す', () => {
  assert.match(customHandoff({}, 'model.charakit', 'ja', 'tripo-generate'), /ハイポリ原本/);
  assert.match(customHandoff({}, 'model.charakit', 'ja', 'tripo-texture'), /Smart UVを必ず実行/);
  assert.match(customHandoff({}, 'model.charakit', 'ja', 'tripo-classify'), /セグメント化/);
  assert.equal(customHandoff({}, 'model.charakit', 'ja', 'tripo-rig'), null);
  assert.equal(customSessionPrompt({kind: 'images'}, '/kit', 'http://localhost:8767'), null);
});
