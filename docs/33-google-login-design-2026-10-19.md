# ログイン画面のGoogleボタン改善 — 2026-10-19

## 変更内容

利用者が添付したQiitaのログイン画面を参考に、メール認証とGoogle認証を見出しと領域で区分した。PCでは左にメール認証、右にGoogle認証を配置する。狭い画面ではGoogle認証を上段、メール認証を下段に配置する。共有パネルのコンテナー幅を基準に切り替えるため、予約確認などの狭い親画面でも横に詰め込まない。

- 「メールアドレスでログイン」「Googleアカウントでログイン」の見出しを表示。
- Google公式ボタンを、アカウント名・メール主体の表示から「Googleでログイン」の固定した操作文言に変更。
- 登録タブでは見出し・ボタンを「Googleアカウントで登録」「Googleで登録」に切り替える。
- 未ログイン時のポータル領域を拡張し、PCで二つの方法を比較しやすくした。ログイン済みポータルの幅は従来どおり。
- Google公式ボタンの幅は領域に合わせて160〜400pxの範囲で調整する。ResizeObserverで画面幅の変更にも追従し、画面を広げる／狭めるだけで新しい本人確認チャレンジは発行しない。
- タブ切替・再試行の準備中は古いボタンを消し、読み込み表示と操作抑止を行う。エラーと再試行は継続する。

新しいライブラリ、独自のGoogle認証ボタンや認証方式は導入していない。Google公式SDKの `standard` / `medium` / `signin_with` または `signup_with` / `outline` / 日本語を使用する。公式資料ではmediumサイズはパーソナライズされたボタンを表示しないとされている。アイコン・ボタン内部のCSSは独自に変更しない。

参考：[Googleボタンの表示条件](https://developers.google.com/identity/gsi/web/guides/personalized-button#button_rendering)、[Google公式ボタンの設定](https://developers.google.com/identity/gsi/web/reference/js-reference#GsiButtonConfiguration)。

## 変更ファイル

- `app/page.tsx`：ログイン・登録領域の見出し、コンテナークエリーによる配置、未ログイン時のポータル幅。
- `app/reservations/components/google-customer-auth.tsx`：公式ボタンの表示設定、登録用文言、幅追従、読み込み中の古いボタン抑止。

Tailwindと既存の共通コントロールを使用し、`app/globals.css` は変更していない。サーバー側の認証・認可・nonce検証、Google subの照合、初回プロフィール登録、ログイン後のトップ遷移、既存のメール・パスワード入力と検証は維持する。

## 検証結果

- `npm test`：143件成功、失敗・スキップ0。
- `npm run build`：成功。モバイル幅・読み込み調整を含む最終版で確認。
- `npm run typecheck`：成功。
- `npm run lint`：エラー0、既存警告5件。
- 実際の `http://localhost:3000/?customerMode=home` で公式SDKが「Googleでログイン」を描画することを確認。iframeの設定もmedium / signin_withになっていることを確認。
- PC幅で左右配置、390px・320px幅で縦配置とボタンが領域に収まることを目視確認。
- 画面を狭める／広げると公式ボタンの幅が追従することを確認。390pxでは237px、320pxでは167pxで描画された。
- 登録タブではGoogle公式ボタンが「Googleで登録」に切り替わり、従来の利用者区分・氏名・電話番号等のフォームが表示されることを確認。

途中でモバイル時にGoogleの固定幅が残る問題を検出し、描画先の最小幅制約を解除して修正した。最終版では収まることを再確認した。

今回の変更は表示と配置が対象のため、実際のGoogleアカウント選択・本人認証完了やメール配送の再検証は行っていない。認証情報・既存予約・Google Cloud設定は変更していない。

画面証跡：

- `review-artifacts/google-login-qiita-desktop-2026-10-19.png`
- `review-artifacts/google-login-qiita-mobile-2026-10-19.png`
