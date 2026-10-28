"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const source = readFileSync("SafariWebExtension/poc.js", "utf8");

// 렌더러가 아닌 DOM 복구/메시지 동작 모형이다. CSS geometry 성공을 주장하지 않는다.
function environment(hasMeta = true) {
    const listeners = new Set();
    function node() {
        const attributes = new Map();
        const properties = new Map();
        const priorities = new Map();
        return {
            clientWidth: 382, scrollWidth: 382,
            getBoundingClientRect: () => ({ width: 366 }),
            style: {
                setProperty(name, value, priority = "") { properties.set(name, value); priorities.set(name, priority); attributes.set("style", "changed"); },
                getPropertyValue(name) { return properties.get(name) ?? ""; },
                getPropertyPriority(name) { return priorities.get(name) ?? ""; },
                removeProperty(name) { properties.delete(name); priorities.delete(name); if (!properties.size) attributes.set("style", ""); }
            },
            hasAttribute: name => attributes.has(name),
            getAttribute: name => attributes.get(name) ?? null,
            setAttribute: (name, value) => attributes.set(name, value),
            removeAttribute: name => attributes.delete(name),
            remove() { this.removed = true; }
        };
    }
    const root = node(), body = node(), media = node();
    let meta = hasMeta ? node() : null;
    if (meta) meta.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=contain");
    const events = new Map();
    const context = vm.createContext({
        document: {
            documentElement: root, body,
            querySelector: () => meta?.removed ? null : meta,
            querySelectorAll: selector => selector === "section" ? [] : [media],
            createElement: node,
            head: { append(value) { meta = value; } }
        },
        getComputedStyle: () => ({ marginLeft: "8px", marginRight: "8px" }),
        innerWidth: 382, screen: { width: 466 }, navigator: {},
        scrollX: 0, scrollY: 0,
        scrollTo(options) { context.scrollX = options.left; context.scrollY = options.top; },
        addEventListener: (name, fn) => { listeners.add(fn); events.set(name, fn); },
        removeEventListener: (name, fn) => listeners.delete(fn),
        visualViewport: { width: 382, scale: 1, offsetLeft: 0,
            addEventListener: (name, fn) => listeners.add(fn),
            removeEventListener: (name, fn) => listeners.delete(fn) },
        browser: { runtime: { onMessage: { addListener(fn) { context.message = fn; } } } }
    });
    vm.runInContext(source, context);
    return { api: context.__duyoPoc, context, root, body, media, listeners, events, meta: () => meta };
}

test("잘못된 실험은 적용된 상태를 훼손하지 않고 거부한다", () => {
    const e = environment();
    e.api.apply("document-width");
    for (const value of [-1, 257, NaN, Infinity, "80", 1.2]) {
        assert.throws(() => e.api.apply("off", value));
    }
    assert.throws(() => e.api.apply("unknown"));
    assert.equal(e.root.style.getPropertyValue("width"), "462px");
});

test("OFF는 기존 값·우선순위와 원래 없던 style을 복구한다", () => {
    const e = environment();
    e.root.style.setProperty("width", "90%", "important");
    e.api.apply("css-overflow");
    assert.equal(e.root.style.getPropertyValue("width"), "462px");
    assert.equal(e.body.style.getPropertyValue("overflow-x"), "clip");
    e.api.apply("off");
    assert.equal(e.root.style.getPropertyValue("width"), "90%");
    assert.equal(e.root.style.getPropertyPriority("width"), "important");
    assert.equal(e.body.hasAttribute("style"), false);
    assert.equal(e.listeners.size, 0);
    e.api.apply("off");
});

test("페이지가 실험 후 바꾼 스타일을 OFF가 덮지 않는다", () => {
    const e = environment();
    e.api.apply("document-width");
    e.root.style.setProperty("width", "70%", "important");
    e.api.apply("off");
    assert.equal(e.root.style.getPropertyValue("width"), "70%");
});

test("viewport 기존 내용과 없던 노드를 각각 복구한다", () => {
    for (const hasMeta of [true, false]) {
        const e = environment(hasMeta);
        const before = e.meta()?.getAttribute("content");
        e.api.apply("viewport-cover");
        assert.match(e.meta().getAttribute("content"), /viewport-fit=cover/);
        assert.doesNotMatch(e.meta().getAttribute("content"), /viewport-fit=contain/);
        e.api.apply("off");
        if (hasMeta) assert.equal(e.meta().getAttribute("content"), before);
        else assert.equal(e.meta().removed, true);
    }
});

test("페이지가 바꾼 viewport와 content 없는 viewport를 보존한다", () => {
    const e = environment();
    e.meta().removeAttribute("content");
    e.api.apply("viewport-cover");
    e.api.apply("off");
    assert.equal(e.meta().getAttribute("content"), null);
    e.api.apply("viewport-cover");
    e.meta().setAttribute("content", "width=500");
    e.api.apply("off");
    assert.equal(e.meta().getAttribute("content"), "width=500");
});

