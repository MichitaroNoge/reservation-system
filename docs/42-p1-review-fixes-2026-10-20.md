# 全体レビューで指摘したP1の修正（2026-10-20）

## 対象と結果

今回の依頼はP1の3件。P2/P3は変更対象に含めていない。

### 1. 通信失敗後のキャンセルとGoogleカレンダー

- 登録APIの応答を受け取れない場合、Google側だけ登録済みになる可能性があるため、remotePresent=falseでも連携対象外となった予約の予定IDを削除する。
- 削除済みIDからの復元とDBコミット失敗が重なった場合も考慮し、復元に使う決定的な次のIDも削除対象にする。
- Google側の404/410は既存のHTTPアダプターで削除済みとして扱う。削除の通信失敗ではジョブを完了扱いにせず、同じIDで再試行する。
- 過去に誤ってexcludedとなったジョブもマイグレーションでpendingに戻し、削除を再確認する。予約の内容・ステータスは変更しない。

### 2. 予約変更のキャンセル料再確認

- 申請時に確認した条件（ポリシーの版・判定区分・初回本予約人数・現在人数・変更希望人数）とサーバーの確認日時を、変更申請のfee_acknowledgementへ保存する。
- ブラウザーが送信するのは表示した条件の照合値と確認のboolean。保存する確認記録・日時はサーバーで作成し、クライアントの記録オブジェクトは採用しない。
- 承認時にも最新の予約で判定する。適用条件に合う確認記録がなければ409で止め、申請を承認待ちに残す。人数・日付・店舗割当・メール送信待ちは変更しない。
- 仮予約中の減員申請→本予約成立の順序、確認後の人数変更、古い画面の確認情報にも適用する。
- お客様の予約確認画面に、再確認が必要な申請の「キャンセル料を確認する」を表示。申請済みの日時・人数・メニュー・理由を引き継いで既存の確認ダイアログへ進む。
- 同じ申請を再確認する場合は、申請を重複登録せず確認記録だけ更新する。元の受付日時は維持する。
- 受付済みの同一申請の再確認だけは締切後も可能。画面とAPIは同じ照合関数を利用し、別日時・人数・メニュー・理由への変更には通常の締切を適用する。
- 過去の申請に確認記録を推測で補完しない。料金対象なら本人の再確認を必要とする。

### 3. 受入不可日時への変更承認

- 変更希望日・開始時刻・変更後メニューの所要時間から、実際に保存する変更後の利用時間を計算して判定する。
- 通常の承認と同じ重なり判定を使用。日跨ぎとメニューによる延長も判定し、終了と開始が接するだけの場合は許可する。
- Drizzleの予約トランザクション内、変更前に判定する。リポジトリの承認処理にも組み込み、API以外からの呼び出しでも検証する。

## DB・主な変更ファイル

- drizzle/0013_woozy_captain_marvel.sql、生成スナップショット、journal：確認記録のnullable JSONB列と既存excludedジョブの再確認。ローカル開発DBへ適用済み。
- lib/google-calendar/sync.ts：削除の不確定結果への対応。
- lib/cancellation-policy.ts、lib/reservation-change.ts：確認条件と受付済み申請の照合。
- lib/services/reservation-change-approval-service.ts：承認前の共通検証。
- lib/repositories/*reservation-repository.ts：確認記録の保存・再確認と承認前検証。
- app/api/reservations/change-requests/route.ts：本人確認、表示条件の照合、再申請の処理。
- app/page.tsx、app/reservations/components/reservation-fee-reconfirmation.tsx：再確認ボタン、元の変更内容の復元、確認条件の送信、既存申請の締切表示。
- tests/db/change-approval-guards.test.ts、change-approval-blocks.test.ts、google-calendar.test.tsなど：再現ケースの回帰テスト。

## 検証

- npm test：158件成功。
- npm run test:db:postgres -- --confirm reservation_system_test：57件成功（専用のローカルテストDB。開発DBの予約は使用しない）。
- npm run build：成功。既存のlint警告5件は今回の対象外。
- 追加・変更したロジックと新規UI部品のeslint：エラー・警告なし（既存app/page.tsxの警告は上記のとおり）。
- 隔離UI検証：実際のReservationFeeReconfirmationとCustomerRequestSubmitを架空データで表示。PC1280px・スマートフォン390pxで再確認ボタン、内容引継ぎ、警告、ダイアログ、「戻る」と確認後の完了状態を確認。390pxで横スクロールなし、再確認ボタン高44px。DB・Google・メールへの実送信は行っていない。
- 画像：review-artifacts/p1-fee-reconfirmation-desktop-2026-10-20.png、p1-fee-reconfirmation-mobile-2026-10-20.png、p1-fee-reconfirmation-entry-mobile-2026-10-20.png。
- localhost:3000/login：実サーバーのHTTP 200と画面表示を確認。

## 残る事項

- 実Googleアカウントでの登録・削除、実メール配送を含むE2Eは未実施。通信・DB障害は疑似Google APIとPostgreSQLで再現して検証した。
- 現在利用するDrizzle構成で確認記録を永続化。旧Data Connect構成では確認記録を保存できないため、料金対象の新規変更申請は503で安全側に停止する。クラウドDBの追加対応は今回行わない。
- P2：問い合わせメール失敗時の対応継続、キャンセル申請中の人数区分、古い変更申請による上書き防止は未対応。
- P3：予約変更詳細の中央表示への統一、大きな画面コンポーネントの分割などは未対応。

## 後続対応

上記のP2（問い合わせメール失敗時の対応継続、キャンセル申請中の人数区分、古い変更申請の上書き防止）とP3（予約変更詳細の中央表示）は、[43. 全体再レビューの8件の改善](43-eight-review-improvements-2026-10-21.md)で対応済み。大きな画面コンポーネントの追加分割は別途改善候補として残る。
