/* Cognoscene waitlist form enhancement.
   Loaded by index.html when linked after the existing page markup/scripts.
   Keeps platform intent and mobile qualification separate from early-access eligibility.
*/
(function () {
  'use strict';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

})();
