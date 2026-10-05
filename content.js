/* ISOLATED world: state and extension messaging only; no host DOM mutations. */
(() => {
  'use strict';
  const C = ChromegleCore;
  let prefs = C.settings(), blocked = [], ready = false, connected = false;
  let current = null, lastConnection = null, attempted = '', geoVersion = 0;
  let status = '', active = false, statusBeforeGap = '';
  let geoTimer = null, geoFailures = 0, requestSequence = 0, pendingRequest = null, pausedSession = '';
  let pendingReason = '';
  let reportAlert = null, reportTimer = null, reportWatching = false;
  const locating = new WeakSet();
  const encounters = new Map();
  const channel = new MessageChannel();
  const send = (kind, data) => channel.port1.postMessage({ kind, data });
  // Notes, block lists and geolocation never travel into MAIN.
  function configure() {
    send('settings', { ipSkip: prefs.ipSkip, countrySkip: prefs.countrySkip, facePresenceOverride: prefs.facePresenceOverride, detectReports: prefs.detectReports });
  }
  const state = () => ({ current, status, connected, active, reportAlert, reportWatching });
  function publish() { chrome.runtime.sendMessage({ action: 'state', state: state() }).catch(() => {}); }
  async function call(message) {
    const result = await chrome.runtime.sendMessage(message);
    if (!result?.ok) throw new Error(result?.error || 'Extension unavailable; reload this tab');
    return result.data;
  }
  function schedule() {
    if (!current || !active || pausedSession === current.session || attempted === current.key || document.hidden || !connected) return;
    const reason = C.skipReason(current, prefs, blocked);
    if (!reason) return;
    attempted = current.key;
    status = reason + ': waiting to click Skip, then Really? (1–2 s between clicks).';
    pendingRequest = ++requestSequence;
    pendingReason = reason;
    send('skip', { session: current.session, ip: reason === 'Blocked IP' ? current.ip : '', requestId: pendingRequest,
      ...(reason === 'Blocked country' ? { countryName: current.countryName } : {}) }); publish();
  }
  function cancelSkip() { send('cancel'); pendingRequest = null; pendingReason = ''; attempted = ''; }
  function refreshLater(target, wait) {
    clearTimeout(geoTimer);
    geoTimer = null;
    if (current === target && active && prefs.geoEnabled && C.publicIP(target.ip)) {
      geoTimer = setTimeout(() => { geoTimer = null; void locate(target); }, wait);
    }
  }
  async function locate(target) {
    if (current !== target || locating.has(target)) return;
    clearTimeout(geoTimer); geoTimer = null;
    const version = ++geoVersion;
    if (!prefs.geoEnabled) { target.geo = null; target.geoStatus = 'Geolocation disabled.'; publish(); return; }
    if (!C.publicIP(target.ip)) { target.geoStatus = 'Private, reserved or withheld address — no geolocation lookup.'; publish(); return; }
    if (!target.geo && !target.geoStatus) { target.geoStatus = 'Looking up address…'; publish(); }
    locating.add(target);
    try {
      const geo = await call({ action: 'geo', ip: target.ip });
      if (current !== target || version !== geoVersion || !prefs.geoEnabled) return;
      geoFailures = 0;
      if (JSON.stringify(target.geo) !== JSON.stringify(geo) || target.geoStatus) {
        target.geo = geo; target.geoStatus = ''; publish();
      }
    } catch (error) {
      if (current !== target || version !== geoVersion) return;
      geoFailures++;
      const message = error.message + ' Retrying automatically…';
      if (!target.geo && target.geoStatus !== message) { target.geoStatus = message; publish(); }
    } finally {
      locating.delete(target);
      if (current === target && version === geoVersion) refreshLater(target, geoFailures ? Math.min(30000, 2000 * 2 ** Math.min(geoFailures - 1, 4)) : 30000);
    }
  }
  async function countEncounter(target) {
    if (!target.ip) return;
    // One count per normalized IP and session, independent of ICE type or panel state.
    const key = target.session + '|' + target.ip;
    let task = encounters.get(key);
    if (!task) {
      task = call({ action: 'encounter', ip: target.ip });
      encounters.set(key, task);
    }
    try {
      await task;
      const data = await chrome.storage.local.get('seen:' + target.ip);
      const count = data['seen:' + target.ip];
      if (current !== target) return;
      target.seenCount = count; publish();
    } catch {
      if (current !== target) return;
      target.seenError = 'Encounter count could not be saved.'; publish();
    }
  }
  function connection(data) {
    lastConnection = data;
    if (!ready) return;
    if (!data || typeof data.session !== 'string' || data.session.length > 250) {
      if (active) {
        cancelSkip(); active = false; statusBeforeGap = status;
        clearTimeout(geoTimer); geoTimer = null;
        status = 'Last known connection. Waiting for remote video…'; publish();
      }
      return;
    }
    const sameSession = data.session === current?.session;
    const address = data.selected === true ? C.ip(data.ip) : sameSession ? current.ip : '';
    const type = data.selected === true ? C.iceType(data.type) : sameSession ? current.type : 'unknown';
    const countryName = typeof data.countryName === 'string' ? data.countryName.trim().slice(0, 160) : '';
    const countryCode = C.countryCode(countryName);
    const key = data.session + '|' + address;
    if (key === current?.key) {
      let changed = false;
      if (current.countryName !== countryName) {
        current.countryName = countryName; current.countryCode = countryCode;
        if (prefs.countrySkip && pendingReason !== 'Blocked IP') cancelSkip();
        changed = true;
      }
      if (current.type !== type) { current.type = type; changed = true; }
      if (!active) { active = true; status = statusBeforeGap; changed = true; }
      if (changed) publish();
      if (!geoTimer && !locating.has(current)) refreshLater(current, current.geo ? 30000 : 2000);
      schedule();
      return;
    }
    // A country-based sequence belongs to the peer/label, not its loading IP details.
    const keepAttempt = sameSession && pendingRequest !== null && pendingReason === 'Blocked country' && current.countryName === countryName;
    if (!keepAttempt) cancelSkip();
    clearTimeout(geoTimer); geoTimer = null;
    const previous = current;
    const sameIP = address && address === previous?.ip;
    current = { session: data.session, ip: address, type, key, countryName, countryCode, address: typeof data.address === 'string' ? data.address.slice(0,100) : '',
      geo: sameIP ? previous.geo : null, geoStatus: sameIP ? previous.geoStatus : '' };
    geoVersion++; geoFailures = 0; active = true;
    if (keepAttempt) attempted = current.key;
    else status = '';
    statusBeforeGap = '';
    publish(); schedule();
    void countEncounter(current);
    if (!current.geo) void locate(current);
    else refreshLater(current, 30000);
  }
  channel.port1.onmessage = event => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.kind === 'ready') { connected = true; if (ready) configure(); publish(); schedule(); }
    if (message.kind === 'connection') connection(message.data);
    if (message.kind === 'report-observer') {
      reportWatching = prefs.detectReports && message.data?.watching === true; publish();
    }
    if (message.kind === 'report-hint' && ready && prefs.detectReports && message.data?.reason === 'paired-capture-requests') {
      reportAlert = { at: Date.now() }; clearTimeout(reportTimer); publish();
      reportTimer = setTimeout(() => { reportAlert = null; reportTimer = null; publish(); }, 30000);
    }
    if (message.kind === 'manual' && current) { pendingRequest = null; pendingReason = ''; pausedSession = current.session; attempted = current.key; status = 'Auto-skip cancelled by manual interaction.'; publish(); }
    if (message.kind === 'skip-result' && message.data?.session === current?.session && message.data.requestId === pendingRequest) {
      pendingRequest = null;
      pendingReason = '';
      if (message.data.status === 'cancelled') attempted = '';
      status = ({ clicked: 'Skip and Really? clicked. Cooling down for 4–6 seconds.', keyboard: 'Skip attempted using Escape fallback. Cooling down for 4–6 seconds.', cancelled: 'Auto-skip paused until the same connection is visible again.' })[message.data.status] || 'Skip result unavailable.';
      publish();
    }
  };
  channel.port1.start();
  // One observable bootstrap: Chrome has no private cross-world port transfer.
  window.postMessage({ type: 'chromegle-port-v1' }, location.origin, [channel.port2]);
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || message?.action !== 'panel-command') return false;
    if (message.command === 'state') { respond({ ok: true, data: state() }); return false; }
    if (!current || message.key !== current.key) { respond({ ok: false, error: 'Connection changed; refresh the panel.' }); return false; }
    if (message.command === 'retry') void locate(current);
    else if (message.command === 'pause') {
      cancelSkip(); pausedSession = current.session; attempted = current.key; status = 'Auto-skip paused for this connection while editing.'; publish();
    } else { respond({ ok: false, error: 'Unknown command' }); return false; }
    respond({ ok: true }); return false;
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (current?.ip && changes['seen:' + current.ip]) {
      current.seenCount = changes['seen:' + current.ip].newValue;
    }
    if (changes.settings) {
      const geoWasEnabled = prefs.geoEnabled;
      const next = C.settings(changes.settings.newValue);
      const filtersChanged = next.ipSkip !== prefs.ipSkip || next.countrySkip !== prefs.countrySkip || JSON.stringify(next.countries) !== JSON.stringify(prefs.countries);
      prefs = next; configure();
      if (!prefs.detectReports) {
        clearTimeout(reportTimer); reportTimer = null; reportAlert = null; reportWatching = false;
      }
      if (filtersChanged) { cancelSkip(); pausedSession = ''; }
      if (current && geoWasEnabled !== prefs.geoEnabled) {
        geoVersion++; clearTimeout(geoTimer); geoTimer = null;
        if (!prefs.geoEnabled) { current.geo = null; current.geoStatus = 'Geolocation disabled.'; }
        else { current.geoStatus = ''; void locate(current); }
      }
    }
    if (changes.blocked) { blocked = changes.blocked.newValue || []; cancelSkip(); pausedSession = ''; }
    publish(); schedule();
  });
  chrome.storage.local.get({ settings: C.defaults, blocked: [] }).then(data => {
    prefs = C.settings(data.settings); blocked = data.blocked;
    ready = true; configure(); connection(lastConnection); publish();
  }).catch(error => { status = error.message; publish(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelSkip();
    else schedule();
  });
})();
