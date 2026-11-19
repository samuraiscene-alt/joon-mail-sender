# JOON Mail Sender v0.1

아이폰 홈 화면 설치용 무료 PWA. 아이콘은 사용자가 제공한 원본 이미지를 비율 변경 없이 리사이즈하여 사용합니다. 원본 `icon-source.png`도 포함합니다.

## 포함 기능
- 이메일 주소/제목/본문/복수 첨부파일 기기 저장 (IndexedDB)
- 1번: Gmail API `users.messages.send` 실제 전송 (재확인 팝업 포함)
- 2번: Gmail API `users.drafts.create` 첨부 포함 초안 생성. Gmail 임시보관함에서 *사용자가 직접* 최종 발송
- 내보내기/복원 JSON, 최근 100건 로컬 발송·초안 생성 이력, iPhone 홈 화면 설치
- 다른 사용자도 별도의 본인 Gmail로 로그인하도록 설계 (앱 개발자의 Gmail 비밀번호·토큰 공유 없음)

## 실행 준비 — 반드시 필요
1. 코드 파일 전체를 **본인이 소유한 GitHub 저장소**의 루트에 업로드하고 Settings → Pages에서 main/root 배포. HTTPS URL 확보.
2. Google Cloud Console에서 프로젝트 생성, Gmail API 활성화.
3. Google Auth Platform에서 OAuth 동의 화면 구성 및 웹 애플리케이션 클라이언트 ID 생성.
4. 승인된 JavaScript 원본(Authorized JavaScript origins)에 Pages 실제 origin `https://<계정>.github.io`를 등록. GitHub Pages 커스텀 도메인 사용 시 도메인도 등록.
5. 웹앱의 Google OAuth 웹 클라이언트 ID 칸에 설정 후 Gmail 연결. OAuth 권한: `https://www.googleapis.com/auth/gmail.compose`.
6. iPhone Safari에서 배포 URL 열고 공유 → 홈 화면에 추가.
7. 실제 계정으로 본인에게 테스트 메일을 보내고, 임시보관함 초안과 첨부를 확인.

## 무료 지인 배포 관련 중요 제약
- **무료 배포는 설계상 가능하지만 모든 Gmail 사용자에게 곧바로 승인되는 것은 아닙니다.** Google OAuth 앱이 Testing인 동안에는 승인된 테스트 사용자만 연결할 수 있고 테스트 사용자 수와 토큰 유효 기간에 제약이 있습니다.
- 일반 공개(External production)에는 Google OAuth 검증이 필요할 수 있습니다. Gmail 권한은 민감/제한 범위로 분류되므로 제출 전 Google의 현행 요구사항을 확인하세요. OAuth 앱 검증은 승인 보장이 없으며 보안 평가 및 비용이 발생할 수 있습니다.
- GitHub Pages는 정적 웹 호스팅이며 OAuth 권한을 대신 승인하지 않습니다. 지인 각자가 본인 Google 계정으로 동의해야 합니다.
- 이 버전은 외부 서버에 메일 내용·첨부파일을 저장하지 않습니다. 단, Gmail 전송 시 Google로 데이터가 전달됩니다.
- Gmail/Google API 이용한도, 브라우저 저장공간 용량, 사용자/조직 보안 정책에 따라 제한될 수 있습니다.

## 사용상 주의
- 파일 최대 합계 10 MiB (앱 자체 제한). 파일은 브라우저 저장공간에 저장되므로 앱 삭제/사이트 데이터 삭제/사파리 저장공간 정리에 유의.
- 백업 JSON에는 첨부파일과 본문이 평문으로 포함됩니다. 제3자에게 전달하지 마세요.
- OAuth 액세스 토큰은 메모리에만 존재하므로 앱 재시작 시 다시 Google 연결이 필요할 수 있습니다.
- **OAuth 실제 구글 계정 로그인과 실발송은 개발자의 설정이 없는 관계로 아직 검증되지 않았습니다.** v0.1은 실행 가능한 초기 소스이며 완제품/배포 완료를 의미하지 않습니다.
- iOS PWA 구글 OAuth 팝업과 Gmail 임시보관함 전환은 기기별 실사용 시험 필요.
- 첨부된 PDF/파일은 사용자가 골라 앱에 저장한 경우에만 재사용됩니다.

## 인수인계 및 재배포
`PROJECT_HANDOFF.md`, `DESIGN_SPEC.md`, `CHANGELOG.md`, 전체 소스 ZIP을 동일 저장소에 유지합니다. 다른 채팅에서 작업 시 GitHub URL/저장소의 최신 파일을 기준으로 전체 검사하고 변경하세요. 변경 후 버전/서비스워커 캐시/로그 갱신.

**중요:** GitHub 저장소가 사용자 소유여야 다른 대화에서 접근 권한을 다시 연결해 수정·배포할 수 있습니다. 채팅 이동만으로 ChatGPT의 저장소 쓰기 권한이 자동 보장되는 것은 아닙니다.
