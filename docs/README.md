# 設計資料 目次

このディレクトリは、予約管理システムの現行仕様と保守時の判断材料をまとめた設計資料です。

| 資料 | 読む目的 |
| --- | --- |
| [00-system-overview.md](./00-system-overview.md) | システムの目的、利用者、対象範囲を確認する |
| [01-functional-specification.md](./01-functional-specification.md) | 機能単位の目的、入力、処理、出力を確認する |
| [02-screen-specification.md](./02-screen-specification.md) | 画面、表示項目、操作、遷移を確認する |
| [03-system-architecture.md](./03-system-architecture.md) | Next.js、API、Repository、DB方針、外部サービスの構成を確認する |
| [04-database-design.md](./04-database-design.md) | Firebase Data Connect / PostgreSQL のデータモデルを確認する |
| [05-api-design.md](./05-api-design.md) | API Route とRepository処理の対応を確認する |
| [06-business-flow.md](./06-business-flow.md) | 予約申請、承認、確認連絡、店舗割当などの業務フローを確認する |
| [07-authentication-and-security.md](./07-authentication-and-security.md) | 認証、認可、個人情報、セキュリティリスクを確認する |
| [08-operation-and-deployment.md](./08-operation-and-deployment.md) | 開発、ビルド、Data Connect、運用手順を確認する |
| [09-known-issues.md](./09-known-issues.md) | 未実装、暫定実装、今後の確認事項を確認する |

## DB方針

本番DBは Firebase Data Connect / Cloud SQL for PostgreSQL に寄せます。

`data/reservation-db.json` はローカル開発用フォールバックであり、Git管理対象外です。`RESERVATION_REPOSITORY=file` のときだけ、初回APIアクセス時に `lib/seed-data.ts` から生成されます。

## 主な根拠ファイル

- `app/page.tsx`
- `app/api/**/route.ts`
- `lib/domain.ts`
- `lib/repositories/**`
- `dataconnect/**`
- `.env.example`
- `firebase.json`