test("이미지 실험은 본문 root 폭을 변경하지 않고 반복 적용이 누적되지 않는다", () => {
    const e = environment();
    e.api.apply("media-only", 30);
    assert.equal(e.root.hasAttribute("style"), false);
    assert.equal(e.media.style.getPropertyValue("width"), "calc(100% + 30px)");
    e.api.apply("media-only", 50);
    assert.equal(e.media.style.getPropertyValue("width"), "calc(100% + 50px)");
    e.api.apply("off");
    assert.equal(e.media.hasAttribute("style"), false);
});

test("화면 변화는 관찰만 하고 확대 상태를 접힘으로 판단하지 않는다", () => {
    const e = environment();
    e.api.apply("document-width");
    e.context.visualViewport.scale = 2;
    e.context.visualViewport.width = 191;
    for (const fn of e.listeners) fn();
    assert.equal(e.api.measure().resizeEvents, 1);
    assert.equal(e.api.measure().scale, 2);
    assert.equal(e.api.measure().posture, null);
    e.api.apply("off");
    assert.equal(e.listeners.size, 0);
});

test("중복 주입은 기존 인스턴스와 메시지 처리를 유지한다", async () => {
    const e = environment();
    vm.runInContext(source, e.context);
    assert.equal(e.context.__duyoPoc, e.api);
    assert.equal((await e.context.message({ type: "duyo:poc", experiment: "off" })).ok, true);
    assert.equal((await e.context.message({ type: "duyo:poc", experiment: "invalid" })).ok, false);
    assert.equal(e.context.message({ type: "other" }), undefined);
});

test("실험 도중 오류가 나면 앞서 적용한 CSS를 복구한다", () => {
    const e = environment();
    e.body.style.setProperty = () => { throw new Error("실험 중단"); };
    assert.throws(() => e.api.apply("css-overflow"), /실험 중단/);
    assert.equal(e.root.hasAttribute("style"), false);
    assert.equal(e.listeners.size, 0);
});

test("가로 이동 억제는 세로 위치와 핀치 확대를 보존하고 OFF에서 해제된다", () => {
    const e = environment();
    e.api.apply("scroll-lock");
    e.context.scrollX = 80;
    e.context.scrollY = 500;
    e.events.get("scroll")();
    assert.equal(e.context.scrollX, 0);
    assert.equal(e.context.scrollY, 500);
    e.context.visualViewport.scale = 2;
    e.context.scrollX = 80;
    e.events.get("scroll")();
    assert.equal(e.context.scrollX, 80);
    e.api.apply("off");
    assert.equal(e.listeners.size, 0);
});

test("가로 이동 억제 OFF는 적용 전 가로 위치를 복구한다", () => {
    const e = environment();
    e.context.scrollX = 30;
    e.context.scrollY = 200;
    e.api.apply("scroll-lock");
    assert.equal(e.context.scrollX, 0);
    e.api.apply("off");
    assert.equal(e.context.scrollX, 30);
    assert.equal(e.context.scrollY, 200);
});

test("확대 상태의 재적용은 줄어든 시각 폭으로 문서를 축소하지 않는다", () => {
    const e = environment();
    e.context.innerWidth = 254;
    e.context.visualViewport.scale = 1.5;
    for (const mode of ["document-width", "css-overflow", "scroll-lock"]) {
        e.api.apply(mode);
        assert.equal(e.root.style.getPropertyValue("width"), "462px");
    }
});


test("본문 보호는 원래 폭·여백을 고정하고 OFF에서 기존 스타일로 복구한다", () => {
    const e = environment();
    e.body.style.setProperty("width", "auto");
    e.api.apply("protected-media");
    assert.equal(e.body.style.getPropertyValue("width"), "366px");
    assert.equal(e.body.style.getPropertyValue("margin-left"), "8px");
    assert.equal(e.body.style.getPropertyValue("margin-right"), "8px");
    assert.equal(e.body.style.getPropertyValue("overflow-x"), "");
    assert.equal(e.media.style.getPropertyValue("width"), "calc(100% + 80px)");
    e.context.scrollX = 80;
    e.events.get("scroll")();
    assert.equal(e.context.scrollX, 0);
    e.api.apply("off");
    assert.equal(e.body.style.getPropertyValue("width"), "auto");
    assert.equal(e.body.style.getPropertyValue("box-sizing"), "");
    assert.equal(e.root.hasAttribute("style"), false);
    assert.equal(e.media.hasAttribute("style"), false);
    assert.equal(e.listeners.size, 0);
});

