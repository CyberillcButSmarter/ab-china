# AB China (愤怒的小鸟) — browser-playable restoration

A de-hooked, browser-runnable build of the **Angry Birds China** HTML5 mini-program
(developed by Talkweb, LayaAir engine). The original is a CDN dump of the WeChat
(`wx`) mini-program — the version with the most content — which can't run in a normal
browser as-is. This repo turns it into a static site that any web server (nginx)
can host, and ships a Docker/Dockge stack for it.

### Play it

- **Chinese (original):** https://ab-china.vercel.app/
- **English:** https://ab-china.vercel.app/en

## How this was made

This is a preservation project. The original is a delisted Chinese WeChat/SNS
mini-program that couldn't run outside those apps — no HTML entry, WeChat-only API
hooks, and content-hashed assets with no mapping layer. I tracked down the CDN dump,
worked out what was broken, and got it running as a plain static site, then deployed
it (self-hosted Docker/Dockge + Vercel) and tested every step in a real browser.

I used an AI assistant as a coding tool for the tedious implementation — the `wx`
API shim that neutralizes the WeChat hooks, the asset-mapping build script, and the
runtime translation layer. I directed the work and verified it all myself. It's
fully open-source, so everything it does is right here in the repo to read.

**`public/` is committed and playable as-is** — you only need the original files
below if you want to regenerate it from scratch.

### Source & credits

- **Original CDN dump:** https://archive.org/details/angrybirdsmp — the official
  and obscure mini-program builds of AB China by Talkweb (multiple folders, one per
  Chinese SNS platform). This repo restores the **`wx/` (WeChat)** build, which has
  the most content. Game site: `hwab.manhuang.org`.
- Thanks to **h_k_qq** for surfacing the game.
- Angry Birds is © Rovio / Talkweb. This is a non-commercial preservation/restoration
  of an otherwise unplayable, delisted release.

## What had to be fixed

The WeChat build won't run in a browser out of the box. Three problems, all solved
reproducibly by [`tools/build.py`](tools/build.py):

1. **No HTML entry.** Mini-programs boot from `game.js`, not a page. Added
   [`web/index.html`](web/index.html) that loads the LayaAir **browser** runtimes
   (not the `wxmini` adapter) and the game bundle in dependency order.

2. **WeChat (`wx.*`) hooks.** The game only initializes its platform module when
   `window.wx` exists, and routes system info / lifecycle / share / ads / analytics
   through `wx.*`. [`web/wx-shim.js`](web/wx-shim.js) provides a minimal browser `wx`
   so the platform inits, while ads/share/analytics become no-ops. The
   ThinkingAnalytics init (whose platform adapter is undefined in a browser and
   crashed boot) is disabled via a single documented patch in the build.

3. **Asset mapping.** Every logical path is content-hash-mapped by a Laya version
   manifest (`wxVer_1_2_2.json`, 353 entries) that WeChat resolved at runtime. The
   build **materializes** that mapping — copying each hashed file to its logical
   path — and writes an identity `version.json` so `Laya.ResourceVersion` doesn't
   rewrite the now-plain paths back into dead hashes.

`public/` is the generated, self-contained, playable build (committed so the repo is
deploy-ready).

## Rebuilding from the original dump

Download the dump from [archive.org/details/angrybirdsmp](https://archive.org/details/angrybirdsmp)
and point the build at its `wx/release` folder:

```bash
python3 tools/build.py /path/to/ab/wx/release
```

Regenerates `public/` from the raw dump. Edit overlay files in `web/` (entry HTML,
wx shim) and re-run; they're copied over the materialized assets.

## Run locally

```bash
cd public && python3 -m http.server 8767
# open http://localhost:8767
```

## Smoke test (headless)

```bash
npm install                       # puppeteer-core (drives system Chrome)
node tools/smoketest.mjs          # boots the build, reports console/errors, screenshots
```

## Deploy (Docker / Dockge)

```bash
docker compose up -d              # builds the nginx image, serves on :8767
```

Or add the repo as a Dockge stack; `compose.yaml` builds a self-contained
`nginx:alpine` image with `public/` baked in.

## Notes / limitations

- Two outbound calls fail offline and are harmless: `pv.sohu.com/cityjson`
  (IP geolocation) and `minigame-cdn.hrgame.com.cn/.../cpa.json` (campaign config).
- Online features (leaderboards, ads, sharing, login) are intentionally inert.
- Landscape orientation; designed for touch but mouse works.
