(() => {
  const T = {
    es: {
      months: ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],
      tagline: "Qué conviene comprar en la verdulería, mes a mes. Referencia: Buenos Aires y Pampa húmeda (hemisferio sur).",
      search: "Buscar…", all: "Todo", veg: "Verduras", fruit: "Frutas",
      now: "De temporada ahora", lang: "English", crop: "Producto",
      count: (n, t) => `${n} de ${t} productos`, none: "Sin resultados.",
      srch: "Fuentes y límites",
      caveat: "La temporada varía según la zona (Cuyo, NOA y Patagonia difieren) y la variedad. Es una guía general, no un dato de mercado. Los datos vienen de listas publicadas, no de mediciones propias; los meses de los productos marcados con ‘estacional’ son aproximados (por estación, no por mes).",
      srcA: "Calendario mensual InfoAgro / inspiracioneco (basado en documentos públicos del INTA), vía AgroRuralNoticias, 2020-07-18",
      srcB: "Argentina.gob.ar, Más Frutas y Verduras: frutas y verduras de estación; y Cuatro Estaciones (otoño)",
      approx: "estacional (aprox.)",
      themeLbl: "Tema", typeLbl: "Tipo", skip: "Ir a la tabla", inSeason: "de temporada", outSeason: "fuera de temporada", curMonth: "mes actual", cap: "Calendario de temporada por producto y mes", region: "Calendario (desplazable)", system: "Sistema", light: "Claro", dark: "Oscuro"
    },
    en: {
      months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      tagline: "What to buy at the greengrocer, month by month. Reference: Buenos Aires and the Pampas (southern hemisphere).",
      search: "Search…", all: "All", veg: "Vegetables", fruit: "Fruit",
      now: "In season now", lang: "Español", crop: "Produce",
      count: (n, t) => `${n} of ${t} items`, none: "No results.",
      srch: "Sources and limits",
      caveat: "Seasons vary by region (Cuyo, NOA and Patagonia differ) and by variety. This is a general guide, not market data. Data comes from published lists, not our own measurements; items marked ‘seasonal’ are approximate (by season, not by month).",
      srcA: "InfoAgro / inspiracioneco monthly calendar (based on public INTA documents), via AgroRuralNoticias, 2020-07-18",
      srcB: "Argentina.gob.ar, Más Frutas y Verduras: seasonal produce; and Cuatro Estaciones (autumn)",
      approx: "seasonal (approx.)",
      themeLbl: "Theme", typeLbl: "Type", skip: "Skip to table", inSeason: "in season", outSeason: "not in season", curMonth: "current month", cap: "Seasonality by produce item and month", region: "Calendar (scrollable)", system: "System", light: "Light", dark: "Dark"
    }
  };
  const $ = id => document.getElementById(id);
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const THEMES = ["system", "light", "dark"];
  const stored = store.get("lang");
  const state = { lang: stored || ((navigator.language || "").toLowerCase().startsWith("es") ? "es" : "en"), theme: THEMES.includes(store.get("theme")) ? store.get("theme") : "system", type: "all", now: false, q: "" };
  const cur = new Date().getMonth(); // southern-hemisphere months match calendar months
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  function render() {
    const t = T[state.lang];
    document.documentElement.lang = state.lang;
    $("tagline").textContent = t.tagline;
    $("q").placeholder = t.search; $("q").setAttribute("aria-label", t.search);
    document.querySelectorAll("#type button").forEach(b => {
      b.textContent = t[b.dataset.v]; b.setAttribute("aria-pressed", b.dataset.v === state.type);
    });
    $("nowlbl").textContent = t.now;
    $("lang").textContent = t.lang; $("lang").lang = state.lang === "es" ? "en" : "es";
    $("skiplbl").textContent = t.skip;
    $("type").setAttribute("aria-label", t.typeLbl);
    $("grid").parentElement.setAttribute("aria-label", t.region);
    $("theme").setAttribute("aria-label", t.themeLbl);
    document.querySelectorAll("#theme button").forEach(b => {
      b.textContent = t[b.dataset.t]; b.setAttribute("aria-pressed", b.dataset.t === state.theme);
    });
    if (state.theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = state.theme;
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
      t.months.map((m, i) => `<th scope="col" class="${i === cur ? "cur" : ""}">${m}${i === cur ? ` <span class="vh">(${t.curMonth})</span>` : ""}</th>`).join("") + "</tr></thead>";
    for (const g of ["veg", "fruit"]) {
      const gr = rows.filter(r => r.type === g);
      if (!gr.length) continue;
      h += `<tbody><tr class="grp"><th colspan="13" scope="rowgroup">${t[g]}</th></tr>`;
      gr.sort((a, b) => a[state.lang].localeCompare(b[state.lang], state.lang));
      for (const r of gr) {
        const flag = r.src === "B" ? ` <span class="sec" title="${t.approx}" aria-hidden="true">~</span><span class="vh">(${t.approx})</span>` : "";
        h += `<tr><th scope="row">${r[state.lang]}${flag} <span class="sec">${r[other]}</span></th>` +
          r.months.map((v, i) => `<td class="${v ? "on" : ""} ${i === cur ? "cur" : ""}"><span class="dot" aria-hidden="true"></span><span class="vh">${v ? t.inSeason : t.outSeason}</span></td>`).join("") + "</tr>";
      }
      h += "</tbody>";
    }
    $("grid").innerHTML = h;
  }

  $("q").addEventListener("input", e => { state.q = e.target.value; render(); });
  $("now").addEventListener("change", e => { state.now = e.target.checked; render(); });
  $("lang").addEventListener("click", () => { state.lang = state.lang === "es" ? "en" : "es"; store.set("lang", state.lang); render(); });
  $("theme").addEventListener("click", e => { if (THEMES.includes(e.target.dataset.t)) { state.theme = e.target.dataset.t; store.set("theme", state.theme); render(); } });
  $("type").addEventListener("click", e => { if (e.target.dataset.v) { state.type = e.target.dataset.v; render(); } });
  render();
})();
