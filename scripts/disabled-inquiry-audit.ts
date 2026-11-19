import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { base, isolate } from "./performance/browser-support";
import { fixtureToken } from "./performance/tokens";

/** Only the existing disposable performance fixture; never configured environment accounts. */
async function main() {
  const status = await fetch(`${base}/__performance`).then(response => response.json());
  assert.ok(["production", "development"].includes(status.mode) && Number.isSafeInteger(status.size));
  const folder = ".tmp/residual-review/disabled-inquiry-ui";
  await mkdir(folder, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const records: object[] = [];
  try {
    const headers = { authorization: `Bearer ${fixtureToken(true)}`, origin: base };
    const accounts = await browser.newContext();
    const listed = await accounts.request.get(`${base}/api/accounts`, { headers });
    assert.equal(listed.status(), 200);
    const customer = (await listed.json()).accounts.find((row: { firebaseUid: string }) => row.firebaseUid === "calendar-test-user");
    assert.ok(customer?.id && customer.active);
    const reactivate = async () => {
      const result = await accounts.request.post(`${base}/api/accounts/${customer.id}/reactivate`, { headers });
      assert.equal(result.status(), 200, await result.text());
    };
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
      await isolate(context);
      const page = await context.newPage();
      try {
        await page.goto(`${base}/login`);
        await page.getByLabel("メールアドレス", { exact: true }).fill("member@example.test");
        await page.getByLabel("パスワード", { exact: true }).fill("fixture-password");
        await page.getByRole("button", { name: "ログイン", exact: true }).click();
        await page.getByRole("heading", { name: "お手続きを選択" }).waitFor();
        await page.goto(`${base}/contact`);
        await page.getByLabel(/問い合わせ種別/).selectOption("other");
        await page.getByLabel(/^氏名/).fill("検証利用者");
        await page.getByLabel(/^メールアドレス/).fill("disabled-test@example.test");
        await page.getByLabel(/^件名/).fill("無効化時の入力保持");
        await page.getByLabel(/^問い合わせ内容/).fill("無効化前に入力した内容");
        const send = page.getByRole("button", { name: "問い合わせを送信", exact: true });
        await send.waitFor();
        const disabled = await accounts.request.delete(`${base}/api/accounts/${customer.id}`, { headers });
        assert.equal(disabled.status(), 204);
        const denied = page.waitForResponse(response => response.url() === `${base}/api/inquiries` && response.request().method() === "POST");
        await send.click();
        assert.equal((await denied).status(), 403);
        await page.getByText(/このアカウントは無効化されています/).waitFor();
        assert.equal(await page.getByLabel(/^問い合わせ内容/).inputValue(), "無効化前に入力した内容");
        await page.screenshot({ path: `${folder}/submission-${width}.png`, fullPage: true });
        await page.goto(`${base}/contact/history`);
        await page.getByText(/このアカウントは無効化されています/).waitFor();
        assert.equal(await page.getByRole("link", { name: /^INQ-/ }).count(), 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: `${folder}/history-${width}.png`, fullPage: true });
        await reactivate();
        await page.reload();
        await page.getByRole("link", { name: /^INQ-/ }).first().waitFor();
        await page.screenshot({ path: `${folder}/reactivated-${width}.png`, fullPage: true });
        records.push({ width, submission: 403, history: "blocked", inputPreserved: true, reactivatedHistory: "visible" });
      } finally { await reactivate(); await context.close(); }
    }
    await accounts.close();
  } finally {
    await writeFile(`${folder}/results.json`, JSON.stringify(records, null, 2));
    await browser.close();
  }
  console.log(`Verified disabled inquiry flows at ${records.length} widths.`);
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
