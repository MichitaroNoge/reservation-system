# 業務フロー

## 予約登録

### ログイン済み利用者

1. Firebase Authenticationでログイン
2. Firebase UIDに対応するAccountを取得
3. 予約画面の入力内容をReservationの予約者スナップショットへ保存
4. Reservation.accountにAccountを設定
5. 以降、マイページではこの関連を使って予約を表示

### 非会員

1. 予約画面で予約者情報を入力
2. Reservationへ予約者情報を保存
3. Accountは検索・作成しない
4. Reservation.accountはnull

### 管理者代理登録

1. 管理者が予約者情報を入力
2. Reservationへ予約者情報を保存
3. Accountは検索・作成しない
4. 既存Accountとメール等が一致しても紐付けない
5. Reservation.accountはnull

## 後日のAccount登録

利用者が後からAccountを登録しても、過去の代理予約・非会員予約は紐付けません。

過去予約の変更や問い合わせは、予約番号と連絡先等による既存の本人確認フローを利用します。
