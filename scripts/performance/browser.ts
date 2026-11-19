import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { base, isolate } from "./browser-support";

async function main() {
  const label = process.argv[2] ?? "measurement";
  if (!/^[a-z0-9-]{1,60}$/.test(label)) throw new Error("Use an alphanumeric benchmark label.");
  await mkdir(".tmp/performance", { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const actionsOnly = process.argv[3] === "actions";
  const results: Record<string, unknown> = actionsOnly ? JSON.parse(await readFile(`.tmp/performance/${label}-browser.json`, "utf8")) : {};
  results.browser = browser.version();
  try {
    const cold = async (name: string, path: string, ready: (page: Page) => Promise<unknown>) => {
      const samples = [];
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
        await isolate(context);
        const page = await context.newPage();
        page.setDefaultNavigationTimeout(120000);
        page.setDefaultTimeout(60000);
        const responses: { path: string; bytes: number }[] = [];
        page.on("response", response => {
          if (new URL(response.url()).origin === base && response.request().resourceType() === "script") {
            void response.body().then(body => responses.push({ path: new URL(response.url()).pathname, bytes: body.length })).catch(() => {});
          }
        });
        const start = performance.now();
        await page.goto(base + path, { waitUntil: "domcontentloaded" });
        await ready(page);
        const readyMs = performance.now() - start;
        await page.waitForLoadState("networkidle");
        const navigation = await page.evaluate(() => {
          const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
          return { ttfb: nav.responseStart, domContentLoaded: nav.domContentLoadedEventEnd, fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null };
        });
        samples.push({ readyMs, ...navigation, jsBytes: responses.reduce((sum, item) => sum + item.bytes, 0), jsRequests: responses.length, scripts: responses });
        if (i === 4) await page.screenshot({ path: `.tmp/performance/${label}-${name}.jpg`, fullPage: true });
        await context.close();
      }
      results[name] = samples;
      console.log(name, JSON.stringify(samples.map(({ scripts: _scripts, ...sample }) => { void _scripts; return sample; })));
    };
    if (!actionsOnly) {
    await cold("reservation-entry", "/reserve", page => page.getByRole("heading", { name: "利用者区分を選択", exact: true }).waitFor());
    await cold("customer-login", "/login", page => page.getByRole("button", { name: "ログイン", exact: true }).last().waitFor());
    await cold("contact", "/contact", page => page.getByRole("heading").first().waitFor());
    await cold("admin-login", "/", page => page.getByText("管理画面ログイン", { exact: true }).waitFor());
    }
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    await isolate(context);
    const page = await context.newPage();
    const apiCalls: string[] = [];
    page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls.push(new URL(request.url()).pathname); });
    await page.goto(base);
    await page.getByLabel("メールアドレス", { exact: true }).fill("admin@example.test");
    await page.getByLabel("パスワード", { exact: true }).fill("fixture-password");
    const start = performance.now();
    await page.getByRole("button", { name: "ログイン", exact: true }).click();
    await page.waitForResponse(response => response.url().includes("/api/admin/screen") && response.ok());
    results["admin-auth-to-data"] = { ms: performance.now() - start, calls: [...apiCalls] };
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `.tmp/performance/${label}-dashboard.jpg`, fullPage: true });
    // Keep an inspectable snapshot when selectors change; these are synthetic records only.
    await writeFile(`.tmp/performance/${label}-admin.html`, await page.content());
    const paint = () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const operation = async (name: string, work: () => Promise<unknown>, prepare?: () => Promise<unknown>, finish?: () => Promise<unknown>) => {
      const samples = [];
      for (let i = 0; i < 5; i++) {
        await prepare?.();
        const before = apiCalls.length, start = performance.now();
        await work(); await paint();
        samples.push({ ms: performance.now() - start, calls: apiCalls.slice(before) });
        await finish?.();
      }
      results[name] = samples; console.log(name, JSON.stringify(samples));
    };
    const nav = page.getByRole("navigation", { name: "管理メニュー" });
    await operation("list-navigation", async () => {
      await Promise.all([
        page.waitForResponse(response => response.url().endsWith("/api/admin/reservations") && response.ok()),
        nav.getByRole("button", { name: "予約一覧", exact: true }).click(),
      ]);
      await page.getByRole("button", { name: /RSV-\d+の予約詳細を開く/ }).first().waitFor();
    }, async () => {
      const dashboard = nav.getByRole("button", { name: "ダッシュボード", exact: true });
      if (await dashboard.getAttribute("aria-current") !== "page") await Promise.all([
        page.waitForResponse(response => response.url().includes("/api/admin/screen?view=dashboard") && response.ok()), dashboard.click(),
      ]);
      await paint();
    });
    await operation("reservation-detail", async () => {
      await page.getByRole("button", { name: /RSV-\d+の予約詳細を開く/ }).first().click();
      await page.getByRole("dialog").waitFor();
    }, undefined, async () => {
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
    });
    await page.screenshot({ path: `.tmp/performance/${label}-list.jpg`, fullPage: true });
    await writeFile(`.tmp/performance/${label}-list.html`, await page.content());
    await operation("list-search", async () => {
      const search = page.getByRole("textbox").first();
      await Promise.all([
        page.waitForResponse(response => response.url().endsWith("/api/admin/reservations") && response.ok()),
        search.fill(await search.inputValue() ? "" : "計測0001"),
      ]);
    });
    const calendarStart = performance.now(), callsBeforeCalendar = apiCalls.length;
    await Promise.all([
      page.waitForResponse(response => response.url().includes("/api/admin/calendar") && response.ok()),
      nav.getByRole("button", { name: "予約カレンダー", exact: true }).click(),
    ]);
    await page.getByLabel("表示月", { exact: true }).waitFor(); await paint();
    results["calendar-navigation"] = { ms: performance.now() - calendarStart, calls: apiCalls.slice(callsBeforeCalendar) };
    results["server"] = await (await context.request.get(`${base}/__performance`)).json();
    await context.close();
    const authSamples = [];
    for (let i = 0; i < 5; i++) {
      const authContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
      await isolate(authContext);
      const authPage = await authContext.newPage();
      await authPage.goto(base);
      await authPage.getByLabel("メールアドレス", { exact: true }).fill("admin@example.test");
      await authPage.getByLabel("パスワード", { exact: true }).fill("fixture-password");
      const start = performance.now();
      await Promise.all([authPage.waitForResponse(r => r.url().includes("/api/admin/screen") && r.ok()), authPage.getByRole("button", { name: "ログイン", exact: true }).click()]);
      const responseMs = performance.now() - start;
      await authPage.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      authSamples.push({ responseMs, paintMs: performance.now() - start });
      await authContext.close();
    }
    results["admin-auth-warm"] = authSamples;
    await writeFile(`.tmp/performance/${label}-browser.json`, JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
