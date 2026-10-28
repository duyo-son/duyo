# ADR-003 — Claude Code 하네스

날짜: 2026-10-27. 상태: 채택.

문제: 긴 마스터 프롬프트를 반복 로딩하면 비용과 세션 재시작 오류가 커진다.
선택: 짧은 CLAUDE.md, paths 규칙, 수동 Skills, 최소 권한의 4개 역할,
단일 STATE, 3종 가벼운 Hook과 fast/full/smoke 명령.
Ponytail 공식 5.3.2를 프로젝트에서 활성화하고 full을 환경 변수로 지정한다.
모델은 계정에서 호출 성공하기 전 inherit로 두고 임의 ID를 추가하지 않는다.

대안: 장문의 전역 프롬프트, 상시 다중 에이전트, 매 수정 전체 빌드,
자체 토큰/비용 추적기. 모두 중복 문맥·지연·유지 비용 때문에 제외한다.
근거: 공식 Frontmatter/Hook 형식을 사용하며 추가 패키지 없이 재현 가능하다.
위험: Hook은 보안 샌드박스가 아니고 static smoke는 실제 Claude 인식을 증명하지 않는다.
검증: Ponytail CLI enabled 확인, 기본 모델 API 400 확인.
설정/Hook subprocess 결과 및 미검증 CLI 항목은 ARCHITECTURE/STATE에 구분한다.

2026-10-28 갱신: 화면 위치와 상태가 변하는 Device Hub 좌표 입력을 제품 검증 근거로 사용하지 않는다.
Apple XCTest UI 타깃을 추가해 Safari의 실제 접근성 식별자·팝업 응답으로 주입/폭 변경/OFF를 검증한다.
check-full은 Duo 페이지 fixture 서버를 유지한 채 실제 빌드/통합 검사를 실행한다.
별도 GUI 자동화 패키지는 설치하지 않았다. 기존 macOS WebDriver 실험은 선택적으로 유지한다.

자료/실제 구조: [ARCHITECTURE.md](../harness/ARCHITECTURE.md),
[설정 사용법](../harness/CONFIGURATION.md), [토큰 정책](../harness/TOKEN_POLICY.md).
