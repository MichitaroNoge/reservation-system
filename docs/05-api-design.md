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
- 認証・認可: 未実装
- バリデーション: 限定的。型・必須・形式検証は今後強化が必要
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

- 予約更新では顧客情報とメニュー明細の更新は未対応です。
- 顧客・店舗・メニューの削除は物理削除ではなく `active=false` の非活性化です。

## Server Actions

現時点で `use server` の Server Actions は確認できません。バックエンド処理は API Route とRepositoryに集約されています。

## エラー処理

API RouteではRepository例外を十分に分類していません。今後、以下を整理する必要があります。

- 404: 対象なし
- 400: 入力不正
- 409: 業務制約違反
- 500: 予期しないエラー

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
