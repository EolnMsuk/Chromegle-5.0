// In src/mods/ip-tools/ip-handling.js

// A map to convert full country names to two-letter country codes.
const countryNameToCode = {
    // ... (country map remains unchanged) ...
    "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "American Samoa": "AS", "Andorra": "AD",
    "Angola": "AO", "Anguilla": "AI", "Antarctica": "AQ", "Antigua and Barbuda": "AG", "Argentina": "AR",
    "Armenia": "AM", "Aruba": "AW", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ", "Bahamas": "BS",
    "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB", "Belarus": "BY", "Belgium": "BE", "Belize": "BZ",
    "Benin": "BJ", "Bermuda": "BM", "Bhutan": "BT", "Bolivia": "BO", "Bosnia and Herzegovina": "BA",
    "Botswana": "BW", "Brazil": "BR", "British Indian Ocean Territory": "IO", "British Virgin Islands": "VG",
    "Brunei": "BN", "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI", "Cambodia": "KH", "Cameroon": "CM",
    "Canada": "CA", "Cape Verde": "CV", "Cayman Islands": "KY", "Central African Republic": "CF", "Chad": "TD",
    "Chile": "CL", "China": "CN", "Christmas Island": "CX", "Cocos Islands": "CC", "Colombia": "CO",
    "Comoros": "KM", "Cook Islands": "CK", "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU", "Curacao": "CW",
    "Cyprus": "CY", "Czech Republic": "CZ", "Democratic Republic of the Congo": "CD", "Denmark": "DK",
    "Djibouti": "DJ", "Dominica": "DM", "Dominican Republic": "DO", "East Timor": "TL", "Ecuador": "EC",
    "Egypt": "EG", "El Salvador": "SV", "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE",
    "Ethiopia": "ET", "Falkland Islands": "FK", "Faroe Islands": "FO", "Fiji": "FJ", "Finland": "FI",
    "France": "FR", "French Polynesia": "PF", "Gabon": "GA", "Gambia": "GM", "Georgia": "GE", "Germany": "DE",
    "Ghana": "GH", "Gibraltar": "GI", "Greece": "GR", "Greenland": "GL", "Grenada": "GD", "Guam": "GU",
    "Guatemala": "GT", "Guernsey": "GG", "Guinea": "GN", "Guinea-Bissau": "GW", "Guyana": "GY", "Haiti": "HT",
    "Honduras": "HN", "Hong Kong": "HK", "Hungary": "HU", "Iceland": "IS", "India": "IN", "Indonesia": "ID",
    "Iran": "IR", "Iraq": "IQ", "Ireland": "IE", "Isle of Man": "IM", "Israel": "IL", "Italy": "IT",
    "Ivory Coast": "CI", "Jamaica": "JM", "Japan": "JP", "Jersey": "JE", "Jordan": "JO", "Kazakhstan": "KZ",
    "Kenya": "KE", "Kiribati": "KI", "Kosovo": "XK", "Kuwait": "KW", "Kyrgyzstan": "KG", "Laos": "LA",
    "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS", "Liberia": "LR", "Libya": "LY", "Liechtenstein": "LI",
    "Lithuania": "LT", "Luxembourg": "LU", "Macau": "MO", "Macedonia": "MK", "Madagascar": "MG", "Malawi": "MW",
    "Malaysia": "MY", "Maldives": "MV", "Mali": "ML", "Malta": "MT", "Marshall Islands": "MH", "Mauritania": "MR",
    "Mauritius": "MU", "Mayotte": "YT", "Mexico": "MX", "Micronesia": "FM", "Moldova": "MD", "Monaco": "MC",
    "Mongolia": "MN", "Montenegro": "ME", "Montserrat": "MS", "Morocco": "MA", "Mozambique": "MZ", "Myanmar": "MM",
    "Namibia": "NA", "Nauru": "NR", "Nepal": "NP", "Netherlands": "NL", "New Caledonia": "NC", "New Zealand": "NZ",
    "Nicaragua": "NI", "Niger": "NE", "Nigeria": "NG", "Niue": "NU", "Northern Mariana Islands": "MP",
    "North Korea": "KP", "Norway": "NO", "Oman": "OM", "Pakistan": "PK", "Palau": "PW", "Palestine": "PS",
    "Panama": "PA", "Papua New Guinea": "PG", "Paraguay": "PY", "Peru": "PE", "Philippines": "PH", "Pitcairn": "PN",
    "Poland": "PL", "Portugal": "PT", "Puerto Rico": "PR", "Qatar": "QA", "Republic of the Congo": "CG",
    "Reunion": "RE", "Romania": "RO", "Russia": "RU", "Rwanda": "RW", "Saint Barthelemy": "BL",
    "Saint Helena": "SH", "Saint Kitts and Nevis": "KN", "Saint Lucia": "LC", "Saint Martin": "MF",
    "Saint Pierre and Miquelon": "PM", "Saint Vincent and the Grenadines": "VC", "Samoa": "WS", "San Marino": "SM",
    "Sao Tome and Principe": "ST", "Saudi Arabia": "SA", "Senegal": "SN", "Serbia": "RS", "Seychelles": "SC",
    "Sierra Leone": "SL", "Singapore": "SG", "Sint Maarten": "SX", "Slovakia": "SK", "Slovenia": "SI",
    "Solomon Islands": "SB", "Somalia": "SO", "South Africa": "ZA", "South Korea": "KR", "South Sudan": "SS",
    "Spain": "ES", "Sri Lanka": "LK", "Sudan": "SD", "Suriname": "SR", "Svalbard and Jan Mayen": "SJ",
    "Swaziland": "SZ", "Sweden": "SE", "Switzerland": "CH", "Syria": "SY", "Taiwan": "TW", "Tajikistan": "TJ",
    "Tanzania": "TZ", "Thailand": "TH", "The Netherlands": "NL", "Togo": "TG", "Tokelau": "TK", "Tonga": "TO",
    "Trinidad and Tobago": "TT", "Tunisia": "TN", "Türkiye": "TR", "Turkmenistan": "TM",
    "Turks and Caicos Islands": "TC", "Tuvalu": "TV", "U.S. Virgin Islands": "VI", "Uganda": "UG", "Ukraine": "UA",
    "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US", "Uruguay": "UY",
    "Uzbekistan": "UZ", "Vanuatu": "VU", "Vatican": "VA", "Venezuela": "VE", "Vietnam": "VN", "Wallis and Futuna": "WF",
    "Western Sahara": "EH", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW"
};


