# ADR-001 — 전체 아키텍처

날짜: 2026-10-27. 상태: PoC 구조 채택, 제품 구조는 실기기 검증 조건부.

문제: 서버나 추적 없이 Safari 웹페이지에만 최소 변경을 적용해야 한다.
선택: SwiftUI 호스트 + Safari Web Extension MV3. 초기 PoC는 `activeTab`/`scripting`만 사용하고,
팝업의 명시적 실행으로 현재 탭에 실험 코드를 삽입한다. 외부 의존성은 추가하지 않는다.
제품 설정의 원본은 확장 `storage.local`로 계획하되 PoC에는 저장 기능이 필요 없다.
호스트가 기본 설정을 변경하는 제품 단계에는 Apple native messaging을 검증한다.
App Group/UserDefaults 브리지나 동기화 계층을 미리 만들지 않는다.

대안: WKWebView 별도 브라우저는 Safari 페이지 확장 목표를 충족하지 않는다.
상시 전체 사이트 content script는 PoC에 불필요한 권한이다.
근거: Apple 공식 패키징 도구로 호스트/확장을 생성할 수 있고 현재 탭 실험에 서버가 필요 없다.
위험: 시스템 UI 뒤 영역 렌더링과 iOS Safari scripting 지원은 실제 검증이 필요하다.
검증: 기존 앱/타깃 없음, 변환기 도움말 확인. 실제 변환/빌드는 STATE에 기록한다.
관련 파일: `SafariWebExtension/manifest.json`, `popup.js`, `poc.js` (ADR 후 작성).

자료: [Safari web extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions),
[패키징](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari).
