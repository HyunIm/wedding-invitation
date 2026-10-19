"""배포용 사진 최적화 (GitHub Actions 에서 자동 실행됩니다. 직접 실행할 필요 없어요.)

하객 휴대폰에서 빠르게 열리도록 업로드한 사본을 추가로 최적화합니다.
배포 폴더(_site)에 있는 사진만 줄입니다. 저장소에 올린 원본은 그대로 둡니다.

  1) 긴 변 1600px 로 줄이고 JPEG 는 품질 82 로 다시 저장
     (투명한 부분이 없는 PNG·WebP 는 훨씬 가벼운 JPG 로 바꾸고 경로도 맞춤)
  2) 사진의 회전 정보를 반영하고 위치(GPS) 등 메타데이터 제거
  3) 갤러리용 작은 미리보기(썸네일)를 _thumbs/ 에 만들고
     index.html 에 window.WEDDING_THUMBS 경로를 넣음 (app.js 가 사용)

로컬 실행: python3 scripts/optimize_images.py _site   (Pillow 필요: pip install -r scripts/requirements.txt)
"""
import os
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

MAX_EDGE = 1600
THUMB_EDGE = 640
JPEG_QUALITY = 82
THUMB_QUALITY = 76
KEEP_IF_UNDER = 450 * 1024  # 이미 충분히 작은 JPEG 는 다시 압축하지 않음 (화질 보존)
THUMB_DIR = '_thumbs'
PHOTO_DIRS = ('images', 'demo')  # _site 안에서 사진을 찾는 폴더
EXTS = ('.jpg', '.jpeg', '.png', '.webp')


def to_rgb(im):
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGB', im.size, 'white')
        bg.paste(im, mask=im.split()[3])
        return bg
    return im.convert('RGB')


def is_opaque(im):
    if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
        return im.convert('RGBA').getchannel('A').getextrema()[0] == 255
    return True


def optimize(path):
    """줄인 사진을 저장하고 (최종 경로, 바뀌었는지) 를 돌려줍니다."""
    with Image.open(path) as src:
        fmt = src.format
        # EXIF 외에도 XMP·IPTC·PNG 텍스트에 위치/작성자 정보가 있을 수 있습니다.
        format_info = {'jfif', 'jfif_version', 'jfif_unit', 'jfif_density', 'progressive', 'progression'}
        has_meta = bool(src.getexif()) or bool(set(src.info) - format_info)
        too_big = max(src.size) > MAX_EDGE
        heavy = os.path.getsize(path) > KEEP_IF_UNDER
        if fmt not in ('JPEG', 'PNG', 'WEBP') or not (too_big or heavy or has_meta):
            return path, False
        im = ImageOps.exif_transpose(src)
        im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
        im.info.clear()
        out = path
        if fmt != 'JPEG' and is_opaque(im):
            jpg = os.path.splitext(path)[0] + '.jpg'
            if not os.path.exists(jpg):
                out, fmt = jpg, 'JPEG'
        if fmt == 'JPEG':
            to_rgb(im).save(out, 'JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
        elif fmt == 'PNG':
            im.save(out, 'PNG', optimize=True)
        else:
            im.save(out, 'WEBP', quality=JPEG_QUALITY)
    if out != path:
        os.remove(path)
    return out, True


def make_thumb(path, site):
    rel = os.path.relpath(path, site)
    out = os.path.join(site, THUMB_DIR, os.path.splitext(rel)[0] + '.jpg')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with Image.open(path) as src:
        im = ImageOps.exif_transpose(src)
        im.thumbnail((THUMB_EDGE, THUMB_EDGE), Image.LANCZOS)
        to_rgb(im).save(out, 'JPEG', quality=THUMB_QUALITY, optimize=True, progressive=True)


def main(site):
    before = after = changed = thumbs = 0
    failures = []
    renames = {}
    for top in PHOTO_DIRS:
        for dirpath, _, files in os.walk(os.path.join(site, top)):
            for name in sorted(files):
                if name.lower().endswith(('.heic', '.heif')):
                    failures.append(name + ': HEIC/HEIF는 JPG로 내보내서 올려주세요.')
                    continue
                if not name.lower().endswith(EXTS):
                    continue
                path = os.path.join(dirpath, name)
                rel = os.path.relpath(path, site)
                before += os.path.getsize(path)
                try:
                    new, did = optimize(path)
                    changed += did
                    if new != path:
                        renames[rel.replace(os.sep, '/')] = os.path.relpath(new, site).replace(os.sep, '/')
                        path = new
                    if os.path.basename(dirpath) == 'gallery':
                        make_thumb(path, site)
                        thumbs += 1
                except Exception as e:
                    failures.append(f'{rel}: 사진을 처리하지 못했어요 ({e}). 사진 앱에서 다시 내보내주세요.')
                after += os.path.getsize(path)

    if failures:
        for failure in failures:
            print('::error::' + failure)
        raise SystemExit(1)

    # PNG → JPG 로 바뀐 사진 경로를 배포본에 반영
    for name in ('config.js', 'index.html'):
        f = os.path.join(site, name)
        if renames and os.path.exists(f):
            text = Path(f).read_text(encoding='utf-8')
            for old, new in renames.items():
                text = text.replace(old, new)
            Path(f).write_text(text, encoding='utf-8')

    # app.js 가 갤러리 썸네일을 쓰도록 표시
    index = os.path.join(site, 'index.html')
    if thumbs and os.path.exists(index):
        html = Path(index).read_text(encoding='utf-8')
        tag = f'<script>window.WEDDING_THUMBS = "{THUMB_DIR}/";</script>\n  '
        html = re.sub(r'(<script src="config\.js)', tag + r'\1', html, count=1)
        Path(index).write_text(html, encoding='utf-8')

    mb = lambda b: f'{b / 1048576:.1f}MB'
    print(f'✅ 사진 최적화 완료: {changed}장 줄임 (JPG 변환 {len(renames)}장), 썸네일 {thumbs}장, 전체 {mb(before)} → {mb(after)}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '_site')
