# システム全体のデザイン統一

実施日: 2026-10-25
依頼: 標準仕様に基づき、管理者側とお客様側のデザインを見直して修正する。

## 結果

予約一覧を基準に一覧の枠・余白・検索・件数・ページ送りを共通化。管理者側の予約／承認／変更承認／キャンセル／確認連絡／店舗割当／催促／問い合わせ／カレンダー／各マスタと、お客様側の認証／手続き選択／予約申請／問い合わせ／履歴を確認した。

認証・API・DBスキーマ・検索対象・締切・受入人数・キャンセルポリシー・通知の配送ロジックは変更していない。実データの更新・削除、実宛先へのメール送信、外部カレンダーの操作はしていない。

## 共通化と修正

- ManagementPage、ListPanel、ListToolbar、ResultCountを追加。PCは上34px・左右36px・下60px、狭い画面は上下24px・左右18px。枠は白背景・1px・角丸8px。
- ListSearchFieldをTailwindと意味別トークンで実装し、検索専用の旧CSSへの依存を解消。検索は42px高・12px文字、PC320px幅。ListFilterとSelectも追加。
- 予約一覧・問い合わせ管理・お客様の問い合わせ履歴に同じListPaginationを使用し、ページ送りを一覧下部へ統一。既存のページ件数と検索条件は維持。
- 入力とテキストエリアは白背景、文字14px、通常入力44px高。通常ボタンはPC42px／モバイル44px、コンパクトはPC40px／モバイル44px。パスワード表示ボタンも入力欄内の44pxの操作領域に揃えた。
- 表と旧来のUIの12px未満の文字、カードの過剰な角丸、主要な背景・文字・枠色を整理。通常要素の初期値をbaseレイヤーへ移し、共通部品の文字・アイコン・余白を上書きする競合を減らした。
- 店舗・メニュー・無効アカウントの表を共通Tableへ移行。主要な行操作を右端に残し、予約一覧・テンプレート等にはキーボードで開ける明示的な操作を設けた。
- 問い合わせ、店舗割当、催促等の行選択から、同じ詳細・編集処理を呼び出す。主要な行の文字選択中は誤って詳細を開かないようにする。
- マスタ一覧の件数を右側に統一。アカウント管理の英語の飾り見出しと重複タイトル、その他の重複タイトルを整理。マスタの入口も白い枠と同じ余白で統一。
- Dialogの白背景、18pxの見出し、14pxの説明を共通化。予約詳細は中央・最大90dvh・内部スクロール・44pxの閉じる操作を維持。
- CustomerPageHeaderを追加。お客様側の大きな装飾帯と不要な英語の見出し、認証画面の装飾だけの入れ子の枠を整理。ログイン・新規登録はそれぞれ一つの見えるページ見出しを表示。
- 読み込み表示をヘッダー下端のレイアウトを動かさない表示へ変更。承認系は読込中と0件を区別。管理画面の別画面への移動時は先頭へ戻し、詳細を閉じる際は同じ一覧を維持。
- タブレットで予約申請の固定幅の手順表示がはみ出す問題を検出。BookingStepsの5列レイアウトへ置換し、ラベルを折り返して全手順を表示するように修正。

## 確認した画面と操作

架空データのPGlite、疑似認証、実際の画面コンポーネントとAPIを使った隔離環境。実メールのキーを無効化し、ワーカーは起動していない。通常のlocalhost:3000とは別ポート3160を使用した。

| 範囲 | 主な確認 |
| --- | --- |
| 管理者ログイン | 白背景・文字14px・44px高の入力欄、共通カード |
| ダッシュボード／予約一覧 | 余白、カード、検索、表、件数、下部ページ送り、番号のEnterから正しい中央詳細 |
| 予約承認／各変更承認／キャンセル承認 | 検索、枠、件数、空表示、受入判定の子画面、重なる予約と展開詳細の入口 |
| 確認連絡／店舗割当／催促 | 対象一覧、同じ余白と文字、0件表示、割当子画面の選択・人数入力 |
| カレンダー | 月間・週間・店舗別の切替、表内スクロール、ページ全体の横はみ出し |
| 問い合わせ管理 | 件数、検索、エラー注入後の再読み込みと0件への復帰、中央詳細 |
| 各マスタ | 顧客・店舗・メニューの一覧、店舗の入力・キャンセル、モバイルのメニュー編集と右端操作 |
| その他・通知・テンプレート | 受入設定、受入不可日時の追加、通知の空表示、テンプレートの必須エラー、メールテンプレート編集 |
| お客様側 | ログイン、新規登録、手続き選択、プロフィール編集、問い合わせ、問い合わせ履歴、予約申請の手順1〜3 |

