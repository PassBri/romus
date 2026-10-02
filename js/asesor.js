/* Romus · Asesor de investigación (método Kuetz).
   Basado en las funciones reales de un asesor de tesis:
   - Gestor del proyecto: etapas, avance, cronograma con fechas de entrega.            (enfoque funcional)
   - Guía disciplinar: normas, estructura y criterios del nivel.                         (enculturación)
   - Pensamiento crítico: preguntas socráticas sobre tu propio trabajo.                  (pensamiento crítico)
   - Autonomía: modo «Tutor» que guía sin redactar por ti.                               (emancipación)
   - Acompañamiento: bitácora de sesiones, tareas, logros y ánimo.                       (relación)
   Y la opción Pro: crear un proyecto completo desde cero con el método Kuetz, en 7 fases. */
window.Asesor = (function () {
  const H = () => Inv._h;
  const $ = (id) => document.getElementById(id);
  const CLAVE = "romus.proyectos.v1";
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

  /* ---------- Estado del proyecto (por documento, solo en este equipo) ---------- */
  function todos() { try { return JSON.parse(localStorage.getItem(CLAVE) || "{}"); } catch (e) { return {}; } }
  function proyecto() {
    const t = todos(); const k = H().claveDoc();
    return Object.assign({ creado: new Date().toISOString(), fechaFinal: "", hitos: [], sesiones: [], hechos: {} }, t[k] || {});
  }
  function guardar(p) { try { const t = todos(); t[H().claveDoc()] = p; localStorage.setItem(CLAVE, JSON.stringify(t)); } catch (e) { /* sin almacenamiento */ } }

  /* ---------- Etapas del método Kuetz y detección local del avance ---------- */
  const ETAPAS = [
    { id: "tema", nombre: "Idea y tema", re: /^(t[ií]tulo|tema|idea|introducci[oó]n|resumen)/i, peso: 1, consejo: "Define un tema acotado: quién, dónde, cuándo y qué aspecto." },
    { id: "planteamiento", nombre: "Planteamiento", re: /(planteamiento|problema|pregunta|objetivo|justificaci[oó]n|contexto y necesidad)/i, peso: 2, consejo: "Problema con evidencia, pregunta investigable, objetivos medibles y justificación." },
    { id: "fundamentacion", nombre: "Fundamentación teórica", re: /(marco|antecedente|estado del arte|teor[ií]a|referencial|conceptual)/i, peso: 2, consejo: "Antecedentes recientes, teoría de base y el vacío que cubres." },
    { id: "metodologia", nombre: "Diseño metodológico", re: /(metodolog|dise[ñn]o|enfoque|poblaci[oó]n|muestra|participantes|t[eé]cnicas|instrumento)/i, peso: 2, consejo: "Enfoque, diseño, participantes, instrumentos, análisis y ética." },
    { id: "campo", nombre: "Instrumentos y trabajo de campo", re: /(validaci[oó]n|prueba piloto|trabajo de campo|recolecci[oó]n|aplicaci[oó]n del instrumento|procedimiento)/i, peso: 2, consejo: "Valida los instrumentos, haz una prueba piloto y recolecta los datos." },
    { id: "resultados", nombre: "Análisis y resultados", re: /(resultados|an[aá]lisis de (datos|resultados)|hallazgos)/i, peso: 2, consejo: "Presenta los datos con tablas y figuras, sin interpretarlos todavía." },
    { id: "discusion", nombre: "Discusión y conclusiones", re: /(discusi[oó]n|conclusi[oó]n|recomendaci|limitaci)/i, peso: 2, consejo: "Interpreta frente a la literatura, responde la pregunta y declara limitaciones." },
    { id: "sustentacion", nombre: "Sustentación", re: /^$/, peso: 1, consejo: "Prepara la presentación y practica con el simulacro de jurado." }
  ];

  async function avance() {
    const ps = await Doc.leerParrafos();
    const titulos = ps.filter(p => Doc.esTitulo(p.estilo) && p.texto.trim());
    const est = {};
    ETAPAS.forEach(e => { est[e.id] = { palabras: 0, secciones: 0 }; });
    titulos.forEach((t, k) => {
      const sig = titulos[k + 1] ? titulos[k + 1].i : ps.length;
      const palabras = ps.filter(p => p.i > t.i && p.i < sig && !Doc.esTitulo(p.estilo)).reduce((a, p) => a + (p.texto.trim() ? p.texto.trim().split(/\s+/).length : 0), 0);
      const e = ETAPAS.find(x => x.re.test(t.texto.trim()));
      if (e) { est[e.id].palabras += palabras; est[e.id].secciones++; }
    });
    const p = proyecto();
    const totalPal = ps.reduce((a, x) => a + (x.texto.trim() ? x.texto.trim().split(/\s+/).length : 0), 0);
    if (totalPal > 30 && !est.tema.secciones) est.tema.palabras = totalPal; // hay contenido aunque no tenga título
    const umbral = { tema: 15, planteamiento: 250, fundamentacion: 500, metodologia: 300, campo: 150, resultados: 250, discusion: 200, sustentacion: 1 };
    const filas = ETAPAS.map(e => {
      const pal = est[e.id].palabras;
      const manual = !!p.hechos[e.id];
      const frac = manual ? 1 : Math.min(1, pal / umbral[e.id]);
      return Object.assign({}, e, { palabras: pal, frac, hecha: frac >= 1 });
    });
    const total = filas.reduce((a, f) => a + f.peso, 0);
    const porc = Math.round(filas.reduce((a, f) => a + f.frac * f.peso, 0) / total * 100);
    const actual = filas.find(f => !f.hecha) || filas[filas.length - 1];
    return { filas, porc, actual, totalPal };
  }

  /* ---------- Cronograma: distribuye las etapas hacia atrás desde la fecha final ---------- */
  function planear(fechaFinal) {
    const fin = new Date(fechaFinal + "T12:00:00");
    const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
    const dias = Math.max(14, Math.round((fin - hoy) / 864e5));
    const total = ETAPAS.reduce((a, e) => a + e.peso, 0);
    let acum = 0;
    return ETAPAS.map(e => {
      acum += e.peso;
      const f = new Date(hoy.getTime() + Math.round(dias * acum / total) * 864e5);
      return { id: e.id, nombre: e.nombre, fecha: f.toISOString().slice(0, 10) };
    });
  }
  const fmt = (iso) => { try { return new Date(iso + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return iso; } };
  const diasA = (iso) => Math.round((new Date(iso + "T12:00:00") - new Date().setHours(12, 0, 0, 0)) / 864e5);

  async function miProyecto() {
    const { tarjeta, el, etiqueta } = H();
    const ui = H().ui;
    const a = await avance();
    const p = proyecto();
    const c = el("div", "inv-cuerpo asesor");
    const pun = el("div", "inv-puntaje"); pun.append(el("b", "", a.porc + "%"), el("span", "", `de avance · ${Inv.nivel().nombre} · ${a.totalPal.toLocaleString("es-CO")} palabras`)); c.appendChild(pun);
    c.appendChild(etiqueta("documento", "calculado con tus títulos"));
    const sig = el("div", "guia-sencillo");
    sig.append(el("b", "", "Lo que sigue: " + a.actual.nombre), el("span", "", a.actual.consejo));
    c.appendChild(sig);
    if (window.Herramientas) {
      const hs = Herramientas.paraEtapa(a.actual.id);
      if (hs.length) { c.appendChild(el("div", "inv-sub", "Herramientas para esta etapa")); const g = el("div", "etapa-herr"); hs.forEach(t => g.appendChild(Herramientas.boton(t))); c.appendChild(g); }
    }
    // Etapas
    const lista = el("div", "etapas");
    a.filas.forEach(f => {
      const fila = el("label", "etapa" + (f.hecha ? " hecha" : f === a.actual ? " actual" : ""));
      const chk = el("input"); chk.type = "checkbox"; chk.checked = f.hecha; chk.title = "Marcar como terminada";
      chk.onchange = () => { const q = proyecto(); q.hechos[f.id] = chk.checked; guardar(q); miProyecto(); };
      const barra = el("i", "barra"); const r = el("i"); r.style.width = Math.round(f.frac * 100) + "%"; barra.appendChild(r);
      const hito = (p.hitos || []).find(h => h.id === f.id);
      const nombre = el("span", "", f.nombre);
      fila.append(chk, nombre, barra);
      if (hito) { const d = diasA(hito.fecha); const s = el("small", d < 0 && !f.hecha ? "vencida" : "", fmt(hito.fecha) + (f.hecha ? "" : d < 0 ? ` · venció hace ${-d} d` : ` · ${d} d`)); fila.appendChild(s); }
      lista.appendChild(fila);
    });
    c.appendChild(lista);
    // Fecha final y cronograma
    const fila = el("div", "inv-acciones");
    fila.appendChild(el("span", "inv-nota", "Fecha de entrega o sustentación:"));
    const f = el("input"); f.type = "date"; f.value = p.fechaFinal || ""; f.className = "fecha";
    const bP = el("button", "boton secundario", p.hitos && p.hitos.length ? "Recalcular cronograma" : "Crear cronograma");
    bP.onclick = () => { if (!f.value) { f.focus(); return; } const q = proyecto(); q.fechaFinal = f.value; q.hitos = planear(f.value); guardar(q); miProyecto(); ui.hablar("Listo, repartí las etapas hasta tu fecha de entrega."); };
    fila.append(f, bP); c.appendChild(fila);
    if (p.hitos && p.hitos.length) {
      const bT = el("button", "boton secundario", "Insertar cronograma en el documento");
      bT.onclick = () => H().ejecutar(() => insertarCronograma(proyecto().hitos));
      c.appendChild(bT);
    }
    // Tareas de la última sesión
    const ult = (p.sesiones || [])[p.sesiones.length - 1];
    if (ult && ult.tareas && ult.tareas.length) {
      c.appendChild(el("div", "inv-sub", `Tareas de la sesión del ${fmt(ult.fecha.slice(0, 10))}`));
      ult.tareas.forEach((t, k) => {
        const l = el("label", "tarea" + (t.hecho ? " hecha" : ""));
        const chk = el("input"); chk.type = "checkbox"; chk.checked = !!t.hecho;
        chk.onchange = () => { const q = proyecto(); q.sesiones[q.sesiones.length - 1].tareas[k].hecho = chk.checked; guardar(q); l.classList.toggle("hecha", chk.checked); if (chk.checked) ui.hablar("¡Bien! Una tarea menos."); };
        l.append(chk, el("span", "", t.tarea + (t.plazo_dias ? ` (${t.plazo_dias} días)` : "")));
        c.appendChild(l);
      });
    }
    const acc = el("div", "inv-acciones");
    const bS = el("button", "boton primario", "Sesión de asesoría"); bS.onclick = () => H().ejecutar(sesion);
    const bH = el("button", "boton secundario", `Bitácora (${(p.sesiones || []).length})`); bH.onclick = () => bitacora();
    acc.append(bS, bH); c.appendChild(acc);
    tarjeta("Mi proyecto", c);
    ui.hablar(`Llevas ${a.porc} por ciento. Lo que sigue: ${a.actual.nombre}.`);
  }

  async function insertarCronograma(hitos) {
    await Word.run(async (ctx) => {
      const body = ctx.document.body;
      const h = body.insertParagraph("Cronograma", "End"); h.styleBuiltIn = "Heading1";
      const filas = [["Etapa", "Fecha límite"]].concat(hitos.map(x => [x.nombre, fmt(x.fecha)]));
      try { const p = body.insertParagraph("", "End"); p.insertTable(filas.length, 2, "After", filas); }
      catch (e) { hitos.forEach(x => body.insertParagraph(`${x.nombre}: ${fmt(x.fecha)}`, "End")); }
      await ctx.sync();
    });
    H().ui.confirmar("Agregué el cronograma al final del documento.");
  }

  /* ---------- Sesión de asesoría ---------- */
  async function sesion() {
    const { documentoNumerado, pedirHerramienta, tarjeta, el, etiqueta, registrar, verificar, irA } = H();
    const ui = H().ui;
    const doc = await documentoNumerado();
    const a = await avance();
    const p = proyecto();
    const ult = (p.sesiones || [])[p.sesiones.length - 1];
    const prox = (p.hitos || []).find(h => h.id === a.actual.id);
    const tutor = (Config.get().modoAyuda || "tutor") === "tutor";
    const d = await pedirHerramienta("sesion_asesoria", "Sesión de asesoría de investigación.",
      { type: "object", properties: {
        avance: { type: "string", description: "Qué avanzó desde la última sesión (o estado general si es la primera), 1 o 2 frases" },
        diagnostico: { type: "string", description: "Diagnóstico honesto de la etapa actual, 2 o 3 frases" },
        prioridades: { type: "array", items: { type: "object", properties: {
          titulo: { type: "string" }, porque: { type: "string" }, como: { type: "string", description: "Cómo hacerlo, concreto" },
          evidencia: { type: "string", description: "Fragmento LITERAL del documento relacionado (máx. 20 palabras) o vacío" } }, required: ["titulo", "porque", "como"] }, description: "Exactamente 3, de la más importante a la menos" },
        preguntas: { type: "array", items: { type: "string" }, description: "3 preguntas socráticas que obliguen al estudiante a pensar su propio trabajo" },
        tareas: { type: "array", items: { type: "object", properties: { tarea: { type: "string" }, plazo_dias: { type: "integer" } }, required: ["tarea"] }, description: "3 a 5 tareas concretas para la próxima sesión" },
        logro: { type: "string", description: "Algo que hizo bien (reconocimiento sincero, sin exagerar)" }
      }, required: ["diagnostico", "prioridades", "preguntas", "tareas"] },
      `Actúa como un asesor de investigación experimentado, exigente y cercano. Nivel: ${Inv.nivel().nombre}. Enfoque: ${Inv.enfoque().nombre}.
Etapa actual estimada: ${a.actual.nombre} (avance ${a.porc} %). ${prox ? `Fecha límite de esta etapa: ${prox.fecha} (${diasA(prox.fecha)} días).` : ""}
${ult ? `Última sesión (${ult.fecha.slice(0, 10)}): tareas asignadas → ${ult.tareas.map(t => `${t.tarea} [${t.hecho ? "hecha" : "pendiente"}]`).join("; ")}. Palabras entonces: ${ult.palabras}; ahora: ${a.totalPal}.` : "Es la primera sesión."}
${tutor ? "MODO TUTOR: no redactes apartados por el estudiante; guía con indicaciones, preguntas y ejemplos breves." : "Puedes sugerir redacciones breves cuando ayuden."}

DOCUMENTO:
${doc.texto}`);
    const s = { fecha: new Date().toISOString(), palabras: a.totalPal, etapa: a.actual.id, diagnostico: d.diagnostico, prioridades: d.prioridades || [], preguntas: d.preguntas || [], tareas: (d.tareas || []).map(t => ({ tarea: t.tarea, plazo_dias: t.plazo_dias || 0, hecho: false })) };
    p.sesiones = (p.sesiones || []).concat([s]).slice(-30);
    guardar(p);
    registrar("Sesión de asesoría", a.actual.nombre, "modelo");

    const c = el("div", "inv-cuerpo asesor");
    c.appendChild(etiqueta("modelo", "asesor Romus"));
    if (d.logro) { const l = el("div", "guia-caja ejemplo"); l.append(el("b", "", "Lo que hiciste bien"), el("span", "", d.logro)); c.appendChild(l); }
    if (d.avance) c.appendChild(el("p", "inv-nota", "Avance: " + d.avance));
    c.appendChild(el("p", "guia-resumen", d.diagnostico));
    c.appendChild(el("div", "inv-sub", "Tus 3 prioridades"));
    (d.prioridades || []).forEach((x, k) => {
      const b = el("div", "prioridad");
      b.appendChild(el("b", "", `${k + 1}. ${x.titulo}`));
      b.appendChild(el("span", "", x.porque));
      b.appendChild(el("small", "", "Cómo: " + x.como));
      const i = x.evidencia ? verificar(x.evidencia, doc.parrafos) : -1;
      if (i >= 0) { const ir = el("button", "enlace-sutil", "Ver en el documento"); ir.onclick = () => irA(i); b.appendChild(ir); }
      c.appendChild(b);
    });
    c.appendChild(el("div", "inv-sub", "Piénsalo antes de seguir"));
    const ul = el("ul", "guia-puntos"); (d.preguntas || []).forEach(q => ul.appendChild(el("li", "", q))); c.appendChild(ul);
    c.appendChild(el("div", "inv-sub", "Tareas para la próxima sesión"));
    const ol = el("ol", "guia-puntos"); s.tareas.forEach(t => ol.appendChild(el("li", "", t.tarea + (t.plazo_dias ? ` · ${t.plazo_dias} días` : "")))); c.appendChild(ol);
    const acc = el("div", "inv-acciones");
    const bM = el("button", "boton secundario", "Ver mi proyecto"); bM.onclick = () => miProyecto();
    acc.appendChild(bM); c.appendChild(acc);
    tarjeta("Sesión de asesoría", c);
    ui.hablar(`${d.logro ? d.logro + " " : ""}${d.diagnostico} Tu primera prioridad: ${(d.prioridades[0] || {}).titulo || ""}.`);
  }

  function bitacora() {
    const { tarjeta, el } = H();
    const p = proyecto();
    const c = el("div", "inv-cuerpo asesor");
    if (!(p.sesiones || []).length) c.appendChild(el("p", "inv-nota", "Aún no hay sesiones. Pide una: «Ok Romus, sesión de asesoría»."));
    (p.sesiones || []).slice().reverse().forEach(s => {
      const d = el("details", "guia-mas");
      d.appendChild(el("summary", "", `${fmt(s.fecha.slice(0, 10))} · ${(ETAPAS.find(e => e.id === s.etapa) || {}).nombre || ""} · ${s.palabras} palabras`));
      d.appendChild(el("p", "guia-resumen chico", s.diagnostico));
      const ul = el("ul", "guia-puntos"); s.tareas.forEach(t => ul.appendChild(el("li", "", (t.hecho ? "✓ " : "○ ") + t.tarea))); d.appendChild(ul);
      c.appendChild(d);
    });
    const v = el("button", "boton secundario", "← Mi proyecto"); v.onclick = () => miProyecto(); c.appendChild(v);
    tarjeta("Bitácora de asesorías", c);
  }

  /* =====================================================================
     ROMUS PRO · Crear un proyecto completo desde cero (método Kuetz, 7 fases)
     ===================================================================== */
  // Licencia provisional sin servidor: formato ROMUS-XXXX-XXXX-XXXX con dígito de control.
  // Para cobrar de verdad hay que validar contra un servidor (por ejemplo, el webhook de Hotmart).
  function codigoValido(cod) {
    const m = String(cod || "").trim().toUpperCase().match(/^ROMUS-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
    if (!m) return false;
    const cuerpo = m[1] + m[2] + m[3].slice(0, 3);
    let s = 7; for (const ch of cuerpo) s = (s * 31 + ch.charCodeAt(0)) % 36;
    return s.toString(36).toUpperCase() === m[3][3];
  }
  function esPro() { return codigoValido(Config.get().codigoPro); }
  function pruebaDisponible() { return !(Config.get().pruebaProUsada > 0); }

  const FASES = [
    ["Descubrir", "Entrevista: tu idea, tu contexto y tus recursos"],
    ["Delimitar", "Título, problema, pregunta, objetivos y justificación (tú apruebas)"],
    ["Fundamentar", "Búsqueda de fuentes reales y marco teórico con citas APA 7"],
    ["Diseñar", "Metodología completa según tu nivel y enfoque"],
    ["Planear", "Cronograma y presupuesto"],
    ["Verificar", "Matriz de coherencia y verificación de referencias"],
    ["Declarar", "Declaración de uso de IA"]
  ];

  function nuevoProyecto(temaInicial) {
    const { tarjeta, el } = H();
    const c = el("div", "inv-cuerpo asesor pro");
    const cab = el("div", "pro-cab"); cab.append(el("span", "pro-sello", "★ PRO"), el("span", "", "Método Kuetz · 7 fases"));
    c.appendChild(cab);
    c.appendChild(el("p", "guia-resumen", "Te hago unas preguntas y construimos juntos un proyecto completo en tu documento: con fuentes reales, metodología, cronograma y presupuesto. Tú apruebas cada parte."));
    const ol = el("ol", "fases"); FASES.forEach(([n, d]) => { const li = el("li"); li.append(el("b", "", n), el("span", "", d)); ol.appendChild(li); }); c.appendChild(ol);
    if (!esPro() && !pruebaDisponible()) {
      const caja = el("div", "guia-caja error"); caja.append(el("b", "", "Función Pro"), el("span", "", "Ya usaste tu proyecto de prueba. Ingresa tu código Pro en Ajustes → Romus Pro para crear más."));
      c.appendChild(caja);
      tarjeta("Crear proyecto desde cero", c); return;
    }
    if (!esPro()) c.appendChild(el("p", "inv-nota", "Tienes 1 proyecto de prueba gratis."));
    // Formulario de la fase 1 (Descubrir)
    const campos = [
      ["tema", "¿Sobre qué quieres investigar? *", "Ej.: el juego cooperativo para mejorar la convivencia en el recreo", temaInicial || ""],
      ["poblacion", "¿Con quiénes y dónde? (si es teórica: ¿qué autores u obras?)", "Ej.: estudiantes de 6.º de un colegio público de Floridablanca", ""],
      ["problema", "¿Qué problema has observado? (opcional)", "Ej.: muchos conflictos y agresiones durante el recreo", ""],
      ["recursos", "¿Cuánto tiempo y qué recursos tienes? (opcional)", "Ej.: 6 meses, acceso a dos cursos, sin presupuesto externo", ""]
    ];
    const vals = {};
    campos.forEach(([id, lab, ph, v]) => {
      const l = el("label", "campo-pro"); l.appendChild(el("span", "", lab));
      const t = el("textarea"); t.rows = 2; t.placeholder = ph; t.value = v; vals[id] = t; l.appendChild(t); c.appendChild(l);
    });
    const fila = el("div", "inv-selectores");
    const sN = el("select"); Object.entries(Inv.NIVELES).forEach(([id, n]) => { const o = el("option", "", n.nombre); o.value = id; sN.appendChild(o); }); sN.value = Inv.nivel().id;
    const sE = el("select"); [["auto", "Que Romus elija el enfoque"], ["cuantitativo", "Cuantitativo"], ["cualitativo", "Cualitativo"], ["mixto", "Mixto"], ["teorico", "Teórico-documental (filosofía, teoría)"]].forEach(([v, t]) => { const o = el("option", "", t); o.value = v; sE.appendChild(o); });
    fila.append(sN, sE); c.appendChild(fila);
    const ir = el("button", "boton primario", "Empezar →");
    ir.onclick = () => {
      if (!vals.tema.value.trim()) { vals.tema.focus(); return; }
      Inv.fijarNivel(sN.value);
      H().ejecutar(() => fase2({ tema: vals.tema.value.trim(), poblacion: vals.poblacion.value.trim(), problema: vals.problema.value.trim(), recursos: vals.recursos.value.trim(), enfoque: sE.value }));
    };
    c.appendChild(ir);
    c.appendChild(el("p", "inv-nota", "Romus no inventa datos ni resultados: construye la propuesta (anteproyecto). Los resultados salen de tu trabajo de campo o de tu análisis del corpus."));
    tarjeta("Crear proyecto desde cero", c);
    setTimeout(() => vals.tema.focus(), 50);
    H().ui.hablar("Vamos a crear tu proyecto. Cuéntame sobre qué quieres investigar.");
  }

  let borrador = null;

  function progresoFases(c, activa) {
    const { el } = H();
    const f = el("div", "fases-mini");
    FASES.forEach(([n], k) => f.appendChild(el("span", k < activa ? "hecha" : k === activa ? "activa" : "", n)));
    c.appendChild(f);
  }

  async function fase2(datos, ajuste) {
    const { pedirHerramienta, tarjeta, el, etiqueta } = H();
    const n = Inv.nivel();
    const d = await pedirHerramienta("delimitar_proyecto", "Delimita un proyecto de investigación a partir de la entrevista.",
      { type: "object", properties: {
        titulo: { type: "string" }, enfoque: { type: "string", enum: ["cuantitativo", "cualitativo", "mixto", "teorico"], description: "teorico = investigación teórico-documental (filosofía, epistemología, teoría): trabaja con un corpus de textos y argumentos, sin participantes" },
        problema: { type: "string", description: "Planteamiento del problema en 2 o 3 párrafos separados por \\n, sin datos inventados: donde falte evidencia, indica [dato por confirmar]" },
        pregunta: { type: "string" }, objetivo_general: { type: "string" }, objetivos_especificos: { type: "array", items: { type: "string" } },
        justificacion: { type: "string", description: "1 o 2 párrafos" },
        hipotesis: { type: "string", description: "Hipótesis (cuantitativo/mixto), supuestos orientadores (cualitativo) o tesis a defender (teorico)" },
        palabras_clave_ingles: { type: "array", items: { type: "string" }, description: "2 búsquedas de 3 a 5 palabras clave en inglés para encontrar literatura" }
      }, required: ["titulo", "enfoque", "problema", "pregunta", "objetivo_general", "objetivos_especificos", "justificacion", "palabras_clave_ingles"] },
      `Nivel: ${n.nombre} (${n.producto}). Enfoque pedido: ${datos.enfoque === "auto" ? "elige el más adecuado y justifícalo en la justificación" : datos.enfoque}.
Entrevista:
- Tema: ${datos.tema}
- Participantes y lugar: ${datos.poblacion || "(no indicado)"}
- Problema observado: ${datos.problema || "(no indicado)"}
- Tiempo y recursos: ${datos.recursos || "(no indicado)"}
${ajuste ? "\nAJUSTES PEDIDOS POR EL ESTUDIANTE SOBRE LA VERSIÓN ANTERIOR: " + ajuste : ""}
Redacta con calidad académica en español. No inventes cifras, autores ni citas.`);
    borrador = { datos, d };
    Inv.fijarEnfoque(d.enfoque);
    const c = el("div", "inv-cuerpo asesor pro");
    progresoFases(c, 1);
    c.appendChild(etiqueta("modelo", "revísalo antes de aprobar"));
    const bloque = (t, v) => { if (!v || (Array.isArray(v) && !v.length)) return; c.appendChild(el("div", "inv-sub", t)); if (Array.isArray(v)) { const ol = el("ol", "guia-puntos"); v.forEach(x => ol.appendChild(el("li", "", x))); c.appendChild(ol); } else c.appendChild(el("p", "guia-resumen chico", v)); };
    bloque("Título", d.titulo); bloque("Enfoque", (Inv.ENFOQUES[d.enfoque] || {}).nombre || d.enfoque); bloque("Pregunta", d.pregunta); bloque("Objetivo general", d.objetivo_general);
    bloque("Objetivos específicos", d.objetivos_especificos); bloque(d.enfoque === "teorico" ? "Tesis a defender" : d.enfoque === "cualitativo" ? "Supuestos" : "Hipótesis", d.hipotesis);
    const det = el("details", "guia-mas"); det.appendChild(el("summary", "", "Problema y justificación"));
    det.appendChild(el("p", "guia-resumen chico", d.problema)); det.appendChild(el("p", "guia-resumen chico", d.justificacion)); c.appendChild(det);
    const aj = el("textarea"); aj.rows = 2; aj.placeholder = "¿Algo que cambiar? Ej.: «enfócalo en niñas», «hazlo cualitativo»"; aj.className = "ajuste";
    c.appendChild(aj);
    const acc = el("div", "inv-acciones");
    const bA = el("button", "boton primario", "Aprobar y continuar →"); bA.onclick = () => H().ejecutar(fasesRestantes);
    const bR = el("button", "boton secundario", "Ajustar"); bR.onclick = () => { if (aj.value.trim()) H().ejecutar(() => fase2(datos, aj.value.trim())); else aj.focus(); };
    acc.append(bA, bR); c.appendChild(acc);
    tarjeta("Fase 2 · Delimitar", c);
    H().ui.hablar(`Te propongo esta pregunta: ${d.pregunta} Revísala y apruébala para continuar.`);
  }

  function claveCita(k) { return `[F${k + 1}]`; }

  async function fasesRestantes() {
    if (!borrador) return;
    const { pedirHerramienta, tarjeta, el, buscarOpenAlex, apa, registrar } = H();
    const ui = H().ui;
    const { datos, d } = borrador;
    const n = Inv.nivel(), e = Inv.enfoque();
    const pinta = (k, txt) => {
      const c = el("div", "inv-cuerpo asesor pro"); progresoFases(c, k);
      c.appendChild(el("p", "guia-resumen", txt)); tarjeta("Creando tu proyecto…", c);
    };
    // Fase 3 · Fundamentar: fuentes REALES
    pinta(2, "Buscando fuentes académicas reales en OpenAlex…");
    let obras = [];
    for (const q of (d.palabras_clave_ingles || []).slice(0, 2).concat([datos.tema])) {
      try { (await buscarOpenAlex(q, true)).forEach(w => { if (!obras.some(o => o.id === w.id)) obras.push(w); }); } catch (x) { /* seguir */ }
      if (obras.length >= 12) break;
    }
    const fuentes = obras.slice(0, 12).map(apa);
    const listaF = fuentes.map((f, k) => `${claveCita(k)} ${f.autores.slice(0, 3).join(", ")} (${f.anio}). ${f.titulo}. ${f.fuente || ""}`).join("\n");
    pinta(2, `Encontré ${fuentes.length} fuentes reales. Redactando antecedentes y marco teórico…`);
    const m = await pedirHerramienta("marco_teorico", "Redacta antecedentes y marco teórico citando SOLO las fuentes dadas.",
      { type: "object", properties: {
        antecedentes: { type: "string", description: "3 a 5 párrafos separados por \\n. Cita con las claves [F1], [F2]… únicamente de la lista" },
        marco_teorico: { type: "string", description: "3 a 5 párrafos separados por \\n con las teorías y conceptos clave. Si citas, usa solo las claves de la lista" },
        marco_conceptual: { type: "array", items: { type: "object", properties: { concepto: { type: "string" }, definicion: { type: "string" } }, required: ["concepto", "definicion"] } }
      }, required: ["antecedentes", "marco_teorico"] },
      `Proyecto: ${d.titulo}\nPregunta: ${d.pregunta}\nObjetivo: ${d.objetivo_general}\n\nFUENTES REALES DISPONIBLES (no uses otras, no inventes autores ni años; si una fuente no es pertinente, no la cites):\n${listaF || "(ninguna: escribe sin citas y señala [completar con fuentes])"}`);
    // Fase 4 · Diseñar
    pinta(3, "Diseñando la metodología…");
    const secMet = (Inv.secciones().find(([t]) => /^(Metodolog|Dise[ñn]o metodol)/.test(t)) || ["Metodología", []])[1] || [];
    const met = await pedirHerramienta("metodologia", "Redacta la metodología del proyecto.",
      { type: "object", properties: { apartados: { type: "array", items: { type: "object", properties: { titulo: { type: "string" }, texto: { type: "string", description: "1 a 3 párrafos separados por \\n" } }, required: ["titulo", "texto"] } } }, required: ["apartados"] },
      `Nivel: ${n.nombre}. Enfoque: ${e.nombre}. Proyecto: ${d.titulo}. Participantes y lugar: ${datos.poblacion || "por definir"}. Recursos: ${datos.recursos || "por definir"}.\nObjetivos específicos: ${d.objetivos_especificos.join("; ")}\nRedacta estos apartados, en este orden: ${secMet.join("; ")}. Sé concreto y coherente con cada objetivo. No inventes cifras de población: usa [por confirmar] donde falte un dato.`);
    // Fase 5 · Planear
    pinta(4, "Planeando cronograma y presupuesto…");
    const plan = await pedirHerramienta("plan", "Cronograma y presupuesto del proyecto.",
      { type: "object", properties: {
        cronograma: { type: "array", items: { type: "object", properties: { actividad: { type: "string" }, inicio_mes: { type: "integer" }, fin_mes: { type: "integer" } }, required: ["actividad", "inicio_mes", "fin_mes"] } },
        presupuesto: { type: "array", items: { type: "object", properties: { rubro: { type: "string" }, descripcion: { type: "string" }, valor_cop: { type: "integer" } }, required: ["rubro", "descripcion", "valor_cop"] } },
        resultados_esperados: { type: "array", items: { type: "string" } }
      }, required: ["cronograma", "presupuesto", "resultados_esperados"] },
      `Proyecto de ${n.nombre}: ${d.titulo}. Tiempo y recursos: ${datos.recursos || "6 meses, recursos propios"}. Objetivos: ${d.objetivos_especificos.join("; ")}. Presupuesto realista en pesos colombianos (COP) para un estudiante.`);
    // Escribir en Word
    pinta(5, "Escribiendo el proyecto en tu documento…");
    // [F1][F2] o [F1; F2] → una sola cita APA «(A, 2020; B, 2021)». Si el autor ya está nombrado
    // justo antes («Searle [F2] sostiene»), queda como cita narrativa: «Searle (1980) sostiene».
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const citar = (txt) => String(txt || "").replace(/((?:[^\s[]+\s+){0,3})\[F\d+(?:\s*[\];,]+\s*\[?F\d+)*\]?/g, (todo, previa) => {
      const ks = Array.from(new Set((todo.slice(previa.length).match(/F(\d+)/g) || []).map(x => +x.slice(1) - 1))).filter(k => fuentes[k]);
      if (!ks.length) return previa.replace(/\s+$/, "");
      const ap = fuentes[ks[0]].autores[0];
      if (ks.length === 1 && ap && new RegExp(esc(ap) + "(\\s+et al\\.?|\\s+y\\s+\\S+)?$").test(previa.trim())) return `${previa}(${fuentes[ks[0]].anio})`;
      return previa + "(" + ks.map(k => fuentes[k].cita.replace(/^\(|\)$/g, "")).sort((a, b) => a.localeCompare(b, "es")).join("; ") + ")";
    }).replace(/\s+([.,;])/g, "$1").replace(/\(\s*\)/g, "");
    const usadas = new Set(); [m.antecedentes, m.marco_teorico].forEach(t => (String(t).match(/\[F[^\]]*\]?/g) || []).forEach(x => (x.match(/F(\d+)/g) || []).forEach(y => usadas.add(+y.slice(1) - 1))));
    const refs = Array.from(usadas).map(k => fuentes[k]).filter(Boolean).sort((a, b) => a.texto.localeCompare(b.texto, "es"));
    await Word.run(async (ctx) => {
      const body = ctx.document.body;
      const ps = body.paragraphs; ps.load("items/text"); await ctx.sync();
      if (ps.items.filter(p => p.text.trim()).length <= 1) body.clear();
      const H1 = (t) => { const p = body.insertParagraph(t, "End"); p.styleBuiltIn = "Heading1"; };
      const H2 = (t) => { const p = body.insertParagraph(t, "End"); p.styleBuiltIn = "Heading2"; };
      const P = (t) => String(t || "").split(/\n+/).map(x => x.trim()).filter(Boolean).forEach(x => { const p = body.insertParagraph(x, "End"); p.styleBuiltIn = "Normal"; });
      const tabla = (filas) => { try { const p = body.insertParagraph("", "End"); p.insertTable(filas.length, filas[0].length, "After", filas); } catch (x) { filas.forEach(f => P(f.join(" · "))); } };
      const t = body.insertParagraph(d.titulo, "End"); t.styleBuiltIn = "Title";
      P(`${n.producto} · ${n.nombre} · Enfoque ${e.nombre.toLowerCase()}`);
      H1("Planteamiento del problema"); P(d.problema);
      H2("Pregunta de investigación"); P(d.pregunta);
      H1("Objetivos"); H2("Objetivo general"); P(d.objetivo_general);
      H2("Objetivos específicos"); d.objetivos_especificos.forEach((o, k) => P(`${k + 1}. ${o}`));
      H1("Justificación"); P(d.justificacion);
      if (d.hipotesis) { H1(e.id === "teorico" ? "Tesis y supuestos de partida" : e.id === "cualitativo" ? "Supuestos y preguntas orientadoras" : "Hipótesis"); P(d.hipotesis); }
      H1("Marco referencial"); H2("Antecedentes"); P(citar(m.antecedentes)); H2("Marco teórico"); P(citar(m.marco_teorico));
      if ((m.marco_conceptual || []).length) { H2("Marco conceptual"); m.marco_conceptual.forEach(x => P(`${x.concepto}: ${x.definicion}`)); }
      H1(n.id === "doctorado" || n.id === "posdoctorado" ? "Diseño metodológico" : "Metodología");
      (met.apartados || []).forEach(a => { H2(a.titulo); P(a.texto); });
      H1("Resultados esperados"); (plan.resultados_esperados || []).forEach(r => P("• " + r));
      H1("Cronograma"); tabla([["Actividad", "Mes de inicio", "Mes de fin"]].concat((plan.cronograma || []).map(x => [x.actividad, String(x.inicio_mes), String(x.fin_mes)])));
      H1("Presupuesto"); const total = (plan.presupuesto || []).reduce((a, x) => a + (x.valor_cop || 0), 0);
      tabla([["Rubro", "Descripción", "Valor (COP)"]].concat((plan.presupuesto || []).map(x => [x.rubro, x.descripcion, "$" + (x.valor_cop || 0).toLocaleString("es-CO")])).concat([["Total", "", "$" + total.toLocaleString("es-CO")]]));
      H1("Referencias");
      const cursivas = [];
      if (refs.length) refs.forEach(r => { const p = body.insertParagraph(r.texto, "End"); p.styleBuiltIn = "Normal"; try { p.leftIndent = 36; p.firstLineIndent = -36; } catch (x) { /* opcional */ } if (r.cursiva) cursivas.push([p, r.cursiva]); });
      // APA 7: revista y volumen (o título del libro) en cursiva.
      const hall = cursivas.map(([p, t]) => { const s = p.search(t.slice(0, 250), { matchCase: true }); s.load("items"); return s; });
      if (hall.length) { await ctx.sync(); hall.forEach(s => { if (s.items.length) s.items[0].font.italic = true; }); }
      else P("[Completar con fuentes: di «busca literatura sobre…» y «cita el uno».]");
      await ctx.sync();
    });
    registrar("Proyecto creado desde cero (Pro)", d.titulo, "modelo");
    if (!esPro()) Config.set({ pruebaProUsada: 1 });
    // Fase 6 · Verificar y Fase 7 · Declarar
    pinta(5, "Verificando coherencia y referencias…");
    try { await Inv.coherencia(); } catch (x) { /* el documento ya está escrito */ }
    try { await Inv.declaracion(); } catch (x) { /* opcional */ }
    const q = proyecto(); q.hechos = Object.assign({}, q.hechos, { tema: true }); guardar(q);
    const { el: E } = H();
    const c = E("div", "inv-cuerpo asesor pro"); progresoFases(c, 7);
    c.appendChild(E("p", "guia-resumen", `Tu proyecto «${d.titulo}» está en el documento: planteamiento, objetivos, ${refs.length} fuentes reales citadas en APA 7, metodología, cronograma y presupuesto. También revisé la coherencia y agregué la declaración de uso de IA.`));
    const pasos = E("ol", "guia-puntos");
    ["Lee todo y reescribe con tu voz lo que no te represente.", "Completa los [datos por confirmar] con información real de tu contexto.", "Lee las fuentes citadas antes de entregar.", "Pide una «sesión de asesoría» para el siguiente paso."].forEach(x => pasos.appendChild(E("li", "", x)));
    c.appendChild(pasos);
    const acc = E("div", "inv-acciones");
    const b1 = E("button", "boton primario", "Sesión de asesoría"); b1.onclick = () => H().ejecutar(sesion);
    const b2 = E("button", "boton secundario", "Mi proyecto"); b2.onclick = () => miProyecto();
    acc.append(b1, b2); c.appendChild(acc);
    tarjeta("¡Proyecto creado!", c);
    ui.hablar("Listo. Tu proyecto está en el documento. Léelo, ajústalo con tu voz y completa los datos por confirmar.");
    borrador = null;
  }

  /* ---------- Comandos de voz ---------- */
  function comando(n, original) {
    const tarea = (fn) => async () => { H().ui.ocupar(true, "Asesor…"); try { await fn(); } catch (e) { H().ui.mostrarError(e); } finally { H().ui.ocupar(false); } };
    if (/^((abre|muestra|ver|como va) )?(mi proyecto|el proyecto|mi avance|mi cronograma|cronograma|como voy|en que etapa voy)$/.test(n)) return tarea(miProyecto);
    if (/^((haz|hagamos|quiero|dame|inicia)( una)? )?(sesion de asesoria|asesoria|revisa mi avance|revision de avance)$/.test(n)) return tarea(sesion);
    if (/^(bitacora|mis sesiones|historial de asesorias)$/.test(n)) return () => bitacora();
    const m = String(original || n).match(/^\s*(?:crea|crear|creame|haz|hazme|arma|armame|construye|genera)\s+(?:mi |un |el )?proyecto(?: completo)?(?: de investigaci[oó]n)?(?: desde cero)?(?:\s+(?:sobre|de|acerca de|para)\s+(.+))?$/i);
    if (m && /proyecto/.test(n)) return () => nuevoProyecto((m[1] || "").replace(/[.?!]+$/, ""));
    return null;
  }

  return { proyecto, miProyecto, sesion, bitacora, nuevoProyecto, comando, esPro, codigoValido, avance, ETAPAS };
})();
