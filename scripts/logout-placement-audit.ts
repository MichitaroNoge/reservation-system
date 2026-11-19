import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { base, isolate } from "./performance/browser-support";

async function main() {
  const folder = ".tmp/visual-audit/logout-placement";
  await mkdir(folder, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const records: object[] = [];
  try {
    for (const width of [1280, 768, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
      await isolate(context);
      const page = await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(120000);
      await page.goto(base + "/login");
      await page.getByLabel("メールアドレス", { exact: true }).fill("member@example.test"); await page.getByLabel("パスワード", { exact: true }).fill("fixture-password");
      await page.getByRole("button", { name: "ログイン", exact: true }).last().click();
      await page.getByRole("heading", { name: "お手続きを選択", exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "ログアウト", exact: true }).count(), 1);
      await page.getByRole("button", { name: /予約確認・変更・キャンセル/ }).click();
      await page.getByRole("heading", { name: "予約確認", exact: true }).waitFor();
      const detail = page.getByRole("button", { name: /^RSV-\d+の予約内容の詳細$/ }).first(); await detail.waitFor();
      assert.equal(await page.getByRole("button", { name: "ログアウト", exact: true }).count(), 0);
      assert.equal(await page.getByText("ログイン中", { exact: true }).count(), 0);
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `${folder}/reservations-${width}.jpg` });
      await detail.click(); await page.getByRole("dialog").waitFor(); await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "お手続きトップへ戻る", exact: true }).click();
      await page.getByRole("heading", { name: "お手続きを選択", exact: true }).waitFor();
      await page.screenshot({ path: `${folder}/home-${width}.jpg` });
      await page.getByRole("button", { name: "ログアウト", exact: true }).click();
      await page.getByRole("heading", { name: "仮想の店舗Webサイト", exact: true }).waitFor();
      await page.goto(base + "/customer/reservations");
      await page.getByRole("heading", { name: "予約確認", exact: true }).waitFor(); await page.getByRole("link", { name: "ログイン", exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: /^RSV-\d+の予約内容の詳細$/ }).count(), 0);
      await page.screenshot({ path: `${folder}/signed-out-${width}.jpg` });
      records.push({ width, logoutOnlyOnHome: true, reservationDetail: "passed", homeLogout: "passed", anonymousGuard: "passed" });
      await context.close();
    }
    await writeFile(`${folder}/results.json`, JSON.stringify(records, null, 2)); console.log(JSON.stringify(records));
  } finally { await browser.close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
