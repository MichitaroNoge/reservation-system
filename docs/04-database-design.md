# データベース設計

## 方針

本番DBは Firebase Data Connect / Cloud SQL for PostgreSQL に寄せます。

`data/reservation-db.json` はローカル開発用フォールバックであり、Git管理対象外です。DB設計としては Data Connect の `dataconnect/schema/schema.gql` を正とします。

### アカウントと予約者情報の分離

本システムでは、ログインアカウントと予約時点の予約者情報を別のデータとして扱います。

- `Account` はログイン可能な利用者だけをマスタ管理します。
- 管理者が代理で予約を登録しても `Account` は作成しません。
- `Reservation` は予約時点の氏名・メールアドレス・電話番号・住所・旅行会社情報等をスナップショットとして保持します。
- ログイン利用者が自分で作成した予約だけ `Reservation.account` に `Account` を紐付けます。
- `Reservation.account` は任意項目であり、管理者登録・非会員予約では `null` です。
- メールアドレスや電話番号が一致しても、管理者登録済みの過去予約を後からアカウントへ自動・手動で紐付けません。
- アカウントのプロフィールを変更しても、既存予約の予約者スナップショットは自動更新しません。

## テーブル一覧

| テーブル | 役割 | 主キー |
| --- | --- | --- |
| `Account` | ログインアカウントマスタ | `id` |
| `Store` | 店舗情報 | `id` |
| `Menu` | メニュー情報 | `id` |
| `Reservation` | 予約本体＋予約者スナップショット | `id` |
| `ReservationDetail` | 予約メニュー明細 | `id` |
| `StoreAssignment` | 予約の店舗割当 | `id` |
| `VisitRecord` | 来店実績 | `id` |
| `VisitDetail` | 来店時の利用明細 | `id` |
| `Billing` | 請求情報 | `id` |
| `Invoice` | 請求書情報 | `id` |

## 主なカラム

### `Account`

| カラム | 内容 |
| --- | --- |
| `firebaseUid` | Firebase Authentication の UID。必須・一意 |
| `email` | ログインアカウントのメールアドレス。必須・一意 |
| `name` | アカウント登録者名 |
| `phone` | 電話番号 |
| `address` | 住所 |
| `accountType` | 個人／旅行代理店等のアカウント種別 |
| `companyBranchName` | 会社・支店名 |
| `contactPersonName` | 担当者名 |
| `active` | アカウント有効フラグ |

### `Reservation`

| カラム | 内容 |
| --- | --- |
| `reservationCode` | 画面表示用予約ID。例: `RSV-1047` |
| `account` | 予約を作成したログインアカウントへの任意参照。管理者・非会員予約では `null` |
| `reserverName` | 予約時点の予約者名 |
| `reserverEmail` | 予約時点のメールアドレス |
| `reserverPhone` | 予約時点の電話番号 |
| `reserverAddress` | 予約時点の住所 |
| `reserverAccountType` | 予約時点の顧客種別 |
| `reserverCompanyBranchName` | 予約時点の会社・支店名 |
| `reserverContactPersonName` | 予約時点の担当者名 |
| `usageDate` | 食事日 |
| `usageTime` | 開始時刻 |
| `status` | 予約ステータス |
| `expectedPeople` | 予定人数 |
| `policyAgreementKind` | 同意種別 |
| `policyAgreementAcceptedAt` | 同意日時 |
| `confirmationContactedAt` | 確認連絡済み日時 |
| `receivedAt` | 受付日時 |
| `updatedAt` | 更新日時 |

### `StoreAssignment`

複数店舗割当を許容するため、`reservation` に `@unique` は付けません。

## 予約作成ルール

| 作成経路 | Account作成 | Reservation.account | 予約者情報 |
| --- | --- | --- | --- |
| ログイン済み利用者 | 既存Accountを使用 | 紐付ける | Reservationへコピー |
| 非会員利用者 | 作成しない | `null` | Reservationへ保存 |
| 管理者による代理登録 | 作成しない | `null` | Reservationへ保存 |

同一メールアドレスの `Account` が存在していても、管理者・非会員として登録された予約をそのAccountへ自動紐付けしません。

## 制約

- `Account.firebaseUid`: `@unique`
- `Account.email`: `@unique`
- `Reservation.reservationCode`: `@unique`
- `VisitRecord.reservation`: `@unique`
- `Invoice.billing`: `@unique`
- `Invoice.invoiceNumber`: `@unique`

## ER図

```mermaid
erDiagram
  ACCOUNT o|--o{ RESERVATION : creates
  RESERVATION ||--o{ RESERVATION_DETAIL : has
  MENU ||--o{ RESERVATION_DETAIL : selected
  RESERVATION ||--o{ STORE_ASSIGNMENT : assigned
  STORE ||--o{ STORE_ASSIGNMENT : receives
  RESERVATION ||--o| VISIT_RECORD : creates
  VISIT_RECORD ||--o{ VISIT_DETAIL : has
  MENU ||--o{ VISIT_DETAIL : ordered
  RESERVATION ||--o{ BILLING : billed
  VISIT_DETAIL ||--o{ BILLING : source
  BILLING ||--o| INVOICE : issued
```

`ACCOUNT o|--o{ RESERVATION` は、予約側から見たAccount参照が任意であることを表します。

## 移行方針

既存 `Customer` データを一律に `Account` へ移行してはいけません。`firebaseUid` が存在し、実際にログインアカウントとして使用されているレコードのみ `Account` へ移行します。

既存予約については、旧 `Customer` の氏名・メール・電話・住所等を各 `Reservation` の予約者スナップショットへコピーします。既存予約の `account` は、当該予約がログイン利用者本人によって作成されたことを確実に判定できる場合だけ設定し、判定できない場合は `null` とします。

過去予約をメールアドレス一致だけでAccountへ紐付ける移行は行いません。

## 根拠

- `dataconnect/schema/schema.gql`
- `dataconnect/reservation/queries.gql`
- `dataconnect/reservation/mutations.gql`
- `lib/domain.ts`
