"use client";
import { ReservationInquiryHistoryButton } from "@/components/inquiries/reservation-inquiry-history";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { isAccountProfileComplete } from "@/lib/account-profile";
import { cancellationFeeNotice,isFeeExemptPeopleOnlyChange,reservationChangeFeeContext } from "@/lib/cancellation-policy";
import { cancellationPolicyVersion,type CancellationPolicyAgreementInput } from "@/lib/cancellation-policy-consent";
import { matchesPendingReservationChange } from "@/lib/reservation-change";
import { earliestReservationDate } from "@/lib/reservation-lead-time";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye,EyeOff,LoaderCircle,LockKeyhole,Mail } from "lucide-react";
import Link from "next/link";
import { BookingSteps } from "@/components/ui/booking-steps";
import { CustomerPageHeader } from "@/components/ui/customer-page-header";
import { CustomerPageActions, CustomerPageFrame } from "@/components/ui/customer-page-layout";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { parseCustomerListPosition } from "@/lib/customer-list-position";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { requestJson } from "./api-client";
import { CancellationPolicyAgreement } from "./components/cancellation-policy-agreement";
import { CustomerBookingSchedule } from "./components/customer-booking-schedule";
import { Icon } from "./components/common";
import { CustomerAuthLink } from "./components/customer-auth-link";
import { CustomerRequestSubmit } from "./components/customer-request-submit";
import { CustomerEmailChangeScreen, CustomerAccountDeletionScreen } from "./components/customer-account-actions";
import { CustomerLoginMethods } from "./components/customer-login-methods";
import { CustomerReservationDetails } from "./components/customer-reservation-details";
import { GoogleCustomerAuthProvider,GoogleCustomerButton,useGoogleCustomer } from "./components/google-customer-auth";
import { ReservationFeeReconfirmation } from "./components/reservation-fee-reconfirmation";
import {
  DEFAULT_START_TIME,
  STATUS,
  statusClass
} from "./constants";
import { applyAccountToReservationForm } from "./customer-form";
import {
  bookingFormDateTimeLabel,
  bookingFormEndTime,
  menuSelectionLabel,
  reservationBookingTypeLabel,
  reservationDateTimeLabel,
  reservationDisplayLabel,
  reservationMenuLabel,
  selectedMenuTotal,
  statusLabel
} from "./formatters";
import {
  customerAuthErrorCode,
  useCustomerSession,
} from "./hooks/use-customer-session";
import { useReservationPolicy } from "./hooks/use-reservation-policy";
import { emptyReservationForm,GroupReservationContactFields,GroupReservationFields,GroupReservationPeopleFields,isConfirmedReservationChangeRequest,isGroupBooking,MenuPicker,PaymentAndRemarksFields,type CustomerPortalMode } from "./reservation-shared";
import type {
AccountContactEmail,
BookingForm,
Customer,
Menu,
Reservation,
ReservationChangeRequest,
ReservationSubmitOptions,
Status
} from "./types";

const isTravelAgencyAccount = (form: Pick<BookingForm, "accountType">) =>
  form.accountType === "travel_agency";


function CustomerPortalHome({
  screen,
  onOpenSettings,
  onOpenEmailChange,
  onOpenAccountDeletion,
  onBack,
  customerEmail,
  isLoggedIn,
  authError,
  accountEmail,
  accountPassword,
  accountSubmitting,
  customerAuthLoading,
  bookingMode,
  registrationForm,
  onBookingModeChange,
  onRegistrationFormChange,
  onAccountEmailChange,
  onAccountPasswordChange,
  onLogin,
  onSubmitAccount,
  onResetPassword,
  onLogout,
  contactVerificationStatus,
  customerAccount,
  accountLoadError,
  onRetryAccount,
  onUpdateAccount,
  contactEmails,
  onAddContactEmail,
  onRemoveContactEmail,
  onOpenAccount,
  onOpenReservation,
}: {
  screen: "home" | "settings";
  onOpenSettings: () => void;
  onOpenEmailChange: () => void;
  onOpenAccountDeletion: () => void;
  onBack: () => void;
  customerEmail: string;
  isLoggedIn: boolean;
  authError: string;
  accountEmail: string;
  accountPassword: string;
  accountSubmitting: boolean;
  customerAuthLoading: boolean;
  bookingMode: "login" | "register";
  registrationForm: BookingForm;
  onBookingModeChange: (mode: "login" | "register") => void;
  onRegistrationFormChange: Dispatch<SetStateAction<BookingForm>>;
  onAccountEmailChange: (value: string) => void;
  onAccountPasswordChange: (value: string) => void;
  onLogin: (email?: string, password?: string) => void;
  onSubmitAccount: (email?: string, password?: string, profile?: RegisterAuthFields) => void;
  onResetPassword: (email: string) => void;
  onLogout: () => void;
  contactVerificationStatus: "verified" | "invalid" | null;
  customerAccount: Customer | null;
  accountLoadError: string;
  onRetryAccount: () => void;
  onUpdateAccount: (values: AccountProfileFields) => Promise<void>;
  contactEmails: AccountContactEmail[];
  onAddContactEmail: (email: string) => Promise<void>;
  onRemoveContactEmail: (id: string) => Promise<void>;
  onOpenAccount: () => void;
  onOpenReservation: () => void;
}) {
  const isSettings = screen === "settings";
  const [profileState, setProfileState] = useState({ editing: false, dirty: false, busy: false });
  const [loginMethodsState, setLoginMethodsState] = useState({ dirty: false, busy: false });
  const profileReady = isAccountProfileComplete(customerAccount);
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactEmailError, setContactEmailError] = useState("");
  const googleCustomer = useGoogleCustomer();
  return (
    <div className={isLoggedIn ? "form-body narrow portal-entry" : "portal-entry mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10"}>
      <h1 className="mb-6 text-xl font-semibold">{isSettings ? (customerAuthLoading || profileReady ? "お客様情報・パスワード変更" : "お客様情報登録") : isLoggedIn ? "お手続きを選択" : "仮想の店舗Webサイト"}</h1>
      {isLoggedIn && !isSettings && (
        <nav aria-label="予約・お問い合わせのお手続き" className="mb-6 grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" className="h-auto min-h-24 flex-col items-start gap-2 whitespace-normal p-5 text-left" disabled={customerAuthLoading || !profileReady || Boolean(accountLoadError)} onClick={onOpenReservation}>
            <strong className="text-base">予約申請</strong>
            <span className="text-sm font-normal">仮予約または本予約を申し込みます</span>
          </Button>
          <Button type="button" variant="outline" className="h-auto min-h-24 flex-col items-start gap-2 whitespace-normal p-5 text-left" disabled={customerAuthLoading || !profileReady || Boolean(accountLoadError)} onClick={onOpenAccount}>
            <strong className="text-base">予約確認・変更・キャンセル</strong>
            <span className="text-sm font-normal">予約の確認、変更申請、キャンセル申請を行います</span>
          </Button>
          <Button asChild variant="outline" className="h-auto min-h-24 flex-col items-start gap-2 whitespace-normal p-5 text-left">
            <Link href="/contact">
              <strong className="text-base">お問い合わせ</strong>
              <span className="text-sm font-normal">空き状況の確認やその他のご質問を受け付けます</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto min-h-24 flex-col items-start gap-2 whitespace-normal p-5 text-left">
            <Link href="/contact/history">
              <strong className="text-base">問い合わせ履歴</strong>
              <span className="text-sm font-normal">これまでのお問い合わせと店舗からの回答を確認します</span>
            </Link>
          </Button>
        </nav>
      )}
      {isLoggedIn && customerAuthLoading && <p role="status" className="mb-4 text-sm text-muted-foreground">お客様情報を読み込み中…</p>}
      {(!isSettings || !isLoggedIn) && <section className="customer-account-panel portal-account-panel">
        {isLoggedIn ? (
          <div className="customer-account-current">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span>ログイン中</span>
              <strong>{customerEmail}</strong>
            </div>
            <div className="flex w-full flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onLogout}>ログアウト</Button>
            <Button type="button" variant="outline" size="sm" onClick={onOpenEmailChange}>メールアドレス変更</Button>
            {!isSettings && <Button type="button" variant="outline" size="sm" onClick={onOpenSettings}>お客様情報・パスワード変更</Button>}
            <Button
              type="button" variant="outline" size="sm"
              className="account-delete-button border-destructive/40 text-destructive"
              onClick={onOpenAccountDeletion}
              disabled={accountSubmitting}
            >
              アカウント削除
            </Button>
            </div>
          </div>
        ) : (
          <CustomerAccountAccessPanel
            onOpenReservation={!isSettings ? onOpenReservation : undefined}
            authError={authError}
            accountEmail={accountEmail}
            accountPassword={accountPassword}
            accountSubmitting={accountSubmitting}
            customerAuthLoading={customerAuthLoading}
            bookingMode={bookingMode}
            registrationForm={registrationForm}
            onBookingModeChange={onBookingModeChange}
            onRegistrationFormChange={onRegistrationFormChange}
            onAccountEmailChange={onAccountEmailChange}
            onAccountPasswordChange={onAccountPasswordChange}
            onLogin={onLogin}
            onSubmitAccount={onSubmitAccount}
            onResetPassword={onResetPassword}
          />
        )}
      </section>}
      {isSettings && contactVerificationStatus && <Alert role={contactVerificationStatus === "verified" ? "status" : "alert"} className={contactVerificationStatus === "verified" ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 text-destructive"}>{contactVerificationStatus === "verified" ? "追加の連絡先メールアドレスを確認しました。今後の予約案内をこのアドレスにも送信します。" : "確認URLが無効か、有効期限が切れています。追加連絡先を削除して、もう一度登録してください。"}</Alert>}
      {isSettings && isLoggedIn && !customerAuthLoading && customerAccount && <AccountProfileEditor key={`${customerAccount.id}-${customerAccount.accountType}-${customerAccount.name}-${customerAccount.phone}-${customerAccount.address}`} account={customerAccount} onSave={onUpdateAccount} onStateChange={setProfileState} />}
      {isLoggedIn && accountLoadError && <Alert className="border-destructive/40 text-destructive"><p>{accountLoadError}</p><Button type="button" className="mt-3" variant="outline" disabled={customerAuthLoading} onClick={onRetryAccount}>再読み込み</Button></Alert>}
      {isSettings && isLoggedIn && !customerAccount && !customerAuthLoading && !accountLoadError && (
        <div className="grid gap-3">
          <Alert>アカウント情報の保存が完了していません。プロフィールを保存すると登録が完了します。</Alert>
          <AccountProfileEditor account={{ name: googleCustomer?.user?.displayName ?? "", contactPersonName: googleCustomer?.user?.displayName ?? "", contact: customerEmail, phone: "" }} onSave={onUpdateAccount} onStateChange={setProfileState} />
        </div>
      )}
      {isSettings && isLoggedIn && profileReady && <CustomerLoginMethods onStateChange={setLoginMethodsState} />}
      {isSettings && isLoggedIn && profileReady && (
        <Card className="p-5">
          <h3 className="font-semibold">追加の連絡先メールアドレス</h3>
          <p className="mt-1 text-sm text-muted-foreground">確認済みのアドレスにも予約に関する案内を送信します。最大5件まで登録できます。</p>
          <div className="mt-4 grid gap-2">{contactEmails.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"><span className="min-w-0 truncate">{item.email}</span><div className="flex items-center gap-2"><Badge variant={item.verifiedAt ? "success" : "secondary"}>{item.verifiedAt ? "確認済み" : "確認待ち"}</Badge><Button type="button" size="sm" variant="outline" disabled={contactSubmitting} onClick={async () => { setContactSubmitting(true); setContactEmailError(""); try { await onRemoveContactEmail(item.id); } catch (error) { setContactEmailError(error instanceof Error ? error.message : "追加連絡先を削除できませんでした。"); } finally { setContactSubmitting(false); } }}>削除</Button></div></div>)}</div>
          <Label htmlFor="additional-contact-email" className="mt-4 block">追加するメールアドレス</Label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input id="additional-contact-email" type="email" placeholder="追加するメールアドレス" value={additionalEmail} onChange={(event) => { setAdditionalEmail(event.target.value); setContactEmailError(""); }} /><Button type="button" disabled={!additionalEmail || contactSubmitting || contactEmails.length >= 5} onClick={async () => { setContactSubmitting(true); setContactEmailError(""); try { await onAddContactEmail(additionalEmail); setAdditionalEmail(""); } catch (error) { setContactEmailError(error instanceof Error ? error.message : "確認メールを送信できませんでした。"); } finally { setContactSubmitting(false); } }}>{contactSubmitting ? "送信中" : "確認メールを送信"}</Button></div>
          {contactEmailError && <Alert className="mt-3 border-destructive/40 text-destructive">{contactEmailError}</Alert>}
        </Card>
      )}
      {isSettings && <CustomerPageActions onBack={onBack} busy={accountSubmitting || contactSubmitting || profileState.busy || loginMethodsState.busy} dirty={profileState.dirty || loginMethodsState.dirty || Boolean(additionalEmail)}>
        {profileState.editing && <Button type="submit" form="customer-profile-form" disabled={profileState.busy || loginMethodsState.busy || accountSubmitting || contactSubmitting}>{profileState.busy ? "保存中…" : "変更を保存"}</Button>}
      </CustomerPageActions>}
    </div>
  );
}


const loginAuthSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "メールアドレスを入力してください")
    .email("正しいメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

const registerAuthSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "メールアドレスを入力してください")
      .email("正しいメールアドレスを入力してください"),
    password: z.string().min(6, "パスワードは6文字以上で入力してください"),
    accountType: z.enum(["individual", "travel_agency"]),
    name: z.string(),
    companyBranchName: z.string(),
    contactPersonName: z.string(),
    phone: z
      .string()
      .trim()
      .min(1, "電話番号を入力してください")
      .regex(/^[0-9+()\-\s]+$/, "電話番号の形式を確認してください"),
    address: z.string(),
  })
  .superRefine((value, context) => {
    if (value.accountType === "travel_agency") {
      if (!value.companyBranchName.trim())
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["companyBranchName"],
          message: "会社・支店名を入力してください",
        });
      if (!value.contactPersonName.trim())
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contactPersonName"],
          message: "担当者名を入力してください",
        });
    } else if (!value.name.trim())
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "お名前を入力してください",
      });
  });


