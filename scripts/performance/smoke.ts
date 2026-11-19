import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { base, isolate } from "./browser-support";

async function main() {
  const label = process.argv[2] ?? "smoke";
  if (!/^[a-z0-9-]{1,60}$/.test(label)) throw new Error("Use an alphanumeric label.");
  await mkdir(".tmp/performance", { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results: Record<string, unknown> = {};
  let page: Page | undefined;
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    await isolate(context);
    await context.addInitScript(() => {
      const sample = { commits: 0, longTasks: [] as number[] };
      Object.defineProperty(window, "__performanceSample", { value: sample });
      Object.defineProperty(window, "__REACT_DEVTOOLS_GLOBAL_HOOK__", { value: {
        supportsFiber: true, renderers: new Map(), inject: () => 1,
        onCommitFiberRoot: () => { sample.commits++; }, onCommitFiberUnmount: () => {},
      } });
      new PerformanceObserver(list => { sample.longTasks.push(...list.getEntries().map(entry => entry.duration)); }).observe({ type: "longtask", buffered: true });
    });
    page = await context.newPage();
    const calls: string[] = [];
    page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) calls.push(path); });
    await page.goto(base);
    await page.getByLabel("メールアドレス", { exact: true }).fill("admin@example.test");
    await page.getByLabel("パスワード", { exact: true }).fill("fixture-password");
    await Promise.all([page.waitForResponse(r => r.url().includes("/api/admin/screen") && r.ok()), page.getByRole("button", { name: "ログイン", exact: true }).click()]);
    const nav = page.getByRole("navigation", { name: "管理メニュー" });
    await Promise.all([page.waitForResponse(r => r.url().endsWith("/api/admin/reservations") && r.ok()), nav.getByRole("button", { name: "予約一覧", exact: true }).click()]);
    const before = calls.length;
    await page.getByRole("button", { name: "新規登録", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "新規予約", exact: true });
    await dialog.waitFor(); await page.waitForLoadState("networkidle");
    results.newReservationCalls = calls.slice(before);
    console.log("newReservationCalls", JSON.stringify(results.newReservationCalls));
    await dialog.getByLabel(/^お名前/).fill("画面計測の予約");
    await dialog.getByLabel(/^メールアドレス/).fill("screen@example.test");
    await dialog.getByLabel(/^電話番号/).fill("09000000000");
    await dialog.getByLabel(/^利用日/).fill("2099-12-15");
    await dialog.getByLabel(/^開始時間/).fill("19:07");
    await dialog.getByLabel(/^人数/).fill("2");
    const saveStart = performance.now();
    const saved = await Promise.all([
      page.waitForResponse(r => r.url().endsWith("/api/reservations") && r.request().method() === "POST"),
      dialog.getByRole("button", { name: "予約を登録する", exact: true }).click(),
    ]);
    assert.equal(saved[0].status(), 201, await saved[0].text());
    results.registration = { ms: performance.now() - saveStart, reservation: (await saved[0].json()).reservation.id };
    await dialog.waitFor({ state: "hidden" });
    // Successful registration opens the saved reservation's details for review.
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const search = page.getByRole("textbox").first();
    const beforeTyping = calls.length;
    const beforeSample = await page.evaluate(() => ({ ...(window as unknown as { __performanceSample: { commits: number; longTasks: number[] } }).__performanceSample }));
    await Promise.all([
      page.waitForResponse(r => r.url().endsWith("/api/admin/reservations") && r.request().postDataJSON()?.search === "計測0002"),
      search.pressSequentially("計測0002", { delay: 30 }),
    ]);
    await page.waitForLoadState("networkidle");
    const searchCalls = calls.slice(beforeTyping).filter(path => path === "/api/admin/reservations");
    assert.equal(searchCalls.length, 1, "Rapid typing must remain debounced");
    results.rapidTypingRequests = searchCalls.length;
    const afterSample = await page.evaluate(() => (window as unknown as { __performanceSample: { commits: number; longTasks: number[] } }).__performanceSample);
    results.rapidTypingProfile = { commits: afterSample.commits - beforeSample.commits, longTasksMs: afterSample.longTasks.slice(beforeSample.longTasks.length) };
    await page.screenshot({ path: `.tmp/performance/${label}-admin-desktop.jpg` });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Admin page must contain horizontal scrolling within its table");
    await page.screenshot({ path: `.tmp/performance/${label}-admin-mobile.jpg` });
    await context.close();

    const customer = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    await isolate(customer); page = await customer.newPage();
    await page.goto(base + "/login");
    await page.getByLabel(/メールアドレス/).first().fill("member@example.test");
    await page.getByLabel(/パスワード/).first().fill("fixture-password");
    await page.getByRole("button", { name: "ログイン", exact: true }).last().click();
    await Promise.all([
      page.waitForResponse(r => r.url().includes("/api/accounts/me/reservations") && r.ok()),
      page.getByRole("button", { name: /予約確認・変更・キャンセル/ }).click(),
    ]);
    await page.getByRole("button", { name: /^RSV-\d+の予約内容の詳細$/ }).first().click();
    await page.getByRole("dialog").waitFor(); await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `.tmp/performance/${label}-customer-mobile.jpg` });
    results.customerAccountAndDetails = "passed";
    await customer.close();

    const guest = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await isolate(guest); page = await guest.newPage();
    await page.goto(base + "/reserve");
    await page.getByRole("button", { name: "予約種別へ", exact: true }).click();
    await page.getByRole("button", { name: "日時へ", exact: true }).click();
    await page.getByRole("button", { name: "お客様情報へ", exact: true }).click();
    await page.getByText("開始時間を入力してください。", { exact: true }).waitFor();
    const time = page.getByRole("combobox", { name: "開始時間 必須", exact: true });
    const options = await time.locator("option").evaluateAll(elements => elements.map(el => (el as HTMLOptionElement).value).filter(Boolean));
    assert.equal(options.length, 96);
    assert.ok(options.every(value => /:(00|15|30|45)$/.test(value)));
    await page.getByLabel("利用日 必須", { exact: true }).fill("2099-12-15");
    await time.selectOption("19:15");
    await page.getByLabel("人数 必須", { exact: true }).fill("2");
    await page.getByRole("button", { name: "お客様情報へ", exact: true }).click();
    await page.getByText("予約申請にはアカウントが必要です。ログインまたは新規登録して続けてください。", { exact: true }).waitFor();
    await page.getByRole("button", { name: "前の入力へ戻る", exact: true }).click();
    assert.equal(await time.inputValue(), "19:15");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `.tmp/performance/${label}-booking-mobile.jpg` });
    results.quarterHourBookingAndInputPreservation = "passed";
    await guest.close();
    await writeFile(`.tmp/performance/${label}-smoke.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: `.tmp/performance/${label}-error.jpg`, fullPage: true });
    throw error;
  } finally { await browser.close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
