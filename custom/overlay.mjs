import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root} from './release.mjs';
import {workflowPolicy, policyId} from './production-policy.mjs';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['production-policy.mjs', 'overlay.mjs', 'sync.mjs', 'smoke.mjs', 'extract.py'];
export async function overlayDigest() {
  return digest(Buffer.concat(await Promise.all(files.map(file => fs.readFile(path.join(root, 'custom', file))))));
}
export async function applyOverlay(directory) {
  const specs = [
    ['session-prompts.mjs', 'sessionPrompt', 'customSessionPrompt', 'request, appRoot, origin, locale'],
    ['handoff.mjs', 'productionHandoff', 'customHandoff', 'project, filename, locale, purpose']
  ];
  for (const [file, exported, custom, args] of specs) {
    const filename = path.join(directory, 'public', file);
    const original = await fs.readFile(filename, 'utf8');
    if (!original.includes(`export function ${exported}(`)) throw Error(`公式との接続点が変わっています: ${file}`);
    const upstreamFile = file.replace('.mjs', '.upstream.mjs');
    await fs.rename(filename, path.join(directory, 'public', upstreamFile));
    await fs.writeFile(filename, `// dsgarage版の工程のみ差し替える。\nimport {${exported} as original} from './${upstreamFile}';\nimport {${custom}} from './dsgarage-policy.mjs';\nexport function ${exported}(${args}) { return ${custom}(${args}) ?? original(${args}); }\n`);
  }
  await fs.copyFile(path.join(root, 'custom/production-policy.mjs'), path.join(directory, 'public/dsgarage-policy.mjs'));
  const skillFile = path.join(directory, 'skills/tripo-agent-workflow/SKILL.md');
  const skill = await fs.readFile(skillFile, 'utf8');
  const lowpoly = '**Smart Mesh P2.0、四角面、25,000、生成数4**';
  if (!skill.includes(lowpoly)) throw Error('公式Skillの生成設定が変わっています。');
  await fs.writeFile(skillFile, skill.replaceAll(lowpoly, '**ハイポリ原本を得られる生成方式・解像度、生成数4**'));
  const uiFile = path.join(directory, 'skills/tripo-agent-workflow/references/tripo-ui.md');
  const ui = await fs.readFile(uiFile, 'utf8');
  const uiSetting = 'Smart Mesh P2.0、四角面500〜25,000、生成数1/2/4。';
  if (!ui.includes(uiSetting)) throw Error('公式UI資料の生成設定が変わっています。');
  await fs.writeFile(uiFile, ui.replaceAll(uiSetting, 'ハイポリ原本を得られる生成方式と解像度を現在の画面で確認します。生成数は4です。'));
  const note = `\n\n## dsgarage版の優先工程（非公式）\n\n${workflowPolicy}\n\nこのカスタム版では上記を候補生成・セグメンテーション・UVの既定とし、公式のP2.0低ポリ生成指定より優先します。Tripo Smart UVが未実施なら再テクスチャへ進みません。詳しくはdocs/dsgarage-workflow.mdを参照してください。\n`;
  for (const file of ['AGENTS.md', 'docs/project-AGENTS.md', 'skills/tripo-agent-workflow/SKILL.md', 'skills/tripo-agent-workflow/references/tripo-ui.md']) {
    await fs.access(path.join(directory, file));
    await fs.appendFile(path.join(directory, file), note);
  }
  await fs.writeFile(path.join(directory, 'docs/dsgarage-workflow.md'), `# dsgarage版の制作フロー\n\n識別子: ${policyId}\n\n${workflowPolicy}\n\n原本・セグメント・Smart UV出力・テクスチャ返却ごとにファイルとSHA-256を記録してください。実際のサービス操作とUV品質の測定は制作時に行います。カスタム版の起動テストだけではこれらを実施したことになりません。\n`);
  // 説明画面と翻訳キーも同時に変更する。
  for (const file of ['public/production-details.mjs', 'public/ui-translations.mjs']) {
    const filename = path.join(directory, file);
    const original = await fs.readFile(filename, 'utf8');
    const changed = original.replaceAll('P2.0・四角面25,000。', 'ハイポリ原本を生成。').replaceAll('P2.0 · 25,000 quads.', 'High-poly source geometry.');
    if (changed === original) throw Error(`候補説明の接続点が変わっています: ${file}`);
    await fs.writeFile(filename, changed);
  }
  const indexFile = path.join(directory, 'public/index.html');
  const index = await fs.readFile(indexFile, 'utf8');
  if (!index.includes('</title>')) throw Error('公式HTMLのtitleを確認できません。');
  await fs.writeFile(indexFile, index.replace('</title>', ' · dsgarage 非公式カスタム</title>'));
}