test("화면 폭이 바뀌면 본문 보호를 새 레이아웃에 맞추고 확대만으로는 재적용하지 않는다", () => {
    const e = environment();
    e.body.getBoundingClientRect = () => ({
        width: Number.parseFloat(e.body.style.getPropertyValue("width")) || e.root.clientWidth - 16
    });
    e.api.apply("protected-media");
    e.root.clientWidth = 600;
    e.events.get("resize")();
    assert.equal(e.root.style.getPropertyValue("width"), "680px");
    assert.equal(e.body.style.getPropertyValue("width"), "584px");
    assert.ok(e.api.measure().resizeEvents > 0);
    e.context.innerWidth = 300;
    e.context.visualViewport.scale = 2;
    e.events.get("resize")();
    assert.equal(e.root.style.getPropertyValue("width"), "680px");
    e.api.apply("off");
    assert.equal(e.body.hasAttribute("style"), false);
    assert.equal(e.listeners.size, 0);
});

test("실패한 왼쪽 확장은 성공으로 보고하지 않고 기존 실험도 복구한다", () => {
    const e = environment();
    e.api.apply("protected-media", 84, "right");
    assert.throws(() => e.api.apply("protected-media", 84, "left"), /not available/);
    assert.equal(e.api.measure().experiment, "off");
    assert.equal(e.root.style.getPropertyValue("width"), "");
    assert.equal(e.body.style.getPropertyValue("width"), "");
    assert.equal(e.media.style.getPropertyValue("width"), "");
    for (const mode of ["document-width", "css-overflow", "scroll-lock", "media-only", "viewport-cover"]) {
        assert.throws(() => e.api.apply(mode, 84, "left"), /not available/);
        assert.equal(e.root.style.getPropertyValue("width"), "");
    }
});

test("팝업의 왼쪽 확장 요청도 미지원 오류를 반환한다", () => {
    const e = environment();
    e.context.__duyoSettings = { expansionEdge: () => "left" };
    assert.throws(() => e.api.apply("protected-media", 84), /not available/);
    assert.equal(e.api.measure().experiment, "off");
});

test("전체 폭 섹션 배경은 확장하고 본문 자식 폭과 가로 위치는 보존·복구한다", () => {
    const e = environment();
    const section = e.media;
    const child = e.body;
    section.children = [child];
    section.getBoundingClientRect = () => ({ left: 0, width: 382 });
    child.getBoundingClientRect = () => ({ left: section.style.getPropertyValue("width") ? 50 : 10, width: 300 });
    e.context.getComputedStyle = () => ({ position: "static", transform: "none", marginLeft: "0px", marginRight: "0px", left: "auto" });
    e.context.document.querySelectorAll = selector => selector === "section" ? [section] : [];
    e.api.apply("protected-media", 84);
    assert.equal(section.style.getPropertyValue("width"), "466px");
    assert.equal(child.style.getPropertyValue("width"), "300px");
    assert.equal(child.style.getPropertyValue("left"), "-40px");
    assert.equal(child.style.getPropertyValue("overflow-x"), "visible");
    e.api.apply("off");
    assert.equal(section.style.getPropertyValue("width"), "");
    assert.equal(child.style.getPropertyValue("left"), "");
    assert.equal(child.style.getPropertyValue("overflow-x"), "");
});

test("Full Width는 본문 폭까지 늘리고 OFF에서 원래 스타일로 복구한다", () => {
    const e = environment();
    e.api.apply("full-width", 84);
    assert.equal(e.root.style.getPropertyValue("width"), "466px");
    assert.equal(e.body.style.getPropertyValue("width"), "466px");
    e.api.apply("off");
    assert.equal(e.root.style.getPropertyValue("width"), "");
    assert.equal(e.body.style.getPropertyValue("width"), "");
    assert.throws(() => e.api.apply("full-width", 84, "left"), /not available/);
});

test("Full Width 반복 적용은 너비를 누적하지 않고 viewport와 스타일을 매번 원복한다", () => {
    const e = environment();
    const original = e.meta().getAttribute("content");
    for (let cycle = 0; cycle < 6; cycle++) {
        e.api.apply("full-width", 84);
        assert.match(e.meta().getAttribute("content"), /shrink-to-fit=no/);
        assert.doesNotMatch(e.meta().getAttribute("content"), /maximum-scale|minimum-scale|user-scalable/);
        e.root.clientWidth = 466;
        e.api.apply("full-width", 84);
        assert.equal(e.body.style.getPropertyValue("width"), "466px");
        e.api.apply("off");
        assert.equal(e.meta().getAttribute("content"), original);
        assert.equal(e.body.style.getPropertyValue("width"), "");
        assert.equal(e.root.style.getPropertyValue("width"), "");
        e.root.clientWidth = 382;
    }
});
