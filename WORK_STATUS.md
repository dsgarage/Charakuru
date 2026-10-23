# 作業状況

更新日: 2026-10-23

- リポジトリ: https://github.com/dsgarage/Charakuru （公式 nanocle/Charakuru のfork）
- Issue: https://github.com/dsgarage/Charakuru/issues/1
- Issue #3: https://github.com/dsgarage/Charakuru/issues/3（初回3DプレビューのHD Model選択）
- Issue #5: https://github.com/dsgarage/Charakuru/issues/5（制作作業の状態をUIへ統合）
- 作業ブランチ: `feature/3-initial-hd-choice`（統合済みの`develop`から分岐）
- Issue #5ブランチ: `feature/5-visible-work-status`（`feature/3-initial-hd-choice`から作業ツリーを分離）
- 実装ブランチ: `feature/1-highpoly-smart-uv`
- 統合先・既定ブランチ: `develop`。main/developはPRとtest必須。
- 作業入口: `/Users/daisuketsukada/Documents/dsgarageJob/V1nc1/Charakuru-custom`

## 実装

起動ごとに公式upstreamをfetchし、最新安定Release専用ZIPを検証・カスタム適用・起動検証して利用する。データは`.local/`へ分離。更新失敗時に前回環境を保持する。

制作指示をハイポリ原本→セグメント化→Tripo Smart UV必須→UV検査→4K再テクスチャに変更。P2.0の25,000四角面指定を取り除く。公開forkに専用ZIP・制作データは含めない。

## 検証・残作業

- Issue #3: 初回候補生成の方式選択を追加。既定は通常のHD Modelで、Smart Mesh P2.0は明示選択時のみ。選択はプロジェクトへ保存し、通常・旧依頼経路へ反映する。
- Issue #3: 単体テスト12件、公式v1.1.0への適用とHTTP/API起動・4言語のスモーク検証に成功。
- 公式v1.1.0 ZIPのSHA-256・内部マニフェスト検証、カスタム適用、HTTP/API起動を確認。
- Issue #1 の単体テスト11件と公式v1.1.0の統合起動検証も成功。
- `npm start`から最新版確認とカスタム適用を通し、`http://127.0.0.1:8767`で起動確認。CI結果とPRはIssue #1を参照。
- 実Tripoでのハイポリ生成・Smart UV実行・成果物の品質測定は未実施。今回のソフトウェア検証と区別する。
- 衣装制作の既存原本・UV成果物は変更していない。共通UV数値基準は旧ローカルCharakuru側の正本を維持。
- Issue #5: 画面内の部位処理と外部のWindows/Tripo処理を同じ作業状況パネルに表示。外部処理は連携コマンドから開始した場合に追跡できる。単体テスト14件と公式v1.1.0の起動・画面表示検証を確認。PRとGitHub CIは確認中。