type LoginAuthFields = z.infer<typeof loginAuthSchema>;

type RegisterAuthFields = z.infer<typeof registerAuthSchema>;


const accountProfileSchema = z
  .object({
    accountType: z.enum(["individual", "travel_agency"]),
    name: z.string(),
    companyBranchName: z.string(),
    contactPersonName: z.string(),
    phone: z.string().trim().min(1, "電話番号を入力してください").regex(/^[0-9+()\-\s]+$/, "電話番号の形式を確認してください"),
    address: z.string(),
  })
  .superRefine((value, context) => {
    if (value.accountType === "travel_agency") {
      if (!value.companyBranchName.trim()) context.addIssue({ code: z.ZodIssueCode.custom, path: ["companyBranchName"], message: "会社・支店名を入力してください" });
      if (!value.contactPersonName.trim()) context.addIssue({ code: z.ZodIssueCode.custom, path: ["contactPersonName"], message: "担当者名を入力してください" });
    } else if (!value.name.trim()) context.addIssue({ code: z.ZodIssueCode.custom, path: ["name"], message: "お名前を入力してください" });
  });


type AccountProfileFields = z.infer<typeof accountProfileSchema>;


function AccountProfileEditor({ account, onSave, onStateChange, headingLevel = "h3" }: { account: Customer; onSave: (values: AccountProfileFields) => Promise<void>; onStateChange?: (state: { editing: boolean; dirty: boolean; busy: boolean }) => void; headingLevel?: "h1" | "h3" }) {
  const Heading = headingLevel;
  const [editing, setEditing] = useState(!isAccountProfileComplete(account));
  const [discardEditing, setDiscardEditing] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const profileForm = useForm<AccountProfileFields>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: {
      accountType: account.accountType === "travel_agency" ? "travel_agency" : "individual",
      name: account.accountType === "travel_agency" ? "" : account.name,
      companyBranchName: account.companyBranchName ?? (account.accountType === "travel_agency" ? account.name : ""),
      contactPersonName: account.contactPersonName ?? "",
      phone: account.phone ?? "",
      address: account.address ?? "",
    },
    mode: "onTouched",
  });
  const accountType = profileForm.watch("accountType");
  const dirty = editing && profileForm.formState.isDirty, busy = profileForm.formState.isSubmitting;
  useEffect(() => { onStateChange?.({ editing, dirty, busy }); }, [editing, dirty, busy, onStateChange]);
  const submit = profileForm.handleSubmit(async (values) => {
    setSubmitError("");
    try { await onSave(values); profileForm.reset(values); setEditing(false); }
    catch (error) { setSubmitError(error instanceof Error ? error.message : "アカウント情報を更新できませんでした。"); }
  });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3"><Heading className={headingLevel === "h1" ? "text-xl font-semibold" : "font-semibold"}>{account.id ? "お客様情報" : "お客様情報登録"}</Heading>{!editing && <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>変更</Button>}</div>
      {!editing ? (
        <dl className="mt-4 grid gap-3 text-sm">
          <div><dt className="text-muted-foreground">利用者区分</dt><dd className="mt-1 font-medium">{account.accountType === "travel_agency" ? "旅行会社の担当者様" : "一般のお客様"}</dd></div>
          <div><dt className="text-muted-foreground">{account.accountType === "travel_agency" ? "会社・支店名" : "氏名"}</dt><dd className="mt-1 font-medium">{account.accountType === "travel_agency" ? account.companyBranchName || account.name : account.name}</dd></div>
          {account.accountType === "travel_agency" && <div><dt className="text-muted-foreground">担当者名</dt><dd className="mt-1 font-medium">{account.contactPersonName || "未登録"}</dd></div>}
          <div><dt className="text-muted-foreground">電話番号</dt><dd className="mt-1 font-medium">{account.phone || "未登録"}</dd></div>
          <div><dt className="text-muted-foreground">住所</dt><dd className="mt-1 whitespace-pre-wrap font-medium">{account.address || "未登録"}</dd></div>
        </dl>
      ) : (
        <form id="customer-profile-form" className="mt-4 grid gap-4" onSubmit={submit} noValidate>
          <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="mb-1 text-sm font-medium sm:col-span-2">利用者区分 <span className="ml-2 text-xs text-primary">必須</span></legend><Button type="button" variant="outline" aria-pressed={accountType === "individual"} className={accountType === "individual" ? "border-primary bg-primary/5 text-primary" : ""} onClick={() => profileForm.setValue("accountType", "individual", { shouldValidate: true, shouldDirty: true })}>一般のお客様</Button><Button type="button" variant="outline" aria-pressed={accountType === "travel_agency"} className={accountType === "travel_agency" ? "border-primary bg-primary/5 text-primary" : ""} onClick={() => profileForm.setValue("accountType", "travel_agency", { shouldValidate: true, shouldDirty: true })}>旅行会社の担当者様</Button></fieldset>
          {accountType === "travel_agency" ? <><AuthField label="会社・支店名" required error={profileForm.formState.errors.companyBranchName?.message}><Input {...profileForm.register("companyBranchName")} /></AuthField><AuthField label="担当者名" required error={profileForm.formState.errors.contactPersonName?.message}><Input autoComplete="name" {...profileForm.register("contactPersonName")} /></AuthField></> : <AuthField label="氏名" required error={profileForm.formState.errors.name?.message}><Input autoComplete="name" {...profileForm.register("name")} /></AuthField>}
          <AuthField label="電話番号" required error={profileForm.formState.errors.phone?.message}><Input type="tel" inputMode="tel" autoComplete="tel" {...profileForm.register("phone")} /></AuthField>
          <AuthField label="住所" error={profileForm.formState.errors.address?.message}><Input autoComplete="street-address" {...profileForm.register("address")} /></AuthField>
          {submitError && <Alert className="border-destructive/40 text-destructive">{submitError}</Alert>}
          {isAccountProfileComplete(account) && <div className="flex justify-end"><Button type="button" variant="outline" disabled={busy} onClick={() => { if (dirty) setDiscardEditing(true); else { profileForm.reset(); setSubmitError(""); setEditing(false); } }}>編集をやめる</Button></div>}
        </form>
      )}
      <Dialog open={discardEditing} onOpenChange={setDiscardEditing}>
        <DialogContent className="max-w-lg p-5 sm:p-6">
          <DialogTitle>入力を破棄しますか？</DialogTitle>
          <DialogDescription>保存していない変更内容は失われます。</DialogDescription>
          <div className="mt-4 flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" onClick={() => setDiscardEditing(false)}>入力を続ける</Button><Button type="button" onClick={() => { profileForm.reset(); setSubmitError(""); setEditing(false); setDiscardEditing(false); }}>破棄する</Button></div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


function CustomerAuthEntryLinks({ onOpenReservation }: { onOpenReservation?: () => void }) {
  return <div className="grid gap-5 p-5 sm:p-6">
    {onOpenReservation && <Button asChild size="lg"><Link href="/reserve" onNavigate={event => { event.preventDefault(); onOpenReservation(); }}>予約フォームへ</Link></Button>}
    <div className="grid gap-3 sm:grid-cols-2">
      <Button asChild size="lg"><CustomerAuthLink href="/login">ログイン</CustomerAuthLink></Button>
      <Button asChild size="lg" variant="outline"><CustomerAuthLink href="/register">新規登録</CustomerAuthLink></Button>
    </div>
  </div>;
}


function CustomerAccountAccessPanel({
  standalone = false,
  inline = false,
  onOpenReservation,
  authError,
  accountEmail,
  accountPassword,
  accountSubmitting,
  customerAuthLoading,
  bookingMode,
  registrationForm,
  onBookingModeChange,
  onRegistrationFormChange,
  onAccountEmailChange,
  onAccountPasswordChange,
  onLogin,
  onSubmitAccount,
  onResetPassword,
}: {
  standalone?: boolean;
  inline?: boolean;
  onOpenReservation?: () => void;
  authError: string;
  accountEmail: string;
  accountPassword: string;
  accountSubmitting: boolean;
  customerAuthLoading: boolean;
  bookingMode: "login" | "register";
  registrationForm: BookingForm;
  onBookingModeChange: (mode: "login" | "register") => void;
  onRegistrationFormChange: Dispatch<SetStateAction<BookingForm>>;
  onAccountEmailChange: (value: string) => void;
  onAccountPasswordChange: (value: string) => void;
  onLogin: (email?: string, password?: string) => void;
  onSubmitAccount: (email?: string, password?: string, profile?: RegisterAuthFields) => void;
  onResetPassword: (email: string) => void;
}) {
  const travelAgency = isTravelAgencyAccount(registrationForm);
  const [showPassword, setShowPassword] = useState(false);
  const loginForm = useForm<LoginAuthFields>({
    resolver: zodResolver(loginAuthSchema),
    values: { email: accountEmail, password: accountPassword },
    mode: "onTouched",
  });
  const registerForm = useForm<RegisterAuthFields>({
    resolver: zodResolver(registerAuthSchema),
    values: {
      email: accountEmail,
      password: accountPassword,
      accountType: travelAgency ? "travel_agency" : "individual",
      name: registrationForm.name,
      companyBranchName: registrationForm.companyBranchName ?? "",
      contactPersonName: registrationForm.contactPersonName ?? "",
      phone: registrationForm.phone,
      address: registrationForm.address,
    },
    mode: "onTouched",
  });
  const busy = accountSubmitting || customerAuthLoading;
  const selectAccountType = (
    accountType: NonNullable<BookingForm["accountType"]>,
  ) => {
    onRegistrationFormChange((current) => ({
      ...current,
      accountType,
      bookingType:
        inline ? current.bookingType : accountType === "travel_agency" ? "travel_agency_group" : "individual",
      companyBranchName:
        accountType === "travel_agency"
          ? current.companyBranchName || current.name
          : "",
      contactPersonName:
        accountType === "travel_agency" ? current.contactPersonName : "",
    }));
  };
  if (!standalone && !inline) return <CustomerAuthEntryLinks onOpenReservation={onOpenReservation} />;
  return (
    <section className="@container overflow-hidden bg-card text-card-foreground" aria-label={bookingMode === "login" ? "ログイン方法" : "新規登録方法"}>
      {inline && <div className="mb-4 grid grid-cols-2 gap-3"><Button type="button" variant={bookingMode === "login" ? "default" : "outline"} aria-pressed={bookingMode === "login"} disabled={busy} onClick={() => onBookingModeChange("login")}>ログイン</Button><Button type="button" variant={bookingMode === "register" ? "default" : "outline"} aria-pressed={bookingMode === "register"} disabled={busy} onClick={() => onBookingModeChange("register")}>新規登録</Button></div>}
      <h1 className="px-5 pt-4 text-xl font-semibold">{bookingMode === "login" ? "ログイン" : "新規登録"}</h1>
      <p className="px-5 pb-3 pt-2 text-sm leading-6 text-muted-foreground">
        {bookingMode === "login" ? "メールアドレスまたはGoogleアカウントでログインしてください。" : "メールアドレスまたはGoogleアカウントで新規登録できます。"}
      </p>
      <div className="grid border-t @min-[640px]:grid-cols-2">
      <div className="min-w-0 @min-[640px]:border-r">
      {bookingMode === "login" && <div>
        <form
          className="grid gap-5 p-5 sm:p-6"
          onSubmit={loginForm.handleSubmit((values) => {
            onAccountEmailChange(values.email);
            onAccountPasswordChange(values.password);
            onLogin(values.email, values.password);
          })}
          noValidate
        >
          <h3 className="text-base font-semibold">メールアドレスでログイン</h3>
          <AuthField
            label="メールアドレス"
            error={loginForm.formState.errors.email?.message}
            icon={<Mail aria-hidden="true" />}
          >
            <Input
              type="email"
              autoComplete="email"
              {...loginForm.register("email", {
                onChange: (event) => onAccountEmailChange(event.target.value),
              })}
            />
          </AuthField>
          <AuthField
            label="パスワード"
            error={loginForm.formState.errors.password?.message}
            icon={<LockKeyhole aria-hidden="true" />}
          >
            <div className="relative">
              <Input
                className="pr-12"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...loginForm.register("password", {
                  onChange: (event) => onAccountPasswordChange(event.target.value),
                })}
              />
              <Button
                className="absolute right-0 top-0 size-11 sm:size-11"
                type="button"
                variant="ghost"
                size="icon"
                title={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </AuthField>
          {authError ? <Alert>{authError}</Alert> : null}
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="link"
              className="justify-start px-0 text-xs"
              disabled={busy}
              onClick={async () => {
                if (!(await loginForm.trigger("email", { shouldFocus: true }))) return;
                loginForm.clearErrors("password");
                onResetPassword(loginForm.getValues("email"));
              }}
            >
              パスワードをお忘れですか？
            </Button>
            <Button type="submit" className="sm:min-w-36" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" />}
              {busy ? "確認中" : "ログイン"}
            </Button>
          </div>
        </form>
      </div>}
      {bookingMode === "register" && <div>
        <form
          className="grid gap-4 p-5 sm:p-6"
          onSubmit={registerForm.handleSubmit((values) => {
            onAccountEmailChange(values.email);
            onAccountPasswordChange(values.password);
            onSubmitAccount(values.email, values.password, values);
          })}
          noValidate
        >
          <h3 className="text-base font-semibold">メールアドレスで登録</h3>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-medium sm:col-span-2">
              利用者区分
              <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                必須
              </span>
            </legend>
            <Button
              type="button"
              variant="outline"
              aria-pressed={!travelAgency}
              className={
                !travelAgency
                  ? "h-12 border-primary bg-primary/5 text-primary"
                  : "h-12"
              }
              onClick={() => selectAccountType("individual")}
            >
              <span>
                <strong>一般のお客様</strong>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-pressed={travelAgency}
              className={
                travelAgency
                  ? "h-12 border-primary bg-primary/5 text-primary"
                  : "h-12"
              }
              onClick={() => selectAccountType("travel_agency")}
            >
              <span>
                <strong>旅行会社の担当者様</strong>
              </span>
            </Button>
          </fieldset>
          <AuthField
            label="メールアドレス"
            required
            error={registerForm.formState.errors.email?.message}
          >
            <Input
              type="email"
              autoComplete="email"
              {...registerForm.register("email", {
                onChange: (event) => onAccountEmailChange(event.target.value),
              })}
            />
          </AuthField>
          <AuthField
            label="パスワード"
            required
            error={registerForm.formState.errors.password?.message}
          >
            <div className="relative">
              <Input
                className="pr-12"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...registerForm.register("password", {
                  onChange: (event) => onAccountPasswordChange(event.target.value),
                })}
              />
              <Button
                className="absolute right-0 top-0 size-11 sm:size-11"
                type="button"
                variant="ghost"
                size="icon"
                title={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </AuthField>
          {travelAgency ? (
            <>
              <AuthField
                label="会社・支店名"
                required
                error={registerForm.formState.errors.companyBranchName?.message}
              >
                <Input
                  {...registerForm.register("companyBranchName", {
                    onChange: (event) =>
                      onRegistrationFormChange((current) => ({
                        ...current,
                        name: event.target.value,
                        companyBranchName: event.target.value,
                      })),
                  })}
                />
              </AuthField>
              <AuthField
                label="担当者名"
                required
                error={registerForm.formState.errors.contactPersonName?.message}
              >
                <Input
                  {...registerForm.register("contactPersonName", {
                    onChange: (event) =>
                      onRegistrationFormChange((current) => ({
                        ...current,
                        contactPersonName: event.target.value,
                        bookingContactName: event.target.value,
                      })),
                  })}
                />
              </AuthField>
            </>
          ) : (
            <AuthField
              label="お名前"
              required
              error={registerForm.formState.errors.name?.message}
            >
              <Input
                autoComplete="name"
                {...registerForm.register("name", {
                  onChange: (event) =>
                    onRegistrationFormChange((current) => ({
                      ...current,
                      name: event.target.value,
                    })),
                })}
              />
            </AuthField>
          )}
          <AuthField
            label="電話番号"
            required
            error={registerForm.formState.errors.phone?.message}
          >
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              {...registerForm.register("phone", {
                onChange: (event) =>
                  onRegistrationFormChange((current) => ({
                    ...current,
                    phone: event.target.value,
                  })),
              })}
            />
          </AuthField>
          <AuthField
            label="住所"
            error={registerForm.formState.errors.address?.message}
          >
            <Input
              autoComplete="street-address"
              {...registerForm.register("address", {
                onChange: (event) =>
                  onRegistrationFormChange((current) => ({
                    ...current,
                    address: event.target.value,
                  })),
              })}
            />
          </AuthField>
          {authError ? <Alert>{authError}</Alert> : null}
          <Button type="submit" className="mt-1 w-full" disabled={busy}>
            {busy && <LoaderCircle className="animate-spin" />}
            {busy ? "登録中" : "アカウントを登録"}
          </Button>
        </form>
      </div>}
      </div>
      <section className="order-first grid min-w-0 content-start gap-4 border-b p-5 sm:p-6 @min-[640px]:order-last @min-[640px]:border-b-0" aria-label={bookingMode === "login" ? "Googleアカウントでログイン" : "Googleアカウントで登録"}>
        <h3 className="text-base font-semibold">{bookingMode === "login" ? "Googleアカウントでログイン" : "Googleアカウントで登録"}</h3>
        <GoogleCustomerButton registration={bookingMode === "register"} />
        <p className="text-sm leading-6 text-muted-foreground">{bookingMode === "login" ? "Googleアカウントを選択してログインできます。" : "Googleで認証した後、お客様情報を登録します。パスワードの入力は不要です。"}</p>
      </section>
      </div>
      {!inline && <div className="border-t p-5 text-sm sm:p-6">
        {bookingMode === "login" ? <p>アカウントをお持ちでない方は、<CustomerAuthLink href="/register" className="font-semibold text-primary underline underline-offset-4">新規登録へ</CustomerAuthLink></p> : <p>すでにアカウントをお持ちの方は、<CustomerAuthLink href="/login" className="font-semibold text-primary underline underline-offset-4">ログインへ</CustomerAuthLink></p>}
        {bookingMode === "login" && <div className="mt-4 border-t border-border pt-4">
          <Link href="/contact" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">ログインせずにお問い合わせ</Link>
          <p className="text-sm leading-6 text-muted-foreground">空き状況やその他のご質問は、ログインせずにお問い合わせいただけます。</p>
        </div>}
      </div>}
    </section>
  );
}


