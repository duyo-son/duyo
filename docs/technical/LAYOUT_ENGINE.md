# 실험 로직과 제품 엔진 경계

현재는 `SafariWebExtension/poc.js`의 단일 함수 집합이며 제품 레이아웃 엔진은 확정하지 않았다.
[ADR-002](../adr/002-viewport-poc.md)의 실제 픽셀/터치 게이트를 통과해야 제품 모드를 구현한다.

| 책임 | 현재 코드 | 실제 동작 |
| --- | --- | --- |
| 측정 | measure | viewport geometry와 지원 시 posture/segments 관찰 |
| 실험 결정 | apply | 허용 실험명과 정수 폭 검증, 이전 실험 복구 |
| CSS 변경 | property | root width/overflow, 표식 미디어 width/max-width만 변경 |
| viewport | cover | 첫 meta만 변경 또는 생성, content 원본 보존 |
| 변화 감지 | apply의 resized | resize/지원 posture 이벤트 수만 관찰 |
| 가로 이동 실험 | scroll-lock의 keepHorizontalOrigin | 배율 1에서 window 가로 원점 유지, 세로 위치 보존 |
| 복구 | off | 리스너 해제와 역순 속성 복구, 페이지 후속 변경 보존 |

document-width는 수동 추가 폭으로 root를 넓힌다. css-overflow는 여기에 root/body overflow-x clip을 추가한다.
media-only는 fixture의 `data-duyo-poc-media` 표식에만 적용하여 본문을 건드리지 않는다.
viewport-cover는 viewport-fit만 교체하며 확대 제한 속성을 추가하지 않는다.
아무 실험도 fixed/sticky 요소의 안전 영역을 자동 보장하지 않는다.

2026-10-28: `overflow-x:clip`만으로 프로그램 가로 이동이 억제되지 않아
독립 실험 `scroll-lock`을 추가했다. passive scroll 리스너가 배율 1에서만 x를 0으로 되돌린다.
확대 중에는 가로 이동을 허용하고 visualViewport resize에서 정상 배율 복귀를 관찰한다.
OFF는 두 리스너를 제거하고 적용 전 x 위치를 조건부 복구한다. 세로 위치는 강제로 되돌리지 않는다.
실제 Duo에서 프로그램/네이티브 가로 드래그 뒤 x=0, 핀치 확대/확대 중 재적용/OFF를 확인했다.
근거는 TEST_STRATEGY와 STATE를 따른다.

후속 `protected-media` 후보는 root 확장 전 body의 실제 border-box 폭과 계산된 좌우 여백을 고정한다.
body에는 overflow clip을 설정하지 않아 표식 배경이 본문 밖으로 그려질 수 있게 한다.
root 확장/clip과 scroll-lock을 재사용한다. OFF에서 body의 임시 속성도 조건부 복구한다.
표식 미디어만 넓히므로 임의 사이트의 배경을 자동 탐지하는 제품 모드가 아니다.
본문 가로 위치/폭과 fixed 버튼 위치, 실제 탭 성공을 `duo_poc.py`와 SafariUITests로 검증한다.
2026-10-28 실제 내부→외부 전환에서 layoutWidth=382인데 body=951이 남는 실패를 재현했다.
`resized`는 protected-media의 clientWidth가 바뀐 경우에만 이전 변경을 복구하고 새 레이아웃에서 재적용한다.
resize 횟수는 유지하며, 시각 배율만 바뀌면 폭을 재적용하지 않는다. 다른 독립 실험은 관찰만 한다.

ResizeObserver/MutationObserver는 측정 PoC에서 불필요하여 사용하지 않는다.
제품에서 실제 대응이 필요해지면 bounded observation·자기 변경 배제·OFF 해제를 함께 검증한다.
transform는 좌표/본문/터치 확대를 왜곡할 수 있어 선택하지 않았다. touch-action 제한도 하지 않는다.
fixture는 100dvh와 sticky/fixed, 입력/링크, safe-area 버튼으로 회귀를 관찰한다.

