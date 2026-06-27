// Boot the materialized build in real Chrome (headless) and report what the
// engine actually does: console messages, page errors, and failed requests.
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:8788/index.html";
const CHROME = "/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"]
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

const logs = [], errors = [], failed = [];
page.on("console", m => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", e => errors.push(String(e)));
page.on("requestfailed", r => failed.push(`${r.failure()?.errorText} ${r.url()}`));
page.on("response", r => { if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url()}`); });

try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
} catch (e) {
  errors.push("goto: " + e.message);
}
await new Promise(r => setTimeout(r, 8000));          // initial load
await page.screenshot({ path: "tools/shot1-load.png" });
// user gesture: tap center a few times to start audio / advance screens
for (let i = 0; i < 3; i++) {
  await page.mouse.click(640, 360);
  await new Promise(r => setTimeout(r, 2500));
}
await page.screenshot({ path: "tools/shot2-tapped.png" });
await new Promise(r => setTimeout(r, 2000));

console.log("\n===== PAGE ERRORS =====");
console.log(errors.length ? errors.join("\n") : "(none)");
console.log("\n===== FAILED REQUESTS (first 30) =====");
console.log(failed.length ? [...new Set(failed)].slice(0, 30).join("\n") : "(none)");
console.log("\n===== CONSOLE (last 40) =====");
console.log(logs.slice(-40).join("\n") || "(none)");

await page.screenshot({ path: "tools/smoketest.png" });
console.log("\nscreenshot -> tools/smoketest.png");
await browser.close();
