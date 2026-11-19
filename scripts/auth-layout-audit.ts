import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { base, isolate } from "./performance/browser-support";
import { measureFormLayout } from "./visual-audit-layout";

async function main() {
  const label = process.argv[2] ?? "auth-layout";
  if (!/^[a-z0-9-]{1,60}$/.test(label)) throw new Error("Use an alphanumeric label.");
  const folder = `.tmp/visual-audit/${label}`;
  await mkdir(folder, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const records: object[] = [];
  let issueCount = 0;
  try {
    const context = await browser.newContext({ viewport: { width: 825, height: 900 }, serviceWorkers: "block" });
    await isolate(context);
    // The real widget is external. Only its width contract is simulated; no Google request is sent.
    await context.route(`${base}/api/auth/google/challenge`, route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ nonce: "layout-only", clientId: "layout-only" }) }));
    await context.route("https://accounts.google.com/gsi/client", route => route.fulfill({ contentType: "application/javascript", body: `window.google={accounts:{id:{initialize(){},cancel(){},renderButton(host,options){const button=document.createElement('button');button.type='button';button.textContent=options.text==='signup_with'?'Google で登録':'Google でログイン';button.style.cssText='height:32px;border:1px solid #dadce0;border-radius:4px;background:white;font:14px Arial';button.style.width=options.width+'px';host.appendChild(button);}}}};` }));
    const page = await context.newPage();
    page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(120000);
    const capture = async (name: string, target: Page = page) => {
      await target.evaluate(() => document.fonts.ready);
      for (const width of [1280, 1024, 825, 768, 720, 640, 639, 600, 480, 390, 360, 320]) {
        await target.setViewportSize({ width, height: 900 });
        await target.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        const issues = await target.evaluate(measureFormLayout);
        const submit = target.locator("form button[type=submit]").first();
        const alignment = await submit.evaluate(el => {
          const box = el.getBoundingClientRect(), form = el.closest("form")!, rect = form.getBoundingClientRect(), css = getComputedStyle(form);
          return { buttonRight: box.right, contentRight: rect.right - parseFloat(css.paddingRight) - parseFloat(css.borderRightWidth), buttonWidth: box.width, formWidth: rect.width };
        });
        issueCount += issues.length;
        records.push({ name, width, issues, alignment });
        await target.screenshot({ path: `${folder}/${name}-${width}.jpg` });
      }
    };
    await page.goto(base + "/login"); await page.getByRole("button", { name: "Google でログイン", exact: true }).waitFor(); await capture("login");
    await page.getByRole("button", { name: "ログイン", exact: true }).click();
    await page.getByLabel("メールアドレス", { exact: true }).getAttribute("aria-invalid").then(value => assert.equal(value, "true"));
    await capture("login-validation");
    await page.goto(base + "/register"); await page.getByRole("button", { name: "Google で登録", exact: true }).waitFor(); await capture("register");
    await page.getByRole("button", { name: "旅行会社の担当者様", exact: true }).click(); await capture("register-company");
    await page.goto(base + "/reserve");
    await page.getByRole("button", { name: "予約種別へ", exact: true }).click(); await page.getByRole("button", { name: "日時へ", exact: true }).click();
    await page.getByLabel("利用日 必須", { exact: true }).fill("2099-12-15"); await page.getByRole("combobox", { name: "開始時間 必須", exact: true }).selectOption("19:15"); await page.getByLabel("人数 必須", { exact: true }).fill("2");
    await page.getByRole("button", { name: "お客様情報へ", exact: true }).click(); await page.getByRole("button", { name: "Google でログイン", exact: true }).waitFor(); await capture("booking-login");
    await page.getByRole("button", { name: "新規登録", exact: true }).click(); await page.getByRole("button", { name: "Google で登録", exact: true }).waitFor(); await capture("booking-register");
    await context.close();
    const busyContext = await browser.newContext({ viewport: { width: 825, height: 900 }, serviceWorkers: "block" });
    await isolate(busyContext);
    let release = () => {};
    const pending = new Promise<void>(resolve => { release = resolve; });
    await busyContext.route(/identitytoolkit\.googleapis\.com\/v1\/accounts:signInWithPassword/, async route => { await pending; await route.fallback(); });
    const busyPage = await busyContext.newPage(); busyPage.setDefaultTimeout(30000);
    try {
      await busyPage.goto(base + "/login"); await busyPage.getByLabel("メールアドレス", { exact: true }).fill("member@example.test"); await busyPage.getByLabel("パスワード", { exact: true }).fill("fixture-password");
      await busyPage.getByRole("button", { name: "ログイン", exact: true }).click(); await busyPage.getByRole("button", { name: "確認中", exact: true }).waitFor();
      await capture("login-busy", busyPage);
      release(); await busyPage.getByRole("button", { name: /予約確認・変更・キャンセル/ }).waitFor();
    } finally { release(); await busyContext.close(); }
  } finally { await writeFile(`${folder}/results.json`, JSON.stringify({ issueCount, records }, null, 2)); await browser.close(); }
  console.log(JSON.stringify({ captures: records.length, issueCount }));
  if (!process.argv.includes("--baseline")) assert.equal(issueCount, 0, "Form controls must stay inside their column and must not overlap");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
