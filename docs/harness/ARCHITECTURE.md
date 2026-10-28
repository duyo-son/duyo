# DUYO 하네스 구조와 데이터 흐름

확인일: 2026-10-27. 이 저장소는 MIT LICENSE만 있는 초기 상태에서 시작했다.
제품 이름은 DUYO다. 기존 라이선스의 저작권 표시는 유지한다.

## 범위와 실행 순서

현재 범위는 하네스 → 공식 기술 조사/ADR → 수동 Safari PoC다.
영향 대상은 Claude 프로젝트 설정·조건부 규칙·수동 Skills·4개 역할·Hook·검사 스크립트,
PoC manifest/팝업/실험 코드, 자동 검사/HTML fixture, 근거와 상태 문서다.
기존 호출부·설정·테스트·제품 데이터는 없다. 공개 API나 사용자의 페이지 데이터를 마이그레이션하지 않는다.
초기 ADR과 실제 Safari 성공 기준을 정한 뒤에만 실험 코드를 작성한다.
제품 UI·사이트 설정·출시 자료는 핵심 PoC가 통과한 다음 구현한다.

```text
새 세션 ─ CLAUDE.md (목적/명령/선택적 문서 경로)
       └ SessionStart ─ hook.py ─ STATE 상위 24줄만 출력
사용자 요구 ─ 범위 식별 ─ 해당 소스 읽기 ─ paths가 일치하는 규칙 로딩
           └ 필요할 때만 /research 또는 /safari-poc 또는 /release
              └ 독립 대량 작업에 한해 역할 위임 (최대 2개)
소스 수정 ─ PostToolUse ─ 변경된 JSON만 파싱
Bash 호출 ─ PreToolUse ─ 명확한 직접 파괴 명령만 거부
작업 완료 ─ check-fast ─ 위험에 따른 review/check-full ─ STATE 갱신
```

`hook.py`는 표준 라이브러리만 사용한다. Hook이 다른 Claude 도구를 호출하지 않아
재귀가 없으며, 파일 수정 Hook에서 빌드나 전체 테스트를 실행하지 않는다.
정상 이벤트에서 파일 기록·외부 통신을 하지 않는다.
PreToolUse는 단순 명령과 ;/&&/||/|/& 체인에서 직접 `git reset --hard`, 강제 디렉터리 clean,
루트/현재 디렉터리/.git 강제 재귀 삭제를 차단한다.
임의 셸 문법·간접 실행·인증 정보 유출을 완전 검출하는 보안 경계는 아니다.
원격 셸 스크립트 실행과 비밀 취급은 CLAUDE.md의 작업 규칙 및 기본 도구 권한으로 관리한다.

## 역할과 모델

4개 정의는 상시 실행 프로세스가 아니다. Researcher/Architect/Reviewer는 쓰기 도구가 없고,
Implementer만 편집과 Bash를 받는다. Architect의 ADR 초안은 메인이 저장한다.
현재 전원 `model: inherit`; 호출 성공한 프로젝트 기본 별칭 `sonnet`을 상속한다.
일반 변경 검토는 Ponytail, 중요한 독립 검토만 Reviewer다.
정책 세부 사항은 [MODEL_ROUTING.md](MODEL_ROUTING.md), [TOKEN_POLICY.md](TOKEN_POLICY.md).

## 검증 계층

- 구조: JSON 파싱, Ruby 표준 Psych의 실제 YAML 파싱, 규칙 paths·수동 Skill·역할 도구 확인.
- 동작: Hook subprocess의 입력/출력, 차단/통과 명령, JSON 오류, 상태 복구 단위 테스트.
- 실험: Node 동작 테스트 → Safari 실험 페이지 → 패키징/확장 활성화 → Duo 실기기.
- 한계: 스크립트 통과는 Claude의 자동 문맥 로딩이나 Safari 확장 실행을 증명하지 않는다.

## 환경 확인과 최종 검증 상태

| 항목 | 직접 확인 결과 |
| --- | --- |
| Git | 초기 커밋, LICENSE만 존재, 기존 수정 없음 |
| Claude Code | 2.1.267, Bedrock 연결 설정 존재 |
| Ponytail | 5.3.2, 다른 저장소 범위 설치를 발견해 DUYO 범위 install 추가, CLI enabled |
| 기본 full | DUYO 재등록 후 일반 새 세션의 SessionStart full 주입 PASS |
| 개인 기본 모델(초기) | FAIL: 해당 설정 모델은 CLI 2.1.280 이상 필요, API 400 |
| 프로젝트 모델 | PASS: `--model sonnet` 실제 응답, 프로젝트 기본으로 지정 |
| Xcode/SDK | 명령 출력: Xcode 27.1 / iOS·Simulator SDK 27.1 |
| Duo 디바이스 타입 | simctl 목록에 존재 |
| Duo 런타임 | 2026-10-28 갱신: 27.1(24A94425) 설치/부팅, DUYO 설치/launch PASS |
| CLAUDE 자동 인식/조건부 로딩 | PASS: 실제 Claude 응답과 manifest Read 뒤 규칙 로딩 확인 |
| 프로젝트 Skills 인식 | PASS: 실제 init 목록에 research/safari-poc/release; 수동 절차 실행은 UNVERIFIED |
| Subagent 호출 | PASS: reviewer 1회 완료, 읽기 전용 manifest 검토; Glob 제한 후 Read로 완료 |
| Ponytail Review | PASS: 실제 공식 Skill 실행 완료, 셸 체인 누락 1건 수정 및 회귀 검사 추가 |
| Hook/검사 스크립트 | Hook subprocess PASS, 실제 SessionStart exit 0 확인; Pre/Post 실제 도구 흐름은 UNVERIFIED |
| 새 세션 재개 | PASS: 실제 새 Claude 세션이 SessionStart의 Phase와 CLAUDE 제품명을 보고 |
| GitHub 공개 적합성 | 소스에서 키/인증서/Team ID/절대 경로 검출 없음, artifacts 무시; 공개/업로드 수행 안 함 |

변환기 생성 및 서명 없는 시뮬레이터 SDK 빌드는 PASS다. 기존 macOS 검사는 Safari 세션 생성에서 BLOCKED다.
2026-10-28에 `Tests/duo_poc.py`와 DUYOUITests 타깃을 추가하여 실제 Duo Safari 페이지와
확장 팝업을 검증한다. MAIN world 픽셀 실험과 isolated world 주입 결과를 구분한다.
실제 렌더링/설치 결과는 [TEST_STRATEGY.md](../technical/TEST_STRATEGY.md)와 STATE에 기록한다.

## 공식 형식의 근거

- [설정](https://code.claude.com/docs/en/settings), [Hooks](https://code.claude.com/docs/en/hooks)
- [경로 규칙](https://code.claude.com/docs/en/memory), [Skills](https://code.claude.com/docs/en/skills)
- [Subagents](https://code.claude.com/docs/en/sub-agents), [모델](https://code.claude.com/docs/en/model-config)
- 설계 결정: [ADR-003](../adr/003-harness.md). 설명을 상시 프롬프트에 복제하지 않는다.
