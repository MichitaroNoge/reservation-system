import type { BrowserContext, Page } from "playwright-core";
import { base } from "./performance/browser-support";

type AuditTools = {
  context: () => Promise<BrowserContext>;
  prepare: (page: Page) => void;
  capture: (page: Page, name: string) => Promise<void>;
  attempt: (name: string, work: () => Promise<void>) => Promise<void>;
};

export async function auditExtraScreens({ context, prepare, capture, attempt }: AuditTools) {
  const adminCtx = await context(), admin = await adminCtx.newPage(); prepare(admin);
  await admin.goto(base); await admin.getByLabel("メールアドレス", { exact: true }).fill("admin@example.test");
  await admin.getByLabel("パスワード", { exact: true }).fill("fixture-password");
  await Promise.all([admin.waitForResponse(r => r.url().includes("/api/admin/screen") && r.ok()), admin.getByRole("button", { name: "ログイン", exact: true }).click()]);
  const nav = async (name: string) => { await admin.setViewportSize({ width: 1280, height: 900 }); await admin.getByRole("navigation", { name: "管理メニュー" }).getByRole("button", { name: new RegExp(`^${name}`) }).click(); };
  const close = async () => {
    while (await admin.getByRole("dialog").count()) { const id = await admin.getByRole("dialog").last().getAttribute("id"); await admin.keyboard.press("Escape"); if (id) await admin.locator(`[id="${id}"]`).waitFor({ state: "hidden" }); }
  };
  await attempt("history-details", async () => {
    await nav("予約承認"); await admin.getByRole("button", { name: "内容を確認", exact: true }).first().click();
    await admin.getByRole("button", { name: "承認内容を確認", exact: true }).click();
    await admin.getByRole("dialog").last().getByRole("button", { name: "承認する", exact: true }).click();
    await admin.getByRole("dialog").waitFor({ state: "hidden" });
    await admin.getByRole("tab", { name: "処理済み", exact: true }).click();
    await admin.getByRole("button", { name: "履歴を確認", exact: true }).first().waitFor(); await capture(admin, "history-with-record");
    await admin.getByRole("button", { name: "履歴を確認", exact: true }).first().click(); await capture(admin, "history-processed-detail"); await close();
  });
  await attempt("calendar-variants", async () => {
    await nav("予約カレンダー");
    for (const name of ["週間", "店舗別"]) { await admin.getByRole("group", { name: "カレンダー表示" }).getByRole("button", { name, exact: true }).click(); await capture(admin, `calendar-${name === "週間" ? "week" : "stores"}`); }
    await admin.getByRole("group", { name: "カレンダー表示" }).getByRole("button", { name: "月間", exact: true }).click();
    const day = admin.getByRole("button", { name: /の予約 [1-9]\d*件 本予約最大/ }).first();
    await day.click(); await admin.getByRole("dialog").waitFor(); await capture(admin, "calendar-day"); await close();
  });
  for (const [name, title] of Object.entries({ reservations: "予約承認", confirmed: "本予約変更承認", changes: "予約変更承認", cancellations: "キャンセル承認" })) {
    await attempt(`history-${name}`, async () => { await nav(title); await admin.getByRole("tab", { name: "処理済み", exact: true }).click(); await capture(admin, `history-${name}`); });
  }
  await attempt("admin-reservation-editors", async () => {
    await nav("予約一覧");
    const customer = "長い予約者名の表示確認のお客様";
    await Promise.all([
      admin.waitForResponse(response => response.url().endsWith("/api/admin/reservations") && response.request().postDataJSON()?.search === customer),
      admin.getByRole("textbox", { name: "予約ID・顧客名で検索", exact: true }).fill(customer),
    ]);
    const booking = admin.locator("tbody tr").filter({ hasText: "本予約確定" }).getByRole("button", { name: /RSV-\d+の予約詳細を開く/ }).first();
    await booking.click(); await capture(admin, "admin-confirmed-record-detail");
    await admin.getByRole("button", { name: "予約内容を編集", exact: true }).click(); await capture(admin, "admin-reservation-editor"); await close();
    await booking.click(); await admin.getByRole("button", { name: "店舗割当を編集", exact: true }).click(); await capture(admin, "admin-reservation-stores-editor"); await close();
    await booking.click(); await admin.getByRole("button", { name: "申請・承認履歴", exact: true }).click(); await capture(admin, "admin-reservation-history"); await close();
  });
  await attempt("master-inactive", async () => { await nav("マスタ・設定"); await admin.getByRole("button", { name: "メニュー管理", exact: true }).click(); await admin.getByRole("button", { name: /^無効を表示/ }).click(); await capture(admin, "master-inactive-menu"); });
  await adminCtx.close();

  const memberCtx = await context(), member = await memberCtx.newPage(); prepare(member);
  await member.goto(base + "/login");
  await member.getByLabel("メールアドレス", { exact: true }).fill("member@example.test");
  await member.getByLabel("パスワード", { exact: true }).fill("fixture-password");
  await member.getByRole("button", { name: "ログイン", exact: true }).last().click();
  await member.getByRole("button", { name: /予約確認・変更・キャンセル/ }).waitFor();
  await attempt("member-inquiry-detail", async () => {
    await member.goto(base + "/contact/history"); await member.getByRole("link", { name: /^INQ-/ }).first().click();
    await member.getByRole("heading", { name: "問い合わせ詳細", exact: true }).waitFor(); await capture(member, "member-inquiry-detail");
  });
  for (const [name, title] of Object.entries({ confirmed: "本予約への変更申請", change: "予約内容変更申請", cancellation: "キャンセル申請" })) {
    await attempt(`member-${name}-request`, async () => {
      await member.goto(base + "/customer/reservations");
      await member.getByRole("button", { name: title, exact: true }).and(member.locator(":enabled")).first().click();
      await capture(member, `member-${name}-request`);
      if (name === "cancellation") {
        await member.getByRole("button", { name: "キャンセルを申請する", exact: true }).click();
        await member.getByRole("dialog").waitFor(); await capture(member, "member-cancellation-confirm");
        await member.getByRole("dialog").getByRole("button", { name: /キャンセルを申請する|確認して申請する/ }).click();
        await member.getByRole("heading", { name: "キャンセル申請を受け付けました", exact: true }).waitFor(); await capture(member, "member-cancellation-complete");
      }
    });
  }
  await attempt("member-profile-editor", async () => {
    await member.goto(base + "/?customerMode=settings"); await member.getByRole("button", { name: "変更", exact: true }).click(); await capture(member, "member-profile-editor");
    await member.getByRole("button", { name: "旅行会社の担当者様", exact: true }).click(); await capture(member, "member-profile-company");
  });
  await attempt("member-booking", async () => {
    await member.goto(base + "/reserve");
    await member.getByRole("button", { name: "予約種別へ", exact: true }).click();
    await member.getByRole("button", { name: "日時へ", exact: true }).click();
    await member.getByLabel("利用日 必須", { exact: true }).fill("2099-12-16");
    await member.getByRole("combobox", { name: "開始時間 必須", exact: true }).selectOption("19:15");
    await member.getByLabel("人数 必須", { exact: true }).fill("2");
    await member.getByRole("button", { name: "お客様情報へ", exact: true }).click(); await capture(member, "member-booking-contact");
    await member.getByRole("checkbox", { name: /キャンセルポリシーを確認/ }).check();
    await member.getByRole("button", { name: "この内容で申請する", exact: true }).click();
    await member.getByRole("heading", { name: "予約申請を受け付けました", exact: true }).waitFor(); await capture(member, "member-booking-complete");
  });
  await attempt("member-group-booking", async () => {
    await member.goto(base + "/reserve"); await member.getByRole("button", { name: /旅行会社様専用 団体予約/ }).click();
    await member.getByRole("button", { name: "予約種別へ", exact: true }).click();
    await member.getByRole("button", { name: "日時へ", exact: true }).click();
    await member.getByLabel("利用日 必須", { exact: true }).fill("2099-12-17"); await member.getByRole("combobox", { name: "開始時間 必須", exact: true }).selectOption("12:00"); await member.getByLabel("人数 必須", { exact: true }).fill("20");
    await member.getByRole("button", { name: "お客様情報へ", exact: true }).click(); await capture(member, "member-group-booking");
  });
  await memberCtx.close();
}
