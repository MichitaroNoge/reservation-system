# システムアーキテクチャ

## 開発DB

ブラウザー→Next.js API→Firebase認証・認可→Repository→Drizzle→ローカルPostgreSQLの構成です。
DB接続モジュールとDrizzle Repositoryはserver-onlyです。ブラウザーにDB認証情報を渡しません。
検証・本番もDrizzleを使用し、Cloud SQL IAM Connector経由で暗号化接続する構成を追加した。実環境の設定・スキーマ・権限反映は保留。`DB_PROVIDER`未設定時の旧Data Connectは読み取り専用で、書き込みとトランザクションは503で拒否する。詳細は `15-cloud-sql-operation.md`。
AuthとResendは外部サービスとして維持し、メール送信はDBトランザクションの外で行います。

## 認証と業務データ

Firebase Authentication のユーザーは `Account` マスタに対応します。

`Reservation` は認証情報を内包せず、予約時点の予約者情報を独立して保持します。`Reservation.account` はnullableです。

- ログイン済み本人予約: Account参照あり
- 非会員予約: Account参照なし
- 管理者代理予約: Account参照なし

AccountとReservationの関連は本人がログイン状態で作成した予約に限定し、メールアドレス等による推定紐付けを行いません。
