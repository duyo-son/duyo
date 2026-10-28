# ADR-004 — 전체 자동 적용과 외부 화면 플로팅 버튼

날짜: 2026-10-28. 상태: 구현/검증 진행.

문제: ON만으로 수동 PoC가 적용되지 않는다. 사용자가 사이트마다 설정하지 않는 전체 자동 적용과
접힌 외부 화면에서만 보이는 선택형 웹페이지 버튼을 요청했다.

선택: 기본값이 켜진 전역 automatic/floating 스위치 두 개, storage.local,
HTTP(S) 최상위 content script를 추가한다. 초기 자동/플로팅 제어는 검증된 protected-media와 OFF를 사용한다.
위험이 확인된 전체 문서 폭 실험은 사용자가 팝업에서 실행할 때만 허용하고 자동 저장하지 않는다.
Full Width/Smart 제품 엔진을 이 변경으로 완료라고 표시하지 않는다.

데이터: `preferences` 키에 automatic/floating bool만 저장한다. 설정을 바꾸기 전에는 아무것도 저장하지 않는다.
사이트별 hostname, URL, 경로·쿼리·포트·사용자 입력·방문 내역·측정값은 저장하지 않는다.
팝업 Apply는 전역 스위치를 저장하고 현재 페이지의 선택한 실험을 적용한다. 측정/현재 상태 진단은 저장값을 바꾸지 않는다.
플로팅 버튼은 현재 페이지 적용/복구만 전환하고, 전역 선호는 바꾸지 않는다.

표시 조건: 실제 관측된 외부 clientWidth=382/screen.width=466의 추가 공간 84px를 사용한다.
내부 clientWidth=951에서는 screen.width=466이 유지되므로 추가 공간이 없다고 판단하고 복구/버튼 제거한다.
clientWidth가 바뀌면 다시 계산하며 확대만으로는 재적용하지 않는다. 추가 공간이 0 또는 256px 초과면 확장하지 않는다.
이는 관측된 뷰포트 geometry에 대한 보수적 정책이며 하드웨어 접힘 API가 아니다.
내부 분할 창·플로팅 창처럼 좁은 뷰포트와 메타 viewport가 특이한 사이트는 추가 QA가 필요하다.

권한: activeTab/scripting에 storage를 추가한다. content_scripts.matches는 HTTP(S)로 제한하고
Safari 자체의 사이트 허용을 따른다. 모든 허용 사이트 재방문 시 클릭 없이 실행하려면 웹사이트 접근 선언이 필요하다.
사용자는 Safari에서 모든 웹사이트 허용을 선택할 수 있다. 확장 자체가 Safari 권한을 우회하지 않는다.
별도 tabs, nativeMessaging, <all_urls>, 서버, 원격 스크립트, App Group은 추가하지 않는다.

대안: activeTab만으로는 재방문 자동 적용을 제공할 수 없다. iOS 호스트 앱에서 웹 스크립트로 직접 명령을 보내는 방식은 Apple이 지원하지 않는다.
따라서 작동하지 않는 호스트 Apply UI를 만들지 않고 Safari 팝업/웹페이지에서 제어한다.

위험/검사: 저장/초기 로딩 경쟁, 명시적 OFF 보존, 중복 주입, 잘못된 저장값, 표시/숨김,
Shadow DOM 버튼의 실제 탭·접근성·크기, 페이지 새로고침 후 자동 적용을 검사한다.
독립 MAIN world 실험 전에는 실제 팝업으로 자동/플로팅을 끄며 검사 끝에는 두 기본값을 다시 켠다.
일반 사이트 이미지/배경 탐지와 SPA 호환성은 별도 작업이다.

검증: Node 제어 흐름/경계 테스트 PASS. 실제 결과는 STATE와 TEST_STRATEGY에 기록한다.

