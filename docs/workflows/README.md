# Codex・GitHub 開発運用手順

確認日: 2026-11-08

このフォルダーは、予約システムをCodexデスクトップアプリとGitHub Desktopで開発するための手順書です。Git操作はGUIを優先し、検証コマンドはCodexに依頼するか、対象チャットのターミナルで実行します。PRの作成完了とマージにはGitHubのWeb画面も使用します。

## 手順書一覧

| 手順書 | 読むタイミング |
| --- | --- |
| [2並列開発](parallel-development.md) | 同じmainを出発点に、2つのWorktreeで別々の変更を進めるとき |
| [Git操作](git-operations.md) | 状態確認、ブランチ作成、コミット、Push、PR、マージを行うとき |
| [Worktreeの後片付け](worktree-cleanup.md) | マージ後に作業フォルダーやブランチを整理するとき |
| [品質レビュー](quality-review.md) | 変更のレビュー、テスト、マージ判断を行うとき |

初めての場合は「2並列開発」を上から読み、各工程で他の手順書を参照してください。画面名は公式文書の英語表記を添えています。実際の表示が異なる場合は、同じ名前の操作があると決めつけず確認します。

## このリポジトリで優先するルール

1. [AGENTS.md](../../AGENTS.md)、[標準仕様](../standard-specification.md)、対象機能の仕様を読む。仕様の入口は[既存ドキュメント一覧](../README.md)。提案を確定要件として実装しない。
2. 顧客画面を変える場合は[顧客画面の共通仕様](../customer-screen-standard.md)、UI変更では[デザインシステム](../ui-design-system.md)も参照する。
3. 作業前にブランチ・未コミット変更を確認し、既存変更を保持する。Worktreeではdetached HEADのまま調査・実装・検証し、完了後、コミット前に`codex/`ブランチを作成する。適切な既存作業ブランチは継続利用できる。mainへ直接コミットしない。
4. ブランチ作成は、コミット・Push・mainへのマージの許可ではない。それぞれ現在の依頼・承認条件を確認する。
5. AGENTS.mdで承認が必要なのは、本番デプロイ、本番DBの変更・削除、破壊的DBマイグレーション、認証・認可の重要な仕様変更、秘密情報の外部送信、Git pushや外部公開。PR作成も外部に情報を送るため、公開範囲と依頼の範囲を確認する。
6. 検証は[検証環境の手順](../validation.md)に従う。失敗や未実施項目を隠さず、実装完了と本番反映を区別する。

これらの手順書は既存ルールを置き換えません。以下の2並列の分担やマージ順序は、この手順での進め方であり、アプリが自動で保証する機能ではありません。

## 確認できた構成

以下は確認日時点の記録です。作業開始時には再確認してください。

| 対象 | 確認内容 |
| --- | --- |
| 元のチェックアウト | `C:\Users\user\Documents\Codex\reservation-system` |
| 調査開始時のGit状態 | `main`、HEADは`3cee9af`、未コミット変更なし、Worktreeは元のチェックアウト1件 |
| origin | [MichitaroNoge/reservation-system](https://github.com/MichitaroNoge/reservation-system)（ローカルGit設定から確認。権限・公開範囲は未確認） |
| アプリ | Next.js / React / TypeScript。画面・APIは`app/`、共通部品は`components/`、業務処理は`lib/` |
| DB・生成物 | PostgreSQL / Drizzleは`lib/db/`と`drizzle/`。既存Data Connect定義は`dataconnect/`、生成SDKは`src/generated/` |
| 検証 | `tests/`、`scripts/`、[package.json](../../package.json)、[validation.md](../validation.md) |
| CI | [.github/workflows/refactor-check.yml](../../.github/workflows/refactor-check.yml)。push・PR・手動実行でNode.js 22、`npm ci`、`verify`、`test:auth`。このファイルにデプロイ処理はない |
| Worktreeのセットアップ | Git管理された`.codex`設定と`.worktreeinclude`は確認できない。自動セットアップ・ローカル環境ファイルの自動コピーを前提にしない |
| Git管理外 | `.env.local`等、`node_modules/`、`.next/`、`.next-dev/`、`.next-check/`、`.tmp/`等。[.gitignore](../../.gitignore)参照 |

## 用語

| 用語 | 意味 |
| --- | --- |
| チェックアウト / Worktree | 実際にファイルを編集するフォルダー。Worktreeは同じGit履歴を共有する別の作業フォルダー |
| ブランチ | 作業の履歴に付ける名前。`main`は統合先、`codex/...`は作業用 |
| detached HEAD | ブランチ名を付けず、特定のコミットを出発点に作業している状態 |
| コミット | 変更をローカルのGit履歴に記録すること。ファイル保存やPushとは別 |
| Fetch / Pull / Push | リモートの履歴の取得 / 現在のブランチへの取り込み / ローカルのコミットの送信 |
| PR / マージ | 変更を取り込むための依頼 / 変更を統合する操作。PRを作るだけではmainは更新されない |
| CI | GitHub Actionsで動く自動検証。ローカル検証や画面確認の代わりにはならない |

## 共通チェックリスト

- [ ] 最新の依頼、AGENTS.md、標準仕様、関連仕様を読んだ
- [ ] 作業フォルダー・ブランチ・既存変更を確認した
- [ ] 対象外の変更や秘密情報を差分へ含めていない
- [ ] 検証結果と未確認事項を記録した
- [ ] コミット・外部送信・マージの依頼範囲を確認した
- [ ] mainへの反映とWorktreeの後片付けを別工程として扱った

## 要確認事項の管理

| 要確認 | 確認方法 |
| --- | --- |
| 使用中のCodex / GitHub Desktopのバージョン、GUIの日本語名・配置 | 実際のアプリと公式文書を照合し、確認できた版と日付を追記 |
| GitHubの書込権限、ブランチ保護、必須レビュー数・必須Checks、許可されたマージ方式 | GitHubの対象PRと、閲覧権限があればSettingsで確認。確認のために設定を変更しない |
| main更新に連動する外部デプロイ・Webhook | リポジトリ管理者または接続先の設定で確認。CIファイルだけで「本番影響なし」と判断しない |
| 2つのアプリを同時起動するDB・ポート・ワーカー・外部連携の分離 | [2並列開発](parallel-development.md)の制限を守り、分離方法を確認してから追記 |

不明な操作は「確認済み」と書き換える前に、実機または公式文書で裏付けを取り、該当手順に出典と確認日を残します。
