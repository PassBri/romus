/* Romus · Word virtual: simulación de Office.js y de la API de Word para probar Romus en el navegador.
   Solo se carga con ?demo=1. El documento vive en window.__docu y la página demo.html lo dibuja y lo edita. */
(function () {
  const ejemplo = [
    ["Juego cooperativo y convivencia escolar en el recreo", "Título"],
    ["Planteamiento del problema", "Título 1"],
    ["En la Institución Educativa, los estudiantes de sexto grado presentan conflictos frecuentes durante el recreo. Segun estudios, el 38% de los estudiantes reportó haber sido empujado al menos una vez por semana.", "Normal"],
    ["La violencia escolar es un problema de salud pública (OMS, 2020). Como señalan Rojas, Díaz y Mora (2018) los juegos competitivos aumentan las agresiones.", "Normal"],
    ["Pregunta de investigación", "Título 2"],
    ["¿Qué efecto tiene un programa de juegos cooperativos en la convivencia escolar de los estudiantes de sexto grado?", "Normal"],
    ["Objetivos", "Título 1"],
    ["Determinar el efecto de un programa de juegos cooperativos en la convivencia escolar durante el recreo.", "Normal"],
    ["Marco referencial", "Título 1"],
    ["Ruiz (2021) afirma que en el fútbol «se burlan del que pierde» (Ruiz, 2021). Piaget afirmó que el juego es central para el desarrollo moral (Piaget, 1932, citado por Ruiz, 2021).", "Normal"],
    ["Referencias", "Título 1"],
    ["Ruiz, A. (2021). Convivencia en el recreo. Revista de Educación Física, 12(3), 45-60.", "Normal"]
  ];
  let guardado = null;
  try { guardado = JSON.parse(localStorage.getItem("romus.demo.doc") || "null"); } catch (e) { /* sin almacenamiento */ }
  const docu = {
    paras: (guardado && guardado.paras) || ejemplo.map(([text, style]) => ({ text, style })),
    comentarios: (guardado && guardado.comentarios) || [],
    tracking: "Off",
    formato: [],
    seleccion: null
  };
  window.__docu = docu;
  window.__docuEjemplo = () => ejemplo.map(([text, style]) => ({ text, style }));
  const avisar = () => { try { localStorage.setItem("romus.demo.doc", JSON.stringify({ paras: docu.paras, comentarios: docu.comentarios })); } catch (e) { /* lleno */ } try { window.parent && window.parent.__demoCambio && window.parent.__demoCambio(); } catch (e) { /* sin página demo */ } };
  window.__demoAvisar = avisar;
  const idx = (p) => docu.paras.indexOf(p);
  const ESTILOS = { Heading1: "Título 1", Heading2: "Título 2", Heading3: "Título 3", Title: "Título", Normal: "Normal", Quote: "Cita", ListParagraph: "Párrafo de lista", TableOfContents: "Tabla de contenido" };

  class Col { constructor(items) { this.items = items; } load() { return this; } getFirst() { return this.items[0]; } getFirstOrNullObject() { return this.items[0] || { isNullObject: true }; } getLast() { return this.items[this.items.length - 1]; } }
  class CR { constructor(v) { this.value = v; } }
  const marca = (p, c0, c1, k, v) => { (p.marcas = p.marcas || []).push({ ini: c0, fin: c1, k, v }); };

  class Rango {
    constructor(p0, c0, p1, c1) {
      this.p0 = p0; this.c0 = c0; this.p1 = p1; this.c1 = c1;
      const self = this;
      this.font = new Proxy({}, { set: (o, k, v) => { o[k] = v; const a = idx(self.p0), b = idx(self.p1); for (let i = a; i <= b; i++) { const p = docu.paras[i]; marca(p, i === a ? self.c0 : 0, i === b ? self.c1 : p.text.length, k, v); } docu.formato.push({ texto: self.text, [k]: v }); return true; } });
    }
    load() { return this; }
    get isNullObject() { return false; }
    get text() {
      const a = idx(this.p0), b = idx(this.p1);
      if (a === b) return this.p0.text.slice(this.c0, this.c1);
      const partes = [this.p0.text.slice(this.c0)];
      for (let k = a + 1; k < b; k++) partes.push(docu.paras[k].text);
      partes.push(this.p1.text.slice(0, this.c1));
      return partes.join("\r");
    }
    get paragraphs() { const a = idx(this.p0), b = idx(this.p1); return new Col(docu.paras.slice(a, b + 1).map(p => new Parrafo(p))); }
    getRange(loc) {
      if (loc === "Start") return new Rango(this.p0, this.c0, this.p0, this.c0);
      if (loc === "End" || loc === "After") return new Rango(this.p1, this.c1, this.p1, this.c1);
      return new Rango(this.p0, this.c0, this.p1, this.c1);
    }
    expandTo(o) { return new Rango(this.p0, this.c0, o.p1, o.c1); }
    compareLocationWith(o) { return new CR(this.p0 === o.p0 && this.p1 === o.p1 && this.c0 === o.c0 && this.c1 === o.c1 ? "Equal" : "Before"); }
    search(t, opts) {
      t = String(t).replace(/\^\^/g, "^");
      const res = [];
      const a = idx(this.p0), b = idx(this.p1);
      if (opts && opts.matchWildcards) { // comodines de Word: [[] = «[», []] = «]», * = cualquier texto
        const re = new RegExp(t.split(/(\[\[\]|\[\]\]|\*)/).map(x => x === "[[]" ? "\\[" : x === "[]]" ? "\\]" : x === "*" ? "[^\\]]*?" : x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(""), "g");
        for (let k = a; k <= b; k++) { const p = docu.paras[k]; let m; while ((m = re.exec(p.text))) res.push(new Rango(p, m.index, p, m.index + m[0].length)); }
        return new Col(res);
      }
      for (let k = a; k <= b; k++) {
        const p = docu.paras[k];
        const hay = opts && opts.matchCase ? p.text : p.text.toLowerCase();
        const aguja = opts && opts.matchCase ? t : t.toLowerCase();
        if (!aguja) continue;
        let pos = hay.indexOf(aguja);
        while (pos >= 0) {
          const antes = hay[pos - 1], despues = hay[pos + aguja.length];
          const ok = !(opts && opts.matchWholeWord) || (!/[\wáéíóúñ]/i.test(antes || "") && !/[\wáéíóúñ]/i.test(despues || ""));
          if (ok) res.push(new Rango(p, pos, p, pos + aguja.length));
          pos = hay.indexOf(aguja, pos + 1);
        }
      }
      return new Col(res);
    }
    insertText(t, loc) {
      t = String(t);
      if (loc === "End" || loc === "After") { this.p1.text = this.p1.text.slice(0, this.c1) + t + this.p1.text.slice(this.c1); const r = new Rango(this.p1, this.c1, this.p1, this.c1 + t.length); docu.seleccion = new Rango(this.p1, this.c1 + t.length, this.p1, this.c1 + t.length); return r; }
      if (loc === "Start" || loc === "Before") { this.p0.text = this.p0.text.slice(0, this.c0) + t + this.p0.text.slice(this.c0); return new Rango(this.p0, this.c0, this.p0, this.c0 + t.length); }
      // Replace
      const a = idx(this.p0), b = idx(this.p1);
      const nuevo = this.p0.text.slice(0, this.c0) + t + this.p1.text.slice(this.c1);
      const lineas = nuevo.split("\n");
      const nuevos = lineas.map((l, i) => i === 0 ? Object.assign(this.p0, { text: l, marcas: [] }) : { text: l, style: this.p0.style });
      docu.paras.splice(a, b - a + 1, ...nuevos);
      return new Rango(this.p0, this.c0, this.p0, this.c0 + t.length);
    }
    insertParagraph(t, loc) { const p = loc === "Before" || loc === "Start" ? this.p0 : this.p1; return new Parrafo(p).insertParagraph(t, loc === "Start" ? "Before" : loc === "End" ? "After" : loc); }
    insertTable(filas, cols, loc, valores) { return new Parrafo(this.p1).insertTable(filas, cols, loc, valores); }
    insertComment(t) { docu.comentarios.push({ sobre: this.text, t, autor: "Romus", fecha: new Date().toISOString().slice(0, 10) }); return { load() {} }; }
    insertField(loc, tipo) { const p = this.p0; if (tipo === "Page") p.campo = "página"; if (tipo === "TOC") p.campo = "índice"; return this; }
    insertBreak() { const n = { text: "", style: "Salto de página", salto: true }; docu.paras.splice(idx(this.p1) + 1, 0, n); return this; }
    select() { docu.seleccion = new Rango(this.p0, this.c0, this.p1, this.c1); try { window.parent.__demoIrA && window.parent.__demoIrA(idx(this.p0)); } catch (e) { /* sin demo */ } }
    delete() { this.insertText("", "Replace"); }
  }

  class Parrafo extends Rango {
    constructor(p) { super(p, 0, p, p.text.length); this.p = p; }
    get text() { return this.p.text; }
    get style() { return this.p.style; }
    set style(v) { this.p.style = ESTILOS[v] || v; }
    get styleBuiltIn() { return this.p.styleBuiltIn; }
    set styleBuiltIn(v) { this.p.styleBuiltIn = v; this.p.style = ESTILOS[v] || v; }
    get alignment() { return this.p.alignment || "Left"; } set alignment(v) { this.p.alignment = v; }
    get leftIndent() { return this.p.leftIndent || 0; } set leftIndent(v) { this.p.leftIndent = v; }
    get firstLineIndent() { return this.p.firstLineIndent || 0; } set firstLineIndent(v) { this.p.firstLineIndent = v; }
    get lineSpacing() { return this.p.lineSpacing || 12; } set lineSpacing(v) { this.p.lineSpacing = v; }
    get spaceAfter() { return this.p.spaceAfter || 0; } set spaceAfter(v) { this.p.spaceAfter = v; }
    get spaceBefore() { return this.p.spaceBefore || 0; } set spaceBefore(v) { this.p.spaceBefore = v; }
    get lineUnitAfter() { return 0; } set lineUnitAfter(v) { /* sin efecto */ }
    get lineUnitBefore() { return 0; } set lineUnitBefore(v) { /* sin efecto */ }
    get tableNestingLevel() { return this.p.tabla ? 1 : 0; }
    getRange(loc) { const r = new Rango(this.p, 0, this.p, this.p.text.length); return loc ? r.getRange(loc) : r; }
    insertParagraph(t, loc) {
      const nuevo = { text: String(t), style: "Normal" };
      const i = idx(this.p);
      docu.paras.splice(loc === "Before" || loc === "Start" ? i : i + 1, 0, nuevo);
      return new Parrafo(nuevo);
    }
    insertTable(filas, cols, loc, valores) {
      const t = { text: "", style: "Tabla", tabla: (valores || []).map(f => f.map(x => String(x == null ? "" : x))) };
      const i = idx(this.p);
      docu.paras.splice(loc === "Before" ? i : i + 1, 0, t);
      const nulo = new Proxy(function () {}, { get: (o, k) => k === "load" ? () => nulo : k === "then" ? undefined : nulo, set: () => true, apply: () => nulo });
      return nulo;
    }
    delete() { docu.paras.splice(idx(this.p), 1); }
  }

  const body = {
    get paragraphs() { return new Col(docu.paras.map(p => new Parrafo(p))); },
    get text() { return docu.paras.map(p => p.text).join("\r"); },
    load() { return this; },
    getRange(loc) { const f = docu.paras[0], l = docu.paras[docu.paras.length - 1]; return loc === "Start" ? new Rango(f, 0, f, 0) : loc === "End" ? new Rango(l, l.text.length, l, l.text.length) : new Rango(f, 0, l, l.text.length); },
    search(t, o) { const f = docu.paras[0], l = docu.paras[docu.paras.length - 1]; return new Rango(f, 0, l, l.text.length).search(t, o); },
    insertParagraph(t, loc) { const n = { text: String(t), style: "Normal" }; if (loc === "Start") docu.paras.unshift(n); else docu.paras.push(n); return new Parrafo(n); },
    insertText(t, loc) { return this.getRange(loc === "Start" ? "Start" : "End").insertText(t, "End"); },
    insertTable(f, c, loc, v) { return new Parrafo(docu.paras[docu.paras.length - 1]).insertTable(f, c, "After", v); },
    clear() { docu.paras.splice(0, docu.paras.length, { text: "", style: "Normal" }); docu.comentarios = []; },
    get font() { return new Proxy({}, { set: (o, k, v) => { docu.paras.forEach(p => marca(p, 0, p.text.length, k, v)); return true; } }); },
    getComments() {
      return new Col(docu.comentarios.map((c, k) => ({
        id: "c" + k, content: c.t, authorName: c.autor || "Jurado", creationDate: c.fecha || "2026-10-01",
        set resolved(v) { c.resuelto = v; }, get resolved() { return !!c.resuelto; },
        load() {}, reply(t) { (c.respuestas = c.respuestas || []).push(t); },
        getRange() { const p = docu.paras.find(x => x.text.includes(c.sobre)) || docu.paras[0]; return { text: c.sobre, load() {}, paragraphs: { getFirst() { return { text: p.text, load() {} }; } } }; }
      })));
    },
    getTrackedChanges() { return { load() {}, items: [], acceptAll() {}, rejectAll() {} }; }
  };
  const encabezado = { insertParagraph(t) { docu.encabezado = t; return { load() {}, alignment: "Right", getRange() { return { insertField() {} }; } }; }, clear() {}, load() { return this; }, paragraphs: new Col([]) };

  const ctx = {
    document: {
      body,
      sections: { getFirst() { return { getHeader() { return encabezado; }, getFooter() { return encabezado; } }; }, load() { return this; }, items: [] },
      getSelection() {
        if (docu.seleccion && docu.paras.includes(docu.seleccion.p0) && docu.paras.includes(docu.seleccion.p1)) return docu.seleccion;
        const p = docu.paras[docu.paras.length - 1]; return new Rango(p, p.text.length, p, p.text.length);
      },
      load() {}, properties: { title: "Documento", load() {} },
      get changeTrackingMode() { return docu.tracking; },
      set changeTrackingMode(v) { docu.tracking = v; }
    },
    trackedObjects: { add() {}, remove() {} },
    sync: async () => { avisar(); }
  };

  window.__seleccionar = (a, c0, b, c1) => { const P = docu.paras; if (!P[a] || !P[b]) return; docu.seleccion = new Rango(P[a], c0, P[b], c1); };
  window.Word = {
    run: async (fn) => { const r = await fn(ctx); avisar(); return r; },
    ChangeTrackingMode: { trackAll: "TrackAll", off: "Off" },
    InsertLocation: { start: "Start", end: "End", before: "Before", after: "After", replace: "Replace" }
  };
  const acciones = {};
  window.__acciones = acciones;
  const API_SIM = parseFloat((location.search.match(/[?&]api=([\d.]+)/) || [])[1]) || 0;
  window.Office = {
    HostType: { Word: "Word" },
    DevicePermissionType: { microphone: "microphone" },
    context: {
      // ?api=1.3 simula Word 2019/2021 (API de Word 1.3, sin motor compartido)
      requirements: { isSetSupported: (n, v) => !API_SIM ? true : n === "WordApi" ? parseFloat(v) <= API_SIM : n !== "SharedRuntime" },
      diagnostics: { version: API_SIM ? "16.0.10827 (simulado: Word 2019)" : "16.0.18227 (simulado: Microsoft 365)", platform: "PC" },
      document: { url: "documento-demo", addHandlerAsync(t, fn) { window.__alCambiarSeleccion = fn; }, settings: { get() { return null; }, set() {}, saveAsync(cb) { cb && cb({ status: "succeeded" }); } } },
      ui: {
        displayDialogAsync(url, opts, cb) {
          const u = url + (url.includes("?") ? "&" : "?") + "demo=1";
          const f = document.createElement("iframe");
          f.id = "dialogoDemo"; f.src = u;
          f.style.cssText = "position:fixed;right:10px;bottom:10px;width:320px;height:480px;border:1px solid #999;border-radius:12px;z-index:999;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.25)";
          const man = {};
          const d = { addEventHandler(t, fn) { man[t] = fn; }, messageChild(m) { try { f.contentWindow.__alMensajePadre && f.contentWindow.__alMensajePadre(m); } catch (e) { /* aún cargando */ } }, close() { f.remove(); } };
          window.__dialogo = { recibir: (m) => man.msg && man.msg({ message: m }), cerrar: () => { f.remove(); man.evt && man.evt({ error: 12006 }); } };
          document.body.appendChild(f);
          cb({ status: "succeeded", value: d });
        },
        messageParent(m) { try { window.parent.__dialogo.recibir(m); } catch (e) { /* sin padre */ } },
        addHandlerAsync(t, fn) { window.__alMensajePadre = (m) => fn({ message: m }); },
        openBrowserWindow(u) { window.open(u, "_blank", "noopener"); }
      }
    },
    actions: { associate(n, f) { acciones[n] = f; } },
    addin: { showAsTaskpane: async () => { try { window.parent.__demoMostrarPanel && window.parent.__demoMostrarPanel(); } catch (e) { /* sin demo */ } }, hide: async () => {}, onVisibilityModeChanged() {} },
    AsyncResultStatus: { Succeeded: "succeeded", Failed: "failed" },
    EventType: { DocumentSelectionChanged: "sel", DialogMessageReceived: "msg", DialogEventReceived: "evt", DialogParentMessageReceived: "pmsg" },
    onReady(cb) { const info = { host: "Word", platform: "PC" }; setTimeout(() => cb && cb(info), 0); return Promise.resolve(info); }
  };
})();
