# API設計

## API一覧

| API | 目的 | 呼び出し元 | 認証・認可 | ソース |
| --- | --- | --- | --- | --- |
| `GET /api/reservations` | 予約一覧取得 | 初期表示 | なし | `app/api/reservations/route.ts` |
| `POST /api/reservations` | 予約作成 | 顧客フォーム、新規予約 | なし | `app/api/reservations/route.ts` |
| `PATCH /api/reservations/:id` | 予約内容更新 | 予約詳細 | なし | `app/api/reservations/[id]/route.ts` |
| `PATCH /api/reservations/:id/status` | ステータス更新 | 予約詳細 | なし | `app/api/reservations/[id]/status/route.ts` |
| `PATCH /api/reservations/:id/store` | 店舗割当更新 | 予約詳細 | なし | `app/api/reservations/[id]/store/route.ts` |
| `PATCH /api/reservations/:id/confirmation-contact` | 確認連絡更新 | 予約詳細、確認連絡 | なし | `app/api/reservations/[id]/confirmation-contact/route.ts` |
| `GET /api/customers` | 顧客一覧取得 | 初期表示後の派生/顧客管理 | なし | `app/api/customers/route.ts` |
| `PATCH /api/customers/:name` | 顧客情報更新 | 顧客管理 | なし | `app/api/customers/[name]/route.ts` |
| `DELETE /api/customers/:name` | 顧客削除 | 顧客管理 | なし | `app/api/customers/[name]/route.ts` |
| `GET /api/stores` | 店舗一覧取得 | 初期表示 | なし | `app/api/stores/route.ts` |
| `PATCH /api/stores/:name` | 店舗更新 | 店舗管理 | なし | `app/api/stores/[name]/route.ts` |
| `DELETE /api/stores/:name` | 店舗削除 | 店舗管理 | なし | `app/api/stores/[name]/route.ts` |
| `GET /api/menus` | メニュー一覧取得 | 初期表示 | なし | `app/api/menus/route.ts` |
| `POST /api/menus` | メニュー追加 | メニュー管理 | なし | `app/api/menus/route.ts` |
| `PATCH /api/menus/:name` | メニュー更新 | メニュー管理 | なし | `app/api/menus/[name]/route.ts` |
| `DELETE /api/menus/:name` | メニュー削除 | メニュー管理 | なし | `app/api/menus/[name]/route.ts` |

## 共通仕様

- API方式: Next.js Route Handlers。
- Runtime: 各Routeで `export const runtime = "nodejs"`。
- Repository: `getReservationRepository()` 経由で `FileReservationRepository` を利用。
- 入力形式: JSON。
- 出力形式: JSON。
- 認証・認可: 実装なし。
- バリデーション: API Routeでは明示的なスキーマ検証なし。
- エラー処理: Repository例外が発生した場合の統一レスポンス整形は未実装。

## バックエンド処理

### `FileReservationRepository`

| 関数 | 目的 | 更新内容 |
| --- | --- | --- |
| `listReservations` | 予約一覧取得 | なし |
| `createReservation` | 予約追加 | `reservations` に追加 |
| `updateReservation` | 予約内容更新 | 日時、人数、顧客情報、メニュー、金額 |
| `updateReservationStatus` | ステータス更新 | `status` |
| `updateConfirmationContact` | 確認連絡日時更新 | `confirmationContactedAt` |
| `assignStores` | 店舗割当更新 | `storeAssignments`, `store` |
| `listCustomers` | 予約から顧客一覧を集計 | なし |
| `updateCustomer` | 顧客情報更新 | 該当顧客名の予約を更新 |
| `deleteCustomer` | 顧客削除 | 該当顧客名の予約を削除 |
| `listStores` | 店舗一覧取得 | なし |
| `updateStore` | 店舗更新 | 店舗情報、予約内店舗名 |
| `deleteStore` | 店舗削除 | 店舗削除、予約の割当解除 |
| `listMenus` | メニュー一覧取得 | なし |
| `createMenu` | メニュー追加 | `menus` に追加 |
| `updateMenu` | メニュー更新 | メニュー情報、予約内メニュー名、金額 |
| `deleteMenu` | メニュー削除 | メニュー削除、予約内メニュー削除、金額 |

根拠: `lib/repositories/file-reservation-repository.ts`。

## Server Actions

現行コードでは `use server` またはServer Actionsの実装は確認できません。

## API方式でないサーバー側関数

- `readDatabase`: JSON DB読み込み。失敗時はSeedから初期化。
- `writeDatabase`: JSON DB書き込み。
- `normalizeReservation`: 旧形式メニューや店舗割当を現行形に正規化。
- `calculateTotalAmount`: メニュー名から合計金額を算出。
- `nextReservationId`: `RSV-` の連番採番。

## バリデーションとエラー処理

確認できるバリデーション:

- 店舗割当人数合計が予約人数と一致しない場合は例外。
- メニュー追加時に同名があれば例外。
- 更新対象が存在しない場合は例外。

未確認/未実装:

- API入力の型検証。
- 日付形式検証。
- メール形式検証。
- 電話番号形式検証。
- 認証・認可。
- 統一エラーレスポンス。

