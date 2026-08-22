# ドキュメント

現在の主要設計方針は以下です。

- ログイン可能な利用者は `Account` マスタで管理
- 予約者情報は `Reservation` に予約時点のスナップショットとして保持
- 管理者代理予約・非会員予約ではAccountを作成・検索・紐付けしない
- ログイン済み本人予約だけAccountに紐付ける
- 過去予約を後からAccountへ紐付けない

詳細:

- `04-database-design.md`
- `05-api-design.md`
- `06-business-flow.md`
- `07-authentication-and-security.md`
