/* DUYO 실험 코드. Safari 시스템 UI 뒤 확장을 보장하지 않는다. */
(function () {
    "use strict";
    if (globalThis.__duyoPoc) return;

    const experiments = ["measure", "full-width", "document-width", "css-overflow", "scroll-lock", "protected-media", "media-only", "viewport-cover", "off"];
    let undo = [];
    let stop = () => {};
    let changes = 0;
    let activeExperiment = "off";
    let expandedSectionCount = 0;
    let fullRequest = null;

    function measure() {
        const root = document.documentElement;
        const viewport = globalThis.visualViewport;
        return {
            experiment: activeExperiment,
            bodyWidth: document.body?.getBoundingClientRect().width ?? null,
            expandedSectionCount,
            layoutWidth: root.clientWidth,
            innerWidth: globalThis.innerWidth,
            scrollWidth: root.scrollWidth,
            screenWidth: globalThis.screen.width,
            screenHeight: globalThis.screen.height,
            orientationAngle: globalThis.screen.orientation?.angle ?? globalThis.orientation ?? 0,
            scrollX: globalThis.scrollX ?? 0,
            scrollY: globalThis.scrollY ?? 0,
            visualWidth: viewport?.width ?? null,
            visualOffsetLeft: viewport?.offsetLeft ?? null,
            scale: viewport?.scale ?? null,
            posture: globalThis.navigator.devicePosture?.type ?? null,
            viewportSegments: globalThis.viewport?.segments?.map(segment => ({
                x: segment.x, y: segment.y, width: segment.width, height: segment.height
            })) ?? null,
            resizeEvents: changes,
            hasHorizontalOverflow: root.scrollWidth > root.clientWidth + 1
        };
    }

    function property(node, name, value) {
        const hadStyle = node.hasAttribute("style");
        const before = node.style.getPropertyValue(name);
        const priority = node.style.getPropertyPriority(name);
        node.style.setProperty(name, value, "important");
        const applied = node.style.getPropertyValue(name);
        undo.push(() => {
            if (node.style.getPropertyValue(name) !== applied || node.style.getPropertyPriority(name) !== "important") return;
            if (before) node.style.setProperty(name, before, priority);
            else node.style.removeProperty(name);
            if (!hadStyle && node.getAttribute("style") === "") node.removeAttribute("style");
        });
    }

    function viewportOption(key, value) {
        let meta = document.querySelector('meta[name="viewport" i]');
        const created = !meta;
        if (created) {
            meta = document.createElement("meta");
            meta.name = "viewport";
            document.head.append(meta);
        }
        const before = meta.getAttribute("content");
        const parts = (before ?? "width=device-width, initial-scale=1").split(",")
            .filter(part => part.split("=")[0].trim().toLowerCase() !== key);
        const applied = [...parts, `${key}=${value}`].join(",");
        meta.setAttribute("content", applied);
        undo.push(() => {
            if (meta.getAttribute("content") !== applied) return;
            if (created) meta.remove();
            else if (before === null) meta.removeAttribute("content");
            else meta.setAttribute("content", before);
        });
    }

    function off() {
        stop();
        stop = () => {};
        undo.reverse().forEach(restore => restore());
        undo = [];
        activeExperiment = "off";
        expandedSectionCount = 0;
        fullRequest = null;
    }

    function apply(experiment, extraWidth = 80,
        edge = globalThis.__duyoSettings?.expansionEdge(globalThis.screen.orientation?.angle ?? globalThis.orientation ?? 0) ?? "right") {
        if (!experiments.includes(experiment) || !Number.isInteger(extraWidth) || extraWidth < 0 || extraWidth > 256 || !["left", "right"].includes(edge)) {
            throw new TypeError("Choose a supported experiment and an integer width from 0 to 256.");
        }
        const request = `${extraWidth}:${edge}:${globalThis.screen.orientation?.angle ?? globalThis.orientation ?? 0}`;
        if (experiment === "full-width" && activeExperiment === experiment && fullRequest === request) return measure();
        off();
        changes = 0;
        if (edge === "left" && !["off", "measure"].includes(experiment)) {
            throw new Error("Left-edge expansion is not available in this build.");
        }
        if (experiment === "off" || experiment === "measure") return measure();
        try {
            const root = document.documentElement;
            const layoutWidth = root.clientWidth;
            const locksScroll = ["full-width", "scroll-lock", "protected-media"].includes(experiment);
            // 본문 흐름은 보존하고 뷰포트 전체 폭의 섹션 배경만 확장한다.
            const sections = experiment === "protected-media"
                ? [...document.querySelectorAll("section")].flatMap(node => {
                    const rect = node.getBoundingClientRect();
                    if (Math.abs(rect.left) > 1 || Math.abs(rect.width - layoutWidth) > 1) return [];
                    const style = getComputedStyle(node);
                    if (["fixed", "sticky"].includes(style.position) || style.transform !== "none") return [];
                    return [{ node, width: rect.width, children: [...node.children].flatMap(child => {
                        const childStyle = getComputedStyle(child);
                        if (["absolute", "fixed", "sticky"].includes(childStyle.position)) return [];
                        const bounds = child.getBoundingClientRect();
                        return [{ child, left: bounds.left, width: bounds.width }];
                    }) }];
                }) : [];

            if (experiment === "protected-media" && document.body) {
                const body = document.body;
                const width = body.getBoundingClientRect().width;
                const style = getComputedStyle(body);
                const margins = [style.marginLeft, style.marginRight];
                property(body, "box-sizing", "border-box");
                property(body, "width", `${width}px`);
                property(body, "margin-left", margins[0]);
                property(body, "margin-right", margins[1]);
                if (sections.length) property(body, "overflow-x", "visible");
            }
            const originalScrollX = globalThis.scrollX;
            if (locksScroll && originalScrollX !== 0) {
                undo.push(() => {
                    if (globalThis.scrollX === 0) globalThis.scrollTo({ left: originalScrollX, top: globalThis.scrollY, behavior: "instant" });
                });
            }
            if (experiment === "full-width") viewportOption("shrink-to-fit", "no");
            if (experiment === "full-width" && document.body) {
                property(document.body, "box-sizing", "border-box");
                property(document.body, "width", `${layoutWidth + extraWidth}px`);
                property(document.body, "max-width", "none");
            }
            if (["full-width", "document-width", "css-overflow", "scroll-lock", "protected-media"].includes(experiment)) {
                // Safari 확대 중 innerWidth는 시각 폭으로 바뀌므로 레이아웃 폭을 사용한다.
                property(root, "width", `${layoutWidth + extraWidth}px`);
            }
            if (experiment === "css-overflow" || locksScroll) {
                property(root, "overflow-x", "clip");
                if (document.body && experiment !== "protected-media") property(document.body, "overflow-x", "clip");
            }
            const keepHorizontalOrigin = () => {
                if ((globalThis.visualViewport?.scale ?? 1) === 1 && globalThis.scrollX !== 0) {
                    globalThis.scrollTo({ left: 0, top: globalThis.scrollY, behavior: "instant" });
                }
            };
            if (locksScroll) {
                globalThis.addEventListener("scroll", keepHorizontalOrigin, { passive: true });
                globalThis.visualViewport?.addEventListener("resize", keepHorizontalOrigin);
                keepHorizontalOrigin();
            }
            if (experiment === "media-only" || experiment === "protected-media") {
                // shortcut: 실험 fixture의 표식만 변경. 임의 사이트 확장은 실기기 PoC 후 설계한다.
                document.querySelectorAll("[data-duyo-poc-media]").forEach(node => {
                    property(node, "max-width", "none");
                    property(node, "width", `calc(100% + ${extraWidth}px)`);
                });
            }
            for (const section of sections) {
                for (const item of section.children) {
                    property(item.child, "box-sizing", "border-box");
                    property(item.child, "width", `${item.width}px`);
                    property(item.child, "max-width", "none");
                    property(item.child, "flex-shrink", "0");
                }
                property(section.node, "box-sizing", "border-box");
                property(section.node, "width", `${section.width + extraWidth}px`);
                property(section.node, "max-width", "none");
                for (const item of section.children) {
                    const delta = item.left - item.child.getBoundingClientRect().left;
                    if (Math.abs(delta) > .5) {
                        const left = parseFloat(getComputedStyle(item.child).left) || 0;
                        property(item.child, "position", "relative");
                        property(item.child, "left", `${left + delta}px`);
                    }
                }
            }
            expandedSectionCount = sections.length;
            if (experiment === "viewport-cover") viewportOption("viewport-fit", "cover");
            const resized = () => {
                const count = changes + 1;
                if (experiment === "protected-media" && root.clientWidth !== layoutWidth) {
                    apply(experiment, extraWidth, edge);
                }
                changes = count;
            };
            globalThis.addEventListener("resize", resized);
            globalThis.visualViewport?.addEventListener("resize", resized);
            globalThis.navigator.devicePosture?.addEventListener("change", resized);
            stop = () => {
                globalThis.removeEventListener("resize", resized);
                globalThis.visualViewport?.removeEventListener("resize", resized);
                globalThis.navigator.devicePosture?.removeEventListener("change", resized);
                globalThis.removeEventListener("scroll", keepHorizontalOrigin);
                globalThis.visualViewport?.removeEventListener("resize", keepHorizontalOrigin);
            };
            activeExperiment = experiment;
            if (experiment === "full-width") fullRequest = request;
            return measure();
        } catch (error) {
            off();
            throw error;
        }
    }

    globalThis.__duyoPoc = { apply, measure };
    if (typeof browser !== "undefined" && browser.runtime?.onMessage) {
        browser.runtime.onMessage.addListener(message => {
            if (message?.type !== "duyo:poc") return;
            try {
                const result = message.experiment === "snapshot" ? measure() : apply(message.experiment, message.extraWidth);
                return Promise.resolve({ ok: true, result });
            } catch (error) {
                return Promise.resolve({ ok: false, error: error.message });
            }
        });
    }
})();
