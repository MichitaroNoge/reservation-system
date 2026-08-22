# 運用・デプロイ

## Data Connect変更時

`dataconnect/schema/schema.gql`、`queries.gql`、`mutations.gql` を変更した場合は、デプロイ前にData Connect SDKを再生成し、生成物をコミットします。

Account分離移行では生成SDKが旧Customerモデルのままだとアプリ実装と不整合になるため、SDK再生成前の状態を本番へデプロイしないでください。

## リリース確認

- 管理者代理予約でAccountが作成されないこと
- 非会員予約でAccountが作成されないこと
- ログイン済み本人予約だけAccountに紐付くこと
- Account登録後も過去の代理予約がマイページに現れないこと
- Accountプロフィール変更で過去予約の予約者情報が変わらないこと
