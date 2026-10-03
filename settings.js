(() => {
  'use strict';
  const C = ChromegleCore, $ = id => document.getElementById(id);
  const bools = Object.keys(C.defaults).filter(k => typeof C.defaults[k] === 'boolean');
  let saving = false;
  function status(text) { $('status').textContent = text; }
  async function call(message) {
    const result = await chrome.runtime.sendMessage(message);
    if (!result?.ok) throw new Error(result?.error || 'Extension unavailable');
    return result.data;
  }
  function fill(raw) {
    const prefs = C.settings(raw);
    for (const key of bools) $(key).checked = prefs[key];
    $('countries').value = prefs.countries.join(', ');
  }
  function element(tag, text, parent) {
    const node = document.createElement(tag); node.textContent = text; parent.append(node); return node;
  }
  async function lists() {
    const { blocked = [], notes = {} } = await chrome.storage.local.get(['blocked','notes']);
    $('blockedList').replaceChildren(); $('noteList').replaceChildren();
    if (!blocked.length) element('p','No blocked IPs.', $('blockedList')).className = 'help';
    for (const ip of blocked) {
      const entry = element('div','', $('blockedList')); entry.className = 'entry';
      element('div',ip, entry);
      const button = element('button','Unblock',entry);
      button.onclick = () => call({ action: 'block', ip, value: false }).catch(e => status(e.message));
    }
    if (!Object.keys(notes).length) element('p','No saved notes.', $('noteList')).className = 'help';
    for (const [ip,note] of Object.entries(notes)) {
      const entry = element('div','', $('noteList')); entry.className = 'entry';
      element('div',ip,entry);
      const input = element('textarea','',entry); input.value = note; input.maxLength = 2000; input.setAttribute('aria-label','Note for ' + ip);
      const button = element('button','Save note',entry);
      button.onclick = () => call({ action: 'note', ip, value: input.value }).then(() => status('Note saved.')).catch(e => status(e.message));
    }
  }
  $('preferences').addEventListener('submit', async event => {
    event.preventDefault(); if (saving) return;
    const raw = {};
    for (const key of bools) raw[key] = $(key).checked;
    const codes = $('countries').value.toUpperCase().split(/[\s,;]+/).filter(Boolean);
    const invalid = codes.filter(c => !C.countryCodes.includes(c));
    if (invalid.length) return status('Unknown country codes: ' + invalid.join(', '));
    raw.countries = codes;
    saving = true;
    try { fill(await call({ action: 'settings', value: raw })); status('Saved.'); }
    catch (error) { status(error.message); }
    finally { saving = false; }
  });
  $('addBlock').addEventListener('submit', async event => {
    event.preventDefault();
    try { await call({ action: 'block', ip: $('newIP').value, value: true }); $('newIP').value = ''; status('IP blocked.'); }
    catch (error) { status(error.message); }
  });
  function countryList() {
    const query = $('countrySearch').value.trim().toLowerCase();
    $('countryList').replaceChildren();
    const rows = C.countryCodes.map(c => [c, C.regions.of(c)]).sort((a,b) => a[1].localeCompare(b[1]));
    for (const [code,name] of rows) if ((code + ' ' + name).toLowerCase().includes(query)) element('div', code + ' — ' + name, $('countryList'));
  }
  $('countrySearch').addEventListener('input',countryList);
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes.blocked || changes.notes)) void lists(); });
  chrome.storage.local.get('settings').then(data => fill(data.settings)).catch(e => status(e.message));
  void lists(); countryList();
})();