class IPGrabberManager extends Module {

    // Removed IP_MENU_TOGGLE_ID, IP_MENU_TOGGLE_DEFAULT, ENABLE_TAG, DISABLE_TAG

    GEO_MAPPINGS = {
        country: "Country",
        state: "State",
        city: "City",
        isp: "Provider"
    }

    ipGrabberDiv = null;
    updateClock = null;
    languages = null;

    lastKnownUnhashedIP = null;
    lastKnownHashedIP = null;

    uuidToHashedIpMap = {};

    pendingIpData = {};

    // Removed ipToggleButton definition and onIpToggleButtonClick method

    constructor() {
        super();
        Logger.INFO("IPGrabberManager Loaded");
        this.addEventListener("displayScrapeData", this.onDisplayScrapeData, undefined, window);

        this.addEventListener("chatStarted", this.onChatUiReady.bind(this));
        this.addEventListener("chatEnded", this.onChatEnded.bind(this));

        this.loadLanguageList();
        this.injectScrapeScript();

        // --- REMOVED ---
        // The 'chromegleReportDetected' event listener has been removed.
        // --- END REMOVAL ---
    }

    injectScrapeScript() {
        let script = document.createElement('script');
        script.src = chrome.runtime.getURL('/src/ext/scrape-ips.js');
        script.onload = () => {
            script.remove();
            document.dispatchEvent(new CustomEvent('scrapeAddress'));
        };
        (document.head || document.documentElement).appendChild(script);
    }

    loadLanguageList() {
        $.getJSON(getResourceURL("public/languages.json"), (json) => this.languages = json);
    }

    getFlagEmoji(countryCode) {
        if (!countryCode || countryCode.length !== 2) return '❔';
        const codePoints = countryCode
          .toUpperCase()
          .split('')
          .map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
    }

    onDisplayScrapeData(event) {
        const chatUUID = ChatRegistry.getUUID();
        if (!chatUUID) {
             Logger.WARNING("IP scraped but no ChatUUID is set. Discarding.");
             return;
        }

        let unhashedAddress = event["detail"];
        this.lastKnownUnhashedIP = unhashedAddress;

        let data = this.pendingIpData[chatUUID] || {};
        data.ip = unhashedAddress;

        if (data.status === "ui_ready") {
            Logger.DEBUG(`IP scraped for ${chatUUID}, UI is already ready. Processing.`);
            this.processIpData(chatUUID, unhashedAddress);
            delete this.pendingIpData[chatUUID];
        } else {
            Logger.DEBUG(`IP scraped and stored for pending chat UUID: ${chatUUID}`);
            data.status = "scraped";
            this.pendingIpData[chatUUID] = data;
        }
    }

