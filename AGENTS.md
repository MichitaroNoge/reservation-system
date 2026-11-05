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
- Verify important customer and management flows at desktop and mobile widths. Run `npm test` and `npm run build` before completion.

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

## 開発フロー
1. AGENTS.mdと関連仕様を確認する。
2. 既存コードと依存関係を調査する。
3. 実装方針を決める。
4. 必要なコードを変更する。
5. 関連するテストを追加・更新する。
6. 型チェック・Lint・テストを実行する。
7. エラーがあれば原因を分析して修正する。
8. 再検証を行う。
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
- package.jsonに定義された検証コマンドを利用する。
- 型チェック、Lint、関連テストを実行する。
- 必要に応じてビルドも検証する。
- 実行できなかった検証は明確に報告する。

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
