# Googleログインとお客様情報登録 — 2026-10-19

## 実装結果

お客様向け画面にGoogleログインを追加した。既存のメール・パスワード登録／ログインは継続する。初回のGoogle認証ではFirebaseの認証アカウントを作成し、お客様情報が未登録・未完成なら登録画面を表示する。Googleの氏名を編集可能な初期値として使用し、電話番号、利用者区分、旅行会社の場合の会社・支店名と担当者名を登録した後、「お手続きを選択」を表示する。住所は任意。Google利用者の初回登録にパスワード入力は求めない。

登録済みならプロフィールの再入力を求めず「お手続きを選択」のポータルトップへ進む。登録情報はお客様画面から変更でき、予約入力の初期値に使用する。後日のGoogleログインで登録済み氏名等を上書きしない。利用者区分を旅行会社単位の共有権限には使用しない。

認証済み利用者向けにログイン方法の確認、既存パスワードによる本人確認後のGoogle連携、パスワードの追加・変更、Google連携解除を追加した。Googleだけのアカウントはパスワード追加前に連携解除できない。解除は共通Dialogで確認する。変更後は必要に応じて再ログインを求める。既存のメール変更・アカウント削除ではGoogleによる直近の本人確認を利用できる。

## 保存先と予約の整合性

| 情報 | 保存・参照先 |
| --- | --- |
| Googleの安定した識別子 `sub` | Firebase Authenticationの `google.com` provider UID |
| ログイン主体 | Firebase UID。サーバーで検証したトークンから取得 |
| 氏名・利用者区分・電話番号・住所・会社等 | 既存Account。Firebase UIDで本人に紐付く |
| 予約との関連 | 既存Account IDと既存予約モデル |
| 過去の申請内容 | 既存予約の保存済み情報を維持 |

新規テーブル・スキーマ変更・依存ライブラリ追加は行っていない。既存予約の変更や移管、メール一致による過去予約の自動紐付けは行っていない。プロフィール変更で過去予約の申請内容を更新しない。顧客の予約APIはプロフィール完成を必須とし、未完成なら409を返す。予約APIでのAccount自動作成を廃止し、登録と予約の責務を分離した。管理者の代理予約は従来どおり。

## Google認証の方式と設定

Google Identity ServicesのIDトークンをサーバーで検証し、確認済みのGoogle subをFirebase Admin SDKで明示的に関連付けてFirebaseカスタムトークンを発行する。通常のFirebase IDトークン検証と既存の本人所有権確認は継続する。

Firebase標準Googleプロバイダーによるメール一致時の自動連携を避けるため、この経路を使用する。既存Firebase設定を読み取り、標準Googleプロバイダーが無効であることを確認した。**Firebase標準Googleログインは無効のまま使用する。既存アカウントとのメール一致だけで連携しない。** 既存メールアカウントと同じメールの場合は従来のログイン後に明示的な連携を案内する。

`.env.local` に既存OAuth Webクライアントの `GOOGLE_OAUTH_CLIENT_ID` とランダム生成した `GOOGLE_AUTH_COOKIE_SECRET` を設定した。秘密値は記録・掲載しない。`.env.example` に設定例を追加した。FirebaseやGoogle Cloudのリモート設定は変更していない。

Googleライブラリが署名・audience等を検証し、アプリ側でもissuer、audience、有効期限、発行時刻、nonce、確認済みメール、subを検査する。独自の認可コード交換は行わず、Googleのアクセストークン／リフレッシュトークンやOAuthクライアントシークレットは保持しない。アプリに認可コード交換のPKCE処理はない。IDトークン方式のリクエスト紐付けはnonceと署名Cookie等で行う。

## セキュリティと同時実行

