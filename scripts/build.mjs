// 배포용 빌드 스크립트 (GitHub Actions 에서 자동 실행됩니다. 직접 실행할 필요 없어요.)
//  1) config.js 에 오타가 없는지 검사하고
//  2) 사진 경로를 맞춰주고 (갤러리 자동 목록, 대소문자·확장자 차이 보정)
//  3) 카카오톡/문자 미리보기(OG 태그)를 config.js 의 meta 값으로 채운 뒤
//  4) _site 폴더에 배포할 파일만 모읍니다.
//
// images 폴더에 사진이 하나도 없으면 템플릿 예시 사진(demo 폴더)으로 보여줍니다.
//
// 로컬 실행: node scripts/build.mjs  (SITE_URL=https://아이디.github.io/저장소 를 주면 절대주소 사용)

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');
const COPY = ['index.html', 'config.js', 'assets', 'images'];
const IMG_RE = /\.(jpe?g|png|webp|gif)$/i;
const AUDIO_RE = /\.(mp3|m4a|aac|ogg|wav)$/i;

const errors = [];
const warnings = [];

// ── 1. config.js 읽기 ───────────────────────────────────────────────
const configSrc = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
const sandbox = { window: {} };
try {
  vm.runInNewContext(configSrc, sandbox, { filename: 'config.js' });
} catch (e) {
  const line = (e.stack || '').match(/config\.js:(\d+)/);
  console.error('\n❌ config.js 에 문법 오류가 있어요' + (line ? ` (${line[1]}번째 줄 근처)` : ''));
  console.error('   ' + e.message);
  console.error('   쉼표( , ) 나 따옴표( \' ) 가 빠졌는지 확인해주세요.\n');
  if (line) console.log(`::error file=config.js,line=${line[1]}::config.js 문법 오류: ${e.message}`);
  process.exit(1);
}
const C = sandbox.window.WEDDING;
if (!C) { console.error('❌ config.js 에 window.WEDDING = { ... } 이 없어요.'); process.exit(1); }

// ── 2. 값 검사 ──────────────────────────────────────────────────────
const W = C.wedding || {};
if (!/^\d{4}-\d{2}-\d{2}$/.test(W.date || '')) errors.push(`wedding.date 는 '2027-05-15' 형식이어야 해요. (지금: '${W.date}')`);
if (!/^\d{1,2}:\d{2}$/.test(W.time || '')) errors.push(`wedding.time 은 '13:00' 형식이어야 해요. (지금: '${W.time}')`);
if (!C.groom?.name) errors.push('groom.name (신랑 이름) 이 비어 있어요.');
if (!C.bride?.name) errors.push('bride.name (신부 이름) 이 비어 있어요.');
if (C.googleScriptUrl && !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(C.googleScriptUrl)) {
  warnings.push("googleScriptUrl 은 'https://script.google.com/macros/s/.../exec' 형태여야 해요.");
}

// ── 사진 경로 맞추기 ────────────────────────────────────────────────
const listFiles = (rel, re) => {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => re.test(f) && fs.statSync(path.join(dir, f)).isFile())
    .sort((a, b) => a.localeCompare(b, 'ko', { numeric: true, sensitivity: 'base' }))
    .map((f) => `${rel}/${f}`);
};
const hasUserPhotos = listFiles('images', IMG_RE).length + listFiles('images/gallery', IMG_RE).length > 0;
const useDemo = !hasUserPhotos && fs.existsSync(path.join(ROOT, 'demo'));
if (useDemo) console.log('ℹ️  images 폴더에 사진이 없어 예시(demo) 사진으로 배포해요.');

