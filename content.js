/* ISOLATED world: state and extension messaging only; no host DOM mutations. */
(() => {
  'use strict';
  const C = ChromegleCore;
  let prefs = C.settings(), blocked = [], ready = false, connected = false;
  let current = null, lastConnection = null, attempted = '', geoVersion = 0;
  let status = '', active = false, statusBeforeGap = '';
  const encounters = new Map();
  const channel = new MessageChannel();
  const send = (kind, data) => channel.port1.postMessage({ kind, data });
  // Notes, block lists and geolocation never travel into MAIN.
  function configure() {
    send('settings', { ipSkip: prefs.ipSkip, countrySkip: prefs.countrySkip });
  }
  const state = () => ({ current, status, connected, active });
  function publish() { chrome.runtime.sendMessage({ action: 'state', state: state() }).catch(() => {}); }
  async function call(message) {
    const result = await chrome.runtime.sendMessage(message);
    if (!result?.ok) throw new Error(result?.error || 'Extension unavailable; reload this tab');
    return result.data;
  }
  function schedule() {
    if (!current || !active || attempted === current.key || document.hidden || !connected) return;
    const reason = C.skipReason(current, prefs, blocked);
    if (!reason) return;
    attempted = current.key;
    status = reason + ': attempting skip after a random 2–5 s cooldown…';
    send('skip', { session: current.session, ip: current.ip }); publish();
  }
  async function locate(target) {
    const version = ++geoVersion;
    if (!prefs.geoEnabled) { target.geo = null; target.geoStatus = 'Geolocation disabled.'; publish(); return; }
    if (!C.publicIP(target.ip)) { target.geoStatus = 'Private, reserved or withheld address — no geolocation lookup.'; publish(); return; }
    target.geoStatus = 'Looking up address…'; publish();
    try {
      const geo = await call({ action: 'geo', ip: target.ip });
      if (current !== target || version !== geoVersion || !prefs.geoEnabled) return;
      target.geo = geo; target.geoStatus = ''; publish(); schedule();
    } catch (error) {
      if (current !== target || version !== geoVersion) return;
      target.geoStatus = error.message; publish();
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
    if (!data || data.selected !== true || typeof data.session !== 'string' || data.session.length > 250) {
      if (active) {
        send('cancel'); active = false; statusBeforeGap = status;
        status = 'Last known connection. Waiting for remote video…'; publish();
      }
      return;
    }
    const address = C.ip(data.ip), type = C.iceType(data.type);
    const key = data.session + '|' + address + '|' + type;
    if (key === current?.key) {
      if (!active) { active = true; status = statusBeforeGap; publish(); schedule(); }
      return;
    }
    send('cancel');
    const previous = current;
    const sameIP = address && address === previous?.ip;
    current = { session: data.session, ip: address, type, key, address: typeof data.address === 'string' ? data.address.slice(0,100) : '',
      geo: sameIP ? previous.geo : null, geoStatus: sameIP ? previous.geoStatus : '' };
    geoVersion++; active = true;
    if (previous?.session !== data.session || previous?.ip !== address) attempted = '';
    else if (attempted) attempted = key;
    status = ''; statusBeforeGap = '';
    publish(); schedule();
    void countEncounter(current);
    if (!current.geo) void locate(current);
  }
  channel.port1.onmessage = event => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.kind === 'ready') { connected = true; if (ready) configure(); publish(); schedule(); }
    if (message.kind === 'connection') connection(message.data);
    if (message.kind === 'manual' && current) { attempted = current.key; status = 'Auto-skip cancelled by manual interaction.'; publish(); }
    if (message.kind === 'skip-result' && message.data?.session === current?.session) {
      status = ({ clicked: 'Skip control clicked. If the site ignores it, skip manually.', unavailable: 'No unambiguous, enabled Next/Skip button found. Skip manually.', cancelled: 'Auto-skip cancelled because the connection or visibility changed.' })[message.data.status] || 'Skip result unavailable.';
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
      send('cancel'); attempted = current.key; status = 'Auto-skip paused for this connection while editing.'; publish();
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
      prefs = C.settings(changes.settings.newValue); configure(); attempted = '';
      if (current && geoWasEnabled !== prefs.geoEnabled) void locate(current);
    }
    if (changes.blocked) { blocked = changes.blocked.newValue || []; send('cancel'); attempted = ''; }
    publish(); schedule();
  });
  chrome.storage.local.get({ settings: C.defaults, blocked: [] }).then(data => {
    prefs = C.settings(data.settings); blocked = data.blocked;
    ready = true; configure(); connection(lastConnection); publish();
  }).catch(error => { status = error.message; publish(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
})();
