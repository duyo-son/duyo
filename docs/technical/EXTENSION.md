# Safari 확장과 제어 흐름

구현: `SafariWebExtension/manifest.json`, `settings.js`, `auto.js`, `poc.js`, `popup.*`.
호스트: `DUYO/DUYO/DUYOApp.swift`. 결정: [ADR-004](../adr/004-automatic-controls.md).

## 자동/플로팅

HTTP(S) 최상위 문서의 document_idle에서 poc → settings → auto 순서로 로딩한다.
Safari가 허용한 웹사이트에서만 실행하며 별도 사이트별 설정은 없다. 최초 전역 기본값은 automatic/floating 모두 true다.
`auto.js:refresh()`는 storage.local의 `preferences`만 읽는다. 저장 필드는 automatic/floating bool과 선택 모드(mode)다.
잘못된 저장값은 두 기능을 끄고, 키 자체가 없으면 기본값을 사용한다. 방문 hostname/URL은 저장하지 않는다.

`settings.js:expansionWidth()`는 관측된 clientWidth/screen.width의 1~256px 추가 공간을 사용한다.
내부 화면처럼 추가 공간이 없으면 auto.updateLayout이 레이아웃을 복구하고 버튼을 제거한다.
외부 화면으로 돌아오면 설정에 따라 재적용/표시한다. 하드웨어 접힘 API를 사용하는 구현이 아니다.
검증된 범위/제약은 [VIEWPORT](VIEWPORT.md)에 기록한다.

플로팅은 Shadow DOM의 기본 HTML button이다. 최소 44px, 키보드 포커스, 영어 aria-label/pressed 상태를 제공한다.
WebKit 접근성 트리에는 Switch로 노출되므로 XCTest는 label로 찾는다.
Restore는 현재 페이지를 복구하고, 같은 외부 화면의 resize/다른 탭 설정 저장으로 취소되지 않는다.
이 수동 복구 상태는 새 문서 또는 추가 공간 없는 내부 화면을 거칠 때 초기화된다.
전역 스위치는 바꾸지 않는다. 버튼 표시를 끄면 삽입한 host를 제거한다.

## 팝업

```text
activeTab/HTTP(S) 확인 → 전역 스위치 읽기 → 스크립트 중복 방지 주입 → snapshot
Apply → 전역 스위치 저장 → 명시적 실험 메시지 → 적용/복구 결과 표시
```

기본 UI는 영어다. Full Width/Protected background/OFF를 선택할 수 있으며 Smart는 아직 미구현이다.
measure/snapshot 진단은 저장값을 바꾸지 않는다. OFF는 현재 페이지 복구이며 전역 자동 설정은 별도다.
명시적 수동 메시지는 오래 걸린 초기 설정 조회보다 우선하며 revision으로 오래된 응답을 무시한다.

## 권한/보안

activeTab, scripting, storage와 HTTP(S) content_scripts.matches만 사용한다.
별도 tabs/host_permissions/<all_urls>/nativeMessaging 권한은 없다. Safari의 사이트 접근 허용을 우회하지 않는다.
재방문 자동 실행에는 content script의 웹사이트 접근 선언이 필요하며, 사용자는 Safari에서 모든 웹사이트 허용을 선택한다.
[Apple 권한 문서](https://developer.apple.com/documentation/safariservices/managing-safari-web-extension-permissions).

CSP는 script-src self/object-src none이다. 원격 코드, eval, fetch, 사용자 입력 수집, 브라우징 기록 저장은 없다.
네이티브 handler는 빈 응답만 반환하며 메시지/프로필을 기록하지 않는다. App Group은 사용하지 않는다.
Apple은 iOS 호스트에서 JavaScript로 직접 메시지를 보내는 API를 지원하지 않으므로 호스트에 가짜 Apply를 만들지 않는다.
[Apple 메시징](https://developer.apple.com/documentation/safariservices/messaging-between-the-app-and-javascript-in-a-safari-web-extension).

업데이트 전부터 열린 탭은 새로고침이 필요할 수 있다. Safari 권한 거부 페이지/내부 페이지에서는 적용할 수 없다.
전체 자동 제어와 페이지 최초 로딩은 실제 XCTest로 검사하며, 결과/출처는 [테스트 전략](TEST_STRATEGY.md)을 따른다.

확장 아이콘은 메인 앱의 AppIcon 원본을 재사용해 icons/icon-128.png와 icon-256.png로 제공한다.
manifest.icons와 action.default_icon에 같은 경로를 지정하고 Xcode 확장 리소스에 icons 폴더를 포함한다.
