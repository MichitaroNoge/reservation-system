# API設計

## Account API

ログインアカウント管理は `/api/accounts` を使用します。

- `GET /api/accounts` : Account一覧（管理者）
- `POST /api/accounts` : Account作成（管理者・明示的登録のみ）
- `GET /api/accounts/inactive` : 無効Account一覧
- `GET /api/accounts/me` : ログイン中Account
- `POST /api/accounts/me` : 本人プロフィールの登録・再保存（メール未確認でも可、メールは認証情報から取得）
- `PATCH /api/accounts/me` : 本人プロフィール更新（確認済みメールが必要）
- `DELETE /api/accounts/me` : 本人削除（直近5分以内の本人確認と確認済みメールが必要。有効予約があれば409）
- `PATCH /api/accounts/me/email` : Firebaseで確認・変更済みのメールを同期。保存結果と旧アドレスへの通知結果を分けて返す
- `GET /api/accounts/me/reservations` : ログインAccountに明示的に紐づく予約のみ
- `PUT /api/accounts/{id}` : Account更新
- `DELETE /api/accounts/{id}` : Account無効化
- `POST /api/accounts/{id}/reactivate` : Account再有効化

旧 `/api/customers` は互換期間のレガシーAPIです。新規実装では使用しません。

## Reservation API

予約作成APIは予約者情報をReservationへ保存します。

### 管理者代理予約・過去の非会員予約

- Account検索を行わない
- Accountを自動作成しない
- `accountId = null`
- 氏名・メール・電話・住所・旅行代理店情報をReservationへ保存

現在の公開予約APIは確認済みFirebaseユーザーを必須とし、未ログインの新規予約は受け付けません。過去の非会員予約データは保持します。

### ログイン済み本人予約

- Firebase UIDからAccountを取得
- 該当AccountをReservation.accountに設定
- メール一致による代替検索は禁止
- プロフィール未保存の場合は本人の予約入力と認証情報からAccountを補完登録する。無効化・削除中・削除済みのUIDは補完しない

### 送信結果不明時の再試行

Drizzle構成では、`POST /api/reservations` に `Idempotency-Key` を付けるとUID/識別子/内容ハッシュを予約と同一トランザクションで保存します。同一内容の再試行は保存済み予約を返し、異なる内容で同じ識別子を使用すると409です。形式は16〜128文字の英数字・`-`・`_`。ヘッダー省略時と旧Data Connect構成にはこの重複防止保証がありません。

予約保存が成功した場合は、受付メール失敗でも予約と `receiptEmail.status: "failed"` を返します。メールの再試行上限到達も送信成功として扱いません。

## マイページ

予約一覧は、ログインUIDと `Reservation.account.firebaseUid` が一致する予約だけを返します。過去の代理予約をメールアドレス等で補完しません。
