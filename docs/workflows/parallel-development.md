# Codex Worktreeによる2並列開発

[手順書一覧へ戻る](README.md)

確認日: 2026-11-08。2つの独立した作業を、同じmainから作成した別々のWorktreeで進めます。コミット・Push・PR作成・マージは、それぞれ依頼で認められた段階まで進めてください。

## 1. 作業を2つに分ける

1. 最新の依頼と[AGENTS.md](../../AGENTS.md)、[標準仕様](../standard-specification.md)、関連仕様を読む。
2. 作業Aと作業Bについて、目的・変更予定ファイル・確認方法を書く。同じファイルや共通API、DBスキーマの同時変更を避ける。分けられない場合は、先の変更をマージしてから次を開始する。
3. 例として、Aを「管理画面の文言修正」、Bを「独立した運用文書の追加」とする。これは分担例であり、実際の変更指示ではない。
4. 次の表をチャット等に残す。フォルダーは作成後の実パスを記録し、推測で入力しない。

| 項目 | 作業A | 作業B |
| --- | --- | --- |
| チャット名の例 | A: 管理画面の文言修正 | B: 運用文書の追加 |
| 許可する変更範囲 | 対象画面と必要なテスト | 対象文書 |
| 開始コミット | mainの確認済みSHA | Aと同じSHA |
| Worktreeの実パス | 作成後に記入 | 作成後に記入 |
| 完了後のブランチ例 | `codex/admin-copy` | `codex/workflow-docs` |
| PR URL・検証結果 | 作成・実施後に記入 | 作成・実施後に記入 |

## 2. 元のmainを確認して更新する

1. GitHub Desktopで対象リポジトリを開く。未登録なら`File` → `Add local repository` → `Choose...`で元のチェックアウトを選び、`Add repository`を押す。手順は[GitHub公式文書](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop?platform=windows)参照。
2. `Changes`で未コミット変更を確認する。変更がある場合は内容と保存先を確認し、元の持ち主の作業を保持する。変更を消して準備しない。不明ならブランチ切替やPullを進めずCodexに状態確認を依頼する。
3. 元のチェックアウトを選んでから、`Current Branch`で`main`を選ぶ。`Fetch origin`を押し、`Pull origin`が表示された場合は内容を確認して取り込む。予期しない競合が出たら止めて調査する。[同期の公式手順](https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/syncing-your-branch-in-github-desktop)に従う。
4. Codexに「元のチェックアウトのパス、ブランチ、HEADのSHA、未コミット変更を読み取り専用で確認して」と依頼し、出発点を記録する。GitHubのmainと同期できたことも確認する。

## 3. Codexで2つのWorktreeを作る

1. Codexでこのリポジトリの新しいチャットを開く。
2. 入力欄の下で`Worktree`を選び、開始ブランチを`main`にする。
3. 作業Aの指示を送信する。Worktreeが作られた後、実パス・開始SHA・detached HEAD・未コミット変更をCodexに確認させる。
4. 同じリポジトリで別の新しいチャットを開き、同じ操作で作業Bを開始する。Aとは別のパスで、開始SHAが一致していることを確認する。途中でmainが更新された場合は出発点の違いを記録し、同じ出発点に揃えるか判断してから進める。

