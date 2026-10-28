(function () {
    "use strict";
    if (globalThis.__duyoSettings) return;
    function read(value) {
        if (value === undefined) return { automatic: true, floating: true, mode: "protected-media" };
        if (!value || typeof value.automatic !== "boolean" || typeof value.floating !== "boolean") {
            return { automatic: false, floating: false, mode: "protected-media" };
        }
        return { automatic: value.automatic, floating: value.floating,
            mode: value.mode === "full-width" ? "full-width" : "protected-media" };
    }
    function expansionWidth(layoutWidth, screenWidth) {
        const gap = screenWidth - layoutWidth;
        return Number.isFinite(layoutWidth) && layoutWidth > 0 && Number.isFinite(screenWidth)
            && gap > 0 && gap <= 256 ? Math.floor(gap) : 0;
    }
    function expansionEdge(angle) {
        const normalized = ((angle % 360) + 360) % 360;
        return normalized === 90 || normalized === 180 ? "left" : "right";
    }
    function screenWidth(width, height, angle) {
        return Math.abs(angle % 180) === 90 && Number.isFinite(height) ? Math.max(width, height) : width;
    }
    globalThis.__duyoSettings = { read, expansionWidth, expansionEdge, screenWidth };
})();
