# reservation-system

団体予約管理システム。

## Account と予約者情報の方針

- ログイン可能な利用者だけを `Account` マスタとして保持します。
- 予約時の氏名・メール・電話・住所・旅行会社情報は `Reservation` にスナップショット保存します。
- 管理者代理予約・非会員予約では Account を検索・作成・紐付けしません。
- ログイン済み本人が作成した予約だけ Account に紐付けます。
- Firebase Authユーザーに対応するAccountがまだ無い場合は、初回の本人予約時にFirebase UIDをキーとして作成します。
- メールアドレス等が一致しても、過去の代理予約を後から Account に紐付けません。
- Accountプロフィール変更で過去予約の予約者情報は更新しません。

詳細は `docs/04-database-design.md` を参照してください。

## 開発

開発DBはDocker ComposeのPostgreSQL＋Drizzleを使用します。Firebase AuthenticationとResendは既存構成を維持します。
検証・本番向けにCloud SQL IAM Connector＋Drizzleの接続を用意しました。実環境への反映はバックアップ制限により保留です。`DB_PROVIDER`未設定時の旧Data Connectは読み取り専用で、書き込みは503で停止します。クラウド手順は[運用手順](docs/15-cloud-sql-operation.md)、対応状況は[作業記録](docs/14-p1-remediation-2026-10-15.md)を参照してください。

### Windowsの準備

1. Node.js 22以上、Docker Desktop、WSL 2を準備します。Docker DesktopはLinuxコンテナーで起動してください。
2. `docker --version`、`docker compose version`、`docker info`が成功することを確認します。
3. `npm install`を実行します。
4. `.env.example`を`.env.development`へコピーして、ローカル専用のパスワードを設定します。
   既に`.env.development`がある場合は上書きせず、設定を確認してください。

Docker Desktopの無料利用には組織規模等の条件があります。https://docs.docker.com/desktop/setup/install/windows-install/

### 環境変数

`.env.development`はGit管理対象外です。ComposeとDB操作コマンドはこのファイルを明示的に読み込みます。

```dotenv
DB_PROVIDER=drizzle
APP_ENV=development
POSTGRES_DB=reservation_system_dev
POSTGRES_USER=reservation_dev
POSTGRES_PASSWORD=<ローカル専用パスワード>
POSTGRES_PORT=5433
DATABASE_URL=postgresql://reservation_dev:<URLエンコードしたパスワード>@127.0.0.1:5433/reservation_system_dev
```

Firebaseの公開設定、Firebase Admin認証情報、Resend設定も従来どおり設定します。DBをローカル化してもFirebase AdminによるIDトークン検証には認証情報が必要です。
`DATABASE_URL`はサーバー専用です。`NEXT_PUBLIC_`を付けないでください。

`APP_ENV`は接続先の環境を識別するための設定です。ビルドで`NODE_ENV=production`になることとは別に扱います。
既存の`.env.local`やシェルにDB設定がある場合は確認してください。`npm run dev:local`はDBコマンドと同じ設定を読み込み、チェックした値をNext.jsへ明示的に渡します。
シェル環境変数が優先されるため、過去に設定した`DATABASE_URL`等が残っている場合は解除してください。

開発でメールを試す場合は`RESEND_TEST_RECIPIENT`を自分の検証先に設定してください。Seedはメールを送信しません。

### PostgreSQLの起動・マイグレーション・Seed

PowerShellから順番に実行します。

```powershell
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev:local
```

`db:up`はヘルスチェック完了まで待ち、さらに実接続を確認します。接続ポートは`127.0.0.1:5433`のみです。
PostgreSQLイメージは`postgres:17.11-bookworm`に固定しています。既存Cloud SQLはPostgreSQL 18で、物理スキーマは読み取り専用で照合済みです。クラウドへの変更はまだ適用していません。

