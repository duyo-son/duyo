# 뷰포트 측정과 A~F 실험

코드: `SafariWebExtension/poc.js`의 `measure()`, `apply()`, `cover()`, `off()`.
전략: [ADR-002](../adr/002-viewport-poc.md). 절차: [TEST_STRATEGY.md](TEST_STRATEGY.md).

## 좌표와 측정값

- `documentElement.clientWidth`: 레이아웃 뷰포트 기준 너비.
- `innerWidth`, `scrollWidth`: 관측 폭과 문서 스크롤 폭. 차이는 overflow이지 외부 화면 확보 증거가 아니다.
  Duo 실제 핀치 배율 1.5033에서 innerWidth=254, clientWidth=382를 관측했다.
  폭 적용은 `documentElement.clientWidth + extraWidth`로 계산해 확대 중 재적용이 문서를 축소하지 않게 한다.
- `visualViewport.width/scale/offsetLeft`: 확대·키보드·보이는 영역 관측. scale 변화는 접힘이 아니다.
- `screen.width`: 화면 값 참고용. Safari의 탭 영역과 좌표가 다를 수 있어 확장량으로 사용하지 않는다.
  내부 화면 실제 팝업에서는 layoutWidth/innerWidth=951인데 screen.width=466이 유지됐다.
  따라서 화면 너비나 접힘 상태의 단독 근거로 사용할 수 없다.
- `navigator.devicePosture?.type`, `viewport?.segments`: 선택 관측값. 프리뷰 미지원이면 null.
- 실험 추가 폭은 사용자가 지정한 CSS px(기본 80, 0~256)이며 기기 치수 추정값이 아니다.
- resize/VisualViewport resize/지원되는 posture change는 횟수만 관찰한다. PoC가 화면 상태별 자동 정책을 결정하지 않는다.

safe-area-inset은 fixture의 고정 버튼에 적용한다. 이것만으로 Safari 버튼·카메라 보호가 검증되는 것은 아니다.
DOMRect는 CSS 좌표이며 실제 Safari UI 뒤 픽셀/히트 테스트를 알려주지 않는다.

## 독립 성공 기준과 실제 결과

2026-10-28: iOS 27.1(24A94425) iPhone Duo 시뮬레이터에서 실제 Safari fixture를 실행했다.
`Tests/duo_poc.py`가 루프백 서버로 실험별 응답을 받고 `simctl io screenshot`으로 캡처한다.
이 결과는 Safari 페이지 MAIN world 실험이며 확장 isolated world 주입 결과가 아니다.
확장 번들은 pluginkit에 등록됐고 사용자가 ON을 확인했다. 실제 XCTest로 팝업 주입/측정 응답도 확인했다.
아래 A~F 표의 픽셀 비교는 팝업 실험과 구분되는 MAIN world 실험이다.

| 가설 | 독립 실험과 통과 조건 | 실제 Safari/Duo 상태 |
| --- | --- | --- |
| A 문서 폭 | document-width 후 시스템 UI 뒤 추가 픽셀을 스크린샷으로 확인 | PASS: 외부 화면 세로 fixture |
| B CSS만 | css-overflow 후 추가 렌더링 유지, 단순 clipping과 구분 | PASS: CSS width/overflow clip 후 추가 줄무늬 렌더링 |
| C 미디어만 | media-only에서 표식 이미지/배경만 증가, 본문 위치/폭 유지 | PASS: fixture 배경과 본문 폭 보존; 이미지/임의 사이트는 미검증 |
| D 흔들림 | css-overflow 후 가로 드래그·스크롤, pinch zoom 정상 | clip 단독 FAIL: x=80. scroll-lock은 프로그램 이동·네이티브 드래그 억제/핀치/확대 중 재적용 PASS |
| E 화면 변화 | 접힘·펼침/회전/키보드/확대 이벤트를 구별하고 조작 가능 | 부분 PASS: 화면 전환 resize·본문 재적용/확대. 회전·키보드 UNVERIFIED |
| F 복구 | OFF 후 viewport·style·리스너 복구, 페이지 후속 변경 보존 | PASS: fixture 폭/스타일/meta 복구; 리스너·후속 변경은 Node 검사 |

