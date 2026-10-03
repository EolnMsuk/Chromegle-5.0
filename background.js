importScripts('core.js');
const C = ChromegleCore;
const ENDPOINT = 'https://m52o1m3c29.execute-api.eu-central-1.amazonaws.com/prod/geoip2';
const cache = new Map();
const pending = new Map();
let nextLookup = 0;
let writes = Promise.resolve();
const panels = new Map();
// Set on every service-worker start, including browser/extension reloads.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('settings');
  if (!data.settings) await chrome.storage.local.set({ settings: C.defaults, blocked: [], notes: {} });
  await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
});
function allowed(sender) {
  if (sender.id !== chrome.runtime.id) return false;
  try {
    const url = new URL(sender.url);
    return (url.protocol === 'chrome-extension:' && url.hostname === chrome.runtime.id) || (url.protocol === 'https:' && ['umingle.com','www.umingle.com'].includes(url.hostname) && sender.frameId === 0);
  } catch { return false; }
}
function extensionPage(sender) {
  if (sender.id !== chrome.runtime.id) return false;
  return ['sidepanel.html', 'settings.html'].some(file => sender.url === chrome.runtime.getURL(file));
}
function contentPage(sender) {
  return allowed(sender) && Number.isInteger(sender.tab?.id) && sender.frameId === 0;
}
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'chromegle-panel' || !extensionPage(port.sender)) { port.disconnect(); return; }
  panels.set(port, null);
  port.onMessage.addListener(message => {
    if (Number.isInteger(message?.tabId) && message.tabId >= 0) panels.set(port, message.tabId);
    else panels.set(port, null);
  });
  port.onDisconnect.addListener(() => panels.delete(port));
});
async function panelCommand(message) {
  if (!Number.isInteger(message.tabId) || message.tabId < 0 || !['state','retry','pause'].includes(message.command)) throw new Error('Invalid panel request');
  const result = await chrome.tabs.sendMessage(message.tabId, {
    action: 'panel-command', command: message.command,
    key: typeof message.key === 'string' ? message.key.slice(0, 400) : ''
  }, { frameId: 0 });
  if (!result?.ok) throw new Error(result?.error || 'Reload the Umingle tab');
  return result.data;
}
async function lookup(address) {
  if (!C.publicIP(address)) throw new Error('Private, reserved or unavailable address — no lookup');
  const prefs = C.settings((await chrome.storage.local.get('settings')).settings);
  if (!prefs.geoEnabled) throw new Error('Geolocation disabled');
  const hit = cache.get(address);
  if (hit && hit.expires > Date.now()) return hit.data;
  if (pending.has(address)) return pending.get(address);
  if (Date.now() < nextLookup) throw new Error('Geolocation rate limit; retry shortly');
  nextLookup = Date.now() + 1000;
  const task = (async () => {
    const response = await fetch(ENDPOINT + '?ip_address=' + encodeURIComponent(address), { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error('Geolocation service returned HTTP ' + response.status);
    const data = C.normalizeGeo(await response.json());
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(address, { data, expires: Date.now() + 30 * 60 * 1000 });
    return data;
  })();
  pending.set(address, task);
  try { return await task; } finally { pending.delete(address); }
}
async function mutate(message) {
  const data = await chrome.storage.local.get({ settings: C.defaults, blocked: [], notes: {} });
  if (message.action === 'settings') {
    const prefs = C.settings(message.value);
    await chrome.storage.local.set({ settings: prefs });
    return prefs;
  }
  const address = C.ip(message.ip);
  if (!address) throw new Error('Enter a valid IPv4 or IPv6 address');
  if (message.action === 'block') {
    const blocked = new Set(data.blocked);
    if (message.value === true) blocked.add(address); else blocked.delete(address);
    await chrome.storage.local.set({ blocked: [...blocked] });
  } else if (message.action === 'note') {
    const notes = { ...data.notes };
    const note = typeof message.value === 'string' ? message.value.trim().slice(0,2000) : '';
    if (note) notes[address] = note; else delete notes[address];
    await chrome.storage.local.set({ notes });
  } else throw new Error('Unknown action');
  return true;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!allowed(sender) || !message || typeof message !== 'object') return false;
  let task;
  if (message.action === 'state' && contentPage(sender)) {
    for (const [port, tabId] of panels) if (tabId === sender.tab.id) {
      try { port.postMessage({ tabId, state: message.state }); } catch { panels.delete(port); }
    }
    respond({ ok: true }); return false;
  }
  if (message.action === 'open-sidebar' && contentPage(sender) && Number.isInteger(sender.tab.windowId)) {
    // No awaited work before open: preserve activation from the content script.
    task = chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
  else if (message.action === 'geo' && (contentPage(sender) || extensionPage(sender))) task = lookup(C.ip(message.ip));
  else if (message.action === 'panel' && extensionPage(sender)) task = panelCommand(message);
  else if (['settings','block','note'].includes(message.action) && extensionPage(sender)) {
    task = writes.then(() => mutate(message));
    writes = task.catch(() => {});
  } else if (message.action === 'options' && extensionPage(sender)) task = chrome.runtime.openOptionsPage();
  else return false;
  task.then(data => respond({ ok: true, data }), error => respond({ ok: false, error: error.message }));
  return true;
});
