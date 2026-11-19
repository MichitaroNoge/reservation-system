import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { base, isolate } from "./performance/browser-support";

async function main() {
  const folder = ".tmp/visual-audit/heading-focus";
  await mkdir(folder, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const records: object[] = [];
  const heading = async (page: Page, title: string, name: string) => {
    const target = page.getByRole("heading", { name: title, exact: true });
    await target.waitFor();
    await page.waitForFunction(text => document.activeElement?.tagName === "H1" && document.activeElement.textContent === text, title);
    const style = await target.evaluate(el => ({ title: el.textContent, active: document.activeElement === el, tabIndex: el.tabIndex, outline: getComputedStyle(el).outlineStyle, shadow: getComputedStyle(el).boxShadow }));
    assert.equal(style.active, true, "Keep the navigation announcement target");
    assert.equal(style.tabIndex, -1);
    assert.equal(style.outline, "none"); assert.equal(style.shadow, "none", "Non-interactive title must not have a blue ring");
    records.push({ name, ...style });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${folder}/${name}.jpg` });
  };
  try {
    for (const [width, keyboardLogin] of [[1280, false], [768, false], [390, false], [1280, true]] as const) {
      const label = `${width}-${keyboardLogin ? "keyboard" : "pointer"}`;
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
      await isolate(context);
      const page = await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(120000);
      await page.goto(base + "/login");
      await page.getByLabel("メールアドレス", { exact: true }).fill("member@example.test"); await page.getByLabel("パスワード", { exact: true }).fill("fixture-password");
      if (keyboardLogin) await page.getByLabel("パスワード", { exact: true }).press("Enter"); else await page.getByRole("button", { name: "ログイン", exact: true }).last().click();
      await heading(page, "お手続きを選択", `home-${label}`);
      await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => button.textContent?.startsWith("予約申請") && !button.disabled));
      await page.keyboard.press("Tab");
      const focus = await page.evaluate(() => {
        const el = document.activeElement!;
        return { tag: el.tagName, text: el.textContent, visible: el.matches(":focus-visible"), shadow: getComputedStyle(el).boxShadow, ring: getComputedStyle(el).getPropertyValue("--tw-ring-shadow") };
      });
      assert.equal(focus.tag, "BUTTON"); assert.match(focus.text ?? "", /^予約申請/); assert.equal(focus.visible, true); assert.match(focus.ring, /2px/, "Keyboard focus must remain visible on actions");
      records.push({ name: `tab-${label}`, ...focus });
      await page.screenshot({ path: `${folder}/tab-${label}.jpg` });
      await page.getByRole("button", { name: /^予約申請/ }).click(); await heading(page, "利用者区分を選択", `booking-${label}`);
      await page.getByRole("button", { name: "予約種別へ", exact: true }).click(); await heading(page, "予約種別を選択", `booking-type-${label}`);
      await context.close();
    }
    await writeFile(`${folder}/results.json`, JSON.stringify(records, null, 2));
    console.log(JSON.stringify({ assertions: records.length, headingsWithoutRing: 12, keyboardActionsWithRing: 4 }));
  } finally { await browser.close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
