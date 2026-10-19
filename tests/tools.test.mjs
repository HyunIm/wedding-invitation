import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { spawnSync } from 'node:child_process';
import { read, config } from './helpers.mjs';
import photos from '../assets/photo-tools.js';
test('setup requires public consent and emits a complete valid file without demo data',async t=>{
  const dom=new JSDOM(read('setup.html'),{url:'https://example.com/setup.html',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window,d=w.document;
  let copied='';w.navigator.clipboard={writeText:async text=>{copied=text}};w.WEDDING=config();w.eval(read('assets/config-utils.js'));w.eval(read('assets/setup.js'));
  const form=d.querySelector('form');for(const [name,value] of Object.entries({groom:'김테스트',bride:'이샘플',date:'2030-05-18',time:'13:00',venue:'샘플 예식장',address:'샘플 주소'}))form.elements.namedItem(name).value=value;
  form.dispatchEvent(new w.Event('input',{bubbles:true}));assert.match(d.getElementById('preview-names').textContent,/김테스트/);
  d.getElementById('copy-config').click();assert.equal(copied,'');assert.match(d.getElementById('error').textContent,/공개 범위/);
  form.elements.namedItem('consent').checked=true;d.getElementById('copy-config').click();await Promise.resolve();assert.match(copied,/window.WEDDING/);assert.ok(!copied.includes('임현'));
  w.eval(copied);assert.equal(w.WeddingConfig.validate(w.WEDDING).errors.length,0);assert.equal(w.WEDDING.meta.title,'');assert.equal(w.WEDDING.wedding.lat,'');
});
test('photo ZIP is valid with paths, CRC and multiple non-ASCII filenames',async()=>{
  const bytes=new Uint8Array(await photos.zip([{name:'images/cover.jpg',bytes:Uint8Array.of(1,2,3)},{name:'images/gallery/한글.jpg',bytes:Uint8Array.of(4,5)}]).arrayBuffer());
  const r=spawnSync('python3',['-c',"import io,sys,zipfile; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; assert z.read('images/cover.jpg') == bytes([1,2,3]); assert z.read('images/gallery/한글.jpg') == bytes([4,5])"],{input:bytes});assert.equal(r.status,0,r.stderr.toString());
});
test('photo tool rejects HEIC without decoding it',async()=>{await assert.rejects(photos.prepare({name:'phone.HEIC',type:'image/heic',size:10}),/JPG/);});
test('photo processing redraws pixels at bounded size and requests metadata-free JPEG',async t=>{
  const originalBitmap=globalThis.createImageBitmap, originalDocument=globalThis.document;
  t.after(()=>{globalThis.createImageBitmap=originalBitmap;globalThis.document=originalDocument;});
  let closed=false, canvas, encoded;
  globalThis.createImageBitmap=async()=>({width:4000,height:3000,close(){closed=true}});
  globalThis.document={createElement:()=>canvas={getContext:()=>({fillRect(){},drawImage(){}}),toBlob(cb,format,quality){encoded={format,quality};cb(new Blob(['new pixels'],{type:format}));}}};
  const result=await photos.prepare({name:'phone.jpg',type:'image/jpeg',size:100});assert.equal(canvas.width,1600);assert.equal(canvas.height,1200);assert.equal(encoded.format,'image/jpeg');assert.equal(result.type,'image/jpeg');assert.equal(closed,true);
});
