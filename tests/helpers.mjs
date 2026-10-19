import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const read = p => fs.readFileSync(path.join(root, p), 'utf8');
export function config(file = 'templates/config.js') { const s = { window: {} }; vm.runInNewContext(read(file), s); return JSON.parse(JSON.stringify(s.window.WEDDING)); }
export function validConfig() {
  const c = config(); c.privacy.publishConsent = true;
  c.groom.name = '테스트 신랑'; c.bride.name = '테스트 신부';
  Object.assign(c.wedding, { date: '2030-05-18', time: '13:00', venue: '테스트 예식장', address: '테스트시 테스트로 1' });
  c.theme.effect = 'none'; c.theme.animation = false;
  return c;
}
