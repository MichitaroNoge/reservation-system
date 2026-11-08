# Git操作

[手順書一覧へ戻る](README.md)

確認日: 2026-11-08。GUIを使って、変更の記録からmainへの取り込みまでを確認します。2件を同時に進める場合は[2並列開発](parallel-development.md)も参照してください。

## 1. 操作する場所を確かめる

1. GitHub Desktopで対象リポジトリを選ぶ。未登録なら`File` → `Add local repository`で元のフォルダーを追加する。[公式手順](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop?platform=windows)参照。
2. Worktreeがある場合は`Worktree`選択欄で目的の作業を選ぶ。パスと`Current Branch`を確認する。[公式文書](https://docs.github.com/en/desktop/making-changes-in-a-branch/managing-worktrees-in-github-desktop)ではWorktreeの切替に対応しているが、手元の版でCodexのWorktreeが表示されるかは要確認。
3. `Changes`で未コミット変更、`History`で直近のコミットを読む。別作業の差分が見えたら操作先を調査する。
4. GUIで判断できない場合は、そのチャットで次のようにCodexへ依頼する。

```text
読み取り専用で、作業ディレクトリの絶対パス、現在のブランチまたはdetached HEAD、
HEADのSHA、未コミット変更、Worktree一覧、追跡ブランチと未Pushコミットの有無を確認してください。
ファイル内容や秘密情報は外部へ送らず、状態だけ報告してください。
```

GUIに目的のWorktreeが出ない場合、元のフォルダーで同じブランチを無理にチェックアウトしないでください。Codexに対象パスと状態を確認させ、必要なGit操作をそのチャットで明示して依頼する方法を使えます。コミット・Push等は既存の依頼範囲を確認してから行います。Codex管理のWorktreeを別の管理方法へ勝手に移し替えないでください。

## 2. 完了後に作業ブランチを作る

[AGENTS.md](../../AGENTS.md)に従い、調査・実装・検証を先に完了します。detached HEADならCodexのチャットヘッダーの`Create branch here`で`codex/具体的な作業名`を作成します。未コミット差分を保持して現在の作業を引き継いだことを確認してください。[OpenAI公式文書](https://learn.chatgpt.com/docs/environments/git-worktrees)参照。

元のチェックアウトのmain上で未コミット変更を作った場合も、完了後・コミット前に作業ブランチへ移します。GitHub Desktopの`Current Branch` → `New Branch`で、現在のmainを出発点として`codex/...`を作ります。変更の扱いを聞かれたら内容を確認して新ブランチへ持ち込み、変更が残ったことを確認します。mainへコミットしてから移す手順にはしません。[ブランチ操作の公式手順](https://docs.github.com/en/desktop/making-changes-in-a-branch/managing-branches-in-github-desktop?platform=windows)参照。

適切な既存の`codex/`ブランチで作業している場合は、新しいブランチを作る必要はありません。同じブランチは同時に複数のWorktreeでチェックアウトできません。Localへ移す必要がある場合はCodexの`Hand off`を検討し、移動先の既存変更とローカル設定を確認します。通常の2並列開発では移動せず、各Worktreeのまま進めます。

## 3. コミットする（ローカルの履歴へ記録）

1. コミットが依頼範囲に含まれることを確認し、[品質レビュー](quality-review.md)を完了する。
2. 対象Worktreeと`codex/...`ブランチを選び、`Changes`で各ファイルの差分を読む。mainを選んでいたらコミットしない。
3. 今回の対象だけにチェックを付ける。既存の他の作業、環境ファイル、認証情報、個人情報、検証キャッシュを含めない。対象外のファイルは削除せずチェックを外す。同じファイルに別作業が混在する場合は一括選択せず内容を整理する。
4. `Summary`に変更の目的を短く入力する。例: `docs: 開発運用手順を追加`。必要なら`Description`に理由を補足する。
5. ボタンが`Commit to codex/...`になっていることを確認して押す。
6. `History`で意図したコミットができたことを確認する。`Changes`に残る差分も確認し、他の作業を誤って取り込んでいないか確かめる。

画面操作の根拠: [GitHub Desktopのコミット手順](https://docs.github.com/en/desktop/making-changes-in-a-branch/committing-and-reviewing-changes-to-your-project-in-github-desktop?platform=windows)。コミットだけではGitHubへ送信されません。

## 4. Pushする（GitHubへ送信）

1. AGENTS.md上の承認対象であることを踏まえ、送信するブランチ・コミット・送信先の承認を確認する。
2. `origin`が意図したリポジトリであり、公開範囲と差分が適切であることを確認する。
3. 初回公開では`Publish branch`、既に公開したブランチの更新では`Push origin`を押す。
4. リモートに新しい変更があると表示された場合は、Fetch・Pullして差分を確認し、必要な再検証を行う。Force pushで上書きしない。
5. 完了後、GitHub上のブランチに意図したコミットがあることを確認する。

根拠: [ブランチ公開](https://docs.github.com/en/desktop/making-changes-in-a-branch/managing-branches-in-github-desktop?platform=windows)、[Push](https://docs.github.com/en/desktop/making-changes-in-a-branch/pushing-changes-to-github-from-github-desktop)。Fetchは履歴を取得する操作、Pullは現在のブランチに取り込む操作です。どちらもPushとは異なります。

## 5. PRを作る

1. PR作成と説明文の外部送信が依頼範囲内であることを確認する。
2. GitHub Desktopで`Preview Pull Request`を押し、比較先の`base`を`main`にして差分を確認する。
3. `Create Pull Request`を押してブラウザーへ移る。GitHubでもbaseが`main`、compareが対象の`codex/...`であることを再確認する。
4. タイトルと説明を入力する。以下の例の各欄を実際の結果で置き換える。
5. レビュー可能なら`Create Pull Request`で作成する。まだ未完了で、画面と権限が対応している場合はDraftを選ぶ。Draftはそのままではマージできない。
6. PR URLを作業チャットに記録する。

```markdown
## 変更内容と理由

- 対象の問題と、変更後の動作

## 検証

- npm run verify: 結果と対象コミット
- npm run test:auth: 結果
- 画面確認: 対象画面・幅・操作・結果（対象外なら理由）

## 未確認事項・残課題

- 未実施の検証、残る問題、環境への未反映事項
```

根拠: [GitHub DesktopからのPR作成](https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/creating-an-issue-or-pull-request-from-github-desktop?platform=windows)。PRの説明に秘密情報や実在する顧客の情報を記載しないでください。

## 6. mainを取り込み、PRをマージする

1. 他のPRでmainが進んだ場合は、元のチェックアウトのmainをFetch・Pullする。
2. 自分のWorktreeと作業ブランチを選び、未コミット変更がないことを確認する。
3. `Current Branch` → `Choose a branch to merge into BRANCH`でmainを選び、**mainを作業ブランチへ**取り込む。競合時は内容を調査して解消する。これはGitHub上のPRをmainへマージする操作とは別。
4. 統合結果を再検証し、必要な修正のコミットと承認範囲内のPushを行う。最新のPR差分・CI・レビューを再確認する。
5. mainへのマージが依頼範囲内で、本番への自動反映の有無を確認できてから、GitHubのPR画面で許可された方式を選んで確定する。方式が未確定なら要確認とし、勝手に統一しない。
6. PRの`Merged`を確認し、元のmainをFetch・Pullする。GitHub上のmainとローカルmainは自動で同時更新されると仮定しない。
7. [2並列開発](parallel-development.md)の統合後確認と[後片付け](worktree-cleanup.md)を行う。

根拠: [ブランチ同期](https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/syncing-your-branch-in-github-desktop)、[PRのマージ](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-a-pull-request)。

## 困ったとき

| 状態 | 対応 |
| --- | --- |
| 別Worktreeで使用中のブランチと表示される | 使用場所を確認。元のフォルダーで強制切替せず、対象Worktreeを選ぶ |
| 予期しない変更・競合がある | 変更を保持し、Codexに対象パスと差分を調査させる |
| Pushやマージが拒否される | 権限・Rulesets・保護ルール・CIを確認。保護を解除して回避しない |
| すでにPushした変更を取り消したい | 影響するコミットとPRを特定して方針を確認。resetやForce pushを標準の復旧操作にしない |

## チェックリスト

- [ ] パス・Worktree・ブランチ・未コミット変更を確認した
- [ ] 完了後、コミット前に`codex/`ブランチへ切り替えた
- [ ] 差分・検証結果・対象ファイルを確認した
- [ ] コミットと外部送信それぞれの依頼範囲を確認した
- [ ] PRのbase / compareと説明を確認した
- [ ] 最新main取り込み後に再検証し、最新コミットのCIを確認した
- [ ] マージ権限・保護条件・自動デプロイを確認した
- [ ] Mergedの表示と、ローカルmainの同期を確認した

## 要確認

使用中のGUIの表示、GitHubの権限・必須Checks・レビュー人数・マージ方式・デプロイ連携は[一覧の要確認事項](README.md)を参照してください。コミットの署名やメッセージ規約が別途設定されているかも未確認です。画面で制約が示された場合はそれに従い、ルールを迂回しません。
