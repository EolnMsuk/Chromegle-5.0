function ReSpoiler(string) {
    let element = document.createElement("button");
    element.innerText = string;
    element.classList.add("chromegle-spoiler");
    element.classList.add("clickable");
    return element;
}

class Note {

    NOTE_STORAGE_ID = "NOTE_STORAGE_JSON";
    NOTE_STORAGE_DEFAULT = "{}";

    element = undefined;

    emptyText = "Click to Add Note";
    emptyClass = "empty";
    baseClass = "chromegle-note";

    // --- START: NEW MODAL LOGIC ---
    // Static properties to ensure we only inject the modal once
    static modalInjected = false;
    static modalElement = null;
    static textareaElement = null;

    constructor() {
        if (!Note.modalInjected) {
            this.injectModal();
            Note.modalInjected = true;
        }
    }

    injectModal() {
        // 1. Create the Stylesheet
        const style = document.createElement('style');
        style.innerHTML = `
            .chromegle-note-modal {
                display: none; /* Hidden by default */
                position: fixed;
                z-index: 99999;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.6);
                justify-content: center;
                align-items: center;
                font-family: Inter, sans-serif;
            }
            .chromegle-note-content {
                background-color: #2c2f33;
                color: #ffffff;
                padding: 20px;
                border-radius: 8px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            }
            .chromegle-note-content h3 {
                margin-top: 0;
                color: #ffffff;
            }
            .chromegle-note-content textarea {
                width: 100%;
                height: 100px;
                border-radius: 4px;
                border: 1px solid #555;
                background-color: #40444b;
                color: #ffffff;
                padding: 8px;
                font-family: Inter, sans-serif;
                margin-bottom: 15px;
                box-sizing: border-box; /* Important */
            }
            .chromegle-note-buttons {
                display: flex;
                justify-content: flex-end;
            }
            .chromegle-note-buttons button {
                padding: 8px 15px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                margin-left: 10px;
            }
            .chromegle-note-save {
                background-color: #43b581;
                color: white;
            }
            .chromegle-note-cancel {
                background-color: #747f8d;
                color: white;
            }
        `;
        document.head.appendChild(style);

        // 2. Create the Modal HTML
        Note.modalElement = document.createElement('div');
        Note.modalElement.id = 'chromegle-note-modal';
        Note.modalElement.className = 'chromegle-note-modal';

        // --- FIX: Added id to h3 and aria-labelledby/placeholder to textarea ---
        Note.modalElement.innerHTML = `
            <div class="chromegle-note-content">
                <h3 id="chromegle-note-modal-title">Set a new value for the note:</h3>
                <textarea id="chromegle-note-textarea" aria-labelledby="chromegle-note-modal-title" placeholder="Enter your note..."></textarea>
                <div class="chromegle-note-buttons">
                    <button id="chromegle-note-cancel" class="chromegle-note-cancel">Cancel</button>
                    <button id="chromegle-note-save" class="chromegle-note-save">Save</button>
                </div>
            </div>
        `;
        // --- END FIX ---
        
        document.body.appendChild(Note.modalElement);

        // 3. Get references and add listeners
        Note.textareaElement = document.getElementById('chromegle-note-textarea');
        const saveButton = document.getElementById('chromegle-note-save');
        const cancelButton = document.getElementById('chromegle-note-cancel');

        saveButton.addEventListener('click', this.onNoteSave);
        cancelButton.addEventListener('click', this.onNoteCancel);

        // Add keydown listener to the textarea
        Note.textareaElement.addEventListener('keydown', (event) => {
            // Check if the pressed key is 'Enter'
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent adding a new line
                saveButton.click();     // Programmatically click the 'Save' button
            }
        });

        // --- START OF FIX: Replaced 'click' with 'mousedown' and 'mouseup' ---
        let isMouseDownOnOverlay = false;

        Note.modalElement.addEventListener('mousedown', (event) => {
            // Check if the mousedown was *directly* on the overlay itself
            if (event.target === Note.modalElement) {
                isMouseDownOnOverlay = true;
            }
        });

