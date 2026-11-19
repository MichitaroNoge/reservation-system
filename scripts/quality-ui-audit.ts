import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { base, isolate } from "./performance/browser-support";

/** Real screens and API handlers, using the existing isolated fixture server only. */
async function main() {
  const baseline = process.argv.includes("--baseline");
  const customers = process.argv.includes("--customers");
  const folder = `.tmp/quality-review/ui-${customers ? "customers-" : ""}${baseline ? "before" : "after"}`;
  await mkdir(folder, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const records: object[] = [];
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
      await isolate(context);
      const page = await context.newPage();
      page.on("pageerror", error => console.error("Browser error", error.message));
      page.on("response", response => { if (response.status() >= 400) console.error("HTTP failure", new URL(response.url()).pathname, response.status()); });
      page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(120000);
      await page.goto(base);
      await page.getByLabel("メールアドレス", { exact: true }).fill("admin@example.test");
      await page.getByLabel("パスワード", { exact: true }).fill("fixture-password");
      await Promise.all([
        page.waitForResponse(r => r.url().includes("/api/admin/screen") && r.ok()).catch(async error => {
          await page.screenshot({ path: `${folder}/login-failure-${width}.png` });
          console.error(await page.locator("body").innerText());
          throw error;
        }),
        page.getByRole("button", { name: "ログイン", exact: true }).click(),
      ]);
      const nav = page.getByRole("navigation", { name: "管理メニュー" });
      if (width < 1024) await page.getByRole("button", { name: "メニュー", exact: true }).click();
      if (customers) {
        await nav.getByRole("button", { name: "マスタ・設定", exact: true }).click();
        await page.getByRole("button", { name: "顧客管理", exact: true }).click();
        await page.getByRole("button", { name: "編集", exact: true }).first().click();
        const editor = page.getByRole("dialog", { name: "顧客情報を編集", exact: true });
        await editor.getByLabel(/^電話番号/).fill("123");
        let requests = 0;
        page.on("request", request => { if (request.method() === "PUT" && new URL(request.url()).pathname.startsWith("/api/accounts/")) requests++; });
        if (baseline) {
          const [response] = await Promise.all([
            page.waitForResponse(r => r.request().method() === "PUT" && new URL(r.url()).pathname.startsWith("/api/accounts/")),
            editor.getByRole("button", { name: "保存する", exact: true }).click(),
          ]);
          assert.equal(response.status(), 400);
          assert.notEqual(await editor.getByLabel(/^電話番号/).getAttribute("aria-invalid"), "true");
        } else {
          await editor.getByRole("button", { name: "保存する", exact: true }).click();
          await editor.getByRole("alert").filter({ hasText: /電話番号/ }).waitFor();
          assert.equal(await editor.getByLabel(/^電話番号/).getAttribute("aria-invalid"), "true");
          assert.equal(requests, 0, "invalid phone numbers must be explained at the field before sending");
        }
        await page.screenshot({ path: `${folder}/phone-${width}.png` });
        records.push({ width, operation: "invalid-customer-phone", requests, fieldInvalid: await editor.getByLabel(/^電話番号/).getAttribute("aria-invalid") });
        await editor.getByLabel(/^電話番号/).fill("09012345678");
        const [saved] = await Promise.all([
          page.waitForResponse(r => r.request().method() === "PUT" && new URL(r.url()).pathname.startsWith("/api/accounts/")),
          editor.getByRole("button", { name: "保存する", exact: true }).click(),
        ]);
        assert.equal(saved.status(), 200, await saved.text());
        await editor.waitFor({ state: "hidden" });
        await context.close();
        continue;
      }
      await nav.getByRole("button", { name: "予約一覧", exact: true }).click();
      await page.getByRole("button", { name: "新規登録", exact: true }).click();
      const create = page.getByRole("dialog", { name: "新規予約", exact: true });
      await create.getByLabel(/^お名前/).fill(`品質レビュー${width}`);
      await create.getByLabel(/^メールアドレス/).fill("quality@example.test");
      await create.getByLabel(/^電話番号/).fill("09000000000");
      await create.getByLabel(/^利用日/).fill("2099-12-15");
      await create.getByLabel(/^人数/).fill("2");
      await create.getByLabel(/^開始時間/).fill("19:07");
      await create.getByLabel(/^終了時間/).fill("");
      const [response] = await Promise.all([
        page.waitForResponse(r => new URL(r.url()).pathname === "/api/reservations" && r.request().method() === "POST"),
        create.getByRole("button", { name: "予約を登録する", exact: true }).click(),
      ]);
      const body = await response.json();
      records.push({ width, operation: "create-with-empty-optional-end", status: response.status(), body });
      if (baseline) {
        assert.equal(response.status(), 400);
        await page.screenshot({ path: `${folder}/create-${width}.png` });
        await create.getByLabel(/^終了時間/).fill("20:47");
        const [retry] = await Promise.all([
          page.waitForResponse(r => new URL(r.url()).pathname === "/api/reservations" && r.request().method() === "POST"),
          create.getByRole("button", { name: "予約を登録する", exact: true }).click(),
        ]);
        assert.equal(retry.status(), 201, await retry.text());
      } else {
        assert.equal(response.status(), 201, JSON.stringify(body));
        assert.equal(body.reservation.startTime, "19:07");
        assert.equal(body.reservation.endTime, "19:52");
      }
      await create.waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "予約内容を編集", exact: true }).click();
      const edit = page.getByRole("dialog").last();
      await edit.getByLabel(/^終了時間/).fill("");
      const [updated] = await Promise.all([
        page.waitForResponse(r => /\/api\/reservations\/RSV-\d+$/.test(new URL(r.url()).pathname) && r.request().method() === "PATCH"),
        edit.getByRole("button", { name: /保存/ }).click(),
      ]);
      const updatedBody = await updated.json();
      records.push({ width, operation: "edit-with-empty-optional-end", status: updated.status(), body: updatedBody });
      assert.equal(updated.status(), baseline ? 400 : 200, JSON.stringify(updatedBody));
      if (!baseline) {
        assert.equal(updatedBody.reservation.endTime, "19:52");
        assert.equal(updatedBody.reservation.people, 2);
      }
      await page.screenshot({ path: `${folder}/edit-${width}.png` });
      await context.close();
    }
  } finally {
    await writeFile(`${folder}/results.json`, JSON.stringify(records, null, 2));
    await browser.close();
  }
  console.log(`Verified ${records.length} ${customers ? "customer validation" : "reservation form"} operations (${baseline ? "before" : "after"}).`);
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
