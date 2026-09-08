/**
 * Scale 1920×1080 mockup canvases to fit their stage wrappers (ResizeObserver).
 * Required on every mockup with browser / merchant frames — prevents clip bug.
 * Pair with mockup-artboard.css. See static-mockup-fidelity.mdc §13–17.
 */
(function () {
  'use strict';

  var DESIGN_W = 1920;
  var STAGE_SELECTOR = '.artboard-stage, .chrome-stage, #frameLightboxStage, [data-mockup-stage]';
  var CANVAS_SELECTOR = ':scope > .artboard, :scope > .chrome-canvas';
  var resizeObserver = null;
  var domTimer = null;

  function findCanvas(host) {
    if (!host) return null;
    return host.querySelector(CANVAS_SELECTOR);
  }

  function fitHost(host) {
    var canvas = findCanvas(host);
    if (!canvas) return;
    var w = host.clientWidth;
    if (!w) return;
    canvas.style.transform = 'scale(' + (w / DESIGN_W) + ')';
  }

  function fitAll() {
    document.querySelectorAll(STAGE_SELECTOR).forEach(fitHost);
  }

  function observeStage(el) {
    if (!resizeObserver || !el) return;
    resizeObserver.observe(el);
  }

  function observeAll() {
    if (typeof ResizeObserver === 'undefined') return;
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(function (entries) {
        entries.forEach(function (entry) {
          fitHost(entry.target);
        });
      });
    }
    document.querySelectorAll(STAGE_SELECTOR).forEach(observeStage);
  }

  function scheduleDomRefresh() {
    clearTimeout(domTimer);
    domTimer = setTimeout(function () {
      observeAll();
      fitAll();
    }, 50);
  }

  function init() {
    observeAll();
    window.addEventListener('resize', fitAll);
    window.addEventListener('load', fitAll);
    fitAll();

    if (typeof MutationObserver !== 'undefined') {
      var mo = new MutationObserver(scheduleDomRefresh);
      mo.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  window.CognosceneMockupArtboard = {
    DESIGN_W: DESIGN_W,
    STAGE_SELECTOR: STAGE_SELECTOR,
    fit: fitHost,
    fitAll: fitAll,
    observe: observeStage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
