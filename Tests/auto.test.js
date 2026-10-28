"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const settingsSource = readFileSync("SafariWebExtension/settings.js", "utf8");
const autoSource = readFileSync("SafariWebExtension/auto.js", "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));

// 제어 흐름 모형이다. CSS 위치/Shadow DOM 접근성은 실제 Safari에서 별도 검사한다.
async function environment({ saved, width = 382, getter } = {}) {
    let stored = saved;
    let active = "off";
    const calls = [], keys = [], storageListeners = [], messageListeners = [];
    const events = new Map();
    function node(tagName) {
        return {
            tagName, children: [], attributes: {}, handlers: {}, style: { setProperty(name, value) { this[name] = value; } }, isConnected: false,
            append(...children) { this.children.push(...children); children.forEach(child => { child.isConnected = true; }); },
            remove() { this.isConnected = false; },
            setAttribute(name, value) { this.attributes[name] = value; },
            addEventListener(name, callback) { this.handlers[name] = callback; },
            attachShadow() { this.shadow = node("shadow"); return this.shadow; }
        };
    }
    const root = node("html");
    root.clientWidth = width;
    const api = {
        apply(experiment, extraWidth) { calls.push({ experiment, extraWidth }); active = experiment; },
        measure() { return { experiment: active }; }
    };
    const context = vm.createContext({
        __duyoPoc: api,
        document: { documentElement: root, createElement: node },
        screen: { width: 466, height: 678, orientation: { angle: 0,
            addEventListener: (name, callback) => events.set("orientation:" + name, callback) } },
        innerHeight: 580,
        visualViewport: { height: 580, offsetTop: 0, addEventListener: (name, callback) => events.set("visual:" + name, callback) },
        console: { warn() {} },
        addEventListener: (name, callback) => events.set(name, callback),
        browser: {
            storage: {
                local: { get: key => { keys.push(key); return getter ? getter() : Promise.resolve({ preferences: stored }); } },
                onChanged: { addListener: callback => storageListeners.push(callback) }
            },
            runtime: { onMessage: { addListener: callback => messageListeners.push(callback) } }
        }
    });
    vm.runInContext(settingsSource, context);
    vm.runInContext(autoSource, context);
    await tick();
    return {
        context, root, api, calls, keys, events, storageListeners, messageListeners,
        button: () => root.children.find(child => child.isConnected)?.shadow.children.find(child => child.tagName === "button"),
        change(value) { stored = value; storageListeners[0]({ preferences: { newValue: value } }, "local"); }
    };
}

test("설정이 없어도 외부 화면에서는 자동 적용하며 방문지는 저장하지 않는다", async () => {
    const e = await environment();
    assert.deepEqual(e.calls, [{ experiment: "protected-media", extraWidth: 84 }]);
    assert.deepEqual(e.keys, ["preferences"]);
    assert.equal(e.button().attributes["aria-label"], "Restore page with DUYO");
    vm.runInContext(autoSource, e.context);
    assert.equal(e.storageListeners.length, 1);
    assert.equal(e.messageListeners.length, 1);
});

test("펼친 화면에서는 복구/버튼 제거, 닫힌 화면에서는 자동 재적용한다", async () => {
    const e = await environment();
    e.root.clientWidth = 951;
    e.events.get("resize")();
    assert.equal(e.api.measure().experiment, "off");
    assert.equal(e.button(), undefined);
    e.root.clientWidth = 382;
    e.events.get("resize")();
    assert.equal(e.api.measure().experiment, "protected-media");
    assert.ok(e.button());
    const count = e.calls.length;
    e.events.get("resize")();
    assert.equal(e.calls.length, count);
});

test("내부 화면 최초 로딩에는 버튼이나 확장 스타일을 적용하지 않는다", async () => {
    const e = await environment({ width: 951 });
    assert.deepEqual(e.calls, [{ experiment: "off", extraWidth: undefined }]);
    assert.equal(e.button(), undefined);
});

test("수동 플로팅 적용/복구는 자동 스위치를 바꾸지 않고 현재 페이지에만 적용한다", async () => {
    const e = await environment({ saved: { automatic: false, floating: true } });
    assert.equal(e.calls.length, 0);
    assert.equal(e.button().attributes["aria-label"], "Apply DUYO");
    e.button().handlers.click();
    assert.equal(e.api.measure().experiment, "protected-media");
    assert.equal(e.button().attributes["aria-pressed"], "true");
    e.button().handlers.click();
    assert.equal(e.api.measure().experiment, "off");
    assert.equal(e.button().attributes["aria-label"], "Apply DUYO");
    e.change({ automatic: false, floating: false });
    await tick();
    assert.equal(e.button(), undefined);
});

test("전체 자동 적용을 끄면 자동 적용한 페이지는 복구한다", async () => {
    const e = await environment();
    e.change({ automatic: false, floating: false });
    await tick();
    assert.equal(e.api.measure().experiment, "off");
    assert.equal(e.button(), undefined);
    const count = e.keys.length;
    e.storageListeners[0]({ unrelated: { newValue: true } }, "local");
    assert.equal(e.keys.length, count);
});

test("전체 자동 적용 중 수동 복구는 화면 미지원 전환이나 다른 탭 저장으로 취소되지 않는다", async () => {
    const e = await environment();
    e.button().handlers.click();
    assert.equal(e.api.measure().experiment, "off");
    e.root.clientWidth = 380;
    e.events.get("resize")();
    assert.equal(e.api.measure().experiment, "off");
    e.change({ automatic: true, floating: false });
    await tick();
    assert.equal(e.api.measure().experiment, "off");
    e.change({ automatic: true, floating: true });
    await tick();
    e.button().handlers.click();
    assert.equal(e.api.measure().experiment, "protected-media");
    e.button().handlers.click();
    e.root.clientWidth = 951;
    e.events.get("resize")();
    e.root.clientWidth = 382;
    e.events.get("resize")();
    assert.equal(e.api.measure().experiment, "off");
});

test("늦게 도착한 설정은 최신 저장 또는 명시적 수동 OFF를 덮지 않는다", async () => {
    const pending = [];
    const e = await environment({ getter: () => new Promise(resolve => pending.push(resolve)) });
    e.change({ automatic: false, floating: false });
    pending[0]({ preferences: { automatic: true, floating: true } });
    pending[1]({ preferences: { automatic: false, floating: false } });
    await tick();
    assert.equal(e.calls.length, 0);
    const f = await environment({ getter: () => new Promise(resolve => pending.push(resolve)) });
    f.api.apply("off");
    f.messageListeners[0]({ type: "duyo:poc", experiment: "off" });
    pending[2]({ preferences: { automatic: true, floating: true } });
    pending[3]({ preferences: { automatic: true, floating: true } });
    await tick();
    assert.equal(f.calls.length, 1);
    assert.equal(f.api.measure().experiment, "off");
});

test("알 수 없는 저장값은 자동 실행을 막고 실제 관측 폭만 확장 후보로 인정한다", async () => {
    const e = await environment({ saved: { automatic: "true", floating: true } });
    assert.equal(e.calls.length, 0);
    assert.equal(e.button(), undefined);
    const { expansionWidth } = e.context.__duyoSettings;
    assert.equal(expansionWidth(382, 466), 84);
    for (const width of [951, 466, 0, NaN, -1, 100]) assert.equal(expansionWidth(width, 466), 0);
});

test("오른쪽 중앙 버튼은 적용과 복구 사이에 고정되고 화살표만 바뀐다", async () => {
    const e = await environment({ saved: { automatic: false, floating: true } });
    const host = e.root.children.find(child => child.isConnected);
    assert.equal(host.style.left, "338px");
    assert.equal(host.style.top, "317px");
    assert.equal(e.button().textContent, "›");
    e.button().handlers.click();
    assert.equal(host.style.left, "338px");
    assert.equal(e.button().textContent, "‹");
    e.button().handlers.click();
    assert.equal(host.style.left, "338px");
    assert.equal(e.button().textContent, "›");
});

test("왼쪽 자세는 복구와 버튼 제거, 지원 복귀는 설정에 따른 재적용과 재표시를 수행한다", async () => {
    const e = await environment();
    e.context.screen.orientation.angle = 90;
    e.root.clientWidth = 594;
    e.events.get("orientation:change")();
    assert.equal(e.api.measure().experiment, "off");
    assert.equal(e.button(), undefined);
    e.context.screen.orientation.angle = 270;
    e.events.get("orientation:change")();
    assert.ok(e.button());
    assert.equal(e.api.measure().experiment, "protected-media");
    const host = e.root.children.find(child => child.isConnected);
    assert.equal(host.style.left, "550px");
    e.context.visualViewport.height = 300;
    e.context.visualViewport.offsetTop = 40;
    e.events.get("visual:resize")();
    assert.equal(host.style.top, "251px");
});

test("미지원 자세에서 설정을 바꿔도 확장하지 않고 지원 복귀 시 최신 설정을 따른다", async () => {
    const e = await environment();
    e.context.screen.orientation.angle = 90;
    e.root.clientWidth = 594;
    e.events.get("orientation:change")();
    assert.equal(e.api.measure().experiment, "off");
    assert.equal(e.button(), undefined);
    e.change({ automatic: false, floating: true });
    await tick();
    assert.equal(e.api.measure().experiment, "off");
    e.context.screen.orientation.angle = 270;
    e.events.get("orientation:change")();
    assert.ok(e.button());
    assert.equal(e.api.measure().experiment, "off");
    e.change({ automatic: true, floating: true });
    await tick();
    assert.equal(e.api.measure().experiment, "protected-media");
    assert.ok(e.keys.every(key => key === "preferences"));
});

test("수동 OFF는 왼쪽 미지원 자세 왕복으로 취소되지 않는다", async () => {
    const e = await environment();
    e.button().handlers.click();
    e.context.screen.orientation.angle = 90;
    e.root.clientWidth = 594;
    e.events.get("orientation:change")();
    assert.equal(e.button(), undefined);
    e.context.screen.orientation.angle = 270;
    e.events.get("orientation:change")();
    assert.ok(e.button());
    assert.equal(e.api.measure().experiment, "off");
});

test("저장한 Full Width는 자동 적용과 플로팅 버튼 재적용에 동일하게 사용한다", async () => {
    const e = await environment({ saved: { automatic: true, floating: true, mode: "full-width" } });
    assert.equal(e.api.measure().experiment, "full-width");
    e.button().handlers.click();
    assert.equal(e.api.measure().experiment, "off");
    e.button().handlers.click();
    assert.equal(e.api.measure().experiment, "full-width");
});
