# 既知の課題

## 未実装機能

- Firebase Authentication
- ロールベース認可
- メール送信
- 請求書発行
- 決済
- Cron、バッチ、非同期ジョブ
- 自動テスト
- CI/CD
- 監査ログ

## 暫定実装

- `RESERVATION_REPOSITORY=file` によるローカルファイルDBは緊急退避用に残しています。
- 確認連絡はメール送信ではなく `confirmationContactedAt` 更新のみです。
- 管理画面と顧客画面の切替は画面内 state による暫定実装です。

## Data Connect Repositoryの対応状況

実装済み:

- 予約一覧取得
- 予約作成
- 予約の日付・時刻・人数更新
- 予約ステータス更新
- 確認連絡日時更新
- 店舗割当置換
- 顧客一覧取得、更新、非活性化
- 店舗一覧取得、更新、非活性化
- メニュー一覧取得、作成、更新、非活性化

残っている制約:

- 予約内容更新のうち、顧客情報・メニュー明細更新は未対応です。
- 顧客・店舗・メニュー削除は履歴保全のため物理削除ではなく非活性化です。

## サンプルデータ

- `lib/seed-data.ts`
- `app/page.tsx` 内の `initialReservations`, `defaultMenus`, `defaultStores`
- `dataconnect/seed_data.gql`

## 技術的負債

- `app/page.tsx` に画面、状態管理、業務ロジックが集中している。
- API Routeの入力値検証が限定的。
- ステータス遷移ルールが画面側ロジックに分散している。
- Data Connect emulator を使った自動テストがない。

## セキュリティ上の懸念

- 管理画面に認証なしでアクセス可能。
- APIに認証・認可チェックがない。
- Data Connect定義が `@auth(level: PUBLIC)` のプロトタイプ状態。
- 個人情報の保存・閲覧権限設計が未確定。

## テスト不足

- `package.json` に `test` scriptなし。
- 単体テストなし。
- APIテストなし。
- E2Eテストなし。

## 実装と仕様が一致していない可能性がある箇所

- Data Connect側には請求・来店詳細モデルがあるが、画面は一部静的表示です。
- 確認連絡メールの送信仕様が未確定です。
- キャンセルポリシー、請求、減員時ルールの正式仕様が未確認です。

## 今後確認が必要な事項

- Firebase Authentication の方式
- 管理者ロール、店舗担当者ロール、顧客ロールの権限
- Cloud SQLのバックアップ、監視、ログ方針
- 本番デプロイ先
- Data Connectの本番認可ルール
- `npm install` 後に報告された依存関係脆弱性の対応方針
