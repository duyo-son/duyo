# 품질 게이트

| 단계 | 검사 | 실패 처리 |
| --- | --- | --- |
| 하네스 | `bash scripts/harness-smoke.sh` | 설정/Hook 수정, 실제 CLI 인식은 별도 표시 |
| 코드 변경 | `bash scripts/check-fast.sh` | 해당 검사 실패를 먼저 수정 |
| 레이아웃 | A~F 독립 실험 + OFF 복구 | DOM 수치 성공을 실제 화면 성공으로 대체 금지 |
| 주요 변경 | `bash scripts/check-full.sh` + 필요한 리뷰 | 빌드/실제 통합 미실행이면 완료 아님 |
| 출시 | Duo 기기/회전/확장 로딩/터치/다국어/보안 + 전체 검사 | 미검증이면 제출 금지 |

PASS=해당 환경에서 실제 검증 성공, FAIL=실제 실패,
BLOCKED=실행 환경 제약, UNVERIFIED=미실행. 상태의 적용 환경을 항상 명시한다.
Node DOM 모형은 복구 로직 검증만 가능하다. Safari 시스템 버튼 영역 렌더링과 터치는 실제 기기가 필요하다.
일반 검토는 `/ponytail-review`, 중요한 독립 검토만 Reviewer를 쓰며 중복 실행하지 않는다.
상태 기록: [STATE.md](STATE.md), 렌더링 절차: [TEST_STRATEGY.md](../technical/TEST_STRATEGY.md).