    async onChatUiReady(event) {
        const chatUUID = event.detail.uuid;
        Logger.DEBUG(`Chat UI is ready for UUID: ${chatUUID}`);

        let data = this.pendingIpData[chatUUID] || {};

        if (data.status === "scraped") {
            Logger.DEBUG(`UI ready for ${chatUUID}, IP is already pending. Processing.`);
            this.processIpData(chatUUID, data.ip);
            delete this.pendingIpData[chatUUID];
        } else {
            Logger.DEBUG(`UI ready for ${chatUUID}, no pending IP. Waiting for scrape.`);
            data.status = "ui_ready";
            this.pendingIpData[chatUUID] = data;
        }
    }

    async processIpData(chatUUID, unhashedAddress) {
        // Removed storage query for toggle. Defaulting to showData = true.
        let showData = true;
        let hashedAddress = await sha1(unhashedAddress);

        this.lastKnownHashedIP = hashedAddress;

        Logger.DEBUG("Processing stored IP for UUID <%s> | Hashed: <%s> Raw: <%s>", chatUUID, hashedAddress, unhashedAddress);

        if (await IPBlockingManager.API.skipBlockedAddress(unhashedAddress)) {
            this.lastKnownHashedIP = null;
            this.lastKnownUnhashedIP = null;
            return;
        }

        await this.geolocateAndDisplay(showData, unhashedAddress, hashedAddress, chatUUID);
    }

    onChatEnded(event) {
        const chatUUID = event.detail.uuid;
        if (this.pendingIpData[chatUUID]) {
            Logger.DEBUG(`Chat ${chatUUID} ended. Clearing pending data.`);
            delete this.pendingIpData[chatUUID];
        }
    }

    sendChatSeenEvent(seenTimes, unhashedAddress) {
        document.dispatchEvent(new CustomEvent(
            "chatSeenTimes",
            {
                detail: {
                    "uuid": ChatRegistry.getUUID(),
                    "seenTimes": seenTimes,
                    "ipAddress": unhashedAddress
                }
            }
        ));
    }

    async geolocateAndDisplay(showData, unhashedAddress, hashedAddress, chatUUID) {
        let previousQuery = {"PREVIOUS_HASHED_ADDRESS_LIST": {}};
        let result = await chrome.storage.local.get(previousQuery);
        const previouslyHashed = result["PREVIOUS_HASHED_ADDRESS_LIST"];
        const seenTimes = previouslyHashed[hashedAddress] || 0;

        this.uuidToHashedIpMap[chatUUID] = hashedAddress;
        Logger.DEBUG(`Mapped UUID ${chatUUID} to hashed IP ${hashedAddress}`);

        this.sendChatSeenEvent(seenTimes, unhashedAddress);
        this.createAddressContainer(unhashedAddress, hashedAddress, previouslyHashed, showData, seenTimes);
        let fetchJson;
        try {
            let fetchResult = await fetchWithTimeout(
                `${ConstantValues.apiURL}prod/geoip2?ip_address=${unhashedAddress}`,
                {timeout: 5000}
            );
            fetchJson = await fetchResult.json();
        } catch (ex) {
            await this.onGeolocationRequestError(unhashedAddress, chatUUID);
             this.lastKnownHashedIP = null; this.lastKnownUnhashedIP = null; return;
        }
        if (ChatRegistry.getUUID() !== chatUUID) {
            Logger.INFO("Geolocation display cancelled for stale chat UUID.");
             this.lastKnownHashedIP = null; this.lastKnownUnhashedIP = null; return;
        }
        const countryName = fetchJson.country;
        const countryCode = countryNameToCode[countryName] || 'XX';
        fetchJson.country_code = countryCode;
        await this.onGeolocationRequestCompleted(unhashedAddress, fetchJson, hashedAddress, seenTimes, chatUUID);
        previouslyHashed[hashedAddress] = seenTimes + 1;
        await chrome.storage.local.set({"PREVIOUS_HASHED_ADDRESS_LIST": previouslyHashed});
    }

