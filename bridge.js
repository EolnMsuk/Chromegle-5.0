/* MAIN world: WebRTC observation, passive report hints and an opt-in face worker override. */
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
      return { ipSkip: raw?.ipSkip !== false, countrySkip: raw?.countrySkip === true, facePresenceOverride: raw?.facePresenceOverride === true, detectReports: raw?.detectReports === true };
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
  let lastSnapshot = null;
  const skippedSessions = new Set();
  const emit = (kind, data) => { try { port?.postMessage({ kind, data }); } catch { /* Navigating away. */ } };
  // Beta heuristic, not a confirmed report protocol. The supplied page exposes
  // its own socket as window.socket. Never replace WebSocket, send, onmessage,
  // or message data; only listen while enabled. No probes or host DOM writes.
  let reportSocket = null, reportImageAt = null, reportScreenshotAt = null;
  let nextReportAt = 0;
  const resetReportPair = () => { reportImageAt = null; reportScreenshotAt = null; };
  function reportMessage(event) {
    if (!prefs.detectReports || event.currentTarget !== reportSocket || window.socket !== reportSocket || event.isTrusted !== true) return;
    if (typeof event.data !== 'string' || event.data.length > 16384) return;
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (!message || typeof message !== 'object' || Array.isArray(message)) return;
    // This acknowledges the local user's outgoing report, not a report against
    // them. Drop any partial pair too, to avoid correlating across that action.
    if (message.event === 'serverMessage' && typeof message.message === 'string' && /report received/i.test(message.message)) {
      resetReportPair(); return;
    }
    if (!['rimage', 'ss'].includes(message.event)) return;
    const now = Date.now();
    if (now < nextReportAt) return;
    if (message.event === 'rimage') reportImageAt = now;
    else reportScreenshotAt = now;
    if (reportImageAt === null || reportScreenshotAt === null || Math.abs(reportImageAt - reportScreenshotAt) > 5000) return;
    resetReportPair(); nextReportAt = now + 60000;
    emit('report-hint', { reason: 'paired-capture-requests' });
  }
  function observeReportSocket() {
    let socket = null;
    if (prefs.detectReports) {
      try {
        const candidate = window.socket;
        if (window.WebSocket && candidate instanceof window.WebSocket && candidate.readyState === window.WebSocket.OPEN) {
          const url = new URL(candidate.url);
          if (url.protocol === 'wss:' && url.origin === location.origin.replace(/^https:/, 'wss:') && url.pathname === '/ws') socket = candidate;
        }
      } catch { /* Site socket unavailable; do not create one. */ }
    }
    if (socket === reportSocket) return;
    reportSocket?.removeEventListener('message', reportMessage);
    reportSocket = socket; resetReportPair();
    reportSocket?.addEventListener('message', reportMessage);
    emit('report-observer', { watching: Boolean(reportSocket) });
  }
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const delay = (min, max) => min + Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * (max - min + 1));
  const countryName = () => (document.querySelector('#countryName')?.textContent || '').trim().slice(0, 160);
  function otherTracks() {
    return document.querySelector('#otherVideo')?.srcObject?.getVideoTracks?.().filter(t => t.readyState === 'live') || [];
  }
  function currentPeer() {
    const tracks = otherTracks();
    if (!tracks.length) return null;
    const matches = [...connections].filter(entry => !['closed','failed','disconnected'].includes(entry.pc.connectionState) && entry.pc.getReceivers().some(r => tracks.some(t => r.track === t || r.track?.id === t.id)));
    if (matches.length !== 1) return null;
    const entry = matches[0];
    return { entry, tracks, session: entry.id + ':' + entry.generation + ':' + tracks.map(t => t.id).sort().join(',') };
  }
  async function snapshot() {
    const peer = currentPeer();
    if (!peer) return null;
    const { entry, tracks, session } = peer;
    let stats;
    try { stats = await entry.pc.getStats(); } catch { /* Stats can be temporarily unavailable on a live peer. */ }
    // Connection identity does not depend on a successful stats refresh.
    if (currentPeer()?.session !== session) return null;
    const observation = { session, countryName: countryName(), selected: false };
    if (!stats) return observation;
    const remote = C.selectedRemote(stats, tracks.map(t => t.id));
    if (!remote) return observation;
    const address = remote.address || remote.ip || '';
    const fallback = entry.candidates.find(c => c.address === address && c.port === remote.port && c.protocol === remote.protocol);
    return {
      ...observation,
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
  // sourcecode.txt: Umingle posts {action: 'detectFaces', job_id, imageData}
  // to /static/vision.js. Its handler accepts f_res only when k equals
  // Math.imul(job_id * 10 + 1, 837921547) >>> 0, then sets lastFace and
  // sends faceShowing through its own findPeer message. No socket hook needed.
  function observeFaceWorker(worker) {
    let jobId = null;
    const post = worker.postMessage;
    Object.defineProperty(worker, 'postMessage', {
      configurable: true, writable: true, value: new Proxy(post, {
        apply(target, receiver, args) {
          const result = Reflect.apply(target, receiver, args);
          // Preserve native receiver checks, structured cloning, transfer and errors.
          if (receiver === worker && args[0]?.action === 'detectFaces') {
            jobId = Number.isSafeInteger(args[0].job_id) && args[0].job_id >= 0 ? args[0].job_id : null;
          }
          return result;
        }
      })
    });
    // Registered before the page assigns onmessage or adds any listeners.
    worker.addEventListener('message', event => {
      if (!prefs.facePresenceOverride || jobId === null) return;
      const data = event.data;
      if (!data || !['f_res', 'faceDetections'].includes(data.action)) return;
      try {
        Object.defineProperty(event, 'data', { configurable: true, value: {
          ...data, action: 'f_res', k: Math.imul(jobId * 10 + 1, 837921547) >>> 0
        } });
      } catch { /* Unknown/unmodifiable event: leave the native result intact. */ }
    }, true);
  }
  if (window.Worker) {
    replaceConstructor('Worker', window.Worker, { construct(target, args, newTarget) {
      const worker = Reflect.construct(target, args, newTarget);
      try {
        const url = new URL(args[0], document.baseURI || location.origin);
        if (url.origin === location.origin && url.pathname === '/static/vision.js') observeFaceWorker(worker);
      } catch { /* Unrecognized worker: preserve native behavior. */ }
      return worker;
    }});
  }
  function skipControl(label) {
    const usable = element => !element.disabled && !element.closest('[hidden], [inert], [disabled], [aria-disabled="true"]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
    // Read only the main label: the parent button also contains the "Esc" hint.
    // Click the button itself, including when the label has no layout box.
    const matches = button => usable(button) && (button.querySelector('.mainText')?.textContent || button.getAttribute('aria-label') || button.textContent || '').trim().toLowerCase() === label.toLowerCase();
    const explicit = [...document.querySelectorAll('button.skipButton, button#skipButton, button[data-action="skip"]')].filter(matches);
    if (explicit.length) return explicit.length === 1 ? explicit[0] : null;
    const labelled = [...document.querySelectorAll('button')].filter(matches);
    return labelled.length === 1 ? labelled[0] : null;
  }
  function pressEscape() {
    // Dispatch one bubbling key press so document/window handlers see it once.
    const target = document.activeElement || document.body || document;
    for (const type of ['keydown', 'keyup']) {
      target.dispatchEvent(new KeyboardEvent(type, {
        key: 'Escape', code: 'Escape', keyCode: 27, which: 27,
        bubbles: true, cancelable: true, composed: true, view: window
      }));
    }
  }
  async function skip(request) {
    if (skippedSessions.has(request.session)) return;
    const token = ++skipToken;
    const result = status => emit('skip-result', { session: request.session, requestId: request.requestId, status });
    const same = () => {
      if (token !== skipToken || document.visibilityState !== 'visible') return false;
      if (currentPeer()?.session !== request.session) return false;
      if (request.countryName !== undefined && countryName() !== request.countryName) return false;
      return !request.ip || lastSnapshot?.session !== request.session || !lastSnapshot.selected || lastSnapshot.ip === request.ip;
    };
    try {
      // The deadline survives peer changes, settings changes and cancellation.
      await sleep(Math.max(delay(1000, 2000), nextSkipAt - Date.now()));
      if (!same()) return result('cancelled');
      const button = skipControl('Skip');
      let usedEscape = !button;
      if (button) button.click();
      else pressEscape();
      await sleep(delay(1000, 2000));
      if (!same()) return result('cancelled');
      let confirm = skipControl('Really?');
      if (button && !confirm && skipControl('Skip')) {
        // The click did not advance the label. Start the two-Escape fallback.
        usedEscape = true;
        pressEscape();
        await sleep(delay(1000, 2000));
        if (!same()) return result('cancelled');
        confirm = null;
      }
      skippedSessions.add(request.session);
      if (skippedSessions.size > 200) skippedSessions.delete(skippedSessions.values().next().value);
      nextSkipAt = Date.now() + delay(4000, 6000);
      if (!usedEscape && confirm) confirm.click();
      else { usedEscape = true; pressEscape(); }
      result(usedEscape ? 'keyboard' : 'clicked');
    } catch { result('cancelled'); }
  }
  function receive(event) {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.kind === 'settings') {
      const next = C.settings(message.data);
      if (next.ipSkip !== prefs.ipSkip || next.countrySkip !== prefs.countrySkip) skipToken++;
      prefs = next;
      observeReportSocket();
    }
    if (message.kind === 'cancel') skipToken++;
    if (message.kind === 'skip' && (prefs.ipSkip || prefs.countrySkip) && typeof message.data?.session === 'string' && (C.ip(message.data?.ip) || typeof message.data?.countryName === 'string' && message.data.countryName.trim())) void skip(message.data);
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
    if (e.isTrusted && e.target?.closest?.('button, .mainText, #skipButton, .skipButton')) { skipToken++; emit('manual', null); }
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) skipToken++; });
  setInterval(async () => {
    observeReportSocket();
    if (busy) return;
    busy = true;
    try {
      const current = await snapshot();
      if (!current || current.selected || lastSnapshot?.session !== current.session) lastSnapshot = current;
      // Repeat snapshots so a late-starting isolated script can recover state.
      emit('connection', current);
    } catch { emit('connection', null); }
    finally { busy = false; }
  }, 700);
})();
