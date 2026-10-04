# Chromegle 6.0

A Manifest V3 extension for Chromium/Edge 116+ on `https://umingle.com` and `https://www.umingle.com`.

## Install / update

1. Open `edge://extensions` or `chrome://extensions`, enable Developer mode, and load this folder unpacked (or reload the existing extension).
2. Disable older Chromegle extensions and reload existing Umingle tabs so old hooks are removed.
3. The native browser sidebar opens on your first click or keypress in Umingle. Chrome requires a user gesture, so it cannot open immediately on page load. The extension toolbar icon also opens it. If you close it, it stays closed for the rest of that page visit.
4. Use Settings for preferences, blocked IPs and saved notes.

No build step, API key or account is required. Existing notes and block lists keep their storage keys. Removed face/report and older hide/crop settings are ignored.

## Connection display

The extension reads the selected remote ICE candidate carrying the video track in `#otherVideo`. It checks stats every 700 ms to detect reconnections and selected-address changes. Live peer/track identity is tracked separately: missing or failed stats retain the last IP and geo without cancelling auto-skip. A missing or disconnected peer retains the last display with a last-known status and cancels pending clicks.

A new session with the same IP reuses its displayed geo. A changed IP starts a new lookup, and stale asynchronous results cannot overwrite a replacement connection. Failed lookups retry automatically after 2 seconds, backing off to at most 30 seconds. Successful results are checked every 30 seconds through the background cache. Automatic and manual retries preserve existing geo while requests run or fail. Unchanged results do not publish another UI update. IP, country flag and geo text are only rewritten when their displayed values change. Disabling geolocation clears geo intentionally and stops retries.

Relay/TURN IPs and available geo remain visible with a warning that the location belongs to the relay server. VPN/proxy IPs are displayed normally; WebRTC alone does not reliably identify VPN use. Country skipping uses Umingle's participant label for every ICE type. IP blocking applies to all valid addresses, including relays.

Locations are approximate, and shared addresses do not identify a person. Withheld, hostname-only or private/reserved addresses cannot be geolocated. No additional ICE probes, camera or microphone requests are introduced.

## Auto-skip

IP skipping is enabled by default with an empty block list. Country skipping is optional and compares the current `#countryName` text (for example, `United States`) against selected country codes. It does not use IP geolocation and works with geolocation disabled or an unavailable IP. Missing or unrecognized country labels do not trigger country skipping.

Both filters wait a random 1-2 seconds before clicking `Skip`, then a separately randomized 1-2 seconds before clicking `Really?`. After confirmation, a random 4-6 second cooldown prevents the next skip sequence from starting early, including across reconnections, settings changes and cancellations. The bridge prevents another confirmed sequence for a session already skipped (up to the most recent 200 sessions). Before each click, it revalidates the live peer/track identity and visibility, plus the last observed IP for IP skips or the site country label for country skips. Stats refreshes and ICE type changes do not reset an attempt; IP discovery or address changes do not interrupt a country-based attempt for the same peer and label.

The bridge targets a unique, visible, enabled `button.skipButton` (also recognizing `button#skipButton` and `button[data-action="skip"]`). It reads the nested `.mainText` for `Skip` or `Really?` and clicks the parent button, ignoring the `.subText` Esc hint. It can also match another button by its main label. Missing, hidden, disabled or ambiguous controls do not produce a click.

When a click target cannot be found, the bridge falls back to bubbling Escape keydown/keyup events. If the first button is missing, it sends two Escape presses 1-2 seconds apart. If the first click leaves the label on `Skip`, it switches to the same two-Escape sequence. If the first click advances but the confirmation button is missing, one Escape completes that sequence. The same 4-6 second cooldown applies after the final action. Each action rechecks the connection, visibility and filter target; completed sessions are not repeated. Synthetic keys may be ignored by sites requiring trusted input, so fallback status reports an attempt rather than confirmed success.

Real Escape presses, manual control interaction, note editing, visibility changes and connection changes cancel pending attempts. The extension's own Escape events do not cancel its sequence. A cancelled request's late result cannot overwrite a newer attempt. Manual interaction and note editing keep that session paused. Live Umingle acceptance remains unverified.

## Sidebar and storage

The compact header reads **Chromegle 6.0**. Face Detection/face bypass and Report Detection/signal alerts have been removed, including Worker and WebSocket interception.

`sidebar.js` requests the native browser side panel on the first trusted click or keypress, without adding any UI to the page. A successful open removes the gesture listeners so manually closing the sidebar is respected. If the browser rejects opening, a later gesture can retry. The sidebar follows the active tab and keeps its styles and flag font inside the extension document.

Encounter counts, notes and block lists are stored locally. Each normalized IP is counted once per connection session, even when ICE details change or the panel is reopened. Counts include the current encounter, begin when this feature is installed, and have no expiry; they survive browser restarts and extension updates. Removing the extension or clearing its storage removes these counts. The unlimitedStorage permission avoids the normal local-storage quota for the growing history. Notes are plain text keyed by normalized IP; empty notes delete the entry. Unsaved drafts survive same-IP reconnections. Editing a note pauses auto-skip for that connection.

## Architecture

- `bridge.js` observes WebRTC in MAIN through constructor/method proxies while preserving native prototypes, descriptors and return values. It sends observations and validated skip results over a MessageChannel.
- `content.js` holds filter and connection state in the isolated world. It transfers the port in one same-window, same-origin startup message. This handoff and the hooks remain observable and are not authentication against a hostile page. Notes, geo, country lists and block lists are never sent into MAIN.
- `background.js` validates senders, routes panels by tab, serializes storage writes and performs fixed-endpoint geolocation. The provider receives only the selected public IP, with credentials omitted. Results are cached for 30 minutes (up to 200 entries), with a six-second timeout and a one-second request interval. Disable geolocation to stop lookups.
- `manifest.json` uses the native side panel with no web-accessible resources or in-page panel. UI uses locally packaged scripts with MV3 CSP. The extension requests `storage`, `unlimitedStorage`, `sidePanel`, and the existing geolocation host permission.

The existing provider is `https://m52o1m3c29.execute-api.eu-central-1.amazonaws.com/prod/geoip2?ip_address=...`.

## Validation

Run the behavioral regression tests with Node.js:

```text
node --test tests/*.test.cjs
```

The tests run the bridge and content scripts together with simulated WebRTC, DOM controls, extension messaging and a deterministic clock. They cover both random timing boundaries, the two-click sequence, cooldown across peer changes, transient stats failures, site country filtering, cancellation, stale request results, automatic geo retry/backoff, unchanged display data, stale geo results, and persistent encounter counting. These tests do not contact live chats or external geolocation services.

## References and license

[Chrome sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [content-script execution worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [MessageChannel and port transfer](https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API), [event isTrusted](https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted), [Function.toString](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/toString), [WebRTC statistics](https://www.w3.org/TR/webrtc-stats/).

[Venmo](https://venmo.com/u/rustonrails) | Bitcoin: `31uHLpioo1TbxAmo9kM7rrKcLz3wvcoZaL`
