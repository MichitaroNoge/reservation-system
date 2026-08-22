# API設計

## Account API

ログインアカウント管理は `/api/accounts` を使用します。

- `GET /api/accounts` : Account一覧（管理者）
- `POST /api/accounts` : Account作成（管理者・明示的登録のみ）
- `GET /api/accounts/inactive` : 無効Account一覧
- `GET /api/accounts/me` : ログイン中Account
- `GET /api/accounts/me/reservations` : ログインAccountに明示的に紐づく予約のみ
- `PUT /api/accounts/{id}` : Account更新
- `DELETE /api/accounts/{id}` : Account無効化
- `POST /api/accounts/{id}/reactivate` : Account再有効化

旧 `/api/customers` は互換期間のレガシーAPIです。新規実装では使用しません。

## Reservation API

予約作成APIは予約者情報をReservationへ保存します。

### 管理者代理予約・非会員予約

- Account検索を行わない
- Accountを自動作成しない
- `accountId = null`
- 氏名・メール・電話・住所・旅行代理店情報をReservationへ保存

### ログイン済み本人予約

- Firebase UIDからAccountを取得
- 該当AccountをReservation.accountに設定
- メール一致による代替検索は禁止
- Accountが見つからない場合はAccount登録を先に完了させる

## マイページ

予約一覧は、ログインUIDと `Reservation.account.firebaseUid` が一致する予約だけを返します。過去の代理予約をメールアドレス等で補完しません。
