# DUYO 검증 절차와 결과

관련 결정: ADR-001~003, [품질 게이트](../harness/QUALITY_GATES.md).
현재는 Phase 3 PoC다. 출시 테스트와 제품 기능 테스트는 구현 후 추가한다.

## 자동 검사

```sh
bash scripts/harness-smoke.sh
bash scripts/check-fast.sh
bash scripts/check-full.sh
python3 Tests/safari_poc.py
python3 Tests/duo_poc.py
python3 Tests/duo_poc.py --observe-screen
```

smoke는 JSON·YAML 설정과 Hook subprocess를 검사한다. fast는 여기에 JS 구문/동작과 diff 검사를 더한다.
full은 부팅된 Duo 한 대를 확인한 뒤 실제 Safari 페이지 실험과 DUYOUITests scheme을 실행한다.
Xcode의 UI 테스트는 호스트/확장/테스트 실행기를 함께 빌드한다. Safari에서 DUYO가 ON이어야 한다.
외부 Safari를 조작하는 UI 타깃은 호스트를 자동 재설치하지 않을 수 있으므로
build-for-testing → simctl install → 설치된 모든 확장 리소스와 소스 byte 대조 → test-without-building 순서를 강제한다.
이 대조가 없는 과거 실행은 새 코드 검증의 근거로 사용하지 않는다.
루프백 서버를 테스트 종료까지 유지하고 매번 고유 xcresult와 로그를 artifacts/duo에 남긴다.
macOS WebDriver 실험은 별도로 실행한다. Duo 테스트를 macOS 전역 자동화 설정으로 막지 않는다.
full 통과는 현재 PoC 자동 검사 통과이며 출시 안전성 통과가 아니다.

관측 결과(2026-10-28 갱신): 하네스 6개/JS 33개 테스트 PASS, 공식 settings schema 검증 PASS,
Apple 변환기 생성 PASS(아이콘 미지정 경고), 실제 시뮬레이터 SDK 빌드 PASS.
macOS Safari WebDriver BLOCKED: Safari 설정 → 개발자 → 원격 자동화 허용이 꺼져 있다.
스크립트가 보안 설정을 임의로 변경하지 않는다. 허용 후 재실행하면 전후 캡처와 수치를 artifacts/safari에 저장한다.
2026-10-28: Duo 27.1 런타임 설치/부팅과 DUYO 설치/launch PASS.
`Tests/duo_poc.py`로 실제 Safari의 MAIN world 너비·배경·OFF 실험과 캡처를 실행했다.
스크립트는 부팅된 Duo가 정확히 한 대인지 검사하며 추가 라이브러리 없이 루프백에서만 동작한다.
확장 번들 등록과 사용자 ON을 확인했다. 실제 XCTest에서 팝업 주입/측정,
문서 폭 382→462와 OFF 후 382 복구까지 초기 설치본에서 PASS다. 증거: `artifacts/popup-uitest-4.xcresult`.
설치 리소스 대조를 포함한 `artifacts/duo/ui-r5hbn97q/result.xcresult`에서
가로 드래그 억제·핀치 확대·확대 중 재적용·OFF PASS.
후속 `ui-9fpwt2bw/result.xcresult`에서는 보호 배경 후보의 본문·고정 버튼 실제 탭과 기존 회귀 검사도 PASS.
`testViewportRotation`은 실제 레이아웃 폭이 바뀐 경우에만 resize 관측을 assert한다.
회전 요청만 성공하고 폭이 그대로면 OFF/세로 복구 후 XCTSkip(UNVERIFIED)로 기록하며 회전 PASS로 세지 않는다.
`--observe-screen`은 MAIN world의 보호 배경 실험을 띄운다. 90초 안에 Device Hub에서 외부/내부 화면을 전환한다.
실제 clientWidth 변화 후 5초간 추가 resize가 없을 때까지 관측하고 본문 폭이 매 관측의 안전 폭을 넘지 않는지 검사한다.
결과는 `artifacts/duo/screen-report.json`이다. 이 검사는 물리 접힘 센서를 식별하지 않으며 실제 레이아웃 변화만 판정한다.
실제 결과는 VIEWPORT.md와 `artifacts/duo/`에 보관한다.

