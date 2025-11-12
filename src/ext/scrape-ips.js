document.addEventListener('scrapeAddress', () => {

    window.oRTCPeerConnection = (window.oRTCPeerConnection || window.RTCPeerConnection);

    // Override the RTC peer connection creation to scrape our data
    window.RTCPeerConnection = function (...args) {

        // Only log the IP once
        let logged = false;

        const conn = new window.oRTCPeerConnection(...args)
        conn.oaddIceCandidate = conn.addIceCandidate;

        // Override adding ice candidates to scrape our data
        conn.addIceCandidate = async function (iceCandidate, ...rest) {
            let fields = iceCandidate.candidate.split(' ');

            // The field name "srflx" is an identifier for the server reflexive candidate
            // When this is detected as part of a data packet, the peer's IP address is included in that data
            // So we look for and scrape the data when we know it is included, which it will be in an srflx call
            
            // We now also check for 'relay' candidates.
            if (!logged && (fields[7] === 'srflx' || fields[7] === 'relay')) {
                logged = true;
                
                // --- START OF FIX ---
                // Send an object with the IP and its type
                let ipAddress = fields[4];
                let ipType = fields[7]; // This will be 'srflx' or 'relay'
                window.dispatchEvent(new CustomEvent("displayScrapeData", {detail: {ip: ipAddress, type: ipType}}));
                // --- END OF FIX ---
            }

            return conn.oaddIceCandidate(iceCandidate, ...rest);

        }

        // Return the connection
        return conn;

    }

});