Seedは店舗・メニュー・メールテンプレート・サンプルAccount・旧顧客・予約・明細・店舗割り当てを投入します。
固定UUID等で重複を防ぎ、再実行しても編集済みデータは上書きしません。サンプル予約の受付日時は有効なISO日時へ変換しています。
サンプル予約を本人の予約一覧で確認する場合は、**既存のFirebase Authユーザー**のUIDを`DEV_SEED_FIREBASE_UID`に指定してからSeedを実行します。
SeedはFirebase Authユーザーを作成・変更しません。UID未指定のサンプルAccountはログイン用途ではありません。
Seed後にUIDを変えても既存予約は再紐付けされません。紐付けし直す場合は必要なローカルデータをバックアップし、初期化してください。

### 停止・再起動・データ再構築

ブラウザーでローカルDBを確認する場合は、別のPowerShellで`npm run db:studio`を実行し、表示されたDrizzle StudioのURLを開きます。
`reservation`（予約）、`account`（会員）、`store`（店舗）、`menu`（メニュー）などのテーブルを表示できます。
Studioは127.0.0.1:4983に限定し、既存の接続先保護を使用します。編集・削除も可能なため、閲覧時は保存や削除を実行しないでください。終了はCtrl+Cです。

```powershell
npm run db:check
npm run db:stop
npm run db:up
```

`db:stop`はコンテナーを停止し、`db:down`はコンテナーとネットワークを除去します。どちらもVolume内のDBデータを保持します。
初期化する場合は、**ローカル開発DBのデータがすべて失われる**ことを確認して次を実行します。

```powershell
npm run db:reset -- --confirm reservation_system_dev
```

初期化は専用DBのスキーマを再構築し、同じマイグレーションとSeedを再実行します。Volumeの再作成ではないため、元のDBユーザーとパスワードは維持されます。
通常の停止で`docker compose down -v`を使用しないでください。Volumeの削除は復元不能なデータ削除になります。

DBコマンドは`APP_ENV=development/test`、ループバック接続、専用DB名を検証し、Vercel上やリモートDBでは実行を拒否します。
ローカル用コマンドは本番マイグレーションには使用できません。クラウドには保護された別コマンド `npm run db:cloud` を使用します。

### スキーマ変更

```powershell
# lib/db/schema.tsの変更後、SQLを生成して内容をレビュー
npm run db:generate
npm run db:migrate
```

`lib/db/schema.ts`と`drizzle/`内のSQL・メタデータを一緒にGit管理します。適用済みSQLは書き換えず、新しいマイグレーションを追加します。
アプリ起動・ビルド時にマイグレーションやSeedを自動実行しません。DBへの`push`による直接変更も標準手順に含めません。

### テスト

```powershell
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
```

`test:db`は独立したPGliteのPostgreSQLエンジンで、実SQLマイグレーション・制約・Repository・認可・ロールバックを検証します。
Firebaseトークン検証とメール送信はテストで代替し、クラウドへ接続・送信しません。PGliteは複数接続の競合テストを代替しません。

DockerのPostgreSQLとnode-postgresドライバーで全DBテストを実行する場合は、隔離したテストDBを準備します。

```powershell
docker compose --env-file .env.development exec postgres sh -c 'createdb -U "$POSTGRES_USER" reservation_system_test'
```

`.env.development`の`TEST_DATABASE_URL`を同じユーザー・パスワード・ポートの`reservation_system_test`に設定して実行します。

```powershell
npm run test:db:postgres -- --confirm reservation_system_test
```

このコマンドは**テストDB内のデータを初期化**します。開発DB名やリモートホストは拒否します。
予約番号の同時採番、承認と却下の競合も複数接続で検証します。

### よくあるエラー

| 症状 | 対処 |
|---|---|
| Docker CLIが見つからない | Docker Desktopをインストールし、ターミナルを開き直す |
| Docker daemonに接続できない | Docker Desktopを起動し、WSL 2とLinuxコンテナーを確認する |
| ポート5433が使用中 | `POSTGRES_PORT`と`DATABASE_URL`のポートを同じ空きポートに変更する |
| パスワード認証エラー | Volume作成時のパスワードと一致させる。環境ファイルの変更だけでは既存DBのパスワードは変わらない |
| relation does not exist | `npm run db:migrate`を実行する |
| 環境・DB名の検証に失敗 | `APP_ENV`、ホスト、専用DB名、シェルの既存設定を確認する。保護を解除しない |
| Firebase Admin認証情報のエラー | 従来のサービスアカウントまたはADCを設定する。DB移行でAuthの設定は不要にならない |
| 本人のサンプル予約が出ない | `DEV_SEED_FIREBASE_UID`とログインユーザーのUIDを確認する |
| テストDBが既に存在する | `createdb`は省略する。通常テストは専用DB内だけを再構築する |

