---
paths:
  - "SafariWebExtension/**"
---
- `docs/technical/EXTENSION.md`와 변경 대상의 호출부만 읽는다.
- 삽입한 노드와 변경한 속성만 복구한다. 페이지의 후속 변경을 과거 스냅샷으로 덮지 않는다.
- MutationObserver의 자기 호출 루프, resize 과다 실행, OFF 뒤 리스너 잔류를 검사한다.
- pinch zoom, 키보드, 링크, fixed/sticky 조작을 방해하지 않는다.
