# 全体再レビューで検出した8件の改善（2026-10-21）

## 対応範囲と結果

ユーザーの承認に基づき、直前の全体レビューで挙げた8件をすべて対応。現在のローカルPostgreSQL / Drizzle構成を対象とし、クラウドDB移行や請求機能の追加は行っていない。

| 番号 | 課題 | 改善内容 |
| --- | --- | --- |
| 1 / P1 | 古い承認メールが最新の変更案内より後に届く | 通知作成時の予約内容・版・予約区分を照合し、古い通知を停止。送信中の予約更新を予約単位のロックで直列化。送信本文を通信前に永続化し、DB確定失敗後も元の本文と同じプロバイダーキーで再試行する。試行済みで安全な再送期限23時間を超えた通知は自動再送を停止し、管理者の確認へ回す。 |
| 2 / P1 | 内部レート制限で再試行回数を使い切る | 回数制限は配送失敗に数えず、Retry-Afterに基づく次回試行日時を保存。受付メールにも同じ待機処理を適用。マスタ管理に予約通知メールの専用画面を追加し、送信状況の確認と管理者による復旧操作を提供。 |
| 3 / P2 | 問い合わせメールの再送期限切れで対応が停止する | 管理者が送信履歴を確認し、送信済みの記録、またはメール送信を終了して履歴での回答を継続する操作を追加。記録後は追加回答・対応中・完了へ進める。回答本文は常にお客様の履歴に残る。 |
| 4 / P2 | 古い申請・古い設定画面が最新情報を上書きする | 予約変更申請に申請時の版を保存し、現在の予約と不一致なら承認を409で拒否。古い申請の単なる通信再試行では版を更新しない。お客様が最新内容を確認して明示的に再申請した場合のみ同じ申請を再確認できる。マスタも版を照合して競合を拒否し、入力を保持。 |
| 5 / P2 | 未承認予約のキャンセル申請が本予約人数に集計される | キャンセル申請前の予約状態を保存。本予約・仮予約・承認待ちの区分を引き継ぎ、本予約変更申請中の仮予約も仮予約として集計。過去分は既存の承認履歴から分かる範囲のみ補完。 |
| 6 / P2 | 承認できない理由が一般的な保存エラーに置き換わる | APIが返す安全な理由を表示。予約変更承認では一覧内に理由を保持し、再確認や再申請など次に必要な操作を読み取れるようにした。二重承認を抑止。ステータス変更・店舗割当もAPIの説明を表示。 |
| 7 / P2 | Google側で連携先を削除すると画面から復旧できない | カレンダー復旧操作を追加。元のIDとエラー状態を照合し、Google側でも利用不可か再確認してから新規専用カレンダーまたは作成済みカレンダーへ接続。有効予約を再同期する。単純な再開・再接続では復旧が必要な状態を消さない。 |
| 8 / P3 | 予約変更の詳細だけ右側に表示される | 中央表示の共通Radix Dialogに統一し、部品を分離。フォーカス・Escape・閉じる操作を共通化。狭い画面では明細表だけ横スクロールする。 |

## 利用者・管理者の操作

- 古い予約変更申請：管理者の承認時に理由を表示。お客様の予約確認画面に「変更内容を再確認する」または「キャンセル料を確認する」を表示し、元の希望内容を引き継いで再申請できる。編集中に予約が更新された場合も、画面で取得した版と照合する。
- 問い合わせ回答：回答詳細の「送信結果を確認・記録」から、Resendの送信履歴を確認した結果を記録する。確認チェックは必須。メール送信中は操作を拒否。回答を消したり、自動的に重複再送したりしない。
- 予約通知：「マスタ管理 → 予約通知メール」で送信待ち・制限待ち・停止・要確認と次回試行日時を確認する。送信履歴を確認してから「最新内容で送信」または「送信済みを記録」を選ぶ。最新内容での復旧は同じ操作を繰り返しても同じ通知を再利用する。現在が承認待ち等の場合は承認通知の新規送信を拒否する。
- Googleカレンダー：「マスタ管理 → その他 → Googleカレンダー連携 → 連携先カレンダーを復旧」。置き換え先の共有設定はGoogle側で改めて設定する。

## 主な変更箇所

