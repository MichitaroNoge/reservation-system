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

```bash
npm install
npm run dev
```

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
