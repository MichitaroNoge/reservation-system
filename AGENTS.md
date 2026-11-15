# UI implementation rules

- Use Tailwind CSS as the default styling approach. Keep `app/globals.css` limited to Tailwind imports, design tokens, global element rules, and genuinely exceptional legacy styles.
- Prefer reusable components from `components/ui` before creating page-specific controls. Follow shadcn/ui composition patterns and Radix primitives for interactive widgets.
- Use the shared semantic tokens (`background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `border`, `input`, and `ring`) instead of hard-coded page colors.
- Keep cards at an 8px radius or less. Use restrained shadows and avoid nested decorative cards.
- Use Lucide icons for common actions. Icon-only buttons require an accessible label or title.
- Forms must include visible labels, field-level validation, loading and error states, and mobile-friendly controls. Use React Hook Form and Zod for non-trivial forms.
- Tables must remain scannable on desktop and horizontally scroll on narrow screens. Keep primary row actions visible and avoid shrinking text below 12px.
- Every screen must account for loading, error, empty, success, and disabled states where applicable.
- Destructive actions require confirmation. Preserve existing business rules and API behavior when changing UI.
- Verify affected customer and management flows at desktop and mobile widths. Select tests and builds by change scope using `docs/validation.md`; do not require the full suite for every UI edit.

# Standard specification reference

- Before adding or changing a feature, read `docs/standard-specification.md` and the relevant feature specification. Its proposal sections are not approved requirements; preserve that distinction and follow the latest user request.
- For new or updated customer-facing screens, also follow `docs/customer-screen-standard.md` and use its shared layout and bottom action components.

# Codex 自律開発ルール

## 目的
ユーザーから依頼された開発タスクについて、
調査・実装・検証・修正まで自律的に実施する。

## 基本方針
- 既存の設計・実装方針を優先する。
- 軽微な実装判断はユーザーに確認せず進める。
- 指示範囲外の変更は最小限にする。
- 必要な調査・実装・テストは途中で停止せず継続する。
- 計画の提示だけで作業を終了しない。
- 調査と検証は変更の影響範囲に絞る。関係のない仕様書の通読、全体テストの反復、軽微な変更のための大掛かりな検証環境の新設を標準手順にしない。
- 適した既存のworktree・導入済み依存・検証環境を優先して再利用する。`npm ci`は初回、lockfileの変更、依存の不整合など必要な場合に限る。既存変更や稼働中の環境を壊さない。

## ブランチ・worktreeの運用
- 開発作業を始める前に、現在のブランチと未コミット変更を確認する。
- worktreeではdetached HEADのまま調査・実装・検証を進めてよい。作業用ブランチは作業開始時ではなく、作業完了後に作成する。
- 作業完了後、コミット前に`codex/`で始まる作業用ブランチを作成して切り替え、変更を引き継ぐ。main上で直接コミットしない。
- 既に対象タスクに適した作業用ブランチにいる場合は、そのブランチを継続使用してよい。
- 既存の未コミット変更を保持し、ブランチ作成のために破棄・リセットしない。
- ユーザーが明示的に別のブランチ運用を指定した場合は、その指示を優先する。
- ブランチの作成はコミット・Push・mainへのマージの許可を意味しない。それぞれ既存の承認条件とユーザーの指示に従う。

## 開発フロー
1. AGENTS.mdと関連仕様を確認する。
2. 既存コードと依存関係を調査する。
3. 実装方針を決める。
4. 必要なコードを変更する。
5. 動作や業務ルールを変更する場合は、必要な関連テストを追加・更新する。
6. 下記の検証区分に従い、必要なチェックを実行する。
7. エラーがあれば原因を分析して修正する。
8. 修正の影響を受けるチェックを再実行する。無関係な成功済みチェックは繰り返さない。
9. 変更差分を確認する。
10. 実装結果と検証結果を報告する。

## エラー発生時
- エラー内容を確認し、根本原因を調査する。
- 安全に修正できる場合は自律的に修正する。
- 修正後は再度検証する。
- 同じ問題で3回失敗した場合は方針を再検討する。
- 解決できない場合は未解決事項として報告する。
- テストを無効化して成功扱いにしない。

## 検証
- 詳細とコマンドの選び方は`docs/validation.md`を正本とする。複数区分に該当する場合は、必要なチェックを組み合わせる。
- 文書のみ: 差分、参照リンク、指示の整合性を確認する。型チェック・Lint・テスト・ビルドは原則不要。
- 文言・見た目のみ: 型チェック・Lintと、影響する箇所のPC／モバイル表示を確認する。動作が変わらなければテスト・ビルドは原則不要。
- UIの操作・状態・入力検証: 上記に加え、関連テストと`npm run build:check`を実行する。DB・認証テストは関連箇所を変更した場合に追加する。
- API・業務ロジック: 型チェック・Lint・通常テスト・検証ビルドを実行する。DB・認証に影響する場合はそれぞれのテストも追加する。
- DB・永続化・マイグレーション: APIの検証に加え`npm run test:db`を実行する。認証・認可・セッション: APIの検証に加え`npm run test:auth`を実行し、DBの所有権・権限制御に影響する場合はDBテストも実行する。
- 広範囲の変更、影響範囲を特定できない変更、アプリの公開前は`npm run verify`と`npm run test:auth`で全体を検証する。CIの全体検証は維持する。
- package.jsonの既存コマンドと隔離設定を使う。関連テストを安全に絞る既存手順がなければ`npm test`を使い、テストのために実DB・実メールへ接続しない。
- 同じ最終コード・関連設定で成功済みのチェックは、新しい変更や失敗の調査で必要にならない限り再実行しない。
- 報告には検証区分・実行結果・対象外とした検証の理由を簡潔に記載する。必要だが実行できなかった検証は、対象外と区別して明記する。

## 承認が必要な操作
- 本番環境へのデプロイ
- 本番DBの変更・削除
- 破壊的なDBマイグレーション
- 認証・認可の重要な仕様変更
- 秘密情報の外部送信
- Git pushや外部への公開

## 完了条件
- 指示された機能が実装されている。
- 必要な検証を実施している。
- 既知の不具合を隠していない。
- 変更内容と残課題を報告している。
