# 🧯 문제 해결

### Q. 고쳤는데 청첩장이 안 바뀌어요
1. `https://github.com/내아이디/저장소이름/actions` 를 확인하세요. 노란 ● 진행 중, ✅ 완료, ❌ 실패.
2. ✅ 인데도 그대로라면 1~2분 뒤 **새로고침**하세요. 카카오톡 안에서 열었다면 크롬·사파리로 열어보세요.

### Q. 저장소를 처음 만들었는데 Actions 에 빨간 ❌ 가 있어요
인터넷 공개(Pages)를 켜기 전에 자동으로 실행돼서 생긴 거예요. **정상이에요.**
`Settings → Pages → Source` 를 **GitHub Actions** 로 바꾼 뒤, 사진이나 config.js 를 한 번 저장(Commit)하면 다시 실행돼요.
(바로 다시 돌리려면 Actions 탭 → **청첩장 배포** → **Run workflow**)

### Q. Actions 에 빨간 ❌ 가 떴어요
config.js 에 오타가 있어서 **배포를 멈춘 거예요. 기존 청첩장은 그대로 안전해요.**
❌ → `build` 를 눌러 빨간 글(예: `58번째 줄 근처`)을 복사해서 AI 에게 "이 오류 고쳐줘" 라고 config.js 와 함께 보내세요.

| 자주 하는 실수 | 예 |
|---|---|
| 쉼표 빠뜨림 | `name: '김민준'` ← 끝에 `,` 없음 |
| 따옴표 짝 안 맞음 | `name: '김민준,` |
| 글 안에 `'` 사용 | `'It's me'` → `` `It's me` `` 로 |
| 날짜 형식 | `'2027.5.15'` ❌ → `'2027-05-15'` ✅ |

### Q. 예시 그림(다른 부부 사진)이 나와요
`images` 폴더에 내 사진을 하나도 안 올리면 예시 그림으로 보여줘요. 내 사진을 올리면 자동으로 바뀌어요.
그리고 `demo` 폴더는 꼭 지워주세요. (`https://github.com/내아이디/저장소이름/tree/main/demo` → `···` → `Delete directory`)

### Q. 사진이 안 나와요
- 표지는 `images/cover.jpg` 로 올렸는지, 갤러리는 `images/gallery` 폴더 **안에** 올렸는지 확인하세요.
- 아이폰 `HEIC` 사진은 안 돼요. JPG 로 올려주세요.
- Actions 의 ✅ 결과를 열면 노란 ⚠️ 로 어떤 사진을 못 찾았는지 알려줘요.

### Q. 지도 위치가 이상해요
config.js 의 `wedding.lat`, `wedding.lng` 를 고쳐주세요.
구글지도(컴퓨터)에서 예식장을 **마우스 오른쪽 클릭**하면 맨 위에 `37.5223, 127.0403` 같은 숫자가 나와요. 앞이 lat, 뒤가 lng.

### Q. Pages 메뉴에서 GitHub Actions 를 고를 수 없어요
저장소가 **Private(비공개)** 이면 무료 계정은 쓸 수 없어요.
`Settings → General → 맨 아래 Change visibility → Public` 으로 바꿔주세요.

### Q. 주소를 짧게 하고 싶어요
- 저장소 이름을 `내아이디.github.io` 로 바꾸면 `https://내아이디.github.io/` 가 돼요. (`Settings → General → Repository name`)
- 구매한 도메인이 있다면 `Settings → Pages → Custom domain` 에 입력하세요.

### Q. 결혼식이 끝나면?
그대로 두면 기념으로 남아요. 내리고 싶으면 `Settings → Pages` 에서 끄거나 저장소를 삭제하세요. 방명록은 구글 시트에 남아 있어요. 💐
