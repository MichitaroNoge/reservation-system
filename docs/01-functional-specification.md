# 機能仕様

## 機能一覧

| 機能 | 実装状況 | 利用者 | 関連画面 | 関連API/処理 |
| --- | --- | --- | --- | --- |
| 顧客予約申請 | 実装済み | 顧客 | 顧客画面 | `POST /api/reservations` |
| 予約一覧 | 実装済み | 管理者 | 予約管理 | `GET /api/reservations` |
| 予約内容編集 | 実装済み | 管理者 | 予約詳細ドロワー | `PATCH /api/reservations/:id` |
| ステータス更新 | 実装済み | 管理者 | 予約詳細ドロワー | `PATCH /api/reservations/:id/status` |
| 店舗割当 | 実装済み | 管理者 | 予約詳細ドロワー | `PATCH /api/reservations/:id/store` |
| 確認連絡更新 | 実装済み | 管理者 | 予約詳細ドロワー、確認連絡 | `PATCH /api/reservations/:id/confirmation-contact` |
| 確認連絡一括更新 | 実装済み | 管理者 | 確認連絡 | 個別APIを複数回呼び出し |
| 顧客管理 | 実装済み | 管理者 | 顧客管理 | `GET /api/customers`, `PATCH/DELETE /api/customers/:name` |
| 店舗管理 | 実装済み | 管理者 | 店舗管理 | `GET /api/stores`, `PATCH/DELETE /api/stores/:name` |
| メニュー管理 | 実装済み | 管理者 | メニュー管理 | `GET/POST /api/menus`, `PATCH/DELETE /api/menus/:name` |
| 利用実績・請求表示 | 一部実装 | 管理者 | 利用実績・請求 | API未確認。静的表示 |
| メール送信 | 未実装 | 管理者 | 確認連絡、予約詳細 | 実装なし |
| 認証・認可 | 一部実装 | 管理者 | 管理画面、API | Firebase Authentication、`requireAdmin`、Data Connect `NO_ACCESS` |
| Firebase Data Connect連携 | 実装済み | 開発者 | なし | `FirebaseSqlConnectReservationRepository` が生成Admin SDKを利用 |

## 機能詳細

### 顧客予約申請

- 目的: 顧客が仮予約または本予約を申し込む。
- 利用者: 顧客。
- 入力: 予約種別、同意チェック、利用日、開始時間、人数、氏名、メールアドレス、電話番号、メニュー。
- 処理内容: フォーム入力を `POST /api/reservations` へ送信し、API側で入力検証後、Repositoryで予約を追加する。
- 出力: 受付完了画面、トースト通知。
- エラー時の動作: API失敗時に「予約申請の保存に失敗しました」を表示。
- 関連データモデル: `Reservation`, `PolicyAgreement`, `Menu`。
- 根拠: `CustomerPortal` in `app/page.tsx`, `app/api/reservations/route.ts`, `lib/api-validation.ts`, `FileReservationRepository.createReservation`, `FirebaseSqlConnectReservationRepository.createReservation`。

### 予約一覧・検索・フィルタ

- 目的: 管理者が予約を一覧で確認する。
- 利用者: 管理者。
- 入力: キーワード、日付範囲、予約フィルタ、ソート。
- 処理内容: フロントエンド state 上で絞り込み、ソートする。
- 出力: 予約一覧テーブル。
- エラー時の動作: 初期読込失敗時にトースト表示。
- 関連画面/API: 予約管理、`GET /api/reservations`。
- 根拠: `ManagementPage` in `app/page.tsx`, `useEffect` in `Home`。

### 予約内容編集

- 目的: 管理者が予約日、開始時間、人数、顧客情報、メニューを変更する。
- 入力: 予約編集フォーム。
- 処理内容: `PATCH /api/reservations/:id` を呼び出す。メニューが変わる場合は合計金額を再計算する。
- 出力: 予約詳細と一覧の更新、トースト通知。
- エラー時の動作: API側で入力不正は400、認証不備は401/403としてJSONエラーを返す。画面側では保存失敗トーストを表示する。
- 根拠: `updateReservation` in `app/page.tsx`, `app/api/reservations/[id]/route.ts`, `lib/api-validation.ts`, `FileReservationRepository.updateReservation`, `FirebaseSqlConnectReservationRepository.updateReservation`。