## 프로젝트 생성과 실행

이미 생성된 `DUYO/DUYO.xcodeproj`를 사용한다. 재생성이 필요하면 기존 폴더를 덮지 말고 임시 위치에서 비교한다.
최초 사용한 실제 명령은 다음과 같다.

```sh
xcrun safari-web-extension-converter SafariWebExtension --project-location . \
  --app-name DUYO --swift --ios-only --no-open --no-prompt
```

Bundle ID는 변환기 기본 `com.yourCompany.DUYO`/`.Extension`이며 배포 식별자가 아니다.
개인 Team/서명은 미설정. 실행할 기기/계정이 정해진 후 로컬 설정에서 정한다.
호스트를 SwiftUI로 바꾸고 사용하지 않는 UIKit/WebView/storyboard와 기본 네이티브 로그를 제거했다.
아이콘과 App Store 자산은 PoC 게이트 통과 전 만들지 않는다.

Xcode에서 호스트 DUYO를 실행하고 Safari 확장을 활성화한다.
macOS는 [Apple 임시 확장 절차](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)를 사용할 수 있다.
확장 시스템 등록·팝업·실제 scripting 실행·문서 폭 변경/OFF는 PASS다.

## 실제 렌더링

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

동일 Mac의 Safari/시뮬레이터에서 `http://127.0.0.1:8765/Tests/fixture.html`을 연다.
물리 기기에서는 loopback 주소를 쓸 수 없으므로 신뢰된 로컬 네트워크 테스트 주소를 별도 준비한다.
이 로컬 HTTP 서버는 개발 fixture용이며 제품 서버가 아니다.
fixture 자체 버튼 검사는 MAIN world, 확장 팝업 검사는 isolated world다. 같은 페이지에서 섞지 말고 새로고침하여 분리한다.

1. 기준 수치/스크린샷을 저장한다. A~F는 VIEWPORT.md의 각 성공 기준으로 개별 실행한다.
2. 외부 화면 4방향, 내부 가로/세로, Safari 나란히 창, 툴바 축소 전후를 비교한다.
3. 가로 드래그, 세로 스크롤, pinch zoom, 입력/키보드, 링크/버튼, fixed/sticky를 실제 터치한다.
4. 이미지/배경 끝과 본문·카메라·Safari 버튼 영역을 별개로 확인한다.
5. 매 실험 OFF/새로고침으로 기준 복구 후 다음 실험. SPA 전환/노드 교체/중복 viewport도 별도 검사한다.
6. 사이트 목록은 fixture → 정적 기사/대형 이미지 → SPA/지도/폼 순으로 넓힌다.
   NASA·Wikipedia·지도 사이트는 검증 후보이며 실행했다고 주장하지 않는다.
7. 환경(OS/Safari/기기/flags), 전후 캡처, 측정값, PASS/FAIL/BLOCKED/UNVERIFIED를 VIEWPORT.md에 기록한다.

스크린샷/측정 로그는 `artifacts/`에 로컬 보관하고 입력/방문기록을 공개하지 않는다.
앱 출시 전 영어·일본어·한국어, VoiceOver/Dynamic Type/다크 모드와 전체 사이트 호환성 QA가 추가로 필요하다.

## 전역 자동 적용과 플로팅 버튼

`python3 Tests/duo_poc.py --controls-only`는 전역 설정/재로딩 자동 적용만 검사한다.
full은 먼저 자동 적용을 끄고 MAIN world 실험을 분리한 뒤, 스크립트 없는 `/controls` 페이지에서
실제 확장 content script의 자동 주입을 검사한다. URL/사이트별 설정은 저장하지 않는다.
최신 전체 검사 `artifacts/duo/ui-tw1d2r98/result.xcresult` PASS:
팝업·복구·본문/고정 버튼 탭·드래그/핀치·재로딩 자동 적용·전역 설정.
회전은 실제 폭 불변으로 UNVERIFIED이며, full의 수동 접힘 검사는 별도로 분리한다.
별도 `artifacts/duo/fold-controls-2.xcresult`에서 실제 Device Hub 화면 전환을 수행해
외부 버튼 표시 → 내부에서 제거/웹뷰 폭 증가 → 외부에서 다시 표시/터치 가능 PASS.
내부 화면 XCTest 캡처는 검게 나와 해당 캡처를 픽셀 판정 근거로 사용하지 않는다.

