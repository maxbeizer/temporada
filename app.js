(() => {
  const T = {
    es: {
      months: ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],
      tagline: "Qué conviene comprar en la verdulería, mes a mes. Referencia: Buenos Aires y Pampa húmeda (hemisferio sur).",
      search: "Buscar…", all: "Todo", veg: "Verduras", fruit: "Frutas",
      now: "De temporada ahora", lang: "English", rot: "Empezar por el mes actual", inSeason: "de temporada", notInSeason: "fuera de temporada", curMonth: "(mes actual)", crop: "Producto",
      count: (n, t) => `${n} de ${t} productos`, none: "Sin resultados.",
      srch: "Fuentes y límites",
      caveat: "La temporada varía según la zona (Cuyo, NOA y Patagonia difieren) y la variedad. Es una guía general, no un dato de mercado. Los datos vienen de listas publicadas, no de mediciones propias; los meses de los productos marcados con ‘estacional’ son aproximados (por estación, no por mes).",
      srcA: "Calendario mensual InfoAgro / inspiracioneco (basado en documentos públicos del INTA), vía AgroRuralNoticias, 2020-07-18",
      srcB: "Argentina.gob.ar, Más Frutas y Verduras: frutas y verduras de estación; y Cuatro Estaciones (otoño)",
      approx: "estacional (aprox.)",
      themeLbl: "Tema", typeLbl: "Tipo", filters: "Filtros", skip: "Ir a la tabla", cap: "Calendario de temporada por producto y mes", region: "Calendario (desplazable)", system: "Sistema", light: "Claro", dark: "Oscuro", settings: "Ajustes", langLbl: "Idioma", monthLbl: "Orden de meses", close: "Listo"
    },
    en: {
      months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      tagline: "What to buy at the greengrocer, month by month. Reference: Buenos Aires and the Pampas (southern hemisphere).",
      search: "Search…", all: "All", veg: "Vegetables", fruit: "Fruit",
      now: "In season now", lang: "Español", rot: "Start with current month", inSeason: "in season", notInSeason: "not in season", curMonth: "(current month)", crop: "Produce",
      count: (n, t) => `${n} of ${t} items`, none: "No results.",
      srch: "Sources and limits",
      caveat: "Seasons vary by region (Cuyo, NOA and Patagonia differ) and by variety. This is a general guide, not market data. Data comes from published lists, not our own measurements; items marked ‘seasonal’ are approximate (by season, not by month).",
      srcA: "InfoAgro / inspiracioneco monthly calendar (based on public INTA documents), via AgroRuralNoticias, 2020-07-18",
      srcB: "Argentina.gob.ar, Más Frutas y Verduras: seasonal produce; and Cuatro Estaciones (autumn)",
      approx: "seasonal (approx.)",
      themeLbl: "Theme", typeLbl: "Type", filters: "Filters", skip: "Skip to table", cap: "Seasonality by produce item and month", region: "Calendar (scrollable)", system: "System", light: "Light", dark: "Dark", settings: "Settings", langLbl: "Language", monthLbl: "Month order", close: "Done"
    }
  };
  const $ = id => document.getElementById(id);
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const THEMES = ["system", "light", "dark"];
  const stored = store.get("lang");
  const state = { lang: stored || ((navigator.language || "").toLowerCase().startsWith("es") ? "es" : "en"), theme: THEMES.includes(store.get("theme")) ? store.get("theme") : "system", rot: store.get("rot") !== "0", type: "all", now: false, q: "" };
  const cur = new Date().getMonth(); // southern-hemisphere months match calendar months
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  function render() {
    const order = [...Array(12).keys()].map(i => state.rot ? (cur + i) % 12 : i);
    const t = T[state.lang];
    document.documentElement.lang = state.lang;
    $("tagline").textContent = t.tagline;
    $("q").placeholder = t.search; $("q").setAttribute("aria-label", t.search);
    document.querySelectorAll("#type button").forEach(b => {
      b.textContent = t[b.dataset.v]; b.setAttribute("aria-pressed", b.dataset.v === state.type);
    });
    $("nowlbl").textContent = t.now;
    $("settingslbl").textContent = t.settings; $("settingsttl").textContent = t.settings;
    $("langlbl").textContent = t.langLbl; $("themelbl").textContent = t.themeLbl; $("monthlbl").textContent = t.monthLbl;
    $("closebtn").textContent = t.close;
    $("langgrp").setAttribute("aria-label", t.langLbl);
    document.querySelectorAll("#langgrp button").forEach(b => b.setAttribute("aria-pressed", b.dataset.l === state.lang));
    $("filters").setAttribute("aria-label", t.filters);
    $("skiplbl").textContent = t.skip;
    $("type").setAttribute("aria-label", t.typeLbl);
    $("grid").parentElement.setAttribute("aria-label", t.region);
    $("theme").setAttribute("aria-label", t.themeLbl);
    document.querySelectorAll("#theme button").forEach(b => {
      b.textContent = t[b.dataset.t]; b.setAttribute("aria-pressed", b.dataset.t === state.theme);
    });
    if (state.theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = state.theme;
    $("rot").textContent = t.rot; $("rot").setAttribute("aria-pressed", state.rot);
    $("srch").textContent = t.srch; $("caveat").textContent = t.caveat;
    $("sources").innerHTML = `<li>${t.srcA}</li><li>${t.srcB}</li>`;

    const q = norm(state.q);
    const rows = window.PRODUCE.filter(p =>
      (state.type === "all" || p.type === state.type) &&
      (!state.now || p.months[cur]) &&
      (!q || norm(p.es).includes(q) || norm(p.en).includes(q)));
    $("count").textContent = rows.length ? t.count(rows.length, window.PRODUCE.length) : t.none;

    const other = state.lang === "es" ? "en" : "es";
    let h = `<caption class="vh">${t.cap}</caption><thead><tr><th scope="col">${t.crop}</th>` +
      order.map(i => `<th scope="col" class="${i === cur ? "cur" : ""}">${t.months[i]}${i === cur ? ` <span class="vh">${t.curMonth}</span>` : ""}</th>`).join("") + "</tr></thead>";
    for (const g of ["veg", "fruit"]) {
      const gr = rows.filter(r => r.type === g);
      if (!gr.length) continue;
      h += `<tbody><tr class="grp"><th colspan="13" scope="rowgroup">${t[g]}</th></tr>`;
      gr.sort((a, b) => a[state.lang].localeCompare(b[state.lang], state.lang));
      for (const r of gr) {
        const flag = r.src === "B" ? ` <span class="sec" title="${t.approx}" aria-hidden="true">~</span><span class="vh">(${t.approx})</span>` : "";
        h += `<tr><th scope="row">${r[state.lang]}${flag} <span class="sec">${r[other]}</span></th>` +
          order.map(i => { const v = r.months[i]; return `<td class="${v ? "on" : ""} ${i === cur ? "cur" : ""}"><span class="dot" aria-hidden="true"></span><span class="vh">${v ? t.inSeason : t.notInSeason}</span></td>`; }).join("") + "</tr>";
      }
      h += "</tbody>";
    }
    $("grid").innerHTML = h;
  }

  $("q").addEventListener("input", e => { state.q = e.target.value; render(); });
  $("now").addEventListener("change", e => { state.now = e.target.checked; render(); });
  $("rot").addEventListener("click", () => { state.rot = !state.rot; store.set("rot", state.rot ? "1" : "0"); render(); });
  $("langgrp").addEventListener("click", e => { const l = e.target.dataset.l; if (l) { state.lang = l; store.set("lang", l); render(); } });
  $("settingsbtn").addEventListener("click", () => $("settings").showModal());
  $("closebtn").addEventListener("click", () => $("settings").close());
  $("settings").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $("theme").addEventListener("click", e => { if (THEMES.includes(e.target.dataset.t)) { state.theme = e.target.dataset.t; store.set("theme", state.theme); render(); } });
  $("type").addEventListener("click", e => { if (e.target.dataset.v) { state.type = e.target.dataset.v; render(); } });
  render();
})();
