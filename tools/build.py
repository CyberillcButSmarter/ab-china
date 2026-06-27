#!/usr/bin/env python3
"""
Materialize the WeChat (wx) build of AB China into a plain static web tree.

The original is a LayaAir WeChat minigame: every logical asset path is mapped to
a content-hashed filename by a version manifest (wxVer_X_Y_Z.json). WeChat's
Laya ResourceVersion layer rewrote logical->hashed at runtime. A plain web server
has no such layer, so we bake the mapping in by copying each hashed file to its
logical path. Result: a tree that serves with vanilla nginx.

Usage: python3 tools/build.py /path/to/ab/wx/release
Output: ./public
"""
import json, os, shutil, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/Downloads/downloaded_files/ab/wx/release")
DST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
MANIFEST = "wxVer_1_2_2.json"   # latest version = most content

def main():
    man_path = os.path.join(SRC, MANIFEST)
    manifest = json.load(open(man_path))
    print(f"manifest {MANIFEST}: {len(manifest)} entries")

    if os.path.exists(DST):
        shutil.rmtree(DST)
    os.makedirs(DST)

    copied = missing = 0
    missing_list = []
    for logical, hashed in manifest.items():
        s = os.path.join(SRC, hashed)
        d = os.path.join(DST, logical)
        if os.path.isfile(s):
            os.makedirs(os.path.dirname(d), exist_ok=True)
            shutil.copy2(s, d)
            copied += 1
        else:
            missing += 1
            missing_list.append((logical, hashed))

    # Plain (unhashed) extras the manifest doesn't list but the game loads.
    for extra in ("1stAsset",):
        s = os.path.join(SRC, extra)
        if os.path.isdir(s):
            shutil.copytree(s, os.path.join(DST, extra), dirs_exist_ok=True)
            print(f"copied plain dir: {extra}/")

    print(f"\ncopied {copied}, missing {missing}")
    if missing_list:
        print("MISSING (logical -> hashed):")
        for lg, hs in missing_list[:40]:
            print(f"  {lg} -> {hs}")

    # --- Patch the entry bundle ----------------------------------------------
    # Targeted, documented string replacements applied to js/bundle.js. Each
    # neutralizes an SNS/analytics hook that crashes or stalls boot in a browser.
    PATCHES = [
        # ThinkingAnalytics: its platform adapter `Pi` is an unresolved webpack
        # module (undefined) in a browser, so doTaInit() throws on
        # `Pi.onNetworkStatusChange` and aborts the onGameStart chain. TA is
        # pure analytics -> skip the init call entirely.
        ("!GI.isDebug&&this.taCtrl.doTaInit()",
         "!GI.isDebug&&!1&&this.taCtrl.doTaInit()"),
    ]
    bundle = os.path.join(DST, "js", "bundle.js")
    src_js = open(bundle, encoding="utf-8").read()
    for find, repl in PATCHES:
        n = src_js.count(find)
        if n != 1:
            raise SystemExit(f"PATCH ERROR: expected 1 match, found {n} for:\n  {find[:80]}")
        src_js = src_js.replace(find, repl)
        print(f"patched bundle: {find[:48]}...")
    open(bundle, "w", encoding="utf-8").write(src_js)

    # Overlay authored web entry files (index.html, wx-shim.js) over the build.
    web = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")
    if os.path.isdir(web):
        for n in os.listdir(web):
            shutil.copy2(os.path.join(web, n), os.path.join(DST, n))
        print(f"overlaid web/ entry files: {', '.join(sorted(os.listdir(web)))}")

    # Generate the English dictionary script (window.__AB_I18N) consumed by the
    # English build (index-en.html + translation.js).
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dict_path = os.path.join(repo, "translations", "zh-en.json")
    if os.path.isfile(dict_path):
        d = json.load(open(dict_path, encoding="utf-8"))
        with open(os.path.join(DST, "i18n-dict.js"), "w", encoding="utf-8") as f:
            f.write("window.__AB_I18N=" + json.dumps(d, ensure_ascii=False) + ";")
        print(f"wrote i18n-dict.js ({len(d)} entries)")

    # Identity version.json so Laya ResourceVersion (FILENAME_VERSION mode) maps
    # every runtime-loaded asset path to itself instead of to a now-dead hash.
    identity = {k: k for k in manifest.keys()}
    with open(os.path.join(DST, "version.json"), "w") as f:
        json.dump(identity, f)
    print(f"\nwrote identity version.json ({len(identity)} entries)")

    # Report produced top-level layout
    print("\npublic/ top level:")
    for n in sorted(os.listdir(DST)):
        p = os.path.join(DST, n)
        kind = "dir" if os.path.isdir(p) else f"{os.path.getsize(p)}b"
        print(f"  {n}  ({kind})")

if __name__ == "__main__":
    main()
