# 既知の課題

## 未実装機能

- 認証・認可
- メール送信
- 請求書発行
- 決済
- Cron、バッチ、非同期ジョブ
- 自動テスト
- CI/CD
- 監査ログ
- 本番DB接続
- Data Connect SDKを利用したRepository実装

## 暫定実装

- `role` state による顧客画面/管理画面の切り替え。
- `data/reservation-db.json` によるファイルDB。
- `FirebaseSqlConnectReservationRepository` は未生成SDK待ちのスタブ。
- 利用実績・請求画面は静的表示。
- 確認連絡はメール送信ではなく `confirmationContactedAt` 更新のみ。
- 例外ステータス変更理由は画面で入力するが永続化されない。

## サンプルデータを使用している箇所

- `lib/seed-data.ts`
- `data/reservation-db.json`
- 利用実績・請求画面の表示データ
- `app/page.tsx` 内の `initialReservations`, `defaultMenus`, `defaultStores`

注意: 初期表示後はAPIから読み込まれるが、画面コード内にも初期値が存在します。

## TODO・FIXME

`TODO` / `FIXME` 文字列は調査時点で確認できませんでした。

ただし、Data ConnectのGraphQL定義には `insecureReason` としてプロトタイプ用PUBLIC認可である旨が明記されています。

## 技術的負債

- `app/page.tsx` に画面、状態管理、業務ロジックが集中している。
- API Routeに入力検証がない。
- RepositoryがファイルDB固定で、Data Connectスタブと分離している。
- 現行JSON DBモデルとData Connectモデルに差分がある。
- ステータス遷移ルールが画面側ロジックに散在している。
- UI表示用ラベルと永続化されるステータス値に文字化けの混在がある。
- 予約コード採番がファイル内最大値ベースで、同時作成時に競合する可能性がある。
- ファイルDB更新に排他制御がない。

## セキュリティ上の懸念

- 管理画面に認証なしでアクセス可能。
- APIに認証・認可なしでアクセス可能。
- 個人情報がファイルDBに平文保存される。
- API入力検証不足。
- 操作ログがない。
- Data Connect定義がPUBLIC認可のプロトタイプ状態。

詳細は [07-authentication-and-security.md](./07-authentication-and-security.md) を参照してください。

## テスト不足

- `package.json` に `test` scriptなし。
- テストファイル、テスト設定は確認できません。
- E2E、単体、APIテストはいずれも未確認です。

## コードと想定仕様が一致していない可能性がある箇所

- READMEや一部データが文字化けしており、正式な日本語仕様と一致しているか未確認。
- Data Connectスキーマには請求・来店詳細まであるが、現行JSON DBにはない。
- 請求画面は表示のみで、実業務仕様と一致しているか未確認。
- 顧客削除が関連予約削除になる仕様は、業務上正しいか未確認。
- 店舗割当モデルは現行JSON DBでは複数店舗割当可能だが、Data Connectの `StoreAssignment` は `reservation` が `@unique` で単一割当のように見える。
- 確認連絡の一括処理は個別APIを複数回呼び出すため、一部成功・一部失敗時の扱いが未設計。

## 今後確認が必要な事項

- 本番DB方針: ファイルDB継続かData Connect移行か。
- 認証方式と管理者ロール。
- ステータス遷移の正式ルール。
- 確認連絡メールの送信仕様。
- キャンセルポリシーと請求処理。
- デプロイ先。
- バックアップ、監視、ログ。
- テスト方針。
- 文字化けデータの修正方針。

