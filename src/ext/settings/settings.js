let ConstantValues = {
    websiteURL: "https://discord.gg/omeglestream",
    discordURL: "https://discord.gg/omeglestream",
    githubURL: "https://github.com/EolnMsuk/Chromegle-4.0",
    apiURL: "https://m52o1m3c29.execute-api.eu-central-1.amazonaws.com/",
    _helpfulTips: ["Join the Discord!"],
    getHelpfulTip: () => {
        return ConstantValues._helpfulTips[[Math.floor(Math.random() * ConstantValues._helpfulTips.length)]]
            .replaceAll("%discord%", ConstantValues.discordURL)
            .replaceAll("%website%", ConstantValues.websiteURL)
            .replaceAll("%github%", ConstantValues.githubURL);
    },
    videoPopoutStylesheet: ""
}

class SettingsManager extends Module {
    #menu = new SettingsMenu();

    constructor() {
        super();
        Settings = this;


        Logger.INFO("Settings Menu Loaded")
        // Assign button function
        $(ButtonFactory.menuButton).on("click", () => {
            this.#menu.enable();
        })

    }

    enable() {
        this.#menu.enable();
    }

    disable() {
        this.#menu.disable();
    }

}

document.addEventListener("storageSettingsUpdate", (event) => {
    Logger.INFO("Updated sync-storage configuration option on <%s> event: %s", event.type, JSON.stringify(event.detail))
});

class MutableField {
    static localValues;

    #storageName;
    #default;
    #type;
    #warning;

    constructor(config) {
        this.#storageName = config["storageName"]
        this.#default = config["default"] != null ? config["default"] : null;
        this.#type = config["type"];
        this.#warning = config["warning"];
    }

    fromSettingsUpdateEvent(event) {
        return event.detail[this.getName()];
    }

    async retrieveValue(storageArea = "sync", useDefault = true) {
        let query = {[this.getName()]: useDefault ? this.getDefault() : null};
        return ((await chrome.storage[storageArea].get(query)) || {})[this.getName()];
    }

