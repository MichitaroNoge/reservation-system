# 運用・デプロイ

## ローカル開発手順

```bash
npm install
npm run dev
```

PowerShell環境で `npm.ps1` の実行ポリシーにより失敗する場合は、以下を使用します。

```bash
npm.cmd run dev
```

アクセス先:

- `http://localhost:3000`

根拠: `README.md`, `package.json`。

## 必要なソフトウェア

- Node.js
- npm
- Firebase CLI: Data Connectを利用する場合のみ。現行ファイルDB実行では必須ではありません。

バージョン固定は未確認です。

## 環境変数一覧

値は記載しません。

| 変数名 | 用途 | 必須性 |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web App設定 | Data Connect/Firebase利用時 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | Data Connect/Firebase利用時 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | Data Connect/Firebase利用時 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | Data Connect/Firebase利用時 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | Data Connect/Firebase利用時 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID | Data Connect/Firebase利用時 |
| `NEXT_PUBLIC_USE_DATACONNECT_EMULATOR` | Data Connect Emulator利用フラグと思われる | 現行コードで参照未確認 |

現行RepositoryはファイルDB固定のため、画面/API実行だけならFirebase環境変数は使われていない可能性があります。

## ビルド方法

```bash
npm run build
```

PowerShellで失敗する場合:

```bash
npm.cmd run build
```

## テスト方法

未確認です。

- `package.json` に `test` script はありません。
- Jest/Vitest/Playwright等の設定ファイルは確認できません。

現時点で実行可能な確認:

```bash
npm.cmd run build
```

## デプロイ方法

未確認です。

確認できる設定:

- `firebase.json` はData Connect Emulator設定を含む。
- Next.jsのデプロイ先設定は確認できません。
- `.openai/hosting.json`, Vercel設定、GitHub Actionsは確認できません。

## CI/CD

未確認です。`.github/workflows` は確認できません。

## データベースの更新方法

現行:

- API経由で `data/reservation-db.json` を更新。
- ファイルがない場合は `lib/seed-data.ts` から生成。

Data Connect:

- `dataconnect/schema/schema.gql`
- `dataconnect/reservation/*.gql`
- `firebase dataconnect:sdk:generate` によりSDK生成する想定。ただし現行Repositoryでは未接続。

## 障害時の確認箇所

| 症状 | 確認箇所 |
| --- | --- |
| 画面が起動しない | `npm.cmd run dev`, `npm.cmd run build` の出力 |
| APIが失敗する | `app/api/**/route.ts`, Repository例外 |
| データが消えた/戻った | `data/reservation-db.json`, `lib/seed-data.ts` |
| 店舗割当保存失敗 | 割当人数合計と予約人数 |
| メニュー金額がおかしい | `calculateTotalAmount`, `menus` |
| 文字化け | `lib/domain.ts`, `lib/seed-data.ts`, `data/reservation-db.json`, `README.md` |

## ログの確認方法

未確認です。

現行コードに専用ログ出力、監視、外部ログ基盤は確認できません。Next.js開発サーバー/実行環境の標準出力を確認します。

## バックアップ・リストア方法

未確認です。

現行ファイルDBの場合の暫定案:

- バックアップ: `data/reservation-db.json` を安全な場所へコピー。
- リストア: アプリ停止後に同ファイルを戻す。

注意:

- 個人情報を含むため、バックアップファイルの保管先・権限管理が必要です。
- 本番運用手順は未確認です。

