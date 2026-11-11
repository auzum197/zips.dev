const { chromium } = require("playwright-core") as typeof import("playwright-core");

const exe = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
(async () => {
    const url = process.argv[2];
    const out = process.argv[3] ?? "shot.png";
    const fullPage = process.argv[4] === "full";
    const browser = await chromium.launch({ executablePath: exe, headless: true });
    const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: out, fullPage });
    console.log("saved", out);
    await browser.close();
})();
