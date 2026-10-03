# Chromegle 6.0

A Manifest V3 extension for Chromium/Edge 116+ on `https://umingle.com` and `https://www.umingle.com`.

## Install / update

1. Open `edge://extensions` or `chrome://extensions`, enable Developer mode, and load this folder unpacked (or reload the existing extension).
2. Disable older Chromegle extensions and reload existing Umingle tabs so old hooks are removed.
3. The native browser sidebar opens on your first click or keypress in Umingle. Chrome requires a user gesture, so it cannot open immediately on page load. The extension toolbar icon also opens it. If you close it, it stays closed for the rest of that page visit.
4. Use Settings for preferences, blocked IPs and saved notes.

No build step, API key or account is required. Existing notes and block lists keep their storage keys. Removed face/report and older hide/crop settings are ignored.

## Connection display

The extension reads the selected remote ICE candidate carrying the video track in `#otherVideo`. It checks stats every 700 ms to detect reconnections and selected-address changes; unchanged snapshots do not trigger lookups or UI updates. Temporary missing snapshots retain the last IP and geo with a last-known status. Auto-skip is disabled while no current connection is confirmed.

A new session with the same IP reuses its displayed geo. A changed IP starts a new lookup, and stale asynchronous results cannot overwrite a replacement connection. Retry location preserves existing geo while the request runs. IP, country flag and geo text are only rewritten when their displayed values change. Disabling geolocation clears geo intentionally.

Relay/TURN IPs and available geo remain visible with a warning that the location belongs to the relay server. VPN/proxy IPs are displayed normally; WebRTC alone does not reliably identify VPN use. Country skipping continues to exclude relay/unknown ICE types. IP blocking applies to all valid addresses, including relays.

Locations are approximate, and shared addresses do not identify a person. Withheld, hostname-only or private/reserved addresses cannot be geolocated. No additional ICE probes, camera or microphone requests are introduced.

## Auto-skip

IP skipping is enabled by default with an empty block list. Country skipping is optional and requires geolocation and selected country codes.

Both filters use the same random 2-5 second wait and a cooldown deadline that survives reconnections, settings changes and cancelled attempts. The bridge prevents another click for a session already skipped (up to the most recent 200 sessions). Before clicking, it revalidates the visible session and IP. Missing, hidden, disabled or ambiguous controls do not produce a click.

Recognized buttons include `.skipButton`, `#skipButton`, `[data-action="skip"]`, `[data-action="next"]` and `#nextButton`, with a conservative fallback for a unique Next/Skip label. Escape, manual button interaction, note editing, visibility changes and connection changes cancel pending attempts. There are no synthetic keyboard events. A programmatic click reports an attempt, not a confirmed successful skip; live Umingle acceptance remains unverified.

## Sidebar and storage

The compact header reads **Chromegle 6.0**. Face Detection/face bypass and Report Detection/signal alerts have been removed, including Worker and WebSocket interception.

`sidebar.js` requests the native browser side panel on the first trusted click or keypress, without adding any UI to the page. A successful open removes the gesture listeners so manually closing the sidebar is respected. If the browser rejects opening, a later gesture can retry. The sidebar follows the active tab and keeps its styles and flag font inside the extension document.

Notes and block lists are stored locally. Notes are plain text keyed by normalized IP; empty notes delete the entry. Unsaved drafts survive same-IP reconnections. Editing a note pauses auto-skip for that connection.

## Architecture

- `bridge.js` observes WebRTC in MAIN through constructor/method proxies while preserving native prototypes, descriptors and return values. It sends observations and validated skip results over a MessageChannel.
- `content.js` holds filter and connection state in the isolated world. It transfers the port in one same-window, same-origin startup message. This handoff and the hooks remain observable and are not authentication against a hostile page. Notes, geo, country lists and block lists are never sent into MAIN.
- `background.js` validates senders, routes panels by tab, serializes storage writes and performs fixed-endpoint geolocation. The provider receives only the selected public IP, with credentials omitted. Results are cached for 30 minutes (up to 200 entries), with a six-second timeout and a one-second request interval. Disable geolocation to stop lookups.
- `manifest.json` uses the native side panel with no web-accessible resources or in-page panel. UI uses locally packaged scripts with MV3 CSP. The extension requests `storage`, `sidePanel`, and the existing geolocation host permission.

The existing provider is `https://m52o1m3c29.execute-api.eu-central-1.amazonaws.com/prod/geoip2?ip_address=...`.

## Validation

Run behavioral tests and the disposable local Edge fixture:

```text
node --test tests/core.test.cjs
python tests/edge-smoke.py
```

The Node suite covers selected-pair mapping, stale results, retained geo, relay filtering, cooldown boundaries across reconnections, duplicate click prevention, cancellation, removed hooks, storage, native-sidebar gesture handling and panel routing. The Edge fixture checks real MAIN/ISOLATED handoff and loopback WebRTC, absence of an in-page panel, compact native-panel layout, notes/settings, relay display and unchanged geo rendering, auto-skip and retained disconnect state.

Browser tests use a disposable extension/profile and a local geolocation fixture, without live chats or external geo requests. They require Python/Selenium and Edge. Results and a screenshot are saved inside `validation/`. `REVIEW-5.0.md` describes the prior implementation.

## References and license

[Chrome sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [content-script execution worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [MessageChannel and port transfer](https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API), [event isTrusted](https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted), [Function.toString](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/toString), [WebRTC statistics](https://www.w3.org/TR/webrtc-stats/).

The inherited LICENSE is retained. The upstream README named GPL-3.0 while its LICENSE contains CC0; this inconsistency remains recorded. Bundled Noto Color Emoji uses the SIL Open Font License in `assets/FONT-LICENSE.txt`. Legacy project authors: EolnMsuk, xanzinfl, flouflouit and Isaac Kogan.
