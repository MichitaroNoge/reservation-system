# 運用・デプロイ

## ローカル開発DB

起動・停止・マイグレーション・Seed・初期化・テストはルートREADMEの手順を使用します。
従来のdb:up/migrate/seed/reset等はローカル専用で、本番・検証DBやVercelでの実行を拒否します。クラウドには `db:cloud` を分離しました。
アプリ起動・ビルド時にはマイグレーションを実行しません。既存Vercelの環境設定も変更していません。
Cloud SQLの既存ベースライン照合は完了しました。IAM接続・移行・バックアップ・切り戻しは `15-cloud-sql-operation.md` を使用します。無料トライアルのバックアップ制限により実反映は保留です。

## Data Connect変更時

`dataconnect/schema/schema.gql`、`queries.gql`、`mutations.gql` を変更した場合は、`npm run dataconnect:generate` でData Connect SDKを再生成し、生成物をコミットします。

Account分離移行では生成SDKが旧Customerモデルのままだとアプリ実装と不整合になるため、SDK再生成前の状態を本番へデプロイしないでください。

## リリース確認

- 管理者代理予約でAccountが作成されないこと
- 非会員予約でAccountが作成されないこと
- ログイン済み本人予約だけAccountに紐付くこと
- Account登録後も過去の代理予約がマイページに現れないこと
- Accountプロフィール変更で過去予約の予約者情報が変わらないこと