    // --- REMOVED ---
    // The entire 'handleReportEvent' function has been removed.
    // --- END REMOVAL ---

    // --- REMOVED ---
    // The entire 'showPastReportNotification' function has been removed.
    // --- END REMOVAL ---

    createAddressContainer(unhashedAddress, hashedAddress, previousHashedAddresses, showData, seenTimes) {
        const rightBox = document.querySelector(".rightBox.outlined");
        if (!rightBox) {
            Logger.ERROR("Could not find .rightBox.outlined to insert IP info.");
            return;
        }

        // Updated querySelector to no longer look for .ipLookupButton
        const oldExternalItems = rightBox.querySelectorAll(":scope > .chromegle-ip-logitem");
        oldExternalItems.forEach(el => el.remove());
        Logger.DEBUG(`Removed ${oldExternalItems.length} old external IP info elements.`);

        const chatWindow = rightBox.querySelector(".chatWindow");
        if (chatWindow) {
            const oldChatWindowItems = chatWindow.querySelectorAll(".logitem.chromegle-ip-logitem");
            oldChatWindowItems.forEach(el => el.remove());
            Logger.DEBUG(`Removed ${oldChatWindowItems.length} old IP info elements from chatWindow.`);
        }

        this.ipGrabberDiv = document.createElement("div");
        this.ipGrabberDiv.classList.add("chromegle-ip-logitem");
        this.ipGrabberDiv.id = "chromegle-ip-info-container";
        // Set display to block directly, since showData is always true
        this.ipGrabberDiv.style.display = "block !important";
        this.ipGrabberDiv.style.borderTop = "1px solid #ccc !important";
        this.ipGrabberDiv.style.marginTop = "5px !important";
        this.ipGrabberDiv.style.padding = "5px !important";
        this.ipGrabberDiv.style.minHeight = "20px !important";
        this.ipGrabberDiv.style.height = "auto !important";
        this.ipGrabberDiv.style.overflow = "visible !important";
        this.ipGrabberDiv.style.color = "#e0e0e0 !important";

        // Removed line that appends ipToggleButton

        if (chatWindow) {
             chatWindow.insertAdjacentElement('afterend', this.ipGrabberDiv);
             // Removed line that appends ipToggleButton
             Logger.DEBUG("Appended IP container after chatWindow.");
        } else {
             // Removed line that appends ipToggleButton
             rightBox.appendChild(this.ipGrabberDiv);
             Logger.WARNING("Could not find .chatWindow, appended IP info to end of .rightBox.");
        }
    }

    async insertUnhashedAddress(unhashedAddress, isOwner = false) {
        if (!this.ipGrabberDiv || !document.body.contains(this.ipGrabberDiv)) {
             Logger.WARNING("Cannot insert unhashed address, ipGrabberDiv is missing.");
             return;
        }

        let ipSpoiler = await (new IPAddressSpoiler(unhashedAddress)).setup();
        let ipMessage = this.createLogBoxMessage(
            "address_data", "IP Address: ", ipSpoiler.get()
        );

        if (!ipMessage) {
            Logger.ERROR("Failed to create ipMessage element in insertUnhashedAddress.");
            return;
        }

        if (!isOwner) {
            try {
                if (typeof ButtonFactory?.ipBlockButton === 'function') {
                    const blockButtonElement = ButtonFactory.ipBlockButton(unhashedAddress);
                    if (blockButtonElement instanceof Node) {
                        // Moved button from ipMessage to ipGrabberDiv and added margin
                        blockButtonElement.style.marginBottom = '5px'; // Add spacing
                        this.ipGrabberDiv.appendChild(blockButtonElement); // Add button to the container first
                        Logger.DEBUG("Successfully appended block button to ipGrabberDiv.");
                    } else {
                        Logger.WARNING("ButtonFactory.ipBlockButton did not return a valid element.");
                    }
                } else {
                    Logger.WARNING("ButtonFactory or ButtonFactory.ipBlockButton is not available yet.");
                }
            } catch (buttonError) {
                 Logger.ERROR("Error creating or appending block button using ButtonFactory:", buttonError);
            }
        }

        this.ipGrabberDiv.appendChild(ipMessage); // Add IP address message after the button
        Logger.DEBUG("Appended element for: address_data");
    }

