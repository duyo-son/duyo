# DUYO 하네스 설정과 사용법

기준: Claude Code 2.1.267 / 2026-10-27 공식 문서 확인.
`CLAUDE.md`와 이 문서는 프로젝트 로컬 파일이다. 개인 Bedrock 설정이나 인증 파일을 복사하지 않는다.

## Ponytail

`claude plugin list`에서 5.3.2 설치를 확인했다. 처음 disabled였으며
enable 후 CLI는 enabled를 표시했지만 실제 세션에는 플러그인이 로딩되지 않았다.
설치 기록의 projectPath가 다른 저장소였으므로
`claude plugin install ponytail@ponytail --scope project`를 DUYO에서 실행해 등록했다.
CLI enabled 표시와 실제 SessionStart 주입을 별도로 검사해야 한다.
플러그인 소스는 저장소에 복사하지 않았다. 새 개발자는 Claude Code에서 아래를 **별개 입력**으로 실행한다.

```text
/plugin marketplace add DietrichGebert/ponytail
```
```text
/plugin install ponytail@ponytail
```

설치 후 `/plugins`와 `/hooks`에서 상태를 확인하고 새 세션을 연다.
프로젝트 설정은 `enabledPlugins`와 환경 변수 `PONYTAIL_DEFAULT_MODE=full`만 선언한다.
`/ponytail full`, `/ponytail lite`, `/ponytail ultra`로 전환하고,
`/ponytail-review`, `/ponytail-audit`, `/ponytail band`는 필요할 때만 사용한다.
네임스페이스가 필요한 설치에서는 `/ponytail:ponytail full` 등 명령 목록에 표시된 형식을 따른다.
설치 기준 버전은 5.3.2이며 자동 고정/업데이트하지 않는다.
[공식 설치 문서](https://github.com/DietrichGebert/ponytail/blob/main/INSTALL.md).

## Settings와 Hooks

`.claude/settings.json`에는 호출 성공한 공식 별칭 `model: sonnet`을 사용한다.
계정별 모델 ID·계정·Team ID·비밀을 넣지 않는다. 개인 기본값과 전역 CLI는 변경하지 않는다.
공식 `hooks → 이벤트 → matcher → hooks → type/command/timeout` 형식을 사용한다.
명령은 `$CLAUDE_PROJECT_DIR`를 따옴표로 묶어 공백 경로에 대응한다.

| 이벤트 | 대상 | 실제 작업 |
| --- | --- | --- |
| SessionStart | startup/resume/clear/compact | STATE 최대 24줄과 검사 명령 출력 |
| PreToolUse | Bash | `scripts/hook.py`의 좁은 직접 파괴 명령 검사, deny JSON 반환 |
| PostToolUse | Write/Edit | 저장소 내부의 실제 변경 JSON만 파싱, 오류면 block 피드백 |

각 Hook 제한 시간은 5초다. 경량 검사와 전체 빌드는 명시적으로만 실행한다.
Hook 소스가 바뀌면 새 세션 또는 `/hooks`에서 실제 등록을 확인한다.
수동 재현은 다음과 같다.

```sh
printf '%s' '{"hook_event_name":"SessionStart"}' | python3 scripts/hook.py
bash scripts/harness-smoke.sh
bash scripts/check-fast.sh
bash scripts/check-full.sh
```

PreToolUse는 특정 직접 명령과 단순 셸 체인을 검사한다. 전체 셸 문법/간접 실행 분석기나 비밀 유출 감시기는 아니다.
검사 실패를 숨기거나 성공으로 변환하지 않는다. 전체 빌드 환경 부족은 종료 코드 2(BLOCKED)다.

## 조건부 규칙·Skills·역할

`.claude/rules/*.md`의 YAML `paths`가 맞는 소스를 읽거나 수정할 때만 해당 규칙이 로딩된다.
Swift → swift.md, 확장 소스 → web-extension.md, 테스트/검사 → testing.md,
manifest·팝업·Hook·entitlements·설정 → security.md. 전역 무조건 규칙 파일은 없다.

수동 `/research`, `/safari-poc`, `/release`에는 공식 `disable-model-invocation: true`를 적용했다.
이 요청으로 지시된 초기 조사는 메인 작업으로 수행한다. 이후 세션에서 명령을 임의 자동 호출하지 않는다.
4개 `.claude/agents/` 파일은 name/description/tools/model frontmatter를 사용한다.
`researcher`는 공식 조사, `architect`는 ADR 초안, `implementer`는 범위 내 구현,
`reviewer`는 근거 있는 독립 검토를 요청할 때 사용한다. 일반 작업은 메인이 처리한다.

Claude Code에서 `/memory`, `/skills`, `/agents`, `/hooks`로 실제 인식을 점검한다.
CLI의 `claude agents --json`은 이 버전에서 실행 세션 목록이므로 역할 인식의 증거로 쓰지 않는다.
실제 init 목록에서 3개 프로젝트 Skill·4개 역할이 인식됐으며 reviewer 호출도 완료했다.
실제 모델/도구 호출이 실패한 항목은 파일 파싱 성공과 별도로 UNVERIFIED를 유지한다.
최종 확인 결과는 [ARCHITECTURE.md](ARCHITECTURE.md)와 [STATE.md](STATE.md).
