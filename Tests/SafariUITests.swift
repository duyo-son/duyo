import XCTest

final class SafariUITests: XCTestCase {
    private func launchSafari() -> XCUIApplication {
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.terminate()
        safari.launch()
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 20))
        return safari
    }

    private func waitUntilReady(_ button: XCUIElement) {
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in button.isEnabled }, object: button)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 15), .completed)
    }

    private func floatingControl(_ label: String, in safari: XCUIApplication) -> XCUIElement {
        // WebKit은 aria-pressed 버튼을 Switch로 노출하므로 요소 타입에 의존하지 않는다.
        safari.descendants(matching: .any).matching(identifier: label).firstMatch
    }

    private func openPopup(in safari: XCUIApplication) -> XCUIElement {
        let menu = safari.buttons["MoreMenuButton"]
        XCTAssertTrue(menu.waitForExistence(timeout: 15))
        menu.tap()
        let duyo = safari.buttons.matching(identifier: "DUYO").firstMatch
        for _ in 0..<3 {
            if duyo.waitForExistence(timeout: 2) { break }
            safari.swipeUp()
        }
        if !duyo.exists && safari.buttons["ManageExtensions"].exists {
            safari.buttons["ManageExtensions"].tap()
            let enabled = safari.switches.matching(identifier: "DUYO")
            XCTAssertEqual(enabled.count, 1, "현재 프로젝트 DUYO 하나만 설치한 전용 시뮬레이터가 필요합니다.")
            let toggle = enabled.firstMatch
            if String(describing: toggle.value ?? "").contains("0") {
                let frame = toggle.frame
                safari.coordinate(withNormalizedOffset: .zero)
                    .withOffset(CGVector(dx: frame.midX, dy: frame.midY)).tap()
            }
            closePopup(in: safari)
            menu.tap()
        }
        XCTAssertTrue(duyo.exists, "Tests/duo_poc.py로 전용 페이지를 준비하고 Safari에서 DUYO를 켜야 합니다.")
        duyo.tap()
        let always = safari.buttons.matching(NSPredicate(format: "label IN %@",
            ["常に許可…", "Always Allow…", "Always Allow...", "항상 허용…", "항상 허용..."])).firstMatch
        if always.waitForExistence(timeout: 2) {
            always.tap()
            let allWebsites = safari.buttons.matching(NSPredicate(format:
                "label CONTAINS %@ OR label CONTAINS %@ OR label CONTAINS %@ OR label CONTAINS %@ OR label CONTAINS %@",
                "すべてのウェブサイト", "すべてのWebサイト", "All Websites", "모든 웹사이트", "모든 웹 사이트"
            )).firstMatch
            XCTAssertTrue(allWebsites.waitForExistence(timeout: 5), safari.debugDescription)
            allWebsites.tap()
        }
        let popup = safari.webViews.containing(.button, identifier: "Apply").firstMatch
        XCTAssertTrue(popup.buttons["Apply"].waitForExistence(timeout: 15), safari.debugDescription)
        waitUntilReady(popup.buttons["Apply"])
        XCTAssertGreaterThanOrEqual(popup.frame.width, 280)
        return popup
    }

    private func tapVisible(_ control: XCUIElement, in popup: XCUIElement) {
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        for _ in 0..<6 {
            let visible = popup.frame.intersection(safari.frame)
            let target = control.frame
            if visible.contains(CGPoint(x: target.midX, y: target.midY)) {
                print("DUYO_TEST_TAP", control.label, target, visible)
                safari.coordinate(withNormalizedOffset: .zero)
                    .withOffset(CGVector(dx: target.midX, dy: target.midY)).tap()
                return
            }
            let upward = target.midY > visible.midY
            let start = safari.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(
                dx: visible.midX, dy: visible.minY + visible.height * (upward ? 0.7 : 0.3)))
            let end = safari.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(
                dx: visible.midX, dy: visible.minY + visible.height * (upward ? 0.3 : 0.7)))
            start.press(forDuration: 0.05, thenDragTo: end)
        }
        XCTFail("팝업의 실제 표시 영역으로 컨트롤을 이동하지 못했습니다: \(control.label)")
    }

    private func setSwitch(_ label: String, to enabled: Bool, in popup: XCUIElement) {
        let control = popup.descendants(matching: .any).matching(NSPredicate(
            format: "label == %@ AND (value == '0' OR value == '1')", label
        )).firstMatch
        XCTAssertTrue(control.waitForExistence(timeout: 5), popup.debugDescription)
        for _ in 0..<3 {
            if control.isHittable { break }
            popup.swipeUp()
        }
        if (String(describing: control.value ?? "") == "1") != enabled { tapVisible(control, in: popup) }
        let changed = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            String(describing: control.value ?? "") == (enabled ? "1" : "0")
        }, object: control)
        XCTAssertEqual(XCTWaiter.wait(for: [changed], timeout: 5), .completed)
    }

    private func selectExperiment(_ label: String, in popup: XCUIElement, safari: XCUIApplication) {
        let advanced = popup.descendants(matching: .any).matching(identifier: "Advanced experiments").firstMatch
        if !popup.buttons["Mode"].exists && advanced.exists { advanced.tap() }
        for _ in 0..<3 {
            if popup.buttons["Mode"].isHittable { break }
            popup.swipeUp()
        }
        tapVisible(popup.buttons["Mode"], in: popup)
        safari.buttons[label].tap()
    }

    private func applyPopup(_ popup: XCUIElement) throws -> [String: Any] {
        tapVisible(popup.buttons["Apply"], in: popup)
        waitUntilReady(popup.buttons["Apply"])
        let response = popup.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "layoutWidth")).firstMatch
        if !response.exists {
            let advanced = popup.descendants(matching: .any).matching(identifier: "Advanced experiments").firstMatch
            if advanced.exists { tapVisible(advanced, in: popup) }
        }
        XCTAssertTrue(response.waitForExistence(timeout: 15))
        return try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.label.utf8)) as? [String: Any])
    }

    func testPrepareManualPoC() throws {
        continueAfterFailure = false
        let safari = launchSafari()
        let popup = openPopup(in: safari)
        selectExperiment("OFF — Restore page", in: popup, safari: safari)
        setSwitch("Automatically apply on all websites", to: false, in: popup)
        setSwitch("Show floating button on outer screen", to: false, in: popup)
        let result = try applyPopup(popup)
        XCTAssertEqual(result["experiment"] as? String, "off")
        closePopup(in: safari)
    }

    func testGlobalControlsSurviveReload() throws {
        continueAfterFailure = false
        let safari = launchSafari()
        let popup = openPopup(in: safari)
        selectExperiment("Protected background", in: popup, safari: safari)
        setSwitch("Automatically apply on all websites", to: true, in: popup)
        setSwitch("Show floating button on outer screen", to: true, in: popup)
        let applied = try applyPopup(popup)
        XCTAssertEqual(applied["experiment"] as? String, "protected-media")
        closePopup(in: safari)
        let restore = floatingControl("Restore page with DUYO", in: safari)
        XCTAssertTrue(restore.waitForExistence(timeout: 15))
        XCTAssertTrue(restore.isHittable)
        let expandedFrame = restore.frame
        XCTAssertEqual(expandedFrame.width, 44, accuracy: 2)
        XCTAssertEqual(expandedFrame.height, 44, accuracy: 2)
        XCTAssertEqual(expandedFrame.midY, safari.frame.midY, accuracy: 5)
        let expandedCapture = XCTAttachment(screenshot: safari.screenshot())
        expandedCapture.name = "반투명 가장자리 복구 화살표"
        expandedCapture.lifetime = .keepAlways
        add(expandedCapture)
        restore.tap()
        let apply = floatingControl("Apply DUYO", in: safari)
        XCTAssertTrue(apply.waitForExistence(timeout: 10))
        XCTAssertEqual(apply.frame.midX, expandedFrame.midX, accuracy: 1)
        XCTAssertEqual(apply.frame.midY, expandedFrame.midY, accuracy: 2)
        let restoredCapture = XCTAttachment(screenshot: safari.screenshot())
        restoredCapture.name = "복구 후 안쪽 확장 화살표"
        restoredCapture.lifetime = .keepAlways
        add(restoredCapture)
        apply.tap()
        XCTAssertTrue(restore.waitForExistence(timeout: 10))

        let token = safari.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Document ")).firstMatch
        XCTAssertTrue(token.waitForExistence(timeout: 5))
        let previous = token.label
        safari.buttons["ReloadButton"].tap()
        let reloaded = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            token.exists && token.label != previous
        }, object: token)
        XCTAssertEqual(XCTWaiter.wait(for: [reloaded], timeout: 15), .completed)
        XCTAssertTrue(restore.waitForExistence(timeout: 15), "새 문서에 팝업을 열지 않아도 자동 적용/플로팅 버튼이 돌아와야 합니다.")
        let capture = XCTAttachment(screenshot: safari.screenshot())
        capture.name = "전체 자동 적용과 플로팅 버튼 재로딩"
        capture.lifetime = .keepAlways
        add(capture)
        _ = openPopup(in: safari)
        selectExperiment("OFF — Restore page", in: popup, safari: safari)
        setSwitch("Automatically apply on all websites", to: false, in: popup)
        setSwitch("Show floating button on outer screen", to: false, in: popup)
        _ = try applyPopup(popup)
        closePopup(in: safari)
        XCTAssertFalse(restore.exists)
        XCTAssertFalse(apply.exists)
    }

    func testZZEnableAutomaticControls() throws {
        continueAfterFailure = false
        let safari = launchSafari()
        let popup = openPopup(in: safari)
        selectExperiment("OFF — Restore page", in: popup, safari: safari)
        setSwitch("Automatically apply on all websites", to: true, in: popup)
        setSwitch("Show floating button on outer screen", to: true, in: popup)
        let off = try applyPopup(popup)
        XCTAssertEqual(off["experiment"] as? String, "off")
        closePopup(in: safari)
        safari.buttons["ReloadButton"].tap()
        let inspected = openPopup(in: safari)
        selectExperiment("Inspect current layout", in: inspected, safari: safari)
        let state = try applyPopup(inspected)
        let width = try XCTUnwrap(state["layoutWidth"] as? Double)
        let screenWidth = try XCTUnwrap(state["screenWidth"] as? Double)
        let screenHeight = try XCTUnwrap(state["screenHeight"] as? Double)
        let angle = (state["orientationAngle"] as? Int) ?? 0
        let gap = (angle % 180 == 0 ? screenWidth : max(screenWidth, screenHeight)) - width
        let unsupported = gap <= 0 || gap > 256 || angle == 90 || angle == 180
        XCTAssertEqual(state["experiment"] as? String, unsupported ? "off" : "protected-media")
        closePopup(in: safari)
        if gap > 0 && gap <= 256 && (angle == 90 || angle == 180) {
            XCTAssertFalse(floatingControl("Restore page with DUYO", in: safari).exists)
            XCTAssertFalse(floatingControl("Apply DUYO", in: safari).exists)
        }
    }

    func testManualFoldButtonVisibility() throws {
        continueAfterFailure = false
        let safari = launchSafari()
        guard safari.staticTexts["Safari 렌더링 실험"].waitForExistence(timeout: 15) else {
            throw XCTSkip("UNVERIFIED: 수동 접힘 검사는 Tests/fixture.html에서 별도 실행합니다.")
        }
        let restore = floatingControl("Restore page with DUYO", in: safari)
        let apply = floatingControl("Apply DUYO", in: safari)
        XCTAssertTrue(restore.waitForExistence(timeout: 15))
        let outerWidth = safari.webViews["WebView"].frame.width
        print("DUYO_WAIT_FOR_OPEN")
        let hidden = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            !restore.exists && !apply.exists && safari.webViews["WebView"].frame.width > outerWidth
        }, object: safari)
        XCTAssertEqual(XCTWaiter.wait(for: [hidden], timeout: 40), .completed)
        let opened = XCTAttachment(screenshot: safari.screenshot())
        opened.name = "펼친 화면에서는 플로팅 버튼 숨김"
        opened.lifetime = .keepAlways
        add(opened)
        print("DUYO_WAIT_FOR_CLOSE")
        let shown = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            restore.exists && safari.webViews["WebView"].frame.width == outerWidth
        }, object: safari)
        XCTAssertEqual(XCTWaiter.wait(for: [shown], timeout: 40), .completed)
        XCTAssertTrue(restore.isHittable)
        let closed = XCTAttachment(screenshot: safari.screenshot())
        closed.name = "닫힌 화면에서는 플로팅 버튼 복귀"
        closed.lifetime = .keepAlways
        add(closed)
    }

    func testManualEdgeRotation() throws {
        continueAfterFailure = false
        let safari = launchSafari()
        guard safari.staticTexts["DUYO Edge Controls"].waitForExistence(timeout: 5) else {
            throw XCTSkip("UNVERIFIED: 방향 화살표 검사는 순수 컨트롤 fixture에서 Device Hub 실제 회전으로 별도 실행합니다.")
        }
        safari.buttons["ReloadButton"].tap()
        let restore = floatingControl("Restore page with DUYO", in: safari)
        XCTAssertTrue(restore.waitForExistence(timeout: 15))
        XCTAssertGreaterThan(restore.frame.midX, safari.frame.midX)
        print("DUYO_WAIT_FOR_LEFT_EDGE")
        let apply = floatingControl("Apply DUYO", in: safari)
        let hidden = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            !restore.exists && !apply.exists
        }, object: safari)
        XCTAssertEqual(XCTWaiter.wait(for: [hidden], timeout: 40), .completed)
        let capture = XCTAttachment(screenshot: safari.screenshot())
        capture.name = "왼쪽 미지원 자세에서 버튼 숨김"
        capture.lifetime = .keepAlways
        add(capture)
    }

    func testAeogaeBackground() throws {
        continueAfterFailure = false
        let safari = launchSafari()
        XCTAssertTrue(safari.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Global Software Studio")).firstMatch.waitForExistence(timeout: 20))
        safari.buttons["MoreMenuButton"].tap()
        safari.buttons["ManageExtensions"].tap()
        let extensions = safari.switches.matching(identifier: "DUYO")
        XCTAssertEqual(extensions.count, 1)
        let control = extensions.firstMatch
        if String(describing: control.value).contains("0") {
            let frame = control.frame
            safari.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: frame.midX, dy: frame.midY)).tap()
        }
        closePopup(in: safari)
        safari.buttons["ReloadButton"].tap()
        let popup = openPopup(in: safari)
        selectExperiment("OFF — Restore page", in: popup, safari: safari)
        let baseline = try applyPopup(popup)
        XCTAssertEqual(baseline["experiment"] as? String, "off")
        closePopup(in: safari)
        let original = XCTAttachment(screenshot: safari.screenshot())
        original.name = "aeogae 실제 Safari 적용 전"
        original.lifetime = .keepAlways
        add(original)
        let controls = openPopup(in: safari)
        selectExperiment("Full Width", in: controls, safari: safari)
        let applied = try applyPopup(controls)
        XCTAssertEqual(applied["experiment"] as? String, "full-width")
        XCTAssertGreaterThan(try XCTUnwrap(applied["bodyWidth"] as? Double), try XCTUnwrap(baseline["bodyWidth"] as? Double))
        XCTAssertGreaterThan(try XCTUnwrap(applied["scrollWidth"] as? Double), try XCTUnwrap(baseline["scrollWidth"] as? Double))
        closePopup(in: safari)
        let capture = XCTAttachment(screenshot: safari.screenshot())
        capture.name = "aeogae 실제 Safari 배경 확장"
        capture.lifetime = .keepAlways
        add(capture)
    }

    func testAeogaeToggle() throws {
        continueAfterFailure = false
        let safari = launchSafari()
        let popup = openPopup(in: safari)
        selectExperiment("OFF — Restore page", in: popup, safari: safari)
        setSwitch("Automatically apply on all websites", to: false, in: popup)
        _ = try applyPopup(popup)
        closePopup(in: safari)
        safari.buttons["ReloadButton"].tap()
        let text = safari.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "AEOGAE is a global")).firstMatch
        XCTAssertTrue(text.waitForExistence(timeout: 15))
        let clean = text.frame
        let controls = openPopup(in: safari)
        selectExperiment("Full Width", in: controls, safari: safari)
        let full = try applyPopup(controls)
        XCTAssertEqual(try XCTUnwrap(full["scale"] as? Double), 1, accuracy: 0.02)
        closePopup(in: safari)
        let restore = floatingControl("Restore page with DUYO", in: safari)
        let apply = floatingControl("Apply DUYO", in: safari)
        var fullFrame: CGRect?
        for cycle in 0..<4 {
            XCTAssertTrue(restore.waitForExistence(timeout: 10))
            restore.tap()
            XCTAssertTrue(apply.waitForExistence(timeout: 10))
            XCTAssertEqual(text.frame.width, clean.width, accuracy: 1, "원본 복구 폭, 반복 \(cycle)")
            XCTAssertEqual(text.frame.height, clean.height, accuracy: 1, "원본 복구 배율, 반복 \(cycle)")
            apply.tap()
            XCTAssertTrue(restore.waitForExistence(timeout: 10))
            let current = text.frame
            if let expected = fullFrame {
                XCTAssertEqual(current.width, expected.width, accuracy: 1)
                XCTAssertEqual(current.height, expected.height, accuracy: 1)
            } else { fullFrame = current }
            let capture = XCTAttachment(screenshot: safari.screenshot())
            capture.name = "원본 기준 aeogae 반복 적용 \(cycle + 1)"
            capture.lifetime = .keepAlways
            add(capture)
        }
    }

    func testStoreScreenshots() throws {
        continueAfterFailure = false
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        XCTAssertTrue(safari.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Global Software Studio")).firstMatch.waitForExistence(timeout: 20))
        func capture(_ name: String) {
            let attachment = XCTAttachment(screenshot: safari.screenshot())
            attachment.name = name
            attachment.lifetime = .keepAlways
            add(attachment)
        }
        let restore = floatingControl("Restore page with DUYO", in: safari)
        let apply = floatingControl("Apply DUYO", in: safari)
        XCTAssertTrue(restore.waitForExistence(timeout: 15))
        restore.tap()
        XCTAssertTrue(apply.waitForExistence(timeout: 10))
        capture("01-aeogae-original")
        apply.tap()
        XCTAssertTrue(restore.waitForExistence(timeout: 10))
        capture("02-aeogae-expanded")
        let popup = openPopup(in: safari)
        XCTAssertTrue(popup.buttons["Apply"].exists)
        capture("03-extension-controls")
        closePopup(in: safari)
    }

    func testThreeRapidTaps() throws {
        continueAfterFailure = false
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        let restore = floatingControl("Restore page with DUYO", in: safari)
        let apply = floatingControl("Apply DUYO", in: safari)
        let text = safari.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "AEOGAE is a global")).firstMatch
        XCTAssertTrue(restore.waitForExistence(timeout: 15))
        let full = text.frame
        restore.tap()
        XCTAssertTrue(apply.waitForExistence(timeout: 10))
        let clean = text.frame
        apply.tap()
        XCTAssertTrue(restore.waitForExistence(timeout: 10))
        restore.tap(withNumberOfTaps: 3, numberOfTouches: 1)
        XCTAssertTrue(apply.waitForExistence(timeout: 10))
        XCTAssertEqual(text.frame.width, clean.width, accuracy: 1)
        XCTAssertEqual(text.frame.height, clean.height, accuracy: 1)
        apply.tap()
        XCTAssertTrue(restore.waitForExistence(timeout: 10))
        XCTAssertEqual(text.frame.width, full.width, accuracy: 1)
        XCTAssertEqual(text.frame.height, full.height, accuracy: 1)
        let popup = openPopup(in: safari)
        setSwitch("Automatically apply on all websites", to: true, in: popup)
        _ = try applyPopup(popup)
        closePopup(in: safari)
    }

    private func closePopup(in safari: XCUIApplication) {
        let done = safari.buttons.matching(NSPredicate(format: "label IN %@", ["完了", "Done", "완료"])).firstMatch
        if done.exists {
            done.tap()
        } else {
            // 내부 화면은 완료 버튼 없는 popover이므로 fixture의 빈 영역을 탭한다.
            safari.webViews["WebView"].coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.3)).tap()
        }
    }

    func testViewportRotation() throws {
        continueAfterFailure = false
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.terminate()
        safari.launch()
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 20))
        let menu = safari.buttons["MoreMenuButton"]
        let popup = safari.webViews.containing(.button, identifier: "Apply").firstMatch
        func experiment(_ label: String) throws -> [String: Any] {
            XCTAssertTrue(menu.waitForExistence(timeout: 15))
            menu.tap()
            let duyo = safari.buttons.matching(identifier: "DUYO").firstMatch
            XCTAssertTrue(duyo.waitForExistence(timeout: 10))
            duyo.tap()
            let run = popup.buttons["Apply"]
            XCTAssertTrue(run.waitForExistence(timeout: 15))
            XCTAssertGreaterThanOrEqual(popup.frame.width, 280, "팝업이 한 글자 너비로 줄어들면 안 됩니다.")
            popup.buttons["Mode"].tap()
            safari.buttons[label].tap()
            run.tap()
            let response = popup.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "layoutWidth")).firstMatch
            XCTAssertTrue(response.waitForExistence(timeout: 15))
            let result = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.label.utf8)) as? [String: Any])
            closePopup(in: safari)
            return result
        }
        defer { XCUIDevice.shared.orientation = .portrait }
        XCUIDevice.shared.orientation = .portrait
        let before = try experiment("D — Horizontal scroll control")
        XCUIDevice.shared.orientation = .landscapeLeft
        let rotated = try experiment("Inspect current layout")
        let capture = XCTAttachment(screenshot: safari.screenshot())
        capture.name = "가로 회전 요청 후 실제 Safari"
        capture.lifetime = .keepAlways
        add(capture)
        print("DUYO 회전 전: \(before), 후: \(rotated)")
        XCUIDevice.shared.orientation = .portrait
        _ = try experiment("OFF — Restore page")
        if before["layoutWidth"] as? Int == rotated["layoutWidth"] as? Int {
            throw XCTSkip("UNVERIFIED: 회전 요청 후에도 실제 레이아웃 폭이 바뀌지 않아 회전 대응을 검증하지 못했습니다.")
        }
        XCTAssertGreaterThan(try XCTUnwrap(rotated["resizeEvents"] as? Int), 0)
    }

    func testPopupExecutesManualExperiment() throws {
        continueAfterFailure = false
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.terminate()
        safari.launch()
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 20))
        print("DUYO Safari 시작:\n\(safari.debugDescription)")

        let pageMenu = safari.buttons["MoreMenuButton"]
        XCTAssertTrue(pageMenu.waitForExistence(timeout: 15))
        pageMenu.tap()
        let duyo = safari.buttons.matching(identifier: "DUYO").firstMatch
        for _ in 0..<3 {
            if duyo.waitForExistence(timeout: 2) { break }
            safari.swipeUp()
        }
        print("DUYO 페이지 메뉴:\n\(safari.debugDescription)")
        XCTAssertTrue(duyo.exists, "Safari에서 DUYO를 켜고 python3 Tests/duo_poc.py가 준비하는 전용 fixture로 실행하세요.")
        duyo.tap()

        let popup = safari.webViews.containing(.button, identifier: "Apply").firstMatch
        let run = popup.buttons["Apply"]
        XCTAssertTrue(run.waitForExistence(timeout: 20), safari.debugDescription)
        XCTAssertGreaterThanOrEqual(popup.frame.width, 280, "팝업이 한 글자 너비로 줄어들면 안 됩니다.")
        XCTAssertTrue(run.isHittable, "작은 Safari 팝업에서도 실행 버튼을 누를 수 있어야 합니다.")
        popup.buttons["Mode"].tap()
        safari.buttons["Measure and restore"].tap()
        run.tap()
        let response = popup.staticTexts.matching(
            NSPredicate(format: "label CONTAINS %@", "layoutWidth")
        ).firstMatch
        let succeeded = response.waitForExistence(timeout: 15)
        let screenshot = XCTAttachment(screenshot: safari.screenshot())
        screenshot.name = "DUYO 팝업 실행 결과"
        screenshot.lifetime = .keepAlways
        add(screenshot)
        print("DUYO 실행 결과:\n\(safari.debugDescription)")
        XCTAssertTrue(succeeded, "수동 PoC의 측정 응답을 받아야 합니다.")
        let baseline = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.label.utf8)) as? [String: Any])
        let originalWidth = try XCTUnwrap(baseline["scrollWidth"] as? Int)
        let extraWidth = max(0, min(256, try XCTUnwrap(baseline["screenWidth"] as? Int) - (try XCTUnwrap(baseline["layoutWidth"] as? Int))))
        func inspectCurrentPage() throws -> [String: Any] {
            pageMenu.tap()
            duyo.tap()
            XCTAssertTrue(run.waitForExistence(timeout: 15))
            popup.buttons["Mode"].tap()
            safari.buttons["Inspect current layout"].tap()
            run.tap()
            XCTAssertTrue(response.waitForExistence(timeout: 15))
            return try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(response.label.utf8)) as? [String: Any])
        }
        popup.buttons["Mode"].tap()
        safari.buttons["Protected background"].tap()
        run.tap()
        let protectedResponse = popup.staticTexts.matching(NSPredicate(
            format: "label CONTAINS %@", "\"scrollWidth\": \(originalWidth + extraWidth)"
        )).firstMatch
        XCTAssertTrue(protectedResponse.waitForExistence(timeout: 15))
        closePopup(in: safari)
        for (label, result) in [("본문 버튼", "본문 탭 성공"), ("고정 버튼", "고정 탭 성공")] {
            let button = safari.webViews["WebView"].buttons[label]
            XCTAssertTrue(button.waitForExistence(timeout: 10))
            XCTAssertTrue(button.isHittable, "확장 후에도 \(label)을 누를 수 있어야 합니다.")
            button.tap()
            XCTAssertTrue(safari.webViews["WebView"].buttons[result].waitForExistence(timeout: 5))
        }
        let protectedCapture = XCTAttachment(screenshot: safari.screenshot())
        protectedCapture.name = "배경 확장과 본문·고정 버튼 탭"
        protectedCapture.lifetime = .keepAlways
        add(protectedCapture)
        let afterButtons = try inspectCurrentPage()
        XCTAssertEqual(afterButtons["scrollX"] as? Int, 0)
        print("DUYO 본문·고정 버튼 탭 PASS: \(afterButtons)")
        for (experiment, width) in [("D — Horizontal scroll control", originalWidth + extraWidth), ("OFF — Restore page", originalWidth)] {
            popup.buttons["Mode"].tap()
            print("DUYO 실험 선택:\n\(safari.debugDescription)")
            let option = safari.buttons[experiment]
            XCTAssertTrue(option.waitForExistence(timeout: 5), safari.debugDescription)
            option.tap()
            run.tap()
            let updated = popup.staticTexts.matching(
                NSPredicate(format: "label CONTAINS %@", "\"scrollWidth\": \(width)")
            ).firstMatch
            XCTAssertTrue(updated.waitForExistence(timeout: 15), safari.debugDescription)
            let capture = XCTAttachment(screenshot: safari.screenshot())
            capture.name = experiment
            capture.lifetime = .keepAlways
            add(capture)
            print("DUYO \(experiment): \(updated.label)")
            if experiment == "D — Horizontal scroll control" {
                closePopup(in: safari)
                let start = safari.coordinate(withNormalizedOffset: CGVector(dx: 0.7, dy: 0.4))
                let end = safari.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.4))
                start.press(forDuration: 0.05, thenDragTo: end)
                let afterPan = try inspectCurrentPage()
                XCTAssertEqual(afterPan["scrollX"] as? Int, 0)
                closePopup(in: safari)
                safari.webViews["WebView"].pinch(withScale: 1.5, velocity: 1)
                let afterZoom = try inspectCurrentPage()
                XCTAssertGreaterThan(try XCTUnwrap(afterZoom["scale"] as? Double), 1)
                print("DUYO 확대: \(afterZoom)")
                popup.buttons["Mode"].tap()
                safari.buttons["D — Horizontal scroll control"].tap()
                run.tap()
                let reapplied = popup.staticTexts.matching(NSPredicate(
                    format: "label CONTAINS %@ AND label CONTAINS %@",
                    "\"scrollWidth\": \(width)", "\"resizeEvents\": 0"
                )).firstMatch
                XCTAssertTrue(reapplied.waitForExistence(timeout: 15), "확대 중 재적용에서도 문서 폭을 유지해야 합니다.")
                print("DUYO 확대 중 재적용: \(reapplied.label)")
            }
        }
    }
}
