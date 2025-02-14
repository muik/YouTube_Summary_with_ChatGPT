import "../css/settings.css";
import { defaultSettings } from "../storage.js";

document.addEventListener("DOMContentLoaded", () => {
    const promptAreaChatGPT = document.getElementById("promptChatGPT");
    const promptAreaGemini = document.getElementById("promptGemini");
    const googleCloudAPIKeyInput = document.getElementById("googleCloudAPIKey");

    const statusMessageChatGPT = document.getElementById(
        "statusMessageChatGPT"
    );
    const statusMessageGemini = document.getElementById("statusMessageGemini");
    const statusMessageGoogleCloudAPIKey = document.getElementById(
        "statusMessageGoogleCloudAPIKey"
    );

    console.debug("Extension settings page loaded");

    // Load the saved prompt text when the page is loaded
    chrome.storage.sync.get(
        [
            "promptChatGPT",
            "promptGemini",
            "googleCloudAPIKey",
        ],
        (result) => {
            promptAreaChatGPT.value =
                result.promptChatGPT || defaultSettings.promptChatGPT;
            promptAreaGemini.value =
                result.promptGemini || defaultSettings.promptGemini;
            googleCloudAPIKeyInput.value = result.googleCloudAPIKey || "";
        }
    );

    // Function to save settings and display status
    const saveSetting = (key, value, statusMessageElement) => {
        console.debug(`Saving setting: ${key} =`, value);
        chrome.storage.sync.set({ [key]: value }, () => {
            console.debug(`Successfully saved: ${key}`);
            statusMessageElement.textContent = "Saved!";
            statusMessageElement.classList.add("visible");
            setTimeout(
                () => statusMessageElement.classList.remove("visible"),
                2000
            );

            chrome.runtime.sendMessage(
                { message: "settingsUpdated", key: key, value: value },
                (response) => {
                    // TODO handle errors
                    console.debug("Settings updated:", response);
                }
            );
        });
    };

    // Debounced save function
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    const debouncedSaveSetting = debounce((key, value, statusElement) => {
        saveSetting(key, value, statusElement);
    }, 500);

    // Auto-save with debounced input
    promptAreaChatGPT.addEventListener("input", () => {
        debouncedSaveSetting(
            "promptChatGPT",
            promptAreaChatGPT.value,
            statusMessageChatGPT
        );
    });

    promptAreaGemini.addEventListener("input", () => {
        debouncedSaveSetting(
            "promptGemini",
            promptAreaGemini.value,
            statusMessageGemini
        );
    });

    googleCloudAPIKeyInput.addEventListener("input", () => {
        debouncedSaveSetting(
            "googleCloudAPIKey",
            googleCloudAPIKeyInput.value,
            statusMessageGoogleCloudAPIKey
        );
    });
});
