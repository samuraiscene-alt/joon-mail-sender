# JOON Mail Sender — 프로젝트 인수인계

## 고정 요구사항
- 앱 이름: JOON Mail Sender. 아이콘은 제공된 노란 봉투 PNG를 **임의 수정 없이 사용**.
- iPhone Safari / 홈 화면 PWA 우선. 지인 무료 사용, 각자 본인의 Gmail 연결.
- 저장 수신자/제목/본문/첨부를 원터치 불러오기. 발송 유형 1=확인 후 앱에서 즉시 전송, 유형 2=Gmail 초안 생성 후 Gmail에서 사용자가 최종 전송.
- 내부 저장소 IndexedDB. 백업/복원. 캐시 버전 관리.
- 단일 사용자 앱 계정이 아님: 본인 Gmail OAuth 연결 및 개인 기기 로컬 데이터 분리.

## 권한·배포 운영 정책
- **GitHub 사용자 소유 저장소**를 소스 오브 트루스(Source of Truth)로 지정.
- 배포 GitHub Pages, OAuth 설정은 Google Cloud 소유자가 관리.
- ChatGPT 대화창을 옮기더라도 이 인수인계 문서 및 저장소를 통해 개발 재개 가능. 쓰기/배포 권한은 GitHub 연결 상태, 저장소 권한, 플랫폼 정책에 따름. 자동 승계 약속 불가.
- 새 버전 배포 시 앱 파일 전체 검사, CHANGELOG 및 캐시 식별자 변경, Safari/홈앱 테스트 3채널 확인.
- 기기 데이터는 버전 교체 시 유지; schema migration 필요한 경우 백업 및 복구 테스트.

## 현재 상태
- v0.1: 로컬 PWA 전체 소스 및 사용자 PNG 아이콘 포함.
- Gmail OAuth ID 미설정 / Google Cloud 미구성 / 저장소 미생성 / 실발송 미검증 / 외부 공개 OAuth 검증 미완료.
- 1·2번 방식은 UI 및 API 요청 로직 구현. 테스트/프로덕션 승인 필요.

## 추후 권장 단계
1. 본인 GitHub 저장소 생성 및 배포 연결.
2. Google Cloud Gmail API + OAuth 클라이언트 세팅.
3. 본인 테스트 계정 실메일 1건과 초안 1건, 첨부 확인.
4. iOS 홈 화면에서 인증 및 초안 열기 검증, 필요한 동작 수정.
5. 지인 배포 전에 OAuth 검증/개인정보 처리방침/테스트 계정 요구사항 확인.
