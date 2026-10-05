# Chromegle 6.0

A Manifest V3 extension for Chromium/Edge 116+ on `https://umingle.com` and `https://www.umingle.com`.

## Install / update

1. Open `edge://extensions` or `chrome://extensions`, enable Developer mode, and load this folder unpacked (or reload the existing extension).
2. Disable older Chromegle extensions and reload existing Umingle tabs so old hooks are removed.
3. The native browser sidebar opens on your first click or keypress in Umingle. Chrome requires a user gesture, so it cannot open immediately on page load. The extension toolbar icon also opens it. If you close it, it stays closed for the rest of that page visit.
4. Use Settings for preferences, blocked IPs and saved notes.

No build step, API key or account is required. Existing notes and block lists keep their storage keys. Legacy face/report and older hide/crop settings are ignored; the new face-presence preference starts disabled.

## Face Detection

Open Settings, enable **Face Detection → Report face present**, and click **Save settings**. Disable it and save to restore normal detection. Changes apply to the next detector result in open Umingle tabs. After updating the extension, reload existing Umingle tabs once to install the new hook.

The supplied `sourcecode.txt` uses `/static/vision.js` to process `detectFaces` requests with a `job_id`. The page accepts an `f_res` response when its `k` value equals `Math.imul(job_id * 10 + 1, 837921547) >>> 0`; it then sets `lastFace`, allows matching, and includes `faceShowing` in its own `findPeer` signaling when the value changes. The older `faceDetections` response is treated as a failed check by this source.

When enabled, Chromegle replaces only these two response types from the same-origin `/static/vision.js` worker with the accepted result for the current job. It keeps the actual worker and its camera-frame transfers, and leaves loading, errors, unrelated workers, and WebSocket messages unchanged. No camera image is replaced, so your partner still sees your actual feed. The separate blank-screen check, age verification and server checks remain active. A covered or blank camera may still be rejected. The hook depends on the supplied site's worker protocol; live Umingle acceptance has not been verified.

## Detect Reports (Beta)

After updating the extension, reload it in `chrome://extensions` or `edge://extensions`, then reload Umingle. Open Settings, enable **Detect Reports (Beta)**, and click **Save settings**. It starts disabled. Saving toggles observation in open tabs; disabling removes the listener and clears any alert.

This is an **unverified heuristic**, not confirmation that someone reported you. It looks for both `rimage` (camera-frame request) and `ss` (page-screenshot request) on the site's existing socket within five seconds, in either order. A match displays red **Possible report detected (Beta)** text in the extension sidebar for 30 seconds. Alerts are limited to one per minute. Routine moderation may cause false positives, and reports without this pair will be missed. Alerts are not attributed to the currently displayed participant or IP and are not saved as history.

The detector adds a read-only message listener to the existing same-origin `/ws` socket exposed by the supplied page as `window.socket`. It does not replace the WebSocket constructor, socket methods, or the site's message handler; modify messages; send requests; capture images; click controls; or add UI to Umingle. It uses no new permissions. While enabled, the sidebar shows whether it has attached to the site connection. If the site stops exposing that socket, the detector stays waiting. Messages arriving before attachment are not inspected.

**Report Received** acknowledges your own report and never triggers an alert; it also clears any incomplete pair. Individual capture requests, bans, skips and disconnects do not trigger alerts. Socket changes and disabling clear incomplete pairs. Enabling this feature does not enable auto-skip or the separate face-presence override. Passive observation does not establish compatibility with Umingle's extension policy or guarantee freedom from enforcement. Live report detection has not been verified. See [the investigation](REPORT-DETECTION.md) for evidence and limitations.

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

The compact header reads **Chromegle 6.0**. Face Detection and optional **Detect Reports (Beta)** are available in Settings. Report hints appear only in the extension sidebar; site WebSocket traffic is never rewritten.

`sidebar.js` requests the native browser side panel on the first trusted click or keypress, without adding any UI to the page. A successful open removes the gesture listeners so manually closing the sidebar is respected. If the browser rejects opening, a later gesture can retry. The sidebar follows the active tab and keeps its styles and flag font inside the extension document.

Encounter counts, notes and block lists are stored locally. Each normalized IP is counted once per connection session, even when ICE details change or the panel is reopened. Counts include the current encounter, begin when this feature is installed, and have no expiry; they survive browser restarts and extension updates. Removing the extension or clearing its storage removes these counts. The unlimitedStorage permission avoids the normal local-storage quota for the growing history. Notes are plain text keyed by normalized IP; empty notes delete the entry. Unsaved drafts survive same-IP reconnections. Editing a note pauses auto-skip for that connection.

## Architecture

- `bridge.js` observes WebRTC in MAIN through constructor/method proxies while preserving native prototypes, descriptors and return values. It also hooks the known face worker at document start so the optional face-presence override can be toggled without reloading. The beta report detector listens to received messages on the site's existing socket while enabled. It sends observations, report hints and validated skip results over a MessageChannel.
- `content.js` holds filter and connection state in the isolated world. It transfers the port in one same-window, same-origin startup message. This handoff and the hooks remain observable and are not authentication against a hostile page. Notes, geo, country lists and block lists are never sent into MAIN.
- `background.js` validates senders, routes panels by tab, serializes storage writes and performs fixed-endpoint geolocation. The provider receives only the selected public IP, with credentials omitted. Results are cached for 30 minutes (up to 200 entries), with a six-second timeout and a one-second request interval. Disable geolocation to stop lookups.
- `manifest.json` uses the native side panel with no web-accessible resources or in-page panel. UI uses locally packaged scripts with MV3 CSP. The extension requests `storage`, `unlimitedStorage`, `sidePanel`, and the existing geolocation host permission.

The existing provider is `https://m52o1m3c29.execute-api.eu-central-1.amazonaws.com/prod/geoip2?ip_address=...`.

## Support Developer

[Venmo](https://venmo.com/u/rustonrails) | Bitcoin: `31uHLpioo1TbxAmo9kM7rrKcLz3wvcoZaL`
