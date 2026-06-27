/*
 * Desktop/browser fixes for the AB China mini-program (designed for phones).
 * Loaded after the game bundle; waits for Laya.stage then patches it.
 */
(function () {
  "use strict";

  // 1) Scaling/orientation. The phone config uses scaleMode "fixedauto" +
  //    screenMode "horizontal", which rotates the canvas on portrait windows and
  //    stretches oddly when a desktop window is resized. Force a letterboxed
  //    landscape that scales cleanly with any window and never rotates.
  function fixStage() {
    if (!(window.Laya && Laya.stage)) { return setTimeout(fixStage, 150); }
    try {
      Laya.stage.scaleMode = "showall";  // preserve aspect, letterbox
      Laya.stage.screenMode = "none";    // never auto-rotate for "phone landscape"
      Laya.stage.alignH = "center";
      Laya.stage.alignV = "middle";
      // Laya re-adapts on window resize itself once scaleMode is set; nudge once.
      if (Laya.stage._resetCanvas) Laya.stage._resetCanvas();
    } catch (e) { console.warn("[desktop-fixes] stage:", e); }
  }
  fixStage();

  // 2) Audio. Browsers suspend the WebAudio context until a user gesture, and
  //    this Laya build doesn't resume it, so music/sfx stay silent. Resume on
  //    the first interaction.
  function resumeAudio() {
    try {
      var ctx = (window.Laya && Laya.WebAudioSound && Laya.WebAudioSound.ctx) ||
                (window.Laya && Laya.SoundManager && Laya.SoundManager.ctx);
      if (ctx && ctx.state === "suspended" && ctx.resume) ctx.resume();
    } catch (e) {}
  }
  ["pointerdown", "touchstart", "mousedown", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, resumeAudio, { capture: true });
  });
})();
