// 배포용 빌드 스크립트 (GitHub Actions 에서 자동 실행됩니다. 직접 실행할 필요 없어요.)
//  1) config.js 에 오타가 없는지 검사하고
//  2) 사진 경로를 맞춰주고 (갤러리 자동 목록, 대소문자·확장자 차이 보정)
//  3) 카카오톡/문자 미리보기(OG 태그)를 config.js 의 meta 값으로 채우고
//  4) '내 캘린더에 추가' 용 wedding.ics 파일을 만든 뒤
//  5) _site 폴더에 배포할 파일만 모읍니다.
//
// 예시 데이터는 --demo 를 명시한 빌드에서만 사용합니다.
//
// 로컬 실행: node scripts/build.mjs  (SITE_URL=https://아이디.github.io/저장소 를 주면 절대주소 사용)

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const { validate, normalize } = createRequire(import.meta.url)('../assets/config-utils.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');
const COPY = ['index.html', 'setup.html', 'prepare.html', 'assets', 'images'];
const useDemo = process.argv.includes('--demo');
const IMG_RE = /\.(jpe?g|png|webp|gif)$/i;
const AUDIO_RE = /\.(mp3|m4a|aac|ogg|wav)$/i;

const errors = [];
const warnings = [];

// ── 1. config.js 읽기 ───────────────────────────────────────────────
const configSrc = fs.readFileSync(path.join(ROOT, useDemo ? 'demo/config.js' : 'config.js'), 'utf8');
const sandbox = { window: {} };
try {
  vm.runInNewContext(configSrc, sandbox, { filename: 'config.js', timeout: 1000 });
} catch (e) {
  const line = (e.stack || '').match(/config\.js:(\d+)/);
  console.error('\n❌ config.js 에 문법 오류가 있어요' + (line ? ` (${line[1]}번째 줄 근처)` : ''));
  console.error('   ' + e.message);
  console.error('   쉼표( , ) 나 따옴표( \' ) 가 빠졌는지 확인해주세요.\n');
  if (line) console.log(`::error file=config.js,line=${line[1]}::config.js 문법 오류: ${e.message}`);
  process.exit(1);
}
const result = validate(sandbox.window.WEDDING);
for (const warning of result.warnings) warnings.push(warning);
if (result.errors.length) {
  for (const error of result.errors) console.error('::error file=config.js::' + error);
  console.error('❌ 설정을 확인해주세요. 기존 배포 파일은 변경하지 않았어요.');
  process.exit(1);
}
const C = normalize(sandbox.window.WEDDING);
const W = C.wedding;

// ── 사진 경로 맞추기 ────────────────────────────────────────────────
const listFiles = (rel, re) => {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => re.test(f) && fs.statSync(path.join(dir, f)).isFile())
    .sort((a, b) => a.localeCompare(b, 'ko', { numeric: true, sensitivity: 'base' }))
    .map((f) => `${rel}/${f}`);
};
if (useDemo) console.log('ℹ️  명시적으로 선택한 demo/config.js 와 예시 사진을 사용해요.');

// 'images/cover.jpg' 가 없으면 같은 폴더의 Cover.JPG, cover.jpeg, cover.png 등을 찾아줌
function resolveFile(p, re = IMG_RE) {
  if (!p || /^https?:\/\//.test(p)) return p;
  const rel = useDemo ? p.replace(/^images\//, 'demo/') : p;
  if (existsExact(rel) && re.test(rel)) return rel;
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

const patches = []; // [[경로], 값] — 검증된 배포 데이터에 적용
const patch = (keys, oldVal, newVal) => { if (oldVal !== newVal) patches.push([keys, newVal]); };

const cover = resolveFile(C.cover?.image);
if (C.cover?.image && !cover) errors.push(`표지 사진 '${C.cover.image}' 을(를) 찾을 수 없어요. images 폴더에 cover.jpg 를 올려주세요.`);
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
// 안내 문서(.md), 맥 숨김 파일, 데모 설정 원본은 배포하지 않음
const skip = new Set([path.join(ROOT, 'demo', 'config.js')]);
const keep = (src) => !/\.md$/i.test(src) && path.basename(src) !== '.DS_Store' && !skip.has(src);
for (const item of [...COPY, ...(useDemo ? ['demo'] : [])]) {
  const src = path.join(ROOT, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(OUT, item), { recursive: true, filter: keep });
}

// 검증된 데이터만 내보냅니다. 원본 설정은 수정하지 않습니다.
for (const [keys, value] of patches) {
  let target = C;
  for (const key of keys.slice(0, -1)) target = target[key] ||= {};
  target[keys.at(-1)] = value;
}
fs.writeFileSync(path.join(OUT, 'config.js'), 'window.WEDDING = ' + JSON.stringify(C, null, 2) + ';\nwindow.WEDDING_ICS = "wedding.ics";\n');
// 설정 도구에서는 데모 대신 새 사용자의 빈 원본 설정을 읽습니다.
fs.copyFileSync(path.join(ROOT, 'templates', 'config.js'), path.join(OUT, 'starter-config.js'));
const setupPath = path.join(OUT, 'setup.html');
if (fs.existsSync(setupPath)) fs.writeFileSync(setupPath, fs.readFileSync(setupPath, 'utf8').replace('src="templates/config.js"', 'src="starter-config.js"'));

// ── 내 캘린더에 추가용 wedding.ics (아이폰은 이 파일 주소를 열면 바로 '캘린더에 추가' 창이 떠요)
{
  const [y, mo, d] = W.date.split('-').map(Number);
  const [hh, mm] = W.time.split(':').map(Number);
  const start = new Date(Date.UTC(y, mo - 1, d, hh - 9, mm)); // 한국시간 → UTC
  const end = new Date(start.getTime() + 2 * 3600e3);
  const t = (dt) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const text = (v) => String(v ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const fold = (line) => { // 한 줄 75바이트 제한 (RFC 5545)
    const out = []; let cur = '';
    for (const ch of line) {
      if (Buffer.byteLength(cur + ch) > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch;
    }
    return [...out, cur].join('\r\n');
  };
  const first = (p) => p?.firstName || p?.name || '';
  const title = `${first(C.groom)} ♥ ${first(C.bride)} 결혼식`;
  const where = [[W.venue, W.hall].filter(Boolean).join(' '), W.address].filter(Boolean).join(', ');
  const uid = createHash('sha1').update(`${W.date}${W.time}${title}`).digest('hex').slice(0, 16);
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//wedding-invitation//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${uid}@wedding-invitation`, `DTSTAMP:${t(new Date())}`,
    `DTSTART:${t(start)}`, `DTEND:${t(end)}`, `SUMMARY:${text(title)}`, `LOCATION:${text(where)}`,
    ...(SITE_URL ? [`DESCRIPTION:${text(SITE_URL + '/')}`, `URL:${SITE_URL}/`] : []),
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${text(`내일은 ${title}입니다`)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n';
  fs.writeFileSync(path.join(OUT, 'wedding.ics'), ics);
}

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
// 수정한 내용이 바로 보이도록 캐시 무효화
const v = Date.now().toString(36);
html = html.replace(/(src|href)="(config\.js|assets\/[^"]+)"/g, `$1="$2?v=${v}"`);
fs.writeFileSync(indexPath, html);

console.log(`\n✅ 빌드 완료! (${title})`);
if (SITE_URL) console.log(`   주소: ${SITE_URL}/`);