        Note.modalElement.addEventListener('mouseup', (event) => {
            // Check if the mouseup is on the overlay AND the mousedown was *also* on the overlay
            if (isMouseDownOnOverlay && event.target === Note.modalElement) {
                this.onNoteCancel(); // Only close if the click *started* and *ended* on the overlay
            }
            // Reset the flag regardless of where the mouseup happened
            isMouseDownOnOverlay = false;
        });
        // --- END OF FIX ---
    }

    // Save button handler
    async onNoteSave() {
        const modal = Note.modalElement;
        const hashedAddress = modal.getAttribute('data-address');
        const noteInstance = modal.noteInstance; // Get the specific Note object
        if (!hashedAddress || !noteInstance) return;

        let newValue = Note.textareaElement.value;

        if (newValue.length === 0) {
            newValue = null;
            noteInstance.element.innerText = noteInstance.emptyText;
        } else {
            noteInstance.element.innerText = noteInstance.formatNote(newValue);
        }

        // Set new value
        await noteInstance.setNote(hashedAddress, newValue);

        // Hide modal
        modal.style.display = 'none';
        modal.setAttribute('data-address', '');
        modal.noteInstance = null;
    }

    // Cancel button handler
    onNoteCancel() {
        const modal = Note.modalElement;
        modal.style.display = 'none';
        modal.setAttribute('data-address', '');
        modal.noteInstance = null;
    }
    // --- END: NEW MODAL LOGIC ---

    formatNote(noteText) {
        // --- FIX: Added a space before the note text ---
        return " " + noteText;
        // --- END FIX ---
    }

    async setup(hashedAddress) {

        this.element = document.createElement("span");
        this.element.classList.add(this.baseClass);
        this.element.setAttribute("ip-address", hashedAddress);

        // Get text
        let storedText = await this.getNote(hashedAddress);

        if (storedText && storedText.length > 0) {
            this.element.innerText = this.formatNote(storedText);
            this.element.classList.remove(this.emptyClass);
        } else {
            this.element.innerText = this.emptyText;
        }

        this.element.addEventListener("click", this.onNoteClick.bind(this));
    }

    async getStorageData() {
        let storageQuery = {[this.NOTE_STORAGE_ID]: this.NOTE_STORAGE_DEFAULT};
        let storedData = (await chrome.storage.local.get(storageQuery))[this.NOTE_STORAGE_ID];
        return JSON.parse(storedData || this.NOTE_STORAGE_DEFAULT);
    }

    async getNote(hashedAddress) {
        let storedData = await this.getStorageData();
        return storedData[hashedAddress] || null;
    }

    async setNote(hashedAddress, newValue) {

        let storedData = await this.getStorageData();

        if (newValue == null) {
            try {
                delete storedData[hashedAddress]
            } catch (ex) {
                // ignore
            }
        } else {
            storedData[hashedAddress] = newValue;
        }

        let storageQuery = {[this.NOTE_STORAGE_ID]: JSON.stringify(storedData)};
        await chrome.storage.local.set(storageQuery);

        Logger.DEBUG(`Set note for ${hashedAddress} to: <%s>`, newValue);
    }

    async onNoteClick(event) {
        // Stop click from bubbling up
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        // --- START: REPLACED PROMPT WITH MODAL ---
        const hashedAddress = this.element.getAttribute("ip-address");
        if (!hashedAddress) return;

        // Get current note value
        let storedText = await this.getNote(hashedAddress);

        // Populate and show the modal
        Note.textareaElement.value = storedText || '';
        Note.modalElement.setAttribute('data-address', hashedAddress);
        Note.modalElement.noteInstance = this; // Store this instance
        Note.modalElement.style.display = 'flex';
        Note.textareaElement.focus();
        // --- END: REPLACED PROMPT WITH MODAL ---
    }


}

class IPAddressSpoiler {

    element = undefined;
    STORAGE_ID = "IP_SPOILER_HIDDEN_TOGGLE";
    STORAGE_DEFAULT = true;

    constructor(string) {
        this.string = string;
    }

    async isHidden() {
        let hiddenQuery = {[this.STORAGE_ID]: this.STORAGE_DEFAULT};
        return (await chrome.storage.sync.get(hiddenQuery))[this.STORAGE_ID];
    }

    async setIsHidden(hiddenValue)  {
        let hiddenQuery = {[this.STORAGE_ID]: hiddenValue};
        await chrome.storage.sync.set(hiddenQuery);
    }

    async setup() {

        // Element setup
        this.element = document.createElement("span");
        this.element.innerText = this.string;
        this.element.classList.add("chromegle-spoiler");
        this.element.addEventListener("click", this.onClick.bind(this));
        this.element.addEventListener("mousedown", this.onMouseDown.bind(this), false);

        // Set hidden status
        this.setElementHidden(await this.isHidden());

        return this;

    }

    async onClick() {

        let isHidden = await this.isHidden();
        await this.setIsHidden(!isHidden);
        this.setElementHidden(!isHidden);

    }

    /**
     * Prevents selecting
     * https://stackoverflow.com/questions/880512/prevent-text-selection-after-double-click
     */
    onMouseDown(event) {
        event.preventDefault();
    }

    setElementHidden(isHidden) {
        if (isHidden) {
            this.element.classList.remove("show");
        } else {
            this.element.classList.add("show");
        }
    }

    get() {
        return this.element;
    }

}

class ChatUpdateClock {

    #updateFunctions;
    // --- REVERTED: REMOVED PAUSE LOGIC ---

    constructor(chatUUID, updateInterval) {
        this.updateInterval = updateInterval;
        this.chatUUID = chatUUID;
        this.interval = setInterval(this.onInterval.bind(this), this.updateInterval);
        this.#updateFunctions = [];
        this.startTime = new Date();
        this.currentTime = this.startTime;

        // --- REVERTED: REMOVED LISTENERS ---
    }

    cancel() {
        clearInterval(this.interval);
    }

    addUpdate(func) {
        this.#updateFunctions.push(func);
    }

    onInterval() {

        // --- REVERTED: REMOVED PAUSE CHECK ---

        if (ChatRegistry.getUUID() !== this.chatUUID) {
            this.cancel();
            return;
        }

        this.currentTime = new Date();
        for (let func of this.#updateFunctions) {
            func(this.currentTime, this.startTime);
        }

    }

}

function EmbeddedLink(url) {

    let element = document.createElement("a");
    element.target = "_blank";
    element.href = url;
    element.innerHTML = url;
    element.classList.add(LinkEmbedManager.linkClass);
    return element;

}

class ChromeStoredElement {

    constructor(storageId, storageDefault, storageArea = "sync") {
        this.id = storageId;
        this.default = storageDefault;
        this.storageArea = storageArea;
    }

    async retrieveValue() {
        let query = {[this.id]: this.default};
        return ((await chrome.storage[this.storageArea].get(query)) || {})[this.id];
    }

    async setValue(newValue) {
        let query = {[this.id]: newValue};
        await chrome.storage[this.storageArea].set(query);
    }

}
