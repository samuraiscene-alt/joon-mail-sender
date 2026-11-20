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

## v0.3.1 UI 캐시 호환 패치
- iPhone에서 v0.3.0 HTML이 적용됐지만 CSS 중 자동 저장 배지 및 가로 발송 선택 UI가 나타나지 않는 화면 보고.
- index.html에 핵심 UI 스타일을 인라인 추가하고 app.js/style.css 쿼리를 v0.3.1로 변경. SW CACHE 갱신.
- 기존 아이콘, IndexedDB, 이메일 발송 로직은 변경하지 않음. 실기기에서 최신 CSS 반영 확인 필요.

## v0.3.3 아코디언 변경 (2026-11-19)
- 저장된 메일과 백업 패널 전체를 backupAccordion(details)으로 감싸 기본 접힌 상태로 표시.
- 펼치면 백업·복원 버튼 및 중첩된 기기 내 발송 기록 아코디언 표시.
- 첨부파일 선택도 attachmentAccordion(details)으로 접혀 있고 제목에서 첨부 건수 표시.
- HTML, SW JS/CSS 버전 v0.3.3으로 동기화. IndexedDB 및 Gmail 엔진 불변.

## v0.3.4 (2026-11-19)
- 상단 화면 제목과 페이지 타이틀 Multi Mail Sender로 변경. 홈 화면 설치 이름 JOON Mail 및 기존 노란 봉투 PNG 아이콘은 유지.
- 새 메일 작성 버튼만 파란색 강조. 클릭 처리 함수는 변경하지 않아 확인창과 중앙 V 체크 유지.
- 앱 데이터, IndexedDB, 발송 로직 변경 없음. 캐시 v0.3.4.

## v0.3.6 (2026-11-19)
- 메일 작성, 메일 주소 목록함, 발송 방식 선택 3개 제목을 독립된 outsidePanelHeading으로 흰색 카드 바깥에 배치.
- 기능 영역 section은 detachedPanel 스타일만 부여. DOM ID, 기존 업무 로직, 입력 필드 데이터는 불변.
- SW cache와 HTML 참조 쿼리 v0.3.6. 아이폰에서 확인 필요.

## v0.4.0 카테고리별 주소록 (2026-11-19)
- 카테고리 기본값 회사/친구/쇼핑/거래처. IndexedDB('joon-mail-v1')의 data store에 'categories' 키를 추가 (DB 스키마 변경 없음).
- 기존 contacts는 그대로 유지; 런타임에서 category 또는 categories를 해석하고 분류 없으면 미분류. 각 연락처는 categories 문자열 배열을 가질 수 있음.
- 메일 주소 목록함에서 카테고리 체크 후 저장 및 수정. '주소록 다중 선택' 내부에 카테고리별 접기/펼치기와 그룹 전체 선택/해제, 기존 전체 선택/해제/삭제 유지.
- 같은 이메일을 여러 그룹에 넣어도 selectedContacts Set과 selectedRecipients에서 중복 제거. 직접 입력 주소는 선택된 주소록이 없을 때만 사용.
- 카테고리 이름 수정/삭제해도 연락처 자체는 유지. 제거된 그룹에만 속했다면 미분류로 표시.
- 전체 JSON 백업/복원에 categories 추가, 기존 백업에서 categories 누락 시 기본값 적용.
- GitHub 코드 반영 v0.4.0. Safari/홈화면/직접 링크 기능 검증은 아직 필요. 기존 192/512 노란 봉투 아이콘 유지.

## v0.4.1 카테고리 UI 단순화
- 주소록 다중 선택 아코디언 내부에 categoryBookAccordion 및 categoryManagerAccordion를 기본 닫힌 상태로 분리.
- 연락처 이름/이메일을 입력한 뒤 주소록에 추가를 누르면 contactCategoryDialog.showModal()이 열리고 카테고리 선택 후 저장. 기존 연락처 수정도 동일 팝업 흐름.
- 취소 시 입력값 유지, 저장하지 않음. 카테고리 복수 선택/미분류 저장, 모든 기존 데이터 보존.
- v0.4.1 PWA/쿼리 캐시 동기화. iPhone Safari/홈앱 검증 필요.

