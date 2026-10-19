import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { read, validConfig } from './helpers.mjs';
function load(t, c, responses) {
  const dom=new JSDOM('<html><head><meta name="theme-color" content="#fff"></head><body><div class="backdrop"></div><main id="app"></main></body></html>',{url:'https://example.com/wedding/',runScripts:'outside-only',pretendToBeVisual:true});
  t.after(()=>dom.window.close());const w=dom.window;
  const requests=[]; w.WEDDING=c; w.WEDDING_THUMBS='_thumbs/'; w.matchMedia=()=>({matches:false}); w.fetch=async(url,opts)=>{requests.push({url,opts});return {ok:true,json:async()=>responses?responses(url,opts):({ok:true,items:[],nextCursor:null})};};
  w.eval(read('assets/config-utils.js'));w.eval(read('assets/app.js'));
  return {w,d:w.document,requests};
}
const tick=()=>new Promise(r=>setTimeout(r,5));
test('runtime rejects invalid structure with a readable recovery link', t=>{
  const c=validConfig();c.sections='cover';const {d}=load(t,c);assert.match(d.body.textContent,/sections/);assert.ok(d.querySelector('a[href="setup.html"]'));
});
test('basic rendering, automatic metadata, no coordinates fallback, eager cover',t=>{
  const c=validConfig();const {d}=load(t,c);
  assert.match(d.title,/테스트 신랑/);assert.match(d.querySelector('#closing').textContent,/테스트 신부/);
  assert.match(d.querySelector('a[href*="map.kakao.com"]').href,/link\/search\//);assert.equal(d.querySelector('[data-action="tmap"]'),null);
  assert.equal(d.querySelector('#rsvp'),null);assert.equal(d.querySelector('#guestbook'),null);assert.equal(d.querySelector('#account'),null);
  assert.equal(d.querySelector('.cover__bg img').getAttribute('loading'),'eager');
});
test('coordinates enable directions including zero coordinates',t=>{const c=validConfig();Object.assign(c.wedding,{lat:0,lng:0});const {d}=load(t,c);assert.match(d.querySelector('a[href*="map.kakao.com"]').href,/,0,0$/);assert.ok(d.querySelector('[data-action="tmap"]'));});
test('RSVP without companion question sends one and declined sends zero',async t=>{
  for(const attend of ['참석','불참']){
    const c=validConfig();c.googleScriptUrl='https://script.google.com/macros/s/test/exec';c.rsvp.askCompanion=false;
    const {w,d,requests}=load(t,c);d.querySelector('[data-action="rsvp"]').click();const f=d.querySelector('form');
    f.elements.namedItem('side').value='신랑측';f.elements.namedItem('name').value='하객';f.elements.namedItem('attend').value=attend;
    f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
    const p=JSON.parse(requests.find(r=>r.opts.method==='POST').opts.body);assert.equal(p.count,attend==='참석'?1:0);assert.ok(p.requestId);
  }
});
test('RSVP invalid manually entered count is blocked before request',async t=>{
  const c=validConfig();c.googleScriptUrl='https://script.google.com/macros/s/test/exec';const {w,d,requests}=load(t,c);d.querySelector('[data-action="rsvp"]').click();
  const f=d.querySelector('form');f.elements.namedItem('side').value='신랑측';f.elements.namedItem('name').value='하객';
  for(const v of ['-1','50','1.5']){f.elements.namedItem('count').value=v;f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}
  await tick();assert.equal(requests.filter(r=>r.opts.method==='POST').length,0);assert.match(d.querySelector('.toast').textContent,/1~20/);
});
test('dialog has an accessible name, traps focus and restores it',t=>{
  const c=validConfig();const {w,d}=load(t,c);const trigger=d.querySelector('[data-action="add-calendar"]');trigger.focus();trigger.click();
  const modal=d.querySelector('[role="dialog"]');assert.equal(d.getElementById(modal.getAttribute('aria-labelledby')).textContent,'내 캘린더에 추가');
  assert.equal(d.querySelector('#app').inert,true);const stops=Array.from(modal.querySelectorAll('button,a'));stops.forEach(e=>e.getClientRects=()=>[{}]);
  const first=stops[0],last=stops.at(-1);last.focus();d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(d.activeElement,first);
  first.focus();d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(d.activeElement,last);
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(d.activeElement,trigger);assert.ok(!d.querySelector('#app').inert);
});
test('duplicate guestbook retry refreshes saved entries without adding a second copy',async t=>{
  const c=validConfig();c.googleScriptUrl='https://script.google.com/macros/s/test/exec';
  const {w,d,requests}=load(t,c,(url,opts)=>opts.method==='POST'?{ok:true,duplicate:true}:{ok:true,items:[{name:'하객',message:'축하합니다'}],nextCursor:null});
  await tick();d.querySelector('[data-action="gb-write"]').click();
  const f=d.querySelector('form');f.elements.namedItem('name').value='하객';f.elements.namedItem('message').value='축하합니다';
  f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.equal(d.querySelectorAll('.gb__item').length,1);assert.equal(requests.filter(r=>r.opts.method!=='POST').length,2);
});
test('guestbook fetches next page and escapes public messages',async t=>{
  const c=validConfig();c.googleScriptUrl='https://script.google.com/macros/s/test/exec';
  const {d,requests}=load(t,c,url=>url.includes('before=')?{ok:true,items:[{name:'둘',message:'두번째'}],nextCursor:null}:{ok:true,items:[{name:'<script>bad</script>',message:'<img src=x>'}],nextCursor:7});
  await tick();assert.match(d.querySelector('[data-gb-list]').textContent,/<script>bad/);assert.equal(d.querySelector('[data-gb-list] script'),null);
  d.querySelector('[data-action="gb-more"]').click();await tick();assert.match(requests.at(-1).url,/before=7/);assert.equal(d.querySelectorAll('.gb__item').length,2);assert.equal(d.querySelector('[data-action="gb-more"]').hidden,true);
});
test('thumb fallback handles a quoted file name as data',t=>{const c=validConfig();c.gallery.images=["images/gallery/a'b.jpg"];const {w,d}=load(t,c);const image=d.querySelector('.gallery__item img'); assert.equal(image.dataset.fallback,"images/gallery/a'b.jpg"); new w.Function(image.getAttribute('onerror')).call(image); assert.match(image.src,/a'b.jpg$/); assert.equal(image.dataset.fallback,undefined);});
