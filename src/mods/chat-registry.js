class ChatRegistryManager extends Module {

    constructor() {
        super();

        ChatRegistry = this;
        this.#observer.observe(document, {subtree: true, childList: true, attributes: true});
        this.addEventListener("click", this.onButtonClick, undefined, document);

        // --- REMOVED ---
        // The "chromegleReportReceived" event listener has been removed.
        // --- END REMOVAL ---
    }

    // No pause/resume functions needed anymore

    #setUUID = () => this.#chatUUID = shortUuid();
    #clearUUID = () => this.#chatUUID = null;

    #observer = new MutationObserver(this.onMutationObserved.bind(this));
    #isChatting = false;
    #isVideoChat = null;
    #pageStarted = false;
    #chatUUID = null;
    #videoChatLoaded = false;

    #lastChatUUID = null;
    #lastChatEndTime = 0;
    // Window in MS to attribute a report to the *previous* chat (10 seconds)
    #POST_SKIP_REPORT_WINDOW = 10000;

    /** @type ChatMessage[] */
    #messages = [];

    userMessages() {
        return this.#messages.filter(msg => msg.isUser)
    }

    strangerMessages() {
        return this.#messages.filter(msg => msg.isStranger());
    }

    isVideoChatLoaded = () => this.#videoChatLoaded;
    isChatting = () => this.#isChatting;
    isVideoChat = () => this.#isVideoChat;
    isTextChat = () => !this.#isVideoChat;
    pageStarted = () => this.#pageStarted;
    getUUID = () => this.#chatUUID;

    onButtonClick(event) {

        if (event.target.classList.contains("skipButton")) {
            document.dispatchEvent(new CustomEvent('chatButtonClicked', {detail: event}));
        }

        // For banned -> Non-banned is able to use the onDocumentMutation
        if (
            ["videobtn", "textbtn", "videobtnunmoderated", "chatbtn"].includes(event.target.id)
            || event.target?.src?.includes("/static/videobtn-enabled")
        ) {
            if (!this.pageStarted()) {
                this.#pageStarted = true;
                this.#isVideoChat = $("#videowrapper").get(0) != null;
                document.dispatchEvent(new CustomEvent('pageStarted', {detail: {button: event.target, isVideoChat: this.isVideoChat()}}));
            }
        }
    }

    onMutationObserved(mutations) {

        // Should be LAST b.c. it matters if the chat has ended
        mutations.sort((a, b) => {
            if (a.target.id === "othervideospinner") {
                return 1;
            }
            else if (b.target.id === "othervideospinmner") {
                return -1;
            }

            return -1;

        });

        for (let mutation of mutations) {
            mutation.addedNodes?.forEach(node => {
                if (
                    node.nodeType === 1 &&
                    node.classList.contains("information")
                ) {
                    this.onChatMutationRecord({ target: node });
                }
            });

            this.onMutationRecord(mutation);
        }

    }

    onMutationRecord(mutationRecord) {

        // Chat Loaded
        if (mutationRecord.target.id === "othervideospinner") {

            if (mutationRecord.target.style.display === "none" && this.isChatting() && !this.#videoChatLoaded) {
                this.#videoChatLoaded = true;
                document.dispatchEvent(new CustomEvent("videoChatLoaded"));
            }
            return;
        }

        // Chat failed
        if (mutationRecord.target["innerText"] != null) {
            if (mutationRecord.target["innerText"].includes("Server was unreachable for too long")) {
                Logger.ERROR("Chat failed to connect, you are likely using a VPN or proxy which Omegle has detected and blocked.")
                document.dispatchEvent(new CustomEvent('chatFailedConnect', {detail: mutationRecord.target}));
                this.#isChatting = false;
                this.#clearUUID();
                return;
            }
        }

        // Disconnect button
        if (mutationRecord.target.classList.contains('skipButton')) {
            document.dispatchEvent(new CustomEvent('skipButtonMutation', {detail: mutationRecord}))
        }

        // REGULAR STUFF
        if (mutationRecord.target.classList.contains("information")) {
            this.onChatMutationRecord(mutationRecord);
        }

        // Chat Log
        for (const node of mutationRecord.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;

            // --- RE-ADDED HIDE/COLOR LOGIC HERE ---
            if (node.classList.contains('information')) {
                try {
                    // Find "You both like..." or "You like..."
                    let textNode = Array.from(node.childNodes).find(child =>
                        child.nodeType === Node.TEXT_NODE && /You (both )?like /.test(child.textContent)
                    );

                    if (textNode) {
                        let fullText = textNode.textContent;
                        // Use regex to capture the full interest phrase reliably
                        const interestMatch = fullText.match(/(You (both )?like .*)/);
                        if (interestMatch && interestMatch[0]) {
                             const interestText = interestMatch[0];
                             // Split based on the interest text
                            let parts = fullText.split(interestText);

                            // Remove original text node
                             textNode.remove();

                             // Add back the part *before* interests (if any)
                             if (parts[0] && parts[0].trim() !== '') {
                                 // Intentionally skip adding "You're now chatting..."
                                 // node.appendChild(document.createTextNode(parts[0]));
                             }

                            // Add the styled interests span
                            let span = document.createElement('span');
                            span.textContent = interestText;
                            span.style.color = 'orange'; // Set color to orange
                            node.appendChild(span);

                             // Add back the part *after* interests (if any - unlikely)
                             if (parts[1] && parts[1].trim() !== '') {
                                node.appendChild(document.createTextNode(parts[1]));
                            }

                            // Clean up remaining "You're now chatting..." or empty text nodes
                             Array.from(node.childNodes).forEach(child => {
                                if (child.nodeType === Node.TEXT_NODE) {
                                     child.textContent = child.textContent.replace("You're now chatting with a random stranger", '').trim();
                                     if(child.textContent === '') {
                                         child.remove();
                                     }
                                }
                             });

                            // Remove leading <br> if present
                            if (node.firstChild && node.firstChild.nodeName === 'BR') {
                                node.firstChild.remove();
                            }
                        }
                    } else {
                         // Still remove the "chatting" text even if no interests were found
                         let chatNode = Array.from(node.childNodes).find(n =>
                            n.nodeType === Node.TEXT_NODE && n.textContent.includes("You're now chatting with a random stranger")
                         );
                         if (chatNode) {
                             chatNode.textContent = chatNode.textContent.replace("You're now chatting with a random stranger", '').trim();
                              if(chatNode.textContent === '') {
                                  chatNode.remove();
                              }
                         }
                         // Remove leading <br>
                         if (node.firstChild && node.firstChild.nodeName === 'BR') {
                             node.firstChild.remove();
                         }
                    }


                } catch (e) {
                    Logger.ERROR("Error styling interests:", e);
                }
            }
             // --- END RE-ADDED LOGIC ---


            if (
                node.classList.contains("tempMessage") ||
                node.querySelector("span.You") ||
                node.querySelector("span.Stranger")
            ) {
                this.onLogItemAdded(node);
            }
        }


    }

    onLogItemAdded(logItemNode) {
        Logger.DEBUG('log trigger', logItemNode.outerHTML);

        const span = logItemNode.querySelector("span");
        if (!span) {
             // It might be the .information div itself, which we handled in onMutationRecord
             if (!logItemNode.classList.contains('information')) {
                Logger.WARNING('No span found in chat message');
            }
            return;
        }

        const isUser = span.classList.contains("You");
        const isStranger = span.classList.contains("Stranger");

        if (isUser || isStranger) {
            const idx = this.#messages.length;

            const rawText = logItemNode.textContent || "";
            const label = span.textContent || "";
            const messageText = rawText.replace(label, "").trim();

            const message = new ChatMessage(isUser, messageText, logItemNode, idx);
            this.#messages.push(message);

            document.dispatchEvent(new CustomEvent("chatMessage", { detail: message }));
            Logger.DEBUG(`Captured message #${idx + 1} (${isUser ? "You" : "Stranger"}): ${messageText}`);
        }
    }



    containsOneOfClasses(node, ...classes) {

        if (!node?.classList) {
            return false;
        }

        for (let CLASS of classes) {
            if (node.classList.contains(CLASS)) {
                return true;
            }
        }

        return false;
    }


    onChatMutationRecord(mutationRecord) {
        const el = mutationRecord.target;

        if (
            el.id === "information" &&
            el.closest("#mainMessages") == null &&
            el.textContent.includes("You're now chatting with a random stranger") // Site adds this first
        ) {
            if (!this.#isChatting) {
                this.#isChatting = true;
                this.#videoChatLoaded = false;
                this.#setUUID();
                Logger.INFO("Chat Started: UUID <%s>", this.getUUID());
                document.dispatchEvent(new CustomEvent("chatStarted", {
                    detail: {
                        button: el,
                        uuid: this.getUUID(),
                        isVideoChat: this.isVideoChat()
                    }
                }));
                 // Call the hide/color logic here too, as this element is added early
                 this.applyChatStartStyling(el);
            }
            return;
        }

        if (
            el.classList.contains("information") &&
            el.closest("#mainMessages") == null &&
            el.textContent.includes("Looking for someone you can chat with...")
        ) {
            if (this.#isChatting) {
                Logger.INFO("Chat Ended: UUID <%s>", this.getUUID());
                const uuid = this.getUUID();

                this.#lastChatUUID = uuid;
                this.#lastChatEndTime = Date.now();

                this.#isChatting = false;
                this.#clearUUID();
                this.#messages = [];
                document.dispatchEvent(new CustomEvent("chatEnded", {
                    detail: {
                        button: el,
                        uuid,
                        isVideoChat: this.isVideoChat()
                    }
                }));
            }
        }
    }

    // Helper function for applying styles
    applyChatStartStyling(node) {
        try {
            // Find "You both like..." or "You like..."
            let textNode = Array.from(node.childNodes).find(child =>
                child.nodeType === Node.TEXT_NODE && /You (both )?like /.test(child.textContent)
            );

            if (textNode) {
                let fullText = textNode.textContent;
                const interestMatch = fullText.match(/(You (both )?like .*)/);
                if (interestMatch && interestMatch[0]) {
                     const interestText = interestMatch[0];
                     let parts = fullText.split(interestText);
                     textNode.remove();
                     // Intentionally skip adding "You're now chatting..."
                     let span = document.createElement('span');
                     span.textContent = interestText;
                     span.style.color = 'orange';
                     node.appendChild(span);
                     if (parts[1] && parts[1].trim() !== '') {
                         node.appendChild(document.createTextNode(parts[1]));
                    }
                }
            }

             // Clean up remaining "You're now chatting..." or empty text nodes
             Array.from(node.childNodes).forEach(child => {
                 if (child.nodeType === Node.TEXT_NODE) {
                     child.textContent = child.textContent.replace("You're now chatting with a random stranger", '').trim();
                     if(child.textContent === '') {
                         child.remove();
                     }
                 }
             });

             // Remove leading <br>
             if (node.firstChild && node.firstChild.nodeName === 'BR') {
                 node.firstChild.remove();
             }
        } catch (e) {
            Logger.ERROR("Error styling interests in applyChatStartStyling:", e);
        }
    }

    
    // --- REMOVED ---
    // The onReportReceived function has been removed.
    // --- END REMOVAL ---

}

class ChatMessage {

    constructor(isUser, content, element, index) {

        /** @type boolean */
        this.isUser = isUser;

        /** @type string */
        this.content = content;

        /** @type HTMLElement */
        this.element = element;

        /** @type Number */
        this.messageNumber = index + 1;

        /** @type HTMLSpanElement|null */
        this.spanElement = this.element?.querySelector("span") || null;

    }

    getTextNodes() {
        let childNodes = this.spanElement?.childNodes || [];
        let textNodes = [];

        for (let childNode of childNodes) {
            if (childNode.nodeType === Node.TEXT_NODE) {
                textNodes.push(childNode);
            }
        }

        return textNodes;
    }

    isStranger() {
        return !this.isUser;
    }

}