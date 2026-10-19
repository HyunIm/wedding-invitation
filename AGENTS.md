# AI 도우미를 위한 안내

Korean mobile wedding invitation, vanilla JS + GitHub Pages. 사용자는 비전공자일 수 있습니다. 한국어로 쉬운 말로 안내하세요. 제작 흐름은 README와 docs/ai-guide.md를 따르세요.

## 작업 규칙

- 개인 청첩장 내용·테마·순서는 config.js에서 수정합니다. 구현 변경 요청은 assets/, scripts/, 서버 코드도 수정할 수 있습니다.
- 키·한국어 주석을 유지하고 값만 변경합니다. 전체 파일을 전달할 때는 다운로드와 전체 코드 블록을 제공하세요. 새 설정 생성기는 설명 링크를 포함한 완전한 파일을 만듭니다.
- 이름·날짜·장소·표지 사진은 필수, 부모님·전화·계좌·좌표는 선택입니다. 값을 지어내지 마세요. firstName과 meta.title/description은 기본적으로 비워 자동값을 사용합니다.
- 공개 범위를 설명하고 사용자가 확인한 뒤 privacy.publishConsent를 true로 설정합니다. enabled:false는 비공개 기능이 아닙니다.
- 사진은 prepare.html에서 메타데이터를 제거한 사본만 업로드합니다. 배포 최적화는 공개 저장소의 원본과 Git 이력을 지우지 않습니다. HEIC는 실제 JPEG로 내보내야 합니다.
- 일반 빌드는 config.js만 사용합니다. demo/config.js와 demo 사진은 --demo를 명시한 빌드에서만 사용합니다. 데모를 사용자 청첩장의 기본값으로 복사하지 마세요.
- 새 빈 config.js는 정상적으로 검증에 실패합니다. 템플릿 구현 검증에는 `node scripts/build.mjs --demo`를, 사용자 청첩장 검증에는 `node scripts/build.mjs`를 실행하세요.
- templates/config.js 또는 docs/ai-guide.md를 수정하면 `npm run ai-pack`으로 docs/ai-start.txt를 갱신하세요.
- 구현 변경 후 `npm ci && npm test`, `node scripts/ai-pack.mjs --check`, 데모 빌드와 Python 사진 테스트를 실행합니다. 테스트 명령은 docs/testing.md에 있습니다.

## 구조

- config.js: 사용자의 실제 설정 (초기에는 빈 시작 설정)
- templates/config.js: 변경하지 않는 빈 시작 설정. 설정 생성기·AI 안내문·테스트의 기준
- demo/config.js: 시연용 데이터
- assets/config-utils.js: 브라우저·빌드 공용 스키마 검사와 자동값
- assets/app.js / style.css: 하객 화면
- setup.html / assets/setup.js: 기본 설정 생성과 내용 확인
- prepare.html / assets/photo-tools.js / prepare.js: 로컬 사진 정리·ZIP
- scripts/build.mjs: 검사, 경로 보정, OG/ICS, _site 배포본
- scripts/optimize_images.py: 배포본 축소·메타데이터 제거·썸네일
- google-apps-script/Code.gs: 현재 시트 한정 권한, 응답 검사·중복 완화·방명록 페이지 조회
- tests/: 설정, 빌드, 실제 렌더러 DOM, 서버 모의 실행, 사진 처리 회귀 테스트

로컬 개발에는 Node.js 24 LTS의 24.15 이상을 권장하며 CI도 24를 사용합니다. 지원 범위는 package.json을 참고하세요. 배포에는 npm 런타임 의존성이 없습니다. UI 텍스트는 esc()/nl2br()로 이스케이프하고 URL과 자료형은 공용 검사에 반영하세요.
