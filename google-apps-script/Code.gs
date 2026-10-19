/**
 * 모바일 청첩장 — 구글 시트에 연결된 Apps Script에 붙여넣으세요.
 * 실행 사용자: 나 / 액세스: 모든 사용자. docs/guestbook-rsvp.md 참고.
 * 현재 연결된 문서에 필요한 권한만 요청합니다.
 * @OnlyCurrentDoc
 */
var SHEETS = {
  guestbook: { name: '방명록', headers: ['작성시각', '이름', '메시지', '숨김'] },
  rsvp: { name: '참석여부', headers: ['작성시각', '구분', '참석', '성함', '인원', '식사', '메모'] },
};
function sheet_(key) {
  var conf = SHEETS[key], ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(conf.name);
  if (!sh) {
    sh = ss.insertSheet(conf.name); sh.appendRow(conf.headers); sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, conf.headers.length).setFontWeight('bold').setBackground('#f3ede6');
  }
  return sh;
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function clean_(s, max) {
  s = String(s == null ? '' : s).trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, max || 500);
}
function text_(v, max, required) { return typeof v === 'string' && v.length <= max && (!required || !!v.trim()); }

/** 최근 행부터 최대 200행만 검사합니다. before는 다음 페이지 커서입니다. */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.type !== 'guestbook') return json_({ ok: true, message: '청첩장 서버가 정상 동작 중입니다.' });
  var sh = sheet_('guestbook'), last = sh.getLastRow();
  var limit = Math.max(1, Math.min(50, Math.floor(Number(p.limit) || 5)));
  var before = Number(p.before);
  if (p.before && (!Number.isInteger(before) || before < 2)) return json_({ ok: false, error: 'INVALID_CURSOR' });
  var end = Math.min(last, before ? before - 1 : last);
  if (end < 2) return json_({ ok: true, items: [], nextCursor: null });
  var start = Math.max(2, end - 199), rows = sh.getRange(start, 1, end - start + 1, 4).getValues();
  var items = [], next = null;
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i], row = start + i;
    if (r[1] && String(r[3]).toUpperCase() !== 'TRUE') items.push({ createdAt: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), name: String(r[1]), message: String(r[2]) });
    next = row > 2 ? row : null;
    if (items.length >= limit) break;
  }
  return json_({ ok: true, items: items, nextCursor: next });
}

/** 서버에서도 값·반복 제출을 검사합니다. 공개 API의 완전한 봇 차단 기능은 아닙니다. */
function doPost(e) {
  var lock = LockService.getScriptLock(), locked = false;
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 8000) return json_({ ok: false, error: 'INVALID_BODY' });
    var data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.website) return json_({ ok: false, error: 'INVALID_BODY' });
    if (!text_(data.name, 20, true)) return json_({ ok: false, error: 'INVALID_NAME' });
    var payload;
    if (data.type === 'guestbook') {
      if (!text_(data.message, 500, true)) return json_({ ok: false, error: 'INVALID_MESSAGE' });
      payload = [clean_(data.name, 20), clean_(data.message, 500), false];
    } else if (data.type === 'rsvp') {
      if (['신랑측', '신부측'].indexOf(data.side) < 0 || ['참석', '불참'].indexOf(data.attend) < 0) return json_({ ok: false, error: 'INVALID_RSVP' });
      var count = data.count === undefined ? 1 : Number(data.count);
      var countTypeValid = data.count === undefined || typeof data.count === 'number' || typeof data.count === 'string';
      if (data.attend === '참석' && (!countTypeValid || !Number.isInteger(count) || count < 1 || count > 20)) return json_({ ok: false, error: 'INVALID_COUNT' });
      if (!text_(data.memo || '', 200, false) || ['', '예정', '안함', '미정'].indexOf(data.meal || '') < 0) return json_({ ok: false, error: 'INVALID_RSVP' });
      payload = [data.side, data.attend, clean_(data.name, 20), data.attend === '참석' ? count : 0, data.attend === '참석' ? (data.meal || '') : '', clean_(data.memo || '', 200)];
    } else return json_({ ok: false, error: 'UNKNOWN_TYPE' });
    if (data.requestId !== undefined && (typeof data.requestId !== 'string' || !/^[A-Za-z0-9-]{8,100}$/.test(data.requestId))) return json_({ ok: false, error: 'INVALID_REQUEST_ID' });
    locked = lock.tryLock(10000);
    if (!locked) return json_({ ok: false, error: 'BUSY' });
    var cache = CacheService.getScriptCache();
    var fingerprint = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify([data.type, payload])));
    var receipt = data.requestId ? 'receipt:' + data.requestId : '';
    if (receipt && cache.get(receipt) === fingerprint) return json_({ ok: true, duplicate: true });
    // 동일 내용 재전송은 짧은 시간 안에 중복 행을 만들지 않습니다.
    if (cache.get('duplicate:' + fingerprint)) return json_({ ok: true, duplicate: true });
    var minute = Math.floor(Date.now() / 60000), bucket = 'rate:' + minute;
    var requests = Number(cache.get(bucket)) || 0;
    if (requests >= 60) return json_({ ok: false, error: 'RATE_LIMIT' });
    cache.put(bucket, String(requests + 1), 120);
    sheet_(data.type).appendRow([new Date()].concat(payload));
    cache.put('duplicate:' + fingerprint, '1', 60);
    if (receipt) cache.put(receipt, fingerprint, 600);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'SERVER_ERROR' });
  } finally {
    if (locked) lock.releaseLock();
  }
}
