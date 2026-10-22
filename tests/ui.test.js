const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const code = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const fixture = { sources: [{ id: 'fixture', title: 'Test source', url: 'https://example.com', region: 'Test region', precision: 'Monthly', note: 'Fixture only' }], crops: [
  { id: 'a', name: 'Alpha', emoji: '🥬', category: 'vegetable', buy: { months: [3], sources: ['fixture'], note: 'Fixture buying note' }, plant: [{ action: 'sow', months: [3], sources: ['fixture'], note: 'Fixture planting note' }] },
  { id: 'b', name: 'Beta', emoji: '🌱', category: 'herb', buy: null, plant: null },
] };

function boot({ stored = {}, unavailable = false, date = '2026-04-01T01:00:00Z', catalog = fixture } = {}) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, { textContent: '', innerHTML: '', hidden: false, dataset: {}, value: '', listeners: {}, attributes: {}, setAttribute(k, v) { this.attributes[k] = String(v); }, addEventListener(k, fn) { this.listeners[k] = fn; }, focus() {}, showModal() { this.open = true; }, close() { this.open = false; } });
    return elements.get(id);
  }
  const storage = new Map(Object.entries(stored));
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [date])); } }
  const context = { window: { CROPS: catalog?.crops, SOURCES: catalog ? Object.fromEntries(catalog.sources.map(source => [source.id, source])) : undefined, addEventListener() {} }, document: { documentElement: { dataset: {} }, getElementById: element, querySelectorAll: () => [], addEventListener() {} }, localStorage: { getItem(k) { if (unavailable) throw Error('blocked'); return storage.get(k) ?? null; }, setItem(k, v) { if (unavailable) throw Error('blocked'); storage.set(k, v); } }, Date: Clock, Intl, console, setTimeout, URL };
  vm.runInNewContext(code, context);
  return { element, storage, context, click(id, data) { element(id).listeners.click({ target: { dataset: data, closest() { return this; } } }); } };
}

test('restores Buy and persists subsequent view changes', () => {
  const ui = boot({ stored: { view: 'buy' } });
  assert.match(ui.element('count').textContent, /^Buy:/);
  ui.click('view', { view: 'plant' });
  assert.equal(ui.storage.get('view'), 'plant');
  assert.match(ui.element('count').textContent, /^Plant:/);
  ui.click('view', { view: 'buy' });
  assert.equal(ui.storage.get('view'), 'buy');
});

test('invalid preferences visibly fall back without breaking navigation', () => {
  const ui = boot({ stored: { view: 'unexpected', theme: 'unexpected' } });
  assert.match(ui.element('count').textContent, /^Plant:/);
  assert.match(ui.element('preference-status').textContent, /saved view was invalid/);
  assert.match(ui.element('preference-status').textContent, /saved theme was invalid/);
  ui.click('view', { view: 'buy' });
  assert.match(ui.element('count').textContent, /^Buy:/);
});

test('unavailable storage is visible and does not prevent view changes', () => {
  const ui = boot({ unavailable: true });
  assert.match(ui.element('preference-status').textContent, /preferences are unavailable/);
  ui.click('view', { view: 'buy' });
  assert.match(ui.element('count').textContent, /^Buy:/);
  assert.match(ui.element('preference-status').textContent, /could not be saved/);
});

test('monthly browsing shows opportunities; search includes inactive and unknown schedules', () => {
  const ui = boot();
  assert.match(ui.element('cards').innerHTML, /Sow \(method unspecified\)/);
  assert.doesNotMatch(ui.element('cards').innerHTML, /Beta/);
  ui.click('next', {});
  assert.equal(ui.element('month-name').textContent, 'April');
  assert.equal(ui.element('cards').innerHTML, '');
  ui.element('q').listeners.input({ target: { value: 'alpha' } });
  assert.match(ui.element('cards').innerHTML, /No listed activity this month/);
  ui.element('q').listeners.input({ target: { value: 'beta' } });
  assert.match(ui.element('cards').innerHTML, /Schedule unknown/);
  ui.element('q').listeners.input({ target: { value: '' } });
  ui.click('current', {});
  assert.equal(ui.element('month-name').textContent, 'March');
  assert.match(ui.element('cards').innerHTML, /Alpha/);
  ui.click('previous', {});
  assert.equal(ui.element('month-name').textContent, 'February');
});

test('annual details include source uncertainty and notes', () => {
  const ui = boot();
  const markup = ui.element('cards').innerHTML;
  assert.match(markup, /Fixture planting note/);
  assert.match(markup, /Test source/);
  assert.match(markup, /Test region/);
  assert.match(markup, /Fixture only/);
  assert.match(markup, /aria-hidden="true"/);
});

test('search updates results and reports no matches', () => {
  const ui = boot();
  ui.element('q').listeners.input({ target: { value: 'alpha' } });
  assert.match(ui.element('count').textContent, /1 of 2/);
  assert.doesNotMatch(ui.element('cards').innerHTML, /Beta/);
  ui.element('q').listeners.input({ target: { value: 'missing' } });
  assert.match(ui.element('empty').textContent, /No crops match/);
});

test('missing catalog reports an explicit loading error', () => {
  const ui = boot({ catalog: null });
  assert.match(ui.element('data-error').textContent, /could not be loaded/);
});

test('theme choices persist and system removes explicit override', () => {
  const ui = boot({ stored: { theme: 'dark' } });
  assert.equal(ui.context.document.documentElement.dataset.theme, 'dark');
  ui.click('theme', { theme: 'light' });
  assert.equal(ui.context.document.documentElement.dataset.theme, 'light');
  assert.equal(ui.storage.get('theme'), 'light');
  ui.click('theme', { theme: 'system' });
  assert.equal(ui.context.document.documentElement.dataset.theme, undefined);
});

test('first visit uses Plant and the Buenos Aires month, not UTC', () => {
  const ui = boot();
  assert.match(ui.element('count').textContent, /Plant/i);
  assert.equal(ui.element('month-name').textContent, 'March');
  assert.match(ui.element('cards').innerHTML, /Alpha/);
});