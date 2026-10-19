import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { read } from './helpers.mjs';
function server(rows=[]) {
  const written=[], cache=new Map(), reads=[];
  const sh={getLastRow:()=>rows.length+1,getRange:(start,col,count)=>{reads.push(count);return {getValues:()=>rows.slice(start-2,start-2+count)};},appendRow:row=>written.push(row)};
  const context={SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:()=>sh})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this}})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(algo,s)=>createHash(algo).update(s).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url')},console};
  vm.createContext(context);vm.runInContext(read('google-apps-script/Code.gs'),context);
  return {post:data=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(data)}}).text),get:p=>JSON.parse(context.doGet({parameter:p}).text),written,reads,cache};
}
const rsvp=()=>({type:'rsvp',side:'신랑측',attend:'참석',name:'하객',count:1,meal:'예정',memo:''});
test('server accepts real RSVP, defaults absent count to one, normalizes decline',()=>{const s=server();const p=rsvp();delete p.count;assert.equal(s.post(p).ok,true);assert.equal(s.written[0][4],1);assert.equal(s.post({...p,attend:'불참'}).ok,true);assert.equal(s.written[1][4],0);});
test('server rejects invalid counts, enums, whitespace and honeypots',()=>{for(const count of [0,-1,21,1.5,'bad',[],true]) assert.equal(server().post({...rsvp(),count}).ok,false);for(const patch of [{side:'wrong'},{attend:'maybe'},{name:' '},{website:'spam'}])assert.equal(server().post({...rsvp(),...patch}).ok,false);});
test('formula-like input is stored as text and duplicate retry writes once',()=>{const s=server();const p={type:'guestbook',name:'=formula',message:'hello',requestId:'request-1234'};assert.equal(s.post(p).ok,true);assert.equal(s.post(p).duplicate,true);assert.equal(s.written.length,1);assert.equal(s.written[0][1],"'=formula");});
test('server has a global minute limit',()=>{const s=server();for(let i=0;i<60;i++)assert.equal(s.post({type:'guestbook',name:'guest',message:'message '+i}).ok,true);assert.equal(s.post({type:'guestbook',name:'guest',message:'over limit'}).error,'RATE_LIMIT');});
test('guestbook pages skip hidden rows, keep cursors stable after append, and limit scans',()=>{
  const rows=Array.from({length:700},(_,i)=>['2030-01-01','name '+i,'message '+i,i%3===0]);const s=server(rows);
  const first=s.get({type:'guestbook',limit:'5'});assert.equal(first.items.length,5);assert.ok(first.nextCursor);assert.ok(s.reads[0]<=200);
  rows.push(['2030-01-01','new','new',false]);const second=s.get({type:'guestbook',limit:'5',before:String(first.nextCursor)});assert.equal(second.items.length,5);
  assert.ok(second.items.every(x=>!first.items.some(y=>x.name===y.name)));assert.ok(!second.items.some(x=>x.name==='new'));
  const hidden=server(Array.from({length:500},()=>['','hidden','text',true]));assert.ok(hidden.get({type:'guestbook'}).nextCursor);assert.equal(hidden.reads[0],200);
  assert.equal(s.get({type:'rsvp'}).items,undefined);
});
