"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");

async function click({ url = "https://example.test/path?private=value", width = 80, failure = null,
    automatic = false, floating = false, experiment = "document-width", saved = undefined } = {}) {
    let handler;
    const calls = [];
    const writes = [];
    const result = {};
    const button = { addEventListener(_name, callback) { handler = callback; } };
    const extra = { value: width, reportValidity: () => true, get valueAsNumber() { return Number(this.value); } };
    const fields = { "#run": button, "#result": result, "#extra": extra,
        "#experiment": { value: experiment }, "#automatic": { checked: automatic },
        "#floating": { checked: floating }, "#site": {} };
    const browser = {
        tabs: {
            query: async () => [{ id: 42, url }],
            sendMessage: async (id, message) => { calls.push({ id, message }); return { ok: true, result: { layoutWidth: 382, screenWidth: 466 } }; }
        },
        storage: { local: {
            get: async () => ({ preferences: saved }),
            set: async value => writes.push(value),
            remove: async key => writes.push({ removed: key })
        } },
        scripting: { executeScript: async request => { if (failure) throw new Error(failure); calls.push(request); } }
    };
    const context = vm.createContext({ browser, URL, document: { querySelector: selector => fields[selector] } });
    vm.runInContext(readFileSync("SafariWebExtension/settings.js", "utf8"), context);
    await vm.runInContext(readFileSync("SafariWebExtension/popup.js", "utf8"), context);
    const setupCallCount = calls.length;
    extra.value = width;
    fields["#experiment"].value = experiment;
    fields["#automatic"].checked = automatic;
    fields["#floating"].checked = floating;
    if (!button.disabled) await handler();
    calls.splice(0, setupCallCount);
    return { calls, writes, result, button, fields };
}

test("팝업은 HTTP(S) 탭에만 주입하고 같은 탭에 실험을 보낸다", async () => {
    const { calls, result, button } = await click();
    assert.equal(calls[0].target.tabId, 42);
    assert.equal(calls[0].files[0], "poc.js");
    assert.equal(calls[1].id, 42);
    assert.equal(calls[1].message.extraWidth, 80);
    assert.equal(JSON.parse(result.textContent).layoutWidth, 382);
    assert.equal(button.disabled, false);
});

test("제한 페이지와 잘못된 너비에서는 주입하지 않는다", async () => {
    for (const input of [{ url: "safari://settings" }, { width: NaN }, { width: 257 }, { width: 0.5 }]) {
        const { calls, result } = await click(input);
        assert.equal(calls.length, 0);
        assert.match(result.textContent, /Unable to load|Could not apply/);
    }
});

test("권한/주입 오류를 표시하고 버튼을 다시 사용할 수 있다", async () => {
    const { calls, result, button } = await click({ failure: "Website access denied" });
    assert.equal(calls.length, 0);
    assert.match(result.textContent, /Website access denied/);
    assert.equal(button.disabled, true);
});

test("전역 스위치만 저장하고 방문한 사이트나 URL은 저장하지 않는다", async () => {
    const { writes } = await click({ automatic: true, floating: true, experiment: "protected-media" });
    assert.deepEqual(JSON.parse(JSON.stringify(writes)), [{ preferences: { automatic: true, floating: true, mode: "protected-media" } }]);
    const disabled = await click({ experiment: "off" });
    assert.deepEqual(JSON.parse(JSON.stringify(disabled.writes)), [{ preferences: { automatic: false, floating: false, mode: "protected-media" } }]);
});

test("진단 측정은 전역 설정을 바꾸지 않는다", async () => {
    const snapshot = await click({ experiment: "snapshot" });
    assert.equal(snapshot.writes.length, 0);
    assert.equal(snapshot.calls[1].message.experiment, "snapshot");
});
