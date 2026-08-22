# reservation-system

団体予約管理システム。

## Account と予約者情報の方針

- ログイン可能な利用者だけを `Account` マスタとして保持します。
- 予約時の氏名・メール・電話・住所・旅行会社情報は `Reservation` にスナップショット保存します。
- 管理者代理予約・非会員予約では Account を検索・作成・紐付けしません。
- ログイン済み本人が作成した予約だけ Account に紐付けます。
- メールアドレス等が一致しても、過去の代理予約を後から Account に紐付けません。
- Accountプロフィール変更で過去予約の予約者情報は更新しません。

詳細は `docs/04-database-design.md` を参照してください。

## 開発

```bash
npm install
npm run dev
```

## Data Connect

`dataconnect/schema/schema.gql`、`dataconnect/reservation/queries.gql`、`dataconnect/reservation/mutations.gql` を変更した場合は Data Connect SDK を再生成してください。
