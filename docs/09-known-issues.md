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
- Firebase UIDに対応するAccountが無い場合は初回本人予約時にAccountを作成
- メール一致による過去予約の自動紐付けを廃止
- `/api/accounts` 系を追加
- `/api/customers` 系を段階移行用のAccount互換ルートへ変更
- 管理画面の表示を「アカウント管理」へ変更
- 予約履歴からのフォールバック表示も `accountId` 付き予約だけに限定
- Accountと予約者スナップショット分離の回帰テストを追加
- 既存予約ワークフローテストを新仕様へ更新
- Data Connect Admin SDKのCJS/ESM操作ラッパーをAccount操作へ更新

## Data Connect SDK

正式にはFirebase Data Connect CLIで `src/generated/dataconnect*` を再生成するのが望ましい状態です。Admin SDKの実行ラッパーは新しいGraphQL操作名へ追随済みですが、生成型定義やクライアントSDKには旧Customer由来の記述が残る可能性があります。

## 旧Customer命名

既存画面との段階移行のため、Reactコンポーネント名やView識別子には `CustomerManagement` / `customers` が一部残っています。機能上はAccountを扱います。新規APIは `/api/accounts` を使用してください。

## CI

`.github/workflows/refactor-check.yml` で `npm test` と `npm run build` を実行する構成を追加しています。ただし、この作業環境からGitHub Actionsの成功結果を確認できていません。マージ前に実行結果の確認が必要です。
