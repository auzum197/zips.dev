const { chromium } = require("playwright-core") as typeof import("playwright-core");

const candidates = [
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
];
(async () => {
    let browser: import("playwright-core").Browser | null = null;
    for (const exe of candidates) {
        try {
            browser = await chromium.launch({
                executablePath: exe,
                headless: true,
                args: ["--no-sandbox"],
            });
            console.error("launched:", exe);
            break;
        }
        catch (e) {
            console.error("failed:", exe, String(e).slice(0, 120));
        }
    }
    if (!browser)
        process.exit(1);
    const page = await browser.newPage();
    page.on("console", (m) => console.log("CONSOLE[" + m.type() + "]", m.text().slice(0, 500)));
    page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 800)));
    page.on("requestfailed", (r) => console.log("REQFAIL", r.url(), r.failure()?.errorText));
    page.on("response", (r) => {
        if (r.status() >= 400)
            console.log("HTTP" + r.status(), r.url());
    });
    const url = process.argv[2] ?? "http://localhost:3000/zip/32/";
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => {
        console.log("GOTO-ERR", String(e).slice(0, 300));
        return null;
    });
    if (resp)
        console.log("STATUS", resp.status());
    await page.waitForTimeout(2500);
    const title = await page.title().catch(() => "?");
    console.log("TITLE", title);
    await browser.close();
})();
