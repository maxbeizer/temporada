const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const code = fs.readFileSync(path.join(__dirname, '../app-v2.js'), 'utf8');
const fixture = { sources: [{ id: 'fixture', title: 'Test source', titleEs: 'Fuente de prueba', url: 'https://example.com', region: 'Test region', regionEs: 'Región de prueba', precision: 'Monthly', precisionEs: 'Mensual', note: 'Fixture only', noteEs: 'Solo para pruebas' }], crops: [
  { id: 'a', name: 'Alpha', nameEs: 'Alfa', emoji: '🥬', category: 'vegetable', buy: { months: [3], sources: ['fixture'], note: 'Fixture buying note', noteEs: 'Nota de compra de prueba' }, plant: [{ action: 'sow', months: [3], sources: ['fixture'], note: 'Fixture planting note', noteEs: 'Nota de siembra de prueba' }] },
  { id: 'b', name: 'Beta', nameEs: 'Beta', emoji: '🌱', category: 'herb', buy: null, plant: null },
] };

function boot({ stored = {}, unavailable = false, locale = 'en-US', date = '2026-04-01T01:00:00Z', catalog = fixture, navigationType = 'navigate', historyState = null, returnCard = null } = {}) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, { textContent: '', innerHTML: '', hidden: false, dataset: {}, value: '', listeners: {}, attributes: {}, setAttribute(k, v) { this.attributes[k] = String(v); }, addEventListener(k, fn) { this.listeners[k] = fn; }, focus() {}, showModal() { this.open = true; }, close() { this.open = false; } });
    return elements.get(id);
  }
  const storage = new Map(Object.entries(stored));
  const documentListeners = {};
  const windowListeners = {};
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [date])); } }
  const history = { state: historyState, replaceState(value) { this.state = value; } };
  const context = { window: { CROPS: catalog?.crops, SOURCES: catalog ? Object.fromEntries(catalog.sources.map(source => [source.id, source])) : undefined, addEventListener() {} }, document: { documentElement: { dataset: {} }, getElementById: element, querySelectorAll: () => [], querySelector: () => returnCard, addEventListener() {} }, navigator: { language: locale }, localStorage: { getItem(k) { if (unavailable) throw Error('blocked'); return storage.get(k) ?? null; }, setItem(k, v) { if (unavailable) throw Error('blocked'); storage.set(k, v); } }, history, performance: { getEntriesByType: name => name === 'navigation' ? [{ type: navigationType }] : [] }, Date: Clock, Intl, console, setTimeout, URL };
  context.document.addEventListener = (name, listener) => { documentListeners[name] = listener; };
  context.window.addEventListener = (name, listener) => { windowListeners[name] = listener; };
  context.document.listeners = documentListeners;
  context.window.listeners = windowListeners;
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
  assert.doesNotMatch(ui.element('preference-status').textContent, /saved view was invalid/);
  ui.click('theme', { theme: 'dark' });
  assert.doesNotMatch(ui.element('preference-status').textContent, /saved theme was invalid/);
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

