import { chromium } from "playwright";

const SCREENSHOTS = "screenshots";
const URL = "http://localhost:5173";

async function fillByLabel(page, labelText, value) {
  // Find label element containing text, then find adjacent input
  const label = page.locator(`label:has-text("${labelText}")`);
  const input = label.locator("input, textarea, select");
  await input.click();
  await input.fill("");
  await input.type(value, { delay: 15 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);

  // Screenshot 1: Initial blank form state
  await page.screenshot({ path: `${SCREENSHOTS}/01_blank_state.png`, fullPage: true });
  console.log("1/4: Blank state captured");

  // Fill form
  await fillByLabel(page, "客户姓名", "王思岚");
  await fillByLabel(page, "出行人数", "2");
  await fillByLabel(page, "出发城市", "广州");
  await fillByLabel(page, "目的地", "挪威奥斯陆、卑尔根、松恩峡湾、罗弗敦");
  await fillByLabel(page, "出发日期", "2026-09-18");
  await fillByLabel(page, "行程天数", "10");
  await fillByLabel(page, "人均预算", "78000");
  await fillByLabel(page, "出行偏好", "商务考察、摄影");
  await fillByLabel(page, "特殊需求", "需要安排酒店踩线和供应商拜访。");

  await page.waitForTimeout(500);

  // Click generate
  const btn = page.locator('button:has-text("生成方案")');
  await btn.click();
  await page.waitForTimeout(3000);

  // Screenshot 2: Full page after generation
  await page.screenshot({ path: `${SCREENSHOTS}/02_after_generate.png`, fullPage: true });
  console.log("2/4: After generate captured");

  // Screenshot 3: Three-tier cards — scroll to cards
  const sellingPoints = page.locator("text=档位定位说明");
  if (await sellingPoints.isVisible()) {
    await sellingPoints.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollBy(0, 180));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOTS}/03_three_tier_cards.png` });
  }
  console.log("3/4: Three-tier cards captured");

  // Screenshot 4: Cost section
  const costsTitle = page.locator("h3:has-text('费用计算')").first();
  if (await costsTitle.isVisible()) {
    await costsTitle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollBy(0, -250));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOTS}/04_cost_comparison.png` });
  }
  console.log("4/4: Cost comparison captured");

  await browser.close();
  console.log("Done — all 4 screenshots saved to screenshots/");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
