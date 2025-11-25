class ChatRegistryManager extends Module {

    constructor() {
        super();

        ChatRegistry = this;
        this.#observer.observe(document, {subtree: true, childList: true, attributes: true});
        this.addEventListener("click", this.onButtonClick, undefined, document);
    }

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

    handleReportPopup(popupNode) {
        const banChoiceDiv = popupNode.querySelector('.banChoice');
        
        if (!banChoiceDiv || popupNode.querySelector('#chromegle-block-previous-user-btn')) {
            return;
        }
        
        Logger.DEBUG("Report popup detected. Injecting 'Block IP' button.");
        
        const blockButton = document.createElement("button");
        blockButton.id = "chromegle-block-previous-user-btn";
        blockButton.textContent = "Block IP";
        blockButton.className = "chromegle-report-block-button";
        
        blockButton.addEventListener('click', () => {
            const ip = IPGrabberManager.previousUnhashedIP;
            const ipType = IPGrabberManager.previousIpType;

            if (!ip) {
                alert("Chromegle: Previous user's IP was not found.");
                return;
            }
            
            if (ipType === 'relay') {
                alert("Chromegle: Cannot block a 'relay' IP address.");
                return;
            }
            
            if (typeof IPBlockingManager?.API?.blockAddress === 'function') {
                Logger.INFO(`Blocking previous user from report dialog: ${ip}`);
                IPBlockingManager.API.blockAddress(ip);
                
                const cancelBtn = document.getElementById('cancelBan');
                if (cancelBtn) {
                    cancelBtn.click();
                } else {
                    popupNode.style.display = 'none';
                }
            } else {
                alert("Chromegle: IPBlockingManager API not found.");
            }
        });
        
        const cancelBtn = popupNode.querySelector('#cancelBan');
        if (cancelBtn) {
            banChoiceDiv.insertBefore(blockButton, cancelBtn);
        } else {
            banChoiceDiv.appendChild(blockButton);
        }
    }

    onMutationObserved(mutations) {
        mutations.sort((a, b) => {
            if (a.target.id === "othervideospinner") return 1;
            else if (b.target.id === "othervideospinmner") return -1;
            return -1;
        });

        for (let mutation of mutations) {
            mutation.addedNodes?.forEach(node => {
                if (node.nodeType === 1) { 
                    if (node.classList.contains("information") || node.classList.contains("mainInfo") || node.querySelector(".mainInfo")) {
                        this.onChatMutationRecord({ target: node });
                    }

                    let popup = null;
                    if (node.classList && node.classList.contains('popup') && node.querySelector('#confirmBan')) {
                        popup = node;
                    } else if (typeof node.querySelector === 'function') {
                        popup = node.querySelector('.popup #confirmBan');
                        if (popup) popup = popup.closest('.popup');
                    }

                    if (popup) {
                        this.handleReportPopup(popup);
                    }
                }
            });

            this.onMutationRecord(mutation);
        }
    }

    onMutationRecord(mutationRecord) {
        if (mutationRecord.target.id === "othervideospinner") {
            if (mutationRecord.target.style.display === "none" && this.isChatting() && !this.#videoChatLoaded) {
                this.#videoChatLoaded = true;
                document.dispatchEvent(new CustomEvent("videoChatLoaded"));
            }
            return;
        }

        if (mutationRecord.target["innerText"] != null) {
            if (mutationRecord.target["innerText"].includes("Server was unreachable for too long")) {
                Logger.ERROR("Chat failed to connect, you are likely using a VPN or proxy which Omegle has detected and blocked.")
                document.dispatchEvent(new CustomEvent('chatFailedConnect', {detail: mutationRecord.target}));
                this.#isChatting = false;
                this.#clearUUID();
                return;
            }
        }

        if (mutationRecord.target.classList.contains('skipButton')) {
            document.dispatchEvent(new CustomEvent('skipButtonMutation', {detail: mutationRecord}))
        }

        if (mutationRecord.target.classList.contains("information") || mutationRecord.target.classList.contains("mainInfo")) {
            this.onChatMutationRecord(mutationRecord);
        }

        for (const node of mutationRecord.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;

            if (node.classList.contains('information') || node.classList.contains('mainInfo')) {
                this.applyChatStartStyling(node);
            }

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
             if (!logItemNode.classList.contains('information') && !logItemNode.classList.contains('mainInfo')) {
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
        if (!node?.classList) return false;
        for (let CLASS of classes) {
            if (node.classList.contains(CLASS)) return true;
        }
        return false;
    }

    // --- NEW: Helper to force-end a chat ---
    forceEndChat(triggerElement) {
        Logger.INFO("Forcing Chat End (Recovery) for UUID <%s>", this.getUUID());
        const uuid = this.getUUID();
        this.#lastChatUUID = uuid;
        this.#lastChatEndTime = Date.now();
        this.#isChatting = false;
        this.#clearUUID();
        this.#messages = [];
        document.dispatchEvent(new CustomEvent("chatEnded", {
            detail: {
                button: triggerElement,
                uuid,
                isVideoChat: this.isVideoChat()
            }
        }));
    }
    // --- END NEW ---

    onChatMutationRecord(mutationRecord) {
        const el = mutationRecord.target;
        const text = el.textContent || "";

        // Check for "Chat Started" message
        if (
            (el.id === "information" || el.classList.contains("mainInfo") || el.querySelector(".mainInfo")) &&
            el.closest("#mainMessages") == null &&
            (text.includes("You're now chatting with a random stranger") || text.includes("You're now chatting with someone new"))
        ) {
            // --- FIX: If we think we are already chatting, force-end the previous session first ---
            if (this.#isChatting) {
                this.forceEndChat(el);
            }
            // --- END FIX ---

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
             
            this.applyChatStartStyling(el);
            return;
        }

        // Check for "Chat Ended" message (Standard Omegle)
        // Note: umingle might use different text, so the force-end logic above is critical as a backup.
        if (
            el.classList.contains("information") &&
            el.closest("#mainMessages") == null &&
            el.textContent.includes("Looking for someone you can chat with...")
        ) {
            if (this.#isChatting) {
                this.forceEndChat(el);
            }
        }
    }

    applyChatStartStyling(node) {
        try {
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
                     let span = document.createElement('span');
                     span.textContent = interestText;
                     span.style.color = 'orange';
                     node.appendChild(span);
                     if (parts[1] && parts[1].trim() !== '') {
                         node.appendChild(document.createTextNode(parts[1]));
                    }
                }
            }

             Array.from(node.childNodes).forEach(child => {
                 if (child.nodeType === Node.TEXT_NODE) {
                     child.textContent = child.textContent.replace("You're now chatting with a random stranger", '').trim();
                     child.textContent = child.textContent.replace("You're now chatting with someone new", '').trim();
                     child.textContent = child.textContent.replace("✨", '').trim();
                     if(child.textContent === '') {
                         child.remove();
                     }
                 }
             });

             if (node.firstChild && node.firstChild.nodeName === 'BR') {
                 node.firstChild.remove();
             }
        } catch (e) {
            Logger.ERROR("Error styling interests in applyChatStartStyling:", e);
        }
    }

}

class ChatMessage {
    constructor(isUser, content, element, index) {
        this.isUser = isUser;
        this.content = content;
        this.element = element;
        this.messageNumber = index + 1;
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