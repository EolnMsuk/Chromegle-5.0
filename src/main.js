let lastAutoSkipTime = 0; // This will store the timestamp of the last skip
let consecutiveSkips = 0; // Counter for rapid consecutive skips

/**
 * This function is called by the extension when it detects a blocked IP or country.
 * It intelligently throttles skips to avoid anti-spam.
 * MODIFIED: Now accepts the UUID of the chat to be skipped.
 */
function performDebouncedSkip(uuidToSkip) {
    const now = Date.now();
    const timeSinceLastSkip = now - lastAutoSkipTime;
    const RESET_INTERVAL = 2000; // Reset counter if skips are > 2 seconds apart
    const COOLDOWN_PERIOD = 2500; // Increased: Minimum 2.5 seconds between consecutive auto-skips

    // Reset the consecutive skip counter if enough time has passed since the last skip
    if (timeSinceLastSkip > RESET_INTERVAL) {
        consecutiveSkips = 0;
    }

    let delay = 0;
    if (consecutiveSkips === 0) {
        // The first skip in a series is immediate
        delay = 0;
    } else {
        // Subsequent skips are throttled to ensure a minimum time between them
        delay = Math.max(0, COOLDOWN_PERIOD - timeSinceLastSkip);
    }

    setTimeout(() => {
        
        // --- UUID CHECK RE-ENABLED TO PREVENT CANCELLATION ---
        // Check if we are still in the same chat we intended to skip.
        if (ChatRegistry.getUUID() !== uuidToSkip) {
            Logger.INFO("Auto-skip cancelled because the user has already changed.");
            return; // Abort the skip.
        }
        
        // Execute the skip
        Logger.DEBUG(`Executing potentially delayed skip for UUID ${uuidToSkip}.`);
        if (typeof skipIfPossible === 'function') {
            skipIfPossible(); // <<< THIS WILL NOW ONLY RUN IF THE UUID MATCHES
        } else {
            console.error("Chromegle tweak: skipIfPossible() function not found!");
        }

        // Update state after the skip has been performed
        lastAutoSkipTime = Date.now();
        consecutiveSkips++;
    }, delay);
}

/**
 * This function is called when a user manually skips.
 * It updates the cooldown state to prevent a rapid follow-up auto-skip.
 */
function registerManualSkip() {
    Logger.DEBUG("Manual skip detected, updating cooldown timer.");
    const now = Date.now();
    const timeSinceLastSkip = now - lastAutoSkipTime;
    const RESET_INTERVAL = 5000; // Reset counter if manual skip is >5s after last auto/manual skip

    if (timeSinceLastSkip > RESET_INTERVAL) {
        consecutiveSkips = 0;
    }

    lastAutoSkipTime = now; // Update the time of the last skip action
    consecutiveSkips++; // Increment counter, potentially affecting next auto-skip delay
}


/** @type {SettingsManager} */
let Settings;

/** @type {ChatRegistryManager} */
let ChatRegistry;

/** @type {Object} */
let Manifest;

// --- FIX: Wrap all initialization logic in an iframe check ---
// This ensures the main scripts only run in the top-level window,
// not in any iframes loaded by the page.
if (window.top === window.self) {
    (function () {

        if (window.location.href.includes('banredir.html') || window.location.href.includes('ban.html')) {
            window.location.href = ConstantValues.websiteURL + "/banned";
            return;
        }

        $("html").css("visibility", "visible");
        Logger.INFO("Extention Starting, Loading Modules")

        // FINAL UPDATE: Listen for manual user skips using the correct and stable CSS class.
        $(document).on('click', '.skipButton', registerManualSkip);

        $(document).on('keydown', (e) => {
            // The Escape key (keyCode 27) is the keyboard shortcut for skipping.
            if (e.key === "Escape" || e.keyCode === 27) {
                registerManualSkip();
            }
        });

        loadModules(
             IPBlockingManager,
             ThemeManager,
            // TopicSyncManager,
             ChatRegistryManager,
            // PasteMenu,
             ChatManager,
            // FilterManager,
            // ConfirmManager,
             AutoMessageManager,
             ReconnectManager,
             IPGrabberManager,
            // UnmoderatedChatManager,
             SpeechEngineManager,
            // VideoWrapperManager,
            // VideoBlockerManager,
            // VideoScreenshotManager,
            // FullScreenVideoManager,
            // SplashImageHandler,
            // ClearInterestsManager,
             SettingsManager,
             TimerSkipManager,
             RepeatSkipManager,
             MessageSkipManager,
             AgeSkipManager,
            // UserCountManager,
            // BroadcastManager,
            // VideoPopoutManager,
            // LinkEmbedManager
        );

    })();
} else {
    // This log will confirm our script is correctly identifying and skipping the iframe.
    Logger.INFO("Chromegle: Skipping main init in iframe.");
}
// --- END FIX ---