- チャレンジは5分有効。署名付きHttpOnly／SameSite=Strict Cookieにモードと対象UIDを結び付ける。HTTPSではSecureも付与する。Origin一致を必須とし、localhost以外ではHTTPSを要求する。
- nonceはサーバー側で一度だけ消費し、再利用を拒否する。消費記録は600秒保持する。チャレンジは利用者ごと毎分10回、未ログイン共通は毎分100回、認証検証は全体毎分100回の永続化済み制限を利用する。
- JSONは16KiB・読み取り10秒以内。未知の入力キーや不正なモードを拒否する。クライアント指定UIDでは本人を決定しない。
- Googleの関連付け確認と変更をPostgreSQL advisory transaction lockで直列化する。全体キー `customer-google-identities` で同一subの複数UIDへの並行連携を防ぎ、アカウント単位のロックで発行・削除・ログイン方法変更を調整する。
- AuthエミュレーターではAdminのprovider追加だけで重複関連付けを拒否できなかったため、SDKの一意性保証に依存しない。既存関連付けの照合とDBロックを実装し、意図的に重複を許すテストダブルと実PostgreSQLで競合を検証した。
- 上記の保証に必要なトランザクションが使えるDrizzle構成を対象とする。旧Data Connect構成ではGoogle認証を503で拒否する。DBのクラウド移行は行っていない。
- カスタムセッションは現在のGoogle sub、セッション世代、元のGoogle本人確認時刻、Firebaseの失効時刻をサーバーで確認する。連携解除・パスワード変更では世代更新とセッション失効を行う。古いカスタムトークンの再利用で本人確認時刻を延長できない。
- 重要操作は5分以内の元の本人確認を要求する。不明なカスタム認証は拒否し、お客様用Googleカスタムセッションで管理者権限は取得できない。管理者の既存認証は維持する。
- パスワード追加・変更の新しい画面は8文字以上。既存登録画面のパスワード仕様は変更していない。
- ログイン方法変更の通知は既存メール基盤を利用する。通知失敗は画面に示し、成功した認証情報変更を巻き戻さない。レスポンスはno-store、エラーは一般化し、トークンやCSV等の内容は記録しない。監査にはハッシュ化した主体識別子を使用する。

## 主な変更ファイル

- `app/page.tsx`：Google入口、初回情報登録、再ログイン時の遷移、本人確認。
- `app/reservations/components/google-customer-auth.tsx`：Googleボタン、ログイン方法管理、共有確認Dialog。
- `app/reservations/hooks/use-customer-session.ts`：Google利用時の本人確認と既存認証の共存。
- `app/api/auth/google/challenge/route.ts`、`app/api/auth/google/route.ts`：認証リクエスト発行・検証。
- `app/api/accounts/me/login-methods/route.ts`：本人のログイン方法確認・変更。
- `app/api/reservations/route.ts`：プロフィール完成確認。
- `lib/account-profile.ts`、`lib/google-auth.ts`、`lib/google-http.ts`：プロフィール条件、認証・HTTP安全化。
- `lib/services/google-login-service.ts`、`lib/services/authentication-notification-service.ts`：認証連携と変更通知。
- `lib/auth.ts`：カスタムセッションの失効確認と管理者との分離。
- `.env.example`、`scripts/test-postgres.ts`：設定例とDBテスト登録。
- `tests/google-auth.test.ts`、`tests/db/google-auth.test.ts`、`tests/auth/google-firebase-contract.test.ts`：単体・API／DB・Firebase契約検証。

## 検証結果

| 検証 | 結果 |
| --- | --- |
| `npm test` | 143件成功、失敗・スキップ0 |
| `npm run test:db:postgres -- --confirm reservation_system_test` | PostgreSQL 38件成功、失敗・スキップ0 |
| Firebase Authエミュレーター契約テスト | 1件成功。明示的連携、同一UID、カスタム認証、パスワード追加、解除、旧トークン拒否 |
| `npm run build` | 成功 |
| `npm run lint` | エラー0、既存警告5件 |
| localhost:3000の画面 | Google公式ボタン、従来ログイン、デスクトップ・幅390pxの表示を確認 |
| 分離した画面／API通し検証 | 下記参照 |

単体・API検証では署名Cookieの改ざん・期限切れ、Origin、nonce再利用、UID切替、確認不足、管理者・無効アカウント拒否、メール自動連携拒否、プロフィール未登録での予約拒否、プロフィール完成後の本人予約、同一Google subの並行連携拒否、失効済みトークン拒否を含む。

通し検証は一時サーバー3110、分離したPGlite、ローカルFirebase Authエミュレーター `demo-reservation-google` を使用した。実際の画面とAPIを使用し、GoogleからのIDトークン受領部分だけを検証用に置換した。Googleの氏名初期表示、旅行会社の担当者編集、プロフィール保存後の予約遷移、予約への情報引継ぎ・登録、プロフィール変更、再ログイン時の再入力省略、Googleだけの状態での解除禁止、パスワード追加後のログアウト、メール・パスワードでの再ログインまで確認した。通知メールは無効化しており、失敗表示も確認した。

実Firebase SDKとAuthエミュレーターの契約テストは、`FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` を設定し `node --import tsx --test tests/auth/google-firebase-contract.test.ts` で実行した。エミュレーターとテスト専用プロジェクトに固定した検証である。

画面証跡：

- `review-artifacts/google-login-desktop-2026-10-19.png`：実際のlocalhost:3000。
- `review-artifacts/google-login-mobile-2026-10-19.png`：同画面、幅390px。
- `review-artifacts/google-profile-fixture-2026-10-19.png`：分離環境の初回プロフィール。
- `review-artifacts/google-booking-fixture-2026-10-19.png`：分離環境の予約結果。

