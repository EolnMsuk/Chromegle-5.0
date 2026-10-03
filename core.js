/* Pure helpers, shared by extension contexts and the page observer. */
(() => {
  'use strict';
  const defaults = Object.freeze({
    geoEnabled: true, ipSkip: true, countrySkip: false, countries: []
  });
  const countryCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');
  const regions = new Intl.DisplayNames(['en'], { type: 'region' });
  const aliases = { 'turkey': 'TR', 'türkiye': 'TR', 'the netherlands': 'NL', 'ivory coast': 'CI', 'swaziland': 'SZ', 'czech republic': 'CZ', 'republic of the congo': 'CG', 'democratic republic of the congo': 'CD', 'east timor': 'TL', 'vatican': 'VA' };
  function countryCode(value) {
    if (typeof value !== 'string') return '';
    const s = value.trim();
    if (countryCodes.includes(s.toUpperCase())) return s.toUpperCase();
    return aliases[s.toLowerCase()] || countryCodes.find(c => regions.of(c).toLowerCase() === s.toLowerCase()) || '';
  }
  function ip(value) {
    if (typeof value !== 'string' || value.length > 60) return '';
    const s = value.trim().toLowerCase().replace(/^\[|\]$/g, '');
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) {
      const parts = s.split('.');
      return parts.every(p => Number(p) <= 255 && String(Number(p)) === p) ? s : '';
    }
    if (!s.includes(':') || !/^[a-f\d:.]+$/.test(s)) return '';
    try { return new URL('http://[' + s + ']/').hostname.slice(1, -1); } catch { return ''; }
  }
  function publicIP(value) {
    const s = ip(value);
    if (!s) return false;
    if (s.includes(':')) {
      if (s.startsWith('::ffff:')) {
        const words = s.slice(7).split(':').map(x => parseInt(x, 16));
        return words.length === 2 && publicIP([words[0] >> 8, words[0] & 255, words[1] >> 8, words[1] & 255].join('.'));
      }
      // Conservatively allow global unicast only; exclude documentation/special ranges.
      return /^[23]/.test(s) && !/^2001:(?:db8|[01]|2[0-9a-f]):/.test(s) && !s.startsWith('2002:') && !s.startsWith('3fff:');
    }
    const [a,b,c] = s.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  function settings(raw = {}) {
    if (!raw || typeof raw !== 'object') raw = {};
    const out = { ...defaults };
    for (const k of Object.keys(defaults)) if (typeof defaults[k] === 'boolean') out[k] = raw[k] === undefined ? defaults[k] : raw[k] === true;
    out.countries = [...new Set((Array.isArray(raw.countries) ? raw.countries : []).map(countryCode).filter(Boolean))];
    return out;
  }
  function candidate(line) {
    if (typeof line !== 'string') return null;
    const fields = line.trim().replace(/^a=/, '').split(/\s+/);
    const i = fields.indexOf('typ');
    if (!fields[0]?.startsWith('candidate:') || i < 6) return null;
    return { address: fields[4], port: Number(fields[5]), protocol: fields[2].toLowerCase(), type: iceType(fields[i + 1]) };
  }
  function iceType(value) { return ['host','srflx','prflx','relay'].includes(value) ? value : 'unknown'; }
  function warning(type) {
    return type === 'relay' ? 'RELAY — TURN server address, not the peer’s location' : '';
  }
  function selectedRemote(stats, trackIds) {
    const rows = [...stats.values()];
    const video = rows.filter(r => r.type === 'inbound-rtp' && (r.kind || r.mediaType) === 'video' && trackIds.includes(r.trackIdentifier));
    const transports = [...new Set(video.map(r => r.transportId).filter(Boolean))];
    // Never fall back to an arbitrary successful pair or a local candidate.
    const remotes = transports.map(id => stats.get(stats.get(id)?.selectedCandidatePairId)).filter(p => p?.state === 'succeeded').map(p => stats.get(p.remoteCandidateId)).filter(r => r?.type === 'remote-candidate');
    if (remotes.length !== 1) return null;
    return remotes[0];
  }
  function normalizeGeo(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid geolocation response');
    const text = v => typeof v === 'string' ? v.slice(0, 160) : '';
    const code = countryCode(raw.country_code || raw.countryCode || raw.country);
    if (!code) throw new Error('Country unavailable from provider');
    return { code, country: regions.of(code), state: text(raw.state || raw.region), city: text(raw.city), isp: text(raw.isp) };
  }
  function flag(code) { return countryCodes.includes(code) ? String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt())) : ''; }
  function skipReason(current, prefs, blocked) {
    if (!current?.ip) return '';
    if (prefs.ipSkip && blocked.includes(current.ip)) return 'Blocked IP';
    // A relay's country is the server country, not the user's country.
    if (prefs.countrySkip && prefs.geoEnabled && ['host','srflx','prflx'].includes(current.type) && current.geo?.code && prefs.countries.includes(current.geo.code)) return 'Blocked country';
    return '';
  }
  const api = Object.freeze({ defaults, countryCodes, countryCode, regions, ip, publicIP, settings, candidate, iceType, warning, selectedRemote, normalizeGeo, flag, skipReason });
  Object.defineProperty(globalThis, 'ChromegleCore', { value: api, configurable: true });
})();
