# Report detection investigation

Reviewed the supplied `sourcecode.txt` on October 5, 2026. No reliable incoming signal meaning **another user reported you** was established. At the user's request, Chromegle now provides an optional, explicitly uncertain **Detect Reports (Beta)** heuristic.

## Implemented beta behavior

Disabled by default. When enabled, a listener on the site's existing same-origin `/ws` socket watches received JSON messages. An `rimage` request and an `ss` request within five seconds, in either order, produce a red **Possible report detected (Beta)** alert in the extension sidebar. It lasts 30 seconds with a one-minute cooldown. The idea that paired capture requests may accompany a report is a guess; the source does not establish that relationship. Routine moderation may produce the same pair, and real reports may produce neither event.

The observer does not replace constructors, methods or handlers, change received data, send traffic, capture media, click controls, or modify the host page. No new permissions are required. Disabling detaches the listener and clears the alert. Reconnecting clears any partial pair. The alert is not associated with a particular participant/IP and is not stored. This does not guarantee how the site treats extensions. Existing auto-skip and face-presence settings operate independently.

## Evidence from the supplied source

The main application script is on line 632. Its obfuscated string table was decoded statically without executing the page. The relevant logic, with property names decoded and local variables simplified, is:

```js
// Runs in the browser of the person submitting a report.
window.actions.report = id => {
  m.socket.send(JSON.stringify({ event: 'report', id }));
  window.addServerMessage(
    'Thank you! Your report has been received and is under review.'
  );
};
```

The `id` comes from a selected saved connection. Reports can therefore concern a previous connection. The confirmation above is displayed locally immediately after sending; it does not establish what the server sends to either participant.

There is also an incoming WebSocket branch:

```js
if (message.event === 'serverMessage') {
  if (message.message &&
      message.message.toLowerCase().includes('report received')) {
    console.log('returned for debug');
    return;
  }
  // Otherwise display the server message.
}
```

The user confirmed that **Report Received** acknowledges their own outgoing report. It is excluded from detection and clears any incomplete capture-request pair. It must not be treated as a report against the local user.

Other incoming events include `rimage` (capture/upload a local camera frame), `ss` (capture/upload a page screenshot), `banned`, and `end`. The code does not establish that these events occur exclusively when another participant submits a report. The `flag` field in an `end` event affects automatic searching after disconnection; it is not identified as a report flag. None justifies a confirmed-report alert; only the paired capture requests are used as the explicitly uncertain beta hint.

## Optional future validation

The user cannot arrange a known-report test. The beta feature does not require one; the following procedure is retained only for possible future validation.

The most useful evidence is the target browser's incoming WebSocket messages around a report whose submission time is known, plus a normal skip/disconnect comparison. If available, the site's backend handler for `{event: 'report', id}` would establish which clients receive which messages directly.

To capture browser evidence:

1. In Chrome, open Umingle and press **F12**. Select **Network**, enable **Preserve log**, and reload with DevTools open.
2. Select the **WS** filter, select the connection whose URL ends in `/ws?video` (or `/ws?text`), and open **Messages**. The source constructs this URL from the current site's host.
3. Capture a normal connection and a normal skip/disconnect first. Keep approximately 10 seconds before and 30 seconds after the action, recording message payloads, direction (sent/received), and timestamps.
4. Capture the same window around a known report against your session. Use an existing confirmed incident, or a permitted test with a consenting participant/test environment. Mark which browser is the reporting side, which is the reported side, and the exact submission time. The reported side must not also submit a report during that window.
5. Copy the text frame contents into a text file and provide it here. Include all incoming text frames in the window, especially `serverMessage`, `rimage`, `ss`, `end` with any `flag`, and any unfamiliar event. If accessible, provide the reporting side's corresponding frames separately, including its outgoing `{event: 'report', id}`. Include normal skip/disconnect frames as the comparison.
6. Remove cookies, authorization/payment tokens, personal chat content, and IP/ICE addresses. Replace connection IDs consistently so messages can still be correlated. Camera/screenshot binary contents are unnecessary; just note their direction, timestamp, and length.

Chrome documents the WS filter and Messages tab in its [Network reference](https://developer.chrome.com/docs/devtools/network/reference#frames). Copy the actual frames; a request-header screenshot alone will not show the needed events.

If a target-side signal is confirmed, it could replace the heuristic and justify stronger wording. Until then, the alert must retain **Possible** and **Beta**. If the server sends no distinguishing information to the reported browser, a client-side extension cannot reliably infer the report from a skip or disconnection.
