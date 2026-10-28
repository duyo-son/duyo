---
name: safari-poc
description: DUYO의 Safari 너비 확장 가설을 실험하고 복구와 렌더링 결과를 검증
disable-model-invocation: true
---
1. ADR-002와 `docs/technical/TEST_STRATEGY.md`를 읽는다.
2. `bash scripts/check-fast.sh` 후 실험 페이지와 Safari 확장에서 가설 A~F를 독립 실행한다.
3. 뷰포트 수치와 실제 스크린샷·터치를 구분한다. Chromium 결과로 Safari를 대체하지 않는다.
4. OFF 복구와 원래 없던 meta/style의 제거를 확인한다.
5. 결과·환경·증거 경로·실패 원인을 VIEWPORT.md와 STATE에 기록한다.
6. 핵심 실제 렌더링이 BLOCKED/FAIL이면 제품 엔진 확정과 출시를 진행하지 않는다.
