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

## 현재 상태 (2026-11-19, v0.2)
- 저장소: samuraiscene-alt/joon-mail-sender (public), GitHub Pages 배포.
- Google Cloud 프로젝트 ID: joon-mail-sender. OAuth 웹 클라이언트의 JavaScript origin은 https://samuraiscene-alt.github.io 로 설정.
- gmail.compose 권한, 테스트 사용자로 OAuth 인증 연결 성공. 직접 발송 및 첨부 포함 Gmail 초안 생성 실기기 테스트 성공 (v0.1).
- v0.2 변경: 기기 내부 주소록 저장/선택/수정/삭제, 여러 수신자 개별 발송·개별 초안, 텍스트 자동 저장, 주소록 백업 추가. GitHub 코드 반영 완료, iPhone 실기기 재검증 필요.
- 발송은 최대 30명/회로 제한. 선택 목록이 있으면 그 목록 우선, 없으면 직접 입력 수신자 사용. 개별 메일로 상대방 주소 비공개.
- Gmail OAuth 앱은 테스트 상태. 지인에게 배포하려면 공개 앱 검증/보안 요구사항 별도 확인 필요.
- 기존 저장소: IndexedDB('joon-mail-v1') data store에 message/history/contacts. 기존 데이터 유지. 클라이언트 ID는 localStorage 사용. 비밀번호/토큰은 GitHub에 커밋하지 않음.

## v0.2.1 첨부 오류 및 수정 (2026-11-19)
- 아이폰 주소록 2명 선택 후 Gmail 초안 생성 시 두 건 모두 `The object can not be found here.` 오류 발생.
- Gmail API 응답보다는 IndexedDB에 저장한 File 객체의 참조가 만료된 문제로 추정되며 단정할 수 없음.
- app.js에서 새로운 첨부파일은 원본 파일 바이트를 base64 문자열로 변환해 IndexedDB message.files에 저장. 기존 File 객체는 자동 복구하지 않음.
- 초안 생성/발송 전 첨부 데이터 검사. 문제가 있으면 사용자에게 파일 재선택 요구하고 발송 차단.
- JSON 백업/복원은 base64 포맷을 사용하고 과거 버전 백업 파일 읽기 지원.
- cache v0.2.1 / UI v0.2.1. 아이폰 재테스트 대기 (주소록 2개 선택, 파일 다시 선택, Gmail 초안 생성, 첨부 확인).

## v0.2.2 화면 재배치 (2026-11-19)
- UI 순서: 메일 작성 → 메일 주소 목록함 (등록 기능) 및 별도 '주소록 다중 선택' 아코디언 → 발송 방식 → 저장된 메일과 백업 및 '기기 내 발송 기록' 아코디언 → 맨 아래 Gmail 연결 아코디언.
- 주소록 다중 선택, 기기 내 발송 기록, Gmail 연결은 처음에 접혀 있음. 주소록 선택 인원은 펼치기 버튼에 표시.
- 앱 아이콘, OAuth 설정, IndexedDB 자료, Gmail API 발송 로직은 그대로 유지.
- GitHub 코드 반영 후 iPhone Safari·홈 화면·직접 링크 세 환경에서 수동 점검 필요.

## v0.2.3 캐시 동기화 (2026-11-19)
- 주소록 내부 선택 2명과 아코디언 요약 0명 불일치 보고.
- 최신 app.js는 이미 contactSummary와 contactCount를 함께 업데이트하므로 과거 app.js가 새 HTML과 같이 로딩된 혼합 캐시 가능성. 원인 가설이며 실기기 검증 전.
- index.html에 app.js?v=0.2.3, style.css?v=0.2.3 명시. sw.js 캐시 v0.2.3으로 변경. 데이터 유지.

## v0.3.0 Apple 스타일 UI 및 발송 기록 관리 (2026-11-19)
- 기존 노란 봉투 아이콘(icon-192.png, icon-512.png) 변경 금지. iPhone apple-touch-icon, manifest.webmanifest에서 참조. 홈 화면 아이콘 갱신은 iOS 자체 캐시의 영향을 받음.
- UI: 둥근 흰색 카드, 연한 회색 배경, 노란 주요 버튼, 가로형 발송 방식, 주소록 2줄 정렬(첫 줄 체크+형광 이름+수정, 둘째 줄 이메일).
- 기록: IndexedDB history 최대 1000건; 날짜별 그룹, 전송/초안/실패 표시, 개별·다중·전체 삭제. Gmail의 실제 메시지는 삭제하지 않음.
- 주소록 입력 오류는 contactError 영역에 표시. 상태 메시지가 발송 결과와 혼동되지 않도록 분리.
- js/css?v=0.3.0, service worker cache=joon-mail-v0.3.0. 기존 IndexedDB 이름/구조 및 OAuth 설정 불변.
- 실기기에서는 iPhone Safari/홈화면/직접 링크, 기존 첨부파일 보존, 주소록 선택, 전송·초안·기록 삭제를 검사해야 함.

## 추후 권장 단계
1. 본인 GitHub 저장소 생성 및 배포 연결.
2. Google Cloud Gmail API + OAuth 클라이언트 세팅.
3. 본인 테스트 계정 실메일 1건과 초안 1건, 첨부 확인.
4. iOS 홈 화면에서 인증 및 초안 열기 검증, 필요한 동작 수정.
5. 지인 배포 전에 OAuth 검증/개인정보 처리방침/테스트 계정 요구사항 확인.
