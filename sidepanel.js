(() => {
  'use strict';
  const C = ChromegleCore, $ = id => document.getElementById(id);
  const text = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };
  let tabId = null, windowId, revision = 0, stateRevision = 0, port, current = null, snapshot = {};
  let prefs = C.settings(), blocked = [], notes = {}, noteKey = '', dirty = false;
  const drafts = new Map();
  const error = e => { $('error').textContent = e.message; };
  async function call(message) {
    const result = await chrome.runtime.sendMessage(message);
    if (!result?.ok) throw new Error(result?.error || 'Extension unavailable');
    return result.data;
  }
  function render() {
    current = snapshot.current || null;
    const nextKey = current?.ip ? tabId + '|' + current.ip : '';
    if (nextKey !== noteKey) {
      if (noteKey && dirty) drafts.set(noteKey, $('note').value);
      noteKey = nextKey; dirty = drafts.has(noteKey);
      $('note').value = drafts.get(noteKey) ?? notes[current?.ip] ?? '';
    } else if (!dirty && $('note').value !== (notes[current?.ip] || '')) $('note').value = notes[current?.ip] || '';
    text('ip', current ? current.ip || current.address || 'Address withheld' : 'Waiting for remote video…');
    const showSeenCount = Boolean(current?.ip && Number.isSafeInteger(current.seenCount) && current.seenCount > 1);
    text('seenCount', showSeenCount ? 'You have seen this person ' + current.seenCount + ' times' : '');
    $('seenCount').hidden = !showSeenCount;
    text('ice', current ? C.warning(current.type) : '');
    $('ice').hidden = !$('ice').textContent;
    text('flag', C.flag(current?.geo?.code));
    text('country', current?.geo ? current.geo.country || '' : current?.geoStatus || 'Location appears after a selected connection is available.');
    text('locality', current?.geo ? [current.geo.state, current.geo.city].filter(Boolean).join(', ') : '');
    $('locality').hidden = !$('locality').textContent;
    $('explanation').textContent = current?.type === 'relay' ? 'Location is the relay server. Country auto-skip is disabled for relay connections.' : '';
    $('block').disabled = $('save').disabled = $('note').disabled = !current?.ip;
    $('retry').disabled = !current?.ip || !prefs.geoEnabled || !C.publicIP(current.ip);
    $('block').textContent = blocked.includes(current?.ip) ? 'Unblock IP' : 'Block IP';
    text('connectionStatus', snapshot.status || '');
  }
  function display(data) {
    snapshot = data || {}; render();
    text('tabStatus', snapshot.connected ? '' : 'Waiting for the page observer; reload Umingle if needed.');
    $('tabStatus').hidden = snapshot.connected === true;
  }
  async function selectTab() {
    const version = ++revision;
    let stateVersion;
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (version !== revision) return;
      const nextTabId = tab?.id ?? null;
      if (nextTabId !== tabId) { snapshot = {}; render(); }
      tabId = nextTabId; $('error').textContent = '';
      stateVersion = stateRevision;
      port?.postMessage({ tabId });
      const data = await call({ action: 'panel', tabId, command: 'state' });
      if (version === revision && stateVersion === stateRevision) display(data);
    } catch {
      if (version === revision && (stateVersion === undefined || stateVersion === stateRevision)) { snapshot = {}; render(); $('tabStatus').textContent = 'Open or reload an Umingle tab to view its connection.'; }
    }
  }
  function connect() {
    port = chrome.runtime.connect({ name: 'chromegle-panel' });
    port.onMessage.addListener(message => { if (message.tabId === tabId) { stateRevision++; display(message.state); } });
    port.onDisconnect.addListener(() => { void chrome.runtime.lastError; port = null; setTimeout(connect, 500); });
    if (windowId !== undefined) void selectTab();
  }
  const command = command => call({ action: 'panel', command, tabId, key: current?.key });
  $('block').addEventListener('click', () => {
    const address = current?.ip;
    if (address) call({ action: 'block', ip: address, value: !blocked.includes(address) }).catch(error);
  });
  $('retry').addEventListener('click', () => command('retry').catch(error));
  $('note').addEventListener('focus', () => command('pause').catch(error));
  $('note').addEventListener('input', () => { dirty = true; });
  $('save').addEventListener('click', async () => {
    const address = current?.ip, key = noteKey, value = $('note').value;
    if (!address) return;
    try {
      await call({ action: 'note', ip: address, value }); drafts.delete(key);
      if (key === noteKey && value === $('note').value) { dirty = false; $('error').textContent = 'Note saved locally.'; }
    } catch (e) { error(e); }
  });
  $('settings').addEventListener('click', () => { $('connectionView').hidden = true; $('settingsView').hidden = false; $('back').focus(); });
  $('back').addEventListener('click', () => { $('settingsView').hidden = true; $('connectionView').hidden = false; $('settings').focus(); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.settings) prefs = C.settings(changes.settings.newValue);
    if (changes.blocked) blocked = changes.blocked.newValue || [];
    if (changes.notes) notes = changes.notes.newValue || {};
    render();
  });
  chrome.tabs.onActivated.addListener(info => { if (info.windowId === windowId) void selectTab(); });
  chrome.tabs.onUpdated.addListener((id, change) => { if (id === tabId && change.status === 'complete') void selectTab(); });
  chrome.tabs.onRemoved.addListener(id => { if (id === tabId) void selectTab(); });
  Promise.all([chrome.windows.getCurrent(), chrome.storage.local.get({ settings: C.defaults, blocked: [], notes: {} })]).then(([win, data]) => {
    windowId = win.id; prefs = C.settings(data.settings); blocked = data.blocked; notes = data.notes; connect();
  }).catch(error);
})();
