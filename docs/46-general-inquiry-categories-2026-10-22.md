# 一般お問い合わせの種別変更（2026-10-22）

## 変更内容

- 予約に紐づかないお問い合わせは「空き状況について」「その他」の2択とする。初期選択は「空き状況について」。
- 一般お問い合わせのリストには「予約について」「サービスについて」を表示しない。APIへの直接送信でもこの2種類は受け付けず、HTTP 400を返す。
- 予約に紐づくお問い合わせは引き続き「予約について」で固定する。予約の所有権は従来どおりサーバー側で確認する。
- 過去に保存された種別・問い合わせ内容は変更しない。管理者の一覧・絞り込みや履歴では過去の「サービスについて」も表示できる。
- 管理者の一覧・詳細・種別フィルターでも新しい「空き状況について」を扱う。

## 変更箇所

- `lib/inquiries/types.ts`：一般用／予約用の選択肢、保存可能な新規種別、一般用送信スキーマ、管理者用の検索条件。
- `components/inquiries/contact-form.tsx`：予約との関連に応じた選択肢・初期値・リセット時の値。
- `lib/inquiries/controllers.ts`：一般お問い合わせへの予約用種別の指定を拒否。
- `lib/db/schema.ts`、`drizzle/0016_ancient_blur.sql`：`inquiry_category`に`availability`を追加。既存の列・データを変更しない。
- `tests/inquiry-validation.test.ts`、`tests/db/inquiries.test.ts`：2択、旧種別の参照、新規保存、種別検索、不正な指定の拒否、予約用種別の維持を確認。

## DB反映

既存開発DBを`.tmp/inquiry-categories-before-2026-10-22.dump`へバックアップした後、`npm run db:migrate`で反映。バックアップには個人情報が含まれる可能性があるためGit管理しない。

## 確認結果

- `npm test`：160件成功。
- `npm run test:db:postgres -- --confirm reservation_system_test`：63件成功。専用テストDBを使用し、実メールは送信していない。
- `npm run build`：成功。`localhost:3000`へ反映済み。
- 通常利用サーバーを再起動し、未ログインの一般お問い合わせフォームを1280px・390pxで確認。選択肢が「空き状況について」「その他」だけであること、初期値、その他への切替、画面の横はみ出しがないことを確認。実際の問い合わせ送信や実メール送信は行っていない。

![一般お問い合わせ](review-artifacts/inquiry-categories-2026-10-22/general-inquiry-desktop.png)
