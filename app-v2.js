(() => {
  const T = {
    en: {
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      pageTitle: 'Temporada — Plant and buy in Buenos Aires',
      plant: 'Plant', buy: 'Buy', subtitle: "What's in season", skip: 'Skip to crops', language: 'Language',
      view: 'Crop view', month: 'Month', search: 'Search crops', previous: 'Previous month', next: 'Next month', current: 'This month',
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
      invalidLanguage: 'The saved language was invalid. Your browser language is being used.',
      dataError: 'The crop catalog could not be loaded. Please reload or try again when online.',
      offlineError: 'Offline support could not be enabled. You can keep using this page online.',
      empty: 'No crops match your search.', noOpportunities: 'No researched opportunities are listed for this month. Search for a crop to see its annual schedule or data gaps.', timing: 'Monthly guidance, not a guarantee. Local conditions can shift timing.',
      count: (n, total, view, month) => `${view}: ${n} of ${total} crops for ${month}.`,
      activeMonths: months => `Months: ${months}.`,
    },
    es: {
      months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      pageTitle: 'Temporada — Plantar y comprar en Buenos Aires',
      plant: 'Plantar', buy: 'Comprar', subtitle: 'Qué está de temporada', skip: 'Ir a los cultivos', language: 'Idioma',
      view: 'Vista del cultivo', month: 'Mes', search: 'Buscar cultivos', previous: 'Mes anterior', next: 'Mes siguiente', current: 'Este mes',
      theme: 'Tema', system: 'Sistema', light: 'Claro', dark: 'Oscuro',
      seedStart: 'Iniciar en almácigo', directSow: 'Siembra directa', transplant: 'Trasplantar', sow: 'Sembrar (método no especificado)',
      unknown: 'Calendario desconocido', inactive: 'No hay actividad indicada este mes', available: 'De temporada para comprar',
      unavailable: 'Fuera de la temporada de compra indicada', details: 'Calendario y fuentes', annual: 'Calendario anual',
      noSchedule: 'No hay un calendario investigado disponible. Desconocido no significa inadecuado.',
      noSources: 'No se indica ninguna fuente para este calendario.', sources: 'Fuentes',
      storageRead: 'Las preferencias guardadas no están disponibles. Plantar es la opción predeterminada; aún podés cambiar de vista.',
      storageWrite: 'No se pudo guardar tu preferencia. La navegación funciona durante esta visita.',
      invalidView: 'La vista guardada no era válida. Se seleccionó Plantar; elegí Plantar o Comprar para guardar una nueva preferencia.',
      invalidTheme: 'El tema guardado no era válido. Se usa el tema del sistema.',
      invalidLanguage: 'El idioma guardado no era válido. Se usa el idioma del navegador.',
      dataError: 'No se pudo cargar el catálogo de cultivos. Recargá la página o volvé a intentarlo cuando tengas conexión.',
      offlineError: 'No se pudo habilitar el uso sin conexión. Podés seguir usando esta página en línea.',
      empty: 'Ningún cultivo coincide con tu búsqueda.', noOpportunities: 'No hay oportunidades investigadas para este mes. Buscá un cultivo para ver su calendario anual o los datos faltantes.', timing: 'Orientación mensual, no una garantía. Las condiciones locales pueden cambiar las fechas.',
      count: (n, total, view, month) => `${view}: ${n} de ${total} cultivos para ${month}.`,
      activeMonths: months => `Meses: ${months}.`,
    },
  };
  const $ = id => document.getElementById(id);
  const views = ['plant', 'buy'];
  const themes = ['system', 'light', 'dark'];
  const languages = ['en', 'es'];
  const notices = new Set();
  function read(key) {
    try { return localStorage.getItem(key); }
    catch { notices.add('storageRead'); return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); }
    catch { notices.add('storageWrite'); }
  }
  const savedView = read('view');
  const savedTheme = read('theme');
  const savedLanguage = read('language');
  const browserLanguage = navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
  if (savedView !== null && !views.includes(savedView)) notices.add('invalidView');
  if (savedTheme !== null && !themes.includes(savedTheme)) notices.add('invalidTheme');
  if (savedLanguage !== null && !languages.includes(savedLanguage)) notices.add('invalidLanguage');
  const state = { view: views.includes(savedView) ? savedView : 'plant', theme: themes.includes(savedTheme) ? savedTheme : 'system', language: languages.includes(savedLanguage) ? savedLanguage : browserLanguage, month: 1, q: '' };
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
  const cropName = crop => state.language === 'es' ? crop.nameEs : crop.name;
  function entries(crop) {
    return state.view === 'buy' ? (crop.buy === null ? null : [crop.buy]) : crop.plant;
  }
  function sourceMarkup(ids) {
    const t = T[state.language];
    if (!ids.length) return `<p>${t.noSources}</p>`;
    return `<ul class="sources">${ids.map(id => {
      const source = sources.get(id);
      if (!source) return `<li>${t.noSources} (${escape(id)})</li>`;
      let url;
      try { const parsed = new URL(source.url); if (['https:', 'http:'].includes(parsed.protocol)) url = parsed.href; } catch { /* Invalid source URLs remain readable text. */ }
      const suffix = state.language === 'es' ? 'Es' : '';
      const title = escape(source[`title${suffix}`]);
      return `<li>${url ? `<a href="${escape(url)}">${title}</a>` : title}<p>${['region', 'precision', 'note'].map(key => source[`${key}${suffix}`]).filter(Boolean).map(escape).join(' · ')}</p></li>`;
    }).join('')}</ul>`;
  }
  function card(crop) {
    const t = T[state.language];
    const name = cropName(crop);
    const schedule = entries(crop);
    const known = Array.isArray(schedule);
    const active = known ? schedule.filter(entry => entry.months.includes(state.month)) : [];
    const status = !known ? t.unknown : state.view === 'buy' ? (active.length ? t.available : t.unavailable) : (active.length ? active.map(entry => t[entry.action]).join(' · ') : t.inactive);
    const annual = known ? schedule.map(entry => {
      const action = state.view === 'buy' ? t.buy : t[entry.action];
      const months = entry.months.map(month => t.months[month - 1]).join(', ');
      const note = state.language === 'es' ? entry.noteEs : entry.note;
      return `<section class="schedule"><h5>${escape(action)}</h5><p>${escape(t.activeMonths(months))}</p>${note ? `<p>${escape(note)}</p>` : ''}<h6>${t.sources}</h6>${sourceMarkup(entry.sources)}</section>`;
    }).join('') : `<p>${t.noSchedule}</p>`;
    return `<li class="crop-card" data-crop-id="${escape(crop.id)}"><article><h3><span class="emoji" aria-hidden="true">${escape(crop.emoji)}</span>${escape(name)}</h3><p class="status${active.length ? ' active' : ''}">${escape(status)}</p><details><summary>${t.details}<span class="vh">: ${escape(name)}</span></summary><h4>${t.annual}</h4>${annual}</details></article></li>`;
  }
  function renderPreferences() {
    if (state.theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = state.theme;
    document.querySelectorAll('#theme button').forEach(button => button.setAttribute('aria-pressed', button.dataset.theme === state.theme));
    $('preference-status').textContent = [...notices].map(key => T[state.language][key]).join(' ');
  }
  function render() {
    const t = T[state.language];
    document.documentElement.lang = state.language;
    document.title = t.pageTitle;
    if (state.theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = state.theme;
    document.querySelectorAll('#view button').forEach(button => button.setAttribute('aria-pressed', button.dataset.view === state.view));
    document.querySelectorAll('#theme button').forEach(button => button.setAttribute('aria-pressed', button.dataset.theme === state.theme));
    document.querySelectorAll('#language button').forEach(button => button.setAttribute('aria-pressed', button.dataset.lang === state.language));
    for (const [id, key] of Object.entries({ 'skip': 'skip', 'subtitle': 'subtitle', 'search-label': 'search', 'current': 'current', 'plant': 'plant', 'buy': 'buy', 'theme-label': 'theme', 'system': 'system', 'light': 'light', 'dark': 'dark', 'language-label': 'language', 'timing': 'timing', 'offline-error': 'offlineError' })) $(id).textContent = t[key];
    $('previous').setAttribute('aria-label', t.previous);
    $('next').setAttribute('aria-label', t.next);
    $('month-stepper').setAttribute('aria-label', t.month);
    $('view').setAttribute('aria-label', t.view);
    $('theme').setAttribute('aria-label', t.theme);
    $('language').setAttribute('aria-label', t.language);
    $('month-name').textContent = t.months[state.month - 1];
    const query = norm(state.q.trim());
    const rows = crops.filter(crop => {
      if (![crop.name, crop.nameEs].some(name => norm(name).includes(query))) return false;
      const schedule = entries(crop);
      return query || (schedule !== null && schedule.some(entry => entry.months.includes(state.month)));
    }).sort((a, b) => cropName(a).localeCompare(cropName(b), state.language));
    $('cards').innerHTML = rows.map(card).join('');
    $('count').textContent = t.count(rows.length, crops.length, t[state.view], t.months[state.month - 1]);
    $('empty').textContent = loaded && !rows.length ? (query ? t.empty : t.noOpportunities) : '';
    $('data-error').textContent = loaded ? '' : t.dataError;
    $('preference-status').textContent = [...notices].map(key => t[key]).join(' ');
  }
  $('view').addEventListener('click', event => {
    const button = event.target.closest('button[data-view]');
    if (!button || !views.includes(button.dataset.view)) return;
    state.view = button.dataset.view; notices.delete('invalidView'); save('view', state.view); render();
  });
  $('theme').addEventListener('click', event => {
    const button = event.target.closest('button[data-theme]');
    if (!button || !themes.includes(button.dataset.theme)) return;
    state.theme = button.dataset.theme; notices.delete('invalidTheme'); save('theme', state.theme); renderPreferences();
  });
  $('language').addEventListener('click', event => {
    const button = event.target.closest('button[data-lang]');
    if (!button || !languages.includes(button.dataset.lang)) return;
    state.language = button.dataset.lang; notices.delete('invalidLanguage'); save('language', state.language); render();
  });
  $('q').addEventListener('input', event => { state.q = event.target.value; render(); });
  $('previous').addEventListener('click', () => { state.month = (state.month + 10) % 12 + 1; render(); });
  $('next').addEventListener('click', () => { state.month = state.month % 12 + 1; render(); });
  $('current').addEventListener('click', () => { state.month = currentMonth(); render(); });
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
  window.addEventListener('pageshow', event => {
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