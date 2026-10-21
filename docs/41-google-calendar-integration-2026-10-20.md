# 管理者向けGoogleカレンダー連携（2026-10-20）

状態：実装・ローカルDB反映・検証済み。管理者用OAuth設定と本人の許可操作は未実施で、実Googleへの同期はまだ開始していない。

## 実装内容

マスタ管理 → その他 → Googleカレンダー連携を追加した。管理者がGoogleへ接続後、「専用カレンダーを作成して連携」を押すと、そのGoogleアカウントに「団体予約」カレンダーを作成する。初回は今後の承認済み予約をまとめて反映し、その後の変更を一方向に同期する。共有先は管理者がGoogleカレンダー側で関係者に限定して設定する。

| 状態・操作 | 反映 |
|---|---|
| 初回の仮予約・本予約申請中 | 対象外 |
| 仮予約承認後 | 仮予約の予定を作成 |
| 本予約承認後・来店待ち | 本予約の予定を作成・更新 |
| 仮予約から本予約への変更申請中・その却下 | 承認済みの仮予約を維持 |
| 日時・人数等の変更申請中・その却下 | 承認済みの内容を維持。承認時に更新 |
| キャンセル申請中 | 承認済みだった場合のみ維持し、申請中と明記 |
| キャンセル確定、予約自体の却下 | 連携済みの予定を削除 |
| 来店済み・過去の予約 | 登録済みの予定を維持。過去の予約を初回に新規登録しない |

予定には予約番号、顧客・団体名、人数、日本時間の開始・終了、メニュー、店舗別割当人数を含める。電話・メール・住所・備考・問い合わせ本文は含めず、お客様を参加者として招待しない。仮予約と本予約は色を分ける。個々の予定は共有カレンダーの閲覧権限を引き継ぐため、共有を許可した管理者が詳細を確認できる。

## 信頼性と認可

- 接続・設定・状態取得は既存Firebaseの管理者認可を使用。更新は同一オリジン、JSON入力、厳格なZod検証、既存レート制限を適用する。ジョブAPIはCRON_SECRET必須。
- OAuthは認可コード、PKCE S256、state、ブラウザーに結び付くHttpOnly / SameSite=Lax Cookie、IDトークンのaudience・署名・期限・nonce・Google subを確認する。
- 戻り時にもFirebase側の現在の管理者権限・無効化・失効日時を確認する。認可開始情報は10分で失効し一度しか使用できない。
- Calendar用OAuthクライアントをお客様向けログインから分離する。カレンダー権限はcalendar.app.createdのみで、アプリが作成したカレンダーを対象にする。openidとemailは連携先アカウントを確認するために使用する。
- Refresh TokenとPKCE verifierはAES-256-GCMで暗号化しDBに保存。トークン・秘密鍵・Firebase UID等をブラウザーの状態APIへ返さず、ログにGoogleのエラー本文や秘密情報を出さない。Next.js開発ログでもOAuthコールバックの要求URLを除外する。レスポンスはprivate, no-store。
- DBトリガーで承認状態と同期待ちを同じトランザクションに保存する。予約・メニュー明細・店舗割当・店舗／メニュー名変更を捕捉する。ロールバックされた承認は同期されない。Google側が停止しても予約操作を完了できる。
- 予約と予定IDを固定し、通信結果不明や重複作成応答でも同じ予定を更新する。削除済みIDの復元には決定的な次のIDを使用し、DBの確定失敗後も重複を防ぐ。
- 複数プロセスはPostgreSQLのトランザクション単位アドバイザリーロックで直列化し、予約1件ごとにDBを確定して同期記録のロックを次の予約のGoogle通信まで保持しない。処理中の新しい予約変更はrevisionで判別し、同期済みに上書きせず次回へ残す。
- 1回のジョブは最大10件、開始から20秒を過ぎると次の予約へ進まない。Google通信は1回8秒で打ち切る。処理途中の通信分だけ終了が遅れる場合がある。失敗は30秒から最大1時間の間隔で再試行し、認可切れやカレンダー消失は停止して管理者に案内する。
- カレンダー新規作成は非冪等なため、作成前に結果不明の印をDBへ確定する。不明時は自動再作成せず、Googleに作成済みのカレンダーIDを指定して回復する。

## 起動・運用

npm run dev:local はNext.jsと同期ワーカーを一緒に起動する。ワーカーは起動直後と通常15秒間隔で同期し、未処理がある間は短い間隔で続ける。PCやサーバー停止中は反映できないが、未反映分はDBに残り再起動後に再開する。

単独ワーカーは npm run calendar:worker。サーバー運用ではプロセス管理下で起動するか、認証付きPOST /api/jobs/sync-google-calendarを定期実行する。Next.jsのリクエスト後だけ動くメモリ内タスクには依存しない。クラウドDBの導入・移行は行っていない。