function AuthField({
  label,
  required,
  error,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <FormField label={label} required={required} error={error}>
      <div
        className={`relative [&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-1/2 [&>svg]:size-4 [&>svg]:-translate-y-1/2 [&>svg]:text-muted-foreground [&>svg+input]:pl-10 ${error ? "[&_input]:border-destructive" : ""}`}
      >
        {icon}
        {children}
      </div>
    </FormField>
  );
}


function CustomerReservationDashboard({
  getCustomerToken,
  customerIdentity,
  customerEmail,
  isLoggedIn,
  authError,
  accountEmail,
  accountPassword,
  accountSubmitting,
  customerAuthLoading,
  bookingMode,
  registrationForm,
  reservations,
  inquiryCounts,
  changeRequests,
  isLoading,
  reservationError,
  canRequestConfirmedChange,
  canRequestChange,
  canRequestCancellation,
  onBack,
  onBookingModeChange,
  onRegistrationFormChange,
  onAccountEmailChange,
  onAccountPasswordChange,
  onLogin,
  onSubmitAccount,
  onResetPassword,
  onLogout,
  onConfirmedChange,
  onChange,
  onCancellation,
  onReconfirmChange,
}: {
  getCustomerToken: () => Promise<string>;
  customerIdentity: string;
  customerEmail: string;
  isLoggedIn: boolean;
  authError: string;
  accountEmail: string;
  accountPassword: string;
  accountSubmitting: boolean;
  customerAuthLoading: boolean;
  bookingMode: "login" | "register";
  registrationForm: BookingForm;
  reservations: Reservation[];
  inquiryCounts: Record<string, number> | null;
  changeRequests: ReservationChangeRequest[];
  isLoading: boolean;
  reservationError: string;
  canRequestConfirmedChange: (reservation: Reservation) => boolean;
  canRequestChange: (reservation: Reservation) => boolean;
  canRequestCancellation: (reservation: Reservation) => boolean;
  onBack: () => void;
  onBookingModeChange: (mode: "login" | "register") => void;
  onRegistrationFormChange: Dispatch<SetStateAction<BookingForm>>;
  onAccountEmailChange: (value: string) => void;
  onAccountPasswordChange: (value: string) => void;
  onLogin: (email?: string, password?: string) => void;
  onSubmitAccount: (email?: string, password?: string, profile?: RegisterAuthFields) => void;
  onResetPassword: (email: string) => void;
  onLogout: () => void;
  onConfirmedChange: (reservation: Reservation) => void;
  onChange: (reservation: Reservation) => void;
  onCancellation: (reservation: Reservation) => void;
  onReconfirmChange: (request: ReservationChangeRequest) => void;
}) {
  return (
    <>
      <div className="p-4 text-sm sm:p-5" onClickCapture={event => {
        if ((event.target as HTMLElement).closest('a[href^="/contact?reservation="]')) {
          try { sessionStorage.setItem(`customer-reservation-position:${customerIdentity}`, JSON.stringify({ page: 1, scroll: window.scrollY })); } catch { /* Navigation also works when storage is unavailable. */ }
        }
      }}>
        <header className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold">予約確認</h1>
        {isLoggedIn ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">ログイン中</span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{customerEmail}</span>
            <Button type="button" variant="ghost" className="min-h-11 px-2 text-xs" onClick={onLogout}>
              ログアウト
            </Button>
          </div>
        ) : (
          <section className="customer-account-panel">
            <CustomerAccountAccessPanel
              authError={authError}
              accountEmail={accountEmail}
              accountPassword={accountPassword}
              accountSubmitting={accountSubmitting}
              customerAuthLoading={customerAuthLoading}
              bookingMode={bookingMode}
              registrationForm={registrationForm}
              onBookingModeChange={onBookingModeChange}
              onRegistrationFormChange={onRegistrationFormChange}
              onAccountEmailChange={onAccountEmailChange}
              onAccountPasswordChange={onAccountPasswordChange}
              onLogin={onLogin}
              onSubmitAccount={onSubmitAccount}
              onResetPassword={onResetPassword}
            />
          </section>
        )}
        </header>
        {isLoggedIn &&
          (isLoading ? (
            <div className="empty-table compact">
              予約情報を読み込んでいます。
            </div>
          ) : reservationError ? (
            <div className="auth-error">{reservationError}</div>
          ) : reservations.length ? (
            <div className="grid gap-2">
              {reservations.map((reservation) => (
                <article
                  key={reservation.id}
                  className="grid min-w-0 gap-2 rounded-lg border border-border bg-card p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                      className={"badge " + statusClass[reservation.status]}
                    >
                      <i />
                      {reservationDisplayLabel(reservation)}
                    </span>
                    <h2 className="text-base font-semibold [overflow-wrap:anywhere]">{reservationDateTimeLabel(reservation)}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-xs text-muted-foreground">予約ID：{reservation.id}</p>
                      <CustomerReservationDetails reservation={reservation} />
                    </div>
                  </div>
                  {reservation.bookingType === "travel_agency_group" && reservation.groupName && <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{reservation.groupName}</p>}
                  <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 gap-y-1">
                    <div className="flex min-w-0 items-baseline gap-2"><dt className="text-xs text-muted-foreground">人数</dt><dd className="text-base font-semibold tabular-nums">{reservation.people}<span className="ml-0.5 text-sm">名</span></dd></div>
                    <div className="flex min-w-0 items-baseline gap-2"><dt className="shrink-0 text-xs text-muted-foreground">メニュー</dt><dd className="min-w-0 whitespace-pre-wrap font-semibold leading-5 [overflow-wrap:anywhere]">{reservationMenuLabel(reservation)}</dd></div>
                  </dl>
                  <CustomerReservationRequestStatus
                    reservation={reservation}
                    changeRequests={changeRequests.filter(
                      (request) => request.reservationId === reservation.id,
                    )}
                  />
                  {canRequestChange(reservation) && changeRequests.filter(item => item.reservationId === reservation.id).map(item => <ReservationFeeReconfirmation key={item.id} reservation={reservation} request={item} onReconfirm={onReconfirmChange} />)}
                  <ReservationActionButtons
                    reservation={reservation}
                    historyAction={<ReservationInquiryHistoryButton key={`${customerIdentity}:${reservation.id}`} reservationNumber={reservation.id} audience="customer" getToken={getCustomerToken} disabled={!inquiryCounts || !(inquiryCounts[reservation.id] > 0)} disabledReason={!inquiryCounts ? "履歴を確認できません。予約一覧を開き直してください。" : !inquiryCounts[reservation.id] ? "問い合わせ履歴はありません。" : undefined} className="h-auto min-h-11 whitespace-normal px-3 py-2" />}
                    canRequestConfirmedChange={canRequestConfirmedChange}
                    canRequestChange={canRequestChange}
                    canRequestCancellation={canRequestCancellation}
                    onConfirmedChange={onConfirmedChange}
                    onChange={onChange}
                    onCancellation={onCancellation}
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-table compact">
              表示できる予約はありません。
            </div>
          ))}
      </div>
      <CustomerPageActions onBack={onBack} wide />
    </>
  );
}


function CustomerReservationRequestStatus({
  reservation,
  changeRequests,
}: {
  reservation: Reservation;
  changeRequests: ReservationChangeRequest[];
}) {
  const items: { label: string; status: string; detail?: string }[] = [
    ...(isConfirmedReservationChangeRequest(reservation)
      ? [{ label: "本予約への変更申請", status: "承認待ち" }]
      : []),
    ...(reservation.status === STATUS.cancellationRequested
      ? [{ label: "キャンセル申請", status: "承認待ち" }]
      : []),
    ...(reservation.status === STATUS.cancelled
      ? [{ label: "キャンセル申請", status: "承認済み" }]
      : []),
    ...changeRequests.map((request) => ({
      label: "予約内容変更申請",
      status: changeRequestStatusLabel(request.status),
      detail: `${request.requestedDate} ${request.requestedStartTime}・${request.requestedPeople}名`,
    })),
  ];
  if (!items.length) return null;
  return (
    <div className="customer-request-status-list">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          <span>{item.label}</span>
          <strong>{item.status}</strong>
          {item.detail ? <small>{item.detail}</small> : null}
        </div>
      ))}
    </div>
  );
}


function changeRequestStatusLabel(status: ReservationChangeRequest["status"]) {
  if (status === "approved") return "承認済み";
  if (status === "rejected") return "却下済み";
  return "承認待ち";
}


function ReservationActionButtons({
  reservation,
  historyAction,
  canRequestConfirmedChange,
  canRequestChange,
  canRequestCancellation,
  onConfirmedChange,
  onChange,
  onCancellation,
}: {
  reservation: Reservation;
  historyAction: ReactNode;
  canRequestConfirmedChange: (reservation: Reservation) => boolean;
  canRequestChange: (reservation: Reservation) => boolean;
  canRequestCancellation: (reservation: Reservation) => boolean;
  onConfirmedChange: (reservation: Reservation) => void;
  onChange: (reservation: Reservation) => void;
  onCancellation: (reservation: Reservation) => void;
}) {
  return (
    <div className="col-span-full flex flex-wrap justify-end gap-2 border-t border-border pt-2">
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        {historyAction}
        <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal px-3 py-2"><Link href={`/contact?reservation=${encodeURIComponent(reservation.id)}`}>この予約について問い合わせる</Link></Button>
      </div>
      <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
      <Button
        type="button" variant="outline" className="min-h-11"
        disabled={!canRequestConfirmedChange(reservation)}
        onClick={() => onConfirmedChange(reservation)}
      >
        本予約への変更申請
      </Button>
      <Button
        type="button" variant="outline" className="min-h-11"
        disabled={!canRequestChange(reservation)}
        onClick={() => onChange(reservation)}
      >
        予約内容変更申請
      </Button>
      <Button
        type="button" variant="outline" className="min-h-11"
        disabled={!canRequestCancellation(reservation)}
        onClick={() => onCancellation(reservation)}
      >
        キャンセル申請
      </Button>
      </div>
    </div>
  );
}


