/* Open the native browser sidebar on the first supported user gesture. */
(() => {
  'use strict';
  let opening = false;
  function open(event) {
    if (!event.isTrusted || document.hidden || opening) return;
    opening = true;
    // Send immediately: sidePanel.open requires the gesture's user activation.
    chrome.runtime.sendMessage({ action: 'open-sidebar' }).then(result => {
      if (!result?.ok) return;
      // Respect closing the sidebar: do not reopen it on later interactions.
      document.removeEventListener('click', open, true);
      document.removeEventListener('keydown', open, true);
    }).catch(() => {}).finally(() => { opening = false; });
  }
  document.addEventListener('click', open, true);
  document.addEventListener('keydown', open, true);
})();
