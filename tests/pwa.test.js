const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const legacyApp = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('rebuilt HTML can fall back to the frozen legacy shell', () => {
  const match = html.match(/<template id="legacy-shell">([\s\S]*?)<\/template>/);
  assert.ok(match, 'legacy shell template is present');
  const shell = match[1];
  const ids = [...legacyApp.matchAll(/\$\("([^"]+)"\)/g)].map(result => result[1]);
  for (const id of new Set(ids)) assert.match(shell, new RegExp(`id="${id}"`), `legacy shell includes #${id}`);
  assert.match(html, /style-v2\.css" onerror="legacyFallback\(\)"/);
  assert.match(html, /data\.src='data\/crops-v2\.js';data\.onerror=legacyFallback/);
  assert.match(html, /app\.src='app-v2\.js';app\.onerror=legacyFallback/);
  assert.match(html, /load\('data\/produce\.js',\(\)=>load\('app\.js'\)\)/);
});

test('rebuilt header uses a purpose subtitle instead of a neighborhood label', () => {
  assert.match(html, /<header><h1>Temporada<\/h1><p id="subtitle"><\/p><\/header>/);
  assert.doesNotMatch(html, /id="location"/);
});

test('month navigation is one compact stepper with a separate current-month shortcut', () => {
  assert.match(html, /<div class="month-stepper"[^>]*>[\s\S]*id="previous"[\s\S]*id="month-name"[\s\S]*id="next"[\s\S]*<\/div>[\s\S]*id="current"/);
  assert.doesNotMatch(html, /id="month-note"/);
});
