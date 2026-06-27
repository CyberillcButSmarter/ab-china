/*
 * Runtime English translation layer for AB China (FairyGUI text).
 *
 * Most user-facing text (buttons, menus, dialogs, flavor) is in-engine FairyGUI
 * text, not baked images. Instead of binary-patching the .fui packages, we wrap
 * FairyGUI's text setters and substitute from a zh->en dictionary at render time.
 * Untranslated strings are logged (and collected on window.__i18nMiss) so the
 * dictionary can be filled in iteratively. Image-baked text is out of scope here.
 *
 * Loaded only in the English build (index-en.html), after the game bundle.
 */
(function () {
  "use strict";
  var DICT = window.__AB_I18N || {};
  // Prefix rules for strings with dynamic tails, e.g. "高分榜：23172".
  var PREFIX = Object.keys(DICT).filter(function (k) { return /[:：]$/.test(k); });
  window.__i18nMiss = window.__i18nMiss || {};

  function translate(v) {
    if (typeof v !== "string" || !v) return v;
    if (DICT[v] != null) return DICT[v];
    for (var i = 0; i < PREFIX.length; i++) {
      if (v.indexOf(PREFIX[i]) === 0) return DICT[PREFIX[i]] + v.slice(PREFIX[i].length);
    }
    if (/[一-鿿]/.test(v)) window.__i18nMiss[v] = (window.__i18nMiss[v] || 0) + 1;
    return v;
  }

  function patchProp(cls, prop) {
    if (!cls || !cls.prototype) return;
    // The accessor may live on a base class; walk up to find it.
    var proto = cls.prototype, desc = null;
    while (proto && !(desc = Object.getOwnPropertyDescriptor(proto, prop))) proto = Object.getPrototypeOf(proto);
    if (!desc || !desc.set) return;
    Object.defineProperty(cls.prototype, prop, {
      configurable: true, enumerable: desc.enumerable,
      get: desc.get,
      set: function (v) { desc.set.call(this, translate(v)); }
    });
  }

  function install() {
    var fg = window.fgui || window.fairygui;
    if (!fg) return setTimeout(install, 120);
    ["GBasicTextField", "GTextField", "GRichTextField", "GTextInput"].forEach(function (n) {
      patchProp(fg[n], "text");
    });
    ["GButton", "GLabel"].forEach(function (n) { patchProp(fg[n], "title"); });
    console.log("[i18n] FairyGUI translation installed (", Object.keys(DICT).length, "entries )");
    window.dumpMiss = function () { console.log(JSON.stringify(Object.keys(window.__i18nMiss).sort())); };
  }
  install();
})();
