# 作業状況

更新日: 2026-10-23

- リポジトリ: https://github.com/dsgarage/Charakuru （公式 nanocle/Charakuru のfork）
- Issue: https://github.com/dsgarage/Charakuru/issues/1
- 実装ブランチ: `feature/1-highpoly-smart-uv`
- 統合先・既定ブランチ: `develop`。main/developはPRとtest必須。
- 作業入口: `/Users/daisuketsukada/Documents/dsgarageJob/V1nc1/Charakuru-custom`

## 実装

起動ごとに公式upstreamをfetchし、最新安定Release専用ZIPを検証・カスタム適用・起動検証して利用する。データは`.local/`へ分離。更新失敗時に前回環境を保持する。

制作指示をハイポリ原本→セグメント化→Tripo Smart UV必須→UV検査→4K再テクスチャに変更。P2.0の25,000四角面指定を取り除く。公開forkに専用ZIP・制作データは含めない。

## 検証・残作業

- 公式v1.1.0 ZIPのSHA-256・内部マニフェスト検証、カスタム適用、HTTP/API起動を確認。
- 単体テスト11件成功。最終変更を適用した公式v1.1.0の統合起動検証も成功。
- `npm start`から最新版確認とカスタム適用を通し、`http://127.0.0.1:8767`で起動確認。CI結果とPRはIssue #1を参照。
- 実Tripoでのハイポリ生成・Smart UV実行・成果物の品質測定は未実施。今回のソフトウェア検証と区別する。
- 衣装制作の既存原本・UV成果物は変更していない。共通UV数値基準は旧ローカルCharakuru側の正本を維持。
