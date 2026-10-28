# DUYO 상태

- Phase: 3~5 개발 미리보기. 제품/출시 완료 아님.
- 다음: Safari 로컬 fixture 권한/팝업 자동화 실패 수정 → 전체 검사 재실행 → 조작부 겹침 개선.
- 주요 파일: SafariWebExtension/{poc,settings,auto,popup}.js, Tests/SafariUITests.swift, Tests/duo_poc.py.
- 구현: 전역 automatic/floating 기본 ON, 선택 모드 저장, Full Width/보호 배경/OFF. 서버·방문기록 저장 없음.
- 버튼: 중앙 44×44, opacity 18%. 적용/복구 위치 고정. 미지원에서는 복구·숨김, 설정/수동 OFF 유지.
- 왼쪽 확장: FAIL/미지원. 내측/확장 불가 geometry에서 강제 확장하지 않는다.
- Full Width: root/body 확장, 동일 요청 중복 적용 방지, shrink-to-fit=no 임시 적용/복구.
- 한계: Full Width 콘텐츠와 Safari 조작부 겹침. 일반 사이트·실기기·전체 방향·Smart/다국어 미완료.
- Bundle ID: com.aeogae.DUYO. 구 yourCompany 앱은 artifacts/aeogae/legacy-backup 백업 후 제거.
- 개인 DEVELOPMENT_TEAM 제거. 앱 아이콘 사용자 수정 유지, 확장 아이콘과 README 동기화.
- 실행: bash scripts/run-simulator.sh — 실제 빌드/설치/실행 PASS. 공유 DUYO scheme 추가.
- 빠른 검사: Hook 6·YAML 11·Node 37·실행 스크립트 회귀 2개 PASS.
- 최신 UI 빌드: artifacts/app-store/build.log, TEST BUILD SUCCEEDED.
- 전체 검사: artifacts/app-store/full-check.log. 빌드/설치/리소스 대조 PASS, Safari 로컬 fixture 준비에서 DUYO 메뉴 찾기 FAIL. 전체 PASS 아님.
- 사용자 수동 ON 후 aeogae.com 촬영 테스트 PASS: artifacts/app-store/capture.xcresult.
- 스크린샷: artifacts/app-store/DUYO-screenshots.zip (4장, 1398×2034, alpha 없음).
- 촬영 한계: 확장 컷 조작부 가림, 팝업 컷 고정 Apply 가림으로 최종 제출 보류. 상세: docs/release/READINESS.md.
- 이전 실제 aeogae: repeat-fixed.xcresult 4회 적용/복구, rapid.xcresult 빠른 3연타/복구 PASS.
- 이전 실제 Safari: artifacts/left-edge/preferences.xcresult 설정/재로딩 PASS.
- 이전 오른쪽 PoC/본문·fixed 탭/핀치·OFF: artifacts/duo/ui-tw1d2r98. 회전 이벤트만으로 왼쪽 픽셀 성공을 주장하지 않는다.
- 공개 점검: 알려진 비밀키 패턴 미발견, 개인 서명 제외, MIT/OSS 문서 유지. push/스토어 업로드 없음.
- Ponytail 5.3.2 full. 테스트는 모델 호출 없이 스크립트 실행.
- 설계/기술: docs/adr/001~004, docs/technical/{VIEWPORT,LAYOUT_ENGINE,TEST_STRATEGY}.md.

- 아카이브: DUYO scheme에 Release ArchiveAction/Organizer 표시 명시. generic iOS 서명 포함 archive 및 codesign verify PASS: artifacts/archive/DUYO.xcarchive. 사용자 문제는 Archive 메뉴 비활성화(시뮬레이터 대상에서는 불가). Store export/upload는 미실행.

- 수출 규정: 자체 암호화 구현/라이브러리 없음 확인. 앱/확장 Info.plist에 ITSAppUsesNonExemptEncryption=false 추가, 새 서명 아카이브의 양쪽 plist 반영 PASS. artifacts/archive/DUYO-export-compliance.xcarchive. 기존 업로드 빌드는 별도 응답 필요, 새 빌드 업로드는 미실행.
