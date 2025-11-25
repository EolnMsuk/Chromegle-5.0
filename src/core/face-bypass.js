// In src/core/face-bypass.js

(function() {
    'use strict';
    // This script must run at document_start in the MAIN world.

    console.log('Chromegle Extension: Bypasses initializing...'); // Initial log

    // --- Helper Function for Notification (Keep this) ---
    function showReportNotification() {
        // Remove any existing notification first
        const existingNotification = document.getElementById('chromegle-report-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create the notification element
        const notificationDiv = document.createElement('div');
        notificationDiv.id = 'chromegle-report-notification'; // ID for Selenium
        notificationDiv.style.position = 'absolute';
        notificationDiv.style.top = '75px'; // Adjust as needed
        notificationDiv.style.left = '10px'; // Adjust as needed
        notificationDiv.style.zIndex = '99999';
        notificationDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.85)';
        notificationDiv.style.color = 'white';
        notificationDiv.style.padding = '15px';
        notificationDiv.style.borderRadius = '8px';
        notificationDiv.style.border = '1px solid darkred';
        notificationDiv.style.fontSize = '16px';
        notificationDiv.style.fontWeight = 'bold';
        notificationDiv.style.textAlign = 'center';
        notificationDiv.style.maxWidth = 'calc(50% - 20px)';
        notificationDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
        notificationDiv.style.pointerEvents = 'none';

        let message = 'Someone reported us.';

        notificationDiv.textContent = message;
        document.body.appendChild(notificationDiv);

        setTimeout(() => {
            if (notificationDiv) {
                notificationDiv.remove();
            }
        }, 10000); // 10 seconds
    }


    // --- Face Bypass Logic (Keep this) ---
    const OriginalWorker = window.Worker;
    const PatchedWorker = function(scriptURL) {
        if (scriptURL.includes('vision-core.js')) {
            console.log('Chromegle Extension: Face detection worker intercepted.');
            const dummyWorkerCode = `
                self.onmessage = function(e) {
                    // Always report one face detected
                    self.postMessage({ action: 'faceDetections', faces: 1 });
                };
            `;
            const blob = new Blob([dummyWorkerCode], { type: 'application/javascript' });
            return new OriginalWorker(URL.createObjectURL(blob));
        }
        // If it's not the vision worker, create a normal worker
        return new OriginalWorker(scriptURL);
    };
    PatchedWorker.prototype = OriginalWorker.prototype;
    // Overwrite the original Worker constructor
    Object.defineProperty(window, 'Worker', { value: PatchedWorker, writable: true, configurable: true });
    console.log('Chromegle Extension: Worker API patched for face bypass.');


    // --- WebSocket Interception Logic (Keep this, allows bans/reports) ---
    const OriginalWebSocket = window.WebSocket;
    const OriginalWebSocketSend = OriginalWebSocket.prototype.send;

    const PatchedWebSocket = function(...args) {
        const socket = new OriginalWebSocket(...args);
        let originalOnMessage = null;

        // Intercept setting the 'onmessage' handler
        Object.defineProperty(socket, 'onmessage', {
            get: () => originalOnMessage,
            set: (listener) => {
                originalOnMessage = listener;
                // Add our own listener that wraps the original
                socket.addEventListener('message', (event) => {
                    let shouldCallOriginal = true; // Flag to control if original listener is called
                    try {
                        // Check if the message is a JSON string
                        if (typeof event.data === 'string' && event.data.startsWith('{')) {
                            const msg = JSON.parse(event.data);

                            // --- Report Detection (MODIFIED) ---
                            if (msg.event === 'rimage') {
                                console.warn('Chromegle Extension: Report detected! (rimage event)');
                                
                                // Show visual notification
                                showReportNotification(); // We don't have the IP here

                                // --- REMOVED ---
                                // The CustomEvent dispatch has been removed.
                                // This will no longer trigger the note-saving logic.
                                // --- END REMOVAL ---
                            }

                            // Ban blocking code was previously here - it is now removed to allow bans.

                        }
                    } catch (err) {
                       // console.debug('Chromegle Extension: Error parsing WebSocket message', err);
                    }

                    // Call the original listener if it exists
                    if (shouldCallOriginal && originalOnMessage) {
                        try {
                            originalOnMessage.call(socket, event);
                        } catch (err) {
                            console.error('Chromegle Extension: Error in original onmessage handler', err);
                        }
                    }
                });
            },
            configurable: true,
            enumerable: true
        });

        // Ensure the 'send' method still works correctly
        socket.send = OriginalWebSocketSend.bind(socket);
        return socket;
    };

    PatchedWebSocket.prototype = OriginalWebSocket.prototype;
    // Overwrite the original WebSocket constructor
    Object.defineProperty(window, 'WebSocket', { value: PatchedWebSocket, writable: true, configurable: true });
    console.log('Chromegle Extension: WebSocket API patched for message interception.');

    // --- Virtual Camera Bypass Logic was REMOVED from here ---

    console.log('Chromegle Extension: Bypasses initialized.'); // Final log

})();