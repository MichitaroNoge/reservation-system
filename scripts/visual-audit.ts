import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { base, isolate } from "./performance/browser-support";
import { auditExtraScreens } from "./visual-audit-extra";
import { measureFormLayout } from "./visual-audit-layout";

/** Uses only the local, isolated fixture server. No real accounts or external writes. */
async function main() {
  const label = process.argv[2] ?? "typography";
  if (!/^[a-z0-9-]{1,60}$/.test(label)) throw new Error("Use an alphanumeric label.");
  const folder = `.tmp/visual-audit/${label}`;
  await mkdir(folder, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const records: Record<string, unknown>[] = [], failures: object[] = [];
  const requests: { path: string; status: number }[] = [];
  const context = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    await isolate(ctx);
    return ctx;
  };
  const prepare = (page: Page) => {
    page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(120000);
    page.on("response", response => { const url = new URL(response.url()); if (url.origin === base && (url.pathname.startsWith("/api/") || response.request().resourceType() === "font")) requests.push({ path: url.pathname, status: response.status() }); });
  };
  const capture = async (page: Page, name: string) => {
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.locator("h1,h2,h3").first().waitFor();
    await page.waitForFunction(() => ![...document.querySelectorAll("body *")].some(el => {
      const text = el.textContent?.trim() ?? "";
      return el.getBoundingClientRect().width > 0 && text.length < 100 && /(?:読み込み中|読み込んでいます|取得中|ログイン状態を確認しています|準備をしています)[.…]*$/.test(text);
    }), undefined, { timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    if (name === "admin-login" || name === "booking-schedule") {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
      const domDocument = await cdp.send("DOM.getDocument");
      const fonts = [];
      for (const selector of ["h1", "h2", "label", "button"]) {
        const node = await cdp.send("DOM.querySelector", { nodeId: domDocument.root.nodeId, selector });
        if (node.nodeId) fonts.push({ selector, ...await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId }) });
      }
      await writeFile(`${folder}/${name}-fonts.json`, JSON.stringify({ fonts, loadedFaces: await page.evaluate(() => [...document.fonts].filter(face => face.status === "loaded").map(face => ({ family: face.family, weight: face.weight, status: face.status }))) }, null, 2));
      await cdp.detach();
    }
    for (const width of [1280, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const metrics = await page.evaluate(() => {
        const weights: Record<string, number> = {};
        const clipped: object[] = [], outside: object[] = [];
        for (const el of document.querySelectorAll<HTMLElement>("body *")) {
          if (["SVG", "PATH", "STYLE", "SCRIPT", "OPTION"].includes(el.tagName) || el.closest("[hidden],[aria-hidden=true],.sr-only")) continue;
          const rect = el.getBoundingClientRect(), css = getComputedStyle(el);
          if (!rect.width || !rect.height || css.visibility === "hidden" || css.display === "none") continue;
          if (el.childNodes.length && [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())) weights[css.fontWeight] = (weights[css.fontWeight] ?? 0) + 1;
          if (el.matches("button,label,h1,h2,h3,p,dt,dd") && !el.querySelector("input,select,textarea") && !el.closest("[role=grid]")) {
            if ((css.overflowX === "hidden" || css.overflowY === "hidden") && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) clipped.push({ tag: el.tagName, text: el.textContent?.trim().slice(0, 90), class: el.getAttribute("class")?.slice(0, 140) });
          }
          if (rect.right > innerWidth + 2 && !el.closest("table,[data-density],[role=grid],.table-wrap")) outside.push({ tag: el.tagName, text: el.textContent?.trim().slice(0, 90), class: el.getAttribute("class")?.slice(0, 140) });
        }
        return { font: getComputedStyle(document.body).fontFamily, synthesis: getComputedStyle(document.body).fontSynthesisWeight, weights, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, clipped: clipped.slice(0, 25), outside: outside.slice(0, 20), heading: [...document.querySelectorAll("h1,h2")].map(e => e.textContent), height: document.documentElement.scrollHeight };
      });
      await page.screenshot({ path: `${folder}/${name}-${width}.jpg` });
      if (width === 390 && await page.getByRole("dialog").count()) {
        const scrolled = await page.getByRole("dialog").last().evaluate(dialog => {
          const scroller = [dialog, ...dialog.querySelectorAll<HTMLElement>("*")].find(el => el.scrollHeight > el.clientHeight + 150 && /auto|scroll/.test(getComputedStyle(el).overflowY));
          if (!scroller) return false;
          scroller.scrollTop = scroller.scrollHeight; return true;
        });
        if (scrolled) await page.screenshot({ path: `${folder}/${name}-${width}-dialog-bottom.jpg` });
        await page.getByRole("dialog").last().evaluate(dialog => { for (const el of [dialog, ...dialog.querySelectorAll("*")]) el.scrollTop = 0; });
      }
      records.push({ name, width, url: page.url(), ...metrics, formIssues: await page.evaluate(measureFormLayout) });
      if (width === 390 && metrics.height > 1600 && !await page.getByRole("dialog").count()) {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.screenshot({ path: `${folder}/${name}-${width}-bottom.jpg` });
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    console.log("Captured", name);
    await writeFile(`${folder}/results.json`, JSON.stringify({ records, failures, requests }, null, 2));
  };
  const attempt = async (name: string, work: () => Promise<void>) => {
    const selected = process.argv.find(argument => argument.startsWith("--only="))?.slice(7);
    if (selected && selected !== name) return;
    try { await work(); } catch (error) { failures.push({ name, error: error instanceof Error ? error.message : String(error) }); console.log("UNVERIFIED", name, String(error).slice(0, 180)); }
  };
  try {
    if (process.argv.includes("--extra")) { await auditExtraScreens({ context, prepare, capture, attempt }); return; }
    const adminCtx = await context(), admin = await adminCtx.newPage(); prepare(admin);
    await admin.goto(base); await admin.getByLabel("メールアドレス", { exact: true }).waitFor(); await capture(admin, "admin-login");
    await admin.getByLabel("メールアドレス", { exact: true }).fill("admin@example.test");
    await admin.getByLabel("パスワード", { exact: true }).fill("fixture-password");
    await Promise.all([admin.waitForResponse(r => r.url().includes("/api/admin/screen") && r.ok()), admin.getByRole("button", { name: "ログイン", exact: true }).click()]);
    await capture(admin, "admin-dashboard");
    const nav = async (title: string) => { await admin.setViewportSize({ width: 1280, height: 900 }); await admin.getByRole("navigation", { name: "管理メニュー" }).getByRole("button", { name: new RegExp(`^${title}`) }).click(); };
    const close = async () => { while (await admin.getByRole("dialog").count()) { const id = await admin.getByRole("dialog").last().getAttribute("id"); await admin.keyboard.press("Escape"); if (id) await admin.locator(`[id="${id}"]`).waitFor({ state: "hidden" }); } };
    for (const [name, title] of Object.entries({ reservations: "予約一覧", inquiries: "問い合わせ管理", calendar: "予約カレンダー", approvals: "予約承認", confirmed: "本予約変更承認", changes: "予約変更承認", cancellations: "キャンセル承認", contacts: "確認連絡", assignments: "店舗割当", reminders: "本予約の催促", menus: "メニュー確定の催促", masters: "マスタ・設定" })) {
      await attempt(`admin-${name}`, async () => {
        await nav(title); await capture(admin, `admin-${name}`);
        if (name === "reservations") {
          await admin.getByRole("button", { name: "新規登録", exact: true }).click(); await admin.getByRole("dialog").waitFor(); await capture(admin, "admin-booking-new"); await close();
          await admin.getByRole("button", { name: /RSV-\d+の予約詳細を開く/ }).first().click(); await admin.getByRole("dialog").waitFor(); await capture(admin, "admin-booking-detail"); await close();
          const csv = admin.getByRole("button", { name: "CSV出力", exact: true }); if (await csv.count()) { await csv.click(); await capture(admin, "admin-csv"); }
        }
        if (["approvals", "confirmed", "changes", "cancellations", "assignments"].includes(name)) {
          const row = admin.locator("main tbody tr").first();
          if (await row.count()) {
            const button = row.getByRole("button").first();
            if (await button.count()) await button.click(); else await row.click();
            await admin.getByRole("dialog").waitFor(); await capture(admin, `admin-${name}-detail`);
            const confirm = admin.getByRole("button", { name: "承認内容を確認", exact: true });
            if (await confirm.count() && await confirm.isEnabled()) { await confirm.click(); await capture(admin, `admin-${name}-confirm`); }
            await close();
          }
        }
        if (name === "inquiries") {
          const row = admin.locator("main tbody tr").first();
          if (await row.count()) { await row.click(); await admin.getByRole("dialog").waitFor(); await capture(admin, "admin-inquiry-detail"); await close(); }
        }
      });
    }
    for (const [name, title] of Object.entries({ customers: "顧客管理", stores: "店舗管理", menus: "メニュー管理", email: "メールテンプレート管理", replies: "問い合わせ回答テンプレート", notifications: "予約通知メール", google: "Googleカレンダー連携", settings: "その他" })) {
      await attempt(`master-${name}`, async () => {
        await nav("マスタ・設定"); await admin.getByRole("button", { name: title, exact: true }).click(); await capture(admin, `master-${name}`);
        const create = admin.getByRole("button", { name: /^(新規登録|テンプレートを追加|追加)$/ }).first();
        if (await create.count() && await create.isEnabled()) { await create.click(); await admin.getByRole("dialog").waitFor(); await capture(admin, `master-${name}-new`); await close(); }
        const edit = admin.getByRole("button", { name: "編集", exact: true }).first();
        if (await edit.count()) { await edit.click(); await admin.getByRole("dialog").waitFor(); await capture(admin, `master-${name}-edit`); await close(); }
      });
    }
    await adminCtx.close();
    const guestCtx = await context(), guest = await guestCtx.newPage(); prepare(guest);
    for (const [name, path] of Object.entries({ home: "/?customerMode=home", login: "/login", register: "/register", contact: "/contact", history: "/contact/history", detailGuard: "/contact/history/INQ-9999999999", accountGuard: "/customer/reservations", settingsGuard: "/?customerMode=settings", emailGuard: "/?customerMode=emailChange", deleteGuard: "/?customerMode=accountDeletion" })) {
      await attempt(`guest-${name}`, async () => { await guest.goto(base + path); await capture(guest, `guest-${name}`); });
    }
    await guest.goto(base + "/reserve"); await capture(guest, "booking-category");
    await guest.getByRole("button", { name: "予約種別へ", exact: true }).click(); await capture(guest, "booking-type");
    await guest.getByRole("button", { name: "日時へ", exact: true }).click(); await capture(guest, "booking-schedule");
    await guest.getByRole("button", { name: "お客様情報へ", exact: true }).click(); await capture(guest, "booking-validation");
    await guest.getByLabel("利用日 必須", { exact: true }).fill("2099-12-15");
    await guest.getByRole("combobox", { name: "開始時間 必須", exact: true }).selectOption("19:15");
    await guest.getByLabel("人数 必須", { exact: true }).fill("2");
    await guest.getByRole("button", { name: "お客様情報へ", exact: true }).click(); await capture(guest, "booking-auth");
    await guestCtx.close();
    const memberCtx = await context(), member = await memberCtx.newPage(); prepare(member);
    await member.goto(base + "/login"); await member.getByLabel("メールアドレス", { exact: true }).fill("member@example.test");
    await member.getByLabel("パスワード", { exact: true }).fill("fixture-password");
    await member.getByRole("button", { name: "ログイン", exact: true }).last().click();
    await member.getByRole("button", { name: /予約確認・変更・キャンセル/ }).waitFor(); await capture(member, "member-home");
    for (const [name, path] of Object.entries({ settings: "/?customerMode=settings", email: "/?customerMode=emailChange", deletion: "/?customerMode=accountDeletion", reservations: "/customer/reservations", contact: "/contact", history: "/contact/history", confirmedAlias: "/customer/confirmed-request", changeAlias: "/customer/change-request", cancellationAlias: "/customer/cancellation-request" })) {
      await attempt(`member-${name}`, async () => {
        await member.goto(base + path); await capture(member, `member-${name}`);
        if (name === "reservations") { await member.getByRole("button", { name: /^RSV-\d+の予約内容の詳細$/ }).first().click(); await member.getByRole("dialog").waitFor(); await capture(member, "member-reservation-detail"); await member.keyboard.press("Escape"); }
        if (name === "history") { const link = member.getByRole("link", { name: /^INQ-/ }).first(); if (await link.count()) { await link.click(); await member.getByRole("heading", { name: "問い合わせ詳細", exact: true }).waitFor(); await capture(member, "member-inquiry-detail"); } }
      });
    }
    await memberCtx.close();
  } finally {
    await writeFile(`${folder}/results.json`, JSON.stringify({ records, failures, requests }, null, 2));
    await browser.close();
    console.log(JSON.stringify({ captures: records.length, failures }));
    if (failures.length || records.some(record => record.pageOverflow || (Array.isArray(record.formIssues) && record.formIssues.length))) process.exitCode = 1;
  }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
