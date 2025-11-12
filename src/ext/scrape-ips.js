document.addEventListener('scrapeAddress', () => {

    window.oRTCPeerConnection = (window.oRTCPeerConnection || window.RTCPeerConnection);

    // Override the RTC peer connection creation to scrape our data
    window.RTCPeerConnection = function (...args) {

        let hasSentSrflx = false;

        const conn = new window.oRTCPeerConnection(...args)
        conn.oaddIceCandidate = conn.addIceCandidate;

        // Override adding ice candidates to scrape our data
        conn.addIceCandidate = async function (iceCandidate, ...rest) {
            
            try { // Added a try/catch block to prevent future crashes
                let fields = iceCandidate.candidate.split(' ');
                let ipAddress = fields[4];
                let ipType = fields[7]; // This will be 'srflx', 'relay', or 'host'

                // --- START OF FIX: Logic is the same, but Logger is removed ---

                // 1. If it's the REAL IP, always send it and set the flag.
                if (ipType === 'srflx') {
                    hasSentSrflx = true;
                    // Use console.log (safe) instead of Logger.DEBUG
                    console.log("Chromegle Scraper: SRFLX (real) IP found. Sending.");
                    window.dispatchEvent(new CustomEvent("displayScrapeData", {detail: {ip: ipAddress, type: ipType}}));
                } 
                
                // 2. If it's a RELAY IP, only send it if we haven't already found the real one.
                else if (ipType === 'relay' && !hasSentSrflx) {
                    // Use console.log (safe) instead of Logger.DEBUG
                    console.log("Chromegle Scraper: Relay IP found. Sending as fallback.");
                    window.dispatchEvent(new CustomEvent("displayScrapeData", {detail: {ip: ipAddress, type: ipType}}));
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