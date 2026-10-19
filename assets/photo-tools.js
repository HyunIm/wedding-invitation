/* 사진 처리 결과를 표준 ZIP(store 방식)으로 묶습니다. 네트워크 요청은 없습니다. */
(function (root) {
  'use strict';
  function crc32(bytes) {
    var crc = -1;
    for (var b of bytes) { crc ^= b; for (var i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    return (crc ^ -1) >>> 0;
  }
  function header(length) { var bytes = new Uint8Array(length); return { bytes: bytes, view: new DataView(bytes.buffer) }; }
  function zip(entries) {
    var chunks = [], central = [], offset = 0, size = 0, encoder = new TextEncoder();
    entries.forEach(function (entry) {
      var name = encoder.encode(entry.name), data = entry.bytes, crc = crc32(data), local = header(30), dir = header(46);
      local.view.setUint32(0, 0x04034b50, true); local.view.setUint16(4, 20, true); local.view.setUint16(6, 0x800, true);
      local.view.setUint16(12, 33, true); local.view.setUint32(14, crc, true); local.view.setUint32(18, data.length, true); local.view.setUint32(22, data.length, true); local.view.setUint16(26, name.length, true);
      dir.view.setUint32(0, 0x02014b50, true); dir.view.setUint16(4, 20, true); dir.view.setUint16(6, 20, true); dir.view.setUint16(8, 0x800, true); dir.view.setUint16(14, 33, true);
      dir.view.setUint32(16, crc, true); dir.view.setUint32(20, data.length, true); dir.view.setUint32(24, data.length, true); dir.view.setUint16(28, name.length, true); dir.view.setUint32(42, offset, true);
      chunks.push(local.bytes, name, data); central.push(dir.bytes, name); offset += 30 + name.length + data.length; size += 46 + name.length;
    });
    var end = header(22); end.view.setUint32(0, 0x06054b50, true); end.view.setUint16(8, entries.length, true); end.view.setUint16(10, entries.length, true); end.view.setUint32(12, size, true); end.view.setUint32(16, offset, true);
    return new Blob(chunks.concat(central, [end.bytes]), { type: 'application/zip' });
  }
  async function prepare(file) {
    if (/\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type)) throw new Error('HEIC/HEIF는 사진 앱에서 JPG로 내보낸 뒤 선택해주세요.');
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error('JPG·PNG·WebP 파일을 선택해주세요.');
    if (file.size > 40 * 1024 * 1024) throw new Error('40MB보다 큰 파일이에요. 먼저 사진 앱에서 크기를 줄여주세요.');
    var bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
      if (bitmap.width * bitmap.height > 60e6) throw new Error('해상도가 너무 커요. 사진 앱에서 크기를 줄여주세요.');
      var scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      var canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      var ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      // 픽셀만 다시 인코딩합니다. 원본 EXIF/GPS/XMP는 복사하지 않습니다.
      return await new Promise(function (resolve, reject) { canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('사진 변환에 실패했어요.')); }, 'image/jpeg', .85); });
    } finally { bitmap.close(); }
  }
  var api = { crc32: crc32, zip: zip, prepare: prepare };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.WeddingPhotos = api;
})(typeof window !== 'undefined' ? window : this);