Node PASS는 위 표를 대체하지 않는다. `Tests/poc.test.js`는 검증/복구·중복 주입·메시지 경계만 검사한다.
macOS용 `Tests/safari_poc.py`는 DOM과 computed style만 assert하며 Duo 터치를 대신하지 않는다.
실행 근거: 로컬 `artifacts/duo/report.json`, `measure.png`, `document-width.png`,
`css-overflow.png`, `media-only.png`, `viewport-cover.png`, `off.png`.
원래 폭은 layout/inner/visual=382, screen=466 CSS px였다.
추가 80px 실험 후 scrollWidth=462, 시각 뷰포트는382로 유지되지만 줄무늬가 시스템 상태 영역 뒤까지 보였다.
cover 단독은 382를 유지해 이 fixture에서 추가 영역을 확보하지 못했다.
전체 문서 폭 실험은 본문이 Safari 버튼 아래로 들어가는 문제가 실제 캡처에서 확인됐다.
`overflow-x:clip` 후에도 프로그램 수평 스크롤이 가능했다. 이 옵션을 완성된 스크롤 잠금으로 사용하지 않는다.
후속 `scroll-lock` 실험은 배율 1의 passive scroll/visualViewport resize 리스너로 원점을 유지한다.
같은 실제 Safari scrollTo(80) 및 XCTest 네이티브 가로 드래그에서 scrollX=0을 확인했다.
핀치 배율 1.6107에서 가로 이동을 허용했고 확대 중 재적용도 scrollWidth=462를 유지했다.
설치 리소스 대조를 통과한 근거: `artifacts/duo/ui-r5hbn97q/result.xcresult`. 물리 기기 검증은 별도다.
픽셀 확장 PASS를 제품 안전성 PASS로 해석하지 않는다.

후속 `protected-media`: root 폭만 증가시키기 전 body의 원래 border-box 폭/좌우 여백을 고정한다.
표식 배경만 80px 확장하고 배율 1 가로 원점 유지를 적용한다.
실제 fixture에서 본문 가로 위치/폭과 fixed 버튼 위치/크기 보존, 배경 462px, scrollX=0 PASS.
설치 소스 대조 후 XCTest의 본문·고정 버튼 탭, 드래그/핀치/확대 중 재적용/OFF도 PASS.
근거: `artifacts/duo/protected-media.png`, `artifacts/duo/ui-9fpwt2bw/result.xcresult`.
임의 사이트의 배경/이미지 선택이나 회전 후 반응형 재배치는 아직 보장하지 않는다.

화면 전환 후속 실험(`--observe-screen`): 내부 951→외부 382에서 body=951이 남아 FAIL을 재현했다.
protected-media가 clientWidth 변화 때 복구/재측정/재적용하도록 수정했다.
수정 후 같은 951→382 전환에서 body도 951→382, scrollWidth=462, scrollX=0,
resizeEvents=4를 관측하고 추가 이벤트 없는 5초까지 본문 폭 보호를 확인했다(PASS).
근거: `artifacts/duo/screen-observe-1.log`, `screen-observe-3.log`, `screen-report.json`.
외부/내부에서 XCTest orientation 요청은 성공했으나 각각 폭 382/951이 그대로여서 회전은 UNVERIFIED다.
근거: `rotation-2.xcresult`, `inner-rotation-2.xcresult`. 내부 팝오버의 완료 버튼 부재도 확인해 테스트를 분기했다.

## 복구와 제한

`apply()`는 새 실험 전 이전 실험을 복구한다. `measure`는 복구 후 기준 측정,
`snapshot` 메시지는 현재 상태 측정이다. 비교 사이 매번 OFF 또는 measure를 실행한다.
변경 전 style 값/priority와 viewport content 유무를 보존하고, 현재 값이 실험 값과 같을 때만 복구한다.
페이지가 나중에 바꾼 값은 덮지 않는다. 동일 값으로 우연히 다시 쓴 변경까지 구별하지는 못한다.
viewport meta가 여러 개이거나 SPA가 구조를 바꾸는 경우는 미검증이다.
Safari 설정에서 확장 자체를 끄는 것은 팝업 OFF와 다르다. 이미 적용된 DOM은 새로고침해야 한다.

## 전역 제어의 화면 판정

`settings.js`의 `expansionWidth`는 screen.width와 문서 clientWidth 차이가 1~256일 때만 확장 폭을 반환한다.
`auto.js`는 외부 382/screen 466에서 84를 적용하고, 내부 clientWidth 951에서는 OFF와 버튼 제거를 수행한다.
실제 Device Hub 전환의 버튼 숨김/재표시와 웹뷰 폭 변화는 `fold-controls-2.xcresult`에서 PASS.
이는 표준 너비 측정 기반의 정책이며 물리 접힘 센서 판정이 아니다. 좁은 내부 창/툴바 변화는 미검증이다.

## 왼쪽 확장 판정 정정

이전 회전/좌우 버튼 PASS는 배경 확장 성공을 뜻하지 않는다. 사용자 첨부 화면과 같은
왼쪽 조작부 자세에서 현재 protected-media의 배경이 조작부 아래까지 그려지지 않아 FAIL이다.
해당 CSS 기법을 제거하고 미지원 시 복구/비활성화한다. 대체 기법은 UNVERIFIED다.
외부 화면 geometry가 유지되지 않은 RTL/scroll/overflow 추가 실행을 성공/실패 근거로 쓰지 않는다.
