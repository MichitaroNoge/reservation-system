# システムアーキテクチャ

## 認証と業務データ

Firebase Authentication のユーザーは `Account` マスタに対応します。

`Reservation` は認証情報を内包せず、予約時点の予約者情報を独立して保持します。`Reservation.account` はnullableです。

- ログイン済み本人予約: Account参照あり
- 非会員予約: Account参照なし
- 管理者代理予約: Account参照なし

AccountとReservationの関連は本人がログイン状態で作成した予約に限定し、メールアドレス等による推定紐付けを行いません。
