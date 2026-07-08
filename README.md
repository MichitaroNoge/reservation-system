# Reservation System

予約システム設計書をもとにした Next.js プロトタイプです。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## 実装済み

- 顧客向け4ステップ仮予約フォーム
- 管理者ダッシュボード、予約一覧・絞り込み
- 予約詳細、承認、店舗割当、状態更新
- キャンセル確定、来店受付・利用実績への遷移
- Next.js API Routes による予約データ操作
- 開発用JSON DBによる予約作成・ステータス更新・店舗割当の永続化
- レスポンシブ表示

現在は `data/reservation-db.json` を開発用DBとして利用しています。初回APIアクセス時にシードデータから自動生成され、顧客画面から作成した仮予約や管理画面での更新内容はブラウザ更新後も保持されます。

## API

- `GET /api/reservations` 予約一覧
- `POST /api/reservations` 仮予約作成
- `PATCH /api/reservations/:id/status` 予約ステータス更新
- `PATCH /api/reservations/:id/store` 店舗割当
- `GET /api/customers` 顧客一覧
- `GET /api/stores` 店舗一覧
- `GET /api/menus` メニュー一覧

## Firebase SQL Connect

永続化層は Firebase SQL Connect（Cloud SQL for PostgreSQL）向けに構成しています。

設定済みのFirebaseプロジェクト情報:

- プロジェクト名: `reservation-system`
- プロジェクトID: `reservation-system-7f132`
- プロジェクト番号: `733972352801`
- WebアプリID: `1:733972352801:web:94f77b4e829dbf08793860`

1. `.firebaserc.example` を `.firebaserc` にコピーしてFirebaseプロジェクトIDを設定
2. `.env.example` を `.env.local` にコピーしてFirebase Web Appの設定を入力
3. Firebase CLIで `firebase init dataconnect:sdk` を実行
4. `firebase emulators:start --only dataconnect` でローカルPGLiteを起動
5. `firebase dataconnect:sdk:generate` で型安全なWeb SDKを生成

Firebase Web App の `apiKey` は未設定です。Firebaseコンソールで確認後、`.env.local` の `NEXT_PUBLIC_FIREBASE_API_KEY` に設定してください。

スキーマと操作定義は `dataconnect/` にあります。現在の公開権限はプロトタイプ用です。本番公開前にFirebase Authenticationを有効化し、管理操作をロールベース認証へ変更してください。