## v0.5.0 2D 메일 전송 진행 애니메이션
- 발송 확정 후 sendProgressOverlay를 열고 SVG+CSS의 작은 2D 모래시계/큰 편지 발송 루프를 표시.
- Gmail 개별 발송 success 응답 시에만 updateSendProgress(done,recipients.length)로 진행 막대 업데이트. 초안 생성도 동일 진행 화면 사용하되 초안 완료를 실제 발송 성공이라 표시하지 않음.
- 전송 종료 후 오버레이 닫음; 전원 성공 시 기존 중앙 원형 V 체크 표시. 실패 시 기존 결과 상태 문구 유지.
- IndexedDB, 기존 첨부/주소록/카테고리, OAuth 클라이언트 및 아이콘 불변. CSS/JS v0.5.0 + SW 캐시 정렬. 아이폰 실기기 테스트 필요.

## v0.5.1 (2026-11-19)
- 진행 오버레이는 전송 확정 후 최소 1500ms 노출; 실제 Gmail 응답이 더 오래 걸리면 실제 종료까지 계속 표시.
- 종료 시 260ms 부드러운 사라짐, 전원 Gmail 실제 발송 성공 시에만 기존 중앙 V 체크. 기존 상태 메시지와 부분 성공/실패 처리는 유지.
- 전송 버튼 비활성/열린 확인창 가드를 통해 중복 발송 확인창 진입 방지.
- v0.5.1 JS/CSS/SW 버전 동기화; iPhone 테스트 필요.

## v0.5.2 OAuth 사전 점검 / 남은 대상 전송 재개 (2026-11-20)
- app.js requestGmailAccess()에서 이전에 연결된 유효한 메모리 토큰은 재사용. 최초 연결/만료/앱 재실행 등에서는 사용자가 '전송 진행' 또는 'Gmail 연결'을 직접 누른 동작 안에서 Google OAuth 팝업 요청.
- Google이 반환하는 expires_in으로 토큰 만료 시각 관리. 전송 중 401이면 토큰을 비우고 중지. 403은 인증 만료로 자동 취급하지 않음.
- 진행 배치는 pendingBatch(메모리)로 보존: saved 메일/첨부 스냅샷, mode, recipients, nextIndex, completed Set, failures. 재연결 후 resumePending으로 다음 미처리 수신자부터 재개.
- Gmail API 성공이 확인되면 로컬 기록 저장 성공 여부와 관계없이 completed에 포함하여 자동 중복 전송을 방지.
- pendingBatch는 페이지 reload/프로세스 종료 때 사라짐. 나중에 영속 재개가 필요하면 중복 발송 및 API 응답 불확실성에 대한 별도 설계 필수.
- refresh token을 브라우저 저장소에 저장하지 않음. 완전 무인 자동 재인증 보장하지 않음.
- HTML/CSS/JS/SW v0.5.2, 기존 아이콘/IndexedDB 및 백업 데이터는 변경하지 않음. iOS 실제 Google OAuth 팝업 테스트 필요.

## v0.5.3 주소록 백업 및 선택 초기화 (2026-11-20)
- 기존 전체 JSON 백업에 주소록/카테고리가 포함되어 있었고, 주소록 전용 exportContacts/restoreContacts 버튼을 backupAccordion에 추가.
- 전용 포맷 joon-mail-contacts-v1; 기존 전체 백업(joon-mail-v1)의 contacts/categories도 전용 복원에서 받아들임.
- 주소록만 복원하면 기존 주소는 보존, 이메일 기준 중복 무시, 새로운 주소와 카테고리 병합. 여러 개 키를 한 IndexedDB 트랜잭션에 기록.
- addressSelection / categoryBookAccordion 닫으면 selectedContacts 비우고 체크 UI 다시 그림. 개별 categoryGroup 닫을 때 해당 그룹의 선택 해제. 사용자가 메일 발송을 위해 체크를 유지하려면 선택창을 열어둬야 함.
- 백업 파일은 iPhone Files/클라우드에 수동 보관해야 함. 자동 원격백업은 없음. iPhone 실제 재검증 필요.
- CSS/JS/HTML/SW v0.5.3.

## 추후 권장 단계
1. 본인 GitHub 저장소 생성 및 배포 연결.
2. Google Cloud Gmail API + OAuth 클라이언트 세팅.
3. 본인 테스트 계정 실메일 1건과 초안 1건, 첨부 확인.
4. iOS 홈 화면에서 인증 및 초안 열기 검증, 필요한 동작 수정.
5. 지인 배포 전에 OAuth 검증/개인정보 처리방침/테스트 계정 요구사항 확인.
