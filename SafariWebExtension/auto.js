(function () {
    "use strict";
    if (globalThis.__duyoAuto) return;
    globalThis.__duyoAuto = true;
    const api = globalThis.__duyoPoc;
    const { read, expansionWidth, expansionEdge, screenWidth } = globalThis.__duyoSettings;
    const key = "preferences";
    let preferences = null;
    let host = null;
    let button = null;
    let revision = 0;
    let controlledAutomatically = false;
    let manuallyRestored = false;
    let lastWidth = null;

    const angle = () => screen.orientation?.angle ?? globalThis.orientation ?? 0;
    const edge = () => expansionEdge(angle());
    const availableWidth = () => expansionWidth(document.documentElement.clientWidth, screenWidth(screen.width, screen.height, angle()));

    function render() {
        if (!preferences?.floating || availableWidth() === 0 || edge() === "left") {
            host?.remove();
            host = button = null;
            return;
        }
        if (!host?.isConnected) {
            host = document.createElement("div");
            host.style.cssText = "all:initial!important;display:block!important;position:fixed!important;width:44px!important;height:44px!important;z-index:2147483647!important;";
            const shadow = host.attachShadow({ mode: "closed" });
            const style = document.createElement("style");
            style.textContent = `
                :host{color-scheme:light dark}
                button{box-sizing:border-box;display:grid;place-items:center;width:44px;height:44px;
                    padding:0;border:1px solid rgb(255 255 255 / .3);border-radius:50%;
                    background:rgb(28 28 30 / .52);color:white;font:300 32px/1 -apple-system,sans-serif;
                    box-shadow:0 2px 10px rgb(0 0 0 / .16);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);
                    opacity:.18;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
                button:active{opacity:.85;background:rgb(28 28 30 / .76)}
                button:focus-visible{opacity:1;outline:3px solid #0a84ff;outline-offset:3px}
                @media(prefers-reduced-transparency:reduce){button{opacity:1;background:#303033;-webkit-backdrop-filter:none;backdrop-filter:none}}
                @media(prefers-contrast:more){button{opacity:1}}
                @media(forced-colors:active){button{opacity:1;background:ButtonFace;color:ButtonText;border-color:ButtonText}}
            `;
            button = document.createElement("button");
            button.type = "button";
            button.addEventListener("click", () => {
                try {
                    const width = availableWidth();
                    controlledAutomatically = false;
                    manuallyRestored = api.measure().experiment !== "off";
                    api.apply(width > 0 && api.measure().experiment === "off" ? preferences.mode : "off", width, edge());
                    render();
                } catch {
                    button.textContent = "!";
                    button.setAttribute("aria-label", "DUYO could not apply this page. Retry.");
                }
            });
            shadow.append(style, button);
            document.documentElement.append(host);
        }
        const active = api.measure().experiment !== "off";
        const viewport = globalThis.visualViewport;
        // Safari는 확장 배경 영역의 버튼 입력을 차단하므로 터치 가능한 문서 끝까지만 이동한다.
        const x = document.documentElement.clientWidth - 44;
        const displayHeight = Math.abs(angle() % 180) === 90 ? Math.min(screen.width, screen.height) : screen.height;
        const visibleHeight = viewport?.height ?? globalThis.innerHeight;
        const y = (viewport?.offsetTop ?? 0) + Math.max(8, Math.min((displayHeight ?? visibleHeight) / 2 - 22, visibleHeight - 52));
        host.style.setProperty("left", `${x}px`, "important");
        host.style.setProperty("top", `${y}px`, "important");
        button.textContent = active ? "‹" : "›";
        button.title = active ? "Restore page" : "Expand page";
        button.setAttribute("aria-label", active ? "Restore page with DUYO" : "Apply DUYO");
        button.setAttribute("aria-pressed", String(active));
    }

    function updateLayout() {
        if (!preferences) return;
        const width = availableWidth();
        lastWidth = width;
        if (width === 0) {
            api.apply("off");
            controlledAutomatically = false;
        } else if (edge() === "left") {
            api.apply("off");
            controlledAutomatically = false;
        } else if (preferences.automatic && !manuallyRestored) {
            api.apply(preferences.mode, width, edge());
            controlledAutomatically = true;
        } else if (controlledAutomatically) {
            api.apply("off");
            controlledAutomatically = false;
        }
        render();
    }

    async function refresh(shouldApply = true) {
        const current = ++revision;
        try {
            const values = await browser.storage.local.get(key);
            if (current !== revision) return;
            preferences = read(values[key]);
            if (shouldApply) updateLayout();
            else render();
        } catch {
            console.warn("DUYO could not load or apply local preferences.");
            render();
        }
    }

    browser.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && Object.hasOwn(changes, key)) void refresh();
    });
    browser.runtime.onMessage.addListener(message => {
        if (message?.type !== "duyo:poc") return;
        if (message.experiment !== "snapshot") {
            controlledAutomatically = false;
            manuallyRestored = api.measure().experiment === "off";
        }
        void refresh(false);
    });
    globalThis.addEventListener("resize", () => {
        if (availableWidth() !== lastWidth) updateLayout();
    });
    screen.orientation?.addEventListener("change", updateLayout);
    globalThis.addEventListener("orientationchange", updateLayout);
    globalThis.visualViewport?.addEventListener("resize", render);
    globalThis.visualViewport?.addEventListener("scroll", render);
    void refresh();
})();
