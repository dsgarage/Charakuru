# dsgarage版きゃらくる（非公式）

- `docs/dsgarage.md` と `WORK_STATUS.md` を再開時に読む。
- 制作はハイポリ原本→セグメント化→Tripo Smart UV必須→UV品質確認→テクスチャ。Smart Mesh P2.0の低ポリ生成を既定に戻さない。Blender Smart UV Projectで代替しない。
- 原本を保持する。Smart UV上限を現行画面で確認し、超過時は部位分割または原本を保った作業コピーの軽量化を検討する。実行完了を品質合格にしない。
- 公式配布本体は `.runtime/` に取得する。配布ZIP、本体コード、同梱素材、制作データ、認証情報をコミットしない。公開するカスタムは独自実装だけ。
- 更新は `npm run sync`、起動は `npm start`。公式の配布物はバージョン別に検証し、カスタム適用に失敗した版へ切り替えない。
- Git Flow：`main` / `develop` はCIの `test` 合格後にPR経由のみ。Issueを先に作り、`feature/<issue>-<slug>` を使う。
- 重い生成後処理・本番レンダーは、保存済み接続メモに従いWindowsで実行する。Macは編集と軽量確認を担当する。
