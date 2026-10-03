/* MAIN world: observes native APIs. No signaling messages are sent or suppressed. */
(() => {
  'use strict';
  // This file is self-contained: no extension objects are installed on window.
  const C = {
    ip(value) {
      if (typeof value !== 'string' || value.length > 60) return '';
      const s = value.trim().toLowerCase().replace(/^\[|\]$/g, '');
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return s.split('.').every(p => Number(p) <= 255 && String(Number(p)) === p) ? s : '';
      if (!s.includes(':') || !/^[a-f\d:.]+$/.test(s)) return '';
      try { return new URL('http://[' + s + ']/').hostname.slice(1, -1); } catch { return ''; }
    },
    iceType(value) { return ['host','srflx','prflx','relay'].includes(value) ? value : 'unknown'; },
    settings(raw = {}) {
      return { ipSkip: raw?.ipSkip !== false, countrySkip: raw?.countrySkip === true };
    },
    candidate(line) {
      if (typeof line !== 'string') return null;
      const f = line.trim().replace(/^a=/, '').split(/\s+/), i = f.indexOf('typ');
      return f[0]?.startsWith('candidate:') && i >= 6 ? { address: f[4], port: Number(f[5]), protocol: f[2].toLowerCase(), type: C.iceType(f[i + 1]) } : null;
    },
    selectedRemote(stats, ids) {
      const transports = [...new Set([...stats.values()].filter(r => r.type === 'inbound-rtp' && (r.kind || r.mediaType) === 'video' && ids.includes(r.trackIdentifier)).map(r => r.transportId).filter(Boolean))];
      const remotes = transports.map(id => stats.get(stats.get(id)?.selectedCandidatePairId)).filter(p => p?.state === 'succeeded').map(p => stats.get(p.remoteCandidateId)).filter(r => r?.type === 'remote-candidate');
      return remotes.length === 1 ? remotes[0] : null;
    }
  };
  const connections = new Set();
  const entries = new WeakMap();
  let port = null;
  let sequence = 0, prefs = C.settings(), busy = false, skipToken = 0;
  let nextSkipAt = 0;
  const skippedSessions = new Set();
  const emit = (kind, data) => { try { port?.postMessage({ kind, data }); } catch { /* Navigating away. */ } };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const delay = () => 2000 + Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * 3001);
  function otherTracks() {
    return document.querySelector('#otherVideo')?.srcObject?.getVideoTracks?.().filter(t => t.readyState === 'live') || [];
  }
  async function snapshot() {
    const tracks = otherTracks();
    if (!tracks.length) return null;
    const matches = [...connections].filter(entry => !['closed','failed','disconnected'].includes(entry.pc.connectionState) && entry.pc.getReceivers().some(r => tracks.some(t => r.track === t || r.track?.id === t.id)));
    if (matches.length !== 1) return null;
    const entry = matches[0], generation = entry.generation;
    const stats = await entry.pc.getStats();
    // Awaiting stats must not attach an old result to a replacement stream.
    if (generation !== entry.generation || !tracks.every(t => otherTracks().some(now => now.id === t.id)) || ['closed','failed','disconnected'].includes(entry.pc.connectionState)) return null;
    const remote = C.selectedRemote(stats, tracks.map(t => t.id));
    if (!remote) return null;
    const address = remote.address || remote.ip || '';
    const fallback = entry.candidates.find(c => c.address === address && c.port === remote.port && c.protocol === remote.protocol);
    return {
      session: entry.id + ':' + generation + ':' + tracks.map(t => t.id).sort().join(','),
      ip: C.ip(address), address: String(address).slice(0, 100),
      type: C.iceType(remote.candidateType || fallback?.type), selected: true
    };
  }
  function addCandidate(entry, line) {
    const parsed = C.candidate(line);
    if (parsed && entry.candidates.length < 100) entry.candidates.push(parsed);
  }
  function observe(pc) {
    const entry = { pc, id: ++sequence, generation: 0, ufrag: '', candidates: [] };
    connections.add(entry);
    entries.set(pc, entry);
    pc.addEventListener('connectionstatechange', () => { if (pc.connectionState === 'closed') connections.delete(entry); });
    return pc;
  }
  function intercept(prototype, name, after) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (typeof descriptor?.value !== 'function') return;
    // Callable proxies naturally stringify as native code. Preserve descriptors,
    // receivers, return values and native errors; never patch Function.toString.
    Object.defineProperty(prototype, name, { ...descriptor, value: new Proxy(descriptor.value, {
      apply(target, receiver, args) {
        const result = Reflect.apply(target, receiver, args);
        try { const entry = entries.get(receiver); if (entry) after(entry, args, result); } catch { /* Observation only. */ }
        return result;
      }
    }) });
  }
  function replaceConstructor(name, Native, handler) {
    const proxy = new Proxy(Native, handler);
    const descriptor = Object.getOwnPropertyDescriptor(window, name);
    Object.defineProperty(window, name, { ...descriptor, value: proxy });
    const constructor = Object.getOwnPropertyDescriptor(Native.prototype, 'constructor');
    if (constructor?.value === Native) Object.defineProperty(Native.prototype, 'constructor', { ...constructor, value: proxy });
    // Chromium's legacy alias must not bypass observation or break equality.
    if (name === 'RTCPeerConnection' && window.webkitRTCPeerConnection === Native) {
      const alias = Object.getOwnPropertyDescriptor(window, 'webkitRTCPeerConnection');
      Object.defineProperty(window, 'webkitRTCPeerConnection', { ...alias, value: proxy });
    }
  }
  if (window.RTCPeerConnection) {
    const Native = window.RTCPeerConnection;
    intercept(Native.prototype, 'addIceCandidate', (entry, args) => addCandidate(entry, args[0]?.candidate));
    intercept(Native.prototype, 'setRemoteDescription', (entry, args, result) => {
      Promise.resolve(result).then(() => {
        const sdp = entry.pc.remoteDescription?.sdp || '';
        const ufrag = [...sdp.matchAll(/^a=ice-ufrag:(.*)$/gm)].map(m => m[1].trim()).join('|');
        if (ufrag !== entry.ufrag) {
          entry.ufrag = ufrag;
          entry.generation++;
          entry.candidates = [];
        }
        for (const line of sdp.split(/\r?\n/)) if (line.startsWith('a=candidate:')) addCandidate(entry, line);
      }).catch(() => {});
    });
    intercept(Native.prototype, 'close', entry => connections.delete(entry));
    replaceConstructor('RTCPeerConnection', Native, { construct(target, args, newTarget) {
      const pc = Reflect.construct(target, args, newTarget);
      try { observe(pc); } catch { /* Return the real PC even if instrumentation fails. */ }
      return pc;
    }});
  }
  const SKIP_SELECTOR = 'button.skipButton, button#skipButton, button[data-action="skip"], button[data-action="next"], button#nextButton';
  function skipControl() {
    const usable = button => !button.disabled && button.getAttribute('aria-disabled') !== 'true' && !button.closest('[hidden], [inert]') && button.getClientRects().length > 0 && getComputedStyle(button).visibility !== 'hidden';
    const explicit = [...document.querySelectorAll(SKIP_SELECTOR)].filter(usable);
    if (explicit.length === 1) return explicit[0];
    if (explicit.length > 1) return null;
    // Conservative fallback; never click arbitrary links or ambiguous controls.
    const labelled = [...document.querySelectorAll('button')].filter(button => usable(button) && /^(next|skip|next stranger|skip stranger)$/i.test((button.getAttribute('aria-label') || button.textContent || '').trim()));
    return labelled.length === 1 ? labelled[0] : null;
  }
  async function skip(request) {
    if (skippedSessions.has(request.session)) return;
    const token = ++skipToken;
    const same = async () => {
      if (token !== skipToken || document.visibilityState !== 'visible') return false;
      const current = await snapshot();
      return token === skipToken && current?.session === request.session && current?.ip === request.ip;
    };
    try {
      // The deadline survives peer changes, settings changes and cancellation.
      await sleep(Math.max(delay(), nextSkipAt - Date.now()));
      if (!await same()) return emit('skip-result', { session: request.session, status: 'cancelled' });
      const button = skipControl();
      if (!button) return emit('skip-result', { session: request.session, status: 'unavailable' });
      skippedSessions.add(request.session);
      if (skippedSessions.size > 200) skippedSessions.delete(skippedSessions.values().next().value);
      nextSkipAt = Date.now() + delay();
      button.click();
      emit('skip-result', { session: request.session, status: 'clicked' });
    } catch { emit('skip-result', { session: request.session, status: 'cancelled' }); }
  }
  function receive(event) {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.kind === 'settings') { prefs = C.settings(message.data); skipToken++; }
    if (message.kind === 'cancel') skipToken++;
    if (message.kind === 'skip' && (prefs.ipSkip || prefs.countrySkip) && typeof message.data?.session === 'string' && C.ip(message.data?.ip)) void skip(message.data);
  }
  function establish(event) {
    if (port || event.source !== window || event.origin !== location.origin || event.data?.type !== 'chromegle-port-v1' || event.ports?.length !== 1) return;
    port = event.ports[0];
    window.removeEventListener('message', establish);
    port.onmessage = receive;
    port.start();
    emit('ready', null);
  }
  // The one-time handoff is observable and is NOT authentication against the
  // page. Only subsequent traffic travels over the port. Never send secrets.
  window.addEventListener('message', establish);
  document.addEventListener('keydown', e => { if (e.isTrusted && e.key === 'Escape') { skipToken++; emit('manual', null); } }, true);
  document.addEventListener('pointerdown', e => {
    if (e.isTrusted && e.target?.closest?.('button')) { skipToken++; emit('manual', null); }
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) skipToken++; });
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const current = await snapshot();
      // Repeat snapshots so a late-starting isolated script can recover state.
      emit('connection', current);
    } catch { emit('connection', null); }
    finally { busy = false; }
  }, 700);
})();