    async onGeolocationRequestError(unhashedAddress, chatUUID) {
        if (ChatRegistry.getUUID() !== chatUUID || !this.ipGrabberDiv || !document.body.contains(this.ipGrabberDiv)) return;
        if (!this.ipGrabberDiv.querySelector('#address_data')) { await this.insertUnhashedAddress(unhashedAddress); }
        const errorDiv = document.createElement("div");
        errorDiv.classList.add("logitem", "chromegle-ip-logitem", "chromegle-geo-error");
        errorDiv.innerHTML = "<span style=\"color: red;\" class=\"statuslog\">Geolocation failed.</span>";
        this.ipGrabberDiv.appendChild(errorDiv);
        Logger.DEBUG("Appended element for: geo-error");
    }

    async onGeolocationRequestCompleted(unhashedAddress, geoJSON, hashedAddress, seenTimes, chatUUID) {
        if (ChatRegistry.getUUID() !== chatUUID) {
             this.lastKnownHashedIP = null; this.lastKnownHashedIP = null; return;
        }
        if (!this.ipGrabberDiv || !document.body.contains(this.ipGrabberDiv)) {
             Logger.WARNING("IP Grabber div no longer exists, aborting display.");
             this.lastKnownHashedIP = null; this.lastKnownUnhashedIP = null; return;
        }

        const countrySkipEnabled = typeof Settings?.retrieveChromeValue === 'function' ? await Settings.retrieveChromeValue("COUNTRY_SKIP_TOGGLE", "false") === "true" : false;

        if (await this.skipBlockedCountries(countrySkipEnabled, geoJSON)) {
            this.lastKnownHashedIP = null; this.lastKnownUnhashedIP = null;
            if (this.ipGrabberDiv) this.ipGrabberDiv.remove();
            // Removed querySelector for toggleBtn as it no longer exists
            return;
        }

        if (!this.ipGrabberDiv.querySelector('#address_data')) {
            await this.insertUnhashedAddress(geoJSON?.ip || unhashedAddress, geoJSON?.owner || false);
        }

        Logger.DEBUG("Geo completed for UUID <%s>. Payload: \n%s", chatUUID, JSON.stringify(geoJSON, null, 2));

        try {
            await this.displayGeolocationFields(geoJSON, hashedAddress, seenTimes);
        } catch (displayError) {
             Logger.ERROR("Error occurred within displayGeolocationFields:", displayError);
             if (this.ipGrabberDiv && !this.ipGrabberDiv.querySelector('.chromegle-display-error')) {
                 const errorMsg = this.createLogBoxMessage('display-error', 'Error displaying info:', displayError.message);
                 errorMsg.style.color = 'red';
                 errorMsg.classList.add('chromegle-display-error');
                 this.ipGrabberDiv.appendChild(errorMsg);
             }
        }
    }