利用者の既存予約・実Firebaseアカウントは検証目的で変更していない。

## 未確認事項・運用上の注意

1. **実際のGoogleアカウントでの認証・同意完了は未確認。** 実画面でボタン・スクリプト・チャレンジ取得までは確認したが、実アカウントでのGoogle画面の完了を確認していない。通常のChromeから `http://localhost:3000` で確認する必要がある。Google Cloudの承認済みJavaScript生成元や同意画面の設定も最終確認対象。`origin_mismatch` の場合は既存OAuth Webクライアントの生成元に正確なURLを登録する。対処としてFirebase標準Googleプロバイダーを有効化しない。
2. 実メールの配送は未確認。連携・解除・パスワード変更通知には既存のメール設定が必要。
3. 連携解除のAPI・SDK動作は検証済み。ブラウザー自動操作では以前のネイティブ確認ダイアログで操作が停止したため、今回追加の解除確認を共有Radix Dialogへ変更した。変更後のビルド・テストは成功したが、この確認ダイアログからの解除を手操作で完了する通し検証は未確認。
4. FirebaseとDBをまたぐ処理は分散トランザクションではない。新規作成後の失敗は自身が作成した空の認証アカウントのみを確認して後始末し、不確実な状態では既存情報を削除せず拒否する。Google連携を別の管理ツールで同時に操作する運用は避ける。
5. Googleメール変更時もsubで本人を識別する。既存ログインメールや保存済みプロフィールを自動更新しない。アプリのメール変更でGoogleアカウント自体は変更しない。
6. 初期版は連携変更の全体ロックと回数制限で安全性を優先する。利用規模が増えた場合は競合・待ち時間を監視し、ロック範囲を見直す。

## 追加調査：Google画面の `origin_mismatch`

利用者からGoogle認証画面の「エラー400: origin_mismatch」の報告を受けた。Google公式資料によると、要求元のscheme・host・portと、対象OAuthクライアントの承認済みJavaScript生成元が一致しない場合のエラーである。ローカル開発では `http://localhost` とポートを含む生成元を登録するよう案内されている。

アプリが使用するプロジェクトは `reservation-system-7f132`、OAuthクライアントIDは `733972352801-nsrur8bs1dh0ovopblfldvoooouuqc39.apps.googleusercontent.com` と確認した。これは公開クライアント識別子であり、シークレットではない。利用URLは `http://localhost:3000`。

対象クライアントのGoogle Cloud設定画面を開いたが、操作用ブラウザーがGoogle Cloudに未ログインのため、承認済み生成元の現在値の読み取り・変更はできなかった。**設定変更は未実施、エラー解消も未確認。** アプリコードに変更は加えていない。

管理者による対応手順：

1. [対象OAuthクライアント](https://console.cloud.google.com/apis/credentials/oauthclient/733972352801-nsrur8bs1dh0ovopblfldvoooouuqc39.apps.googleusercontent.com?project=reservation-system-7f132) をGoogle Cloudの権限を持つアカウントで開く。
2. 「承認済みのJavaScript生成元」に既存の登録を残して `http://localhost` と `http://localhost:3000` を追加する。パスやクエリは含めない。「承認済みのリダイレクトURI」やFirebaseの承認済みドメインとは別の設定である。
3. 保存後、設定の反映を待って `http://localhost:3000` を再読み込みし、Googleログインを再確認する。

参考：[Google Identity Services 設定ガイド](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid?hl=ja)、[Google OAuthエラー説明](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#origin-mismatch)。

## 追加修正：ログイン後の遷移先をポータルトップへ変更

利用者の依頼により、Googleログイン直後の予約申請への自動遷移を廃止した。`app/page.tsx` のログイン成功時にポータルの `home` を選択し、プロフィール取得後に予約申請へ移動させていたフラグと処理を削除した。Googleの再本人確認・連携時には現在の画面を維持する。

初回のお客様情報登録は継続し、保存後の自動遷移先も「お手続きを選択」とした。この初回プロフィール保存の処理はメール認証とも共通。既存情報の編集時は現在の手続きを維持する。予約申請はポータルトップの「予約申請」から開始する。

検証：`npm test` 143件成功、`npm run build` 成功。分離DBとAuthエミュレーターの画面検証では、Google初回ログイン→情報登録→保存後のトップ表示、ログアウト→登録済みGoogle再ログイン→トップ表示を確認した。Googleの本人認証結果だけを検証用に置換し、本物のGoogle認証・同意画面は今回の検証対象に含めていない。幅390pxでもトップと操作ボタンを確認した。実利用者のDB・Firebaseアカウントは変更していない。

証跡：`review-artifacts/google-portal-home-desktop-2026-10-19.png`、`review-artifacts/google-portal-home-mobile-2026-10-19.png`。
