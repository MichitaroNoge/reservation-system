# Account API

`Account` はログイン可能な利用者だけを保持するマスタです。予約者名簿ではありません。

- `GET /api/accounts` 管理者向け一覧
- `POST /api/accounts` 管理者向け作成（Firebase UID必須）
- `PUT /api/accounts/:id` 管理者向け更新
- `DELETE /api/accounts/:id` 管理者向け無効化
- `POST /api/accounts/:id/reactivate` 管理者向け再有効化
- `GET /api/accounts/me` ログイン本人のAccount
- `GET /api/accounts/me/reservations` ログイン本人がログイン状態で作成した予約のみ

通常の利用者登録では、Firebase Authユーザー作成後、初回のログイン予約時に `POST /api/reservations` がFirebase UIDでAccountを取得し、未作成ならそのUIDでAccountを作成します。メールアドレスで既存予約を検索・統合しません。

`/api/customers` は既存画面の段階移行用互換ルートです。内部的にはAccountを返します。新規実装では `/api/accounts` を使用してください。

管理者代理予約・非会員予約ではAccountを作成せず、予約者情報はReservationのスナップショットとして保持します。
