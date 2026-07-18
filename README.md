# Reservation System

レストラン予約の申請、管理、確認連絡、店舗割当、メニュー管理を行う Next.js アプリケーションです。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 主な機能

- 顧客向け予約申請フォーム
- 仮予約・本予約・キャンセル申請の管理
- 予約一覧の検索、絞り込み、並び替え
- 予約詳細、ステータス更新、確認連絡、店舗割当
- 複数メニュー選択とメニュー管理
- 顧客管理、店舗管理
- 設計資料: [docs/README.md](docs/README.md)

## DB方針

本番運用の保存先は Firebase Data Connect / Cloud SQL for PostgreSQL に寄せます。

`data/reservation-db.json` はローカル開発用の暫定フォールバックです。リポジトリでは管理しません。`RESERVATION_REPOSITORY=file` の場合のみ、初回APIアクセス時に `lib/seed-data.ts` から自動生成されます。通常は `RESERVATION_REPOSITORY=dataconnect` を使用します。

Repositoryは `RESERVATION_REPOSITORY` で切り替えます。

| 値 | 用途 |
| --- | --- |
| `file` | ローカル開発用。`data/reservation-db.json` を使用 |
| `dataconnect` | Firebase Data Connect / Cloud SQL for PostgreSQL を使用 |

Data Connect SDKは `src/generated/dataconnect` と `src/generated/dataconnect-admin` に生成されています。`FirebaseSqlConnectReservationRepository` は生成admin SDKを利用して一部の予約操作を実装しています。

## API

- `GET /api/reservations`
- `POST /api/reservations`
- `PATCH /api/reservations/:id`
- `PATCH /api/reservations/:id/status`
- `PATCH /api/reservations/:id/store`
- `PATCH /api/reservations/:id/confirmation-contact`
- `GET /api/customers`
- `PATCH /api/customers/:name`
- `DELETE /api/customers/:name`
- `GET /api/stores`
- `PATCH /api/stores/:name`
- `DELETE /api/stores/:name`
- `GET /api/menus`
- `POST /api/menus`
- `PATCH /api/menus/:name`
- `DELETE /api/menus/:name`

## Firebase Data Connect

Data Connect定義は `dataconnect/` にあります。

- `dataconnect/dataconnect.yaml`
- `dataconnect/schema/schema.gql`
- `dataconnect/reservation/queries.gql`
- `dataconnect/reservation/mutations.gql`
- `dataconnect/seed_data.gql`

実FirebaseのData Connectを使用する流れ:

1. `.firebaserc.example` を `.firebaserc` にコピーし、FirebaseプロジェクトIDを設定
2. `.env.example` を `.env.local` にコピーし、必要な環境変数を設定
3. Firebase CLIでログイン
   ```bash
   npx firebase login
   ```
4. クラウド側のData Connectサービスを確認
   ```bash
   npx firebase dataconnect:services:list
   ```
5. スキーマやGraphQL操作を変更した場合はSDKを再生成
   ```bash
   npx firebase dataconnect:sdk:generate
   ```
6. Data Connect定義をクラウドへデプロイ
   ```bash
   npx firebase deploy --only dataconnect
   ```
7. 必要に応じて初期データを投入

ローカルEmulatorでData Connectを検証する流れ:

1. `.env.local` で `NEXT_PUBLIC_USE_DATACONNECT_EMULATOR=true` を設定
2. `RESERVATION_REPOSITORY=dataconnect` を設定
3. Data Connect Emulatorを起動
   ```bash
   npx firebase emulators:start --only dataconnect
   ```

共通の注意:

- 実Firebaseを使う場合は `NEXT_PUBLIC_USE_DATACONNECT_EMULATOR=false` を設定
- 実Firebaseを使う場合は `RESERVATION_REPOSITORY=dataconnect` を設定
- スキーマやGraphQL操作を変更した場合は `npx firebase dataconnect:sdk:generate` でSDKを再生成

現在のGraphQL定義はプロトタイプ用に `@auth(level: PUBLIC)` を含みます。本番公開前に Firebase Authentication とロールベース認可へ変更してください。

## ビルド

```bash
npm run build
```
