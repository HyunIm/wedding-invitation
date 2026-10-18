/* ============================================================================
 *  모바일 청첩장 렌더러 (app.js)
 *  ⚠️ 청첩장 내용을 바꿀 때는 이 파일이 아니라 config.js 를 고쳐주세요.
 *
 *  구조: config.js(window.WEDDING) → render*() 함수들이 HTML 을 만들고
 *        bind*() 함수들이 버튼 동작을 연결합니다.
 * ========================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');

  /* ── config.js 오류 안내 ─────────────────────────────────────────────── */
  if (!window.WEDDING || typeof window.WEDDING !== 'object') {
    var err = window.__CONFIG_ERROR__;
    app.innerHTML =
      '<div class="config-error">' +
      '<h1>⚠️ config.js 파일에 문제가 있어요</h1>' +
      '<p>쉼표( , ) 나 따옴표( \' ) 가 빠지거나 지워졌을 가능성이 높아요.</p>' +
      (err ? '<p class="config-error__detail">' + err.line + '번째 줄 근처: ' + escapeHtml(err.message) + '</p>' : '') +
      '<p>AI 에게 "config.js 문법 오류를 고쳐줘" 라고 파일 내용과 함께 보내보세요.</p>' +
      '</div>';
    return;
  }

  var C = window.WEDDING;

  // index.html 을 바로 열었을 때는 예시 사진(demo/demo.js)으로 미리보기. 배포본은 build 가 경로를 맞춰요.
  if (window.WEDDING_DEMO) {
    Object.keys(window.WEDDING_DEMO).forEach(function (key) {
      var keys = key.split('.'), o = C;
      for (var i = 0; i < keys.length - 1; i++) o = o[keys[i]] = o[keys[i]] || {};
      o[keys[keys.length - 1]] = window.WEDDING_DEMO[key];
    });
  }
  // 이 청첩장 템플릿의 원본 저장소 (하단 링크)
  var TEMPLATE_URL = 'https://github.com/HyunIm/wedding-invitation';

  /* ── 기본 유틸 ───────────────────────────────────────────────────────── */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  var esc = escapeHtml;
  function nl2br(s) { return esc(s).replace(/\\n/g, '\n').replace(/\n/g, '<br>'); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }
  function enabled(sec) { return sec && sec.enabled !== false; }
  function telHref(p) { return 'tel:' + String(p || '').replace(/[^0-9+]/g, ''); }
  function smsHref(p) { return 'sms:' + String(p || '').replace(/[^0-9+]/g, ''); }
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem('wedding:' + key);
      localStorage.setItem('wedding:' + key, val);
    } catch (e) { return null; }
  }
  var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 미리보기 모드: 내 컴퓨터에서 열었거나 주소 뒤에 ?preview 를 붙였을 때.
  // 아직 설정 안 된 기능(방명록 등)을 손님에게는 숨기고, 미리보기에서만 안내를 보여줍니다.
  var isPreview = location.protocol === 'file:' ||
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ||
    /[?&]preview\b/.test(location.search);

  /* ── 아이콘 (SVG) ────────────────────────────────────────────────────── */
  var ICON_PATHS = {
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    sms: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    subway: '<rect x="4" y="3" width="16" height="16" rx="3"/><path d="M4 11h16M12 3v8M8 19l-2 3M18 22l-2-3"/><circle cx="8.5" cy="15" r=".6"/><circle cx="15.5" cy="15" r=".6"/>',
    bus: '<path d="M8 6v6M16 6v6M2 12h20M6 18h12"/><rect x="2" y="4" width="20" height="14" rx="3"/><circle cx="7" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    parking: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    musicOff: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M2 2l20 20"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    pen: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    nav: '<path d="m3 11 19-9-9 19-2-8-8-2z"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    heart: '<path fill="currentColor" stroke="none" d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21Z"/>',
    kakao: '<path fill="currentColor" stroke="none" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.67 6.77-.2.75-.74 2.72-.85 3.14-.13.52.19.51.4.37.17-.11 2.66-1.81 3.74-2.54.66.1 1.34.15 2.04.15 5.52 0 10-3.58 10-8S17.52 3 12 3Z"/>',
  };
  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON_PATHS[name] || '') + '</svg>';
  }
  var FLOWER =
    '<svg class="mum" viewBox="0 0 24 24" aria-label="고인" role="img"><g fill="currentColor" opacity=".85">' +
    [0, 30, 60, 90, 120, 150].map(function (r) {
      return '<ellipse cx="12" cy="12" rx="2.2" ry="8.5" transform="rotate(' + r + ' 12 12)" opacity=".55"/>';
    }).join('') +
    '<circle cx="12" cy="12" r="2.6"/></g></svg>';

  /* ── 날짜 계산 (한국 시간 기준) ──────────────────────────────────────── */
  var W = C.wedding || {};
  var timeStr = /^\d{1,2}:\d{2}$/.test(W.time || '') ? W.time : '12:00';
  if (timeStr.length === 4) timeStr = '0' + timeStr;
  var weddingAt = new Date((W.date || '2030-01-01') + 'T' + timeStr + ':00+09:00');
  var dParts = (W.date || '2030-01-01').split('-').map(Number);
  var Y = dParts[0], M = dParts[1], D = dParts[2];
  var hh = Number(timeStr.split(':')[0]), mm = Number(timeStr.split(':')[1]);
  var DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
  var dow = new Date(Date.UTC(Y, M - 1, D)).getUTCDay();
  var timeKo = (hh < 12 ? '오전 ' : '오후 ') + (hh % 12 === 0 ? 12 : hh % 12) + '시' + (mm ? ' ' + mm + '분' : '');
  var dateKo = Y + '년 ' + M + '월 ' + D + '일 ' + DOW_KO[dow] + '요일';
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  var G = C.groom || {}, B = C.bride || {};
  var groomFirst = G.firstName || G.name || '신랑';
  var brideFirst = B.firstName || B.name || '신부';

  /* ── 공통 조각 ───────────────────────────────────────────────────────── */
  function img(src, alt, cls, extra) {
    if (!src) return '';
    return '<img class="' + (cls || '') + '" src="' + esc(src) + '" alt="' + esc(alt || '') + '" loading="lazy" decoding="async" onerror="this.classList.add(\'is-missing\')" ' + (extra || '') + '>';
  }
  // 배포 시 자동으로 만든 갤러리 썸네일 경로 (scripts/optimize_images.py). 없으면 원본 사용.
  function thumbImg(src, alt) {
    var base = window.WEDDING_THUMBS;
    if (!base || /^([a-z]+:)?\/\//i.test(src)) return img(src, alt);
    var thumb = base + src.replace(/^\.?\//, '').replace(/\.[^./]+$/, '.jpg');
    return '<img src="' + esc(thumb) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async" ' +
      'onerror="if(this.src.indexOf(\'' + esc(base) + '\')>-1){this.src=\'' + esc(src) + '\'}else{this.classList.add(\'is-missing\')}">';
  }
  function heading(en, ko) {
    return '<header class="sec-head reveal">' +
      (en ? '<p class="sec-head__en">' + esc(en) + '</p>' : '') +
      (ko ? '<h2 class="sec-head__ko">' + esc(ko) + '</h2>' : '') +
      '</header>';
  }
  function section(id, inner, cls) {
    return '<section class="sec sec--' + id + ' ' + (cls || '') + '" id="' + id + '" data-section="' + id + '">' + inner + '</section>';
  }
  function previewNote(text) {
    return isPreview ? '<p class="preview-note reveal">🛠️ ' + text + '<br><small>(이 안내는 미리보기에서만 보이고 손님에게는 보이지 않아요)</small></p>' : '';
  }
  function parentName(p) {
    if (!p || !p.name) return '';
    var mark = '';
    if (p.deceased) {
      if (C.deceasedMark === 'hanja') mark = '<span class="deceased">故</span> ';
      else if (C.deceasedMark !== 'none') mark = FLOWER;
    }
    return '<span class="parent' + (p.deceased ? ' parent--deceased' : '') + '">' + mark + esc(p.name) + '</span>';
  }
  function parentsLine(person, first) {
    var names = [parentName(person.father), parentName(person.mother)].filter(Boolean).join('<i class="dot">·</i>');
    if (!names) return '<p class="parents__row"><strong>' + esc(person.name) + '</strong></p>';
    return '<p class="parents__row">' + names + '<span class="parents__of">의 ' + esc(person.relation || '') + '</span><strong>' + esc(first) + '</strong></p>';
  }

  /* ========================================================================
   *  섹션 렌더러
   * ====================================================================== */
  var R = {};

  R.cover = function () {
    var c = C.cover || {};
    var layout = c.layout || 'full';
    var names = '<h1 class="cover__names"><span>' + esc(G.name) + '</span><i class="cover__amp">' + icon('heart') + '</i><span>' + esc(B.name) + '</span></h1>';
    var when = '<p class="cover__when">' + esc(dateKo) + ' ' + esc(timeKo) + '</p><p class="cover__where">' + esc(W.venue || '') + (W.hall ? ' ' + esc(W.hall) : '') + '</p>';
    var sub = c.subtitle ? '<p class="cover__sub">' + esc(c.subtitle) + '</p>' : '';
    var hint = '<a class="cover__hint" href="#' + esc(nextSectionId('cover')) + '" aria-label="아래로 스크롤">' + icon('down') + '</a>';

    if (layout === 'arch') {
      return section('cover',
        '<div class="cover__date-big"><span>' + pad(M) + '</span><i></i><span>' + pad(D) + '</span></div>' +
        sub +
        '<div class="cover__arch">' + img(c.image, '표지 사진', '', 'fetchpriority="high" loading="eager"') + '</div>' +
        names + when + hint, 'cover--arch');
    }
    if (layout === 'frame') {
      return section('cover',
        '<div class="cover__frame">' + img(c.image, '표지 사진', '', 'fetchpriority="high" loading="eager"') + '</div>' +
        '<div class="cover__body">' + sub + names + when + '</div>' + hint, 'cover--frame');
    }
    return section('cover',
      '<div class="cover__bg">' + img(c.image, '표지 사진', '', 'fetchpriority="high" loading="eager"') + '</div>' +
      '<div class="cover__overlay"></div>' +
      '<div class="cover__content">' + sub + names + when + '</div>' + hint, 'cover--full');
  };

  R.greeting = function () {
    var g = C.greeting;
    if (!enabled(g)) return '';
    var q = g.quote && g.quote.text
      ? '<blockquote class="quote reveal"><p>' + nl2br(g.quote.text) + '</p>' + (g.quote.author ? '<cite>' + esc(g.quote.author) + '</cite>' : '') + '</blockquote>'
      : '';
    var parents = g.showParents !== false
      ? '<div class="parents reveal">' + parentsLine(G, groomFirst) + parentsLine(B, brideFirst) + '</div>'
      : '';
    return section('greeting',
      q + heading('INVITATION', g.title) +
      '<p class="greeting__msg reveal">' + nl2br(g.message) + '</p>' + parents);
  };

  function contactPeople() {
    var list = [];
    function add(side, role, p) { if (p && p.phone && p.name && !p.deceased) list.push({ side: side, role: role, name: p.name, phone: p.phone }); }
    add('groom', '신랑', G); add('groom', '신랑 아버지', G.father); add('groom', '신랑 어머니', G.mother);
    add('bride', '신부', B); add('bride', '신부 아버지', B.father); add('bride', '신부 어머니', B.mother);
    return list;
  }
  R.contact = function () {
    if (!contactPeople().length) return '';
    return section('contact',
      '<button type="button" class="btn btn--outline reveal" data-action="contact">' + icon('phone') + ' 축하 연락하기</button>', 'sec--tight');
  };

  R.calendar = function () {
    var cal = C.calendar;
    if (!enabled(cal)) return '';
    var first = new Date(Date.UTC(Y, M - 1, 1)).getUTCDay();
    var days = new Date(Date.UTC(Y, M, 0)).getUTCDate();
    var cells = '';
    DOW_KO.forEach(function (d, i) { cells += '<span class="cal__dow' + (i === 0 ? ' is-sun' : i === 6 ? ' is-sat' : '') + '">' + d + '</span>'; });
    for (var i = 0; i < first; i++) cells += '<span></span>';
    for (var d = 1; d <= days; d++) {
      var wd = (first + d - 1) % 7;
      var cls = 'cal__day' + (wd === 0 ? ' is-sun' : wd === 6 ? ' is-sat' : '') + (d === D ? ' is-wedding' : '');
      cells += '<span class="' + cls + '"' + (d === D ? ' aria-label="결혼식 날"' : '') + '>' + d + '</span>';
    }
    var countdown = cal.countdown !== false
      ? '<div class="countdown reveal" aria-live="off">' +
        ['DAYS', 'HOUR', 'MIN', 'SEC'].map(function (u, i) {
          return '<div class="countdown__box"><b data-cd="' + i + '">0</b><small>' + u + '</small></div>';
        }).join('<span class="countdown__sep">:</span>') +
        '</div><p class="countdown__text reveal" data-cd-text></p>'
      : '';
    var addCal = cal.addToCalendar !== false
      ? '<div class="btn-row reveal"><button type="button" class="btn btn--soft btn--sm" data-action="add-calendar">' + icon('calendar') + ' 내 캘린더에 추가</button></div>'
      : '';
    return section('calendar',
      heading('WEDDING DAY', '') +
      '<p class="calendar__date reveal">' + Y + '. ' + pad(M) + '. ' + pad(D) + '</p>' +
      '<p class="calendar__sub reveal">' + esc(DOW_KO[dow]) + '요일 ' + esc(timeKo) + '</p>' +
      '<div class="cal reveal"><p class="cal__month">' + M + '월</p><div class="cal__grid">' + cells + '</div></div>' +
      countdown + addCal);
  };

  R.story = function () {
    var s = C.story;
    if (!enabled(s) || !s.items || !s.items.length) return '';
    return section('story',
      heading('OUR STORY', s.title) +
      '<ol class="timeline">' + s.items.map(function (it) {
        return '<li class="timeline__item reveal">' +
          '<span class="timeline__dot"></span>' +
          '<p class="timeline__date">' + esc(it.date) + '</p>' +
          '<h3 class="timeline__title">' + esc(it.title) + '</h3>' +
          (it.image ? img(it.image, it.title, 'timeline__img') : '') +
          (it.text ? '<p class="timeline__text">' + nl2br(it.text) + '</p>' : '') +
          '</li>';
      }).join('') + '</ol>');
  };

  R.gallery = function () {
    var g = C.gallery;
    if (!enabled(g)) return '';
    if (!g.images || !g.images.length) {
      return previewNote('갤러리 사진은 배포할 때 images/gallery 폴더에서 자동으로 불러와요.');
    }
    var layout = g.layout || 'grid';
    var initial = layout === 'slide' ? g.images.length : (g.initialCount || 9);
    var items = g.images.map(function (src, i) {
      return '<button type="button" class="gallery__item' + (i >= initial ? ' is-hidden' : '') + '" data-action="lightbox" data-index="' + i + '" aria-label="사진 ' + (i + 1) + ' 크게 보기">' +
        (layout === 'slide' ? img(src, '웨딩 사진 ' + (i + 1)) : thumbImg(src, '웨딩 사진 ' + (i + 1))) + '</button>';
    }).join('');
    var more = layout !== 'slide' && g.images.length > initial
      ? '<button type="button" class="btn btn--text gallery__more" data-action="gallery-more">사진 더보기 ' + icon('down') + '</button>'
      : '';
    var slideUi = layout === 'slide'
      ? '<div class="gallery__nav"><button type="button" class="icon-btn" data-action="slide-prev" aria-label="이전 사진">' + icon('left') + '</button>' +
        '<span class="gallery__count"><b data-slide-cur>1</b> / ' + g.images.length + '</span>' +
        '<button type="button" class="icon-btn" data-action="slide-next" aria-label="다음 사진">' + icon('right') + '</button></div>'
      : '';
    return section('gallery',
      heading('GALLERY', g.title) +
      '<div class="gallery gallery--' + esc(layout) + ' reveal">' + items + '</div>' + slideUi + more);
  };

  R.video = function () {
    var v = C.video;
    if (!enabled(v) || !v.youtubeId) return '';
    var id = String(v.youtubeId).replace(/.*(?:youtu\.be\/|v=|embed\/|shorts\/)/, '').replace(/[?&].*/, '');
    return section('video',
      heading('WEDDING FILM', v.title) +
      '<div class="video reveal"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(id) + '?rel=0&playsinline=1" title="웨딩 영상" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>');
  };

  R.location = function () {
    var l = C.location;
    if (!enabled(l)) return '';
    var map;
    if (l.mapImage) {
      map = '<div class="map reveal">' + img(l.mapImage, '약도') + '</div>';
    } else if (W.lat && W.lng) {
      map = '<div class="map reveal">' +
        '<iframe title="예식장 지도" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + W.lat + ',' + W.lng + '&z=16&hl=ko&output=embed"></iframe>' +
        '<button type="button" class="map__lock" data-action="map-unlock">지도를 움직이려면 터치하세요</button></div>';
    } else map = '';
    var nav =
      '<div class="navi reveal">' +
      '<a class="navi__btn" target="_blank" rel="noopener" href="https://map.naver.com/p/search/' + encodeURIComponent(W.venue || W.address || '') + '"><img alt="" src="data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#03C75A"/><path d="M7 7h3.3l3.4 5V7H17v10h-3.3l-3.4-5v5H7z" fill="#fff"/></svg>') + '">네이버지도</a>' +
      '<a class="navi__btn" target="_blank" rel="noopener" href="https://map.kakao.com/link/to/' + encodeURIComponent(W.venue || '예식장') + ',' + W.lat + ',' + W.lng + '"><img alt="" src="data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#FFCD00"/><path d="M12 5.5c-3.6 0-6.5 2.3-6.5 5.1 0 1.8 1.2 3.4 3 4.3l-.6 2.3c-.1.3.2.5.4.3l2.7-1.8c.3 0 .6.1 1 .1 3.6 0 6.5-2.3 6.5-5.2S15.6 5.5 12 5.5z" fill="#3A1D1D"/></svg>') + '">카카오맵</a>' +
      '<button type="button" class="navi__btn" data-action="tmap"><img alt="" src="data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#EF3E5C"/><path d="M6 7h12v2.8h-4.4V18h-3.2V9.8H6z" fill="#fff"/></svg>') + '">티맵</button>' +
      '</div>';
    var transport = (l.transport || []).map(function (t) {
      var ic = { subway: 'subway', bus: 'bus', car: 'car', parking: 'parking', shuttle: 'bus' }[t.type] || 'pin';
      return '<div class="transport__item reveal"><h3>' + icon(ic) + esc(t.title || '') + '</h3><ul>' +
        (t.lines || []).map(function (line) { return '<li>' + nl2br(line) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
    return section('location',
      heading('LOCATION', l.title) +
      '<div class="venue reveal"><p class="venue__name">' + esc(W.venue || '') + (W.hall ? ' <span>' + esc(W.hall) + '</span>' : '') + '</p>' +
      '<p class="venue__addr">' + esc(W.address || '') + '</p>' +
      '<div class="venue__actions">' +
      '<button type="button" class="chip" data-action="copy" data-copy="' + esc(W.address || '') + '" data-msg="주소가 복사되었어요">' + icon('copy') + ' 주소 복사</button>' +
      (W.tel ? '<a class="chip" href="' + telHref(W.tel) + '">' + icon('phone') + ' 예식장 전화</a>' : '') +
      '</div></div>' + map + nav +
      (transport ? '<div class="transport">' + transport + '</div>' : ''));
  };

  R.notice = function () {
    var n = C.notice;
    if (!enabled(n) || !n.items || !n.items.length) return '';
    var tabs = n.items.length > 1
      ? '<div class="tabs" role="tablist">' + n.items.map(function (it, i) {
        return '<button type="button" role="tab" class="tabs__btn' + (i === 0 ? ' is-active' : '') + '" aria-selected="' + (i === 0) + '" data-action="tab" data-index="' + i + '">' + esc(it.title) + '</button>';
      }).join('') + '</div>'
      : '';
    var panels = n.items.map(function (it, i) {
      return '<div class="tabs__panel' + (i === 0 ? ' is-active' : '') + '" role="tabpanel">' +
        (n.items.length === 1 ? '<h3>' + esc(it.title) + '</h3>' : '') +
        (it.image ? img(it.image, it.title, 'tabs__img') : '') +
        '<p>' + nl2br(it.text) + '</p></div>';
    }).join('');
    return section('notice', heading('INFORMATION', n.title) + '<div class="notice-card reveal">' + tabs + panels + '</div>');
  };

  R.rsvp = function () {
    var r = C.rsvp;
    if (!enabled(r)) return '';
    if (!C.googleScriptUrl && !isPreview) return '';
    var deadline = '';
    if (r.deadline) {
      var p = r.deadline.split('-').map(Number);
      deadline = '<p class="rsvp__deadline">회신 기한 · ' + p[1] + '월 ' + p[2] + '일까지</p>';
    }
    return section('rsvp',
      heading('R.S.V.P', r.title) +
      '<div class="card reveal"><p class="card__msg">' + nl2br(r.message) + '</p>' +
      '<div class="rsvp__info"><p>' + icon('calendar') + esc(dateKo) + ' ' + esc(timeKo) + '</p><p>' + icon('pin') + esc(W.venue || '') + '</p></div>' +
      deadline +
      '<button type="button" class="btn btn--primary" data-action="rsvp">' + icon('check') + ' 참석 의사 전달하기</button></div>' +
      (!C.googleScriptUrl ? previewNote('참석 여부를 받으려면 config.js 의 googleScriptUrl 을 설정하세요. (docs/guestbook-rsvp.md 참고)') : ''));
  };

  R.account = function () {
    var a = C.account;
    if (!enabled(a)) return '';
    function group(side, label, list) {
      if (!list || !list.length) return '';
      return '<div class="acc" data-side="' + side + '">' +
        '<button type="button" class="acc__head" aria-expanded="false" data-action="accordion">' + esc(label) + icon('down', 'acc__chev') + '</button>' +
        '<div class="acc__body"><div class="acc__inner">' + list.map(function (x) {
          var copyText = (x.bank || '') + ' ' + (x.number || '');
          return '<div class="acc__row">' +
            '<div class="acc__info"><p class="acc__who"><span>' + esc(x.role || '') + '</span> ' + esc(x.name || '') + '</p>' +
            '<p class="acc__num">' + esc(x.bank || '') + ' ' + esc(x.number || '') + '</p></div>' +
            '<div class="acc__btns">' +
            '<button type="button" class="chip chip--sm" data-action="copy" data-copy="' + esc(copyText.trim()) + '" data-msg="계좌번호가 복사되었어요">' + icon('copy') + ' 복사</button>' +
            (x.kakaopay ? '<a class="chip chip--sm chip--kakao" target="_blank" rel="noopener" href="' + esc(x.kakaopay) + '">' + icon('kakao') + ' 송금</a>' : '') +
            '</div></div>';
        }).join('') + '</div></div></div>';
    }
    return section('account',
      heading('WITH LOVE', a.title) +
      '<p class="sec-desc reveal">' + nl2br(a.message) + '</p>' +
      '<div class="reveal">' + group('groom', '신랑측 계좌번호', a.groom) + group('bride', '신부측 계좌번호', a.bride) + '</div>');
  };

  R.guestbook = function () {
    var g = C.guestbook;
    if (!enabled(g)) return '';
    if (!C.googleScriptUrl && !isPreview) return '';
    return section('guestbook',
      heading('GUESTBOOK', g.title) +
      '<p class="sec-desc reveal">따뜻한 축하의 한마디를 남겨주세요.</p>' +
      '<div class="gb reveal" data-gb-list><p class="gb__empty">' + (C.googleScriptUrl ? '불러오는 중…' : '아직 남겨진 메시지가 없어요.') + '</p></div>' +
      '<div class="btn-row reveal">' +
      '<button type="button" class="btn btn--text" data-action="gb-more" hidden>더보기 ' + icon('down') + '</button>' +
      '<button type="button" class="btn btn--primary" data-action="gb-write">' + icon('pen') + ' 축하 메시지 남기기</button></div>' +
      (!C.googleScriptUrl ? previewNote('방명록을 쓰려면 config.js 의 googleScriptUrl 을 설정하세요. (docs/guestbook-rsvp.md 참고)') : ''));
  };

  R.closing = function () {
    var c = C.closing;
    if (!enabled(c)) return '';
    var kakao = C.share && C.share.kakaoJsKey;
    return section('closing',
      (c.image ? '<div class="closing__img reveal">' + img(c.image, '마무리 사진') + '</div>' : '') +
      '<p class="closing__msg reveal">' + nl2br(c.message) + '</p>' +
      '<p class="closing__names reveal">' + esc(groomFirst) + ' <i>' + icon('heart') + '</i> ' + esc(brideFirst) + '</p>' +
      '<div class="share reveal">' +
      (kakao ? '<button type="button" class="btn btn--kakao" data-action="share-kakao">' + icon('kakao') + ' 카카오톡으로 공유하기</button>' : '') +
      '<button type="button" class="btn btn--outline" data-action="share-link">' + icon('link') + ' 청첩장 링크 복사하기</button>' +
      '</div>');
  };

  function nextSectionId(id) {
    var list = sectionList();
    var i = list.indexOf(id);
    return list[i + 1] || id;
  }
  function sectionList() {
    return (C.sections || ['cover', 'greeting', 'contact', 'calendar', 'story', 'gallery', 'video', 'location', 'notice', 'rsvp', 'account', 'guestbook', 'closing']).filter(function (s) { return R[s]; });
  }

  /* ========================================================================
   *  화면 그리기
   * ====================================================================== */
  var root = document.documentElement;
  var theme = C.theme || {};
  root.setAttribute('data-theme', theme.preset || 'ivory');
  root.setAttribute('data-font', theme.font || 'serif');
  // 휴대폰 브라우저 위쪽 색을 테마 바탕색에 맞춤
  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue('--bg').trim() || themeColor.content;
  if (theme.animation === false || reduceMotion) root.classList.add('no-anim');
  if (store('largeText') === '1') root.classList.add('large-text');
  document.title = (C.meta && C.meta.title) || (G.name + ' ♥ ' + B.name + ' 결혼합니다');

  var html = '';
  sectionList().forEach(function (id) {
    try { html += R[id](); }
    catch (e) { console.error('[청첩장] ' + id + ' 섹션 오류', e); if (isPreview) html += previewNote(id + ' 섹션을 그리다 오류가 났어요: ' + esc(e.message)); }
  });
  html += '<footer class="footer"><p>Made with ♥ · <a href="' + TEMPLATE_URL + '" target="_blank" rel="noopener">나도 무료로 모바일 청첩장 만들기 →</a></p></footer>';
  app.innerHTML = html;

  // 데스크톱 배경
  var coverImg = C.cover && C.cover.image;
  if (coverImg) $('.backdrop').style.backgroundImage = 'url("' + coverImg.replace(/"/g, '') + '")';

  /* ── 떠 있는 버튼들 (음악, 글씨 크기, 빠른 메뉴) ──────────────────────── */
  var fab = document.createElement('div');
  fab.className = 'top-ctrl';
  fab.innerHTML =
    (enabled(C.music) && C.music.src ? '<button type="button" class="top-ctrl__btn" data-action="music" aria-label="배경음악 켜기/끄기" aria-pressed="false">' + icon('musicOff') + '</button>' : '') +
    '<button type="button" class="top-ctrl__btn top-ctrl__text" data-action="text-size" aria-label="글씨 크게 보기" aria-pressed="' + root.classList.contains('large-text') + '">가<small>+</small></button>';
  document.body.appendChild(fab);

  var quick = [];
  if ($('#location')) quick.push(['location', 'nav', '오시는 길']);
  if ($('#rsvp')) quick.push(['rsvp', 'check', '참석 여부']);
  if ($('#account')) quick.push(['account', 'gift', '마음 전하기']);
  quick.push(['__share', 'share', '공유하기']);
  var bar = document.createElement('nav');
  bar.className = 'quickbar';
  bar.setAttribute('aria-label', '빠른 메뉴');
  bar.innerHTML = quick.map(function (q) {
    return q[0] === '__share'
      ? '<button type="button" data-action="share">' + icon(q[1]) + '<span>' + q[2] + '</span></button>'
      : '<a href="#' + q[0] + '">' + icon(q[1]) + '<span>' + q[2] + '</span></a>';
  }).join('');
  document.body.appendChild(bar);

  var toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  document.body.appendChild(toastEl);

  /* ========================================================================
   *  동작
   * ====================================================================== */
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 2200);
  }

  function copy(text, msg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(msg || '복사되었어요'); } catch (e) { toast('복사에 실패했어요. 길게 눌러 복사해주세요.'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(msg || '복사되었어요'); }, fallback);
    } else fallback();
  }

  /* ── 모달 (뒤로가기 버튼으로 닫힘) ──────────────────────────────────── */
  var modalStack = [];
  function openModal(inner, opts) {
    opts = opts || {};
    var m = document.createElement('div');
    m.className = 'modal ' + (opts.cls || '');
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="modal__dim" data-close></div><div class="modal__panel">' +
      (opts.title ? '<div class="modal__head"><h2>' + esc(opts.title) + '</h2><button type="button" class="icon-btn" data-close aria-label="닫기">' + icon('close') + '</button></div>' : '') +
      '<div class="modal__body">' + inner + '</div></div>';
    document.body.appendChild(m);
    document.body.classList.add('is-locked');
    requestAnimationFrame(function () { m.classList.add('is-open'); });
    var entry = { el: m, onClose: opts.onClose };
    modalStack.push(entry);
    try { history.pushState({ modal: modalStack.length }, ''); } catch (e) { /* ignore */ }
    on(m, 'click', function (e) { if (e.target.closest('[data-close]')) closeModal(); });
    var focusEl = m.querySelector('input, textarea, button');
    if (focusEl && !isMobile) setTimeout(function () { focusEl.focus(); }, 50);
    return m;
  }
  function closeModal(fromPop) {
    var entry = modalStack.pop();
    if (!entry) return;
    entry.el.classList.remove('is-open');
    setTimeout(function () { entry.el.remove(); }, 250);
    if (!modalStack.length) document.body.classList.remove('is-locked');
    if (entry.onClose) entry.onClose();
    if (!fromPop) { try { history.back(); } catch (e) { /* ignore */ } }
  }
  on(window, 'popstate', function () { if (modalStack.length) closeModal(true); });
  on(document, 'keydown', function (e) { if (e.key === 'Escape' && modalStack.length) closeModal(); });

  /* ── 연락하기 ───────────────────────────────────────────────────────── */
  function openContact() {
    var people = contactPeople();
    function col(side, label) {
      var list = people.filter(function (p) { return p.side === side; });
      if (!list.length) return '';
      return '<div class="contact__col"><h3>' + label + '</h3>' + list.map(function (p) {
        return '<div class="contact__row"><p><span>' + esc(p.role) + '</span>' + esc(p.name) + '</p><div>' +
          '<a class="icon-btn icon-btn--soft" href="' + telHref(p.phone) + '" aria-label="' + esc(p.name) + '에게 전화">' + icon('phone') + '</a>' +
          '<a class="icon-btn icon-btn--soft" href="' + smsHref(p.phone) + '" aria-label="' + esc(p.name) + '에게 문자">' + icon('sms') + '</a>' +
          '</div></div>';
      }).join('') + '</div>';
    }
    openModal('<div class="contact">' + col('groom', '신랑측') + col('bride', '신부측') + '</div>', { title: '축하 연락하기' });
  }

  /* ── 캘린더 추가 ────────────────────────────────────────────────────── */
  function addToCalendar() {
    var start = weddingAt;
    var end = new Date(start.getTime() + 2 * 3600 * 1000);
    function fmt(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    var title = groomFirst + ' ♥ ' + brideFirst + ' 결혼식';
    var loc = [[W.venue, W.hall].filter(Boolean).join(' '), W.address].filter(Boolean).join(', ');
    var gUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) +
      '&dates=' + fmt(start) + '/' + fmt(end) + '&location=' + encodeURIComponent(loc) + '&details=' + encodeURIComponent(pageUrl);

    // 배포본은 build 가 만든 wedding.ics 파일 주소를, 내 컴퓨터 미리보기는 즉석에서 만든 파일을 사용
    var icsUrl = window.WEDDING_ICS ? absUrl(window.WEDDING_ICS) : 'data:text/calendar;charset=utf-8,' + encodeURIComponent(
      ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//wedding-invitation//KO', 'BEGIN:VEVENT',
        'UID:' + fmt(start) + '@wedding-invitation', 'DTSTAMP:' + fmt(new Date()), 'DTSTART:' + fmt(start), 'DTEND:' + fmt(end),
        'SUMMARY:' + title, 'LOCATION:' + loc.replace(/,/g, '\\,'),
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:내일은 ' + title + '입니다', 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR'].join('\r\n'));

    var ua = navigator.userAgent;
    var isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/i.test(ua);
    var inKakao = /KAKAOTALK/i.test(ua);
    // 카카오톡 안 브라우저는 캘린더·다운로드가 막혀 있어서 휴대폰 기본 브라우저로 열어요
    function out(url) { return inKakao && /^https:/.test(url) ? 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url) : url; }
    function btn(label, url, attrs) {
      return '<a class="btn btn--outline" href="' + esc(out(url)) + '" ' + (attrs || '') + '>' + icon('calendar') + ' ' + label + '</a>';
    }
    var apple = btn('아이폰 캘린더', icsUrl, window.WEDDING_ICS ? '' : 'download="wedding.ics"');
    var google = btn('구글 캘린더', gUrl, 'target="_blank" rel="noopener"');
    var file = btn(isAndroid ? '삼성 캘린더 (파일 받기)' : '캘린더 파일 받기 (.ics)', icsUrl, 'download="wedding.ics"');
    var buttons = isIOS ? [apple, google] : [google, file];
    var hints = ['하루 전 알림이 함께 등록돼요.'];
    if (inKakao) hints.push('카카오톡에서는 휴대폰 기본 브라우저로 열려요.');
    if (isAndroid) hints.push('삼성 캘린더는 받은 파일을 눌러 추가해 주세요.');
    openModal('<div class="cal-add">' + buttons.join('') + '<p class="hint">' + hints.join('<br>') + '</p></div>',
      { title: '내 캘린더에 추가', cls: 'modal--sheet' });
  }

  /* ── D-day 카운트다운 ──────────────────────────────────────────────── */
  function tickCountdown() {
    var boxes = $$('[data-cd]');
    var textEl = $('[data-cd-text]');
    if (!boxes.length && !textEl) return;
    var diff = weddingAt.getTime() - Date.now();
    var abs = Math.max(diff, 0);
    // 예식 시간이 지나면 0:00:00 대신 안내 문구만 보여줍니다.
    var box = $('.countdown');
    if (box) box.hidden = diff <= 0;
    var vals = [Math.floor(abs / 864e5), Math.floor(abs / 36e5) % 24, Math.floor(abs / 6e4) % 60, Math.floor(abs / 1e3) % 60];
    boxes.forEach(function (b) { var i = +b.getAttribute('data-cd'); b.textContent = i === 0 ? vals[0] : pad(vals[i]); });
    if (textEl) {
      var names = esc(groomFirst) + ' <i class="heart">' + icon('heart') + '</i> ' + esc(brideFirst);
      // 날짜 기준 D-day (한국 시간)
      var todayKst = new Date(Date.now() + 9 * 3600e3);
      var dayDiff = Math.round((Date.UTC(Y, M - 1, D) - Date.UTC(todayKst.getUTCFullYear(), todayKst.getUTCMonth(), todayKst.getUTCDate())) / 864e5);
      textEl.innerHTML = dayDiff > 0 ? names + '의 결혼식이 <b>' + dayDiff + '일</b> 남았습니다.'
        : dayDiff === 0 ? '오늘은 ' + names + '의 <b>결혼식 날</b>입니다!'
        : names + '의 결혼식이 <b>' + (-dayDiff) + '일</b> 지났습니다. 감사합니다.';
    }
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ── 갤러리 라이트박스 ──────────────────────────────────────────────── */
  function openLightbox(index) {
    var imgs = (C.gallery && C.gallery.images) || [];
    var m = openModal(
      '<div class="lb__track">' + imgs.map(function (src, i) {
        return '<div class="lb__slide"><img src="' + esc(src) + '" alt="웨딩 사진 ' + (i + 1) + '" ' + (Math.abs(i - index) > 1 ? 'loading="lazy"' : '') + ' decoding="async"></div>';
      }).join('') + '</div>' +
      '<div class="lb__bar"><span class="lb__count"><b>' + (index + 1) + '</b> / ' + imgs.length + '</span>' +
      '<button type="button" class="icon-btn icon-btn--light" data-close aria-label="닫기">' + icon('close') + '</button></div>' +
      '<button type="button" class="lb__arrow lb__arrow--prev" aria-label="이전 사진">' + icon('left') + '</button>' +
      '<button type="button" class="lb__arrow lb__arrow--next" aria-label="다음 사진">' + icon('right') + '</button>',
      { cls: 'modal--lightbox' });
    var track = $('.lb__track', m);
    var count = $('.lb__count b', m);
    function go(i) { i = Math.max(0, Math.min(imgs.length - 1, i)); track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); }
    function cur() { return Math.round(track.scrollLeft / track.clientWidth); }
    requestAnimationFrame(function () { track.scrollLeft = index * track.clientWidth; });
    on(track, 'scroll', function () { count.textContent = cur() + 1; }, { passive: true });
    on($('.lb__arrow--prev', m), 'click', function () { go(cur() - 1); });
    on($('.lb__arrow--next', m), 'click', function () { go(cur() + 1); });
    function key(e) { if (e.key === 'ArrowLeft') go(cur() - 1); if (e.key === 'ArrowRight') go(cur() + 1); }
    on(document, 'keydown', key);
    modalStack[modalStack.length - 1].onClose = function () { document.removeEventListener('keydown', key); };
  }

  // 슬라이드형 갤러리
  var slideGallery = $('.gallery--slide');
  if (slideGallery) {
    on(slideGallery, 'scroll', function () {
      var c = $('[data-slide-cur]');
      if (c) c.textContent = Math.round(slideGallery.scrollLeft / slideGallery.clientWidth) + 1;
    }, { passive: true });
  }
  function slideBy(dir) {
    if (!slideGallery) return;
    var i = Math.round(slideGallery.scrollLeft / slideGallery.clientWidth) + dir;
    slideGallery.scrollTo({ left: i * slideGallery.clientWidth, behavior: 'smooth' });
  }

  /* ── 지도 앱 ────────────────────────────────────────────────────────── */
  function openTmap() {
    if (!isMobile) { toast('티맵은 휴대폰에서만 열 수 있어요'); return; }
    var url = 'tmap://route?goalname=' + encodeURIComponent(W.venue || '') + '&goalx=' + W.lng + '&goaly=' + W.lat;
    var start = Date.now();
    location.href = url;
    setTimeout(function () {
      if (!document.hidden && Date.now() - start < 2500) toast('티맵 앱이 설치되어 있지 않은 것 같아요');
    }, 1800);
  }

  /* ── 공유 ───────────────────────────────────────────────────────────── */
  var pageUrl = location.href.split('#')[0].replace(/[?&]preview\b/, '').replace(/\?$/, '');
  function absUrl(p) { try { return new URL(p, pageUrl).href; } catch (e) { return p; } }

  var kakaoReady = null;
  function loadKakao() {
    if (kakaoReady) return kakaoReady;
    kakaoReady = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
      s.crossOrigin = 'anonymous';
      s.onload = function () {
        try { if (!window.Kakao.isInitialized()) window.Kakao.init(C.share.kakaoJsKey); resolve(window.Kakao); }
        catch (e) { reject(e); }
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return kakaoReady;
  }
  function shareKakao() {
    loadKakao().then(function (Kakao) {
      var meta = C.meta || {};
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: meta.title || document.title,
          description: meta.description || (dateKo + ' ' + timeKo),
          imageUrl: absUrl(meta.image || (C.cover && C.cover.image) || ''),
          link: { mobileWebUrl: pageUrl, webUrl: pageUrl },
        },
        buttons: [
          { title: (C.share && C.share.kakaoButtonText) || '청첩장 보기', link: { mobileWebUrl: pageUrl, webUrl: pageUrl } },
          { title: '위치 보기', link: { mobileWebUrl: pageUrl + '#location', webUrl: pageUrl + '#location' } },
        ],
      });
    }).catch(function () { toast('카카오톡 공유를 불러오지 못했어요. 링크 복사를 이용해주세요.'); });
  }
  function openShare() {
    var kakao = C.share && C.share.kakaoJsKey;
    var native = !!navigator.share;
    openModal(
      '<div class="share-sheet">' +
      (kakao ? '<button type="button" class="share-sheet__btn" data-action="share-kakao"><span class="share-sheet__ic share-sheet__ic--kakao">' + icon('kakao') + '</span>카카오톡</button>' : '') +
      '<button type="button" class="share-sheet__btn" data-action="share-link"><span class="share-sheet__ic">' + icon('link') + '</span>링크 복사</button>' +
      (native ? '<button type="button" class="share-sheet__btn" data-action="share-native"><span class="share-sheet__ic">' + icon('share') + '</span>다른 앱</button>' : '') +
      '</div>',
      { title: '청첩장 공유하기', cls: 'modal--sheet' });
  }
  function shareNative() {
    navigator.share({ title: document.title, text: (C.meta && C.meta.description) || '', url: pageUrl }).catch(function () { /* 취소 */ });
  }

  /* ── 배경음악 ───────────────────────────────────────────────────────── */
  var audio = null;
  function setMusic(play) {
    var btn = $('[data-action="music"]');
    if (!btn) return;
    if (!audio) { audio = new Audio(C.music.src); audio.loop = true; audio.volume = 0.6; }
    if (play) {
      audio.play().then(function () {
        btn.innerHTML = icon('music'); btn.setAttribute('aria-pressed', 'true'); btn.classList.add('is-playing');
      }).catch(function () { /* 자동재생 차단 */ });
    } else {
      audio.pause();
      btn.innerHTML = icon('musicOff'); btn.setAttribute('aria-pressed', 'false'); btn.classList.remove('is-playing');
    }
    store('music', play ? '1' : '0');
  }
  if ($('[data-action="music"]') && store('music') !== '0') {
    // 휴대폰은 첫 터치 이후에만 소리 재생이 가능합니다.
    var firstTouch = function (e) {
      if (e.target.closest && e.target.closest('[data-action="music"]')) return;
      setMusic(true);
      ['touchend', 'click'].forEach(function (ev) { document.removeEventListener(ev, firstTouch, true); });
    };
    ['touchend', 'click'].forEach(function (ev) { document.addEventListener(ev, firstTouch, true); });
  }

  /* ── 구글 시트 통신 (방명록·참석여부) ───────────────────────────────── */
  function api(method, payload) {
    var url = C.googleScriptUrl;
    if (!url) return Promise.reject(new Error('NO_URL'));
    var opts = method === 'GET'
      ? {}
      // text/plain 으로 보내야 구글 스크립트가 추가 확인(CORS) 없이 받습니다.
      : { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) };
    var full = method === 'GET' ? url + (url.indexOf('?') < 0 ? '?' : '&') + 'type=' + payload.type + '&t=' + Date.now() : url;
    return fetch(full, opts).then(function (r) { return r.json(); }).then(function (res) {
      if (!res || res.ok === false) throw new Error((res && res.error) || 'FAILED');
      return res;
    });
  }
  function notReady() { toast('아직 준비 중인 기능이에요 (구글 시트 연결 필요)'); }

  /* ── 참석 의사 (RSVP) ──────────────────────────────────────────────── */
  function openRsvp() {
    var r = C.rsvp || {};
    var m = openModal(
      '<form class="form" data-form="rsvp" novalidate>' +
      '<fieldset class="seg"><legend>어느 쪽 하객이신가요?</legend>' +
      '<label><input type="radio" name="side" value="신랑측" required><span>신랑측</span></label>' +
      '<label><input type="radio" name="side" value="신부측"><span>신부측</span></label></fieldset>' +
      '<fieldset class="seg"><legend>참석 여부</legend>' +
      '<label><input type="radio" name="attend" value="참석" required checked><span>참석할게요</span></label>' +
      '<label><input type="radio" name="attend" value="불참"><span>마음만 전할게요</span></label></fieldset>' +
      '<label class="field"><span>성함</span><input name="name" required maxlength="20" autocomplete="name" placeholder="홍길동"></label>' +
      (r.askCompanion !== false ? '<label class="field" data-attend-only><span>본인 포함 참석 인원</span>' +
        '<div class="stepper"><button type="button" data-step="-1" aria-label="인원 줄이기">−</button><input name="count" type="number" inputmode="numeric" min="1" max="20" value="1"><button type="button" data-step="1" aria-label="인원 늘리기">+</button></div></label>' : '') +
      (r.askMeal !== false ? '<fieldset class="seg" data-attend-only><legend>식사 여부</legend>' +
        '<label><input type="radio" name="meal" value="예정" checked><span>식사 예정</span></label>' +
        '<label><input type="radio" name="meal" value="안함"><span>안 함</span></label>' +
        '<label><input type="radio" name="meal" value="미정"><span>미정</span></label></fieldset>' : '') +
      '<label class="field"><span>전하실 말씀 <small>(선택)</small></span><textarea name="memo" rows="2" maxlength="200" placeholder="예) 아이 1명과 함께 가요"></textarea></label>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button type="submit" class="btn btn--primary">전달하기</button>' +
      '</form>',
      { title: r.title || '참석 의사 전달' });
    var form = $('form', m);
    function syncAttend() {
      var no = form.attend.value === '불참';
      $$('[data-attend-only]', form).forEach(function (el) { el.hidden = no; });
    }
    on(form, 'change', syncAttend);
    $$('[data-step]', form).forEach(function (b) {
      on(b, 'click', function () {
        var n = Math.max(1, Math.min(20, (+form.count.value || 1) + (+b.getAttribute('data-step'))));
        form.count.value = n;
      });
    });
    on(form, 'submit', function (e) {
      e.preventDefault();
      if (form.website.value) return; // 스팸 방지
      if (!form.side.value) { toast('신랑측 / 신부측을 선택해주세요'); return; }
      if (!form.name.value.trim()) { toast('성함을 입력해주세요'); form.name.focus(); return; }
      if (!C.googleScriptUrl) { notReady(); return; }
      var btn = $('button[type=submit]', form);
      btn.disabled = true; btn.textContent = '전달하는 중…';
      var attend = form.attend.value;
      api('POST', {
        type: 'rsvp', side: form.side.value, attend: attend, name: form.name.value.trim(),
        count: attend === '참석' && form.count ? form.count.value : 0,
        meal: attend === '참석' && form.meal ? form.meal.value : '',
        memo: form.memo.value.trim(),
      }).then(function () {
        store('rsvpDone', '1');
        closeModal();
        toast(attend === '참석' ? '참석 의사가 전달되었어요. 감사합니다!' : '따뜻한 마음 감사합니다.');
      }).catch(function () {
        btn.disabled = false; btn.textContent = '전달하기';
        toast('전송에 실패했어요. 잠시 후 다시 시도해주세요.');
      });
    });
  }

  /* ── 방명록 ─────────────────────────────────────────────────────────── */
  var gbItems = [], gbShown = 0;
  var gbPage = (C.guestbook && C.guestbook.pageSize) || 5;
  function renderGuestbook() {
    var list = $('[data-gb-list]');
    if (!list) return;
    if (!gbItems.length) { list.innerHTML = '<p class="gb__empty">첫 번째 축하 메시지를 남겨주세요 💐</p>'; }
    else {
      list.innerHTML = gbItems.slice(0, gbShown).map(function (it) {
        var d = it.createdAt ? new Date(it.createdAt) : null;
        var ds = d && !isNaN(d) ? d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) : '';
        return '<article class="gb__item"><header><b>' + esc(it.name) + '</b><time>' + ds + '</time></header><p>' + nl2br(it.message) + '</p></article>';
      }).join('');
    }
    var more = $('[data-action="gb-more"]');
    if (more) more.hidden = gbShown >= gbItems.length;
  }
  function loadGuestbook() {
    if (!$('[data-gb-list]') || !C.googleScriptUrl) return;
    api('GET', { type: 'guestbook' }).then(function (res) {
      gbItems = res.items || [];
      gbShown = Math.min(gbPage, gbItems.length);
      renderGuestbook();
    }).catch(function () {
      $('[data-gb-list]').innerHTML = '<p class="gb__empty">방명록을 불러오지 못했어요.</p>';
    });
  }
  function openGuestbookWrite() {
    var m = openModal(
      '<form class="form" novalidate>' +
      '<label class="field"><span>이름</span><input name="name" required maxlength="20" placeholder="이름을 입력해주세요"></label>' +
      '<label class="field"><span>축하 메시지</span><textarea name="message" rows="5" required maxlength="500" placeholder="두 사람에게 축하의 마음을 전해주세요"></textarea><small class="field__count"><b>0</b> / 500</small></label>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button type="submit" class="btn btn--primary">남기기</button></form>',
      { title: '축하 메시지 남기기' });
    var form = $('form', m);
    var cnt = $('.field__count b', m);
    on(form.message, 'input', function () { cnt.textContent = form.message.value.length; });
    on(form, 'submit', function (e) {
      e.preventDefault();
      if (form.website.value) return;
      var name = form.name.value.trim(), message = form.message.value.trim();
      if (!name) { toast('이름을 입력해주세요'); return; }
      if (!message) { toast('메시지를 입력해주세요'); return; }
      if (!C.googleScriptUrl) { notReady(); return; }
      var btn = $('button[type=submit]', form);
      btn.disabled = true; btn.textContent = '남기는 중…';
      api('POST', { type: 'guestbook', name: name, message: message }).then(function () {
        gbItems.unshift({ name: name, message: message, createdAt: new Date().toISOString() });
        gbShown = Math.min(Math.max(gbShown + 1, gbPage), gbItems.length);
        renderGuestbook();
        closeModal();
        toast('축하 메시지가 등록되었어요 💐');
      }).catch(function () {
        btn.disabled = false; btn.textContent = '남기기';
        toast('등록에 실패했어요. 잠시 후 다시 시도해주세요.');
      });
    });
  }
  loadGuestbook();

  /* ── 클릭 이벤트 한 곳에서 처리 ────────────────────────────────────── */
  on(document, 'click', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) return;
    var a = t.getAttribute('data-action');
    switch (a) {
      case 'copy': copy(t.getAttribute('data-copy'), t.getAttribute('data-msg')); break;
      case 'contact': openContact(); break;
      case 'add-calendar': addToCalendar(); break;
      case 'lightbox': openLightbox(+t.getAttribute('data-index')); break;
      case 'gallery-more':
        $$('.gallery__item.is-hidden').forEach(function (el) { el.classList.remove('is-hidden'); });
        t.remove(); break;
      case 'slide-prev': slideBy(-1); break;
      case 'slide-next': slideBy(1); break;
      case 'map-unlock': t.remove(); break;
      case 'tmap': openTmap(); break;
      case 'tab': {
        var card = t.closest('.notice-card'), idx = +t.getAttribute('data-index');
        $$('.tabs__btn', card).forEach(function (b, i) { b.classList.toggle('is-active', i === idx); b.setAttribute('aria-selected', i === idx); });
        $$('.tabs__panel', card).forEach(function (p, i) { p.classList.toggle('is-active', i === idx); });
        break;
      }
      case 'accordion': {
        var acc = t.closest('.acc'), open = !acc.classList.contains('is-open');
        acc.classList.toggle('is-open', open);
        t.setAttribute('aria-expanded', open);
        break;
      }
      case 'rsvp': openRsvp(); break;
      case 'gb-write': openGuestbookWrite(); break;
      case 'gb-more': gbShown = Math.min(gbShown + gbPage, gbItems.length); renderGuestbook(); break;
      case 'share': openShare(); break;
      case 'share-kakao': shareKakao(); break;
      case 'share-link': copy(pageUrl, '청첩장 링크가 복사되었어요'); break;
      case 'share-native': shareNative(); break;
      case 'music': setMusic(!(audio && !audio.paused)); break;
      case 'text-size': {
        var large = root.classList.toggle('large-text');
        t.setAttribute('aria-pressed', large);
        store('largeText', large ? '1' : '0');
        toast(large ? '글씨를 크게 표시합니다' : '기본 글씨 크기로 돌아왔어요');
        break;
      }
    }
  });

  /* ── 스크롤 애니메이션 & 빠른 메뉴 표시 ────────────────────────────── */
  if ('IntersectionObserver' in window && !root.classList.contains('no-anim')) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  var coverEl = $('#cover');
  function onScroll() {
    var past = coverEl ? window.scrollY > coverEl.offsetHeight * 0.6 : window.scrollY > 200;
    var nearEnd = window.innerHeight + window.scrollY > document.body.scrollHeight - 80;
    bar.classList.toggle('is-show', past && !nearEnd);
    fab.classList.toggle('is-solid', past);
  }
  on(window, 'scroll', onScroll, { passive: true });
  onScroll();

  // 열자마자 참석여부 묻기
  if (C.rsvp && C.rsvp.popupOnLoad && $('#rsvp') && C.googleScriptUrl && !store('rsvpDone')) {
    setTimeout(openRsvp, 1500);
  }

  // 공유 링크에 #location 처럼 위치가 붙어오면 그 섹션으로 이동
  if (location.hash && location.hash.length > 1) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(function () { target.scrollIntoView(); }, 300);
  }

  /* ── 꽃잎 / 눈 효과 ─────────────────────────────────────────────────── */
  (function effects() {
    var type = theme.effect;
    if (!type || type === 'none' || reduceMotion) return;
    var cv = document.createElement('canvas');
    cv.className = 'fx';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w, h, parts = [];
    var color = getComputedStyle(root).getPropertyValue('--fx').trim() || '#f2c4ce';
    function resize() { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    resize(); on(window, 'resize', resize);
    var N = type === 'snow' ? 34 : 16;
    function spawn(p, initial) {
      p.x = Math.random() * w; p.y = initial ? Math.random() * h : -20;
      p.r = type === 'snow' ? 1.2 + Math.random() * 2.2 : type === 'sparkle' ? 1 + Math.random() * 2 : 5 + Math.random() * 5;
      p.vy = type === 'snow' ? 0.3 + Math.random() * 0.6 : 0.4 + Math.random() * 0.7;
      p.vx = -0.3 + Math.random() * 0.6; p.rot = Math.random() * 6.28; p.vr = -0.02 + Math.random() * 0.04;
      p.sw = Math.random() * 6.28; p.a = 0.35 + Math.random() * 0.5; p.tw = Math.random() * 6.28;
      return p;
    }
    for (var i = 0; i < N; i++) parts.push(spawn({}, true));
    var running = true;
    on(document, 'visibilitychange', function () { running = !document.hidden; if (running) requestAnimationFrame(loop); });
    function loop() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      parts.forEach(function (p) {
        p.sw += 0.012; p.y += p.vy; p.x += p.vx + Math.sin(p.sw) * 0.35; p.rot += p.vr; p.tw += 0.05;
        if (p.y > h + 20) spawn(p);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        if (type === 'snow') {
          ctx.globalAlpha = p.a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.28); ctx.fill();
        } else if (type === 'sparkle') {
          ctx.globalAlpha = p.a * (0.5 + 0.5 * Math.sin(p.tw)); ctx.fillStyle = color;
          ctx.beginPath(); for (var k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.moveTo(0, 0); ctx.quadraticCurveTo(p.r * 0.4, p.r * 0.4, 0, p.r * 3); } ctx.fill();
        } else {
          ctx.globalAlpha = p.a; ctx.fillStyle = color;
          ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.bezierCurveTo(p.r, -p.r * 0.6, p.r * 0.7, p.r * 0.6, 0, p.r);
          ctx.bezierCurveTo(-p.r * 0.7, p.r * 0.6, -p.r, -p.r * 0.6, 0, -p.r); ctx.fill();
        }
        ctx.restore();
      });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();
})();
