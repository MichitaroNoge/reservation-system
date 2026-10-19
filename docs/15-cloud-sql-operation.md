# Cloud SQL接続・移行手順

この手順は準備済みだが、2026-10-15時点で実環境への適用は保留。理由は `14-p1-remediation-2026-10-15.md` を参照。

利用者の最終指示により、クラウドDB対応は後日改めて依頼されるまで実施しない。この文書は将来の参考手順であり、実行の承認を意味しない。現在の確認対象は自身のPCの `http://localhost:3000`。

## アプリ接続

1. Node.js 22以上を使用する。
2. `.env.cloud.example` を参照し、デプロイ先の秘密情報管理に設定する。`DB_PROVIDER=drizzle`、`APP_ENV=staging/production`、`CLOUD_SQL_CONNECTION_NAME`、`CLOUD_SQL_DATABASE`、`CLOUD_SQL_USER` を明示する。
3. `DATABASE_URL` は設定しない。ローカル開発では逆にCloud SQL変数を設定しない。
4. ランタイムのサービスアカウントに、対象インスタンスへ条件で限定した `roles/cloudsql.client` と `roles/cloudsql.instanceUser` を付与する。サービスアカウントのDBユーザーをIAM方式で登録する。DBユーザー名は末尾 `.gserviceaccount.com` を除いた名前。
5. DBにはCONNECT、publicスキーマUSAGE、アプリ用テーブルのSELECT/INSERT/UPDATE/DELETE、必要なシーケンスのUSAGE/SELECTを付与する。DDL・所有者・スーパーユーザー権限をランタイムへ付与しない。既存設定を上書きしない。
6. Firebase Adminの既存資格情報かADCを使用する。CLIの個人認証をアプリに保存しない。ネットワークを全公開する必要はない。

## 既存DBへの移行

クラウド接続設定だけを保存したGit管理外ファイルを用意する。管理者のADCを使用するか、ローカルCLIで既にログインしている管理者を `--use-firebase-cli` で明示する。CLI方式では `CLOUD_SQL_USER` をその管理者メールと一致させる。CLI内部APIに依存するため、CLI更新時はplanから再検証する。

```powershell
npm run db:cloud -- plan --env .env.cloud
```

planは読み取り専用。17テーブルの既存ベースライン、列・キー・参照・enumを確認する。不一致なら停止し、初期化や強制上書きを行わない。既存UUID生成デフォルトや外部キーの削除規則は変更しない。

Cloud SQLで成功した24時間以内のバックアップIDを確認してから実行する。

```powershell
npm run db:cloud -- migrate --env .env.cloud --baseline --backup-id BACKUP_ID --confirm PROJECT/INSTANCE/DATABASE
npm run db:cloud -- check --env .env.cloud
```

`--baseline` は履歴のない既存ベースラインに対してのみ使用。0000を再実行せず、検証したハッシュを履歴へ登録する。0001〜0003は追加のみで既存データをリセットしない。スキーマ変更と履歴を同一トランザクションで保存し、失敗はロールバックする。ロック待ちは10秒、各SQLは60秒で停止する。

現在の無料トライアルはバックアップ作成を拒否するため、このmigrateは実行できない。バックアップ要件を外す変更を無断で行わない。

適用後はアプリ用IAMユーザーでcheckし、顧客・予約・マスタを読み取り確認する。実データを使う破壊的なテストは行わず、並行更新・故障注入は専用ローカルPostgreSQLで実施する。アプリの環境設定と公開はDBの準備完了後に行う。

## 切り戻し

コード公開前の追加テーブルは残してよい。既存テーブル・データを戻す操作は不要。アプリ公開後に新規データを書いた場合は、追加テーブルを削除しない。バックアップ復元は復元先・時点・その後のデータの扱いを確認して別途実行する。

旧Data Connectは読み取り専用であり、更新可能な切り戻し先ではない。書き込み障害時は更新を止めてCloud SQL接続・権限・マイグレーションを修復する。