### 既存Cloud SQLのデータと将来の移行

今回Cloud SQLへの接続、バックアップ取得、停止、削除、Vercel設定変更は実施していません。Data Connectの定義・SDK・Repositoryは保持しています。
既存クラウドリソースが残っている間は、その費用が自動的になくなるわけではありません。

既存データを利用する場合は、利用者側で承認済みの対象DBについてバックアップとスキーマのみのダンプを取得し、別途提供してください。
復元先は一時的な隔離ローカルDBとし、物理テーブル名・カラム名・Enum名・インデックス・削除規則・デフォルト値を比較してからデータを取り込みます。
内部UUID、Firebase UID、予約コード、関連明細、メールの送信済み記録を保持し、件数・外部キー・予約金額・所有者・日時を照合します。
Cloud SQLのダンプを新しいDBへ無条件に流し込む手順にはしません。

ローカルモデルはGraphQL定義から翻訳したものです。既存Cloud SQLの物理DDLとの完全一致は未検証です。
将来、検証・本番を移行する際は同じDrizzleスキーマとRepositoryを使えますが、TLS、接続数、バックアップ、既存DBのベースライン、移行・切り戻し手順を別途確認します。
環境切り替えには`DB_PROVIDER=drizzle`、`APP_ENV`、`DATABASE_URL`を使用します。今回追加したローカル専用コマンドを本番向けに転用しません。

## Data Connect

`dataconnect/schema/schema.gql`、`dataconnect/reservation/queries.gql`、`dataconnect/reservation/mutations.gql` を変更した場合は Data Connect SDK を再生成し、`src/generated/dataconnect*` を更新してください。

Admin SDKのCJS/ESM操作ラッパーはAccountモデルへ追随済みです。生成型定義・クライアントSDKは正式なCLI再生成で更新するのが望ましいです。

## Account分離の回帰確認

`tests/account-reservation-separation.test.ts` で次を確認します。

1. 管理者予約はAccountに紐付かない
2. ログイン本人の予約だけAccountに紐付く
3. 同じメールアドレスの管理者予約は本人の予約一覧に出ない
4. Accountプロフィール変更で過去予約の予約者スナップショットが変わらない

既存の `tests/reservation-workflows.test.ts` も、予約作成時にAccountを暗黙作成しない新仕様へ更新しています。

`.github/workflows/refactor-check.yml` では `npm test` と `npm run build` を実行します。

## 問い合わせ機能

- 一般問い合わせ：`/contact`。未ログインでも受付できます。
- 本人の問い合わせ履歴：`/contact/history`。予約カードから予約に紐づく問い合わせもできます。
- 管理画面の「問い合わせ管理」で確認・回答・状況変更・同じメールの再試行を行います。
- お客様の予約確認、管理者の予約詳細・予約承認にある「問い合わせ・回答履歴」から、その予約のやり取りを確認できます。[予約ごとの問い合わせ・回答履歴](docs/39-reservation-inquiry-history-2026-10-20.md)を参照してください。
- Drizzle構成と追加マイグレーションが必要です。匿名フォームにはサーバー専用の `INQUIRY_FORM_SECRET`（32文字以上のランダム値）を設定してください。現在のローカル環境には生成済みです。
- メールは既存のResend送信元設定を利用します。受付直後は宛先の1分クールダウンで回答の再試行が必要になる場合があります。

[実装・検証・運用上の制約](docs/38-inquiry-implementation-2026-10-20.md)を参照してください。

管理者が送信操作で保存した回答は、メール送信に失敗した場合も本人の履歴から確認できます。本文とメール状態は別々に表示します。[変更記録](docs/40-inquiry-replies-without-email-2026-10-20.md)
