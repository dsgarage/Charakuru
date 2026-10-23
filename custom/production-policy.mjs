// dsgarage独自の工程指示。公式の依頼文を複製せず、対象工程だけ置き換える。
export const policyId = 'dsgarage-highpoly-segment-smart-uv-v1';
const generation = `採用した頭（髪込み）とTポーズの体の4方向画像から、頭・体を各4候補、通常のHD Modelでハイポリ原本として生成してください。Smart Mesh P2.0で低ポリ化したモデルを生成の既定にしません。現在のTripo画面でHD Modelの方式、解像度、面数を確認し、実際に選んだ設定を記録します。存在しないAPI値・固定ポリゴン数を推測して指定しません。ハイポリ原本と元テクスチャを保存し、FBXの実面数・形状・向き・テクスチャを確認して scripts/tripo-project.mjs の candidates で同じ正本へ登録します。候補の採用はユーザーが行うため、採用せず確認画面で止めてください。`;
const smartMeshGeneration = `採用した頭（髪込み）とTポーズの体の4方向画像から、頭・体を各4候補、選択されたSmart Mesh P2.0で生成してください。現在のTripo画面で方式、面数、出力形式を確認して実際に選んだ設定を記録します。この方式の出力をハイポリ原本と呼ばず、元画像・生成メッシュ・元テクスチャを保存します。FBXの実面数・形状・向き・テクスチャを確認して scripts/tripo-project.mjs の candidates で同じ正本へ登録します。候補の採用はユーザーが行うため、採用せず確認画面で止めてください。`;
export const generationMode = project => project?.dsgarage?.generationMode === 'smart-mesh' ? 'smart-mesh' : 'hd';
const segmentation = `採用したハイポリ原本を保持します。未セグメントの場合は scripts/export-segmentation.py でTripo用のGLBを出力してセグメント化し、結果を保存して scripts/tripo-project.mjs の segmented で基準メッシュとして登録します。元候補との対応、実際の面数、分離状態、シルエットを確認します。既に検証済みの基準メッシュと分類がある場合はそれを使い、テクスチャ依頼のたびに再セグメント化して既存分類をリセットしません。独立部品は見た目と形で分類し、座標や大きさだけで部位を決めません。セグメントはテクスチャ枚数や揺れ物グループと同一視しません。`;
const uv = `セグメント化した基準から、塗る単位の作業メッシュを用意し、Tripo StudioのSmart UVを必ず実行します。BlenderのSmart UV ProjectやANGLE_BASED展開でこの工程を代替しません。Smart UVの実行前に現在の画面の面数・容量上限を確認します。2026-10-23の公式資料は三角面80,000／四角面40,000です。超過時は原本を残し、意味のある部位分割を優先します。軽量化が必要ならコピーで行い、シルエット・細部・部位対応を確認し、原本を自動的に置き換えません。必要な分割・軽量化を終えたメッシュに対してSmart UVを実行し、実行対象、操作履歴またはモデルURL、入力と出力のSHA-256、面数を記録してください。未実行や失敗のまま次の工程へ進めません。`;
const quality = `Smart UVの実行成功だけでUV合格とせず、共有テクスチャ単位で重なり・歪み・密度・余白を検査し、部位名付きUV図と前後・側面のチェック柄を確認します。未検証や不合格を合格と記録しません。既存の品質基準がある場合は維持します。不具合を三角形ごとの切り離しで隠さず、部位や入力トポロジーを見直します。修正でメッシュやUVが変わったら検査を更新します。画像を見せる依頼にはmacOSのプレビューで対象画像を開きます。`;
const texture = `Smart UV後のUV確認を終えてから、採用画像と形状ガイドに沿った参照画像を作り、各テクスチャグループを4Kで再テクスチャします。Smart UV前の画像を新UVへ無補正で貼り直しません。返却後もUVを再検査し、変化していれば再ベイク・再検証します。頭・髪・上半身・衣装込みの下半身・アクセサリーを基本とし、Smart UV入力の部位分割をテクスチャ分類へ強制しません。揺れ物の分離を保持し、scripts/tripo-project.mjs の returns / assemble で同じ正本へ戻します。基準メッシュとの厳密な対応を緩めません。MToon、透明度、元デザインを保ち、組み立てたBlendを保存して頭身調整で止めます。`;
export const workflowPolicy = [generation, segmentation, uv, quality, texture].join('\n\n');

export function instructionFor(kind, project) {
  if (['candidates', 'tripo-generate'].includes(kind)) return generationMode(project) === 'hd' ? generation : smartMeshGeneration;
  if (['materials', 'tripo-texture'].includes(kind)) return [segmentation, uv, quality, texture].join('\n\n');
  if (kind === 'tripo-classify') return [segmentation, '基準メッシュの部品とテクスチャ／揺れ物の分類を登録してください。続くテクスチャ工程ではTripo Smart UVが必須です。'].join('\n\n');
  return null;
}

export function customSessionPrompt(request, appRoot, origin, locale = 'ja', project) {
  const instruction = instructionFor(request.kind, project);
  if (!instruction) return null;
  const command = `node "${appRoot.replaceAll('\\', '/')}/scripts/agent-session.mjs"`;
  return `dsgarage版きゃらくるの制作依頼（${policyId}）。回答言語は ${locale}。\n最初に次を実行し、saved: true と正本project・directoryを確認してください。失敗・拒否・依頼の失効時は原因を報告して停止し、古いキットから進めません。\n\n${command} begin ${origin} ${request.id}\n\n出力先のAGENTS.md、アプリのskills/charakit-project/SKILL.md、skills/tripo-agent-workflow/SKILL.md、docs/dsgarage-workflow.mdを読み、同じ.charakitを更新してください。ブラウザはdocs/browser-use.mdに従い既存タブを再利用します。\n\n${instruction}\n\n進捗: ${command} progress ${origin} ${request.id} "処理内容"\n完了: ${command} complete ${origin} ${request.id}\n中断: ${command} fail ${origin} ${request.id} "理由"\n実際に確認できた範囲だけを報告してください。`;
}

export function customHandoff(project, filename, locale, purpose) {
  const instruction = instructionFor(purpose && typeof purpose === 'object' ? purpose.kind : purpose, project);
  if (!instruction) return null;
  return `dsgarage版（非公式、${policyId}）。回答言語: ${locale}。対象は ${filename}。別のキットで代用しません。\nアプリのskills/charakit-project/SKILL.md、skills/tripo-agent-workflow/SKILL.md、docs/dsgarage-workflow.mdを読んでください。\n\n${instruction}`;
}