    // *** UPDATED FUNCTION WITH LOGGING ***
    updateValue(config) {
        if (!config["confirm"] || config["confirm"] === "false" || config["confirm"] === false) {
             // <<< ADDED LOGGING >>>
             Logger.DEBUG(`MutableField.updateValue: Save rejected by 'check' function for ${this.getName()}. Config received:`, config);
             // <<< END LOGGING >>>
             return false;
        }
        const override = {}

        if (this.#warning != null && this.getName() !== "COUNTRY_SKIP_TOGGLE") {

            if (this.#warning["state"] == null || this.#warning["state"] === config["value"]) {
                let result = confirm(this.#warning["message"] || null);

                // Cancel
                if (!result) {
                    this.update(true);
                    return false;
                }

            }

        }

        override[this.#storageName] = config["value"]
        // <<< ADDED LOGGING >>>
        Logger.DEBUG(`MutableField.updateValue: Attempting chrome.storage.sync.set for ${this.getName()} with value:`, override);
        // <<< END LOGGING >>>
        chrome.storage.sync.set(override);
        document.dispatchEvent(new CustomEvent("storageSettingsUpdate", {detail: override}));
        return true;
    }
    // *** END OF UPDATED FUNCTION ***

    update(noChange) {
        return null;
    }

    getType() {
        return this.#type;
    }

    getDefault() {
        return this.#default;

    }

    getName() {
        return this.#storageName
    }


}


class SwitchEdit extends MutableField {
    #elementName;
    #otherElementNames;
    #value;

    getValue() {
        return this.#value;
    }

    constructor(config) {
        config["type"] = "switch";
        super(config)
        this.#value = config["value"];
        this.#elementName = config["elementName"];
        this.#otherElementNames = config["otherElementNames"];
    }

    getElementName() {
        return this.#elementName;
    }

    update(noChange = false) {
        let currentQuery = {}
        currentQuery[this.getName()] = this.getDefault();

        chrome.storage.sync.get(currentQuery, (result) => {
            const currentlySelected = result[this.getName()] === this.#elementName;

            // No Change Requested
            if (noChange) {

                // Is currently Selected, change to display selection
                if (currentlySelected) {
                    document.dispatchEvent(new CustomEvent("SwitchModify", {
                        detail: {
                            "element": this.#elementName,
                            "others": this.#otherElementNames,
                            "change": false
                        }
                    }));
                }

                // Is not selected, don't display
                return;
            }

            // Not currently Selected
            if (!currentlySelected && !noChange) {
                let result = this.updateValue({"confirm": "true", "value": this.#elementName});

                if (result) {
                    document.dispatchEvent(new CustomEvent("SwitchModify", {
                        detail: {
                            "element": this.#elementName,
                            "others": this.#otherElementNames,
                            "change": true
                        }
                    }));
                }
            }


        });

    }

}


class ToggleEdit extends MutableField {
    #elementName;

    constructor(config) {
        config["type"] = "toggle";
        super(config)
        this.#elementName = config["elementName"];
    }

    getElementName() {
        return this.#elementName;
    }

    update(noChange = false) {
        const name = this.getName();
        const request = {}
        let newResult;
        request[name] = this.getDefault();
        chrome.storage.sync.get(request, (result) => {
            if (noChange) {
                newResult = result[name];

                document.dispatchEvent(new CustomEvent("ToggleModify", {
                    detail: {
                        "element": this.#elementName,
                        "value": newResult,
                        "change": !noChange
                    }
                }));

            } else {
                newResult = result[name] === "true" ? "false" : "true";
                let storageResult = this.updateValue({"confirm": "true", "value": newResult});

                if (storageResult) {

                    document.dispatchEvent(new CustomEvent("ToggleModify", {
                        detail: {
                            "element": this.#elementName,
                            "value": newResult,
                            "change": !noChange
                        }
                    }));
                }
            }

        });
    }

}

class FieldEdit extends MutableField {
    #prompt;
    #check;
    #defaultCheck = () => true;

    getPrompt() {
        return this.#prompt;
    }

    constructor(config) {
        config["type"] = "field";
        super(config);
        this.#prompt = config["prompt"];
        this.#check = config["check"] || this.#defaultCheck;
    }

    getResponse(previous) {
        return prompt(this.#prompt, previous);
    }

    update(noChange) {
        if (noChange) return;

        const name = this.getName();
        const request = {}
        request[name] = this.getDefault();
        chrome.storage.sync.get(request, (result) => {
            const response = this.getResponse(result[name]);
            this.updateValue(this.#check(response));
        })
    }

}

class MultiFieldEdit extends FieldEdit {
    #times;

    constructor(config) {
        super(config);
        this.#times = config["times"] || 1;
    }

    static #suffixCalculation(i) {
        let j = i % 10, k = i % 100;
        if (j === 1 && k !== 11) return i + "st";
        if (j === 2 && k !== 12) return i + "nd";
        if (j === 3 && k !== 13) return i + "rd";
        return i + "th";
    }

    setTimes(_times) {
        this.#times = _times;
    }

    getResponse(previous) {
        let results = [];
        let defaults = this.getDefault();

        for (let i = 0; i < this.#times; i++) {
            results.push(prompt(this.getPrompt().replaceAll("%n", MultiFieldEdit.#suffixCalculation(i + 1)), previous[i] || defaults[i] || ""))
        }

        return results;
    }
}

class MutableMultiEditField extends MultiFieldEdit {
    #max;
    #min;
    #defaultTimes = "1";

    constructor(config) {
        super(config);
        this.#max = config["max"] || null;
        this.#min = (config["min"] != null && config["min"] >= 1) ? config["min"] : 0;
    }

    getTimes() {

        let response = prompt(`How many inputs would you like to enter? (Max: ${this.#max} | Min: ${this.#min})`, this.#defaultTimes);

        if (!isNumeric(response)) return this.#min;
        else if (response > this.#max) return this.#max;
        else if (response < this.#min) return this.#min;
        else return response;

    }

    getResponse(_previous) {
        this.setTimes(this.getTimes())
        // noinspection JSValidateTypes
        return super.getResponse(_previous);
    }

}

class ExternalField extends MutableField {
    #externalFunction

    constructor(config) {
        config["type"] = "external";
        super(config);
        this.#externalFunction = config["external"];
    }

    update(noChange) {
        if (noChange) return;
        this.#externalFunction();
    }
}


// --- START: NEW CLASS FOR COUNTRY SKIP MODAL ---

class CountrySkipField extends MutableField {
    // Static properties to ensure we only inject the modal once
    static modalInjected = false;
    static modalElement = null;
    static textareaElement = null;
    static modalTitleElement = null;

    #prompt;
    #check;

    constructor(config) {
        config["type"] = "modal_field";
        super(config);
        this.#prompt = config["prompt"];
        this.#check = config["check"]; // Get the check function from config

        if (!CountrySkipField.modalInjected) {
            this.injectModal();
            CountrySkipField.modalInjected = true;
        }
    }

    injectModal() {
        // 1. Create the Stylesheet (borrowed from elements.js Note)
        const style = document.createElement('style');
        style.innerHTML = `
            .chromegle-country-modal {
                display: none; /* Hidden by default */
                position: fixed;
                z-index: 99999; /* On top of settings modal */
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.6);
                justify-content: center;
                align-items: center;
                font-family: Inter, sans-serif;
            }
            .chromegle-country-content {
                background-color: #2c2f33;
                color: #ffffff;
                padding: 20px;
                border-radius: 8px;
                width: 90%;
                max-width: 500px; /* Wider for code list */
                box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            }
            .chromegle-country-content h3 {
                margin-top: 0;
                color: #ffffff;
                font-size: 18px;
            }
            .chromegle-country-content p {
                font-size: 14px;
                color: #b9bbbe;
                white-space: pre-wrap; /* Allows line breaks from prompt */
                margin-bottom: 15px;
            }
            .chromegle-country-content textarea {
                width: 100%;
                height: 150px; /* Taller for code list */
                border-radius: 4px;
                border: 1px solid #555;
                background-color: #40444b;
                color: #ffffff;
                padding: 8px;
                font-family: Inter, sans-serif;
                margin-bottom: 15px;
                box-sizing: border-box; /* Important */
                resize: vertical;
            }
            .chromegle-country-buttons {
                display: flex;
                justify-content: flex-end;
            }
            .chromegle-country-buttons button {
                padding: 8px 15px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                margin-left: 10px;
            }
            .chromegle-country-save {
                background-color: #43b581;
                color: white;
            }
            .chromegle-country-cancel {
                background-color: #747f8d;
                color: white;
            }
        `;
        document.head.appendChild(style);

        // 2. Create the Modal HTML
        CountrySkipField.modalElement = document.createElement('div');
        CountrySkipField.modalElement.id = 'chromegle-country-modal';
        CountrySkipField.modalElement.className = 'chromegle-country-modal';

        // Use <p> for the prompt text to allow formatting
        CountrySkipField.modalElement.innerHTML = `
            <div class="chromegle-country-content">
                <h3 id="chromegle-country-modal-title">Edit Blocked Countries</h3>
                <p id="chromegle-country-modal-prompt"></p>
                <textarea id="chromegle-country-textarea" aria-labelledby="chromegle-country-modal-title" placeholder="e.g. IN,PK,BD,TR"></textarea>
                <div class="chromegle-country-buttons">
                    <button id="chromegle-country-cancel" class="chromegle-country-cancel">Cancel</button>
                    <button id="chromegle-country-save" class="chromegle-country-save">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(CountrySkipField.modalElement);

        // 3. Get references and add listeners
        CountrySkipField.textareaElement = document.getElementById('chromegle-country-textarea');
        CountrySkipField.modalTitleElement = document.getElementById('chromegle-country-modal-prompt');
        const saveButton = document.getElementById('chromegle-country-save');
        const cancelButton = document.getElementById('chromegle-country-cancel');

        // Use 'this' as we're binding static methods
        saveButton.addEventListener('click', this.onSave);
        cancelButton.addEventListener('click', this.onCancel);

        // Robust closing logic (from elements.js fix)
        let isMouseDownOnOverlay = false;
        CountrySkipField.modalElement.addEventListener('mousedown', (event) => {
            if (event.target === CountrySkipField.modalElement) {
                isMouseDownOnOverlay = true;
            }
        });
        CountrySkipField.modalElement.addEventListener('mouseup', (event) => {
            if (isMouseDownOnOverlay && event.target === CountrySkipField.modalElement) {
                this.onCancel();
            }
            isMouseDownOnOverlay = false;
        });
    }

    // Save button handler
    onSave() {
        const modal = CountrySkipField.modalElement;
        const configInstance = modal.configInstance; // Get the specific config object
        if (!configInstance) return;

        let newValue = CountrySkipField.textareaElement.value;

        // Run the field's specific check function
        const checkResult = configInstance.#check(newValue);

        // updateValue will return false if the check failed
        const success = configInstance.updateValue(checkResult);

        if (success) {
            // Only close if save was successful
            modal.style.display = 'none';
            modal.configInstance = null;
        }
        // If save failed (e.g., validation alert), the modal stays open
    }

    // Cancel button handler
    onCancel() {
        const modal = CountrySkipField.modalElement;
        modal.style.display = 'none';
        modal.configInstance = null;
    }

    // This is called by menu.js
    async update(noChange) {
        if (noChange) return;

        // Get the current value from storage
        const currentValue = await this.retrieveValue();

        // Populate and show the modal
        CountrySkipField.modalTitleElement.innerText = this.#prompt;
        CountrySkipField.textareaElement.value = currentValue || '';
        CountrySkipField.modalElement.setAttribute('data-storage-name', this.getName());
        CountrySkipField.modalElement.configInstance = this; // Store this instance
        CountrySkipField.modalElement.style.display = 'flex';
        CountrySkipField.textareaElement.focus();
    }
}

// --- END: NEW CLASS ---