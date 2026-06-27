/*
 * Browser shim for the WeChat (wx) minigame API.
 *
 * AB China (Talkweb, LayaAir) only initializes its platform module when a
 * platform global exists: `window.wx && Ei.initPf(class extends Ei {...})`.
 * That module routes system info, lifecycle, share and ads through `wx.*`.
 * We can't just delete the hooks (then no platform inits and GI.pf is null),
 * so we provide a minimal browser-side `wx` that keeps the platform happy and
 * turns ads/share/analytics into no-ops. Must load BEFORE js/bundle.js.
 */
(function () {
  "use strict";
  var noop = function () {};

  // An object whose every property access yields a no-op function. Used for
  // namespaced SDK objects like wx.aldStage that are called as wx.aldStage.onStart().
  function noopNamespace() {
    return new Proxy({}, { get: function () { return noop; } });
  }

  // Ad units, rewarded video, banners, etc. -> inert but correctly shaped.
  function fakeAd() {
    return {
      show: function () { return Promise.resolve(); },
      hide: noop,
      load: function () { return Promise.resolve(); },
      destroy: noop,
      onLoad: noop, offLoad: noop,
      onError: noop, offError: noop,
      onClose: noop, offClose: noop,
      onResize: noop, offResize: noop,
      showed: false, style: {}
    };
  }

  var w = window.innerWidth || 1280,
      h = window.innerHeight || 720,
      dpr = window.devicePixelRatio || 1;

  var real = {
    // --- system / launch -------------------------------------------------
    getSystemInfoSync: function () {
      return {
        SDKVersion: "2.20.0", platform: "android", system: "Android 10",
        brand: "web", model: "web", language: "zh_CN",
        screenWidth: w, screenHeight: h, windowWidth: w, windowHeight: h,
        pixelRatio: dpr, devicePixelRatio: dpr, statusBarHeight: 0,
        safeArea: { top: 0, left: 0, right: w, bottom: h, width: w, height: h }
      };
    },
    getLaunchOptionsSync: function () {
      return { scene: 1001, query: {}, path: "", referrerInfo: {} };
    },

    // --- lifecycle -------------------------------------------------------
    onShow: function (cb) {
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden && cb) cb({ scene: 1001 });
      });
    },
    onHide: function (cb) {
      document.addEventListener("visibilitychange", function () {
        if (document.hidden && cb) cb();
      });
    },
    offShow: noop, offHide: noop,

    // --- share / social (inert) -----------------------------------------
    showShareMenu: noop, hideShareMenu: noop, shareAppMessage: noop,
    onShareAppMessage: noop, offShareAppMessage: noop, onAddToFavorites: noop,

    // --- ui --------------------------------------------------------------
    showModal: function (o) {
      if (o && o.content) console.warn("[wx-shim] showModal:", o.content);
      if (o && o.success) o.success({ confirm: false, cancel: true });
    },
    showToast: noop, hideToast: noop, showLoading: noop, hideLoading: noop,

    // --- navigation / analytics / misc (inert) --------------------------
    navigateToMiniProgram: function (o) { if (o && o.success) o.success(); return Promise.resolve(); },
    aldStage: noopNamespace(), aldSendEvent: noop, onHtGame: noop, ht: noop,
    setKeepScreenOn: noop, triggerGC: noop,

    // --- ads -------------------------------------------------------------
    createBannerAd: fakeAd, createInterstitialAd: fakeAd,
    createRewardedVideoAd: fakeAd, createCustomAd: fakeAd, createGridAd: fakeAd,

    // --- storage -> localStorage ----------------------------------------
    getStorageSync: function (k) {
      try { var v = localStorage.getItem("wx_" + k); return v === null ? "" : JSON.parse(v); }
      catch (e) { return ""; }
    },
    setStorageSync: function (k, v) {
      try { localStorage.setItem("wx_" + k, JSON.stringify(v)); } catch (e) {}
    },
    removeStorageSync: function (k) { localStorage.removeItem("wx_" + k); },
    clearStorageSync: noop,
    getStorageInfoSync: function () { return { keys: [], currentSize: 0, limitSize: 10240 }; },

    env: { USER_DATA_PATH: "" }
  };

  // Any wx.* not explicitly handled -> universal inert function that also
  // looks ad/promise-ish, so chained calls (wx.createX().show()) never throw.
  window.wx = new Proxy(real, {
    get: function (t, p) {
      if (p in t) return t[p];
      return function () { return fakeAd(); };
    }
  });
})();
