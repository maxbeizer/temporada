(() => {
  const T = {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    plant: 'Plant', buy: 'Buy', location: 'Belgrano, Buenos Aires', skip: 'Skip to crops',
    view: 'Crop view', search: 'Search crops', previous: 'Previous month', next: 'Next month', current: 'Current month',
    theme: 'Theme', system: 'System', light: 'Light', dark: 'Dark',
    seedStart: 'Start seeds', directSow: 'Sow directly', transplant: 'Transplant', sow: 'Sow (method unspecified)',
    unknown: 'Schedule unknown', inactive: 'No listed activity this month', available: 'In season to buy',
    unavailable: 'Not in the listed buying season', details: 'Schedule and sources', annual: 'Annual schedule',
    noSchedule: 'No researched schedule is available. Unknown does not mean unsuitable.',
    noSources: 'No source is listed for this schedule.', sources: 'Sources',
    storageRead: 'Saved preferences are unavailable. Plant is the default; you can still change views.',
    storageWrite: 'Your preference could not be saved. Navigation still works for this visit.',
    invalidView: 'The saved view was invalid. Plant is selected; choose Plant or Buy to save a new preference.',
    invalidTheme: 'The saved theme was invalid. The system theme is being used.',
    dataError: 'The crop catalog could not be loaded. Please reload or try again when online.',
    empty: 'No crops match your search.', noOpportunities: 'No researched opportunities are listed for this month. Search for a crop to see its annual schedule or data gaps.', timing: 'Monthly guidance, not a guarantee. Local conditions can shift timing.',
    count: (n, total, view, month) => `${view}: ${n} of ${total} crops for ${month}.`,
    currentLabel: month => `${month} (current Buenos Aires month)`,
    activeMonths: months => `Months: ${months}.`,
  };
  const $ = id => document.getElementById(id);
  const views = ['plant', 'buy'];
  const themes = ['system', 'light', 'dark'];
  const notices = new Set();
  function read(key) {
    try { return localStorage.getItem(key); }
    catch { notices.add(T.storageRead); return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); }
    catch { notices.add(T.storageWrite); }
  }
  const savedView = read('view');
  const savedTheme = read('theme');
  if (savedView !== null && !views.includes(savedView)) notices.add(T.invalidView);
  if (savedTheme !== null && !themes.includes(savedTheme)) notices.add(T.invalidTheme);
  const state = { view: views.includes(savedView) ? savedView : 'plant', theme: themes.includes(savedTheme) ? savedTheme : 'system', month: 1, q: '' };
  function currentMonth() {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', month: 'numeric' }).format(new Date()));
  }
  state.month = currentMonth();
  const loaded = Array.isArray(window.CROPS) && window.SOURCES && typeof window.SOURCES === 'object';
  const crops = loaded ? window.CROPS : [];
  const sources = new Map(loaded ? Object.entries(window.SOURCES) : []);
  const navigation = performance.getEntriesByType('navigation')[0];
  const pendingReturn = history.state?.temporadaReturn;
  const savedReturn = navigation?.type === 'back_forward' ? pendingReturn : null;
  const returnContext = savedReturn && views.includes(savedReturn.view) &&
    Number.isInteger(savedReturn.month) && savedReturn.month >= 1 && savedReturn.month <= 12 &&
    typeof savedReturn.q === 'string' && typeof savedReturn.cropId === 'string' &&
    Number.isInteger(savedReturn.sourceIndex) && savedReturn.sourceIndex >= 0 &&
    crops.some(crop => crop.id === savedReturn.cropId) ? savedReturn : null;
  if (returnContext) {
    state.view = returnContext.view;
    state.month = returnContext.month;
    state.q = returnContext.q;
  }
  function clearReturnContext() {
    if (!history.state?.temporadaReturn) return;
    const nextHistoryState = { ...history.state };
    delete nextHistoryState.temporadaReturn;
    history.replaceState(nextHistoryState, '');
  }
  if (pendingReturn && !returnContext) clearReturnContext();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const norm = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function entries(crop) {
    return state.view === 'buy' ? (crop.buy === null ? null : [crop.buy]) : crop.plant;
  }
  function sourceMarkup(ids) {
    if (!ids.length) return `<p>${T.noSources}</p>`;
    return `<ul class="sources">${ids.map(id => {
      const source = sources.get(id);
      if (!source) return `<li>${T.noSources} (${escape(id)})</li>`;
      let url;
      try { const parsed = new URL(source.url); if (['https:', 'http:'].includes(parsed.protocol)) url = parsed.href; } catch { /* Invalid source URLs remain readable text. */ }
      const title = escape(source.title);
      return `<li>${url ? `<a href="${escape(url)}">${title}</a>` : title}<p>${[source.region, source.precision, source.note].filter(Boolean).map(escape).join(' · ')}</p></li>`;
    }).join('')}</ul>`;
  }
  function card(crop) {
    const schedule = entries(crop);
    const known = Array.isArray(schedule);
    const active = known ? schedule.filter(entry => entry.months.includes(state.month)) : [];
    const status = !known ? T.unknown : state.view === 'buy' ? (active.length ? T.available : T.unavailable) : (active.length ? active.map(entry => T[entry.action]).join(' · ') : T.inactive);
    const annual = known ? schedule.map(entry => {
      const action = state.view === 'buy' ? T.buy : T[entry.action];
      const months = entry.months.map(month => T.months[month - 1]).join(', ');
      return `<section class="schedule"><h5>${escape(action)}</h5><p>${escape(T.activeMonths(months))}</p>${entry.note ? `<p>${escape(entry.note)}</p>` : ''}<h6>${T.sources}</h6>${sourceMarkup(entry.sources)}</section>`;
    }).join('') : `<p>${T.noSchedule}</p>`;
    return `<li class="crop-card" data-crop-id="${escape(crop.id)}"><article><h3><span class="emoji" aria-hidden="true">${escape(crop.emoji)}</span>${escape(crop.name)}</h3><p class="status${active.length ? ' active' : ''}">${escape(status)}</p><details><summary>${T.details}<span class="vh">: ${escape(crop.name)}</span></summary><h4>${T.annual}</h4>${annual}</details></article></li>`;
  }
  function renderPreferences() {
    if (state.theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = state.theme;
    document.querySelectorAll('#theme button').forEach(button => button.setAttribute('aria-pressed', button.dataset.theme === state.theme));
    $('preference-status').textContent = [...notices].join(' ');
  }
  function render() {
    document.documentElement.lang = 'en';
    if (state.theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = state.theme;
    document.querySelectorAll('#view button').forEach(button => button.setAttribute('aria-pressed', button.dataset.view === state.view));
    document.querySelectorAll('#theme button').forEach(button => button.setAttribute('aria-pressed', button.dataset.theme === state.theme));
    $('month-name').textContent = T.months[state.month - 1];
    $('month-note').textContent = state.month === currentMonth() ? T.currentLabel(T.months[state.month - 1]) : '';
    const query = norm(state.q.trim());
    const rows = crops.filter(crop => {
      if (!norm(crop.name).includes(query)) return false;
      const schedule = entries(crop);
      return query || (schedule !== null && schedule.some(entry => entry.months.includes(state.month)));
    }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    $('cards').innerHTML = rows.map(card).join('');
    $('count').textContent = T.count(rows.length, crops.length, T[state.view], T.months[state.month - 1]);
    $('empty').textContent = loaded && !rows.length ? (query ? T.empty : T.noOpportunities) : '';
    $('data-error').textContent = loaded ? '' : T.dataError;
    $('preference-status').textContent = [...notices].join(' ');
  }
  for (const [id, key] of Object.entries({ 'skip': 'skip', 'location': 'location', 'search-label': 'search', 'previous': 'previous', 'next': 'next', 'current': 'current', 'plant': 'plant', 'buy': 'buy', 'theme-label': 'theme', 'system': 'system', 'light': 'light', 'dark': 'dark', 'timing': 'timing' })) $(id).textContent = T[key];
  $('view').setAttribute('aria-label', T.view);
  $('theme').setAttribute('aria-label', T.theme);
  $('view').addEventListener('click', event => {
    const button = event.target.closest('button[data-view]');
    if (!button || !views.includes(button.dataset.view)) return;
    state.view = button.dataset.view; notices.delete(T.invalidView); save('view', state.view); render();
  });
  $('theme').addEventListener('click', event => {
    const button = event.target.closest('button[data-theme]');
    if (!button || !themes.includes(button.dataset.theme)) return;
    state.theme = button.dataset.theme; notices.delete(T.invalidTheme); save('theme', state.theme); renderPreferences();
  });
  $('q').addEventListener('input', event => { state.q = event.target.value; render(); });
  $('previous').addEventListener('click', () => { state.month = (state.month + 10) % 12 + 1; render(); });
  $('next').addEventListener('click', () => { state.month = state.month % 12 + 1; render(); });
  $('current').addEventListener('click', () => { state.month = currentMonth(); render(); });
  function refreshCurrentMonth() {
    $('month-note').textContent = state.month === currentMonth() ? T.currentLabel(T.months[state.month - 1]) : '';
  }
  let returnFocus = null;
  $('cards').addEventListener('click', event => {
    const link = event.target.closest('a');
    const cardElement = link?.closest('.crop-card');
    if (!link || !cardElement) return;
    returnFocus = link;
    history.replaceState({
      ...history.state,
      temporadaReturn: {
        view: state.view,
        month: state.month,
        q: state.q,
        cropId: cardElement.dataset.cropId,
        sourceIndex: [...cardElement.querySelectorAll('a')].indexOf(link),
      },
    }, '');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshCurrentMonth();
  });
  window.addEventListener('pageshow', event => {
    refreshCurrentMonth();
    if (event.persisted && returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
    clearReturnContext();
  });
  if (returnContext) $('q').value = state.q;
  render();
  if (returnContext) {
    const cardElement = document.querySelector(`.crop-card[data-crop-id="${returnContext.cropId}"]`);
    const details = cardElement?.querySelector('details');
    if (details) details.open = true;
    cardElement?.querySelectorAll('a')[returnContext.sourceIndex]?.focus();
    clearReturnContext();
  }
})();