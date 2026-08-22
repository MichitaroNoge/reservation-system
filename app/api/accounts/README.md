# Account API

`/api/accounts` はログインアカウント専用の管理APIです。

予約時点の氏名・連絡先はAccountマスタではなくReservationへ保存します。管理者代理予約や非会員予約でAccountを作成・検索・紐付けしてはいけません。

互換期間中は旧 `/api/customers` が残る場合がありますが、新規実装は `/api/accounts` を使用してください。
