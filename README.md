# 💌 무료 모바일 청첩장 템플릿

![청첩장 미리보기](docs/preview.jpg)

[데모 보기](https://hyunim.github.io/wedding-invitation/) · [기본 설정 만들기](https://hyunim.github.io/wedding-invitation/setup.html) · [사진 준비하기](https://hyunim.github.io/wedding-invitation/prepare.html)

## 🙋 한 줄로 시작하고, AI 안내를 따라 완성해요

링크를 읽을 수 있는 ChatGPT · Claude · Gemini 등에 이렇게 보내세요.

```
https://github.com/HyunIm/wedding-invitation 의 README에 있는 AI 도우미 안내를 읽고, 이 템플릿으로 내 모바일 청첩장을 만들어줘. 코딩과 GitHub를 모르니 한 단계씩 안내해줘.
```

AI와 필요한 정보를 정리한 뒤, **직접 GitHub에서 사진을 올리고 설정을 붙여넣어 공개**하는 방식입니다. 계정 가입과 서비스 연결은 본인이 진행해요. 한 번의 요청만으로 공개 주소가 자동 생성되는 것은 아닙니다.

**AI가 링크를 읽지 못하면:** [AI 시작 안내문](docs/ai-start.txt)을 열어 **안내와 빈 설정을 모두 복사**해서 AI에게 보내세요. 읽지 못한 원문을 추측해서 만들게 하지 마세요. 코드를 복사하기 어렵다면 [기본 설정 만들기](https://hyunim.github.io/wedding-invitation/setup.html)에서 파일을 내려받을 수 있어요.

**준비물:** GitHub 계정 · 공개할 사진 · 두 분의 이름 · 예식 날짜/한국시간 · 예식장 이름/주소 · 컴퓨터 권장.

## 🔓 공개 전에 알아두세요

- 무료 GitHub Pages를 사용하는 이 안내는 **Public(공개) 저장소** 기준이에요. 사진·연락처·계좌·설정 파일은 누구나 볼 수 있습니다. 링크를 아는 하객만 볼 수 있는 비공개 서비스가 아니에요.
- `enabled: false`는 화면에서만 숨깁니다. 비공개로 할 정보는 파일에서도 지우세요. 이미 저장한 내용은 Git 기록에 남을 수 있어요.
- **사진은 업로드 전에** [사진 준비 도구](https://hyunim.github.io/wedding-invitation/prepare.html)로 정리하세요. 이 도구는 브라우저에서 JPG 사본을 만들고 위치·기기 정보를 제거합니다. 원본은 바꾸거나 전송하지 않아요.
- 배포 때도 사진을 최적화하지만 **저장소의 원본은 변경하지 않습니다.** 원본의 위치정보를 보호하려면 처음부터 정리한 사본만 올려야 해요.
- HEIC/HEIF는 사진 앱에서 JPG로 **내보내기**가 필요합니다. 파일 이름의 확장자만 바꿔서는 안 됩니다.

## ✨ 들어있는 기능

표지·인사말·혼주·달력·D-day·갤러리·길찾기·교통/주차 안내·계좌 복사·공유 기능을 제공합니다. 글씨 크게 보기, 모바일 빠른 메뉴, 키보드로 조작 가능한 대화상자, 6가지 색상과 3가지 글꼴을 지원해요.

방명록·참석 응답은 구글 시트 연결 후 사용할 수 있어요. 카카오톡 공유 버튼도 별도 설정이 필요해요. **기본 청첩장을 먼저 완성한 뒤** 필요한 기능만 추가하세요. 카톡에 주소를 직접 붙여넣는 공유는 개발자 앱 없이도 가능해요.

## 📋 만드는 순서

아래 주소의 `내아이디`와 `저장소이름`은 본인 것으로 바꾸세요. AI에게 완성된 링크를 만들어 달라고 부탁해도 돼요.

1. [GitHub 가입](https://github.com/signup) 후 [내 청첩장 저장소 만들기](https://github.com/new?template_name=wedding-invitation&template_owner=HyunIm)를 여세요. Repository name은 `wedding`처럼 영어 소문자로, 공개 범위는 **Public**으로 선택합니다.
2. AI와 예식 정보를 정리하거나 [기본 설정 만들기](https://hyunim.github.io/wedding-invitation/setup.html)를 사용하세요. 이름·날짜·장소가 빈 시작 설정은 아직 배포할 수 없어요. 공개 범위 확인 후 `privacy.publishConsent`를 `true`로 설정합니다.
3. [사진 준비 도구](https://hyunim.github.io/wedding-invitation/prepare.html)에서 정리한 사본을 내려받으세요. ZIP은 압축을 풀어야 합니다. 표지 `cover.jpg`는 `https://github.com/내아이디/저장소이름/upload/main/images`에, 갤러리 사진은 `https://github.com/내아이디/저장소이름/upload/main/images/gallery`에 올리고 **Commit changes**를 누르세요. 두 폴더를 혼동하지 마세요.
4. `https://github.com/내아이디/저장소이름/edit/main/config.js`를 열어 기존 내용을 전부 지우고 **내 설정 파일 전체**를 붙여넣은 뒤 **Commit changes**를 누르세요. 제작자 예시는 `demo/config.js`에만 있으며, 새 저장소에는 자동 적용되지 않습니다. `demo/`를 삭제할 필요도 없어요.
5. `https://github.com/내아이디/저장소이름/settings/pages`에서 **Source → GitHub Actions**를 선택하세요.
6. `https://github.com/내아이디/저장소이름/actions` → **청첩장 배포** → **Run workflow** → **Run workflow**를 눌러 실행하세요. 저장소 생성 직후나 설정 도중의 실패 기록이 아니라 **이번 실행 결과**를 확인하세요. 실패했다면 [단계별 문제 해결](docs/troubleshooting.md)을 따르세요.
7. 이번 배포가 초록 ✅이면 `https://내아이디.github.io/저장소이름/`을 여세요. 보통 몇 분 걸리지만 실행 대기 시간은 달라질 수 있어요. **아래 확인을 마친 후** 하객에게 공유하세요.

이후에는 main에 파일을 저장할 때마다 자동 배포됩니다. 검사에서 발견한 오류는 새 배포를 중단하고 이전 배포를 유지하지만, **모든 내용 실수를 자동으로 찾는 것은 아닙니다.**

## ✅ 하객에게 보내기 전 확인

- 두 분·부모님 성함, 고인 표시, 예식 날짜/요일/오전·오후, 예식장/층/주소를 확인하세요.
- 내 사진만 나오는지, 사진이 기울거나 잘리지 않았는지 확인하세요.
- 지도 버튼이 실제 예식장으로 연결되는지 확인하세요. 좌표를 모르면 검색 결과를 직접 확인하세요.
- 계좌 복사 후 은행·계좌번호·예금주를 확인하세요. 비공개 정보가 설정에 남지 않았는지도 확인하세요.
- 카톡에 주소를 보내 제목·설명·사진을 확인하세요. 이름/날짜를 고친 뒤에도 다시 확인하세요.
- 추가 기능을 켰다면 시험 응답이 실제 구글 시트에 들어오는지 확인하고 시험 행은 지우세요.
- 아이폰 Safari, 안드로이드 Chrome, 카카오톡 안에서 사진·공유·캘린더를 확인하세요. [확인 기록표](docs/testing.md)를 사용할 수 있어요.

## 🤖 AI 도우미 안내

사용자가 이 템플릿으로 만들기를 요청했다면 [AI 진행 안내](docs/ai-guide.md)를 따르세요. 핵심 규칙:

1. 먼저 README와 원본 `config.js`를 실제로 읽으세요. 읽지 못하면 [단일 안내문](docs/ai-start.txt)의 전체 내용을 요청하고, 구조를 추측하지 마세요.
2. 한국어로 쉬운 말, 한 번에 한 단계씩 안내하세요. 필요한 정보는 3~4개씩 물어보고 모르는 선택 항목은 비우세요. GitHub 아이디와 저장소 이름을 받아 바로 누를 수 있는 링크를 주세요.
3. 기본은 GitHub 웹 클릭 방식입니다. 연결 도구가 있으면 실제 읽기/쓰기 권한을 확인해 가능한 작업만 설명하세요. 비밀번호·토큰·인증번호는 묻지 마세요. 사진 업로드 가능 여부도 도구에 따라 다릅니다.
4. 이름·날짜·한국시간·예식장·주소·표지 사진은 필수입니다. 연락처·계좌·부모님·좌표는 지어내지 마세요. 공개 범위를 먼저 설명하고 사용자가 확인한 뒤에만 `privacy.publishConsent: true`로 설정하세요.
5. 수정은 `config.js`에 모으세요. `meta.title`, `meta.description`, `firstName`은 특별히 원하는 문구가 없으면 비워 자동값을 사용하세요. 계좌는 실제 전달받은 것만 넣고 예금주를 확인하세요.
6. 전체 설정을 파일로 제공할 수 있으면 `config.js` 다운로드를 우선하고, 전체 코드 블록도 제공하세요. 중간 생략·여러 조각 이어붙이기는 피하세요. 갤러리는 `images: []`를 유지하세요.
7. 배포 성공 후 위 확인 목록을 함께 점검하세요. 자동 검사의 성공과 실제 휴대폰 확인은 별개입니다.

## 📚 더 알아보기

[사진·음악](docs/photos.md) · [AI로 고치기](docs/edit-with-ai.md) · [방명록·참석 응답](docs/guestbook-rsvp.md) · [카카오 공유](docs/kakao-share.md) · [문제 해결](docs/troubleshooting.md) · [개발·검증](docs/testing.md)

기존 버전 이용자는 [업데이트 안내](docs/migration.md)를 먼저 읽어주세요.

데모는 제작자 이름과 AI 일러스트를 사용한 별도 예시이며 날짜는 시연용입니다. 개인 사진·연락처·계좌를 포함하지 않습니다. [MIT 라이선스](LICENSE)로 코드·문서·예시 그림을 사용할 수 있어요.