// 'images/cover.jpg' 가 없으면 같은 폴더의 Cover.JPG, cover.jpeg, cover.png 등을 찾아줌
function resolveFile(p, re = IMG_RE) {
  if (!p || /^https?:\/\//.test(p)) return p;
  const rel = useDemo ? p.replace(/^images\//, 'demo/') : p;
  if (existsExact(rel)) return rel;
  const dir = path.posix.dirname(rel);
  const stem = path.posix.basename(rel).replace(/\.[^.]+$/, '').toLowerCase();
  return listFiles(dir, re).find((f) => path.posix.basename(f).replace(/\.[^.]+$/, '').toLowerCase() === stem) || null;
}

function existsExact(rel) {
  // GitHub Pages 는 대소문자를 구분하므로 정확히 일치하는지 확인
  let dir = ROOT;
  for (const part of rel.split('/')) {
    if (!fs.existsSync(dir) || !fs.readdirSync(dir).includes(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

const patches = []; // [[경로], 값] — 배포본 config.js 끝에 덧붙여 적용
const patch = (keys, oldVal, newVal) => { if (oldVal !== newVal) patches.push([keys, newVal]); };

const cover = resolveFile(C.cover?.image);
if (C.cover?.image && !cover) warnings.push(`표지 사진 '${C.cover.image}' 을(를) 찾을 수 없어요. images 폴더에 cover.jpg 를 올려주세요.`);
else patch(['cover', 'image'], C.cover?.image, cover);

patch(['meta', 'image'], C.meta?.image, resolveFile(C.meta?.image) || cover || '');
if (C.closing?.image) patch(['closing', 'image'], C.closing.image, resolveFile(C.closing.image) || '');
if (C.location?.mapImage) {
  const map = resolveFile(C.location.mapImage);
  if (!map) warnings.push(`약도 '${C.location.mapImage}' 을(를) 찾을 수 없어 지도를 대신 보여줘요.`);
  patch(['location', 'mapImage'], C.location.mapImage, map || '');
}
for (const key of ['story', 'notice']) {
  (C[key]?.items || []).forEach((it, i) => { if (it.image) patch([key, 'items', i, 'image'], it.image, resolveFile(it.image) || ''); });
}
if (C.music?.enabled && C.music.src) {
  const bgm = resolveFile(C.music.src, AUDIO_RE);
  if (!bgm) { warnings.push(`배경음악 '${C.music.src}' 을(를) 찾을 수 없어 음악을 껐어요.`); patch(['music', 'enabled'], true, false); }
  else patch(['music', 'src'], C.music.src, bgm);
}

// 갤러리: 목록이 비어 있으면 images/gallery 폴더의 사진을 이름 순서대로 모두 사용
if (C.gallery && C.gallery.enabled !== false) {
  const list = C.gallery.images || [];
  let photos;
  if (!list.length) {
    photos = listFiles(useDemo ? 'demo/gallery' : 'images/gallery', IMG_RE);
    if (!photos.length) warnings.push('images/gallery 폴더에 사진이 없어서 갤러리를 숨겨요.');
  } else {
    photos = list.map((p) => {
      const hit = resolveFile(p);
      if (!hit) warnings.push(`갤러리 사진 '${p}' 을(를) 찾을 수 없어 빼고 보여줘요.`);
      return hit;
    }).filter(Boolean);
  }
  patches.push([['gallery', 'images'], photos]);
}

for (const w of warnings) { console.warn('⚠️  ' + w); console.log('::warning file=config.js::' + w); }
if (errors.length) {
  for (const e of errors) { console.error('❌ ' + e); console.log('::error file=config.js::' + e); }
  process.exit(1);
}

// ── 3. _site 만들기 ─────────────────────────────────────────────────
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
// 안내 문서(.md), 맥 숨김 파일, 미리보기 전용 demo/demo.js 는 배포하지 않음
const skip = new Set([path.join(ROOT, 'demo', 'demo.js')]);
const keep = (src) => !/\.md$/i.test(src) && path.basename(src) !== '.DS_Store' && !skip.has(src);
for (const item of [...COPY, ...(useDemo ? ['demo'] : [])]) {
  const src = path.join(ROOT, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(OUT, item), { recursive: true, filter: keep });
}

// 맞춘 사진 경로를 배포본 config.js 에 덧붙이기 (원본 config.js 는 그대로)
fs.appendFileSync(path.join(OUT, 'config.js'), `
// ↓ 배포할 때 자동으로 맞춘 사진 경로 (scripts/build.mjs)
(function (W, P) {
  P.forEach(function (p) {
    var o = W, k = p[0];
    for (var i = 0; i < k.length - 1; i++) o = o[k[i]] = o[k[i]] || {};
    o[k[k.length - 1]] = p[1];
  });
})(window.WEDDING, ${JSON.stringify(patches)});
`);

// ── 4. 미리보기(OG) 태그 채우기 ─────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const meta = C.meta || {};
const title = meta.title || `${C.groom.name} ♥ ${C.bride.name} 결혼합니다`;
const desc = meta.description || `${W.date} ${W.time} ${W.venue || ''}`;
const imgRel = resolveFile(meta.image) || cover || '';
const abs = (p) => (/^https?:\/\//.test(p) || !SITE_URL ? p : `${SITE_URL}/${p.replace(/^\.?\//, '')}`);

const metaHtml = `<!-- META:START (자동 생성됨 — config.js 의 meta 를 고치세요) -->
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${esc(abs(imgRel))}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />${SITE_URL ? `\n  <meta property="og:url" content="${esc(SITE_URL)}/" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <!-- META:END -->`;

const indexPath = path.join(OUT, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<!-- META:START[\s\S]*?META:END -->/, metaHtml);
html = html.replace(/[ \t]*<script src="demo\/demo\.js"><\/script>\n?/, ''); // 예시 사진은 위에서 이미 처리
// 수정한 내용이 바로 보이도록 캐시 무효화
const v = Date.now().toString(36);
html = html.replace(/(src|href)="(config\.js|assets\/[^"]+)"/g, `$1="$2?v=${v}"`);
fs.writeFileSync(indexPath, html);

console.log(`\n✅ 빌드 완료! (${title})`);
if (SITE_URL) console.log(`   주소: ${SITE_URL}/`);
