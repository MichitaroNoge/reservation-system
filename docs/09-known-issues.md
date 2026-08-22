# 既知課題

## Account分離移行

`Customer` がログインアカウントと予約者情報を兼ねていた旧モデルから、`Account` + `Reservation`予約者スナップショットへ移行しています。

実装済み:

- Data Connectスキーマを `Account` + 予約者スナップショットへ変更
- Query / MutationをAccountモデルへ変更
- RepositoryインターフェースをAccount APIへ変更
- FileRepositoryで管理者・非会員予約のAccount自動作成を廃止
- Data Connect RepositoryをAccount + Reservation snapshot前提へ変更
- ログイン予約だけFirebase UIDでAccountに紐付け
- メール一致による過去予約の自動紐付けを廃止
- `/api/accounts` 系を追加
- `/api/customers` 系を段階移行用のAccount互換ルートへ変更
- 管理画面の表示を「アカウント管理」へ変更
- Accountと予約者スナップショット分離の回帰テストを追加

## Data Connect SDK再生成

`src/generated/dataconnect*` はFirebase Data Connect CLIで再生成する必要があります。Repositoryは生成SDKの操作名を実行時に解決する構成へ変更しており、旧SDKのまま新しいAccount操作を呼び出すと、再生成が必要であることを示す明示的なエラーになります。

## 旧Customer命名

既存画面との段階移行のため、Reactコンポーネント名やView識別子には `CustomerManagement` / `customers` が一部残っています。機能上はAccountを扱います。新規APIは `/api/accounts` を使用してください。

## CI

`.github/workflows/refactor-check.yml` で `npm test` と `npm run build` を実行する構成を追加しています。GitHub Actionsがリポジトリ設定等で実行されない場合は、同コマンドをローカルまたは別CIで実行する必要があります。
