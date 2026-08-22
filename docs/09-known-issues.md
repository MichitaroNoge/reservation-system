# 既知課題

## Account分離移行

`Customer` がログインアカウントと予約者情報を兼ねていた旧モデルから、`Account` + `Reservation`予約者スナップショットへ移行中です。

移行完了条件:

- Data Connect SDK再生成
- Repository実装をAccount APIへ変更
- 予約作成時のCustomer自動作成・メール一致再利用を削除
- 管理者代理予約でAccount非紐付けを保証
- マイページがAccount紐付け予約だけを返すことをテスト
- 旧 `/api/customers` と顧客管理UIを廃止または互換表示へ変更
- build/test成功
