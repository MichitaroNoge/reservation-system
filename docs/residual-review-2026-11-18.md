# 品質レビュー残件の対応

対象: `codex/performance-investigation` / `C:\Users\user\.codex\worktrees\cf39\reservation-system`。前回までの未コミット変更を保持し、2026-11-18に作業を再開。

## 今回の確定範囲

- 依存パッケージの監査警告を調査・更新し、Zod 4とフォームresolverの互換性を修正・検証する。監査警告だけを消すための旧ランタイム利用はしない。
- ユーザー回答により、管理者無効化中はログイン中の新規問い合わせ・履歴閲覧を両方停止する。データは削除せず、再有効化後に復旧する。管理者の対応・匿名フォームの既存仕様は維持する。
- 現在の開発環境が検証環境であるとの回答を受領。別環境の新設を前提にせず、既存環境・接続状態から確認する。
- メール送信の検証、Safariの検証はユーザーの追加指示により今回の対象外。既存自動テストの模擬メールは回帰確認として維持し、実送信は行わない。
- 既存データの破壊、本番変更、push・公開・mainマージはしない。

## 作業記録

| 項目 | 対応 | 状況 |
| --- | --- | --- |
| Zod High | 修正版4.6.7、対応resolver7.0.7へ移行し、日本語の項目エラー・入力/出力型・要素解析前の配列上限を維持 | 通常テスト・フォーム接続回帰成功 |
| その他の依存警告 | 親依存の互換更新を実施。本番依存の監査は0件 | 更新・型/Lint/ビルド成功。開発依存の未修正警告は下記 |
| 無効化中の問い合わせ | 本人向けAPIで状態を検証し、登録時は無効化処理と排他制御 | 実PostgreSQL・PC/スマートフォンの画面回帰成功 |
| 実Google連携 | 現在のworktreeはカレンダー用ID・secret・redirect URI未設定。設定値自体は出力していない | 追加回答「今回は実Google連携を未検証として整理する」により今回は未検証 |

## 原因と対応

### 問い合わせのアカウント状態（確認後に採用した業務仕様）

本人の一般問い合わせ送信・履歴は認証UIDで所有権を確認していたが、管理者によるアカウント無効化を確認していなかった。予約別問い合わせだけは有効な所有者とのJOINがあり、機能間で扱いが異なっていた。