test('month arrow buttons use accessible names without verbose visible labels', () => {
  const ui = boot();
  assert.equal(ui.element('previous').attributes['aria-label'], 'Previous month');
  assert.equal(ui.element('next').attributes['aria-label'], 'Next month');
  assert.equal(ui.element('previous').textContent, '');
  assert.equal(ui.element('next').textContent, '');
  assert.equal(ui.element('current').textContent, 'This month');
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

test('language defaults from the browser and a choice translates and persists', () => {
  const ui = boot({ locale: 'es-AR' });
  assert.equal(ui.context.document.documentElement.lang, 'es');
  assert.equal(ui.context.document.title, 'Temporada — Plantar y comprar en Buenos Aires');
  assert.equal(ui.element('plant').textContent, 'Plantar');
  assert.equal(ui.element('month-name').textContent, 'Marzo');
  assert.equal(ui.element('offline-error').textContent, 'No se pudo habilitar el uso sin conexión. Podés seguir usando esta página en línea.');
  assert.match(ui.element('cards').innerHTML, /Alfa/);
  assert.match(ui.element('cards').innerHTML, /Nota de siembra de prueba/);
  assert.match(ui.element('cards').innerHTML, /Fuente de prueba/);
  ui.click('language', { lang: 'en' });
  assert.equal(ui.context.document.documentElement.lang, 'en');
  assert.equal(ui.storage.get('language'), 'en');
  assert.equal(ui.element('plant').textContent, 'Plant');
  assert.match(ui.element('cards').innerHTML, /Alpha/);
});

test('search matches crop names in either language', () => {
  const ui = boot();
  ui.element('q').listeners.input({ target: { value: 'alfa' } });
  assert.match(ui.element('cards').innerHTML, /Alpha/);
});

test('restores a saved language on a new visit', () => {
  const ui = boot({ stored: { language: 'es' }, locale: 'en-US' });
  assert.equal(ui.context.document.documentElement.lang, 'es');
  assert.equal(ui.element('buy').textContent, 'Comprar');
});

test('invalid saved language visibly falls back to the browser language', () => {
  const ui = boot({ stored: { language: 'unexpected' }, locale: 'es-AR' });
  assert.equal(ui.context.document.documentElement.lang, 'es');
  assert.match(ui.element('preference-status').textContent, /idioma guardado no era válido/);
});

test('resuming preserves browsed month, search and card DOM', () => {
  const ui = boot();
  ui.click('next', {});
  ui.element('q').listeners.input({ target: { value: 'alpha' } });
  const cards = ui.element('cards');
  let replacements = 0;
  const markup = cards.innerHTML;
  Object.defineProperty(cards, 'innerHTML', { get: () => markup, set() { replacements++; } });
  ui.context.window.listeners.pageshow({ persisted: true });
  assert.equal(ui.element('month-name').textContent, 'April');
  assert.equal(replacements, 0);
  assert.equal(cards.innerHTML, markup);
});

test('back-forward restoration returns focus to the source link', () => {
  const ui = boot();
  let focused = false;
  const cardElement = { dataset: { cropId: 'a' }, querySelectorAll: () => [sourceLink] };
  const sourceLink = { isConnected: true, closest: selector => selector === '.crop-card' ? cardElement : null, focus() { focused = true; } };
  ui.element('cards').listeners.click({ target: { closest: selector => selector === 'a' ? sourceLink : null } });
  assert.equal(ui.context.history.state.temporadaReturn.cropId, 'a');
  ui.context.window.listeners.pageshow({ persisted: true });
  assert.equal(focused, true);
  assert.equal(ui.context.history.state.temporadaReturn, undefined);
});

test('uncached history return restores browsing context and source focus', () => {
  let focused = false;
  const details = { open: false };
  const sourceLink = { focus() { focused = true; } };
  const returnCard = { querySelector: selector => selector === 'details' ? details : null, querySelectorAll: () => [sourceLink] };
  const historyState = { temporadaReturn: { view: 'plant', month: 4, q: 'alpha', cropId: 'a', sourceIndex: 0 } };
  const ui = boot({ navigationType: 'back_forward', historyState, returnCard });
  assert.equal(ui.element('month-name').textContent, 'April');
  assert.equal(ui.element('q').value, 'alpha');
  assert.match(ui.element('cards').innerHTML, /Alpha/);
  assert.equal(details.open, true);
  assert.equal(focused, true);
  assert.equal(ui.context.history.state.temporadaReturn, undefined);
});

test('new visits ignore stale return context', () => {
  const historyState = { temporadaReturn: { view: 'buy', month: 4, q: 'beta', cropId: 'b', sourceIndex: 0 } };
  const ui = boot({ navigationType: 'navigate', historyState });
  assert.equal(ui.element('month-name').textContent, 'March');
  assert.equal(ui.element('q').value, '');
  assert.match(ui.element('count').textContent, /^Plant:/);
  assert.equal(ui.context.history.state.temporadaReturn, undefined);
});

test('first visit uses Plant and the Buenos Aires month, not UTC', () => {
  const ui = boot();
  assert.match(ui.element('count').textContent, /Plant/i);
  assert.equal(ui.element('month-name').textContent, 'March');
  assert.match(ui.element('cards').innerHTML, /Alpha/);
});