UIに連携済み・待ち・エラー件数、最終処理／成功日時、最大20件の確認事項を表示する。停止・再開、今すぐ同期・再試行、接続解除が可能。解除は確認を挟んで保存Tokenを消し、Google上の既存予定は残す。同じGoogleアカウントでの再接続に対応する。

## 初期設定（管理者による作業が必要）

1. Google Cloudの対象プロジェクトでGoogle Calendar APIを有効にする。
2. 管理者カレンダー専用のOAuth Webアプリケーションクライアントを作成する。お客様向けの既存クライアントの設定を変更する必要はない。
3. 許可するリダイレクトURIに http://localhost:3000/api/admin/google-calendar/callback を登録する。サイトは同じlocalhost:3000で開く。本番は実サイトのHTTPS URIを登録する。
4. OAuth同意画面のデータアクセスに https://www.googleapis.com/auth/calendar.app.created とopenid・emailを設定する。テスト公開の場合は利用する管理者Googleアカウントをテストユーザーに追加し、公開状態・認可の有効期間を確認する。
5. サーバー専用の.env.localに次の3項目を設定し、npm run dev:localを再起動する。Client SecretをチャットやGitに貼らない。

```dotenv
GOOGLE_CALENDAR_CLIENT_ID=管理者用クライアントID
GOOGLE_CALENDAR_CLIENT_SECRET=管理者用クライアントシークレット
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/admin/google-calendar/callback
```

GOOGLE_CALENDAR_ENCRYPTION_KEYは今回ローカルに32バイト乱数のBase64として生成済みで、値はログや作業記録に出していない。そのまま維持し、安全にバックアップする。別環境では新規に生成し、その環境のTokenを保存する前に設定する。保存済みTokenがある状態でキーを変更すると再接続が必要になる。

6. 管理者で「マスタ管理 → その他」を開き「Googleに接続」で対象アカウントを選び、権限を確認して許可する。
7. 「専用カレンダーを作成して連携」を押し、Google側に「団体予約」が表示されることを確認する。
8. Googleカレンダーの「設定と共有」で、必要な管理者だけに共有する。一般公開は行わない。予約サイトで承認・変更・キャンセル確定し、実カレンダーへの到達を確認する。

## DBと変更箇所

0012_calm_slyde.sqlでgoogle_calendar_connection、google_calendar_flow、google_calendar_syncとトリガーを追加した。既存予約の削除・リセットはしない。ローカル開発DBには適用済み。既存のキャンセル申請中の予約は、保存済みの承認情報で対象を判定する。承認済みは確認できるが仮予約・本予約の区別が残っていないものは「承認済み」と表示し、承認履歴自体が確認できないものは対象外として管理者に確認事項を表示する。

主なファイル：lib/google-calendar/*、lib/db/schema.ts、app/api/admin/google-calendar/*、app/api/jobs/sync-google-calendar/route.ts、app/reservations/components/google-calendar-settings.tsx、other-settings-management.tsx、app/page.tsx、scripts/dev.ts、scripts/google-calendar-worker.ts、tests/google-calendar.test.ts、tests/db/google-calendar.test.ts。

## 検証と残る作業

- npm test：156件成功。
- 専用PostgreSQLテストDB：53件成功。承認／却下／キャンセル、原子性、再試行の重複防止、同時更新、OAuth再利用・権限、秘密情報の非公開、カレンダー作成結果不明時の回復、HTTPアダプターの409・410・403制限処理を検証。
- 追加箇所のESLint：成功（エラー・警告なし）。
- npm run build：成功。既存lint警告5件、型・lintエラーなし。
- 実際の設定UIとAPIを隔離DB・架空アカウントに接続し、PC・390px幅、一時停止・状態更新を確認。
- 画面記録：[PC](review-artifacts/google-calendar-settings-desktop-2026-10-20.png)、[スマートフォン](review-artifacts/google-calendar-settings-mobile-2026-10-20.png)。

実際のGoogle接続と予定の到達確認は未実施。管理者用Client ID・Client Secret・Redirect URIが未設定で、上記のGoogle側設定と本人の許可が必要。実予約を外部に送ったり、Googleカレンダーを作成・共有・削除する操作は行っていない。

Google側の直接編集はサイトへ取り込まない。次に予約内容が更新された際はサイトの内容で上書きする。定期的な全件突合、連携先アカウントの移管、複数カレンダー／店舗別カレンダー、Data Connect構成は今回の対象外。OAuthクライアントIDと暗号化キーは運用中に不用意に変更しない。運用のアクセスログではOAuthコールバックのクエリ（認可コード等）を記録しない設定にする。

参考：[Google Calendarの権限](https://developers.google.com/workspace/calendar/api/auth)、[サーバー側OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)、[予定の作成とID](https://developers.google.com/workspace/calendar/api/guides/create-events)。

最終確認：localhost:3000と同期ワーカーを起動済み。実HTTPで未認証の管理者APIが401、未設定のOAuth戻りが制御された303となること、private, no-storeと開発ログのコールバックURL除外を確認した。