- 本人向け一覧・詳細・予約別履歴・予約入力コンテキストで、無効化または削除記録があるUIDを403で拒否する。
- 新規作成・同じ送信キーでの再実行は、既存のアカウント無効化・再有効化・削除と同じUIDのトランザクションロックを取り、状態確認から問い合わせ・配送予定保存までを保護する。
- 既存履歴・回答・予約は削除しない。再有効化後に同じUIDで再び利用できる。無効化中の管理者閲覧・回答は維持する。
- プロフィール未作成の利用者と匿名受付は既存どおり。メール一致による履歴の取り込みは行わない。
- 仕様は[アカウント仕様](33-account-login-email-and-reactivation.md#無効化中の問い合わせ)に反映。

回帰テストは、一般/予約別の送信と閲覧、受理済みキーの再実行、拒否時の問い合わせ・配送・ジョブ不変、管理者の閲覧/回答、再有効化後の回答復旧、プロフィール未登録、削除開始/完了済みUIDを確認する。実PostgreSQLでは、未コミットの無効化を別接続の送信がadvisory lockで待ち、無効化後に拒否されることをDBの待機状態も含めて確認した。

### 共有入力検証と依存更新

Zod 3から修正版4へ移行し、フォームresolverも対応版へ更新した。Zod 4のエラー定義・配列issue形式へ合わせ、フォームの入力型と既定値適用後の出力型を区別した。顧客編集の省略可能なID/電話、送信元設定の省略可能な返信先もフォーム初期値で正規化。型キャストで回避せず、既存の入力検証と日本語エラーを維持している。

| 依存 | 開始時 | 更新後 |
| --- | --- | --- |
| zod | 3.25.76 | 4.6.7 |
| @hookform/resolvers | 3.10.0 | 7.0.7 |
| firebase-admin | 14.5.0 | 14.5.1 |
| @google-cloud/firestore | 9.3.1 | 9.4.1 |
| @google-cloud/firestore-api | 0.2.0 | 0.7.1（Firestoreの正式な依存範囲） |
| @google-cloud/cloud-sql-connector | 1.12.1 | 1.13.0 |
| firebase-tools | 15.35.0 | 15.36.0 |
| fast-xml-parser | 5.11.2 | 5.12.1 |
| hono | 4.13.13 | 4.13.19 |
| @typescript-eslint関連 | 8.71.1 | 8.73.0（minimatchの修正を正式依存から採用） |

既存のフォント等の未コミット変更は保持した。`audit fix --force`、親の指定範囲外の強制override、脆弱なZod互換サブパスの利用はしていない。配列の事前上限は引き続き要素を一切解析せずに拒否する。追加のフォームresolver回帰3件は、NaN・15分以外・日付の項目エラー、問い合わせのネストされたエラーとメール正規化、パスワードの既定値/現在値/一致確認を実際のresolver経由で検証する。

## 検証記録

検証区分: 共有入力検証ライブラリ・認証/認可・DB所有権に影響するため、全体検証と認証・実DB競合・関係画面を組み合わせた。

| 検証 | 結果 | 証跡（`.tmp/residual-review/`） |
| --- | --- | --- |
| `npm run verify` | 型/Lint/通常/PGlite/検証ビルド成功 | `verify-final.log` |
| 通常テスト | 235件成功・失敗0 | 同上。追加のresolver回帰3件を含む |
| PGlite | 103件成功・PostgreSQL専用14件skip・失敗0 | 同上 |
| 実PostgreSQL | 117件成功・skip0・失敗0 | `postgres-final-dependencies.log`。最後の変更は開発用ESLint依存だけ |
| 認証エミュレーター | 契約1件成功・失敗0 | `auth-final.log` |
| 最終型チェック | 成功 | `typecheck-final.log` |
| 最終ESLint | 8.73.0で警告ゼロ・成功 | `lint-updated-eslint.log` |
| 最終検証ビルド | 58ページ生成成功 | `build-updated-eslint.log`。最後のESLint更新も含む |
| Storybookビルド | 成功 | `storybook-final.log` |
| 無効化の実画面 | 1280/390pxで送信403・入力保持・履歴遮断・再有効化後復旧を確認、撮影6件 | `disabled-inquiry-ui/results.json`、PNG各画面。モバイル履歴とPC送信画面も目視確認 |
| 画面全体の回帰 | 92種類の画面状態×1280/768/390px、279撮影（重複を含む）。失敗・ページ横はみ出し・フォーム境界違反0 | `visual-final-recheck.log`/`visual-final-extra.log`、`.tmp/visual-audit/residual-final-{recheck,extra}/results.json` |
| 主要操作 | 予約登録・更新、顧客電話のフィールド検証、会員の一覧/詳細、検索要求の集約、96候補の15分選択と入力保持すべて成功 | `smoke-final.log`/`forms-final.log`/`customers-final.log` |

`verify`の後に追加した画面用監査スクリプトは型/Lintを再実行。続いて開発用TypeScript ESLintを更新したため、Lint・ビルドをもう一度実施した。同じ実行コードで成功済みの通常/DB/認証テストはその開発専用更新だけでは繰り返していない。実DB専用コンテナはラベルを照合して削除済みで、既存開発DBは停止状態のまま保持している。

画面は自動の寸法・フォーム境界検査と代表画像の目視を組み合わせた。279画像すべてを1枚ずつ目視したという意味ではない。無効化中のモバイル履歴/PC送信と、モバイル予約のフィールドエラーは目視でも確認した。`npm ls --all`も成功し、依存の不整合なし。

## 制約・未解決

最終監査は本番依存0件（終了0）、全依存40件（High22/Moderate18、終了1）。全依存の警告はすべて開発ツール側であり、0件になったとは報告しない。

| 元の警告 | 残る経路・理由 |
| --- | --- |
| picomatch / High | Storybook/Vite/ESLint等。告知上は4.0.7まで影響し、参照時点で修正版なし。High22件はこの警告が依存先へ伝播したパッケージ数を含む |
| glob / Moderate | Firebase CLIのglob10、Storybookのdocgenプラグイン0.7のglob13。修正版14へは親の公式依存範囲外。最新版Storybook10.6.7・CLI15.36.0でも残る |
| minimatch / Moderate | 上記globの間接依存。TypeScript ESLint経路は8.73.0で修正版11へ移行したが、別の経路が残る |
| @opentelemetry/core / Moderate | Firebase CLI→Pub/Subが1.30.1を要求。修正は2.8以降で、1系の修正版なし |
| uuid / Moderate | Firebase CLI→gaxios6→uuid9。修正は11.1.1以降で、親の指定範囲外 |
| esbuild / Moderate | 最新drizzle-kit0.31.11→旧esm-loader/core-utilsの間接依存。正式な親更新での解消不可 |

前回記録の28件は過去の監査スナップショットで、今回の監査情報更新（picomatch告知も11/17更新）を含むため同一条件の増減比較には使わない。今回Zod更新直後は42件（High18/Moderate23/Low1）、互換更新でLowを含む警告を解消。本番依存は6件から0件となった。最後のTypeScript ESLint更新ではminimatch経路が解消した一方、既存の未修正picomatchを使うtinyglobby経路へ移り、全体は40件のままHigh18/Moderate22からHigh22/Moderate18へ集計が変わる。本番実行コードの警告を減らしたことと、開発ツール側に警告が残ることを区別する。

- 実メール送信とSafariはユーザーの指示で今回対象外。模擬メール/Google API・ローカルAuthエミュレーターの成功を実連携の成功とは扱わない。
- 実Google連携はユーザーの追加回答により今回は未検証。現在環境で実アカウントの登録/削除・OAuth接続変更・カレンダー書き込みはしていない。
- 開始時はローカルアプリとDockerエンジンが停止していた。Docker Desktopを起動し、既存の開発DBコンテナには操作せず、新規の専用PostgreSQL 17.11（ループバック55439、2CPU/512MiB、tmpfs）のみでDB競合テストを実施した。実画面には既存のPGlite隔離fixtureと模擬ログインを使用する。
- PCは論理6CPU・メモリ16GiB。検証中のテスト並行実行は画面性能の計測根拠には使用しない。今回は性能数値を新たに推定しない。
- 画面監査の初回は再ビルドと出力先が重なったため、監査を中止してサーバーを停止し、途中結果を採用しなかった。最終ビルド完了後に新しいfixtureで再実行し、上記の成功結果を取得した。

## 終了時の確認と今後

- 開始時の未コミット変更75項目がすべて引き続き存在し、削除ファイルなし。`next-env.d.ts`は検証出力先への自動変更だけを開始時の`.next-dev`へ戻した。環境ファイルの書き換え、既存DBへの移行・seed・reset、コミット・push・mainマージ・デプロイはしていない。
- 今回は確認後に確定した問い合わせの仕様1件と依存更新を対応。前回修正したアプリ不具合6件へ依存経路の警告数を合算しない。
- 優先残件は、picomatch修正版と、それを採用するStorybook/Vite/ESLint、Firebase CLI・Drizzle Kitの正式更新の追従。実Google連携は、実施する回で設定を整えてから確認する。メール/Safariを今回の未完了作業として残さない。

## 参照

- [Zod 4移行ガイド](https://zod.dev/v4/changelog)
- [React Hook Form resolvers](https://github.com/react-hook-form/resolvers#zod)
- [Zodのセキュリティ告知](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
- [fast-xml-parserの修正版告知](https://github.com/advisories/GHSA-474x-hrwr-fgx4)
- [picomatchの告知（参照時点で修正版なし）](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)

前回の記録は[quality-review.md](quality-review.md)。今回の証跡は`.tmp/residual-review/`へ保存する。