function CustomerRequestForms({
  mode,
  confirmedChangeForm,
  changeRequestForm,
  changeReservation,
  changeRequests,
  cancellationReservation,
  confirmedChangeSubmitted,
  changeRequestSubmitted,
  cancellationSubmitted,
  isSubmittingConfirmedChange,
  isSubmittingChangeRequest,
  isSubmittingCancellation,
  canSubmitConfirmedChange,
  canSubmitChangeRequest,
  canSubmitCancellation,
  menuCatalog,
  menuState,
  onBack,
  onComplete,
  onConfirmedChangeFormChange,
  onChangeRequestFormChange,
  onSubmitConfirmedChange,
  onSubmitChangeRequest,
  onSubmitCancellation,
}: {
  mode: CustomerPortalMode;
  confirmedChangeForm: CustomerContactRequestForm;
  changeRequestForm: CustomerReservationChangeRequestForm;
  changeReservation?: Reservation;
  changeRequests: ReservationChangeRequest[];
  cancellationReservation?: Reservation;
  confirmedChangeSubmitted: boolean;
  changeRequestSubmitted: boolean;
  cancellationSubmitted: boolean;
  isSubmittingConfirmedChange: boolean;
  isSubmittingChangeRequest: boolean;
  isSubmittingCancellation: boolean;
  canSubmitConfirmedChange: boolean;
  canSubmitChangeRequest: boolean;
  canSubmitCancellation: boolean;
  menuCatalog: Menu[];
  menuState?: Pick<ComponentProps<typeof MenuPicker>, "loading" | "error" | "onRetry">;
  onBack: () => void;
  onComplete: () => void;
  onConfirmedChangeFormChange: Dispatch<
    SetStateAction<CustomerContactRequestForm>
  >;
  onChangeRequestFormChange: Dispatch<
    SetStateAction<CustomerReservationChangeRequestForm>
  >;
  onSubmitConfirmedChange: (agreement: CancellationPolicyAgreementInput) => void | Promise<void>;
  onSubmitChangeRequest: (acknowledged?: boolean) => void | Promise<void>;
  onSubmitCancellation: (acknowledged?: boolean) => void | Promise<void>;
}) {
  if (mode === "confirmedChange")
    return (
      <CustomerConfirmedChangeForm
        form={confirmedChangeForm}
        submitted={confirmedChangeSubmitted}
        isSubmitting={isSubmittingConfirmedChange}
        canSubmit={canSubmitConfirmedChange}
        onBack={onBack}
        onComplete={onComplete}
        onFormChange={onConfirmedChangeFormChange}
        onSubmit={onSubmitConfirmedChange}
      />
    );
  if (mode === "change")
    return (
      <CustomerChangeRequestForm
        form={changeRequestForm}
        reservation={changeReservation}
        changeRequests={changeRequests}
        submitted={changeRequestSubmitted}
        isSubmitting={isSubmittingChangeRequest}
        canSubmit={canSubmitChangeRequest}
        menuCatalog={menuCatalog}
        menuState={menuState}
        onBack={onBack}
        onComplete={onComplete}
        onFormChange={onChangeRequestFormChange}
        onSubmit={onSubmitChangeRequest}
      />
    );
  if (mode === "cancellation")
    return (
      <CustomerCancellationForm
        reservation={cancellationReservation}
        submitted={cancellationSubmitted}
        isSubmitting={isSubmittingCancellation}
        canSubmit={canSubmitCancellation}
        onBack={onBack}
        onComplete={onComplete}
        onSubmit={onSubmitCancellation}
      />
    );
  return null;
}


function CustomerConfirmedChangeForm({
  form,
  submitted,
  isSubmitting,
  canSubmit,
  onBack,
  onComplete,
  onFormChange,
  onSubmit,
}: {
  form: CustomerContactRequestForm;
  submitted: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  onBack: () => void;
  onComplete: () => void;
  onFormChange: Dispatch<SetStateAction<CustomerContactRequestForm>>;
  onSubmit: (agreement: CancellationPolicyAgreementInput) => void | Promise<void>;
}) {
  const [accepted, setAccepted] = useState(false);
  const initialConfirmedForm = useRef(JSON.stringify(form));
  useEffect(() => setAccepted(false), [form.reservationId]);
  return (
    <>
      {submitted ? (
        <CustomerRequestComplete
          title="本予約への変更申請を受け付けました"
          message="内容を確認後、本予約への変更可否をご連絡します。"
          onBack={onComplete}
        />
      ) : (
        <div className="form-body narrow cancellation-form">
          <h1>本予約への変更申請</h1>
          <CustomerContactRequestFields
            form={form}
            onFormChange={onFormChange}
          />
          <CancellationPolicyAgreement checked={accepted} onChange={setAccepted} disabled={isSubmitting} />
          <CustomerPageActions onBack={onBack} backLabel="予約一覧へ戻る" busy={isSubmitting} dirty={accepted || JSON.stringify(form) !== initialConfirmedForm.current}>
            <Button type="button" disabled={!canSubmit || !accepted || isSubmitting} onClick={() => { if (accepted) void onSubmit({ accepted: true, version: cancellationPolicyVersion }); }}>
              {isSubmitting ? "送信中" : "本予約への変更を申請する"}{" "}
              <Icon name="arrow" />
            </Button>
          </CustomerPageActions>
        </div>
      )}
    </>
  );
}


function CustomerChangeRequestForm({
  form,
  reservation,
  changeRequests,
  submitted,
  isSubmitting,
  canSubmit,
  menuCatalog,
  menuState,
  onBack,
  onComplete,
  onFormChange,
  onSubmit,
}: {
  form: CustomerReservationChangeRequestForm;
  reservation?: Reservation;
  changeRequests: ReservationChangeRequest[];
  submitted: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  menuCatalog: Menu[];
  menuState?: Pick<ComponentProps<typeof MenuPicker>, "loading" | "error" | "onRetry">;
  onBack: () => void;
  onComplete: () => void;
  onFormChange: Dispatch<SetStateAction<CustomerReservationChangeRequestForm>>;
  onSubmit: (acknowledged?: boolean) => void | Promise<void>;
}) {
  const initialForm = useRef(JSON.stringify(form));
  const versionBooking = useRef("");
  const selectedBookingId = reservation?.id, selectedBookingRevision = reservation?.revision ?? 0;
  useEffect(() => {
    if (!selectedBookingId) { versionBooking.current = ""; return; }
    if (versionBooking.current !== selectedBookingId) {
      versionBooking.current = selectedBookingId;
      onFormChange(current => ({ ...current, expectedRevision: selectedBookingRevision }));
    }
  }, [selectedBookingId, selectedBookingRevision, onFormChange]);
  const {policy,error:policyError}=useReservationPolicy();
  const notice = reservation ? cancellationFeeNotice(reservation, form.requestedPeople) : null;
  const peopleOnly = reservation ? isFeeExemptPeopleOnlyChange({ ...reservation, menuItems: reservation.menuItems ?? [] }, form) : false;
  const minimumDate = peopleOnly ? earliestReservationDate(1) : policy?.minimumDate;
  const pendingRequest = changeRequests.find(item => matchesPendingReservationChange(item, form));
  const dateBlocked = !policy || !reservation || !minimumDate || !form.requestedDate || (!pendingRequest && (form.requestedDate < minimumDate || reservation.date < minimumDate));
  return (
    <>
      {submitted ? (
        <CustomerRequestComplete
          title="予約内容変更申請を受け付けました"
          message="内容を確認後、変更可否をご連絡します。"
          onBack={onComplete}
        />
      ) : (
        <div className="form-body narrow cancellation-form">
          <h1>予約内容変更申請</h1>
          <CustomerContactRequestFields
            form={form}
            onFormChange={onFormChange}
          />
          {policyError && <p role="alert" className="text-sm text-destructive">{policyError}</p>}
          {policy && <p className="text-sm text-muted-foreground">キャンセル料の対象外で、人数だけを変更する場合は前日まで申請できます。その他の変更は、変更前・変更後とも利用日の{policy.days}日前までに申請してください。</p>}
          {!reservation && <p role="alert" className="text-sm text-destructive">変更対象の予約を確認できません。予約IDを確認してください。</p>}
          {reservation && form.requestedDate && minimumDate && dateBlocked && <p role="alert" className="text-sm text-destructive">この変更は変更前・変更後とも利用日が{minimumDate}以降の場合に申請できます。</p>}
          <div className="form-fields reservation-date-fields">
            <label>
              変更希望日
              <input
                type="date"
                min={pendingRequest ? undefined : minimumDate}
                aria-invalid={Boolean(form.requestedDate && dateBlocked)}
                value={form.requestedDate}
                onChange={(event) =>
                  onFormChange({ ...form, requestedDate: event.target.value })
                }
              />
            </label>
            <label>
              開始時間
              <input
                type="time"
                value={form.requestedStartTime}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    requestedStartTime: event.target.value,
                  })
                }
              />
            </label>
            <label>
              人数
              <Input type="number" min={1} max={999} step={1} inputMode="numeric" value={form.requestedPeople || ""} aria-invalid={!Number.isInteger(form.requestedPeople) || form.requestedPeople < 1 || form.requestedPeople > 999} onChange={event => onFormChange({ ...form, requestedPeople: Number(event.target.value) })} />
              {(!Number.isInteger(form.requestedPeople) || form.requestedPeople < 1 || form.requestedPeople > 999) && <span role="alert" className="text-sm text-destructive">人数は1〜999名の整数で入力してください。</span>}
            </label>
          </div>
          <MenuPicker
            menuCatalog={menuCatalog}
          {...menuState}
            selected={form.requestedMenuItems}
            onChange={(requestedMenuItems) =>
              onFormChange({ ...form, requestedMenuItems })
            }
          />
          <div className="form-fields single">
            <label>
              変更理由
              <textarea
                value={form.reason}
                onChange={(event) =>
                  onFormChange({ ...form, reason: event.target.value })
                }
              />
            </label>
          </div>
          {pendingRequest && notice && <p className="mt-3 text-sm text-muted-foreground">受付済みの変更内容です。案内を確認して申請すると、この申請の確認記録を更新します。</p>}
          <CustomerRequestSubmit key={JSON.stringify(form)} notice={notice} disabled={!canSubmit || dateBlocked || !Number.isInteger(form.requestedPeople) || form.requestedPeople < 1 || form.requestedPeople > 999} isSubmitting={isSubmitting} onSubmit={onSubmit} onBack={onBack} dirty={JSON.stringify(form) !== initialForm.current} />
        </div>
      )}
    </>
  );
}


