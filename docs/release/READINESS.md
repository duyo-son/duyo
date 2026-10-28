# 공개·스크린샷 점검 — 2026-10-28

판정: 개발 미리보기 소스 공개는 가능. App Store 출시 완료 판정은 보류.

## 공개 후보 검사

- 현재 공개 후보 텍스트 73개에서 알려진 개인키·GitHub/AWS/OpenAI 키 패턴 미발견. 패턴 검사는 모든 비밀을 보장하지 않는다.
- Git 이력은 MIT LICENSE 초기 커밋만 존재. 미커밋 파일까지 검사했다.
- 개인 DEVELOPMENT_TEAM 6곳 제거. 실기기/배포 시 각 개발자가 자신의 서명을 설정한다.
- 인증서·개인키·환경 파일·xcuserdata·빌드/테스트 artifacts는 .gitignore로 제외. p8/pfx도 추가.
- MIT LICENSE, README, CONTRIBUTING, SECURITY, PRIVACY, CHANGELOG, 최소 권한 GitHub Actions 존재.
- 제품의 외부 fetch/원격 JS/분석 SDK 없음. preferences만 extension local storage에 저장.
- HTTP(S) 전체 페이지 매칭은 새 페이지의 자동 적용에 필요. Safari 사용자 허용이 전제다.
- Ponytail 플러그인 코드는 포함하지 않으며 공식 설치 절차를 링크한다.
- 사용자 제공 아이콘을 사용한다. 이미지의 원저작권 계약·상표 권리까지 독립적으로 확인한 것은 아니다.
- 원격 저장소 생성·push·App Store 업로드는 하지 않았다.

## 실제 촬영

`artifacts/app-store/DUYO-screenshots.zip`에 4장. 이 폴더는 공개 Git에서 제외된다.

| 파일 | 실제 화면 | 사용 상태 |
| --- | --- | --- |
| 01-aeogae-original.png | aeogae.com 확장 복구 상태 | 비교용 |
| 02-aeogae-expanded.png | 동일 페이지 Full Width | 글자와 Safari 조작부 겹침이 보여 제출 보류 |
| 03-extension-controls.png | Safari DUYO 설정 팝업 | Apply가 아래 컨트롤 위로 겹치는 초기 화면이라 제출 보류 |
| 04-app-setup.jpg | SwiftUI 메인 안내 | 제출 후보 |

실제 Safari XCTest `testStoreScreenshots` PASS. 화살표로 OFF/재적용 후 촬영했고 렌더링을 합성하지 않았다.
모두 1398×2034, ZIP의 4장은 alpha 없음. 9:41 상태바만 시뮬레이터 명령으로 정리했다.
원본 메인 PNG의 alpha 때문에 전달본은 JPEG로 변환했다. 원본은 따로 유지한다.
공식 치수: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
App Store Connect의 실제 업로드 수락은 미검증. 모든 필수 기기 슬롯을 채운 세트는 아니다.

## 출시 전 남은 문제

Full Width 조작부 가림, 왼쪽 확장 미지원, 팝업 고정 Apply 가림, 실기기/전체 방향·접근성·일반 사이트 QA 미완료.
스크린샷을 수정해 결함을 숨기지 않았다. 제품 수정 후 최종 제출 이미지를 다시 촬영해야 한다.

## 이번 실행의 검증

- check-fast.sh: Hook 6개, YAML 11개, Node 37개, 실행 스크립트 회귀 2개 PASS.
- run-simulator.sh: 실제 빌드·설치·실행 PASS. UI 테스트 빌드도 PASS.
- check-full.sh: 빌드/설치/확장 리소스 대조 PASS 후 로컬 fixture의 DUYO 메뉴 진입에서 FAIL. 전체 검사는 미통과.
- 실패 증거: artifacts/duo/ui-90lqp91r/prepare.xcresult 및 xcodebuild.log.
- aeogae.com은 사용자가 DUYO를 켠 상태에서 실제 복구/적용/팝업 촬영 검사 PASS. 로컬 fixture 통합 실패와 구분한다.