     // *** ADDED LOGGING HERE ***
     async skipBlockedCountries(countrySkipEnabled, geoJSON) {
        // <<< NEW LOGGING START >>>
        Logger.DEBUG("Entering skipBlockedCountries function..."); // Log entry

        const code = geoJSON["country_code"] || geoJSON["country_code3"]; // Use 3-letter code as fallback if needed
        Logger.DEBUG(`Country Skip Check: Detected code = ${code}, Country Skip Enabled = ${countrySkipEnabled}`); // Log inputs

        if (!countrySkipEnabled) {
            Logger.DEBUG("Country Skip Check: Skipping disabled globally. Exiting."); // Log reason for exit
            return false;
        }
        if (!code) {
             Logger.DEBUG("Country Skip Check: No valid country code found in geoJSON. Exiting."); // Log reason for exit
             return false;
        }
        // <<< NEW LOGGING END >>>


        // Get blocked countries list (existing code)
        // *** THIS IS THE MODIFIED SECTION ***
        const defaultCountryList = "AE,AL,AM,BD,DZ,EG,GR,ID,IN,IQ,JO,KE,KW,LB,LK,LY,MA,MT,MY,NG,NP,PH,PK,SA,SC,TN,TR,QA,YE";
        const blockedCountriesString = typeof Settings?.retrieveChromeValue === 'function' ? await Settings.retrieveChromeValue("COUNTRY_SKIP_FIELD", defaultCountryList) : defaultCountryList;
        // *** END OF MODIFIED SECTION ***
        const blockedCountries = blockedCountriesString.toUpperCase().split(',').map(c => c.trim()).filter(Boolean);

        // <<< NEW LOGGING START >>>
        Logger.DEBUG(`Country Skip Check: Blocked list from settings = [${blockedCountries.join(', ')}]`); // Log the list being checked against
        // <<< NEW LOGGING END >>>


        const countryBlocked = blockedCountries.includes(code.toUpperCase());

        // <<< NEW LOGGING START >>>
        Logger.DEBUG(`Country Skip Check: Is country ${code} blocked? ${countryBlocked}`); // Log the result of the check
        // <<< NEW LOGGING END >>>

        if (!countryBlocked) {
            return false; // Exit if not blocked
        }

        // --- Code below only runs if countryBlocked is true ---

        const uuidToSkip = ChatRegistry.getUUID();
        if (!uuidToSkip) {
             Logger.WARNING("Country skip triggered for blocked country, but no active chat UUID found.");
             return false;
        }

        // <<< NEW LOGGING START >>>
        Logger.INFO(`Country Skip Check: Triggering skip for blocked country ${code} in chat ${uuidToSkip}.`); // Log skip initiation
        // <<< NEW LOGGING END >>>

        performDebouncedSkip(uuidToSkip); // Request the skip (handled by main.js)
        // Logger.INFO removed here as it duplicates the one above slightly

        // Check if we are still in the chat immediately after initiating the skip (existing code)
        if (ChatRegistry.getUUID() === uuidToSkip) {
            Logger.DEBUG("Still in chat <%s>, attempting to send country skip message.", uuidToSkip);

            let errorMsgElement = sendErrorLogboxMessage(`Detected user from blocked country ${geoJSON["country"]} (${code}), skipped chat.`);

            if (errorMsgElement) {
                errorMsgElement.classList.add("chromegle-ip-logitem");
                Logger.DEBUG("Added cleanup class to country skip message for <%s>.", uuidToSkip);
            } else {
                 Logger.WARNING("Failed to send country skip message for <%s>, logbox might have disappeared.", uuidToSkip);
            }

        } else {
            Logger.INFO("Chat changed too quickly after country skip for <%s>. Skip message suppressed.", uuidToSkip);
        }

        return true; // Indicate that a skip was triggered
    }

    containsValidKeys(obj, ...keys) {
         let keyList = Object.keys(obj || {});
        for (let key of keys) {
            if (!keyList.includes(key) || obj[key] == null || obj[key] === '') {
                return false;
            }
        }
        return true;
    }

