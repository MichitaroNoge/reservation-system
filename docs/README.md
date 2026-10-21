# ドキュメント

現在の主要設計方針は以下です。

- ログイン可能な利用者は `Account` マスタで管理
- 予約者情報は `Reservation` に予約時点のスナップショットとして保持
- 管理者代理予約・非会員予約ではAccountを作成・検索・紐付けしない
- ログイン済み本人予約だけAccountに紐付ける
- 過去予約を後からAccountへ紐付けない

詳細:

- `04-database-design.md`
- `05-api-design.md`
- `06-business-flow.md`
- `07-authentication-and-security.md`
- `10-local-db-migration.md`（開発DB移行と検証範囲）
- `11-api-abuse-controls.md`（回数制限の保存先と運用設定）
- `12-system-review-2026-10-14.md`（全体レビュー、修正結果、朝の確認手順）
- `13-system-review-2026-10-15.md`（再レビュー、修正結果、未修正課題、検証範囲）

- `14-p1-remediation-2026-10-15.md`（P1対応、請求機能取り下げ、クラウド反映の保留理由）
- `15-cloud-sql-operation.md`（Cloud SQL IAM接続・保護された移行手順）
- `16-reservation-approval-2026-10-16.md`（予約承認画面、受入人数の集計、詳細表示、検証結果）
- `17-global-settings-2026-10-16.md`（全体の受入上限、マスタ管理「その他」、検証結果）
- `18-acceptance-blocks-2026-10-16.md`（受入不可期間の設定・承認判定・検証結果）
- `19-saved-period-read-fix-2026-10-16.md`（保存済み受入不可期間が表示されない不具合の原因・修正）
- `20-centered-reservation-details-2026-10-16.md`（予約明細の中央表示・配置確認）
- `21-reservation-lead-days-2026-10-16.md`（申請締切の日数設定・Docker起動エラーによるDB反映保留）
- `22-store-assignment-page-2026-10-16.md`（店舗割当専用画面・割当入力・検証結果）
- `23-reservation-reminder-pages-2026-10-16.md`（本予約・メニュー確定の催促専用画面・対象条件統一）
- `24-worklist-design-alignment-2026-10-16.md`（店舗割当・催促3画面のデザイン統一）
- `25-approval-search-2026-10-16.md`（予約承認・各種変更承認・キャンセル承認への検索追加）
- `26-reservation-calendar-2026-10-16.md`（月間・週間・店舗別の予約カレンダー、集計ルール、検証結果）
- `27-calendar-review-improvements-2026-10-16.md`（カレンダー更新・上限超過警告・通し検証・週間表示改善）
- `28-unique-store-assignments-2026-10-16.md`（同じ店舗への重複割当防止・API拒否・既存割当保持の検証）
- `29-dashboard-task-widths-2026-10-19.md`（タスクカードの幅統一・画面幅ごとの表示確認）
- `30-reservation-csv-export-2026-10-19.md`（予約CSV出力、31項目、認可・安全化・上限制御、検証結果と未確認事項）
- `31-google-customer-auth-2026-10-19.md`（Googleログイン、お客様情報登録、既存認証との共存、安全な連携と検証結果）
- `32-google-account-display-2026-10-19.md`（ログイン方法の折りたたみ、実Google連携先の表示、中央の本人確認画面）
- `33-google-login-design-2026-10-19.md`（Qiitaの参考画像に基づくログイン方法の区分とGoogle公式ボタンの表示改善）
- `34-separate-auth-pages-2026-10-19.md`（ログイン・新規登録専用URL、タブ撤去、入口ボタンと相互リンク）

- [35. キャンセル料の事前通知](35-cancellation-fee-notice-2026-10-19.md)

- [36. 本予約申請時のキャンセルポリシー同意](36-confirmed-policy-consent-2026-10-19.md)

- [37. 問い合わせ機能の調査と実装計画（承認済み）](37-inquiry-implementation-plan-2026-10-19.md)

- [38. 問い合わせ機能の実装記録](38-inquiry-implementation-2026-10-20.md)

- [39. 予約ごとの問い合わせ・回答履歴](39-reservation-inquiry-history-2026-10-20.md)

- [40. メール未送信でも確認できる問い合わせ回答](40-inquiry-replies-without-email-2026-10-20.md)

- [41. 管理者向けGoogleカレンダー連携](41-google-calendar-integration-2026-10-20.md)

- [42. 全体レビューで指摘したP1の修正](42-p1-review-fixes-2026-10-20.md)

- [43. 全体再レビューの8件の改善](43-eight-review-improvements-2026-10-21.md)

- [44. 予約通知メールの専用画面への移設](44-reservation-notification-page-2026-10-21.md)
