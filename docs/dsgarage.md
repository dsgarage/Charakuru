# dsgarage版きゃらくる（非公式カスタム）

[nanocle/Charakuru](https://github.com/nanocle/Charakuru)をフォークした、ハイポリ原本を基準に制作するカスタム版です。公式との関係・権利表記は元のREADMEとLICENSEを保持しています。

## 起動と保存場所

Node.js 22以上、Git、Python 3が必要です。追加のnpmパッケージは不要です。このリポジトリのルートで実行します。

```sh
npm start
```

既定URLは `http://127.0.0.1:8767`。公式版の8766と分けています。PORT環境変数で変更できます。

| 場所 | 内容 |
| --- | --- |
| `custom/` | dsgarage独自の更新・工程カスタム |
| `.runtime/releases/` | 公式から取得して検証した実行環境。直接編集しない |
| `.runtime/current.json` | 利用版・公式SHA-256・カスタム識別値・確認日時 |
| `.local/projects/` | 新規制作データの既定保存先。更新で移動・削除しない |
| `.local/session.json` | アプリの作業セッション |
| `.local/config.json` | ローカル設定 |

制作先・設定は公式の `CHARAKIT_PROJECTS_ROOT` / `CHARAKIT_SESSION_FILE` / `CHARAKIT_CONFIG` で変更できます。既存プロジェクトの自動移動・既存アプリの停止は行いません。このMacでの作業入口は `V1nc1/Charakuru-custom` に統一します。

## 最新版への追従

`npm start` は毎回、公式upstreamをfetchし、GitHubの最新安定Releaseの**専用キットZIP**を確認します。GitHubの自動生成Source code ZIPは使いません。

1. 公式ZIPのSHA-256と内部マニフェスト全項目を照合。
2. LICENSEが確認済みのものと一致することを確認。
3. 新しいディレクトリにカスタムを適用。
4. 4言語の依頼文、Skill、アプリHTTPとAPIを検証。
5. すべて通った環境へ利用版を切り替えて起動。

同じ版・同じカスタムは検証済みキャッシュを再利用します。互換性変更、ネットワーク失敗、ライセンス変更、ローカル改変を検知したら原因を表示して停止します。既存環境と制作データは保持します。起動中のアプリを途中で更新する仕組みではなく、次回起動時に確認します。

通信できないときに前回検証済み版を明示的に使う場合のみ、`npm start -- --offline` を使用します。この場合は最新版確認をしていないことを表示します。

`npm run sync` は起動せず更新検証のみ、`npm run check:upstream` はCIで再現するRelease記録を更新します。`npm run sync -- --locked` はその記録の版を検証します。日次CIと手動CIでも最新Releaseとの互換性を検査します。upstreamの公開資料をdevelopへ取り込む変更はfeatureブランチからPRで行います。自動fetchはdevelopへの無条件マージではありません。

## 制作工程

**ハイポリ原本生成 → 採用 → セグメント化 → Tripo Smart UV → UV品質検査 → 4Kテクスチャ → 返却後のUV再検査**

- Smart Mesh P2.0の25,000四角面生成を既定から外します。実際のTripo画面でハイポリを得る方式と解像度を確認し、原本を保存します。
- Smart UVはセグメント化と必要な作業メッシュ準備の後、再テクスチャの前に必ず実行します。Blender Smart UV Projectは代替になりません。
- Smart UVの入力上限は現在の画面で確認します。[公式資料](https://www.tripo3d.ai/blog/smart-uv)では2026-10-23確認時に三角面80,000／四角面40,000です。超過時は部位分割を優先し、必要な軽量化は原本を残したコピーへ行います。
- 重なり・歪み・密度・余白とチェック柄を検査し、未実施・不合格のまま再テクスチャへ進めません。Smart UVを実行しただけでは品質合格になりません。
- 制作時に入力・出力のハッシュ、実面数、操作履歴またはモデルURL、UV検査結果を保存します。

現段階のカスタム対象は、アプリの制作依頼文・コピー依頼文・生成設定の説明・エージェントSkillです。Smart UVのサービス操作をアプリが自動実行する機能や、手動FBX登録をUV証跡で拒否する機能は含みません。実際の制作とUV検査は、依頼を受けたエージェントがこの工程に従って行います。

既存の衣装制作では `../Charakuru/docs/uv-quality.md` にある共通UV基準を引き続き使用します。今回のフォークへ数値基準や検査コードを複製していません。

## 開発と検証

Issueを先に作成し、`feature/<Issue番号>-<slug>` で変更してdevelopへPRを出します。main/developは `test` 成功必須の保護対象です。

```sh
npm test
npm run sync -- --locked
npm run smoke
```

公開するのは独自カスタムと元の公開資料です。公式専用ZIP・同梱アセット・ユーザー制作物・認証情報はGitへ追加しません。`.runtime/` と `.local/` は除外しています。
