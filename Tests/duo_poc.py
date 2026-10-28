#!/usr/bin/env python3
"""부팅된 Duo Safari에서 로컬 fixture를 실행한다. 픽셀과 터치는 별도 판독한다."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import plistlib
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts/duo"
MODES = ("measure", "document-width", "css-overflow", "scroll-lock", "protected-media", "media-only", "viewport-cover", "off")
SCREEN_MODE = "screen-change"

HTML = """<!doctype html><html lang="ko">
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DUYO 실제 Safari PoC</title>
<style>
:root {font:16px -apple-system;color-scheme:light}
body {margin:0;background:#fff} header {padding:8px;background:#eee}
article {padding:12px}
#media {height:120px;background:repeating-linear-gradient(90deg,#3467ab 0 20px,#edc95a 20px 40px)}
pre {font:12px monospace;white-space:pre-wrap} button {min-height:44px}
#fixed {position:fixed;right:env(safe-area-inset-right,0px);bottom:80px}
</style><body>
<header>DUYO Safari PoC · <span id="mode"></span> · <span>Document {{DOCUMENT}}</span></header>
<div id="media" data-duyo-poc-media></div>
<article id="text"><h2>본문 보호 검사</h2>
<p>줄무늬의 오른쪽 끝을 비교합니다. 본문은 조작 버튼에 가리면 안 됩니다.</p>
<button onclick="this.textContent='본문 탭 성공'">본문 버튼</button><pre id="result"></pre>
</article><button id="fixed" onclick="this.textContent='고정 탭 성공'">고정 버튼</button>
<script src="/poc.js"></script><script>
const mode = location.pathname.split('/').pop();
document.querySelector('#mode').textContent = mode;
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
const rect = node => {
    const r = node.getBoundingClientRect();
    return {x:r.x, y:r.y, width:r.width, height:r.height};
};
const send = report => fetch('/report', {method:'POST', body:JSON.stringify(report)});
setTimeout(() => {
    try {
        const baseline = {
            measure: __duyoPoc.measure(), style: document.documentElement.getAttribute('style'),
            meta: document.querySelector('meta[name=viewport]').content,
            bodyStyle: document.body.getAttribute('style'),
            text: rect(document.querySelector('#text')),
            fixed: rect(document.querySelector('#fixed'))
        };
        if (mode === 'screen-change') {
            __duyoPoc.apply('protected-media');
            const report = () => {
                const snapshot = {mode, measure:__duyoPoc.measure(),
                    body:rect(document.body), text:rect(document.querySelector('#text'))};
                document.querySelector('#result').textContent = JSON.stringify(snapshot.measure,null,2);
                send(snapshot);
            };
            window.addEventListener('resize', () => requestAnimationFrame(report));
            report();
            return;
        }
        if (mode === 'off') {
            __duyoPoc.apply('protected-media');
            __duyoPoc.apply('viewport-cover');
            __duyoPoc.apply('off');
        } else __duyoPoc.apply(mode);
        setTimeout(() => {
            window.scrollTo({left:80, top:0, behavior:'instant'});
            setTimeout(() => {
                const report = {
                    mode, baseline, measure:__duyoPoc.measure(), scrollX:window.scrollX,
                    style:document.documentElement.getAttribute('style'),
                    bodyStyle:document.body.getAttribute('style'),
                    fixed:rect(document.querySelector('#fixed')),
                    meta:document.querySelector('meta[name=viewport]').content,
                    text:rect(document.querySelector('#text')),
                    media:rect(document.querySelector('#media'))
                };
                document.querySelector('#result').textContent = JSON.stringify(report.measure,null,2);
                window.scrollTo({left:0, top:0, behavior:'instant'});
                send(report);
            }, 700);
        }, 700);
    } catch (error) {send({mode, error:error.message});}
}, 500);
</script></body></html>"""


def main():
    if sys.argv[1:] not in ([], ["--observe-screen"], ["--controls-only"]):
        raise ValueError("지원 옵션: --observe-screen / --controls-only")
    observe_screen = sys.argv[1:] == ["--observe-screen"]
    controls_only = sys.argv[1:] == ["--controls-only"]
    devices = json.loads(subprocess.check_output(["xcrun", "simctl", "list", "devices", "booted", "-j"]))
    requested = os.environ.get("SIMULATOR_UDID")
    booted = [device for runtime in devices["devices"].values() for device in runtime
              if device["state"] == "Booted" and "Duo" in device["name"]
              and (not requested or device["udid"] == requested)]
    if len(booted) != 1 or "Duo" not in booted[0]["name"]:
        raise RuntimeError("이 실험은 iPhone Duo 한 대만 부팅한 상태에서 실행하세요.")
    device = booted[0]["udid"]
    reports = {}
    screen_reports = []
    collecting = True
    page_sequence = 0
    ready = threading.Event()
    OUTPUT.mkdir(parents=True, exist_ok=True)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_GET(self):
            nonlocal page_sequence
            path = urlsplit(self.path).path
            if path == "/poc.js":
                body = (ROOT / "SafariWebExtension/poc.js").read_bytes()
                content_type = "application/javascript"
            elif path == "/controls" or (path.startswith("/run/") and path.split("/")[-1] in MODES + (SCREEN_MODE,)):
                page_sequence += 1
                html = HTML.replace("{{DOCUMENT}}", str(page_sequence))
                if path == "/controls":
                    # 확장 테스트 문서는 MAIN world 실험을 실행하지 않는다.
                    html = html.split('<script src="/poc.js">', 1)[0] + "</body></html>"
                body = html.encode()
                content_type = "text/html; charset=utf-8"
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            length = int(self.headers.get("Content-Length", "0"))
            if self.path != "/report" or not 0 < length <= 16384:
                self.send_error(400)
                return
            try:
                report = json.loads(self.rfile.read(length))
                if not isinstance(report, dict) or report.get("mode") not in MODES + (SCREEN_MODE,):
                    raise ValueError("허용되지 않은 보고서")
            except (ValueError, UnicodeError):
                self.send_error(400)
                return
            if not collecting:
                self.send_response(204)
                self.end_headers()
                return
            reports[report["mode"]] = report
            if report["mode"] == SCREEN_MODE:
                screen_reports.append(report)
                print("화면 관측:", json.dumps(report, ensure_ascii=False), flush=True)
            self.send_response(204)
            self.end_headers()
            ready.set()

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        if observe_screen:
            subprocess.run(["xcrun", "simctl", "openurl", device,
                            f"http://127.0.0.1:{server.server_port}/run/{SCREEN_MODE}"], check=True, timeout=30)
            print("90초 안에 Device Hub에서 외부/내부 화면을 전환하세요.", flush=True)
            deadline = time.monotonic() + 90
            report_count = 0
            settled_since = time.monotonic()
            while time.monotonic() < deadline:
                if len(screen_reports) != report_count:
                    report_count = len(screen_reports)
                    settled_since = time.monotonic()
                widths = {r["measure"]["layoutWidth"] for r in screen_reports if "measure" in r}
                if len(widths) > 1 and time.monotonic() - settled_since >= 5:
                    assert all(r["body"]["width"] <= r["measure"]["layoutWidth"] for r in screen_reports), "화면 전환 후 본문이 안전 폭을 넘었습니다."
                    assert screen_reports[-1]["measure"]["resizeEvents"] > 0, "resize 이벤트가 관측되지 않았습니다."
                    print("PASS: 실제 화면 전환의 뷰포트 폭 변화·resize·본문 폭 보호.", flush=True)
                    return
                time.sleep(0.2)
            raise RuntimeError("UNVERIFIED: 제한 시간 안에 실제 화면 폭 변화가 관측되지 않았습니다.")
        result_dir = Path(tempfile.mkdtemp(prefix="ui-", dir=OUTPUT))
        log_path = result_dir / "xcodebuild.log"
        build_args = [
            "xcodebuild", "-project", str(ROOT / "DUYO/DUYO.xcodeproj"),
            "-scheme", "DUYOUITests", "-destination", f"platform=iOS Simulator,id={device}",
            "-derivedDataPath", str(ROOT / "artifacts/DerivedData"),
            "CODE_SIGNING_ALLOWED=NO", "-parallel-testing-enabled", "NO"
        ]
        with log_path.open("w") as log:
            host_args = build_args.copy()
            host_args[host_args.index("DUYOUITests")] = "DUYO"
            result = subprocess.run(host_args + ["build"], stdout=log, stderr=subprocess.STDOUT, timeout=180)
            if result.returncode:
                raise RuntimeError(f"호스트 빌드 실패: {log_path}")
            result = subprocess.run(build_args + ["build-for-testing"], stdout=log, stderr=subprocess.STDOUT, timeout=180)
        if result.returncode:
            raise RuntimeError(f"테스트 빌드 실패: {log_path}")
        app = ROOT / "artifacts/DerivedData/Build/Products/Debug-iphonesimulator/DUYO.app"
        subprocess.run(["xcrun", "simctl", "install", device, str(app)], check=True, timeout=60)
        bundle_id = plistlib.loads((app / "Info.plist").read_bytes())["CFBundleIdentifier"]
        installed = Path(subprocess.check_output([
            "xcrun", "simctl", "get_app_container", device, bundle_id, "app"
        ], text=True).strip()) / "PlugIns/DUYO Extension.appex"
        resources = ROOT / "SafariWebExtension"
        for source in resources.rglob("*"):
            if source.is_file():
                relative = source.relative_to(resources)
                assert source.read_bytes() == (installed / relative).read_bytes(), f"설치 파일 불일치: {relative}"
        print("PASS: 설치된 확장 리소스가 현재 소스와 모두 일치합니다.", flush=True)
        subprocess.run(["xcrun", "simctl", "openurl", device,
                        f"http://127.0.0.1:{server.server_port}/controls"], check=True, timeout=30)
        if not controls_only:
            with log_path.open("a") as log:
                result = subprocess.run(build_args + [
                    "-only-testing:DUYOUITests/SafariUITests/testPrepareManualPoC",
                    "-resultBundlePath", str(result_dir / "prepare.xcresult"), "test-without-building"
                ], stdout=log, stderr=subprocess.STDOUT, timeout=180)
            if result.returncode:
                raise RuntimeError(f"수동 PoC 준비 실패: {log_path}")
            print("PASS: 자동/플로팅을 잠시 끄고 수동 실험을 분리합니다.", flush=True)
        for mode in (() if controls_only else MODES):
            ready.clear()
            subprocess.run(["xcrun", "simctl", "openurl", device,
                            f"http://127.0.0.1:{server.server_port}/run/{mode}"], check=True, timeout=30)
            if not ready.wait(25):
                raise RuntimeError(f"{mode}: 페이지 응답 시간 초과")
            assert "error" not in reports[mode], reports[mode]
            time.sleep(2)
            subprocess.run(["xcrun", "simctl", "io", device, "screenshot", str(OUTPUT / f"{mode}.png")],
                           check=True, timeout=25, capture_output=True)
            print(mode, json.dumps(reports[mode]["measure"]), flush=True)
        if not controls_only:
            media = reports["media-only"]
            assert media["text"]["width"] == media["baseline"]["text"]["width"]
            off = reports["off"]
            assert off["style"] == off["baseline"]["style"]
            assert off["bodyStyle"] == off["baseline"]["bodyStyle"]
            assert off["meta"] == off["baseline"]["meta"]
            assert reports["scroll-lock"]["scrollX"] == 0, "가로 이동 억제가 적용되지 않았습니다."
            protected = reports["protected-media"]
            for key in ("x", "width"):
                assert protected["text"][key] == protected["baseline"]["text"][key], "본문 가로 위치/폭이 바뀌었습니다."
            assert protected["fixed"] == protected["baseline"]["fixed"], "고정 버튼 위치/크기가 바뀌었습니다."
            assert protected["media"]["width"] == protected["baseline"]["measure"]["layoutWidth"] + 80
            assert protected["scrollX"] == 0
        # 팝업의 재로딩 검사가 최초 실험의 기준 데이터를 덮지 않게 한다.
        collecting = False
        if not controls_only:
            print("PASS: Duo Safari 응답·본문 폭 보존·OFF 속성 복구. 픽셀/터치는 별도 캡처 판독 필요.")
            print("CSS clip 뒤 프로그램 스크롤:", reports["css-overflow"]["scrollX"])
        cases = ["testGlobalControlsSurviveReload", "testZZEnableAutomaticControls"] if controls_only else [
            "testGlobalControlsSurviveReload", "testPopupExecutesManualExperiment",
            "testViewportRotation", "testZZEnableAutomaticControls"
        ]
        selection = [f"-only-testing:DUYOUITests/SafariUITests/{case}" for case in cases]
        if not controls_only:
            subprocess.run(["xcrun", "simctl", "openurl", device,
                            f"http://127.0.0.1:{server.server_port}/controls"], check=True, timeout=30)
        with log_path.open("a") as log:
            result = subprocess.run(build_args + selection + [
                "-skip-testing:DUYOUITests/SafariUITests/testPrepareManualPoC",
                "-resultBundlePath", str(result_dir / "result.xcresult"), "test-without-building"
            ], stdout=log, stderr=subprocess.STDOUT, timeout=480)
        if result.returncode:
            print("\n".join(log_path.read_text().splitlines()[-50:]), file=sys.stderr)
            raise RuntimeError(f"Safari 확장 통합 테스트 실패: {log_path}")
        for line in log_path.read_text().splitlines():
            if "Test skipped - UNVERIFIED:" in line:
                print("UNVERIFIED:" + line.split("Test skipped - UNVERIFIED:", 1)[1])
        print(f"PASS: 실제 Safari 팝업·복구·자동/플로팅 제어. 증거: {result_dir}")
    finally:
        output = {"device": booted[0], "reports": reports, "screenReports": screen_reports}
        report_name = "screen-report.json" if observe_screen else "controls-report.json" if controls_only else "report.json"
        (OUTPUT / report_name).write_text(json.dumps(output, ensure_ascii=False, indent=2))
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, AssertionError, subprocess.SubprocessError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        print(f"Safari가 DUYO에 접근을 허용했는지 확인하세요. 실행 로그: {OUTPUT}/ui-*/xcodebuild.log", file=sys.stderr)
        sys.exit(1)
