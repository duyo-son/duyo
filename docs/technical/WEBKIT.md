# WebKit 근거와 실제 환경

조사일: 2026-10-27. 관련 결정: [ADR-001](../adr/001-architecture.md), [ADR-002](../adr/002-viewport-poc.md).

## 확인한 공식 사실

- [WebKit Safari 27.1](https://webkit.org/blog/18486/webkit-features-for-safari-27-1/):
  기본 웹 콘텐츠는 Safari 조작 영역 뒤까지 확장되지 않는다. 배경색 연장은 콘텐츠 렌더링과 다르다.
  viewport-fit을 포함한 향후 해법이 검토 중이므로 CSS 우회가 보장된다고 해석하지 않는다.
- 같은 자료의 `navigator.devicePosture`와 `window.viewport.segments`는 기능 플래그 뒤 프리뷰다.
  continuous 값은 펼침과 완전 접힘 모두에 해당하므로 외부 화면 판별값으로 사용할 수 없다.
  `poc.js: measure()`는 feature detection으로 값이 없으면 null을 반환하며 제품 분기를 하지 않는다.
- [Safe Area](https://webkit.org/blog/7929/designing-websites-for-iphone-x/):
  viewport-fit과 `env(safe-area-inset-*)`를 함께 고려해야 한다. 네 방향 보호가 필요하다.
  기존 iPhone X 설명이 Duo의 시스템 UI 뒤 터치를 보증하지 않는다.
- [Safari Web Extension](https://developer.apple.com/documentation/safariservices/safari-web-extensions):
  Safari 내 앱 확장으로 배포한다. 단독 WKWebView 브라우저와 다른 제품이다.
- [패키징](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari):
  Apple 도구가 Xcode 호스트/확장 프로젝트를 생성하며 원본 확장 폴더를 참조할 수 있다.
  로컬 `safari-web-extension-converter`는 동작하며 최신 문서 명칭은 packager다.
- [실행](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension):
  iOS는 호스트 앱을 빌드·설치한 뒤 Safari에서 확장을 켠다. macOS 임시 확장은 별도 절차다.

## 로컬 관측

`xcodebuild -version/-showsdks`: Xcode 27.1, iOS/Simulator SDK 27.1.
`simctl list devicetypes`에 iPhone Duo는 있지만 `list runtimes`에 iOS 27.1은 없다.
디바이스 타입이나 SDK 설치만으로 실제 시뮬레이터 실행 가능성을 주장하지 않는다.
macOS safaridriver는 Safari 27.2로 보고했고, 실제 세션은 원격 자동화 비허용으로 생성되지 않았다.
Xcode 프로젝트 생성과 서명 없는 빌드는 성공했다. 실제 실행/확장 로딩과 구분한다.

2026-10-28 갱신: 사용자가 iOS 27.1(24A94425) 런타임을 설치하고 Duo를 부팅했다.
DUYO 앱 설치와 launch가 성공했고 pluginkit에서 확장 번들이 확인됐다.
실제 Safari MAIN world fixture에서 CSS 폭 증가로 시스템 상태 영역 뒤에 줄무늬가 그려졌다.
이는 공식 기본 동작 설명과 구분되는 실제 overflow 관측이며 모든 사이트/안전한 터치를 보장하지 않는다.
정확한 수치/캡처와 남은 제약은 [VIEWPORT.md](VIEWPORT.md).
자동 좌표 입력으로 활성화 스위치를 켜지 못했지만 사용자가 직접 ON 성공을 확인했다.
이후 실제 XCTest에서 DUYO 팝업의 script 주입/측정 응답을 확인했다.
UI 입력 실패와 확장 자체의 동작 실패를 구분한다.

## 경쟁 앱 — 공개 주장만 비교

| 자료 | 공개 기능 | DUYO에 대한 의미 |
| --- | --- | --- |
| [Wide Web App Store](https://apps.apple.com/us/app/wide-web-full-screen-safari/id6818616702) | 외부 화면의 사진/배경 확장, 본문·상단 버튼 보호 | 별도 픽셀/터치 검증 필요 |
| [OutSpan App Store](https://apps.apple.com/us/app/outspan/id6814314176) | Wide/Off, 설정 유지, 로컬 실행 | 구현법 공개 증거 아님 |
| [Widen 공식 사이트](https://widen.challis.com.au/) | 이미지/본문 모드, 회전 대응, 가로 흔들림 억제 | 독립 구현의 검증 항목으로만 사용 |

타사 코드를 복사하거나 앱 설명만으로 기술 성공을 확정하지 않는다.
가격·기능은 바뀔 수 있으므로 출시 시 다시 확인한다.
