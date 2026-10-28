---
paths:
  - "**/*.swift"
---
- SwiftUI와 Apple 공식 프레임워크를 우선하고 SDK에 없는 API를 추정하지 않는다.
- Dynamic Type, VoiceOver, 다크 모드를 유지한다. 비공개 Settings URL을 사용하지 않는다.
- App Group은 실제 공유 필요가 확인될 때만 추가한다. 개인 Team ID를 소스에 넣지 않는다.
