import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import utils from '../assets/config-utils.js';
import { root, config, validConfig } from './helpers.mjs';

test('empty starter is rejected; explicit demo and completed config pass', () => {
  assert.ok(utils.validate(config()).errors.length >= 7);
  assert.deepEqual(utils.validate(config('demo/config.js')).errors, []);
  assert.deepEqual(utils.validate(validConfig()).errors, []);
});
const invalid = {
  'nonexistent day': c => c.wedding.date = '2027-02-30',
  'non-leap day': c => c.wedding.date = '2027-02-29',
  'invalid month': c => c.wedding.date = '2027-13-01',
  'invalid hour': c => c.wedding.time = '25:00',
  'invalid minute': c => c.wedding.time = '13:99',
  'missing venue': c => c.wedding.venue = ' ',
  'missing address': c => c.wedding.address = '',
  'wrong sections type': c => c.sections = 'cover,calendar',
  'wrong nested array': c => c.location.transport = 'subway',
  'wrong boolean': c => c.gallery.enabled = 'false',
  'unknown theme': c => c.theme.preset = 'blue',
  'unknown key': c => c.theme.colour = 'pink',
  'unknown section': c => c.sections.push('contacts'),
  'duplicate section': c => c.sections.push('cover'),
  'partial coordinates': c => c.wedding.lat = 37,
  'out of range coordinates': c => Object.assign(c.wedding, { lat: 91, lng: 127 }),
  'deadline after wedding': c => c.rsvp.deadline = '2031-01-01',
  'missing consent': c => c.privacy.publishConsent = false,
  'invalid script url': c => c.googleScriptUrl = 'https://example.com',
  'path traversal': c => c.cover.image = 'images/../config.js',
  'URL fragment filename': c => c.cover.image = 'images/cover#1.jpg',
  'fake bank account': c => c.account.groom = [{ role: '신랑', name:'', bank:'테스트 은행', number:'000-0000', kakaopay:'' }],
};
for (const [label, mutate] of Object.entries(invalid)) test('reject ' + label, () => { const c = validConfig(); mutate(c); assert.ok(utils.validate(c).errors.length, label); });
test('valid leap day, zero coordinates, and explicit metadata work', () => {
  const c = validConfig(); c.wedding.date = '2032-02-29'; Object.assign(c.wedding,{lat:0,lng:0});
  assert.deepEqual(utils.validate(c).errors, []); assert.equal(utils.hasCoordinates(c.wedding), true);
  c.meta.title = '별도 제목'; assert.equal(utils.normalize(c).meta.title, '별도 제목');
});
test('derived metadata and account owner follow changed names and dates', () => {
  const c = validConfig(); c.account.groom = [{ role:'신랑', name:'', bank:'테스트 은행', number:'123-456', kakaopay:'' }];
  c.groom.name = '변경된 신랑'; c.wedding.date = '2031-05-17';
  const n = utils.normalize(c); assert.match(n.meta.title,/변경된 신랑/); assert.match(n.meta.description,/2031-05-17/); assert.equal(n.account.groom[0].name,'변경된 신랑'); assert.equal(c.meta.title,'');
});
test('build uses user photos, emits OG/ICS and preserves previous output on errors', t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wedding-build-')); t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  for(const p of ['scripts','assets','templates','demo','images','index.html','setup.html','prepare.html']) fs.cpSync(path.join(root,p),path.join(dir,p),{recursive:true});
  const c=validConfig(); const save=()=>fs.writeFileSync(path.join(dir,'config.js'),'window.WEDDING = '+JSON.stringify(c)+';');
  const run=()=>spawnSync(process.execPath,['scripts/build.mjs'],{cwd:dir,env:{...process.env,SITE_URL:'https://example.com/wedding'},encoding:'utf8'});
  fs.copyFileSync(path.join(root,'demo/cover.jpg'),path.join(dir,'images/Cover.JPG'));
  fs.copyFileSync(path.join(root,'demo/gallery/01.jpg'),path.join(dir,'images/gallery/01.jpg'));
  save(); let r=run(); assert.equal(r.status,0,r.stderr);
  const html=fs.readFileSync(path.join(dir,'_site/index.html'),'utf8');
  assert.match(html,/테스트 신랑 ♥ 테스트 신부/); assert.match(html,/https:\/\/example.com\/wedding\/images\/Cover.JPG/);
  assert.match(fs.readFileSync(path.join(dir,'_site/wedding.ics'),'utf8'),/DTSTART:20300518T040000Z/);
  assert.equal(fs.existsSync(path.join(dir,'_site/demo')),false);
  const box={window:{}};vm.runInNewContext(fs.readFileSync(path.join(dir,'_site/config.js'),'utf8'),box);
  assert.equal(box.window.WEDDING.cover.image,'images/Cover.JPG'); assert.equal(box.window.WEDDING.gallery.images.length,1);
  const starter={window:{}};vm.runInNewContext(fs.readFileSync(path.join(dir,'_site/starter-config.js'),'utf8'),starter);
  assert.equal(starter.window.WEDDING.groom.name,'');assert.equal(starter.window.WEDDING.privacy.publishConsent,false);
  assert.equal(starter.window.WEDDING.account.groom.length,0);
  assert.match(fs.readFileSync(path.join(dir,'_site/setup.html'),'utf8'),/src="starter-config.js"/);
  c.wedding.date='2027-02-30';save();r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/wedding.date/);
  assert.equal(fs.readFileSync(path.join(dir,'_site/index.html'),'utf8'),html);
  c.wedding.date='2030-05-18'; c.cover.image='images/absent.jpg';save();assert.notEqual(run().status,0);
  c.cover.image='images/fake.heic';fs.writeFileSync(path.join(dir,c.cover.image),'not an image');save();assert.notEqual(run().status,0);
  fs.writeFileSync(path.join(dir,'config.js'),'window.WEDDING = { broken: ; };');assert.notEqual(run().status,0);
});
test('AI fallback bundle stays in sync',()=>{ const r=spawnSync(process.execPath,['scripts/ai-pack.mjs','--check'],{cwd:root,encoding:'utf8'}); assert.equal(r.status,0,r.stderr); });
