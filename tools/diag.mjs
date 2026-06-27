// Diagnose stage scaling + audio state in real Chrome.
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev";
const URL = "http://localhost:8788/index.html";

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader",
         "--autoplay-policy=no-user-gesture-required"]
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
let mp3 = 0;
page.on("request", r => { if (r.url().endsWith(".mp3")) mp3++; });

await page.goto(URL, { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 9000));
await page.mouse.click(640, 360);
await new Promise(r => setTimeout(r, 3000));

const info = await page.evaluate(() => {
  const s = window.Laya && Laya.stage;
  const ac = (window.Laya && Laya.SoundManager && Laya.SoundManager.ctx)
           || (window.AudioContext && window.__lac);
  return {
    hasLaya: !!window.Laya,
    scaleMode: s && s.scaleMode, screenMode: s && s.screenMode,
    alignH: s && s.alignH, alignV: s && s.alignV,
    stageW: s && s.width, stageH: s && s.height,
    canvas: (function(){ const c=document.querySelector("canvas"); return c?{w:c.width,h:c.height,cssW:c.style.width,cssH:c.style.height}:null; })(),
    soundMgr: !!(window.Laya && Laya.SoundManager),
    musicMuted: window.Laya && Laya.SoundManager && Laya.SoundManager.musicMuted,
    soundMuted: window.Laya && Laya.SoundManager && Laya.SoundManager.soundMuted,
    audioCtxState: (function(){ try { return Laya.SoundManager._musicChannel && "has-channel"; } catch(e){ return "n/a"; } })(),
  };
});

console.log("mp3 requests:", mp3);
console.log(JSON.stringify(info, null, 2));

// resize test: shrink window, see if canvas re-fits
await page.setViewport({ width: 800, height: 900 }); // portrait-ish
await new Promise(r => setTimeout(r, 1500));
const after = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  const s = window.Laya && Laya.stage;
  return { canvas: c?{w:c.width,h:c.height,cssW:c.style.width,cssH:c.style.height}:null, stageW:s&&s.width, stageH:s&&s.height, screenMode:s&&s.screenMode };
});
console.log("after resize to 800x900:", JSON.stringify(after));
await page.screenshot({ path: "tools/diag-resized.png" });
await browser.close();
