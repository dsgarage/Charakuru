import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root} from './release.mjs';
import {workflowPolicy, policyId} from './production-policy.mjs';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['production-policy.mjs', 'overlay.mjs', 'sync.mjs', 'smoke.mjs', 'work-status.mjs', 'work-ui.mjs', 'extract.py'];
export async function overlayDigest() {
  return digest(Buffer.concat(await Promise.all(files.map(file => fs.readFile(path.join(root, 'custom', file))))));
}
export async function applyOverlay(directory) {
  const specs = [
    ['session-prompts.mjs', 'sessionPrompt', 'customSessionPrompt', 'request, appRoot, origin, locale, project'],
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
  await fs.copyFile(path.join(root, 'custom/work-status.mjs'), path.join(directory, 'dsgarage-work-status.mjs'));
  await fs.copyFile(path.join(root, 'custom/work-ui.mjs'), path.join(directory, 'public/dsgarage-work-ui.mjs'));
  await fs.writeFile(path.join(directory, 'dsgarage-workspace.json'), JSON.stringify({statusFile: path.join(root, '.local/work-status.json')}) + '\n');
  const replaceExact = async (file, before, after) => {
    const filename = path.join(directory, 'public', file);
    const original = await fs.readFile(filename, 'utf8');
    if (!original.includes(before)) throw Error(`公式との接続点が変わっています: ${file}`);
    await fs.writeFile(filename, original.replace(before, after));
  };
  const replaceRoot = async (file, before, after) => {
    const filename = path.join(directory, file), original = await fs.readFile(filename, 'utf8');
    if (!original.includes(before)) throw Error(`公式との接続点が変わっています: ${file}`);
    await fs.writeFile(filename, original.replace(before, after));
  };
  await replaceRoot('server.mjs',
    "import {createSessionHandler} from './server-session.mjs';",
    "import {createSessionHandler} from './server-session.mjs';\nimport {createWorkStatusHandler} from './dsgarage-work-status.mjs';");
  await replaceRoot('server.mjs',
    'const handleSession=createSessionHandler(root);',
    'const handleSession=createSessionHandler(root);\nconst handleWorkStatus=createWorkStatusHandler();');
  await replaceRoot('server.mjs',
    'if(await handleSession(req,res,route.pathname))return;',
    'if(await handleWorkStatus(req,res,route.pathname))return;\n if(await handleSession(req,res,route.pathname))return;');
  await replaceExact('session-ui.mjs',
    "const actions=document.createElement('div');actions.className='journey-actions';actions.append($('#journeyNext'),$('#journeyRetry'));$('.left').append(actions);",
    "const actions=document.createElement('div');actions.className='journey-actions';actions.append($('#journeyNext'),$('#journeyRetry'));$('.left').append(actions);const modeLabel=document.createElement('label');modeLabel.id='initialGenerationModeLabel';modeLabel.textContent=say('最初の3Dプレビューの生成方式','Initial 3D preview mode');const modeSelect=document.createElement('select');modeSelect.id='initialGenerationMode';modeSelect.setAttribute('aria-label',modeLabel.textContent);for(const [value,label] of [['hd',say('通常のHD Model（高精細）','HD Model (high detail)')],['smart-mesh',say('Smart Mesh P2.0','Smart Mesh P2.0')]]){const option=document.createElement('option');option.value=value;option.textContent=label;modeSelect.append(option);}modeLabel.append(modeSelect);actions.prepend(modeLabel);modeSelect.onchange=async()=>{const {project,files}=hooks.get(),next=structuredClone(project);next.dsgarage={...next.dsgarage,generationMode:modeSelect.value};await hooks.commit(next,new Map(files));};");
  await replaceExact('session-ui.mjs',
    "$('#journeyPrompt').value=sessionPrompt(r,state.appRoot,location.origin,language());",
    "$('#journeyPrompt').value=sessionPrompt(r,state.appRoot,location.origin,language(),hooks.get().project);");
  await replaceExact('session-ui.mjs',
    "const p=hooks.get().project,c=nextCheckpoint(p),r=state?.request?.projectId===p.id?state.request:null;",
    "const p=hooks.get().project,c=nextCheckpoint(p),r=state?.request?.projectId===p.id?state.request:null;modeLabel.hidden=c.kind!=='candidates';modeSelect.value=p.dsgarage?.generationMode==='smart-mesh'?'smart-mesh':'hd';modeSelect.disabled=locked;");
  await replaceExact('session-ui.mjs',
    "sessionPrompt(promptRequest.request,promptRequest.appRoot,location.origin,language())",
    "sessionPrompt(promptRequest.request,promptRequest.appRoot,location.origin,language(),hooks.get().project)");
  await replaceExact('app.mjs',
    " get:()=>({project,files,busy,dirty}),task,toast,setStage,",
    " get:()=>({project,files,busy,dirty}),task,toast,setStage,commit:async(p,f)=>{project=p;files=f;markDirty();refreshPanels();},");
  await replaceExact('production-details.mjs',
    "  const generate=button(say('生成をエージェントに依頼'",
    "  const modeLabel=node('label',say('最初の3Dプレビューの生成方式','Initial 3D preview mode'));const modeSelect=node('select','',modeLabel);for(const [value,label] of [['hd',say('通常のHD Model（高精細）','HD Model (high detail)')],['smart-mesh',say('Smart Mesh P2.0','Smart Mesh P2.0')]]){const option=node('option',label,modeSelect);option.value=value;}modeSelect.value=p.dsgarage?.generationMode==='smart-mesh'?'smart-mesh':'hd';modeSelect.onchange=()=>edit(project=>{project.dsgarage={...project.dsgarage,generationMode:modeSelect.value};});\n  const generate=button(say('生成をエージェントに依頼'");
  await replaceExact('production-details.mjs',
    "import {requestProduction} from './production-job.mjs';",
    "import {requestProduction} from './production-job.mjs';\nimport {startWork,updateWork,finishWork} from './dsgarage-work-ui.mjs';");
  await replaceExact('production-details.mjs',
    " const run=operation=>task(say('部位を処理しています…','Processing parts…'),async()=>{const {project,files}=get();const next=await requestProduction(project,files,operation);await commit(next.project,next.files);if(operation==='assemble')hooks.setStage('placement');toast(say('処理が完了しました。','Processing complete.'));});",
    " const run=operation=>task(say('部位を処理しています…','Processing parts…'),async()=>{const labels={analyze:say('部位解析','Part analysis'),prepare:say('テクスチャ準備','Texture preparation'),assemble:say('再組立','Assembly')};const work=await startWork(labels[operation],say('入力モデルを保存し、Blenderジョブを開始します。','Saving the input model and starting Blender.'));let last=0;try{const {project,files}=get();const next=await requestProduction(project,files,operation,message=>{if(Date.now()-last>5000){last=Date.now();updateWork(work.id,message).catch(console.error);}});await updateWork(work.id,say('結果をプロジェクトへ登録しています。','Registering the result in the project.'));await commit(next.project,next.files);if(operation==='assemble')hooks.setStage('placement');await finishWork(work.id,say('処理終了。結果を確認してください。','Finished. Review the result.'));toast(say('処理が完了しました。','Processing complete.'));}catch(error){await finishWork(work.id,error.message,true);throw error;}});");
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
  const note = `\n\n## dsgarage版の優先工程（非公式）\n\n${workflowPolicy}\n\nこのカスタム版では上記を候補生成・セグメンテーション・UVの既定とし、公式のP2.0低ポリ生成指定より優先します。Tripo Smart UVが未実施なら再テクスチャへ進みません。外部処理の開始・進捗・完了・失敗はキットルートの dsgarage-work-status.mjs に登録し、画面の「現在の制作作業」に表示してください。詳しくはdocs/dsgarage-workflow.mdを参照してください。\n`;
  for (const file of ['AGENTS.md', 'docs/project-AGENTS.md', 'skills/tripo-agent-workflow/SKILL.md', 'skills/tripo-agent-workflow/references/tripo-ui.md']) {
    await fs.access(path.join(directory, file));
    await fs.appendFile(path.join(directory, file), note);
  }
  await fs.writeFile(path.join(directory, 'docs/dsgarage-workflow.md'), `# dsgarage版の制作フロー\n\n識別子: ${policyId}\n\n${workflowPolicy}\n\n各外部作業の開始前に dsgarage-work-status.mjs の start または run で工程と内容を登録し、update / finish / fail を記録してください。実行中は画面の「現在の制作作業」で状態を確認できます。\n\n原本・セグメント・Smart UV出力・テクスチャ返却ごとにファイルとSHA-256を記録してください。実際のサービス操作とUV品質の測定は制作時に行います。カスタム版の起動テストだけではこれらを実施したことになりません。\n`);
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
  await fs.writeFile(indexFile, index.replace('</title>', ' · dsgarage 非公式カスタム</title>').replace('</body>', '<script type="module" src="./dsgarage-work-ui.mjs"></script></body>'));
}