- 通知：lib/services/approval-email-service.ts、receipt-email-service.ts、reservation-notification-state.ts、reservation-notification-recovery.ts、lib/email/email-sender-settings.ts、lib/abuse-limits.ts。
- 整合性・集計：lib/domain.ts、lib/db/schema.ts、lib/api-validation.ts、lib/reservation-availability.ts、lib/system-settings.ts、lib/repositories/*、lib/services/reservation-change-approval-service.ts。
- 管理画面・API：app/page.tsx、app/reservations/components/reservation-change-review-dialog.tsx、reservation-fee-reconfirmation.tsx、reservation-notification-management.tsx、google-calendar-settings.tsx、other-settings-management.tsx、components/inquiries/*、app/api/admin/inquiries/.../resolve/route.ts、app/api/admin/reservation-notifications/route.ts、app/api/system-settings/route.ts。
- 問い合わせ・Google：lib/inquiries/*、lib/google-calendar/settings.ts、http.ts、oauth.ts、security.ts。
- 移行：drizzle/0014_violet_rachel_grey.sql と対応するmeta。
- 回帰検証：tests/db/review-improvements.test.ts、change-approval-guards.test.ts、confirmation-email-service.test.ts、reservation-availability.test.ts、reservation-ui-regression.test.ts など。scripts/test-postgres.tsへ追加。scripts/approval-email-worker.tsとscripts/dev.tsでローカルの承認通知再試行を起動。

## DB移行・既存データ

- ローカル開発DBの起動前はPostgreSQLが停止していた。既存Docker Desktopと既存コンテナを起動して復旧。
- 適用前に開発DB全体のバックアップを .tmp/review-improvements-development-before-2026-10-21.dump へ保存。個人情報を含むためGitの対象外に保持。
- 追加マイグレーション0014を開発DBに適用し、db:check成功。予約11件を初期化・削除していない。
- 移行前の未送信承認通知は6件。旧形式では当時の予約内容を確実に照合できないため、自動再送を停止して履歴を保持。既に送信済みと監査記録で確認できる分は送信済みに整合する。未解決分は上記「予約通知メール」から送信履歴を確認して復旧する。実在のお客様への代理再送は行っていない。

## 検証結果

- npm test：158件成功。
- npm run test:db:postgres -- --confirm reservation_system_test：59件成功、スキップ0。開発DBとは別のテスト専用DBのみを初期化。
- 組み込みPGlite：全体49件成功・PostgreSQL専用11件スキップ。その後の追加部分は対象3件が成功し、最終の通知・タイムアウト・期限処理の対象2件も成功。
- npm run build：成功。既存のlint警告5件は残るが、今回追加した箇所のeslintはエラー・警告なし。
- 実DBで同時マスタ保存・同時変更承認はそれぞれ1件のみ成功。同一通知の同時送信は1回。送信中の予約編集はメール送信の確定を待つ。
- 通知：新しい日付の案内後に古い日付を送らない、同一宛先6件の制限待ちで再試行回数を使い切らない、送信後のDB確定失敗でも本文とキーを維持、管理者の復旧操作の再試行でも重複送信しない。
- 認可・確認：一般ユーザーの復旧API拒否、確認チェック欠落の拒否、問い合わせの所有権維持、送信中の結果確定拒否、他画面で更新された版による保存拒否を検証。
- ブラウザの隔離環境：実際のUI部品とPGlite、疑似メール・Googleクライアントを使用。PC1280px・スマートフォン390pxで、承認エラー表示、中央ダイアログ、閉じる/Escape、問い合わせの対応継続、Google復旧、通知復旧、マスタ保存競合時の入力保持を確認。
- 390pxではページ幅390px、ダイアログ幅358px。明細表420pxは内部249pxの領域で横スクロールし、ページ全体をはみ出さない。
- 画像：review-artifacts/review-improvements-dialog-desktop-2026-10-21.jpg、review-improvements-dialog-mobile-2026-10-21.jpg、review-improvements-inquiry-mobile-2026-10-21.jpg、review-improvements-calendar-mobile-2026-10-21.jpg。

## 起動確認

- localhost:3000/login のHTTP 200とログイン画面表示を確認。
- 2026-10-21、ユーザーから登録済みメール宛先への承認・変更・キャンセル通知の自動再試行の有効化・起動について明示的な許可を受領。ローカル設定（.env.local）をAPPROVAL_EMAIL_WORKER_ENABLED=trueに更新し、dev:localを再起動。承認通知ワーカーが1プロセスのみ稼働し、localhost:3000/loginがHTTP 200を返すことを確認。
- 起動前後のDB集計は通知6件・停止済み未送信6件・再送期限到来0件・送信済み0件。旧通知の停止を維持し、この起動による実メール送信は発生していない。30秒の巡回間隔を経過後もワーカーの稼働を確認。PCとdev:localの稼働中に、新たな対象通知の自動再試行を行う。

## 残る制約・別途改善候補

- 実Googleアカウントの削除・再作成、実メール配送を伴うE2Eは実施していない。外部送信境界を疑似化して障害・認可・DB整合性を検証した。
- 承認通知は送信通信の待機を20秒で打ち切り、予約ロックを保持し続けない。APPROVAL_EMAIL_WORKER_ENABLED=trueを明示したdev:localでは承認通知の専用ワーカーが30秒間隔で期限到来分を処理する。既定では無効。このローカル環境ではユーザーの明示的な許可後に有効化・起動済み。PCまたはdev:localを停止している間は処理されない。停止済み・古い通知は送らない。受付メール等の既存ジョブ構成と、本番のスケジューラーは別途既存の運用設定に従う。
- 旧Data Connect構成向けのスキーマ拡張・クラウドDB移行は対象外。ローカルDrizzleで確認。
- app/page.tsx全体の追加分割、一覧取得のDB側ページネーション、CIでのDB統合テスト実行、匿名問い合わせフォームの期限更新は今回の8件とは別の改善候補として残す。
