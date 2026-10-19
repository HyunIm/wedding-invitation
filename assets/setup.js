(function () {
  'use strict';
  var form = document.getElementById('setup-form');
  function value(name) { return form.elements.namedItem(name).value.trim(); }
  function config() {
    var c = JSON.parse(JSON.stringify(window.WEDDING));
    c.groom.name = value('groom'); c.bride.name = value('bride');
    c.wedding.date = value('date'); c.wedding.time = value('time'); c.wedding.venue = value('venue');
    c.wedding.hall = value('hall'); c.wedding.address = value('address');
    c.theme.preset = value('theme'); c.theme.font = value('font'); c.greeting.message = value('message');
    c.privacy.publishConsent = form.elements.namedItem('consent').checked;
    return c;
  }
  function preview() {
    var c = config();
    document.getElementById('preview-names').textContent = [c.groom.name || '신랑', c.bride.name || '신부'].join(' ♥ ');
    document.getElementById('preview-date').textContent = [c.wedding.date, c.wedding.time].filter(Boolean).join(' · ') || '예식 날짜와 시간';
    document.getElementById('preview-venue').textContent = [c.wedding.venue, c.wedding.hall, c.wedding.address].filter(Boolean).join(' · ') || '예식장과 주소';
    document.getElementById('preview-message').textContent = c.greeting.message;
  }
  function output() {
    var c = config(), result = window.WeddingConfig.validate(c);
    document.getElementById('error').textContent = result.errors.map(function (message) { return message.indexOf('privacy.publishConsent:') === 0 ? '공개 범위 확인란에 체크해주세요.' : message.replace(/^[^:]+:\s*/, ''); }).join('\n');
    if (result.errors.length || !form.reportValidity()) return null;
    return '// 청첩장 설정. 이름·날짜를 고칠 때 meta.title/description은 비워두면 자동으로 바뀝니다.\n' +
      '// 전화·계좌 등 공개하지 않을 값은 지우세요. enabled: false 는 화면에서만 숨깁니다.\n' +
      '// 세부 항목 안내: https://github.com/HyunIm/wedding-invitation/blob/main/config.js\n' +
      'window.WEDDING = ' + JSON.stringify(c, null, 2) + ';\n';
  }
  form.addEventListener('input', preview);
  form.addEventListener('submit', function (event) {
    event.preventDefault(); var text = output(); if (!text) return;
    var url = URL.createObjectURL(new Blob([text], { type: 'text/javascript;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'config.js'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    document.getElementById('download-status').textContent = '다운로드한 config.js와 준비한 사진을 내 저장소에 올려주세요.';
  });
  document.getElementById('copy-config').addEventListener('click', function () {
    var text = output(); if (!text) return;
    if (!navigator.clipboard) { document.getElementById('error').textContent = '이 브라우저에서는 파일 내려받기를 이용해주세요.'; return; }
    navigator.clipboard.writeText(text).then(function () { document.getElementById('download-status').textContent = '전체 설정을 복사했어요.'; }).catch(function () { document.getElementById('error').textContent = '복사에 실패했어요. 파일 내려받기를 이용해주세요.'; });
  });
  preview();
})();
