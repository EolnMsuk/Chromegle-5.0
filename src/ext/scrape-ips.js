document.addEventListener('scrapeAddress', () => {

    window.oRTCPeerConnection = (window.oRTCPeerConnection || window.RTCPeerConnection);

    // Override the RTC peer connection creation to scrape our data
    window.RTCPeerConnection = function (...args) {

        // --- START OF FIX: New two-flag logic ---
        let hasSentSrflx = false; // Have we sent the *real* IP?
        let hasSentAny = false;   // Have we sent *any* IP (including relay)?
        // --- END OF FIX ---

        const conn = new window.oRTCPeerConnection(...args)
        conn.oaddIceCandidate = conn.addIceCandidate;

        // Override adding ice candidates to scrape our data
        conn.addIceCandidate = async function (iceCandidate, ...rest) {
            
            try { // Added a try/catch block to prevent future crashes
                let fields = iceCandidate.candidate.split(' ');
                let ipAddress = fields[4];
                let ipType = fields[7]; // This will be 'srflx', 'relay', or 'host'

                // --- START OF FIX: New prioritization logic ---

                // 1. If it's the REAL IP (srflx)
                if (ipType === 'srflx') {
                    // If we haven't sent it yet, send it.
                    if (!hasSentSrflx) {
                        console.log("Chromegle Scraper: SRFLX (real) IP found. Sending.");
                        window.dispatchEvent(new CustomEvent("displayScrapeData", {detail: {ip: ipAddress, type: ipType}}));
                        hasSentSrflx = true;
                        hasSentAny = true; // A real IP is also "any" IP.
                    }
                } 
                
                // 2. If it's a RELAY IP
                else if (ipType === 'relay') {
                    // Only send it if we haven't already sent a REAL one AND we haven't sent ANY (relay) one yet.
                    if (!hasSentSrflx && !hasSentAny) {
                        console.log("Chromegle Scraper: Relay IP found. Sending as fallback.");
                        window.dispatchEvent(new CustomEvent("displayScrapeData", {detail: {ip: ipAddress, type: ipType}}));
                        hasSentAny = true; // Mark that we've at least sent the relay IP.
                    }
                }
                // --- END OF FIX ---

            } catch (e) {
                // Log any errors to the main console
                console.error("Chromegle Scraper Error in addIceCandidate:", e, iceCandidate?.candidate);
            }

            return conn.oaddIceCandidate(iceCandidate, ...rest);
        }

        // Return the connection
        return conn;
    }

});