    async displayGeolocationFields(geoJSON, hashedAddress, seenTimes) {
         Logger.DEBUG("Entering displayGeolocationFields...");
         if (!this.ipGrabberDiv || !document.body.contains(this.ipGrabberDiv)) { Logger.WARNING("IP Grabber div missing."); return; }
         Logger.DEBUG("ipGrabberDiv found. Starting field population.");

        if (!this.updateClock || this.updateClock.chatUUID !== ChatRegistry.getUUID()) {
             if (this.updateClock) this.updateClock.cancel();
             this.updateClock = new ChatUpdateClock(ChatRegistry.getUUID(), 1000);
             Logger.DEBUG("Update clock started/reset.");
        }

        try {
            const displayOrder = ["country", "state", "city"];

            displayOrder.forEach(key => {
                if (this.containsValidKeys(geoJSON, key)) {
                    Logger.DEBUG(`Attempting to add field: ${key}`);
                    let valueContent = geoJSON[key];

                    if (key === "country" && this.containsValidKeys(geoJSON, "country_code")) {
                        valueContent += ` <span class='flagText nceFont'>${this.getFlagEmoji(geoJSON.country_code)}</span>`;
                        Logger.DEBUG("Prepared country content with flag.");
                    }

                    let messageElement = this.createLogBoxMessage(`${key}_data`, `${this.GEO_MAPPINGS[key]}: `, valueContent);

                    // If valueContent contains HTML (like the flag span), set innerHTML
                    const spanElement = messageElement.querySelector('span');
                    if (spanElement) {
                        spanElement.innerHTML = valueContent; // Use innerHTML to render the flag span
                    }

                    this.ipGrabberDiv.appendChild(messageElement);
                    Logger.DEBUG(`Appended element for: ${key}`);
                }
            });

            // --- START OF REORDERED BLOCK ---
            
            // 5. Seen... times
            if (!this.ipGrabberDiv.querySelector('.chromegle-seen-times')) {
                Logger.DEBUG("Attempting to add field: seen-times");
                const plural = (seenTimes > 1 || seenTimes === 0) ? "s" : "";
                const seenBeforeDiv = document.createElement("div");
                seenBeforeDiv.classList.add("logitem", "chromegle-ip-logitem", "chromegle-seen-times");
                // --- FIX: Removed style='color: orange;' ---
                seenBeforeDiv.innerHTML = `<span class='statuslog'>Seen ${seenTimes} time${plural}</span>`;
                this.ipGrabberDiv.appendChild(seenBeforeDiv); Logger.DEBUG("Appended element for: seen-times");
            }

            // 6. Call
            if (!this.ipGrabberDiv.querySelector('#call_time_data')) {
                Logger.DEBUG("Attempting to add field: call_time_data");
                let callTimeElement = this.createLogBoxMessage("call_time_data", "Call: ", "00:00");
                 this.ipGrabberDiv.appendChild(callTimeElement); Logger.DEBUG("Appended element for: call_time_data");
                 this.updateClock.addUpdate((date, startTime) => {
                        let timeSpan = document.querySelector("#call_time_data > span");
                        if (timeSpan) timeSpan.innerHTML = this.formatElapsedTime(date, startTime);
                    });
            }

            // 7. Note
            if (!geoJSON.owner && !this.ipGrabberDiv.querySelector('#profile_note_data')) {
                Logger.DEBUG("Attempting to add field: profile_note_data");
                let note = new Note();
                await note.setup(hashedAddress);
                Logger.DEBUG("Note setup complete. Creating element...");
                let noteElement = this.createLogBoxMessage("profile_note_data", "Note: ", note.element);
                
                // --- THIS IS THE FIX ---
                // Find the span *inside* the noteElement and style it
                const noteSpan = noteElement.querySelector("span");
                if (noteSpan) {
                    noteSpan.style.color = "orange";
                    noteSpan.style.fontWeight = "bold";
                }
                // --- END OF FIX ---

                this.ipGrabberDiv.appendChild(noteElement); Logger.DEBUG("Appended element for: profile_note_data");
            }
            
            // --- END OF REORDERED BLOCK ---


            if (geoJSON?.owner && !this.ipGrabberDiv.querySelector('.owner')) {
                Logger.DEBUG("Attempting to add field: owner message");
                this.insertOwnerMessage(); Logger.DEBUG("Appended element for: owner message");
            }

            // Loop through remaining GEO_MAPPINGS keys that aren't in displayOrder
            Object.keys(this.GEO_MAPPINGS).forEach((key) => {
                // Skip if already handled, or if data is missing
                if (displayOrder.includes(key) || this.ipGrabberDiv.querySelector(`#${key}_data`) || !this.containsValidKeys(geoJSON, key)) return;
                Logger.DEBUG(`Attempting to add field: ${key}`);
                let entryElement = this.createLogBoxMessage(`${key}_data`, `${this.GEO_MAPPINGS[key]}: `, geoJSON[key]);
                this.ipGrabberDiv.appendChild(entryElement); Logger.DEBUG(`Appended element for: ${key}`);
            });

            if (this.containsValidKeys(geoJSON, "accuracy") && !this.ipGrabberDiv.querySelector('#accuracy_data')) {
                 Logger.DEBUG("Attempting to add field: accuracy_data");
                 let accuracyElement = this.createLogBoxMessage("accuracy_data", "Accuracy: ", `${geoJSON.accuracy} km radius`);
                 this.ipGrabberDiv.appendChild(accuracyElement); Logger.DEBUG("Appended element for: accuracy_data");
            }

            if (this.containsValidKeys(geoJSON, "timezone") && !this.ipGrabberDiv.querySelector('#local_time_data')) {
                Logger.DEBUG("Attempting to add field: local_time_data");
                let localTimeElement = this.createLogBoxMessage("local_time_data", "Local Time: ", this.getFormattedTime(geoJSON.timezone));
                this.ipGrabberDiv.appendChild(localTimeElement); Logger.DEBUG("Appended element for: local_time_data");
                 // Ensure update function for local time is added only once
                 if (!this.updateClock._updateFunctions?.some(f => f.toString().includes('local_time_data'))) {
                    this.updateClock.addUpdate((date) => {
                            let timeSpan = document.querySelector("#local_time_data > span");
                            if (timeSpan) timeSpan.innerHTML = this.getFormattedTime(geoJSON.timezone, date);
                        });
                }
            }

            if (geoJSON.chromegler === true && !this.ipGrabberDiv.querySelector('.chromegle-user-indicator')) {
                 Logger.DEBUG("Attempting to add field: chromegle-user-indicator");
                 const chromegleLogItem = document.createElement("div");
                 chromegleLogItem.classList.add("logitem", "chromegle-ip-logitem", "chromegle-user-indicator");
                 chromegleLogItem.innerHTML = `<span class='statuslog' style="color: rgb(32, 143, 254);">This person is also using Chromegle!</span>`;
                 this.ipGrabberDiv.appendChild(chromegleLogItem); Logger.DEBUG("Appended element for: chromegle-user-indicator");
            }

        } catch (error) {
            Logger.ERROR("Error during displayGeolocationFields population:", error);
            // Add error message to UI if possible
            if (this.ipGrabberDiv && !this.ipGrabberDiv.querySelector('.chromegle-display-error')) {
                 const errorMsg = this.createLogBoxMessage('display-error', 'Error displaying info:', error.message);
                 errorMsg.style.color = 'red';
                 errorMsg.classList.add('chromegle-display-error');
                 this.ipGrabberDiv.appendChild(errorMsg);
            }
        }
        Logger.DEBUG("Exiting displayGeolocationFields.");
    }