자료: [Apple 권한](https://developer.apple.com/documentation/safariservices/managing-safari-web-extension-permissions),
[Apple 메시징/iOS 제약](https://developer.apple.com/documentation/safariservices/messaging-between-the-app-and-javascript-in-a-safari-web-extension).

## 가장자리 컨트롤 개선 (2026-10-28)

기존 하단 텍스트 버튼 대신 화면 가장자리의 세로 중앙에 44×44 CSS px 반투명 원형 화살표를 표시한다.
미적용 시 확장 방향, 적용 시 복구 방향을 가리키며 버튼도 터치 가능한 문서 끝으로 이동한다.
회전 시 screen.orientation.change/기존 orientationchange를 처리하고 VisualViewport 변화 때 중앙 위치를 갱신한다.
실측: 외부 가로 angle=90에서 clientWidth=594, screen.width/height=466/678, Safari 조작부는 왼쪽이다.
따라서 가로 화면은 긴 screen 치수를 사용하며 90/180도는 왼쪽, 0/270도는 오른쪽을 선택한다.
0/90도 조작부 위치는 실제 화면으로 확인했다. 나머지 방향과 물리 기기는 별도 검증 대상이다.
왼쪽 확장은 root를 추가 폭만큼 왼쪽으로 옮기고 body 위치를 보정하며 표식 미디어만 왼쪽으로 확장한다.
OFF는 추가 위치·여백 속성도 복구한다. 임의 사이트의 positioned body 호환성은 아직 보장하지 않는다.
자료: https://webkit.org/blog/18486/webkit-features-for-safari-27-1/

실제 검사에서 고정 버튼을 문서 폭 밖(오른쪽 x=414, 폭 44)으로 옮기면 접근성 요소는 존재해도
`isHittable=false`였다 (`ui-mzl7blw5`, 전체 화면 전환 검사는 존재 여부만 보므로 이 실패를 대신하지 못한다).
따라서 적용 전 8px 여백 → 적용 후 0px 여백으로 문서의 터치 가능한 끝까지 이동한다.
배경 확장 영역까지 버튼을 옮기는 요구는 현재 Safari 입력 영역 제약으로 충족하지 못하며 완료로 주장하지 않는다.

사용자 후속 조정: 세로 중앙은 문서의 보이는 높이가 아닌 실제 화면 높이를 기준으로 한다.
외부 세로 screen.height=678에서 버튼 중심은 339px다(기존 viewport.height=580 기준 290px보다 49px 아래).
가로는 회전된 짧은 screen 치수의 절반을 사용한다. 키보드/확대 때는 VisualViewport 안으로 제한한다.
오른쪽의 현재 최대 위치는 문서의 터치 가능한 끝이며, 배경 끝까지 이동하는 방식은 실패 근거를 유지한다.

## 최신 결정: 실패한 왼쪽 확장 차단과 상태 보존

사용자 첨부 화면 및 동일 자세 재현에서 왼쪽 줄무늬 확장이 표시되지 않았다.
기존 회전 PASS는 버튼 이동/터치 근거이며 왼쪽 배경 픽셀 성공 근거가 아니다.
기존 왼쪽 root/body 위치 이동 구현은 폐기한다. 미지원은 버튼 disabled, 변경 OFF 복구,
저장 설정 불변, 지원 조건 복귀 시 기존 automatic 적용, 수동 OFF 보존으로 처리한다.
버튼은 적용/복구 시 이동하지 않는다. 위 절의 8px 이동·왼쪽 CSS 구현 결정은 이 결정으로 대체한다.
추가 RTL/스크롤/overflow 실험은 대상 594px 외부 화면 대신 678px 뷰포트로 전환된 실행이 섞였으므로
왼쪽 대응 가능/불가의 검증 근거로 사용하지 않는다. 모든 기법의 원천 불가능을 주장하지 않는다.

최신 사용자 요청: 미지원 왼쪽 자세에서는 비활성 버튼도 표시하지 않고 제거한다. 복구/설정 보존/지원 복귀 정책은 유지한다.
