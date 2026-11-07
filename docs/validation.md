# 開発時の検証環境

更新日: 2026-11-03。既存のNext.js 15・TypeScript・ESLint 9・Node.js test runner・tsx・PGlite・Firebase CLIを使用する。検証のための新しい依存パッケージは追加していない。

## 最初の準備と標準手順

Node.js 22以上とnpmを用意し、新しいチェックアウトでは`npm ci`でlockfileどおりに依存を導入する。通常の検証にはDocker・実DB・実Firebaseアカウント・Resendの認証情報は不要。

```powershell
npm run verify
npm run test:auth
```

`verify`は以下の表の型・Lint・通常テスト・DBテスト・検証ビルドを順番に実行し、失敗した時点で非0終了する。認証エミュレーターは別コマンドにし、ポートの用意が必要な検証と区別する。CIでは両方を実行する。

## コマンド一覧

| コマンド | 検証対象・実行条件 |
| --- | --- |
| `npm run typecheck` | `next typegen`でルート型を生成してから、`tsc --noEmit --incremental false`。事前のビルドを不要にする |
| `npm run lint` | app・components・lib・scripts・testsと設定ファイル。警告も失敗として扱う |
| `npm test` | テスト用tsconfigでコンパイルし、現在の`tests/*.test.ts`に対応するJSだけをNode test runnerで実行。削除済みテストの古い生成物を実行しない |
| `npm run test:db` | 現在の`tests/db/*.test.ts`を自動列挙し、独立した一時PGliteで直列実行。既存の開発DB・Docker・クラウドは使用しない |
| `npm run build:check` | ダミー設定で既存の`npm run build`を呼び出し、専用の`.next-check`へ本番ビルドの検証結果を出力 |
| `npm run verify` | 上記5段階の統合実行 |
| `npm run test:auth` | demoプロジェクトのAuthエミュレーターを起動し、実Firebase SDKによる契約テストを実行して停止。ホスト127.0.0.1、ポート9099・4400・4500 |
| `npm run test:auth:contract` | 既に起動した専用エミュレーター内で使う内部コマンド。通常は`test:auth`を使う。テスト冒頭でローカル接続先を検査する |
| `npm run build` | 通常のアプリ用ビルド。実行環境の設定を使って`.next`へ出力するため、日常の自律検証は`build:check`を使う |
| `npm run test:db:postgres -- --confirm reservation_system_test` | 任意の実PostgreSQL検証。専用ローカルテストDBを初期化するため、通常の`verify`・CIには含めない |

通常テスト・PGliteのDBテスト・検証ビルドの子プロセスでは、実メール・OAuth・サービスアカウント・Cloud SQL設定を除去／無効化し、DB接続先とFirebaseプロジェクトを検証用に固定する。親のシェル環境や環境ファイルは書き換えない。DBドライバーはPGliteに固定し、既存の`DB_TEST_DRIVER=postgres`や初期化の確認値を引き継がない。

`.next-check`の生成物はダミーのFirebase設定を含む検証専用で、配布しない。開発用`.next-dev`、通常ビルド`.next`と区別する。検証コマンドはアプリサーバー・メールワーカー・カレンダーワーカーを起動しない。`dev:local`／`start:local`はワーカーを起動するため、テスト用コマンドの代用にしない。

## 検証範囲

- 通常テスト: 予約・認可・キャンセル条件・通知・問い合わせ・顧客画面の回帰、検証環境の安全な固定を確認する。
- PGlite: SQLマイグレーション・Repository・API・本人の所有権・ロールバック・メール／カレンダーの送信予定などを検証。テストログの送信成功はモックの結果で、実メールの送信ではない。
- 実PostgreSQL限定のテストはPGliteではskipする。ドライバー別テストであり、テストを無効化したものではない。競合と一部のPostgreSQL専用経路まで検証する際は、別途許可された破棄可能なテストDBを使う。2026-11-07の最終検証では、既存DBと分離した新規の使い捨てコンテナーでこれらも実行した。結果と制限は[78の記録](78-final-quality-validation-2026-11-07.md)を参照。
- 認証契約: 実Firebase Web/Admin SDKとローカルAuthエミュレーターで、同じUIDのGoogle連携・パスワード設定・再認証・解除を検証。実GoogleのOAuth画面やクラウド上のアカウントは操作しない。
- 型・Lint・テスト・ビルドは画面の見た目までは保証しない。UI変更では共通仕様に従い、顧客／管理者の重要操作をPC1280px・タブレット768px・スマートフォン390pxでも確認する。新たなブラウザーE2Eフレームワークは今回追加していない。

## CI

`.github/workflows/refactor-check.yml`でpush・pull request・手動起動を対象に、Node.js 22／`npm ci`／`verify`／`test:auth`を実行する。権限はcontents: read、上限20分。同じブランチの古い実行を取り消す。GitHub Secretsや実環境のFirebase変数を要求せず、デプロイ処理は含めない。

## 失敗時の対応

| 症状 | 対応 |
| --- | --- |
| 型チェックでルート型がない | `typecheck`を使用する。直接の`tsc`だけでは初回のNext.js型生成を行わない |
| Lintが警告で失敗 | 警告も修正する。上限やルールを緩めて成功扱いにしない |
| DBテストのメモリー不足 | `test:db`の直列実行を使用する。全ファイルを無制限に並列実行しない |
| エミュレーターのポート競合 | 9099・4400・4500番ポートを確認する。既存サービスを勝手に停止せず、競合を解消して再実行する |
| サンドボックスでローカルポートがタイムアウト／EACCES | 製品コードを変えず、ローカル接続を許可された環境で同じコマンドを再実行する |
| 実PostgreSQLのテストがskip | PGliteの範囲を確認する。実DBの初期化を自動で実行して埋め合わせない |

実行結果・調査記録は[70. 自律開発の検証環境整備](70-autonomous-validation-2026-11-03.md)を参照。