### ステータス更新

- 目的: 予約の業務状態を変更する。
- 入力: 変更後ステータス。
- 処理内容: `PATCH /api/reservations/:id/status` で保存する。共通の状態遷移ルールで通常遷移と手動例外遷移を検証する。
- 出力: 予約一覧・詳細の状態更新。
- エラー時の動作: 保存失敗時にトースト表示。
- 補足: 例外対応では変更理由入力とブラウザ確認ダイアログがあるが、理由は永続化されない。
- 根拠: `updateStatus`, `ReservationDrawer` in `app/page.tsx`, `assertReservationStatusTransition` in `lib/domain.ts`。

### 店舗割当

- 目的: 本予約確定後に予約人数を店舗へ割り当てる。
- 入力: 店舗名、人数。複数行の割当が可能。
- 処理内容: 割当人数合計が予約人数と一致する場合に保存する。空配列は未割当として保存可能。
- 出力: 店舗割当表示、条件が揃えば来店待ちへ進行。
- エラー時の動作: Repositoryで人数不一致の場合に例外。画面では保存失敗トースト。
- 根拠: `assignStores` in `app/page.tsx`, `app/api/reservations/[id]/store/route.ts`, `lib/api-validation.ts`, `FileReservationRepository.assignStores`, `FirebaseSqlConnectReservationRepository.assignStores`。

### 確認連絡

- 目的: 食事日が近い本予約に対して確認連絡済みを記録する。
- 入力: `contactedAt` 日時、確認連絡画面の日数条件。
- 処理内容: `confirmationContactedAt` を更新する。一覧画面では条件に合う予約を抽出し、一括更新時に個別APIを複数回呼ぶ。
- 出力: 確認連絡済み表示。メニュー・店舗割当・確認連絡が揃うと来店待ちへ進む。
- エラー時の動作: 保存失敗トースト。
- 未実装: 実メール送信。
- 根拠: `isConfirmationContactDue`, `bulkUpdateConfirmationContacts`, `saveConfirmationContact` in `app/page.tsx`, `app/api/reservations/[id]/confirmation-contact/route.ts`。

### 顧客管理

- 目的: 予約から集計された顧客情報を確認・編集・削除する。
- 入力: 氏名、メール、電話番号。
- 処理内容: 顧客名に一致する予約の顧客情報を一括更新する。削除時は関連予約も一覧から削除される。
- 出力: 顧客一覧。
- エラー時の動作: API側で入力不正は400、認証不備は401/403としてJSONエラーを返す。
- 根拠: `CustomerManagement`, `app/api/customers/[name]/route.ts`, `lib/api-validation.ts`, `FileReservationRepository.updateCustomer/deleteCustomer`, `FirebaseSqlConnectReservationRepository.updateCustomer/deleteCustomer`。

### 店舗管理

- 目的: 店舗一覧の編集・削除を行う。
- 入力: 店舗名、エリア、本日件数、月間件数、状態。
- 処理内容: 店舗名変更時は予約の店舗割当名も更新する。削除時は関連割当を未割当に戻す。
- 根拠: `StoreManagement`, `FileReservationRepository.updateStore/deleteStore`。

### メニュー管理

- 目的: 予約フォームで選べるメニューを管理する。
- 入力: メニュー名、説明、価格、提供目安。
- 処理内容: メニュー追加・編集・削除。名称変更時は予約内の `menuItems` 名も更新する。金額を再計算する。
- 根拠: `MenuManagement`, `FileReservationRepository.createMenu/updateMenu/deleteMenu`。

## 実装区分の注意

- 「実装済み」は現行コードで画面/API/Repository処理が確認できるものです。
- 「一部実装」は画面または定義だけが存在し、永続化や実処理が不足しているものです。
- 「未実装」はコード上の実装が確認できないものです。
