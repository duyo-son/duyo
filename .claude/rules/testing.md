---
paths:
  - "Tests/**"
  - "scripts/check-*.sh"
  - "scripts/harness-smoke.sh"
---
- 동작과 복구 불변식을 검사한다. 구현 문구를 그대로 비교하는 테스트를 늘리지 않는다.
- PASS/FAIL/BLOCKED/UNVERIFIED를 구분한다. Node의 DOM 모형은 실제 Safari 렌더링 검증이 아니다.
- 결함을 고친 뒤 해당 테스트를 먼저 실행하고, 새로운 위험 없으면 통과 검사를 반복하지 않는다.
