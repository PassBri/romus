/* Romus · Catálogo único de herramientas.
   El mismo catálogo alimenta: la caja de herramientas del panel (pestaña Investigar),
   las sugerencias por etapa de «Mi proyecto» y los botones de la pestaña «Romus» de la cinta de Word.
   Cada herramienta: id, grupo, nombre, descripción, ícono (trazos SVG 24×24) y acción
   (texto de comando para Romus o función). */
window.Herramientas = (function () {
  const H = () => Inv._h;
  const cmd = (t) => () => window.__VozDoc && __VozDoc.manejarComando(t, "boton");
  const run = (fn) => () => H().ejecutar(fn);
  const pref = (t, voz) => () => { const ui = H().ui; if (ui.prefijar) ui.prefijar(t); ui.hablar(voz); };

  const ICO = {
    bombillo: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    estructura: '<path d="M4 5h16M4 10h10M8 15h12M8 20h8"/>',
    coherencia: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6.5 10.5l4-3M13.5 7.5l4 3M17.5 13.5l-4 3M10.5 16.5l-4-3"/>',
    rubrica: '<path d="M5 20V10M10 20V4M15 20v-7M20 20V8"/>',
    libro: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 7h6M9 11h4"/>',
    biblioteca: '<path d="M4 4h3v16H4zM9 4h3v16H9z"/><path d="M14.5 4.8l2.9-.8 4 15.5-2.9.8z"/>',
    sincita: '<path d="M5 6h14v9H9l-4 4z"/><path d="M10 9.5l4 3M14 9.5l-4 3"/>',
    matriz: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M3 14h18M9 4v16"/>',
    muestra: '<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M3.5 19c.5-3 2.3-5 4.5-5s4 2 4.5 5M11.5 19c.5-3 2.3-5 4.5-5s4 2 4.5 5"/>',
    instrumento: '<path d="M9 4h6v3H9z"/><path d="M7 5H5v16h14V5h-2"/><path d="M8 11h2M12 11h4M8 15h2M12 15h4"/>',
    validacion: '<path d="M3 12.5l4 4 7-8"/><path d="M11 15.5l1 1 9-10"/>',
    etica: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M12 15s-3.5-2-3.5-4a1.8 1.8 0 0 1 3.5-.6 1.8 1.8 0 0 1 3.5.6c0 2-3.5 4-3.5 4z"/>',
    spss: '<path d="M4 4v16h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    atlas: '<path d="M4 7l4-3h12v12l-3 4H4z"/><path d="M8 4v12h12M8 16l-4 4"/>',
    discusion: '<path d="M12 4v16M5 8h14"/><path d="M5 8l-2.5 6h5zM19 8l-2.5 6h5z"/><path d="M8 20h8"/>',
    conclusiones: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    resumen: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h4"/>',
    apa: '<path d="M4 20L9.5 5h1L16 20M6.2 14.5h7.6"/><path d="M17 5h3.5l-2.5 5"/>',
    revisor: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/><path d="M8 10.5l1.8 1.8 3.2-3.6"/>',
    formato: '<path d="M4 20V4h16"/><path d="M4 20L20 4"/><path d="M8 20v-2M12 20v-3M16 20v-2M4 8h2M4 12h3M4 16h2"/>',
    referencia: '<path d="M6 10.5C6 8 7.5 6.5 10 6v2c-1.2.4-2 1.2-2 2.5h2V16H6zM14 10.5c0-2.5 1.5-4 4-4.5v2c-1.2.4-2 1.2-2 2.5h2V16h-4z"/>',
    existen: '<path d="M5 4h10l4 4v12H5z"/><path d="M14 4v5h5M8.5 14.5l2 2 4.5-4.5"/>',
    observaciones: '<path d="M4 4h16v11H9l-5 4z"/><path d="M8 8h8M8 11.5h5"/>',
    acta: '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 10.5h6"/><path d="M9 17c1-1.5 1.8-1.5 2.5 0s1.5 1.5 3.5-1"/>',
    sustentacion: '<circle cx="12" cy="7" r="3"/><path d="M6 21v-2a6 6 0 0 1 12 0v2M3 11h3M18 11h3M4.5 7.5l2 1M19.5 7.5l-2 1"/>',
    diapositivas: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8M7 12l3-3 2.5 2 4-4"/>',
    articulo: '<path d="M4 5h13v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v10a2 2 0 0 1-3 0M7 9h7M7 12.5h7M7 16h4"/>',
    usoia: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    guia: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9M12 17.2v.3"/>',
    teoria: '<path d="M12 22V12M12 12C9 12 6 10 6 6c3 0 6 2 6 6zM12 12c3 0 6-2 6-6-3 0-6 2-6 6zM12 15c-2.5 0-4.5-1.5-5-4M12 15c2.5 0 4.5-1.5 5-4"/>',
    tutorial: '<path d="M3 8l9-4 9 4-9 4z"/><path d="M7 10v5c3 2 7 2 10 0v-5M21 8v6"/>',
    director: '<rect x="3" y="4" width="13" height="10" rx="1"/><path d="M6 8h7M6 11h4"/><circle cx="19" cy="9" r="2"/><path d="M15.5 20c.3-2.5 1.6-4 3.5-4s3.2 1.5 3.5 4"/>',
    asesor: '<path d="M12 3l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.3l5-.7z"/>',
    proyecto: '<rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4M7 14h3M7 17h6"/>',
    crear: '<path d="M14 4c3 0 6 3 6 6l-7 7-6-6z"/><path d="M7 11l-3 1 2 2M13 17l-1 3-2-2M9 15l-4 4"/><circle cx="15" cy="9" r="1.3"/>',
    // Documento y voz
    hablar: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    modovoz: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/><circle cx="12" cy="12" r="3.2"/>',
    burbuja: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="15.5" cy="13.5" r="3"/>',
    leer: '<path d="M4 10v4h3l4 4V6L7 10H4zM15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11"/>',
    leersel: '<path d="M4 10v4h3l4 4V6L7 10H4zM15 9a4 4 0 0 1 0 6"/><path d="M19 4v4M17 6h4"/>',
    corregir: '<path d="M4 12.5l5 5L20 6.5"/>',
    revisar: '<path d="M5 5h14v10H9l-5 4z"/>',
    resumir: '<path d="M5 7h14M5 12h10M5 17h6"/>',
    explicar: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    simplificar: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    formal: '<path d="M3 9l9-5 9 5-9 5zM7 11.5V16c3 2 7 2 10 0v-4.5"/>',
    dictar: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 20h14"/>',
    mas: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    cronometro: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5M18.5 6.5l1.5-1.5"/>',
    ayuda: '<circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9"/><circle cx="12" cy="17.2" r=".6"/>'
  };

  const GRUPOS = { planear: "Planear", fundamentar: "Fundamentar", disenar: "Diseñar y recolectar", analizar: "Analizar datos", escribir: "Escribir resultados", apa: "Normas APA 7", entregar: "Entregar y sustentar", aprender: "Aprender", docentes: "Para directores y jurados" };
  // [grupo, id, nombre, descripción, ícono, acción]
  const LISTA = [
    ["planear", "idear", "Idear", "De la idea al problema, la pregunta y los objetivos", "bombillo", pref("Ayúdame a idear un proyecto sobre ", "Escribe o dime tu idea en una frase.")],
    ["planear", "estructura", "Estructura", "Los apartados de tu trabajo según el nivel", "estructura", cmd("inserta la estructura")],
    ["planear", "coherencia", "Coherencia", "¿Problema, pregunta, objetivos y método encajan?", "coherencia", cmd("revisa la coherencia")],
    ["planear", "rubrica", "Rúbrica", "Qué tan completo está para tu nivel", "rubrica", cmd("evalúa con la rúbrica")],
    ["fundamentar", "literatura", "Buscar literatura", "Fuentes reales, también en español", "libro", pref("Busca literatura sobre ", "Dime el tema y busco fuentes reales.")],
    ["fundamentar", "biblioteca", "Mi biblioteca", "Fuentes guardadas, fichas e importación de Zotero", "biblioteca", () => Biblio.abrir()],
    ["fundamentar", "matriz", "Matriz de antecedentes", "Con tus fichas de lectura", "matriz", () => Biblio.todas().some(x => x.ficha) ? Biblio.matriz() : Biblio.abrir()],
    ["fundamentar", "sincita", "Frases sin cita", "Lo que el jurado preguntaría «¿según quién?»", "sincita", run(() => Biblio.sinRespaldo())],
    ["disenar", "muestra", "Tamaño de muestra", "Cálculo exacto y párrafo para tu método", "muestra", () => Instrumentos.muestra()],
    ["disenar", "instrumento", "Instrumento", "Cuestionario o guion de entrevista", "instrumento", run(() => Instrumentos.instrumento())],
    ["disenar", "validacion", "Validación por jueces", "V de Aiken y Lawshe", "validacion", () => Instrumentos.validacion()],
    ["disenar", "etica", "Ética", "Consentimientos, asentimiento y carta", "etica", run(() => Instrumentos.etica())],
    ["analizar", "spss", "SPSS o R", "Sintaxis y resultados en APA verificados", "spss", () => Datos.inicio("cuanti")],
    ["analizar", "atlas", "ATLAS.ti", "Libro de códigos y hallazgos con citas verificadas", "atlas", () => Datos.inicio("cuali")],
    ["escribir", "discusion", "Discusión", "Tus resultados frente a los antecedentes", "discusion", run(() => Escritura.discusion())],
    ["escribir", "conclusiones", "Conclusiones", "¿Cada objetivo tiene su conclusión?", "conclusiones", run(() => Escritura.conclusiones())],
    ["escribir", "resumen", "Resumen y abstract", "Con palabras clave y extensión correcta", "resumen", run(() => Escritura.resumen())],
    ["apa", "apaasesor", "Asesor APA 7", "Dudas de citas y referencias", "apa", () => APA.asesor()],
    ["apa", "aparevisor", "Revisor APA 7", "Revisa todo el documento y corrige lo seguro", "revisor", run(() => APA.revisor())],
    ["apa", "apaformato", "Formato APA 7", "Fuente, interlineado, títulos, portada, índice", "formato", () => Formato.tarjetaOpciones()],
    ["apa", "apareferencia", "Generar referencia", "Libro, artículo, tesis, web, ley, IA…", "referencia", () => APA.generador()],
    ["entregar", "existen", "¿Mis fuentes existen?", "Verifica citas y referencias", "existen", cmd("verifica las referencias")],
    ["entregar", "observaciones", "Observaciones", "Matriz de respuesta al jurado o asesor", "observaciones", run(() => Revision.observaciones())],
    ["entregar", "acta", "Acta de asesoría", "Con compromisos y firmas", "acta", () => Revision.acta()],
    ["entregar", "sustentacion", "Simulacro de sustentación", "Romus hace de jurado por voz", "sustentacion", cmd("simulacro de sustentación")],
    ["entregar", "diapositivas", "Presentación", "PowerPoint con notas del orador y gráficos", "diapositivas", run(() => Presentacion.crear())],
    ["entregar", "articulo", "Tesis → artículo", "Borrador IMRyD y revistas", "articulo", run(() => Escritura.articulo())],
    ["entregar", "usoia", "Uso de IA", "Declaración para tu universidad", "usoia", cmd("declaración de uso de IA")],
    ["aprender", "guia", "Guía", "Dudas de metodología", "guia", cmd("abre la guía")],
    ["aprender", "teoria", "Teoría", "Libro de Brian Suárez", "teoria", cmd("abre la teoría")],
    ["aprender", "tutorial", "Tutorial", "Investigar paso a paso", "tutorial", cmd("modo tutorial")],
    ["docentes", "director", "Modo director", "Informe de revisión de un estudiante", "director", run(() => Revision.director())]
  ];
  const TODAS = LISTA.map(([grupo, id, nombre, desc, ico, accion]) => ({ grupo, id, nombre, desc, ico, accion }));
  const porId = (id) => TODAS.find(t => t.id === id);
  function ejecutar(id) { const t = porId(id); if (t) t.accion(); }
  const svg = (ico) => `<svg viewBox="0 0 24 24">${ICO[ico] || ""}</svg>`;

  function boton(t) {
    const b = document.createElement("button");
    b.className = "herr"; b.title = t.desc; b.dataset.herr = t.id;
    b.innerHTML = `<i>${svg(t.ico)}</i><span><b></b><small></small></span>`;
    b.querySelector("b").textContent = t.nombre; b.querySelector("small").textContent = t.desc;
    b.onclick = () => ejecutar(t.id);
    return b;
  }
  /** Pinta la caja de herramientas agrupada en el contenedor. */
  function pintar(cont) {
    if (!cont) return;
    cont.innerHTML = "";
    Object.keys(GRUPOS).forEach(g => {
      const xs = TODAS.filter(t => t.grupo === g); if (!xs.length) return;
      const grupo = document.createElement("div"); grupo.className = "etapa-grupo";
      const tit = document.createElement("b"); tit.textContent = GRUPOS[g]; grupo.appendChild(tit);
      const grid = document.createElement("div"); grid.className = "herramientas-etapa";
      xs.forEach(t => grid.appendChild(boton(t)));
      grupo.appendChild(grid); cont.appendChild(grupo);
    });
  }
  /** Herramientas recomendadas para cada etapa del método Kuetz. */
  const POR_ETAPA = {
    tema: ["idear", "literatura", "estructura"],
    planteamiento: ["coherencia", "literatura", "sincita", "rubrica"],
    fundamentacion: ["biblioteca", "matriz", "sincita", "apareferencia"],
    metodologia: ["muestra", "instrumento", "etica", "coherencia"],
    campo: ["validacion", "etica", "spss", "atlas"],
    resultados: ["spss", "atlas", "aparevisor"],
    discusion: ["discusion", "conclusiones", "resumen", "apaformato"],
    sustentacion: ["sustentacion", "diapositivas", "observaciones", "articulo"]
  };
  function paraEtapa(etapa) { return (POR_ETAPA[etapa] || []).map(porId).filter(Boolean); }

  /* ---------- Cinta de opciones de Word ---------- */
  // Funciones de la pestaña «Romus» que no son herramientas de investigación (las define app.js).
  const CINTA_EXTRA = ["Hablar", "ModoVoz", "Burbuja", "Leer", "LeerSel", "Corregir", "Revisar", "Resumir", "Explicar", "Simplificar", "Formal", "Dictar", "Ayuda", "Asesor", "MiProyecto", "Crear"];
  const nombreFuncion = (id) => "romus" + id.charAt(0).toUpperCase() + id.slice(1);

  return { TODAS, GRUPOS, ICO, porId, ejecutar, pintar, boton, paraEtapa, nombreFuncion, CINTA_EXTRA, svg };
})();
