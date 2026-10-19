/* 브라우저와 빌드가 같은 규칙으로 검사합니다. 외부 라이브러리가 필요하지 않아요. */
(function (root) {
  'use strict';
  var SECTIONS = 'cover greeting contact calendar story gallery video location notice rsvp account guestbook closing'.split(' ');
  function object(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function empty(v) { return v === '' || v === null || v === undefined; }
  function validDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-').map(Number), d = new Date(s + 'T00:00:00Z');
    return p[0] >= 1900 && !isNaN(d) && d.getUTCFullYear() === p[0] && d.getUTCMonth() + 1 === p[1] && d.getUTCDate() === p[2];
  }
  function validTime(s) { return typeof s === 'string' && /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(s); }
  function hasCoordinates(w) {
    return !!w && typeof w.lat === 'number' && Number.isFinite(w.lat) && Math.abs(w.lat) <= 90 &&
      typeof w.lng === 'number' && Number.isFinite(w.lng) && Math.abs(w.lng) <= 180;
  }
  function safeAsset(v) {
    return typeof v === 'string' && (v === '' || /^https:\/\/[^\s]+$/i.test(v) ||
      (/^(images|demo)\/[^?#\\\x00-\x1f]+$/.test(v) && v.split('/').every(function (p) { return p !== '..' && p !== '.'; })));
  }
  var str = { test: function (v) { return typeof v === 'string'; }, hint: '따옴표 안의 글자로 입력해주세요.' };
  var required = { test: function (v) { return typeof v === 'string' && !!v.trim(); }, hint: '필수 정보가 비어 있어요.' };
  var bool = { test: function (v) { return typeof v === 'boolean'; }, hint: 'true 또는 false 로 입력해주세요.' };
  var asset = { test: safeAsset, hint: 'images/파일이름 또는 https:// 주소를 사용해주세요. #, ?, .. 경로는 쓸 수 없어요.' };
  function choice(values) { return { test: function (v) { return values.includes(v); }, hint: values.join(', ') + ' 중 하나를 골라주세요.' }; }
  function integer(min, max) { return { test: function (v) { return Number.isInteger(v) && v >= min && v <= max; }, hint: min + '~' + max + ' 사이 정수를 입력해주세요.' }; }
  function optional(rule) { return { optional: true, rule: rule }; }
  function list(rule) { return { list: rule }; }
  var parent = { name: str, phone: str, deceased: bool };
  var person = { name: required, firstName: str, relation: str, phone: str, father: parent, mother: parent };
  var account = { role: required, name: str, bank: required, number: required, kakaopay: str };
  var schema = {
    privacy: { publishConsent: { test: function (v) { return v === true; }, hint: '공개 저장소에 사진·연락처·계좌가 게시되는 점을 확인한 뒤 true 로 바꿔주세요. 숨김은 비공개 기능이 아니에요.' } },
    theme: { preset: choice(['ivory','blush','sage','navy','mono','lavender']), font: choice(['serif','sans','hand']), effect: choice(['none','petal','snow','sparkle']), animation: bool },
    meta: { title: str, description: str, image: asset }, groom: person, bride: person,
    deceasedMark: choice(['flower','hanja','none']),
    wedding: { date: { test: validDate, hint: '실제 존재하는 날짜를 YYYY-MM-DD 로 입력해주세요.' }, time: { test: validTime, hint: '00:00~23:59 사이 한국시간을 입력해주세요.' }, venue: required, hall: str, address: required, tel: str, lat: { test: function(v) { return empty(v) || typeof v === 'number'; }, hint: '숫자 또는 빈 값으로 입력해주세요.' }, lng: { test: function(v) { return empty(v) || typeof v === 'number'; }, hint: '숫자 또는 빈 값으로 입력해주세요.' } },
    cover: { image: asset, layout: choice(['full','arch','frame']), subtitle: str },
    greeting: { enabled: bool, title: str, quote: { text: str, author: str }, message: str, showParents: bool },
    calendar: { enabled: bool, countdown: bool, addToCalendar: bool },
    story: { enabled: bool, title: str, items: list({ date: str, title: str, text: str, image: optional(asset) }) },
    gallery: { enabled: bool, title: str, layout: choice(['grid','masonry','slide']), initialCount: integer(1,100), images: list(asset) },
    video: { enabled: bool, title: str, youtubeId: str },
    location: { enabled: bool, title: str, mapImage: asset, transport: list({ type: choice(['subway','bus','car','parking','shuttle']), title: str, lines: list(str) }) },
    notice: { enabled: bool, title: str, items: list({ title: str, text: str, image: optional(asset) }) },
    rsvp: { enabled: bool, title: str, message: str, deadline: str, askMeal: bool, askCompanion: bool, popupOnLoad: bool },
    account: { enabled: bool, title: str, message: str, groom: list(account), bride: list(account) },
    guestbook: { enabled: bool, title: str, pageSize: integer(1,50) }, googleScriptUrl: str,
    share: { kakaoJsKey: str, kakaoButtonText: str }, music: { enabled: bool, src: asset },
    closing: { enabled: bool, image: asset, message: str }, sections: list(choice(SECTIONS))
  };
  function validate(c) {
    var errors = [], warnings = [];
    function error(k, text) { errors.push(k + ': ' + text); }
    function walk(v, rule, p) {
      if (rule.optional) { if (v !== undefined) walk(v, rule.rule, p); return; }
      if (rule.test) { if (!rule.test(v)) error(p, rule.hint); return; }
      if (rule.list) {
        if (!Array.isArray(v)) { error(p, '[ ... ] 형태의 목록으로 입력해주세요.'); return; }
        v.forEach(function (it, i) { walk(it, rule.list, p + '[' + i + ']'); }); return;
      }
      if (!object(v)) { error(p || 'window.WEDDING', '{ ... } 형태의 설정이 필요해요.'); return; }
      Object.keys(rule).forEach(function (k) { walk(v[k], rule[k], p ? p + '.' + k : k); });
      Object.keys(v).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(rule, k)) error(p ? p + '.' + k : k, '알 수 없는 항목이에요. 철자를 확인해주세요.'); });
    }
    walk(c, schema, '');
    if (errors.length) return { errors: errors, warnings: warnings };
    var w = c.wedding;
    if (!(empty(w.lat) && empty(w.lng)) && !hasCoordinates(w)) error('wedding.lat/lng', '위도(-90~90), 경도(-180~180)를 함께 입력하거나 둘 다 비워주세요.');
    if (!c.cover.image) error('cover.image', '표지 사진 경로가 필요해요.');
    if (c.video.enabled && !c.video.youtubeId) error('video.youtubeId', '영상 주소 또는 ID가 필요해요.');
    if (c.music.enabled && !c.music.src) error('music.src', '음악 파일 경로가 필요해요.');
    if (c.rsvp.deadline && (!validDate(c.rsvp.deadline) || c.rsvp.deadline > w.date)) error('rsvp.deadline', '예식일까지의 실제 날짜를 입력하거나 비워주세요.');
    if (c.googleScriptUrl && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(c.googleScriptUrl)) error('googleScriptUrl', 'https://script.google.com/macros/s/.../exec 형태의 웹 앱 URL을 입력해주세요.');
    if (!c.sections.includes('cover')) error('sections', 'cover (표지)를 포함해주세요.');
    if (new Set(c.sections).size !== c.sections.length) error('sections', '같은 섹션을 두 번 넣을 수 없어요.');
    ['groom','bride'].forEach(function (side) {
      if (c[side].firstName && !c[side].name.includes(c[side].firstName)) warnings.push(side + '.firstName 이 전체 이름과 달라요. 별도 호칭이 필요 없으면 비워주세요.');
      c.account[side].forEach(function (a, i) {
        var p = 'account.' + side + '[' + i + ']';
        if (/^0+$/.test(a.number.replace(/[-\s]/g, ''))) error(p + '.number', '0으로만 된 예시 계좌를 실제 계좌로 바꾸거나 해당 줄을 지워주세요.');
        if (a.kakaopay && !/^https:\/\/[^\s]+$/i.test(a.kakaopay)) error(p + '.kakaopay', 'https:// 송금 링크를 입력해주세요.');
      });
    });
    var n = normalize(c);
    ['groom','bride'].forEach(function (side) { n.account[side].forEach(function (a, i) { if (!a.name.trim()) error('account.' + side + '[' + i + '].name', '예금주 이름이 필요해요.'); }); });
    return { errors: errors, warnings: warnings };
  }
  function normalize(config) {
    var c = JSON.parse(JSON.stringify(config));
    c.meta = c.meta || {};
    var g = c.groom || {}, b = c.bride || {}, w = c.wedding || {};
    c.meta.title = c.meta.title || (g.name || '신랑') + ' ♥ ' + (b.name || '신부') + ' 결혼식에 초대합니다';
    c.meta.description = c.meta.description || [w.date, w.time, w.venue, w.hall].filter(Boolean).join(' · ');
    var owners = { '신랑': g.name, '신부': b.name, '신랑 아버지': g.father && g.father.name, '신랑 어머니': g.mother && g.mother.name, '신부 아버지': b.father && b.father.name, '신부 어머니': b.mother && b.mother.name };
    if (c.account) ['groom','bride'].forEach(function (side) { if (Array.isArray(c.account[side])) c.account[side].forEach(function (a) { if (object(a) && !a.name) a.name = owners[a.role] || ''; }); });
    return c;
  }
  var api = { validate: validate, normalize: normalize, validDate: validDate, validTime: validTime, hasCoordinates: hasCoordinates };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WeddingConfig = api;
})(typeof window !== 'undefined' ? window : this);
