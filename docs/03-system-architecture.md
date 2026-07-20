# システムアーキテクチャ

## システム構成

このシステムは Next.js App Router、Next.js Route Handlers、Repository層、Firebase Data Connect / Cloud SQL for PostgreSQL で構成します。

ローカル開発では暫定的に `FileReservationRepository` を利用できますが、本番方針は Data Connect / PostgreSQL です。

```mermaid
flowchart TD
  Browser["ブラウザ"]
  Page["app/page.tsx<br/>画面・状態管理"]
  AuthUi["app/reservations/components/auth.tsx<br/>ログインUI"]
  FirebaseAuth["Firebase Authentication"]
  Api["app/api/**/route.ts<br/>Next.js Route Handlers"]
  ApiAuth["lib/auth.ts<br/>IDトークン検証"]
  Repo["ReservationRepository"]
  DataConnectRepo["FirebaseSqlConnectReservationRepository"]
  FileRepo["FileReservationRepository<br/>ローカルフォールバック"]
  DataConnect["Firebase Data Connect"]
  Postgres["Cloud SQL for PostgreSQL"]
  JsonFile["data/reservation-db.json<br/>Git管理外"]
  Seed["lib/seed-data.ts"]

  Browser --> Page
  Page --> AuthUi
  AuthUi --> FirebaseAuth
  Page --> Api
  Api --> ApiAuth
  ApiAuth --> FirebaseAuth
  Api --> Repo
  Repo --> DataConnectRepo
  DataConnectRepo -->|"Admin SDK"| DataConnect
  DataConnect --> Postgres
  Repo -. RESERVATION_REPOSITORY=file .-> FileRepo
  FileRepo -. 初回生成 .-> Seed
  FileRepo --> JsonFile
```

## フロントエンド

- Next.js App Router
- 主画面: `app/page.tsx`
- グローバルCSS: `app/globals.css`
- 予約管理、確認連絡、顧客管理、店舗管理、メニュー管理を同一画面内の状態で切り替えています。

## バックエンド

- Next.js Route Handlers を使用します。
- 各APIは `getReservationRepository()` 経由でRepositoryを呼び出します。
- Repository選択は `RESERVATION_REPOSITORY` で行います。

| 値 | Repository | 用途 |
| --- | --- | --- |
| `dataconnect` | `FirebaseSqlConnectReservationRepository` | 本番方針 |
| `file` | `FileReservationRepository` | ローカル開発用フォールバック |

## データベース

本番方針:

- Firebase Data Connect
- Cloud SQL for PostgreSQL
- 定義: `dataconnect/schema/schema.gql`
- Query/Mutation: `dataconnect/reservation/*.gql`

ローカルフォールバック:

- `data/reservation-db.json`
- `.gitignore` 対象
- `lib/seed-data.ts` から初回生成

## 認証

Firebase Authentication を利用します。

- 画面: `app/reservations/components/auth.tsx` と `useAdminSession` でログイン状態を扱います。
- API: `lib/auth.ts` の `requireAdmin` がBearer IDトークンを検証します。
- 管理者判定: IDトークンの `admin=true`、`role=admin`、または `FIREBASE_AUTH_ADMIN_EMAILS` に含まれるメールアドレスで判定します。
- 顧客予約申請: `POST /api/reservations` は公開申請ステータスに限り未ログインでも受け付けます。

## 外部サービス

| サービス | 用途 | 根拠 |
| --- | --- | --- |
| Firebase Data Connect | GraphQL経由のDBアクセス | `dataconnect/**` |
| Cloud SQL for PostgreSQL | 本番DB | `dataconnect/dataconnect.yaml` |
| Firebase Authentication | 管理者ログイン、API認証 | `lib/firebase-config.ts`, `lib/auth.ts` |
| Firebase Web App | Firebase接続設定 | `.env.example`, `lib/firebase-config.ts` |

## メール送信

未実装です。確認連絡では現時点で `confirmationContactedAt` を更新するだけです。

## デプロイ先

未確認です。`firebase.json` には Data Connect emulator 設定がありますが、Hosting等の本番デプロイ設定は未確認です。

## CI/CD

未確認です。`.github/workflows` は確認できていません。

## 環境変数

| 変数名 | 用途 |
| --- | --- |
| `RESERVATION_REPOSITORY` | `dataconnect` または `file` のRepository切替 |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web App設定 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `NEXT_PUBLIC_USE_DATACONNECT_EMULATOR` | Data Connect Emulator利用フラグ |
| `FIREBASE_AUTH_ADMIN_EMAILS` | 管理者として許可するメールアドレス一覧 |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin SDKのサービスアカウントJSON |
| `FIREBASE_DATACONNECT_LOCATION` | Data Connect location |
| `FIREBASE_DATACONNECT_SERVICE_ID` | Data Connect service ID |
| `FIREBASE_DATACONNECT_CONNECTOR` | Data Connect connector名 |

## Data Connect認可

個人情報を含む予約・顧客・請求の参照、および全更新系mutationは `@auth(level: NO_ACCESS)` とし、Next.js APIから生成Admin SDK経由で実行します。

店舗・メニューの公開参照queryのみ、顧客予約フォームの選択肢として使える情報のため `@auth(level: PUBLIC)` のままです。
