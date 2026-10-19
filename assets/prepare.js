(function () {
  'use strict';
  var urls = [], button = document.getElementById('prepare'), downloads = document.getElementById('zip-download');
  button.addEventListener('click', async function () {
    urls.forEach(URL.revokeObjectURL); urls = []; downloads.hidden = true;
    var results = document.getElementById('results'); results.replaceChildren();
    var error = document.getElementById('photo-error'), status = document.getElementById('photo-status'); error.textContent = ''; status.textContent = '';
    var files = Array.from(document.getElementById('photos').files).sort(function (a,b) { return a.name.localeCompare(b.name, 'ko', { numeric:true }); });
    var role = document.getElementById('photo-role').value;
    if (!files.length || files.length > 50 || (role !== 'gallery' && files.length !== 1)) { error.textContent = role === 'gallery' ? '사진을 1~50장 선택해주세요.' : '이 용도는 사진 1장만 선택해주세요.'; return; }
    if (!window.createImageBitmap) { error.textContent = '이 브라우저에서는 사진 변환을 지원하지 않아요. 최신 Safari 또는 Chrome에서 열어주세요.'; return; }
    button.disabled = true; var entries = [], failures = [];
    try {
      for (var i = 0; i < files.length; i++) {
        status.textContent = (i + 1) + ' / ' + files.length + '장 처리 중…';
        try {
          var blob = await WeddingPhotos.prepare(files[i]);
          var name = role === 'gallery' ? 'images/gallery/' + String(i + 1).padStart(2, '0') + '.jpg' : 'images/' + role + '.jpg';
          entries.push({ name: name, bytes: new Uint8Array(await blob.arrayBuffer()) });
          var url = URL.createObjectURL(blob); urls.push(url);
          var item = document.createElement('li'), img = document.createElement('img'), link = document.createElement('a');
          img.src = url; img.alt = '변환된 사진 미리보기'; link.href = url; link.download = name.split('/').pop(); link.textContent = name + ' (' + Math.round(blob.size / 1024) + 'KB)';
          item.append(img, link); results.appendChild(item);
        } catch (e) { failures.push(files[i].name + ': ' + e.message); }
      }
      if (entries.length) { var zip = URL.createObjectURL(WeddingPhotos.zip(entries)); urls.push(zip); downloads.href = zip; downloads.download = 'wedding-' + role + '.zip'; downloads.hidden = false; }
      status.textContent = entries.length + '장 준비 완료' + (failures.length ? ', ' + failures.length + '장 실패' : '') + '. 내려받은 사본만 업로드하세요.';
      error.textContent = failures.join('\n');
    } catch (e) { error.textContent = '사진을 처리하지 못했어요. 장수를 줄여 다시 시도해주세요.'; }
    finally { button.disabled = false; }
  });
})();