- 代表幅: PC1280px、タブレット768px、スマートフォン390px。
- ブラウザーで40以上の確認ケースを測定（初回の発見・修正後の再確認を含む）。表・入力・ボタン・段落を対象に確認した12px未満の文字はなし。外部Googleボタンの内部は対象外。
- 予約手順は修正前に768px幅で文書幅805pxを再現。修正後は文書幅753px、390px幅では375px（スクロールバー分を除く）でページ全体の横はみ出しを解消。
- 管理画面のPC余白34／36／60、モバイル余白24／18、通常入力44px・文字14px・白背景、中央詳細の左右16pxと閉じる44pxを実測。
- 新規登録で氏名・電話番号を入力しても、先に入力した架空のメールアドレスが保持されることを画像で確認。読み取りAPIではメール・電話の値が伏せられるため、文字列比較は判定に使っていない。
- 店舗・プロフィール・テンプレートは入力・開閉・検証を確認。実際の保存・送信を行う通し操作とは区別している。
- 実際のGoogleログイン、Resendのメール配送、外部カレンダー操作は今回のUI検証では未実施。隔離環境ではGoogle認証の準備APIを用意していないため、その欄は検証環境のエラーになる。既存の外部認証実装は維持。

## 自動検証

最終コードで以下を確認した。

- npm test: 169件成功、失敗0。
- npm run build: 成功。
- npm run lint: エラー0、既存の警告3件。
- npm run typecheck: 成功。
- git diff --check: 成功。
- localhost:3000: HTTP 200。通常の開発サーバーを停止せず、コードを反映。

既存のUI回帰テストでは固定色の期待を意味別トークンへ更新し、行の操作ハンドラーの確認を文字選択ガードにも対応させた。業務ルール・認証拒否の検証は削除していない。DB移行テストに元からあった暗黙のany配列は明示型へ直し、テストの動作は変更していない。

## 変更ファイル

新規:
- components/ui/management-layout.tsx
- components/ui/select.tsx
- components/ui/list-pagination.tsx
- components/ui/customer-page-header.tsx
- components/ui/booking-steps.tsx

既存（この依頼開始時点からの差分）:
- app/globals.css
- app/reservations/admin-app.tsx
- app/reservations/components/auth.tsx
- app/reservations/components/common.tsx
- app/reservations/components/customer-management.tsx
- app/reservations/components/email-template-management.tsx
- app/reservations/components/menu-management.tsx
- app/reservations/components/other-settings-management.tsx
- app/reservations/components/reservation-approval-dialog.tsx
- app/reservations/components/reservation-calendar-page.tsx
- app/reservations/components/reservation-notification-management.tsx
- app/reservations/components/reservation-reminder-page.tsx
- app/reservations/components/reservation-worklist.tsx
- app/reservations/components/store-assignment-page.tsx
- app/reservations/components/store-management.tsx
- app/reservations/customer-portal.tsx
- components/inquiries/contact-history.tsx
- components/inquiries/inquiry-management.tsx
- components/inquiries/reply-template-management.tsx
- components/inquiries/shared.tsx
- components/ui/button.tsx
- components/ui/card.tsx
- components/ui/dialog.tsx
- components/ui/input.tsx
- components/ui/list-search-field.tsx
- components/ui/reservation-details-dialog.tsx
- components/ui/table.tsx
- components/ui/textarea.tsx
- docs/README.md
- docs/standard-specification.md
- docs/ui-design-system.md
- tests/db/inquiries.test.ts
- tests/reservation-ui-regression.test.ts

既存の未コミット変更は維持し、この依頼でAPI・lib・DBスキーマは変更していない。

## 画像

すべて架空データ。

- [予約承認 PC](review-artifacts/design-standard-2026-10-25/approval-desktop.png)
- [問い合わせ管理 モバイル（最終列幅調整前）](review-artifacts/design-standard-2026-10-25/inquiries-mobile.png)
- [予約一覧 モバイル](review-artifacts/design-standard-2026-10-25/reservations-mobile.png)
- [予約一覧 タブレット](review-artifacts/design-standard-2026-10-25/reservations-tablet.png)
- [中央詳細 モバイル](review-artifacts/design-standard-2026-10-25/detail-mobile.png)
- [受入不可日時 モバイル](review-artifacts/design-standard-2026-10-25/settings-mobile.png)
- [予約申請 タブレット](review-artifacts/design-standard-2026-10-25/booking-tablet.png)
- [予約申請 モバイル](review-artifacts/design-standard-2026-10-25/booking-mobile.png)

## 最終確認の制約と片付け

- 最後の問い合わせ一覧の列幅・見出しの折り返し調整後、ブラウザーの自動承認確認が利用上限で失敗し、最終画像の再撮影と見た目の再確認ができなかった。安全性による拒否ではなく承認確認サービスの利用上限。別ブラウザーや直接制御で回避していない。
- 最後の調整は、見出しを原則1行にし、短い種別を改行しない指定、件名・問い合わせ者の最小幅を確保する表示変更。コード・スタイル指定の整合性、最終テスト・型チェック・ビルドは確認済み。見出し変更後のブラウザー再確認は未実施として区別する。
- inquiries-desktop.pngは調整途中の記録で、最終版の見本には使わない。今回の制約は最後の一覧表示の再確認であり、それ以前のPC・タブレット・スマートフォンでの40以上の確認ケースを未実施とするものではない。
- 検証用ブラウザーの表示サイズをリセットし、作成した検証タブを閉じた。専用サーバーだけを終了し、通常のlocalhost:3000と既存ワーカーは維持する。

## 継続する保守方針

標準仕様とUI標準を更新し、今後は共通部品から新しい画面を構成する。複雑な既存レイアウトの互換CSSは残るため、必要に応じて段階的に移行する。性能の目標値の新設、認証方式の変更、DBのクラウド移行は今回の対象に追加していない。
