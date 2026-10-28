#!/usr/bin/env python3
"""실제 macOS Safari DOM 실험. iPhone Duo 렌더링이나 확장 주입 검증을 대신하지 않는다."""
import base64
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import socket
import subprocess
import sys
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts/safari"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    with socket.socket() as reservation:
        reservation.bind(("127.0.0.1", 0))
        driver_port = reservation.getsockname()[1]
    report = {"platform": "macOS Safari DOM; Duo 실제 렌더링/확장 주입 아님", "status": "BLOCKED"}
    session = None
    driver = None

    def request(method, path, data=None):
        body = None if data is None else json.dumps(data).encode()
        req = Request(f"http://127.0.0.1:{driver_port}{path}", data=body, method=method,
                      headers={"Content-Type": "application/json"})
        with urlopen(req, timeout=25) as response:
            return json.load(response)["value"]

    def execute(script):
        return request("POST", f"/session/{session}/execute/sync", {"script": script, "args": []})

    def screenshot(name):
        encoded = request("GET", f"/session/{session}/screenshot")
        (OUTPUT / f"{name}.png").write_bytes(base64.b64decode(encoded))

    try:
        with (OUTPUT / "driver.log").open("w") as log:
            driver = subprocess.Popen(["safaridriver", "--port", str(driver_port)], stdout=log, stderr=log)
        for _ in range(30):
            try:
                request("GET", "/status")
                break
            except (URLError, ConnectionError):
                if driver.poll() is not None:
                    raise RuntimeError("safaridriver가 시작되지 않았습니다. driver.log 확인")
                time.sleep(0.1)
        response = request("POST", "/session", {"capabilities": {"alwaysMatch": {"browserName": "safari"}}})
        session = response["sessionId"]
        report["browser"] = response.get("capabilities", {})
        request("POST", f"/session/{session}/url", {"url": f"http://127.0.0.1:{server.server_port}/Tests/fixture.html"})
        report["baseline"] = execute("return __duyoPoc.measure()")
        original = execute("return document.documentElement.getAttribute('style')")
        original_viewport = execute("return document.querySelector('meta[name=viewport]').getAttribute('content')")
        screenshot("before")
        report["width"] = execute("return __duyoPoc.apply('document-width')")
        assert execute("return document.documentElement.getBoundingClientRect().width") > report["baseline"]["innerWidth"]
        screenshot("document-width")
        report["overflow"] = execute("return __duyoPoc.apply('css-overflow')")
        assert execute("return getComputedStyle(document.documentElement).overflowX") == "clip"
        text_before = execute("__duyoPoc.apply('off'); return document.querySelector('article').getBoundingClientRect().width")
        report["media"] = execute("return __duyoPoc.apply('media-only')")
        assert execute("return document.querySelector('article').getBoundingClientRect().width") == text_before
        report["viewport"] = execute("return __duyoPoc.apply('viewport-cover')")
        assert execute("return document.querySelector('meta[name=viewport]').content.includes('viewport-fit=cover')")
        report["off"] = execute("return __duyoPoc.apply('off')")
        assert execute("return document.documentElement.getAttribute('style')") == original
        assert execute("return document.querySelector('meta[name=viewport]').getAttribute('content')") == original_viewport
        screenshot("after-off")
        report["status"] = "PASS"
        print("PASS: macOS Safari DOM 폭/overflow/본문 보존/OFF. Duo 픽셀·터치는 BLOCKED.")
        return 0
    except HTTPError as error:
        report["reason"] = error.read().decode()[:2000]
        report["status"] = "FAIL" if session else "BLOCKED"
        print(f"{report['status']}: Safari WebDriver 요청 실패. artifacts/safari/report.json 확인.", file=sys.stderr)
        return 1 if session else 2
    except (OSError, RuntimeError) as error:
        report["reason"] = str(error)
        print(f"BLOCKED: {error}", file=sys.stderr)
        return 2
    except AssertionError:
        report["status"] = "FAIL"
        report["reason"] = "Safari DOM 실험 불변식 실패"
        raise
    finally:
        (OUTPUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
        if session:
            try:
                request("DELETE", f"/session/{session}")
            except (OSError, ValueError):
                pass
        if driver:
            driver.terminate()
            try:
                driver.wait(timeout=3)
            except subprocess.TimeoutExpired:
                driver.kill()
                driver.wait()
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    sys.exit(main())
