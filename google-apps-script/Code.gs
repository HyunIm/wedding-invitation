/**
 * 💌 모바일 청첩장 — 방명록 & 참석여부 저장용 구글 Apps Script
 *
 * 사용법 (자세한 설명은 docs/guestbook-rsvp.md)
 *  1. 구글 시트를 새로 만들고  [확장 프로그램] → [Apps Script] 클릭
 *  2. 원래 있던 코드를 모두 지우고 이 파일 내용을 통째로 붙여넣기 → 저장
 *  3. [배포] → [새 배포] → 유형: 웹 앱
 *       - 다음 사용자 인증 정보로 실행: 나
 *       - 액세스 권한이 있는 사용자: 모든 사용자
 *  4. 나온 "웹 앱 URL" 을 config.js 의 googleScriptUrl 에 붙여넣기
 *
 * 시트에 '방명록', '참석여부' 탭이 자동으로 만들어집니다.
 * 방명록에 부적절한 글이 있으면 그 줄의 '숨김' 칸에 TRUE 라고 적으면 숨겨집니다.
 */

var SHEETS = {
  guestbook: { name: '방명록', headers: ['작성시각', '이름', '메시지', '숨김'] },
  rsvp: { name: '참석여부', headers: ['작성시각', '구분', '참석', '성함', '인원', '식사', '메모'] },
};

function sheet_(key) {
  var conf = SHEETS[key];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(conf.name);
  if (!sh) {
    sh = ss.insertSheet(conf.name);
    sh.appendRow(conf.headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, conf.headers.length).setFontWeight('bold').setBackground('#f3ede6');
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(s, max) {
  s = String(s == null ? '' : s).trim();
  // 시트 수식 실행 방지
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, max || 500);
}

/** 방명록 읽기: GET ?type=guestbook */
function doGet(e) {
  var type = (e && e.parameter && e.parameter.type) || '';
  if (type !== 'guestbook') return json_({ ok: true, message: '청첩장 서버가 정상 동작 중입니다.' });

  var sh = sheet_('guestbook');
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues() : [];
  var items = rows
    .filter(function (r) { return r[1] && String(r[3]).toUpperCase() !== 'TRUE'; })
    .map(function (r) {
      return { createdAt: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), name: String(r[1]), message: String(r[2]) };
    })
    .reverse(); // 최신 글이 위로
  return json_({ ok: true, items: items });
}

/** 저장: POST { type: 'guestbook' | 'rsvp', ... } */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    var now = new Date();
    if (data.type === 'guestbook') {
      if (!data.name || !data.message) return json_({ ok: false, error: 'EMPTY' });
      sheet_('guestbook').appendRow([now, clean_(data.name, 20), clean_(data.message, 500), false]);
    } else if (data.type === 'rsvp') {
      if (!data.name) return json_({ ok: false, error: 'EMPTY' });
      sheet_('rsvp').appendRow([
        now, clean_(data.side, 10), clean_(data.attend, 10), clean_(data.name, 20),
        Number(data.count) || 0, clean_(data.meal, 10), clean_(data.memo, 200),
      ]);
    } else {
      return json_({ ok: false, error: 'UNKNOWN_TYPE' });
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
