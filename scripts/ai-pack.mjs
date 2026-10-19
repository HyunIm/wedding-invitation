import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const text = '# 링크를 읽지 못하는 AI에게 이 파일 전체를 붙여넣으세요\n\n' +
  fs.readFileSync(new URL('docs/ai-guide.md', root), 'utf8') + '\n\n--- 원본 config.js (새 사용자용 빈 설정) ---\n\n' +
  fs.readFileSync(new URL('templates/config.js', root), 'utf8');
const output = fileURLToPath(new URL('docs/ai-start.txt', root));
if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== text) { console.error('AI 시작 안내문이 오래됐어요. npm run ai-pack 으로 갱신하세요.'); process.exit(1); }
} else fs.writeFileSync(output, text);
