# 設計資料 目次

このディレクトリは、現在の実装を人間が理解し、今後保守するための設計資料です。

AIとのバイブコーディングで作られた経緯があるため、コードから確認できる事実を中心に記載しています。コードから判断できない内容は「未確認」、将来想定と思われるものは「推測」または「未実装」と明記しています。

## 資料一覧

| 資料 | 読む目的 |
| --- | --- |
| [00-system-overview.md](./00-system-overview.md) | システムの目的、対象範囲、利用者、用語を把握する |
| [01-functional-specification.md](./01-functional-specification.md) | 機能単位で目的、入力、処理、実装状況を確認する |
| [02-screen-specification.md](./02-screen-specification.md) | 画面ごとの表示項目、入力、ボタン、遷移を確認する |
| [03-system-architecture.md](./03-system-architecture.md) | フロントエンド、API、Repository、DB、外部サービスの構成を把握する |
| [04-database-design.md](./04-database-design.md) | 現行JSON DBとData Connect定義のデータ構造を確認する |
| [05-api-design.md](./05-api-design.md) | API Routeとサーバー側Repository処理を確認する |
| [06-business-flow.md](./06-business-flow.md) | 予約申請、承認、店舗割当、確認連絡など業務フローを確認する |
| [07-authentication-and-security.md](./07-authentication-and-security.md) | 認証、認可、個人情報、セキュリティリスクを確認する |
| [08-operation-and-deployment.md](./08-operation-and-deployment.md) | ローカル開発、環境変数、ビルド、運用手順を確認する |
| [09-known-issues.md](./09-known-issues.md) | 未実装、暫定実装、技術的負債、今後確認事項を確認する |

## 主な根拠ファイル

- `app/page.tsx`
- `app/api/**/route.ts`
- `lib/domain.ts`
- `lib/repositories/*.ts`
- `lib/seed-data.ts`
- `data/reservation-db.json`
- `dataconnect/**`
- `package.json`
- `.env.example`
- `firebase.json`
- `.gitignore`