가장자리 컨트롤의 Node 검사는 적용/복구 후 x 이동·화살표 반전·동일 폭 회전·시각 뷰포트 중앙·왼쪽 CSS 복구를 포함한다.
`testGlobalControlsSurviveReload`는 실제 버튼 44×44 크기·확장/복구 이동 거리·세로 중앙 유지와 전후 캡처를 검사한다.

컨트롤 디자인 1차 실제 검증: `artifacts/duo/ui-14srz7mt/result.xcresult` PASS.
44×44·실제 터치·적용/복구 8px 이동·새로고침 자동 적용을 확인했다.
화면 중앙 후속 조정은 Safari 앱 프레임 중앙과 버튼 중심 차이 5pt 이내를 실제 XCTest에서 검사한다.

최신 실제 화면 중앙/터치/자동 적용: `ui-mj_61cmr/result.xcresult` PASS.
최신 18% 불투명도 빌드에서 Device Hub Rotate Left를 실행한
`artifacts/button-design/rotation-final.xcresult` PASS: 실제 왼쪽 이동·터치·복구/재적용.
순수 컨트롤 fixture(페이지 자체 PoC 스크립트 없음)와 `testManualEdgeRotation`을 사용했다.
기존 fixture의 초기 버튼 미검출 실행은 회전이 시작되지 않았으므로 회전 PASS 근거가 아니다.

최신 미지원 정책: Node 33개 PASS(왼쪽 요청 차단/원상복구, 비활성 버튼, 지원 복귀 시 자동 설정 재사용,
수동 OFF 보존, 적용/복구 시 버튼 위치 고정).
`artifacts/left-edge/preferences.xcresult` PASS: 실제 Safari에서 전역 설정 저장·재로딩 후
관측 geometry에 따라 OFF 또는 protected-media 상태를 확인했다.
기존 왼쪽 배경 위치 이동 방식은 픽셀 성공 근거가 없어 제거했다. 대체 배치 실험은 목표 외부 화면
geometry가 유지되지 않아 UNVERIFIED이며 원천 불가능의 근거로 사용하지 않는다.

최신 표시 정책은 미지원 버튼 비활성화 대신 DOM 제거다. Node 33개로 숨김/복귀/설정 보존을 검사한다. 실제 회전 UI 재검사는 별도다.

## 화면 디자인 변경

SwiftUI는 기본 Form/Section/Label/시스템 글꼴과 semantic foregroundStyle을 사용한다.
팝업은 Safari의 checkbox switch와 details를 사용하고, 44px 이상 입력/50px Apply, 다크·고대비 색상과 포커스를 제공한다.
정상 메시지는 별도 aria-live 영역, 진단 JSON은 고급 실험 안에 둔다.
참고: https://developer.apple.com/design/human-interface-guidelines
네이티브 실제 실행과 로컬 Safari 미리보기 캡처는 artifacts/design-*에 보관한다.
현재 Bundle ID com.aeogae.DUYO와 기존 yourCompany 설치본을 구분해야 한다.
최신 확장 통합/VoiceOver는 미검증이며 로컬 미리보기를 확장 팝업 검증으로 간주하지 않는다.

## 반복 터치와 원본 복구

`testAeogaeToggle`은 자동 적용을 잠시 끄고 새로고침한 실제 aeogae.com 원본을 기준으로 삼는다.
4회 왕복 시마다 복구된 본문 frame 폭/높이가 원본과 1pt 이내, 확장 frame도 반복마다 1pt 이내인지 검사한다.
`testThreeRapidTaps`는 실제 3연타 뒤 복구/재적용 frame을 확인하고 자동 적용을 다시 켠다.
근거: artifacts/aeogae/repeat-fixed.xcresult, rapid.xcresult PASS. 과거 단순 2회 토글 PASS를 이 검사와 혼동하지 않는다.
Full Width의 조작부 겹침 안전성은 통과로 간주하지 않는다.