CodexのWorktree作成、detached HEAD、完了後の`Create branch here`は[OpenAI公式文書](https://learn.chatgpt.com/docs/environments/git-worktrees)で確認しています。実際の表示が異なる場合の配置は要確認です。

指示例（作業Bでは目的と変更範囲を置き換える）:

```text
作業Aとして、指定した管理画面の文言を修正してください。
最初に作業パス・現在のブランチまたはdetached HEAD・HEADのSHA・未コミット変更を確認し、
AGENTS.md、docs/standard-specification.md、関連仕様を読んでください。
作業Bは別のWorktreeで運用文書を担当します。作業Bのファイルや元のチェックアウトは変更しないでください。
既存の業務ルール・APIは維持し、必要な修正と検証を完了してください。
ブランチは調査・実装・検証の完了後にcodex/admin-copyとして作成してください。
既存変更は保持してください。コミット・Push・PR作成・mainへのマージは今回は行わず、結果を報告してください。
```

## 4. 各Worktreeを準備して開発する

1. 各チャットでNode.js 22以上とnpmが使用できることを確認する。
2. 新しいWorktreeごとに、Codexにそのパスで`npm ci`を実行させる。元のフォルダーに`node_modules`があっても、別のWorktreeで使えると仮定しない。
3. 自動セットアップ設定はリポジトリ内に確認できていないため、実行ログを確認する。設定する場合の機能は[OpenAIのローカル環境の説明](https://learn.chatgpt.com/docs/environments/local-environment)参照。この手順のために設定ファイルを追加する必要はない。
4. `.env.local`等のローカル設定や実認証情報を一括コピーしない。基本検証に実DB・実メール・実Firebaseアカウントの認証情報は不要。[検証環境](../validation.md)に従う。
5. 各チャットで実装・必要なテスト・仕様更新を進める。同じWorktreeを複数チャットで同時編集しない。
6. PCの負荷に応じて重い検証は順番に実行する。`test:auth`は9099・4400・4500番ポートを共用するため、Aの終了とエミュレーター停止後にBで実行する。

**Worktreeが分けるのは作業ファイルです。DB、ポート、外部サービスまで自動で分離されるわけではありません。** 通常のアプリ確認先は`localhost:3000`、開発DBはComposeを使います。`dev:local`と`start:local`はメール・カレンダーワーカーも起動します。2つのアプリの同時起動は標準手順に含めず、画面確認は対象チャットと確認環境を明示して1件ずつ実施してください。DB・メール・ワーカーの安全な分離が未確認なら、起動前に確認します。根拠は[ルートREADME](../../README.md)と[validation.md](../validation.md)です。

## 5. 検証してからブランチを作る

1. A・Bそれぞれで[品質レビュー](quality-review.md)を行い、`npm run verify`と`npm run test:auth`を実行する。`verify`には`npm test`と、`build:check`経由の`npm run build`が含まれる。
2. UI変更ではPC・モバイル等の重要操作を確認する。失敗時は原因を修正し、必要な範囲を再検証する。未実施やskipはその範囲を報告する。
3. 作業完了後、各チャットの`Create branch here`を使い、それぞれ異なる`codex/`ブランチを作成する。既に適切な作業ブランチがあればそのまま使用する。
4. ブランチ名、HEAD、未コミット差分が意図したWorktreeに残っていることを確認する。mainへ直接コミットしない。

## 6. GitHub Desktopでコミット・Push・PR作成

1. コミットの依頼範囲を確認する。GitHub Desktopで`Worktree`選択欄から作業Aを選び、ブランチ名と差分が一致することを確認する。この選択欄で作業ディレクトリを切り替える操作は[GitHub公式文書](https://docs.github.com/en/desktop/making-changes-in-a-branch/managing-worktrees-in-github-desktop)で確認できる。
2. 手元の版でCodexのWorktreeが表示されるかは未確認。表示されない場合は[Git操作](git-operations.md)の確認手順に従い、元のチェックアウトで無理に同じブランチを選ばない。
3. `Changes`で対象ファイルだけを選び、Summaryを入力し、`Commit to codex/...`を押す。`History`で記録を確認する。[コミットの公式手順](https://docs.github.com/en/desktop/making-changes-in-a-branch/committing-and-reviewing-changes-to-your-project-in-github-desktop?platform=windows)参照。
4. Pushの承認範囲と送信先を確認して、初回は`Publish branch`、公開済みなら`Push origin`を押す。詳細は[Git操作](git-operations.md)。
5. `Preview Pull Request`で比較先を`main`にし、`Create Pull Request`からブラウザーを開く。タイトル・変更理由・検証結果・未確認事項を入力し、baseが`main`、compareが作業Aであることを確認してPRを作成する。[PR作成の公式手順](https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/creating-an-issue-or-pull-request-from-github-desktop?platform=windows)参照。
6. Bも同じ手順で、別のPRを作る。PR URLを分担表へ記録する。PR作成に本番デプロイの承認は含まれない。

## 7. PRを1件ずつmainへマージする

1. 先に取り込むPRを決める。ここではAを先にする。両方を一括でマージしない。
2. AのPRで`Files changed`・レビュー指摘・最新コミットのChecksを確認する。ローカル検証結果とCIの`Refactor Check`を区別する。必須条件や未解決事項は[品質レビュー](quality-review.md)で確認する。
3. mainへのマージが依頼範囲内で、実際の保護ルールを満たすことを確認する。本番への自動反映が不明な場合は先に確認する。
4. GitHubのPR画面で許可されたマージ方式を選び、確認画面の対象を確認して確定する。`Merge pull request` / `Confirm merge`はマージコミット方式の例。固定の方式があると仮定しない。[GitHubのマージ手順](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-a-pull-request)参照。
5. Aが`Merged`になったことを確認する。単に`Closed`となっているだけでは取り込み済みとは判断しない。
6. 元のチェックアウトの`main`をGitHub DesktopでFetch・Pullし、Aの反映を確認する。
7. **BのWorktreeを選び、Current BranchがBであること、未コミット変更がないことを確認する。** `Current Branch` → `Choose a branch to merge into BRANCH`で、更新済みのローカル`main`を選び、mainをBへ取り込む。方向は「main → B」。この時点でBをmainへ直接ローカルマージしない。[同期の公式手順](https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/syncing-your-branch-in-github-desktop)参照。
8. 競合があれば、Bのチャットで対象ファイルと両方の意図を調査させる。一括で片方を採用せず、仕様に沿って解消し、Desktopの競合表示を確認してマージを完了する。解消・マージが未完了なら次へ進まない。
9. Bで`verify`・`test:auth`と影響する画面操作を再検証する。これはA+Bを組み合わせた結果の確認になる。修正が必要ならBのブランチへコミットする。
10. 承認範囲内でBをPushし、PRの最新差分・最新コミットのCI・レビューを再確認してBをマージする。その間にmainがさらに更新された場合は取り込みと検証を繰り返す。
11. 両PRの`Merged`、更新後のmainのCIを確認し、元のmainを再度Fetch・Pullする。統合後のmainでも基本検証と必要な操作確認を行い、反映結果を記録する。失敗があれば後片付けを保留して調査する。

## 8. 後片付け

[Worktreeの後片付け](worktree-cleanup.md)に沿って、未コミット変更・未Pushコミット・Git管理外ファイル・動作中プロセスを確認し、保存を済ませてからCodex管理のWorktreeを整理します。チャットのアーカイブ、Worktreeの整理、ローカルブランチ削除、GitHubのブランチ削除はそれぞれ別の対象です。

## チェックリスト

- [ ] 分担と変更範囲を決め、元の作業を保持した
- [ ] mainを同期し、開始SHAを記録した
- [ ] A・BのWorktreeのパスが別で、開始SHAを確認した
- [ ] 各Worktreeで依存を準備し、共有DB・ポート・ワーカーの制限を守った
- [ ] A・Bで検証を完了し、完了後に別々の`codex/`ブランチを作成した
- [ ] 対象を確認してコミットし、承認範囲内でPush・PR作成した
- [ ] Aをレビューしてマージした
- [ ] Bへ最新mainを取り込み、A+Bで再検証・CI・レビューを完了した
- [ ] Bをマージし、更新後のmainを確認した
- [ ] 保存と停止を確認して後片付けを行った

## 要確認

- 使用中のアプリの版における各GUIの表示位置と、Codex作成WorktreeのGitHub Desktopでの表示。
- リポジトリの権限・保護ルール・必須レビュー・マージ方式・本番への自動反映。[一覧の要確認事項](README.md)を参照。
- 2つの実アプリを同時に動かすためのDB・Compose・ポート・ワーカー・外部接続の分離。確認できるまで同時起動の手順を追加しない。