OFF/Background/Full Width/Smart는 제품 요구사항이며 현재 실험 메뉴와 동일하지 않다.
Smart 규칙과 사이트별 예외를 증거 없이 만들지 않는다. 단위 테스트 통과가 제품 엔진 채택 근거는 아니다.
추가 라이브러리·클래스 계층·사이트별 하드코딩은 없다.

## 고정 버튼과 미지원 조건

`auto.js:render`는 화면 세로 중앙의 44px 버튼을 문서의 터치 가능한 끝에 고정한다.
적용/복구로 위치를 바꾸지 않고, 방향만 전환한다. 회전에 따른 좌우 위치 선택은 유지한다.
기본 opacity=.18, 누름 .85, focus-visible/고대비/투명도 줄이기/forced-colors는 1이다.

왼쪽 배경 확장은 실제 화면에서 조작부 아래까지 표시되지 않아 현재 미지원이다.
실패한 root/body left 및 미디어 margin-left 조작을 제거했다.
`auto.js:updateLayout`은 미지원이면 `api.apply("off")`로 원상복귀하고 버튼을 숨긴다.
전역 preferences 및 수동 OFF를 바꾸지 않는다. 다시 지원되는 조건에서는 기존 automatic 설정을 따른다.
`poc.js:apply`도 왼쪽 레이아웃 변경 요청에서 기존 변경을 복구한 뒤 미지원 오류를 반환한다.
이는 현재 구현의 제한이며 Safari에서 가능한 모든 기법이 불가능하다는 결론은 아니다.
일반 사이트 미디어 탐지와 전체 방향의 실제 픽셀 검증은 별도 과제다.

## 일반 전체 폭 섹션 배경 후보

`poc.js:apply`의 protected-media는 fixture 표식뿐 아니라 실제 `section`도 측정한다.
원래 left≈0, width≈clientWidth인 섹션 중 fixed/sticky/transform 적용 요소를 제외한다.
본문 body 폭을 고정하고, 후보 섹션만 extraWidth만큼 넓힌다. 일반 흐름 자식은 원래 border-box 폭을
유지하고 확장 후 가로 위치 차이를 relative left로 보정한다. absolute 장식층은 섹션 폭을 따라 확장한다.
사이트의 body overflow-x:hidden이 배경을 자르므로 후보가 있을 때만 visible로 변경하고 OFF에서 복구한다.
CSS/하위 콘텐츠의 실제 호환성은 사이트별 QA가 필요하며 Full Width/Smart 완성을 뜻하지 않는다.
측정 `expandedSectionCount`는 처리한 섹션 수이며 픽셀 성공을 대신하지 않는다.

## Full Width

`poc.js:apply("full-width")`는 root와 body를 관측된 추가 폭만큼 넓혀 실제 본문 재배치를 수행한다.
scroll-lock과 동일한 가로 원점 유지/핀치 정책 및 기존 조건부 undo를 재사용한다.
기본 Protected background는 유지하며 사용자가 선택한 mode를 preferences에 저장해 자동 적용/화살표에 재사용한다.
Full Width는 글자나 버튼이 Safari 조작부 아래로 들어갈 수 있어 팝업에 제한을 표시한다. 왼쪽 미지원 차단은 동일하다.

반복 확대 방지: Full Width의 같은 폭/가장자리/방향 요청은 이미 적용 중이면 변경하지 않는다.
자체 viewport resize에서 Full Width를 다시 확장하지 않으며 화면 정책은 auto.js가 처리한다.
Full Width 동안 viewport의 shrink-to-fit=no만 추가하고 OFF에서 기존 content를 조건부 복구한다.
minimum/maximum-scale 또는 user-scalable 제한은 추가하지 않는다.
근거: https://developer.apple.com/videos/play/wwdc2019/203/ (Safari 자동 축소 제어 설명).