    getFormattedTime(timezone, date = new Date()) {
        const options = { timeZone: timezone, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true };
        try {
            // Fallback for potentially invalid timezone strings
            return date.toLocaleString("en-US", options);
        } catch (e) {
            Logger.WARNING(`Invalid timezone format: ${timezone}`);
            return "Invalid Timezone";
        }
    }

    insertOwnerMessage() {
         if (!this.ipGrabberDiv || !document.body.contains(this.ipGrabberDiv)) return;
        Logger.DEBUG("You found the owner of Chromegle!");
        
        // --- FIX: Added alt="Developer Icon" to the img tag ---
        let ownerMessageDiv = $(
            `<div class="logitem chromegle-ip-logitem owner">
                 <img class='owner-gif' alt="Developer Icon" src="${ConstantValues.apiURL}users/owner/gif" style="max-width: 50px; vertical-align: middle; margin-right: 5px;" />
                 <span class='statuslog' style="color: rgb(235 171 21);">
                     You found the developer of Chromegle!
                 </span>
             </div>`
        ).get(0);
        // --- END FIX ---

        this.ipGrabberDiv.appendChild(ownerMessageDiv);
    }

    formatElapsedTime(currentTime, startTime) {
        const diffSeconds = Math.max(0, Math.floor((currentTime - startTime) / 1000));
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;
        const paddedMinutes = minutes.toString().padStart(2, "0");
        const paddedSeconds = seconds.toString().padStart(2, "0");
        return `${hours > 0 ? hours + ":" : ""}${paddedMinutes}:${paddedSeconds}`;
    }

    createLogBoxMessage(elementId, label, ...values) {
        let pElement = document.createElement("p");
        pElement.classList.add("youmsg", "chromegle-ip-logitem"); // Use p instead of div for standard log look
        pElement.id = elementId;
        pElement.style.color = "#e0e0e0"; // Set base text color

        let strongElement = document.createElement("strong");
        strongElement.classList.add("statusItem"); // Keep using statusItem for label style
        strongElement.innerText = label + " ";
        // strongElement.style.color = "#208ffe"; // Example: Make label blue-ish (optional)

        let spanElement = document.createElement("span");
        // spanElement.classList.add("statusAnswer"); // Example: Use statusAnswer for value style (optional)
        // --- FIX: Reverted color from orange back to default ---
        spanElement.style.color = "#e0e0e0"; // Ensure value color matches paragraph

        for (let value of values) {
            if (typeof value === 'string') {
                 // Check if the string contains HTML tags before deciding how to append
                 if (/<[a-z][\s\S]*>/i.test(value)) {
                      // If it looks like HTML, create a temporary element to parse and append nodes
                      let tempDiv = document.createElement('div');
                      tempDiv.innerHTML = value;
                      while (tempDiv.firstChild) {
                          spanElement.appendChild(tempDiv.firstChild);
                      }
                 } else {
                     // Otherwise, treat as plain text
                     spanElement.appendChild(document.createTextNode(value));
                 }
            } else if (value instanceof Node) {
                // Append directly if it's already a DOM node (like the IP spoiler or Note element)
                spanElement.appendChild(value);
            }
        }

        pElement.appendChild(strongElement);
        pElement.appendChild(spanElement);
        return pElement;
    }
}