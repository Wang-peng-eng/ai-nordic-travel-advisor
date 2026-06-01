import { chromium } from "playwright";

const OUT = "docs/images";
const URL = "http://localhost:5173";
const VIEWPORT = { width: 1280, height: 900 };

async function fillByLabel(page, labelText, value) {
  const label = page.locator(`label:has-text("${labelText}")`);
  const input = label.locator("input, textarea, select");
  await input.click();
  await input.fill("");
  await input.type(value, { delay: 10 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });

  // Try port 5173, fallback to 5174
  let connected = false;
  for (const port of [5173, 5174, 5175, 5176]) {
    try {
      await page.goto(`http://localhost:${port}`, { waitUntil: "networkidle", timeout: 10000 });
      connected = true;
      console.log(`Connected on port ${port}`);
      break;
    } catch {
      console.log(`Port ${port} not available`);
    }
  }
  if (!connected) {
    console.error("Could not connect to dev server");
    process.exit(1);
  }

  await page.waitForTimeout(800);

  // ============================================================
  // 01-home.png — Blank home page showing title and input area
  // ============================================================
  // Reload to get clean blank state
  await page.goto(page.url(), { waitUntil: "networkidle", timeout: 10000 });
  await page.waitForTimeout(800);
  // Scroll to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: true });
  console.log("1/6: 01-home.png");

  // ============================================================
  // 02-form.png — Form filled but NOT generated
  // ============================================================
  // Fill the form with realistic test data
  await fillByLabel(page, "客户姓名", "陈思远");
  await fillByLabel(page, "出行人数", "4");
  await fillByLabel(page, "出发城市", "上海");
  await fillByLabel(page, "目的地", "冰岛雷克雅未克、南岸、瓦特纳冰川");
  await fillByLabel(page, "出发日期", "2026-10-08");
  await fillByLabel(page, "行程天数", "9");
  await fillByLabel(page, "人均预算", "48000");
  // Select hotel level
  const hotelSelect = page.locator('label:has-text("酒店偏好")').locator("select");
  await hotelSelect.selectOption("舒适型");
  await fillByLabel(page, "出行偏好", "自然风光、摄影、极光");
  await fillByLabel(page, "特殊需求", "其中一位客人不吃牛羊肉，需要中文司导和可退改酒店方案。");

  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // Take screenshot of the filled form area (without results)
  const formSection = page.locator("aside");
  await formSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  // Scroll up to show the full header + form
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/02-form.png`, fullPage: false });
  console.log("2/6: 02-form.png");

  // ============================================================
  // Generate plans
  // ============================================================
  const generateBtn = page.locator('button:has-text("生成方案")');
  await generateBtn.click();
  await page.waitForTimeout(3000);

  // ============================================================
  // 03-plans.png — Three-tier plans with recommendation badges
  // ============================================================
  const tierHeader = page.locator("text=三档方案对比");
  if (await tierHeader.isVisible()) {
    await tierHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    // Scroll down slightly to show the tier cards
    await page.evaluate(() => window.scrollBy(0, 120));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/03-plans.png` });
  }
  console.log("3/6: 03-plans.png");

  // ============================================================
  // 04-costs.png — Cost comparison / fee calculation
  // ============================================================
  const costsTitle = page.locator("h3:has-text('费用计算')").first();
  if (await costsTitle.isVisible()) {
    await costsTitle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollBy(0, -80));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/04-costs.png` });
  }
  console.log("4/6: 04-costs.png");

  // ============================================================
  // 05-itinerary.png — Itinerary Day1-DayN
  // ============================================================
  const itineraryTitle = page.locator("h3:has-text('景点规划')").first();
  if (await itineraryTitle.isVisible()) {
    await itineraryTitle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollBy(0, -60));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/05-itinerary.png` });
  }
  console.log("5/6: 05-itinerary.png");

  // ============================================================
  // 06-documents.png — Hotel confirmation or invitation letter
  // ============================================================
  // First try hotel confirmation (may be collapsed, click to expand)
  const hotelLetter = page.locator("h3:has-text('酒店确认函')").first();
  if (await hotelLetter.isVisible()) {
    // Click the header to expand if collapsed
    await hotelLetter.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    // Try clicking to expand
    await hotelLetter.click();
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollBy(0, -80));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/06-documents.png` });
  }
  console.log("6/6: 06-documents.png");

  await browser.close();
  console.log("Done — 6 screenshots saved to docs/images/");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
