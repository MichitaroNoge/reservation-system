# API設計

## API一覧

| API | 目的 | ソース |
| --- | --- | --- |
| `GET /api/reservations` | 予約一覧取得 | `app/api/reservations/route.ts` |
| `POST /api/reservations` | 予約作成 | `app/api/reservations/route.ts` |
| `PATCH /api/reservations/:id` | 予約内容更新 | `app/api/reservations/[id]/route.ts` |
| `PATCH /api/reservations/:id/status` | ステータス更新 | `app/api/reservations/[id]/status/route.ts` |
| `PATCH /api/reservations/:id/store` | 店舗割当更新 | `app/api/reservations/[id]/store/route.ts` |
| `PATCH /api/reservations/:id/confirmation-contact` | 確認連絡日時更新 | `app/api/reservations/[id]/confirmation-contact/route.ts` |
| `GET /api/customers` | 顧客一覧取得 | `app/api/customers/route.ts` |
| `GET /api/customers/me` | ログイン済み顧客のCustomer取得 | `app/api/customers/me/route.ts` |
| `PATCH /api/customers/:name` | 顧客更新 | `app/api/customers/[name]/route.ts` |
| `DELETE /api/customers/:name` | 顧客削除 | `app/api/customers/[name]/route.ts` |
| `GET /api/stores` | 店舗一覧取得 | `app/api/stores/route.ts` |
| `PATCH /api/stores/:name` | 店舗更新 | `app/api/stores/[name]/route.ts` |
| `DELETE /api/stores/:name` | 店舗削除 | `app/api/stores/[name]/route.ts` |
| `GET /api/menus` | メニュー一覧取得 | `app/api/menus/route.ts` |
| `POST /api/menus` | メニュー作成 | `app/api/menus/route.ts` |
| `PATCH /api/menus/:name` | メニュー更新 | `app/api/menus/[name]/route.ts` |
| `DELETE /api/menus/:name` | メニュー削除 | `app/api/menus/[name]/route.ts` |

## 共通仕様

- API方式: Next.js Route Handlers
- Runtime: Node.js
- 入力: JSON
- 出力: JSON
- 認証・認可: 管理APIは `requireAdmin` でFirebase IDトークンを検証。顧客予約申請は公開申請ステータスに限り未ログイン可
- バリデーション: `lib/api-validation.ts` で日付、時刻、人数、メール、電話、ステータス、店舗割当人数、メニュー金額などを検証
- エラー応答: 入力不正は400、認証なしは401、管理権限なしは403、その他は500のJSONエラーを返す
- Repository: `getReservationRepository()` 経由

## Repository切替

`RESERVATION_REPOSITORY` で切り替えます。

| 値 | 処理 |
| --- | --- |
| `dataconnect` | `FirebaseSqlConnectReservationRepository` を利用 |
| `file` | `FileReservationRepository` を利用 |

本番・ローカル標準方針は `dataconnect` です。Data Connect SDKは `src/generated/dataconnect-admin` に生成済みで、`FirebaseSqlConnectReservationRepository` は生成admin SDKを利用します。

## Data Connect Repository対応状況

実装済み:

- 予約一覧取得
- 予約作成
- 予約の日付・時刻・人数更新
- 予約ステータス更新
- 確認連絡日時更新
- 店舗割当置換
- 顧客一覧取得、更新、非活性化
- 店舗一覧取得、更新、非活性化
- メニュー一覧取得、作成、更新、非活性化

現時点の制約:

- 予約更新では、予約日・時刻・人数に加えて、顧客情報とメニュー明細の置換に対応しています。
- 顧客・店舗・メニューの削除は物理削除ではなく `active=false` の非活性化です。

## Server Actions

現時点で `use server` の Server Actions は確認できません。バックエンド処理は API Route とRepositoryに集約されています。

## エラー処理

API Routeは `apiErrorResponse` で共通のJSONエラーを返します。

- 400: `ApiValidationError` または入力・業務制約違反
- 401: 認証なし
- 403: 管理者権限なし
- 500: 予期しないエラー

404や409など、より細かい業務エラー分類は未実装です。

## Data Connect操作定義

Data Connect移行先のGraphQL操作は以下にあります。

- `dataconnect/reservation/queries.gql`
- `dataconnect/reservation/mutations.gql`

主な操作:

- `ListReservations`
- `GetReservationByCode`
- `CreateReservation`
- `UpdateReservation`
- `UpdateReservationStatus`
- `UpdateConfirmationContact`
- `AssignStore`
- `DeleteStoreAssignment`
- `UpdateCustomer`
- `DeactivateCustomer`
- `UpdateStore`
- `DeactivateStore`
- `CreateMenu`
- `UpdateMenu`
- `DeactivateMenu`

認可:

- 予約・顧客・請求など個人情報を含むqueryは `@auth(level: NO_ACCESS)`。
- 更新系mutationはすべて `@auth(level: NO_ACCESS)`。
- 店舗・メニューの公開参照queryのみ `@auth(level: PUBLIC)`。
- Next.js APIは生成Admin SDK `@reservation-system/dataconnect-admin` 経由でData Connectを呼び出す。
