"use strict";
const result = document.querySelector("#result");
const show = value => { result.textContent = JSON.stringify(value, null, 2); };
document.querySelector("#run").addEventListener("click", () => {
    show(globalThis.__duyoPoc.apply(document.querySelector("#experiment").value));
});
document.querySelector("#snapshot").addEventListener("click", () => show(globalThis.__duyoPoc.measure()));
let taps = 0;
document.querySelector("#tap").addEventListener("click", event => { event.target.textContent = `탭 횟수: ${++taps}`; });
document.querySelector("#fixed").addEventListener("click", event => { event.target.textContent = "고정 버튼 탭 성공"; });
show(globalThis.__duyoPoc.measure());
