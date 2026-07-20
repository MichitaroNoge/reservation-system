# 運用・デプロイ

## ローカル開発手順

```bash
npm install
npm run dev
```

ローカルでファイルDBを使う場合:

```env
RESERVATION_REPOSITORY=file
```

この場合、`data/reservation-db.json` は初回APIアクセス時に `lib/seed-data.ts` から自動生成されます。Git管理対象外です。

## 必要なソフトウェア

- Node.js
- npm
- Firebase CLI: Data Connectを利用する場合

## 環境変数

| 変数名 | 用途 |
| --- | --- |
| `RESERVATION_REPOSITORY` | `file` または `dataconnect` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web App設定 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `NEXT_PUBLIC_USE_DATACONNECT_EMULATOR` | Data Connect Emulator利用フラグ |

値は設計資料に記載しません。

## ビルド方法

```bash
npm run build
```

## テスト方法

`package.json` に `test` script はありません。現時点では `npm run build` が主要な静的確認です。

## Data Connect検証手順

1. `.firebaserc.example` を `.firebaserc` にコピー
2. `.env.example` を `.env.local` にコピー
3. `RESERVATION_REPOSITORY=dataconnect` を設定
4. スキーマやGraphQL操作を変更した場合は `npx firebase dataconnect:sdk:generate` でSDK再生成
5. `firebase emulators:start --only dataconnect` でローカル検証

現時点では生成admin SDKを利用して、予約一覧、予約作成、ステータス更新、確認連絡更新、顧客一覧、店舗一覧、メニュー一覧を実装しています。未実装の更新系操作はRepositoryが明示的にエラーを返します。

## デプロイ方法

未確認です。

## CI/CD

未確認です。

## データベース更新方法

Data Connect:

- スキーマ: `dataconnect/schema/schema.gql`
- 操作定義: `dataconnect/reservation/*.gql`
- シード: `dataconnect/seed_data.gql`

ローカルフォールバック:

- `lib/seed-data.ts` を更新
- `data/reservation-db.json` を削除すると次回APIアクセス時に再生成

## 障害時の確認箇所

| 症状 | 確認箇所 |
| --- | --- |
| APIがRepositoryエラーになる | `RESERVATION_REPOSITORY`, `lib/repositories/index.ts` |
| Data Connectで接続できない | Firebase CLI、生成SDK、`.env.local` |
| ローカルデータが戻る | `data/reservation-db.json`, `lib/seed-data.ts` |
| 画面表示が崩れる | `app/page.tsx`, `app/globals.css` |

## ログの確認方法

未確認です。

## バックアップ・リストア方法

Data Connect / Cloud SQL for PostgreSQL のバックアップ方針は未確認です。Cloud SQLの自動バックアップ、ポイントインタイムリカバリ、手動エクスポートの採用を検討してください。