function CustomerCancellationForm({
  reservation,
  submitted,
  isSubmitting,
  canSubmit,
  onBack,
  onComplete,
  onSubmit,
}: {
  reservation?: Reservation;
  submitted: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  onBack: () => void;
  onComplete: () => void;
  onSubmit: (acknowledged?: boolean) => void | Promise<void>;
}) {
  return (
    <>
      {submitted ? (
        <CustomerRequestComplete
          title="キャンセル申請を受け付けました"
          message="内容を確認後、キャンセル可否をご連絡します。"
          onBack={onComplete}
        />
      ) : (
        <div className="form-body narrow cancellation-form">
          <h1>キャンセル申請</h1>
          {reservation ? (
            <section className="mt-6" aria-label="ご予約内容">
              <h3 className="text-base font-semibold">ご予約内容</h3>
              <dl className="mt-3 divide-y divide-border rounded-md border border-border px-4">
                {[
                  ["予約ID", reservation.id],
                  ["予約区分", reservationBookingTypeLabel(reservation)],
                  ["お客様名", reservation.customer],
                  ["利用日時", reservationDateTimeLabel(reservation)],
                  ["予定人数", `${reservation.people}名`],
                  ["メニュー", reservationMenuLabel(reservation)],
                  ["予約状況", reservationDisplayLabel(reservation)],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3 text-sm">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="break-words font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : (
            <p role="alert" className="mt-6 text-sm text-destructive">キャンセル対象の予約を確認できません。予約一覧から対象の予約を選び直してください。</p>
          )}
          <CustomerRequestSubmit key={reservation?.id} cancellation notice={reservation ? cancellationFeeNotice(reservation) : null} disabled={!canSubmit || !reservation || isSubmitting} isSubmitting={isSubmitting} onSubmit={onSubmit} onBack={onBack} />
        </div>
      )}
    </>
  );
}


function CustomerContactRequestFields<T extends CustomerContactRequestForm>({
  form,
  onFormChange,
}: {
  form: T;
  onFormChange: Dispatch<SetStateAction<T>>;
}) {
  return (
    <div className="form-fields single">
      <label>
        予約ID
        <input
          value={form.reservationId}
          placeholder="例: RSV-1047"
          onChange={(event) =>
            onFormChange({ ...form, reservationId: event.target.value })
          }
        />
      </label>
    </div>
  );
}


function CustomerRequestComplete({
  title,
  message,
  onBack,
}: {
  title: string;
  message: string;
  onBack: () => void;
}) {
  return (
    <div className="form-body complete">
      <span>
        <Icon name="check" />
      </span>
      <h1>{title}</h1>
      <p>{message}</p>
      <CustomerPageActions onBack={onBack} />
    </div>
  );
}


function CustomerEmailVerificationPanel({
  email,
  isSubmitting,
  onRefresh,
  onResend,
  onLogout,
}: {
  email: string;
  isSubmitting: boolean;
  onRefresh: () => void;
  onResend: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="form-body narrow email-verification-panel">
      <h2>メールアドレスを確認してください</h2>
      <p>
        <strong>{email}</strong>{" "}
        に確認メールを送信しました。メール内のリンクを開いて認証を完了してください。
      </p>
      <div className="email-verification-actions">
        <button type="button" onClick={onResend} disabled={isSubmitting}>
          確認メールを再送
        </button>
        <button
          type="button"
          className="next"
          onClick={onRefresh}
          disabled={isSubmitting}
        >
          {isSubmitting ? "確認中" : "認証を確認"}
        </button>
      </div>
      <button
        type="button"
        className="email-verification-logout"
        onClick={onLogout}
      >
        別のアカウントでログイン
      </button>
    </div>
  );
}

type CustomerContactRequestForm = {
  reservationId: string;
  email: string;
  phone: string;
};

type CustomerReservationChangeRequestForm = CustomerContactRequestForm & {
  expectedRevision?: number;
  requestedDate: string;
  requestedStartTime: string;
  requestedPeople: number;
  requestedMenuItems: string[];
  reason: string;
};


function CustomerPortal({
  initialMode,
  onModeChange,
  form,
  setForm,
  step,
  setStep,
  onAdmin,
  notify,
  onSubmitReservation,
  onSubmitCancellation,
  onSubmitConfirmedReservationChange,
  onSubmitChangeRequest,
  menuCatalog,
  menuLoading = false,
  menuError = "",
  onRetryMenus,
}: {
  initialMode: CustomerPortalMode;
  onModeChange?: (mode: CustomerPortalMode) => void;
  form: BookingForm;
  setForm: Dispatch<SetStateAction<BookingForm>>;
  step: number;
  setStep: (n: number) => void;
  onAdmin: () => void;
  notify: (s: string, variant?: "success" | "error" | "info") => void;
  onSubmitReservation: (
    form: BookingForm,
    options?: ReservationSubmitOptions,
  ) => Promise<Reservation>;
  onSubmitCancellation: (
    input: { reservationId: string; email?: string; phone?: string; cancellationPolicyAgreement?: CancellationPolicyAgreementInput; cancellationFeeAcknowledged?: boolean },
    options?: { authToken?: string },
  ) => Promise<Reservation>;
  onSubmitConfirmedReservationChange: (
    input: { reservationId: string; email?: string; phone?: string; cancellationPolicyAgreement?: CancellationPolicyAgreementInput; cancellationFeeAcknowledged?: boolean },
    options?: { authToken?: string },
  ) => Promise<Reservation>;
  onSubmitChangeRequest: (
    input: {
      reservationId: string;
      email?: string;
      phone?: string;
      requestedDate: string;
      requestedStartTime: string;
      requestedPeople: number;
      requestedMenuItems: string[];
      reason?: string;
      cancellationFeeAcknowledged?: boolean;
      cancellationFeeContext?: string | null;
      expectedRevision?: number;
    },
    options?: { authToken?: string },
  ) => Promise<ReservationChangeRequest>;
  menuCatalog: Menu[];
  menuLoading?: boolean;
  menuError?: string;
  onRetryMenus?: () => void;
}) {
  const {
    customerUser,
    customerAuthLoading,
    customerAuthError,
    loginCustomer,
    registerCustomer,
    resendVerificationEmail,
    refreshEmailVerification,
    resetCustomerPassword,
    requestCustomerEmailChange,
    reauthenticateCustomer,
    signOutCustomer,
  } = useCustomerSession();
  const [portalMode, setPortalMode] = useState<CustomerPortalMode>(initialMode);
  const portalMain = useRef<HTMLElement>(null);
  const previousScreen = useRef(`${portalMode}:${step}`);
  useEffect(() => {
    const screen = `${portalMode}:${step}`;
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    const frame = requestAnimationFrame(() => {
      const heading = portalMain.current?.querySelector<HTMLElement>("h1");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [portalMode, step]);
  const bookingCategoryChosen = useRef(false);
  const reservationMode = useRef(portalMode === "reservation");
  reservationMode.current = portalMode === "reservation" && (step > 1 || bookingCategoryChosen.current);
  const [bookingProfileState, setBookingProfileState] = useState({ editing: false, dirty: false, busy: false });
  const appliedInitialMode = useRef<CustomerPortalMode | null>(null);
  const {policy,error:policyError}=useReservationPolicy(portalMode === "reservation");
  const dateBlocked=!policy || !form.date || form.date < policy.minimumDate;
  useEffect(()=>onModeChange?.(portalMode),[portalMode,onModeChange]);
  const [bookingMode, setBookingMode] = useState<"login" | "register">(initialMode === "register" ? "register" : "login");
  const [accountEmail, setAccountEmail] = useState(form.email);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const [submittedReservation, setSubmittedReservation] = useState<Reservation | null>(null);
  const reservationListScroll = useRef(0), restoreReservationList = useRef(false);
  const activeCustomerUid = useRef(customerUser?.uid);
  activeCustomerUid.current = customerUser?.uid;
  const reservationSubmission = useRef(false);
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const [emailChangeMessage, setEmailChangeMessage] = useState("");
  const [emailChangeFailed, setEmailChangeFailed] = useState(false);
  const [contactVerificationStatus, setContactVerificationStatus] = useState<"verified" | "invalid" | null>(null);
  const [customerAccount, setCustomerAccount] = useState<Customer | null>(null);
  const [customerAccountLoading, setCustomerAccountLoading] = useState(true);
  const [accountLoadError, setAccountLoadError] = useState("");
  const [accountReloadVersion, setAccountReloadVersion] = useState(0);
  const [contactEmails, setContactEmails] = useState<AccountContactEmail[]>([]);
  const [cancellationForm, setCancellationForm] = useState({
    reservationId: "",
    email: "",
    phone: "",
  });
  const [isSubmittingCancellation, setIsSubmittingCancellation] =
    useState(false);
  const [cancellationSubmitted, setCancellationSubmitted] = useState(false);
  const [confirmedChangeForm, setConfirmedChangeForm] = useState({
    reservationId: "",
    email: "",
    phone: "",
  });
  const [isSubmittingConfirmedChange, setIsSubmittingConfirmedChange] =
    useState(false);
  const [confirmedChangeSubmitted, setConfirmedChangeSubmitted] =
    useState(false);
  const [changeRequestForm, setChangeRequestForm] = useState<CustomerReservationChangeRequestForm>({
    reservationId: "",
    email: "",
    phone: "",
    requestedDate: form.date,
    requestedStartTime: form.startTime,
    requestedPeople: form.people,
    requestedMenuItems: form.menuItems,
    reason: "",
  });
  const [isSubmittingChangeRequest, setIsSubmittingChangeRequest] =
    useState(false);
  const [changeRequestSubmitted, setChangeRequestSubmitted] = useState(false);
  const [accountInquiryCounts, setAccountInquiryCounts] = useState<Record<string, number> | null>(null);
  const [accountReservations, setAccountReservations] = useState<Reservation[]>(
    [],
  );
  const [accountChangeRequests, setAccountChangeRequests] = useState<
    ReservationChangeRequest[]
  >([]);
  const [isLoadingAccountReservations, setIsLoadingAccountReservations] =
    useState(false);
  const [accountReservationError, setAccountReservationError] = useState("");
  const previousCustomerUid = useRef<string | null>(null);
  useEffect(() => {
    if (customerAuthLoading) return;
    const uid = customerUser?.uid ?? null;
    if (previousCustomerUid.current !== uid) {
      if (previousCustomerUid.current) {
        bookingCategoryChosen.current = false;
        setForm(emptyReservationForm(STATUS.temporaryRequested));
        setStep(1);
        setAccountEmail("");
        setAccountPassword("");
        setEmailChangeMessage("");
        setSubmittedReservation(null);
        setCancellationForm({ reservationId: "", email: "", phone: "" });
        setConfirmedChangeForm({ reservationId: "", email: "", phone: "" });
        setChangeRequestForm({ reservationId: "", email: "", phone: "", requestedDate: "", requestedStartTime: "", requestedPeople: 0, requestedMenuItems: [], reason: "" });
        setCancellationSubmitted(false);
        setConfirmedChangeSubmitted(false);
        setChangeRequestSubmitted(false);
      }
      setAccountReservations([]); setAccountInquiryCounts(null);
      setAccountChangeRequests([]);
      setCustomerAccount(null);
      setContactEmails([]);
      setIsLoadingAccountReservations(false);
      previousCustomerUid.current = uid;
    }
  }, [customerUser?.uid, customerAuthLoading, setForm, setStep]);
  const consentMenuKey = form.menuItems.join("\u0000");
  useEffect(() => {
    setForm(current => current.cancellationPolicyAgreement ? { ...current, cancellationPolicyAgreement: undefined } : current);
  }, [form.date, form.startTime, form.people, form.status, consentMenuKey, customerUser?.uid, setForm]);
  const total = selectedMenuTotal(form.menuItems, menuCatalog);
  const missingBookingFields = [
    !form.name && (isGroupBooking(form) ? "会社・支店名" : "お名前"),
    !form.phone && "電話番号", !form.email && "メールアドレス",
    ...(isGroupBooking(form) ? [!form.companyBranchName && "会社・支店名", !form.bookingContactName && "予約担当者名", !form.dayContactName && "当日責任者名", !form.dayContactPhone && "当日責任者携帯番号", !form.groupName && "団体名", !form.groupType && "団体種別"] : []),
  ].filter((label): label is string => Boolean(label));
  const groupReady =
    !isGroupBooking(form) ||
    Boolean(
      form.companyBranchName &&
      form.bookingContactName &&
      form.dayContactName &&
      form.dayContactPhone &&
      form.groupName &&
      form.groupType,
    );
  const requiresConfirmedPolicy = form.status === STATUS.confirmedRequested;
  const confirmedPolicyReady = !requiresConfirmedPolicy || (form.cancellationPolicyAgreement?.accepted === true && form.cancellationPolicyAgreement.version === cancellationPolicyVersion);
  const canSubmit = Boolean(customerUser?.emailVerified) && !customerAccountLoading && !accountLoadError && isAccountProfileComplete(customerAccount) && !dateBlocked && !isSubmittingReservation && Boolean(
    form.name &&
    form.email &&
    form.phone &&
    form.date &&
    form.startTime &&
    form.people &&
    groupReady,
  );
  const canSubmitCancellation =
    Boolean(customerUser && accountReservations.some((reservation) => reservation.id === cancellationForm.reservationId)) &&
    !isSubmittingCancellation;
  const canSubmitConfirmedChange =
    Boolean(customerUser && confirmedChangeForm.reservationId.trim()) &&
    !isSubmittingConfirmedChange;
  const canSubmitChangeRequest =
    Boolean(
      customerUser &&
      changeRequestForm.reservationId.trim() &&
      changeRequestForm.requestedDate &&
      changeRequestForm.requestedStartTime &&
      changeRequestForm.requestedPeople,
    ) && !isSubmittingChangeRequest;

  useEffect(() => {
    // Strict Mode replays mount effects; do not undo a confirmation-link navigation on replay.
    if (appliedInitialMode.current === initialMode) return;
    appliedInitialMode.current = initialMode;
    setPortalMode(initialMode);
    if (initialMode === "login" || initialMode === "register") setBookingMode(initialMode);
    if (initialMode === "reservation") setStep(1);
  }, [initialMode, setStep]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (portalMode === "login" || portalMode === "register") {
      url.pathname = `/${portalMode}`;
      url.searchParams.delete("customerMode");
    } else {
      url.pathname = "/";
      url.searchParams.set("customerMode", portalMode);
    }
    window.history.replaceState(null, "", url);
  }, [portalMode]);

  useEffect(() => {
    if (initialMode !== "account" || !customerUser) return;
    try {
      const position = parseCustomerListPosition(sessionStorage.getItem(`customer-reservation-position:${customerUser.uid}`));
      reservationListScroll.current = position.scroll; restoreReservationList.current = true;
    } catch { /* A direct visit without storage starts at the top. */ }
  }, [initialMode, customerUser]);

  useEffect(() => {
    const restore = portalMode === "account" && restoreReservationList.current;
    if (restore && isLoadingAccountReservations) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: restore ? reservationListScroll.current : 0, behavior: "instant" });
      if (restore) restoreReservationList.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [portalMode, isLoadingAccountReservations, customerUser]);
  useEffect(() => { if (portalMode === "reservation") window.scrollTo({ top: 0, behavior: "instant" }); }, [portalMode, step]);

  useEffect(() => {
    if (!customerAuthLoading && customerUser && (portalMode === "login" || portalMode === "register")) setPortalMode("home");
  }, [customerAuthLoading, customerUser, portalMode]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("contactEmail");
    if (status !== "verified" && status !== "invalid") return;
    setContactVerificationStatus(status);
    setPortalMode("settings");
    url.searchParams.delete("contactEmail");
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAccountLoadError("");
    if (!customerUser?.emailVerified) { setCustomerAccount(null); setContactEmails([]); setCustomerAccountLoading(false); return; }
    setCustomerAccountLoading(true);
    const loadAccount = async () => {
      const token = await customerUser.getIdToken();
      const { account, contactEmails } = await requestJson<{ account: Customer | null; contactEmails: AccountContactEmail[] }>(
        "/api/accounts/me?contacts=1",
        { authToken: token },
      );
      if (cancelled) return;
      setCustomerAccount(account);
      setCustomerAccountLoading(false);
      if (!isAccountProfileComplete(account)) setPortalMode(current => current === "reservation" ? current : "settings");
      setForm((current) => account
        ? applyAccountToReservationForm(current, account, { preserveBookingType: reservationMode.current })
        : { ...current, email: customerUser.email || current.email });
      setAccountEmail(account?.contact || customerUser.email || "");
      if (!cancelled) setContactEmails(contactEmails);
    };
    void loadAccount().catch((error) => {
      if (!cancelled) setAccountLoadError(error instanceof Error ? error.message : "ログイン済みのお客様情報を取得できませんでした");
    }).finally(() => { if (!cancelled) setCustomerAccountLoading(false); });
    return () => { cancelled = true; };
  }, [customerUser, setForm, accountReloadVersion]);

  useEffect(() => {
    if (!customerUser || new URLSearchParams(window.location.search).get("emailChange") !== "complete") return;
    setPortalMode("emailChange");
    let cancelled = false;
    void (async () => {
      try {
        await customerUser.reload();
        const token = await customerUser.getIdToken(true);
        const result = await requestJson<{ changed: boolean; account: Customer; notification?: { status: "sent" | "failed" } }>("/api/accounts/me/email", { method: "PATCH", authToken: token });
        if (cancelled) return;
        setCustomerAccount(result.account);
        setAccountEmail(result.account.contact);
        setForm((current) => ({ ...current, email: result.account.contact }));
        setEmailChangeFailed(false);
        setEmailChangeMessage(result.notification?.status === "failed" ? "メールアドレスを変更しました。旧メールアドレスへの変更通知は送信できませんでした。" : result.changed ? "メールアドレスを変更しました。" : "メールアドレスは変更済みです。");
        window.history.replaceState(null, "", "/?customerMode=emailChange");
      } catch (error) {
        if (!cancelled) { setEmailChangeFailed(true); setEmailChangeMessage(error instanceof Error ? error.message : "メールアドレス変更を完了できませんでした。"); }
      }
    })();
    return () => { cancelled = true; };
  }, [customerUser, setForm]);

  const beginEmailChange = async (newEmail: string) => {
    await requestCustomerEmailChange(newEmail);
    setEmailChangeFailed(false);
    setEmailChangeMessage("新しいメールアドレスに確認メールを送信しました。メール内のリンクから変更を完了してください。");
  };
  const updateCustomerAccount = async (values: AccountProfileFields) => {
    if (!customerUser) return;
    const uid = customerUser.uid;
    const result = await requestJson<{ account: Customer }>("/api/accounts/me", {
      method: customerAccount ? "PATCH" : "POST",
      authToken: await customerUser.getIdToken(),
      body: JSON.stringify({
        ...values,
        contact: customerUser.email,
        name: values.accountType === "travel_agency" ? values.companyBranchName : values.name,
      }),
    });
    if (activeCustomerUid.current !== uid) return;
    setCustomerAccount(result.account);
    setForm((current) => applyAccountToReservationForm(current, result.account, { preserveBookingType: reservationMode.current }));
    if (!isAccountProfileComplete(customerAccount)) setPortalMode(current => current === "reservation" ? current : "home");
    notify("アカウント情報を更新しました。");
  };
  const addContactEmail = async (email: string) => {
    if (!customerUser) return;
    const uid = customerUser.uid;
    const result = await requestJson<{ contactEmail: AccountContactEmail }>("/api/accounts/me/contact-emails", { method: "POST", authToken: await customerUser.getIdToken(), body: JSON.stringify({ email }) });
    if (activeCustomerUid.current !== uid) return;
    setContactEmails((items) => [...items, result.contactEmail]);
    notify("追加メールアドレスへ確認メールを送信しました。");
  };
  const removeContactEmail = async (id: string) => {
    if (!customerUser) return;
    const uid = customerUser.uid;
    await requestJson(`/api/accounts/me/contact-emails?id=${encodeURIComponent(id)}`, { method: "DELETE", authToken: await customerUser.getIdToken() });
    if (activeCustomerUid.current !== uid) return;
    setContactEmails((items) => items.filter((item) => item.id !== id));
  };

  useEffect(() => {
    let cancelled = false;
    if (!customerUser) { setAccountReservations([]); setAccountInquiryCounts(null); setAccountChangeRequests([]); return; }
    if (portalMode !== "account" || !customerUser?.emailVerified) return;
    const loadReservations = async () => {
      setIsLoadingAccountReservations(true); setAccountInquiryCounts(null);
      setAccountReservationError("");
      try {
        const token = await customerUser.getIdToken();
        const { reservations, changeRequests, inquiryCounts } = await requestJson<{
          reservations: Reservation[];
          inquiryCounts?: Record<string, number> | null;
          changeRequests: ReservationChangeRequest[];
        }>("/api/accounts/me/reservations", { authToken: token });
        if (cancelled) return;
        setAccountReservations(reservations);
        setAccountInquiryCounts(inquiryCounts ?? null);
        setAccountChangeRequests(changeRequests);
      } catch {
        if (cancelled) return;
        setAccountReservationError(
          "予約情報を取得できませんでした。時間をおいて再度お試しください。",
        );
      } finally {
        if (!cancelled) setIsLoadingAccountReservations(false);
      }
    };
    loadReservations();
    return () => { cancelled = true; };
  }, [customerUser, portalMode]);

  const selectBookingMode = (mode: "login" | "register") => {
    setBookingMode(mode);
    setAccountEmail((current) => current || form.email);
  };

  const saveCurrentAccountProfile = async (authToken: string, email = accountEmail, profile?: RegisterAuthFields) => {
    const source = profile ?? form;
    const travelAgency = isTravelAgencyAccount(source);
    const name = travelAgency ? source.companyBranchName || source.name : source.name;
    const { account } = await requestJson<{ account: Customer }>("/api/accounts/me", {
      method: "POST",
      authToken,
      body: JSON.stringify({
        name,
        contact: email,
        phone: source.phone,
        address: source.address,
        accountType: travelAgency ? "travel_agency" : "individual",
        companyBranchName: travelAgency
          ? source.companyBranchName || name
          : undefined,
        contactPersonName: travelAgency ? source.contactPersonName : undefined,
      }),
    });
    setCustomerAccount(account);
  };

  const accountProfileReady = () => {
    if (bookingMode !== "register") return true;
    if (!form.phone) return false;
    return isTravelAgencyAccount(form)
      ? Boolean(form.companyBranchName || form.name) &&
          Boolean(form.contactPersonName)
      : Boolean(form.name);
  };

  const submitAccount = async (
    submittedEmail = accountEmail,
    submittedPassword = accountPassword,
    profile?: RegisterAuthFields,
  ) => {
    if (!submittedEmail || !submittedPassword || accountSubmitting) return;
    if (!profile && !accountProfileReady()) {
      notify(
        isTravelAgencyAccount(form)
          ? "会社・支店名、担当者名、電話番号を入力してください"
          : "お名前と電話番号を入力してください",
      );
      return;
    }
    setAccountSubmitting(true);
    try {
      if (bookingMode === "register") {
        try {
          await registerCustomer(
            submittedEmail,
            submittedPassword,
            async (user) => {
              await saveCurrentAccountProfile(await user.getIdToken(), submittedEmail, profile);
            },
          );
          notify("確認メールを送信しました");
        } catch (error) {
          if (customerAuthErrorCode(error) === "auth/email-already-in-use") {
            setBookingMode("login");
            setPortalMode(current => current === "reservation" ? current : "login");
            notify(
              "このメールアドレスはアカウント登録済みです。ログインしてください",
            );
            return;
          } else {
            throw error;
          }
        }
      } else {
        await loginCustomer(submittedEmail, submittedPassword);
        notify("ログインしました");
      }
      setAccountEmail(submittedEmail);
      setAccountPassword("");
      setForm((current) => ({ ...current, email: submittedEmail }));
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : bookingMode === "register"
            ? "アカウント登録に失敗しました"
            : "ログインに失敗しました",
      );
    } finally {
      setAccountSubmitting(false);
    }
  };

  const resendCustomerVerification = async () => {
    if (verificationSubmitting) return;
    setVerificationSubmitting(true);
    try {
      await resendVerificationEmail();
      notify("確認メールを再送しました");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "確認メールを再送できませんでした",
      );
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const confirmCustomerVerification = async () => {
    if (verificationSubmitting) return;
    setVerificationSubmitting(true);
    try {
      const verifiedUser = await refreshEmailVerification();
      if (!verifiedUser?.emailVerified) {
        notify("メール認証がまだ完了していません");
        return;
      }
      const token = await verifiedUser.getIdToken(true);
      const { account } = await requestJson<{ account: Customer | null }>("/api/accounts/me", { authToken: token });
      setCustomerAccount(account);
      setAccountEmail(verifiedUser.email ?? "");
      if (account) setForm(current => applyAccountToReservationForm(current, account, { preserveBookingType: reservationMode.current }));
      setAccountReloadVersion(value => value + 1);
      notify("メールアドレスを確認しました");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "メール認証を確認できませんでした",
      );
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const loginForAccountReservations = async (
    submittedEmail = accountEmail,
    submittedPassword = accountPassword,
  ) => {
    if (!submittedEmail || !submittedPassword || accountSubmitting) return;
    setAccountSubmitting(true);
    try {
      await loginCustomer(submittedEmail, submittedPassword);
      setAccountEmail(submittedEmail);
      setAccountPassword("");
      notify("ログインしました");
    } catch {
      notify("ログインに失敗しました");
    } finally {
      setAccountSubmitting(false);
    }
  };

  const sendCustomerPasswordReset = async (email: string) => {
    if (accountSubmitting) return;
    setAccountSubmitting(true);
    try {
      await resetCustomerPassword(email);
      notify("登録済みのメールアドレス宛てに再設定メールを送信します。迷惑メールフォルダもご確認ください。");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "パスワード再設定メールを送信できませんでした",
      );
    } finally {
      setAccountSubmitting(false);
    }
  };

  const deleteCustomerAccount = async (password: string) => {
    if (!customerUser || accountSubmitting) return;
    if (!window.confirm("アカウントを削除するとログインできなくなります。過去の予約情報については、サービス運営上必要な範囲で保持される場合があります。\n\nアカウントを削除しますか？この操作は取り消せません。"))
      return;
    const finishAccountDeletion = async () => {
      setAccountReservations([]); setAccountInquiryCounts(null);
      setAccountChangeRequests([]);
      setCustomerAccount(null);
      setContactEmails([]);
      await signOutCustomer();
      setPortalMode("home");
      notify("アカウントを削除しました");
    };
    setAccountSubmitting(true);
    try {
      const authToken = await reauthenticateCustomer(password);
      await requestJson<{ deleted: true }>("/api/accounts/me", {
        method: "DELETE",
        authToken,
      });
      await finishAccountDeletion();
    } catch (error) {
      if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
        try {
          await customerUser.reload();
        } catch (reloadError) {
          const code = customerAuthErrorCode(reloadError);
          if (code === "auth/user-not-found" || code === "auth/user-token-expired" || code === "auth/invalid-user-token") {
            await finishAccountDeletion();
            return;
          }
        }
      }
      notify(
        error instanceof TypeError && /failed to fetch/i.test(error.message)
          ? "削除結果を確認できませんでした。通信状態を確認して、もう一度お試しください。"
          : error instanceof Error
          ? error.message
          : "アカウントを削除できませんでした",
      );
      throw error;
    } finally {
      setAccountSubmitting(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || !confirmedPolicyReady || reservationSubmission.current) return;
    const uid = customerUser?.uid;
    reservationSubmission.current = true;
    setIsSubmittingReservation(true);
    try {
      if (!customerUser) {
        notify("ログインまたはアカウント登録を完了してください");
        return;
      }
      const options: ReservationSubmitOptions = {
        customerAccountMode: "account",
        authToken: await customerUser.getIdToken(),
      };
      const submitForm: BookingForm = isGroupBooking(form)
        ? {
            ...form,
            name: form.companyBranchName || form.name,
            accountType: "travel_agency",
            contactPersonName:
              form.contactPersonName || form.bookingContactName,
          }
        : {
            ...form,
            accountType: "individual",
            bookingType: "individual",
            tcCount: 0,
            dgCount: 0,
          };
      const reservation = await onSubmitReservation(submitForm, options);
      if (activeCustomerUid.current !== uid) return;
      setSubmittedReservation(reservation);
      notify(reservation.receiptEmailStatus === "failed" ? `予約申請は保存済みです（${reservation.id}）。受付メールを送信できませんでした。予約確認画面でご確認ください。` : "予約申請を受け付けました（" + reservation.id + "）", reservation.receiptEmailStatus === "failed" ? "error" : "success");
      setStep(5);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "予約申請の保存に失敗しました",
      );
    } finally {
      reservationSubmission.current = false;
      setIsSubmittingReservation(false);
    }
  };
  const submitCancellation = async (cancellationFeeAcknowledged = false) => {
    if (!canSubmitCancellation) return;
    setIsSubmittingCancellation(true);
    try {
      if (!customerUser) {
        notify("ログインしてください");
        return;
      }
      const authToken = await customerUser.getIdToken();
      const reservation = await onSubmitCancellation(
        {
          reservationId: cancellationForm.reservationId.trim(),
          cancellationFeeAcknowledged,
          email: cancellationForm.email.trim() || undefined,
          phone: cancellationForm.phone.trim() || undefined,
        },
        { authToken },
      );
      notify("キャンセル申請を受け付けました（" + reservation.id + "）");
      setCancellationSubmitted(true);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "キャンセル申請の保存に失敗しました",
      );
    } finally {
      setIsSubmittingCancellation(false);
    }
  };
  const submitConfirmedChange = async (cancellationPolicyAgreement: CancellationPolicyAgreementInput) => {
    if (!canSubmitConfirmedChange) return;
    setIsSubmittingConfirmedChange(true);
    try {
      if (!customerUser) {
        notify("ログインしてください");
        return;
      }
      const authToken = await customerUser.getIdToken();
      const reservation = await onSubmitConfirmedReservationChange(
        {
          reservationId: confirmedChangeForm.reservationId.trim(),
          cancellationPolicyAgreement,
          email: confirmedChangeForm.email.trim() || undefined,
          phone: confirmedChangeForm.phone.trim() || undefined,
        },
        { authToken },
      );
      notify("本予約への変更申請を受け付けました（" + reservation.id + "）");
      setConfirmedChangeSubmitted(true);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "本予約への変更申請の保存に失敗しました",
      );
    } finally {
      setIsSubmittingConfirmedChange(false);
    }
  };
  const submitChangeRequest = async (cancellationFeeAcknowledged = false) => {
    if (!canSubmitChangeRequest) return;
    setIsSubmittingChangeRequest(true);
    try {
      if (!customerUser) {
        notify("ログインしてください");
        return;
      }
      const authToken = await customerUser.getIdToken();
      const currentReservation = accountReservations.find(item => item.id === changeRequestForm.reservationId.trim().toUpperCase());
      const request = await onSubmitChangeRequest(
        {
          reservationId: changeRequestForm.reservationId.trim(),
          cancellationFeeAcknowledged,
          expectedRevision: changeRequestForm.expectedRevision,
          cancellationFeeContext: cancellationFeeAcknowledged && currentReservation ? reservationChangeFeeContext(currentReservation, changeRequestForm.requestedPeople) : null,
          email: changeRequestForm.email.trim() || undefined,
          phone: changeRequestForm.phone.trim() || undefined,
          requestedDate: changeRequestForm.requestedDate,
          requestedStartTime: changeRequestForm.requestedStartTime,
          requestedPeople: changeRequestForm.requestedPeople,
          requestedMenuItems: changeRequestForm.requestedMenuItems,
          reason: changeRequestForm.reason.trim() || undefined,
        },
        { authToken },
      );
      notify(
        "予約内容変更申請を受け付けました（" + request.reservationId + "）",
      );
      setChangeRequestSubmitted(true);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "予約内容変更申請の保存に失敗しました",
      );
    } finally {
      setIsSubmittingChangeRequest(false);
    }
  };
  const startConfirmedChangeFromReservation = (reservation: Reservation) => {
    reservationListScroll.current = window.scrollY;
    setConfirmedChangeForm({
      reservationId: reservation.id,
      email: reservation.email ?? customerUser?.email ?? "",
      phone: reservation.phone,
    });
    setConfirmedChangeSubmitted(false);
    setPortalMode("confirmedChange");
  };
  const startReservationChangeFromReservation = (reservation: Reservation) => {
    reservationListScroll.current = window.scrollY;
    setChangeRequestForm({
      reservationId: reservation.id,
      expectedRevision: reservation.revision ?? 0,
      email: reservation.email ?? customerUser?.email ?? "",
      phone: reservation.phone,
      requestedDate: reservation.date,
      requestedStartTime: reservation.startTime ?? DEFAULT_START_TIME,
      requestedPeople: reservation.people,
      requestedMenuItems: reservation.menuItems ?? [],
      reason: "",
    });
    setChangeRequestSubmitted(false);
    setPortalMode("change");
  };
  const reconfirmReservationChange = (request: ReservationChangeRequest) => {
    reservationListScroll.current = window.scrollY;
    setChangeRequestForm({ reservationId: request.reservationId, expectedRevision: accountReservations.find(r => r.id === request.reservationId)?.revision ?? 0, email: request.email ?? customerUser?.email ?? "", phone: request.phone, requestedDate: request.requestedDate, requestedStartTime: request.requestedStartTime, requestedPeople: request.requestedPeople, requestedMenuItems: request.requestedMenuItems, reason: request.reason ?? "" });
    setChangeRequestSubmitted(false);
    setPortalMode("change");
  };
  const startCancellationFromReservation = (reservation: Reservation) => {
    reservationListScroll.current = window.scrollY;
    setCancellationForm({
      reservationId: reservation.id,
      email: reservation.email ?? customerUser?.email ?? "",
      phone: reservation.phone,
    });
    setCancellationSubmitted(false);
    setPortalMode("cancellation");
  };
  const customerRequestableStatuses: readonly Status[] = [
    STATUS.temporaryRequested,
    STATUS.temporaryConfirmed,
    STATUS.confirmedRequested,
    STATUS.confirmed,
    STATUS.waitingForVisit,
  ];
  const canRequestConfirmedChangeFromReservation = (reservation: Reservation) =>
    reservation.status === STATUS.temporaryConfirmed;
  const canRequestChangeFromReservation = (reservation: Reservation) =>
    customerRequestableStatuses.includes(reservation.status);
  const canRequestCancellationFromReservation = (reservation: Reservation) =>
    customerRequestableStatuses.includes(reservation.status);
  const backToReservationList = () => {
    restoreReservationList.current = true;
    setPortalMode("account");
  };
  const backToPortalHome = () => {
    bookingCategoryChosen.current = false;
    setPortalMode("home");
    setStep(1);
    setCancellationSubmitted(false);
    setConfirmedChangeSubmitted(false);
    setChangeRequestSubmitted(false);
  };

  if (customerAuthLoading) return <main className="min-h-screen bg-background"><CustomerPageHeader>{null}</CustomerPageHeader><CustomerPageFrame><div className="p-4 sm:p-6"><p role="status">ログイン状態を確認しています…</p>{customerAuthError && <Alert className="mt-4 text-destructive"><p>{customerAuthError}</p><Button type="button" variant="outline" className="mt-3" onClick={() => window.location.reload()}>再読み込み</Button></Alert>}</div></CustomerPageFrame></main>;

  return (
    <GoogleCustomerAuthProvider user={customerUser} reauthenticate={reauthenticateCustomer} notify={notify} signOut={async () => { await signOutCustomer(); setAccountReservations([]); setAccountInquiryCounts(null); setCustomerAccount(null); setPortalMode("home"); }} onAuthenticated={(_user, mode, notification) => {
      setAccountPassword("");
      if (mode === "login") { setPortalMode(current => current === "reservation" ? current : "home"); setCustomerAccountLoading(true); }
      if (mode !== "reauth") setAccountReloadVersion(value => value + 1);
      if (mode === "login") notify("Googleでログインしました。");
      if (mode === "link") notify(notification === "failed" ? "Googleアカウントを連携しました。変更通知を送信できませんでした。" : "Googleアカウントを連携しました。");
    }}>
    <main ref={portalMain} className="min-h-screen bg-background">
      <CustomerPageHeader>
          {!customerUser && portalMode === "home" && <Button variant="outline" size="sm" onClick={onAdmin}>管理画面</Button>}
      </CustomerPageHeader>
      <CustomerPageFrame wide={portalMode === "account" || portalMode === "home"}>
        {customerUser && !customerUser.emailVerified && (
          <CustomerEmailVerificationPanel
            email={customerUser.email ?? ""}
            isSubmitting={verificationSubmitting}
            onRefresh={confirmCustomerVerification}
            onResend={resendCustomerVerification}
            onLogout={() => signOutCustomer()}
          />
        )}
        {(!customerUser || customerUser.emailVerified) && (
          <>
            {(portalMode === "login" || portalMode === "register") && (
              <div className="p-4 sm:p-8">
                <CustomerAccountAccessPanel
                  standalone
                  authError={customerAuthError}
                  accountEmail={accountEmail}
                  accountPassword={accountPassword}
                  accountSubmitting={accountSubmitting}
                  customerAuthLoading={customerAuthLoading}
                  bookingMode={portalMode}
                  registrationForm={form}
                  onBookingModeChange={selectBookingMode}
                  onRegistrationFormChange={setForm}
                  onAccountEmailChange={setAccountEmail}
                  onAccountPasswordChange={setAccountPassword}
                  onLogin={loginForAccountReservations}
                  onSubmitAccount={submitAccount}
                  onResetPassword={sendCustomerPasswordReset}
                />
              </div>
            )}
            {(portalMode === "home" || portalMode === "settings") && (
              <CustomerPortalHome
                key={`${portalMode}:${customerUser?.uid ?? "guest"}`}
                screen={portalMode}
                onOpenSettings={() => setPortalMode("settings")}
                onOpenEmailChange={() => { setEmailChangeMessage(""); setEmailChangeFailed(false); setPortalMode("emailChange"); }}
                onOpenAccountDeletion={() => setPortalMode("accountDeletion")}
                onBack={backToPortalHome}
                customerEmail={customerUser?.email ?? ""}
                isLoggedIn={Boolean(customerUser)}
                authError={customerAuthError}
                accountEmail={accountEmail}
                accountPassword={accountPassword}
                accountSubmitting={accountSubmitting}
                customerAuthLoading={customerAuthLoading || customerAccountLoading}
                bookingMode={bookingMode}
                registrationForm={form}
                onBookingModeChange={selectBookingMode}
                onRegistrationFormChange={setForm}
                onAccountEmailChange={setAccountEmail}
                onAccountPasswordChange={setAccountPassword}
                onLogin={loginForAccountReservations}
                onSubmitAccount={submitAccount}
                onResetPassword={sendCustomerPasswordReset}
                onLogout={() => {
                  setPortalMode("home");
                  setAccountReservations([]); setAccountInquiryCounts(null);
                  setAccountChangeRequests([]);
                  setCustomerAccount(null);
                  signOutCustomer();
                }}
                contactVerificationStatus={contactVerificationStatus}
                customerAccount={customerAccount}
                accountLoadError={accountLoadError}
                onRetryAccount={() => setAccountReloadVersion(value => value + 1)}
                onUpdateAccount={updateCustomerAccount}
                contactEmails={contactEmails}
                onAddContactEmail={addContactEmail}
                onRemoveContactEmail={removeContactEmail}
                onOpenAccount={() => {
                  setPortalMode("account");
                  setAccountReservationError("");
                }}
                onOpenReservation={() => {
                  if (customerUser && !isAccountProfileComplete(customerAccount)) { notify("お客様情報の登録を完了してください。"); return; }
                  bookingCategoryChosen.current = false;
                  if (customerAccount) setForm((current) => applyAccountToReservationForm(current, customerAccount));
                  setPortalMode("reservation");
                  setStep(1);
                }}
              />
            )}
            {(portalMode === "emailChange" || portalMode === "accountDeletion") && (
              customerUser ? portalMode === "emailChange" ? (
                <CustomerEmailChangeScreen key={customerUser.uid} customerEmail={customerUser.email ?? ""} onBack={backToPortalHome} busy={accountSubmitting} message={emailChangeMessage} failed={emailChangeFailed} onRequestEmailChange={beginEmailChange} />
              ) : (
                <CustomerAccountDeletionScreen key={customerUser.uid} customerEmail={customerUser.email ?? ""} onBack={backToPortalHome} busy={accountSubmitting} onDeleteAccount={deleteCustomerAccount} />
              ) : <div className="form-body narrow"><h1 className="mb-6 text-xl font-semibold">{portalMode === "emailChange" ? "メールアドレス変更" : "アカウント削除"}</h1><p>このお手続きにはログインが必要です。</p><CustomerAuthEntryLinks /><CustomerPageActions onBack={backToPortalHome} /></div>
            )}
            {portalMode === "account" && (
              <CustomerReservationDashboard
                customerIdentity={customerUser?.uid ?? ""}
                getCustomerToken={async () => { if (!customerUser) throw new Error("ログインしてください。"); return customerUser.getIdToken(); }}
                customerEmail={customerUser?.email ?? ""}
                isLoggedIn={Boolean(customerUser)}
                authError={customerAuthError}
                accountEmail={accountEmail}
                accountPassword={accountPassword}
                accountSubmitting={accountSubmitting}
                customerAuthLoading={customerAuthLoading}
                bookingMode={bookingMode}
                registrationForm={form}
                reservations={accountReservations}
                inquiryCounts={accountInquiryCounts}
                changeRequests={accountChangeRequests}
                isLoading={isLoadingAccountReservations}
                reservationError={accountReservationError}
                canRequestConfirmedChange={
                  canRequestConfirmedChangeFromReservation
                }
                canRequestChange={canRequestChangeFromReservation}
                canRequestCancellation={canRequestCancellationFromReservation}
                onBack={backToPortalHome}
                onBookingModeChange={selectBookingMode}
                onRegistrationFormChange={setForm}
                onAccountEmailChange={setAccountEmail}
                onAccountPasswordChange={setAccountPassword}
                onLogin={loginForAccountReservations}
                onSubmitAccount={submitAccount}
                onResetPassword={sendCustomerPasswordReset}
                onLogout={() => {
                  setAccountReservations([]); setAccountInquiryCounts(null);
                  setAccountChangeRequests([]);
                  setCustomerAccount(null);
                  signOutCustomer();
                }}
                onConfirmedChange={startConfirmedChangeFromReservation}
                onChange={startReservationChangeFromReservation}
                onReconfirmChange={reconfirmReservationChange}
                onCancellation={startCancellationFromReservation}
              />
            )}
            {portalMode === "reservation" && (
              <>
                <BookingSteps currentStep={step} />
                {step === 1 && (
                  <div className="form-body narrow reservation-type-step">
                    <p className="form-kicker">STEP 1</p>
                    <h1>利用者区分を選択</h1>
                    <fieldset className="reservation-type-options">
                      <legend>利用者区分</legend>
                      <button aria-pressed={(form.bookingType ?? "individual") === "individual"}
                        type="button"
                        className={
                          (form.bookingType ?? "individual") === "individual"
                            ? "selected"
                            : ""
                        }
                        onClick={() => {
                          bookingCategoryChosen.current = true;
                          setForm({
                            ...form,
                            bookingType: "individual",
                            accountType: "individual",
                            tcCount: 0,
                            dgCount: 0,
                          });
                        }}
                      >
                        <span className="radio-mark" aria-hidden="true" />
                        <span>
                          <strong>一般予約</strong>
                          <small>
                            学校・企業・各種団体・個人のお客様はこちら
                          </small>
                        </span>
                      </button>
                      <button aria-pressed={form.bookingType === "travel_agency_group"}
                        type="button"
                        className={
                          form.bookingType === "travel_agency_group"
                            ? "selected"
                            : ""
                        }
                        onClick={() => {
                          bookingCategoryChosen.current = true;
                          setForm({
                            ...form,
                            bookingType: "travel_agency_group",
                            accountType: "travel_agency",
                            companyBranchName:
                              form.companyBranchName || form.name,
                            bookingContactName:
                              form.bookingContactName ||
                              form.contactPersonName ||
                              "",
                          });
                        }}
                      >
                        <span className="radio-mark" aria-hidden="true" />
                        <span>
                          <strong>旅行会社様専用 団体予約</strong>
                          <small>旅行会社・旅行代理店の方はこちら</small>
                        </span>
                      </button>
                    </fieldset>
                    <CustomerPageActions onBack={backToPortalHome} backLabel={customerUser ? "お手続きトップへ戻る" : "店舗Webサイトへ戻る"}>
                      <Button type="button" onClick={() => setStep(2)}>
                        予約種別へ <Icon name="arrow" />
                      </Button>
                    </CustomerPageActions>
                  </div>
                )}
                {step === 2 && (
                  <div className="form-body narrow reservation-type-step">
                    <p className="form-kicker">STEP 2</p>
                    <h1>予約種別を選択</h1>
                    <fieldset className="reservation-type-options">
                      <legend>予約種別</legend>
                      <button aria-pressed={form.status === STATUS.confirmedRequested}
                        type="button"
                        className={
                          form.status === STATUS.confirmedRequested
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setForm({
                            ...form,
                            status: STATUS.confirmedRequested,
                          })
                        }
                      >
                        <span className="radio-mark" aria-hidden="true" />
                        <span>
                          <strong>本予約を申し込む</strong>
                          <small>正式な予約として申請します</small>
                        </span>
                      </button>
                      <button aria-pressed={form.status === STATUS.temporaryRequested}
                        type="button"
                        className={
                          form.status === STATUS.temporaryRequested
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setForm({
                            ...form,
                            status: STATUS.temporaryRequested,
                          })
                        }
                      >
                        <span className="radio-mark" aria-hidden="true" />
                        <span>
                          <strong>仮予約として相談する</strong>
                          <small>日程を仮押さえして相談します</small>
                        </span>
                      </button>
                    </fieldset>
                    <CustomerPageActions onBack={() => setStep(1)} backLabel="前の入力へ戻る" busy={isSubmittingReservation}>
                      <Button type="button" onClick={() => setStep(3)}>
                        日時へ <Icon name="arrow" />
                      </Button>
                    </CustomerPageActions>
                  </div>
                )}
                {step === 3 && (
                  <div className="form-body narrow">
                    <p className="form-kicker">STEP 3</p>
                    <h1>日時と人数</h1>
                    {policyError && <p role="alert" className="text-sm text-destructive">{policyError}</p>}
                    {!policy && !policyError && <p role="status" className="text-sm text-muted-foreground">受付期限を確認しています…</p>}
                    {policy && <p className="text-sm text-muted-foreground">利用日の{policy.days}日前までに申請してください。{policy.minimumDate}以降を選択できます。</p>}
                    <CustomerBookingSchedule value={form} minimumDate={policy?.minimumDate ?? null} busy={isSubmittingReservation} onChange={values => setForm(current => ({ ...current, ...values }))} onNext={() => setStep(4)} />
                    <MenuPicker
                      menuCatalog={menuCatalog}
                      loading={menuLoading} error={menuError} onRetry={onRetryMenus}
                      selected={form.menuItems}
                      onChange={(menuItems) => setForm({ ...form, menuItems })}
                    />
                    <div className="reservation-summary">
                      <strong>
                        終了予定{" "}
                        {bookingFormEndTime(form, menuCatalog) || "未入力"}
                      </strong>
                      <span>
                        {form.date && form.startTime && Number.isInteger(form.people) && form.people >= 1 && form.people <= 999
                          ? `${bookingFormDateTimeLabel({ ...form, endTime: bookingFormEndTime(form, menuCatalog) })}・${form.people}名`
                          : "日時・人数を入力してください"}
                      </span>
                    </div>
                    <CustomerPageActions onBack={() => setStep(2)} backLabel="前の入力へ戻る" busy={isSubmittingReservation}>
                      <Button
                        type="submit"
                        form="customer-booking-schedule"
                        disabled={!policy || isSubmittingReservation}
                      >
                        お客様情報へ <Icon name="arrow" />
                      </Button>
                    </CustomerPageActions>
                  </div>
                )}
                {step === 4 && !customerUser && (
                  <div className="form-body narrow">
                    <p className="form-kicker">STEP 4</p>
                    <p className="mb-4 text-sm">予約申請にはアカウントが必要です。ログインまたは新規登録して続けてください。</p>
                    <p className="mb-4 text-sm font-medium">{bookingFormDateTimeLabel({ ...form, endTime: bookingFormEndTime(form, menuCatalog) })}・{form.people}名・{menuSelectionLabel(form.menuItems)}</p>
                    <CustomerAccountAccessPanel
                      inline
                      authError={customerAuthError}
                      accountEmail={accountEmail}
                      accountPassword={accountPassword}
                      accountSubmitting={accountSubmitting}
                      customerAuthLoading={customerAuthLoading}
                      bookingMode={bookingMode}
                      registrationForm={form}
                      onBookingModeChange={selectBookingMode}
                      onRegistrationFormChange={setForm}
                      onAccountEmailChange={setAccountEmail}
                      onAccountPasswordChange={setAccountPassword}
                      onLogin={loginForAccountReservations}
                      onSubmitAccount={submitAccount}
                      onResetPassword={sendCustomerPasswordReset}
                    />
                    <CustomerPageActions onBack={() => setStep(3)} backLabel="前の入力へ戻る" busy={accountSubmitting} />
                  </div>
                )}
                {step === 4 && customerUser && (customerAccountLoading || accountLoadError || !isAccountProfileComplete(customerAccount)) && (
                  <div className="form-body narrow">
                    {(customerAccountLoading || accountLoadError) && <h1 className="mb-6 text-xl font-semibold">お客様情報登録</h1>}
                    {customerAccountLoading ? <p role="status">お客様情報を読み込み中…</p> : accountLoadError ? <Alert><p>{accountLoadError}</p><Button type="button" variant="outline" className="mt-3" onClick={() => setAccountReloadVersion(value => value + 1)}>再読み込み</Button></Alert> : <AccountProfileEditor headingLevel="h1" key={customerUser.uid} account={customerAccount ?? { name: customerUser.displayName ?? "", contact: customerUser.email ?? "", phone: "" }} onSave={updateCustomerAccount} onStateChange={setBookingProfileState} />}
                    <CustomerPageActions onBack={() => setStep(3)} backLabel="前の入力へ戻る" busy={bookingProfileState.busy} dirty={bookingProfileState.dirty}>
                      {!customerAccountLoading && !accountLoadError && <Button type="submit" form="customer-profile-form" disabled={bookingProfileState.busy}>{bookingProfileState.busy ? "保存中…" : "保存して予約を続ける"}</Button>}
                    </CustomerPageActions>
                  </div>
                )}
                {step === 4 && customerUser && !customerAccountLoading && !accountLoadError && isAccountProfileComplete(customerAccount) && (
                  <div className="form-body narrow">
                    <p className="form-kicker">STEP 4</p>
                    <h1>お客様情報</h1>
                    <div className="customer-account-current mb-4"><span>ログイン中</span><strong>{customerUser?.email}</strong></div>
                    <div className="form-fields single">
                      <label>
                        {isGroupBooking(form) ? "会社・支店名" : "お名前"}
                        <input
                          value={
                            isGroupBooking(form)
                              ? (form.companyBranchName ?? form.name)
                              : form.name
                          }
                          onChange={(event) =>
                            setForm({
                              ...form,
                              name: isGroupBooking(form)
                                ? event.target.value
                                : event.target.value,
                              companyBranchName: isGroupBooking(form)
                                ? event.target.value
                                : form.companyBranchName,
                            })
                          }
                        />
                      </label>
                      <label>
                        電話番号
                        <input
                          value={form.phone}
                          onChange={(event) =>
                            setForm({ ...form, phone: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        メールアドレス
                        <input
                          type="email"
                          value={form.email}
                          onChange={(event) => {
                            setForm({ ...form, email: event.target.value });
                            setAccountEmail(event.target.value);
                          }}
                        />
                      </label>
                      <label>
                        住所
                        <input
                          value={form.address}
                          onChange={(event) =>
                            setForm({ ...form, address: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    {isGroupBooking(form) && (
                      <GroupReservationContactFields
                        form={form}
                        setForm={setForm}
                      />
                    )}
                    {isGroupBooking(form) && (
                      <GroupReservationPeopleFields
                        form={form}
                        setForm={setForm}
                      />
                    )}
                    <PaymentAndRemarksFields form={form} setForm={setForm} />
                    {isGroupBooking(form) && (
                      <GroupReservationFields form={form} setForm={setForm} />
                    )}
                    <div className="confirm-box">
                      <span>
                        {bookingFormDateTimeLabel({
                          ...form,
                          endTime: bookingFormEndTime(form, menuCatalog),
                        })}
                        ・{form.people}名
                      </span>
                      <strong>
                        {isGroupBooking(form)
                          ? form.groupName || "団体名未入力"
                          : menuSelectionLabel(form.menuItems)}
                      </strong>
                      <small>
                        {statusLabel(form.status ?? STATUS.confirmedRequested)}
                        ・{"¥"}
                        {total.toLocaleString()}
                      </small>
                    </div>
                    {requiresConfirmedPolicy && <CancellationPolicyAgreement checked={confirmedPolicyReady} disabled={isSubmittingReservation} onChange={checked => setForm(current => ({ ...current, cancellationPolicyAgreement: checked ? { accepted: true, version: cancellationPolicyVersion } : undefined }))} />}
                    {missingBookingFields.length > 0 && <p id="booking-missing-fields" role="status" className="mt-4 text-sm text-destructive">{[...new Set(missingBookingFields)].join("、")}を入力してください。</p>}
                    <CustomerPageActions onBack={() => setStep(3)} backLabel="前の入力へ戻る" busy={isSubmittingReservation}>
                      <Button
                        type="button"
                        disabled={!canSubmit || !confirmedPolicyReady || !customerUser}
                        aria-describedby={missingBookingFields.length > 0 ? "booking-missing-fields" : undefined}
                        onClick={submit}
                      >
                        {isSubmittingReservation ? "申請中…" : "この内容で申請する"} <Icon name="arrow" />
                      </Button>
                    </CustomerPageActions>
                  </div>
                )}
                {step === 5 && (
                  <div className="form-body complete">
                    <span>
                      <Icon name="check" />
                    </span>
                    <h1>予約申請を受け付けました</h1>
                    {submittedReservation && <p className="font-semibold">予約ID：{submittedReservation.id}</p>}
                    <p>内容を確認後、予約可否をご連絡します。</p>
                    {submittedReservation?.receiptEmailStatus === "failed" && <Alert className="border-warning/40 text-warning"><p>予約申請は保存されていますが、受付メールを送信できませんでした。予約確認画面で申請状況をご確認ください。再申請は不要です。</p></Alert>}
                    <CustomerPageActions onBack={backToPortalHome} />
                  </div>
                )}
              </>
            )}
            {isCustomerRequestMode(portalMode) && !customerUser && (
              <CustomerRequestLoginPanel
                authError={customerAuthError}
                accountEmail={accountEmail}
                accountPassword={accountPassword}
                accountSubmitting={accountSubmitting}
                customerAuthLoading={customerAuthLoading}
                bookingMode={bookingMode}
                registrationForm={form}
                onBack={backToPortalHome}
                onBookingModeChange={selectBookingMode}
                onRegistrationFormChange={setForm}
                onAccountEmailChange={setAccountEmail}
                onAccountPasswordChange={setAccountPassword}
                onLogin={loginForAccountReservations}
                onSubmitAccount={submitAccount}
                onResetPassword={sendCustomerPasswordReset}
              />
            )}
            {isCustomerRequestMode(portalMode) && customerUser && (
              <CustomerRequestForms
                mode={portalMode}
                confirmedChangeForm={confirmedChangeForm}
                changeRequestForm={changeRequestForm}
                changeRequests={accountChangeRequests}
                changeReservation={accountReservations.find(reservation => reservation.id === changeRequestForm.reservationId.trim().toUpperCase())}
                cancellationReservation={accountReservations.find((reservation) => reservation.id === cancellationForm.reservationId)}
                confirmedChangeSubmitted={confirmedChangeSubmitted}
                changeRequestSubmitted={changeRequestSubmitted}
                cancellationSubmitted={cancellationSubmitted}
                isSubmittingConfirmedChange={isSubmittingConfirmedChange}
                isSubmittingChangeRequest={isSubmittingChangeRequest}
                isSubmittingCancellation={isSubmittingCancellation}
                canSubmitConfirmedChange={canSubmitConfirmedChange}
                canSubmitChangeRequest={canSubmitChangeRequest}
                canSubmitCancellation={canSubmitCancellation}
                menuCatalog={menuCatalog}
                menuState={{ loading: menuLoading, error: menuError, onRetry: onRetryMenus }}
                onBack={backToReservationList}
                onComplete={backToPortalHome}
                onConfirmedChangeFormChange={setConfirmedChangeForm}
                onChangeRequestFormChange={setChangeRequestForm}
                onSubmitConfirmedChange={submitConfirmedChange}
                onSubmitChangeRequest={submitChangeRequest}
                onSubmitCancellation={submitCancellation}
              />
            )}
          </>
        )}
      </CustomerPageFrame>
      <Toaster />
    </main>
    </GoogleCustomerAuthProvider>
  );
}


function isCustomerRequestMode(mode: CustomerPortalMode) {
  return (
    mode === "confirmedChange" || mode === "change" || mode === "cancellation"
  );
}


function CustomerRequestLoginPanel({
  authError,
  accountEmail,
  accountPassword,
  accountSubmitting,
  customerAuthLoading,
  bookingMode,
  registrationForm,
  onBack,
  onBookingModeChange,
  onRegistrationFormChange,
  onAccountEmailChange,
  onAccountPasswordChange,
  onLogin,
  onSubmitAccount,
  onResetPassword,
}: {
  authError: string;
  accountEmail: string;
  accountPassword: string;
  accountSubmitting: boolean;
  customerAuthLoading: boolean;
  bookingMode: "login" | "register";
  registrationForm: BookingForm;
  onBack: () => void;
  onBookingModeChange: (mode: "login" | "register") => void;
  onRegistrationFormChange: Dispatch<SetStateAction<BookingForm>>;
  onAccountEmailChange: (value: string) => void;
  onAccountPasswordChange: (value: string) => void;
  onLogin: (email?: string, password?: string) => void;
  onSubmitAccount: (email?: string, password?: string, profile?: RegisterAuthFields) => void;
  onResetPassword: (email: string) => void;
}) {
  return (
    <>
      <div className="form-body narrow cancellation-form">
        <h1>ログインまたはアカウント登録</h1>
        <section className="customer-account-panel">
          <CustomerAccountAccessPanel
            authError={authError}
            accountEmail={accountEmail}
            accountPassword={accountPassword}
            accountSubmitting={accountSubmitting}
            customerAuthLoading={customerAuthLoading}
            bookingMode={bookingMode}
            registrationForm={registrationForm}
            onBookingModeChange={onBookingModeChange}
            onRegistrationFormChange={onRegistrationFormChange}
            onAccountEmailChange={onAccountEmailChange}
            onAccountPasswordChange={onAccountPasswordChange}
            onLogin={onLogin}
            onSubmitAccount={onSubmitAccount}
            onResetPassword={onResetPassword}
          />
        </section>
        <CustomerPageActions onBack={onBack} busy={accountSubmitting} />
      </div>
    </>
  );
}
export default CustomerPortal;
