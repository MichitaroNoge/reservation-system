# 認証・セキュリティ

## 認証方式

Firebase Authentication を利用します。

- フロントエンドは Firebase Web SDK でメールアドレス/パスワード認証を行います。
- API呼び出し時はFirebase IDトークンをBearer tokenとして送信します。
- API側は `lib/auth.ts` の `requireAdmin` でIDトークンを検証します。

根拠:

- `app/reservations/components/auth.tsx`
- `app/reservations/hooks/use-admin-session.ts`
- `app/reservations/firebase-client.ts`
- `app/api/auth/session/route.ts`
- `lib/auth.ts`

## 権限の種類

現在実装済みの権限は管理者のみです。

| 権限 | 判定方法 | 実行可能な操作 |
| --- | --- | --- |
| 未ログイン利用者 | IDトークンなし | 顧客予約申請のうち公開申請ステータスのみ |
| ログイン済み顧客 | Firebase IDトークンあり、管理者ではない | 顧客予約申請。Customerは `firebaseUid` で紐付く |
| 管理者 | `admin=true`、`role=admin`、または `FIREBASE_AUTH_ADMIN_EMAILS` のメール一致 | 予約管理、確認連絡、店舗割当、顧客/店舗/メニュー管理 |

顧客ログインは予約申請時のCustomer紐付けに利用します。顧客本人の予約一覧、変更、キャンセルなどのマイページ機能は未実装です。店舗担当者ロールも未実装です。

## 認可チェックの実装箇所

- Next.js API: `app/api/**/route.ts` で `requireAdmin` を呼び出します。
- Data Connect: 個人情報を含むqueryと更新系mutationは `@auth(level: NO_ACCESS)` です。
- Data Connect Repository: `FirebaseSqlConnectReservationRepository` は生成Admin SDK `@reservation-system/dataconnect-admin` を使用します。

例外:

- `POST /api/reservations` は、`temporary_requested` または `confirmed_requested` の顧客申請に限り未ログインで利用可能です。
- 顧客ログイン済みの場合、`POST /api/reservations` は任意のBearer IDトークンを検証し、管理者でないユーザーの `uid` を `Customer.firebaseUid` として利用します。
- 店舗・メニューの公開参照queryは、予約フォームの選択肢として使えるため `@auth(level: PUBLIC)` のままです。

根拠:

- `app/api/reservations/route.ts`
- `app/api/customers/**`
- `app/api/stores/**`
- `app/api/menus/**`
- `app/api/reservations/[id]/**`
- `dataconnect/reservation/queries.gql`
- `dataconnect/reservation/mutations.gql`

## 入力値検証

API側では `lib/api-validation.ts` で以下を検証します。

- JSON bodyがオブジェクトであること
- 日付形式、時刻形式
- 人数、店舗割当人数、金額、提供時間
- メールアドレス形式
- 電話番号形式
- 予約ステータスの許可リスト
- 店舗状態、確認連絡日時

ステータス遷移は `lib/domain.ts` の `assertReservationStatusTransition` で検証します。

## 個人情報の扱い

予約データには以下が含まれます。

- 氏名
- メールアドレス
- 電話番号
- 食事日、人数、メニュー、店舗割当

標準Repositoryでは Firebase Data Connect / Cloud SQL for PostgreSQL に保存します。

ローカルフォールバックでは `data/reservation-db.json` に保存されます。このファイルはGit管理対象外です。

## 秘密情報の管理方法

- `.env*` は `.gitignore` 対象です。
- 設計資料には秘密情報の値を記載しません。
- `FIREBASE_SERVICE_ACCOUNT_KEY` を利用する場合も値は設計資料に記載しません。
- 管理者メール一覧は `FIREBASE_AUTH_ADMIN_EMAILS` で管理します。

## 現在確認できるリスク

| リスク | 影響 | 対応案 |
| --- | --- | --- |
| メール許可リスト依存 | custom claim未設定でもメール一致で管理者扱いになる | 本番ではFirebase Auth custom claim `admin=true` に寄せる |
| 顧客・店舗担当者ロール未実装 | 権限分離が管理者中心になる | 顧客/店舗担当者ロールとAPI認可を追加 |
| 監査ログなし | 誰が変更したか追跡しにくい | 操作ログ保存 |
| メール未実装 | 確認連絡の実送信証跡なし | メール送信基盤と送信ログ |
| 404/409の細分化不足 | API利用者が原因を判別しづらい | 業務エラー型を追加 |
| Data Connect emulatorテストなし | 本番Data Connect特有の不具合を検出しづらい | emulatorまたは検証環境での統合テストを追加 |
