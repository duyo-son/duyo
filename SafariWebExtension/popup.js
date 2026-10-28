"use strict";
const run = document.querySelector("#run");
const result = document.querySelector("#result");
const feedback = document.querySelector("#feedback");
const extra = document.querySelector("#extra");
const experiment = document.querySelector("#experiment");
const automatic = document.querySelector("#automatic");
const floating = document.querySelector("#floating");
const { read, expansionWidth, screenWidth } = globalThis.__duyoSettings;
let tab;
let preferredMode = "protected-media";

async function initialize() {
    run.disabled = true;
    try {
        [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!Number.isInteger(tab?.id)) throw new Error("Open a website in Safari to use DUYO.");
        if (!["http:", "https:"].includes(new URL(tab.url).protocol)) throw new Error("Open an HTTP(S) website in Safari.");
        const saved = read((await browser.storage.local.get("preferences")).preferences);
        automatic.checked = saved.automatic;
        floating.checked = saved.floating;
        preferredMode = saved.mode;
        experiment.value = preferredMode;
        await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ["poc.js", "settings.js", "auto.js"] });
        const snapshot = await browser.tabs.sendMessage(tab.id, { type: "duyo:poc", experiment: "snapshot" });
        if (!snapshot?.ok) throw new Error(snapshot?.error ?? "No response from this page.");
        extra.value = expansionWidth(snapshot.result.layoutWidth, screenWidth(snapshot.result.screenWidth, snapshot.result.screenHeight, snapshot.result.orientationAngle ?? 0));
        run.disabled = false;
    } catch (error) {
        result.textContent = `Unable to load preferences: ${error.message}`;
        if (feedback) feedback.textContent = result.textContent;
    }
}

run.addEventListener("click", async () => {
    run.disabled = true;
    try {
        if (!extra.reportValidity()) return;
        const extraWidth = extra.valueAsNumber;
        if (!Number.isInteger(extraWidth) || extraWidth < 0 || extraWidth > 256) {
            throw new Error("Extra width must be an integer from 0 to 256.");
        }
        if (!["measure", "snapshot"].includes(experiment.value)) {
            if (["full-width", "protected-media"].includes(experiment.value)) preferredMode = experiment.value;
            await browser.storage.local.set({ preferences: {
                automatic: automatic.checked, floating: floating.checked, mode: preferredMode
            } });
        }
        await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ["poc.js", "settings.js", "auto.js"] });
        const response = await browser.tabs.sendMessage(tab.id, {
            type: "duyo:poc", experiment: experiment.value, extraWidth
        });
        if (!response?.ok) throw new Error(response?.error ?? "No response from this page.");
        result.textContent = JSON.stringify(response.result, null, 2);
        if (feedback) feedback.textContent = ["measure", "snapshot"].includes(experiment.value)
            ? "Layout inspected." : "Settings saved. Unsupported layouts stay unchanged.";
    } catch (error) {
        result.textContent = `Could not apply: ${error.message}`;
        if (feedback) feedback.textContent = result.textContent;
    } finally {
        run.disabled = false;
    }
});
initialize();
