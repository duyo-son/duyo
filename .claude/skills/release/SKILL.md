---
name: release
description: DUYO 공개 및 App Store 제출 자료와 개인정보·다국어·품질 게이트 확인
disable-model-invocation: true
---
1. STATE의 실기기 PoC와 QA가 통과했는지 확인한다. 미검증이면 출시 준비 상태를 명시한다.
2. `bash scripts/check-full.sh`와 Ponytail 리뷰, 비밀/서명 설정·권한·외부 통신 여부를 검사한다.
3. 한국어 개발 문서를 유지하고 영어·일본어·한국어 사용자 자료, 개인정보 처리방침,
   App Review Notes, MIT 고지, CHANGELOG를 실제 동작과 일치시킨다.
4. 누락과 실행 증거를 STATE에 기록한다. 저장소 생성·push·업로드는 별도 사용자 승인을 받는다.
