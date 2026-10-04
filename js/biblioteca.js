/* Romus · Biblioteca del proyecto y lectura de fuentes.
   - Biblioteca por documento: obras guardadas desde OpenAlex, el generador APA o importadas
     de Zotero/Mendeley (RIS o BibTeX).
   - Ficha de lectura de cada fuente (con su texto o su resumen) y matriz de antecedentes.
   - Síntesis del estado del arte usando solo las fuentes de la biblioteca.
   - Afirmaciones sin respaldo: frases que necesitan cita y no la tienen.
   - Cita–fuente: ¿la fuente citada dice lo que el texto le atribuye? */
window.Biblio = (function () {
  const H = () => Inv._h;
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const clave = () => "romus.biblio." + H().claveDoc();
  function todas() { try { return JSON.parse(localStorage.getItem(clave()) || "[]"); } catch (e) { return []; } }
  function guardarTodas(xs) { try { localStorage.setItem(clave(), JSON.stringify(xs)); } catch (e) { /* sin almacenamiento */ } }
  const id = () => "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function agregar(e) {
    const xs = todas();
    if (xs.some(x => (e.doi && x.doi && norm(x.doi) === norm(e.doi)) || norm(x.titulo).slice(0, 60) === norm(e.titulo).slice(0, 60))) return false;
    xs.push(Object.assign({ id: id(), creada: new Date().toISOString() }, e));
    guardarTodas(xs); return true;
  }
  function guardarObra(w) { return agregar({ texto: w.texto, cita: w.cita, cursivas: w.fuente ? [w.fuente] : [], titulo: w.titulo, autores: w.autores || [], anio: String(w.anio || ""), fuente: w.fuente || "", doi: w.doi || "", resumen: w.resumen || "", origen: "OpenAlex" }); }
  function guardarRef(r) { return agregar(Object.assign({ origen: "APA" }, r)); }

  /* ---------- Importar RIS y BibTeX ---------- */
  const TIPO_RIS = { JOUR: "articulo", JFULL: "articulo", MGZN: "articulo", BOOK: "libro", EBOOK: "libro", CHAP: "capitulo", ECHAP: "capitulo", THES: "tesis", ELEC: "web", WEB: "web", RPRT: "informe", GOVDOC: "informe", CONF: "ponencia", CPAPER: "ponencia", NEWS: "periodico", VIDEO: "video" };
  const TIPO_BIB = { article: "articulo", book: "libro", incollection: "capitulo", inbook: "capitulo", phdthesis: "tesis", mastersthesis: "tesis", thesis: "tesis", online: "web", misc: "web", techreport: "informe", report: "informe", inproceedings: "ponencia", conference: "ponencia" };
  function aRegistro(tipo, f) {
    const datos = {
      autores: (f.autores || []).join("\n"), anio: f.anio, titulo: f.titulo, revista: f.revista, volumen: f.volumen, numero: f.numero,
      paginas: f.pagIni ? f.pagIni + (f.pagFin ? "-" + f.pagFin : "") : f.paginas, doi: f.doi, editorial: f.editorial, url: f.url,
      libro: f.libro, editores: f.editores, universidad: f.universidad, grado: f.grado || (tipo === "tesis" ? "Tesis" : ""), sitio: f.sitio, fecha: f.anio, evento: f.revista, edicion: f.edicion
    };
    const r = window.APA ? APA.construir(tipo, datos) : { texto: f.titulo, cita: "", cursivas: [] };
    return { texto: r.texto, cita: r.cita, cursivas: r.cursivas, titulo: f.titulo || "", autores: (f.autores || []).map(a => a.split(",")[0].trim()), anio: f.anio || "", fuente: f.revista || f.editorial || "", doi: f.doi || "", resumen: f.resumen || "", tipo };
  }
  function parsearRIS(texto) {
    const out = []; let f = null, tipo = "articulo";
    String(texto).split(/\r?\n/).forEach(l => {
      const m = l.match(/^([A-Z][A-Z0-9])\s{1,2}-\s?(.*)$/); if (!m) return;
      const [, k, v] = m; const val = v.trim();
      if (k === "TY") { f = { autores: [] }; tipo = TIPO_RIS[val] || "articulo"; return; }
      if (!f) return;
      if (k === "ER") { if (f.titulo) out.push(aRegistro(tipo, f)); f = null; return; }
      if (/^(AU|A1)$/.test(k)) f.autores.push(val);
      else if (/^(A2|ED)$/.test(k)) f.editores = (f.editores ? f.editores + " y " : "") + val.split(",").reverse().join(" ").trim();
      else if (/^(PY|Y1|DA)$/.test(k)) f.anio = f.anio || (val.match(/\d{4}/) || [""])[0];
      else if (/^(TI|T1)$/.test(k)) f.titulo = val;
      else if (/^(T2|JO|JF|JA)$/.test(k)) { if (tipo === "capitulo") f.libro = val; else f.revista = f.revista || val; }
      else if (k === "VL") f.volumen = val; else if (k === "IS") f.numero = val;
      else if (k === "SP") f.pagIni = val; else if (k === "EP") f.pagFin = val;
      else if (k === "DO") f.doi = val; else if (k === "UR") f.url = f.url || val;
      else if (k === "PB") { f.editorial = val; if (tipo === "tesis") f.universidad = val; }
      else if (k === "AB") f.resumen = val; else if (k === "ET") f.edicion = val;
      else if (k === "M3" && tipo === "tesis") f.grado = val;
    });
    return out;
  }
  function parsearBibTeX(texto) {
    const out = []; const re = /@(\w+)\s*\{\s*[^,]*,([\s\S]*?)\n\s*\}/g; let m;
    while ((m = re.exec(texto))) {
      const tipo = TIPO_BIB[m[1].toLowerCase()] || "articulo";
      const campos = {}; const reC = /(\w+)\s*=\s*(\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|(\d+))/g; let c;
      while ((c = reC.exec(m[2]))) campos[c[1].toLowerCase()] = (c[3] != null ? c[3] : c[4] != null ? c[4] : c[5]).replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
      const autores = (campos.author || "").split(/\s+and\s+/i).map(a => a.includes(",") ? a.trim() : a.trim().split(" ").slice(-1)[0] + ", " + a.trim().split(" ").slice(0, -1).join(" ")).filter(a => a.replace(/[, ]/g, ""));
      const pags = (campos.pages || "").split(/-+/);
      out.push(aRegistro(tipo, { autores, anio: (campos.year || campos.date || "").match(/\d{4}/) ? (campos.year || campos.date).match(/\d{4}/)[0] : "", titulo: campos.title, revista: campos.journal || campos.journaltitle || campos.booktitle, volumen: campos.volume, numero: campos.number || campos.issue, pagIni: pags[0], pagFin: pags[1], doi: campos.doi, url: campos.url, editorial: campos.publisher || campos.institution, universidad: campos.school || campos.institution, libro: campos.booktitle, edicion: campos.edition, resumen: campos.abstract, grado: m[1].toLowerCase() === "phdthesis" ? "Tesis doctoral" : m[1].toLowerCase() === "mastersthesis" ? "Tesis de maestría" : "" }));
    }
    return out;
  }
  function importar(texto) {
    const xs = /@\w+\s*\{/.test(texto) ? parsearBibTeX(texto) : parsearRIS(texto);
    let n = 0; xs.forEach(x => { if (agregar(Object.assign({ origen: "Importada" }, x))) n++; });
    return { leidas: xs.length, nuevas: n };
  }

  /* ---------- Tarjeta de la biblioteca ---------- */
  function abrir() {
    const { el, tarjeta } = H();
    const xs = todas();
    const c = el("div", "inv-cuerpo biblio");
    c.appendChild(el("p", "guia-resumen", xs.length ? `Tienes ${xs.length} fuentes en la biblioteca de este proyecto. Haz la ficha de lectura de cada una: con las fichas armo tu matriz de antecedentes.` : "Tu biblioteca está vacía. Busca literatura y pulsa «Guardar», importa tus fuentes de Zotero o Mendeley, o usa el generador de referencias."));
    // Buscar
    const fb = el("div", "inv-acciones");
    const iB = el("input", "ajuste"); iB.placeholder = "Buscar literatura sobre…"; iB.style.flex = "1";
    const lEs = el("label", "interruptor pequeno"); const cEs = el("input"); cEs.type = "checkbox"; lEs.append(cEs, el("span", "riel"), el("span", "", "Solo en español"));
    const bB = el("button", "boton secundario", "Buscar"); bB.onclick = () => { if (iB.value.trim()) H().ejecutar(() => Inv.literatura(iB.value.trim(), { espanol: cEs.checked })); };
    iB.onkeydown = (e) => { if (e.key === "Enter") bB.onclick(); };
    fb.append(iB, bB); c.append(fb, lEs);
    // Lista
    if (xs.length) {
      const fich = xs.filter(x => x.ficha).length;
      c.appendChild(el("div", "inv-sub", `Fuentes (${fich} de ${xs.length} con ficha)`));
      xs.forEach(x => {
        const b = el("div", "prioridad");
        b.appendChild(el("b", "", x.titulo || x.texto.slice(0, 80)));
        b.appendChild(el("small", "", `${(x.autores || []).slice(0, 3).join(", ")}${(x.autores || []).length > 3 ? " et al." : ""} · ${x.anio || "s. f."}${x.fuente ? " · " + x.fuente : ""} · ${x.origen || ""}${x.ficha ? " · ✓ ficha" : ""}`));
        const a = el("div", "inv-acciones");
        const bC = el("button", "enlace-sutil", "Citar"); bC.onclick = () => H().ejecutar(async () => { await APA.insertarReferencia(x, true); H().ui.confirmar(`Cité ${x.cita}.`); });
        const bF = el("button", "enlace-sutil", x.ficha ? "Ver ficha" : "Hacer ficha"); bF.onclick = () => x.ficha ? verFicha(x) : pedirFicha(x);
        const bQ = el("button", "enlace-sutil", "Quitar"); bQ.onclick = () => { guardarTodas(todas().filter(y => y.id !== x.id)); abrir(); };
        a.append(bC, bF, bQ); b.appendChild(a); c.appendChild(b);
      });
    }
    const acc = el("div", "inv-acciones");
    const bI = el("button", "boton secundario", "Importar (Zotero, Mendeley)"); bI.onclick = () => vistaImportar();
    acc.appendChild(bI);
    if (xs.some(x => x.ficha)) {
      const bM = el("button", "boton primario", "Matriz de antecedentes"); bM.onclick = () => matriz();
      const bS = el("button", "boton secundario", "Organizar el estado del arte"); bS.onclick = () => H().ejecutar(() => estadoArte());
      acc.append(bM, bS);
    }
    c.appendChild(acc);
    tarjeta("Mi biblioteca", c);
  }
  function vistaImportar() {
    const { el, tarjeta } = H();
    const c = el("div", "inv-cuerpo");
    c.appendChild(el("p", "guia-resumen", "En Zotero: selecciona tus fuentes → clic derecho → Exportar elementos → formato RIS o BibTeX. En Mendeley: Archivo → Exportar → RIS o BibTeX. Abre el archivo con el Bloc de notas, copia todo y pégalo aquí."));
    const t = el("textarea", "ajuste"); t.rows = 8; t.placeholder = "TY  - JOUR\nAU  - Pérez, Ana\nTI  - …\nER  -";
    const l = el("label", "campo-pro"); l.append(el("span", "", "Contenido RIS o BibTeX"), t); c.appendChild(l);
    const fi = el("input"); fi.type = "file"; fi.accept = ".ris,.bib,.txt"; fi.onchange = () => { const f = fi.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { t.value = r.result; }; r.readAsText(f); };
    c.appendChild(fi);
    const b = el("button", "boton primario", "Importar");
    b.onclick = () => { const r = importar(t.value); H().ui.confirmar(`Leí ${r.leidas} referencias; agregué ${r.nuevas} nuevas a tu biblioteca.`); abrir(); };
    c.appendChild(b);
    tarjeta("Importar referencias", c);
  }

  /* ---------- Ficha de lectura ---------- */
  function pedirFicha(x) {
    const { el, tarjeta } = H();
    const c = el("div", "inv-cuerpo");
    c.appendChild(el("p", "guia-resumen", "Pega el texto del artículo (o al menos la introducción, el método, los resultados y las conclusiones). Si solo usas el resumen, la ficha será más pobre: lo ideal es leer la fuente completa."));
    c.appendChild(el("small", "inv-nota", x.texto));
    const t = el("textarea", "ajuste"); t.rows = 8; t.value = ""; t.placeholder = "Pega aquí el texto del artículo…";
    const l = el("label", "campo-pro"); l.append(el("span", "", "Texto de la fuente"), t); c.appendChild(l);
    const acc = el("div", "inv-acciones");
    const b = el("button", "boton primario", "Hacer la ficha"); b.onclick = () => { if (!t.value.trim() && !x.resumen) { t.focus(); return; } H().ejecutar(() => ficha(x, t.value.trim())); };
    acc.appendChild(b);
    if (x.resumen) { const b2 = el("button", "boton secundario", "Usar solo el resumen"); b2.onclick = () => H().ejecutar(() => ficha(x, "")); acc.appendChild(b2); }
    c.appendChild(acc);
    tarjeta("Ficha de lectura", c);
  }
  async function ficha(x, texto, signal) {
    if (Config.faltaClave()) throw new Error("Para hacer la ficha necesito tu IA conectada (Ajustes).");
    const { pedirHerramienta, documentoNumerado } = H();
    const fuente = texto || x.resumen || "";
    if (!fuente) throw new Error("Pega el texto de la fuente.");
    let proyecto = "";
    try { const d = await documentoNumerado(); proyecto = d.parrafos.filter(p => /objetivo|pregunta|problema/i.test(p.texto)).map(p => p.texto).join("\n").slice(0, 3000); } catch (e) { /* sin documento */ }
    const f = await pedirHerramienta("ficha_lectura", "Ficha de lectura de una fuente académica.",
      { type: "object", properties: {
        objetivo: { type: "string" }, contexto: { type: "string", description: "País, institución o nivel educativo donde se hizo" },
        metodo: { type: "string", description: "Enfoque, diseño y técnicas" }, participantes: { type: "string" },
        hallazgos: { type: "string", description: "Hallazgos principales, con datos si los hay" }, conclusiones: { type: "string" },
        limitaciones: { type: "string", description: "Limitaciones declaradas o evidentes; «no las declara» si no hay" },
        aporte: { type: "string", description: "Cómo sirve a la investigación del usuario (usa sus objetivos)" },
        cita_textual: { type: "string", description: "Una frase LITERAL importante del texto, copiada exactamente; vacío si solo hay resumen" },
        pagina: { type: "string", description: "Página de la cita textual si aparece en el texto; si no, vacío" }
      }, required: ["objetivo", "metodo", "hallazgos"] },
      `Haz la ficha de lectura de esta fuente. Usa SOLO lo que dice el texto; si un dato no aparece, escribe «no se indica».
Referencia: ${x.texto}
${proyecto ? "\nObjetivos del proyecto del usuario:\n" + proyecto : ""}

TEXTO DE LA FUENTE${texto ? "" : " (solo el resumen)"}:
${fuente.slice(0, 40000)}`, signal);
    if (f.cita_textual && !norm(fuente).includes(norm(f.cita_textual).replace(/[«»"“”]/g, "").slice(0, 120))) { f.cita_textual = ""; f.pagina = ""; }
    f.base = texto ? "texto" : "resumen";
    const xs = todas(); const i = xs.findIndex(y => y.id === x.id);
    if (i >= 0) { xs[i].ficha = f; guardarTodas(xs); x = xs[i]; }
    H().registrar("Ficha de lectura", x.titulo, "modelo");
    verFicha(x);
  }
  const CAMPOS_FICHA = [["objetivo", "Objetivo"], ["contexto", "Contexto"], ["metodo", "Método"], ["participantes", "Participantes"], ["hallazgos", "Hallazgos"], ["conclusiones", "Conclusiones"], ["limitaciones", "Limitaciones"], ["aporte", "Aporte a mi investigación"]];
  function verFicha(x) {
    const { el, tarjeta, etiqueta } = H();
    const f = x.ficha || {};
    const c = el("div", "inv-cuerpo ficha");
    c.appendChild(etiqueta("modelo", f.base === "resumen" ? "hecha solo con el resumen" : "hecha con el texto que pegaste"));
    c.appendChild(el("p", "apa-ref", x.texto));
    const tb = el("table", "tabla-mini");
    CAMPOS_FICHA.forEach(([k, t]) => { if (!f[k]) return; const tr = el("tr"); tr.append(el("th", "", t), el("td", "", f[k])); tb.appendChild(tr); });
    c.appendChild(tb);
    if (f.cita_textual) { const q = el("div", "guia-caja ejemplo"); q.append(el("b", "", "Cita textual (verificada en el texto)"), el("span", "", `«${f.cita_textual}» ${x.cita.replace(/\)$/, f.pagina ? `, p. ${f.pagina})` : ")")}`)); c.appendChild(q); }
    const acc = el("div", "inv-acciones");
    const b1 = el("button", "boton secundario", "Volver a la biblioteca"); b1.onclick = () => abrir();
    acc.appendChild(b1); c.appendChild(acc);
    c.appendChild(Docx.botones(() => [{ t: "titulo", texto: "Ficha de lectura" }, { t: "ref", texto: x.texto }, { t: "tabla", filas: [["Campo", "Contenido"]].concat(CAMPOS_FICHA.filter(([k]) => f[k]).map(([k, t]) => [t, f[k]])), anchos: [2500, 6500] }].concat(f.cita_textual ? [{ t: "h2", texto: "Cita textual" }, { texto: `«${f.cita_textual}»${f.pagina ? " (p. " + f.pagina + ")" : ""}` }] : []), "ficha-de-lectura.docx", { tam: 11 }, "Abrir ficha en Word"));
    tarjeta("Ficha de lectura", c);
  }

  /* ---------- Matriz de antecedentes y estado del arte ---------- */
  function filasMatriz() {
    const xs = todas().filter(x => x.ficha);
    return [["Autor(es) y año", "Título", "Contexto", "Objetivo", "Método", "Hallazgos", "Aporte a la investigación"]].concat(xs.map(x => [x.cita.replace(/^\(|\)$/g, ""), x.titulo, x.ficha.contexto || "", x.ficha.objetivo || "", x.ficha.metodo || "", x.ficha.hallazgos || "", x.ficha.aporte || ""]));
  }
  function matriz() {
    const { el, tarjeta, etiqueta } = H();
    const filas = filasMatriz();
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("modelo", "construida con tus fichas de lectura"));
    c.appendChild(el("p", "guia-resumen", `Matriz con ${filas.length - 1} antecedentes. Muchas universidades la piden como anexo; también te sirve para escribir los antecedentes.`));
    c.appendChild(Docx.botones(() => [{ t: "titulo", texto: "Matriz de antecedentes" }, { t: "tabla", filas, anchos: [1500, 2200, 1300, 2000, 2000, 2400, 1600], tam: 9 }], "matriz-de-antecedentes.docx", { tam: 10, horizontal: true }, "Abrir matriz en Word"));
    const b = el("button", "boton secundario", "Insertar en el documento");
    b.onclick = () => H().ejecutar(async () => {
      await Word.run(async (ctx) => { const ps = ctx.document.getSelection().paragraphs; ps.load("items"); await ctx.sync(); let ref = ps.items[ps.items.length - 1]; ref = ref.insertParagraph("Matriz de antecedentes", "After"); ref.font.bold = true; try { ref.insertTable(filas.length, filas[0].length, "After", filas); } catch (e) { filas.forEach(f => { ref = ref.insertParagraph(f.join(" · "), "After"); }); } await ctx.sync(); });
      H().ui.confirmar("Agregué la matriz después del cursor.");
    });
    c.appendChild(b);
    tarjeta("Matriz de antecedentes", c);
  }
  async function estadoArte(signal) {
    if (Config.faltaClave()) throw new Error("Necesito tu IA conectada (Ajustes).");
    const xs = todas().filter(x => x.ficha);
    if (xs.length < 2) throw new Error("Haz al menos dos fichas de lectura antes de organizar el estado del arte.");
    const { pedirHerramienta, el, tarjeta, etiqueta } = H();
    const tutor = (Config.get().modoAyuda || "tutor") === "tutor";
    const d = await pedirHerramienta("estado_arte", "Organización del estado del arte con las fichas de lectura.",
      { type: "object", properties: {
        temas: { type: "array", items: { type: "object", properties: { tema: { type: "string" }, fuentes: { type: "array", items: { type: "integer" }, description: "Números de las fuentes que tratan este tema" }, sintesis: { type: "string", description: tutor ? "Qué tienen en común y en qué difieren, como guía para que el estudiante redacte (2 o 3 frases)" : "Párrafo de síntesis en APA 7 que cite SOLO con las citas dadas, comparando las fuentes" } }, required: ["tema", "fuentes", "sintesis"] } },
        vacio: { type: "string", description: "El vacío de conocimiento que dejan estas fuentes y que justifica la investigación" },
        preguntas: { type: "array", items: { type: "string" }, description: "Preguntas para que el estudiante profundice" }
      }, required: ["temas", "vacio"] },
      `Organiza estas fuentes por temas (no una por una), señala acuerdos, diferencias y el vacío de conocimiento. ${tutor ? "MODO TUTOR: no redactes el texto final; da orientaciones." : "Redacta párrafos de síntesis usando SOLO estas citas exactas."}

${xs.map((x, k) => `[${k + 1}] Cita: ${x.cita}\nHallazgos: ${x.ficha.hallazgos}\nMétodo: ${x.ficha.metodo}\nContexto: ${x.ficha.contexto || ""}`).join("\n\n")}`, signal);
    // Verificar que solo cite fuentes de la biblioteca
    const citasValidas = xs.map(x => x.cita);
    (d.temas || []).forEach(t => {
      t.fuentes = (t.fuentes || []).filter(k => xs[k - 1]);
      const extras = (String(t.sintesis).match(/\([^()]*?(?:19|20)\d{2}[a-z]?\)/g) || []).filter(c => !citasValidas.some(v => norm(c).includes(norm(v).replace(/[()]/g, "").split(",")[0])));
      t.citasDudosas = extras;
    });
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("modelo", "solo con las fuentes de tu biblioteca"));
    (d.temas || []).forEach(t => {
      const b = el("div", "prioridad");
      b.appendChild(el("b", "", t.tema));
      b.appendChild(el("small", "", t.fuentes.map(k => xs[k - 1].cita).join(" · ")));
      b.appendChild(el("span", "", t.sintesis));
      if (t.citasDudosas.length) b.appendChild(el("small", "", "⚠ Cita que no está en tu biblioteca: " + t.citasDudosas.join(", ")));
      c.appendChild(b);
    });
    const v = el("div", "guia-sencillo"); v.append(el("b", "", "El vacío que justifica tu investigación"), el("span", "", d.vacio)); c.appendChild(v);
    if ((d.preguntas || []).length) { c.appendChild(el("div", "inv-sub", "Para profundizar")); const ul = el("ul", "guia-puntos"); d.preguntas.forEach(q => ul.appendChild(el("li", "", q))); c.appendChild(ul); }
    if (!tutor) {
      const b = el("button", "boton primario", "Insertar borrador después del cursor");
      b.onclick = () => H().ejecutar(async () => { await Word.run(async (ctx) => { const ps = ctx.document.getSelection().paragraphs; ps.load("items"); await ctx.sync(); let ref = ps.items[ps.items.length - 1]; (d.temas || []).forEach(t => { ref = ref.insertParagraph(t.tema, "After"); ref.styleBuiltIn = "Heading3"; ref = ref.insertParagraph(t.sintesis, "After"); ref.styleBuiltIn = "Normal"; }); ref = ref.insertParagraph(d.vacio, "After"); ref.styleBuiltIn = "Normal"; await ctx.sync(); }); H().ui.confirmar("Agregué el borrador. Reescríbelo con tu voz."); });
      c.appendChild(b);
    }
    tarjeta("Estado del arte", c);
    H().registrar("Estado del arte", `${(d.temas || []).length} temas`, "modelo");
    return d;
  }

  /* ---------- Afirmaciones sin respaldo ---------- */
  const RE_CITA = /\((?:[^()]*?(?:19|20)\d{2}[a-z]?|[^()]*?s\. ?f\.)[^()]*\)|[A-ZÁÉÍÓÚÑ][\wáéíóúñ'-]+(?: et al\.)? \((?:19|20)\d{2}/;
  const RE_ALERTA = /\b(\d+(?:[.,]\d+)?\s?%|seg[uú]n (estudios|investigaciones|expertos|datos)|(diversos|varios|numerosos|muchos) (estudios|autores|investigadores)|est[aá] (demostrado|comprobado)|se ha demostrado|la mayor[ií]a de (los|las)|la literatura (muestra|indica|señala|coincide|reporta|demuestra|sugiere|evidencia)|las investigaciones (muestran|indican)|cifras?|estad[ií]sticas?)\b/i;
  function oraciones(t) { return String(t).match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []; }
  async function sinRespaldo(signal) {
    const { documentoNumerado, pedirHerramienta, el, tarjeta, etiqueta, verificar, irA, registrar } = H();
    const ui = H().ui;
    const doc = await documentoNumerado();
    const { ini, fin } = window.Jurado ? Jurado._extraerReferencias(doc.parrafos) : { ini: -1, fin: -1 };
    const cuerpo = doc.parrafos.filter(p => p.texto.trim().length > 40 && !Doc.esTitulo(p.estilo) && !(ini >= 0 && p.i >= ini && p.i <= fin));
    // 1) Reglas: datos o generalizaciones sin cita en la misma oración
    const hall = [];
    cuerpo.forEach(p => oraciones(p.texto).forEach(o => { if (RE_ALERTA.test(o.replace(/\[[^\]]*\]/g, "")) && !RE_CITA.test(o) && !/\b(en este estudio|los resultados de (este|la presente)|se encontr[oó] que el \d+)/i.test(o)) hall.push({ parrafo: p.i, frase: o.trim(), motivo: /%|\d/.test(o) ? "Dato o cifra sin fuente" : "Generalización sin fuente", origen: "reglas" }); }));
    // 2) IA: afirmaciones teóricas o causales sin respaldo
    if (!Config.faltaClave()) {
      try {
        const d = await pedirHerramienta("sin_respaldo", "Afirmaciones que necesitan cita y no la tienen.",
          { type: "object", properties: { afirmaciones: { type: "array", items: { type: "object", properties: {
            parrafo: { type: "integer" }, frase: { type: "string", description: "Fragmento LITERAL del documento (máx. 30 palabras)" },
            motivo: { type: "string", description: "Por qué necesita fuente (dato, definición, teoría atribuible, afirmación causal, generalización)" },
            buscar: { type: "string", description: "Palabras clave para buscar una fuente que la respalde" }
          }, required: ["parrafo", "frase", "motivo"] } } }, required: ["afirmaciones"] },
          `Marca las afirmaciones del documento que necesitan una cita académica y no la tienen: datos, definiciones de autores, teorías, afirmaciones causales o generalizaciones. NO marques: opiniones del autor presentadas como tales, descripciones de su propio estudio, objetivos, preguntas ni frases que ya tienen cita. Máximo 15.

DOCUMENTO:
${doc.texto}`, signal);
        (d.afirmaciones || []).forEach(a => {
          const i = verificar(a.frase, doc.parrafos);
          if (i < 0 || RE_CITA.test(a.frase)) return;
          if (hall.some(h => h.parrafo === i && norm(h.frase).includes(norm(a.frase).slice(0, 40)))) return;
          hall.push({ parrafo: i, frase: a.frase, motivo: a.motivo, buscar: a.buscar, origen: "modelo" });
        });
      } catch (e) { /* quedan las reglas */ }
    }
    registrar("Afirmaciones sin respaldo", `${hall.length} frases`, hall.some(h => h.origen === "modelo") ? "modelo" : "reglas");
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta(hall.some(h => h.origen === "modelo") ? "modelo" : "reglas", "reglas + IA, verificado en tu documento"));
    c.appendChild(el("p", "guia-resumen", hall.length ? `Encontré ${hall.length} afirmaciones que el jurado podría preguntar «¿según quién?». Agrega la cita o reformúlalas como tuyas.` : "No encontré afirmaciones sin respaldo. ¡Bien!"));
    hall.slice(0, 30).forEach(h => {
      const b = el("div", "apa-hall");
      b.appendChild(el("span", "", h.motivo));
      b.appendChild(el("code", "", h.frase.length > 110 ? h.frase.slice(0, 107) + "…" : h.frase));
      const a = el("div", "inv-acciones");
      const bI = el("button", "enlace-sutil", "Ir"); bI.onclick = () => irA(h.parrafo);
      const bB = el("button", "enlace-sutil", "Buscar fuente"); bB.onclick = () => H().ejecutar(() => Inv.literatura(h.buscar || h.frase.split(/\s+/).filter(w => w.length > 4).slice(0, 6).join(" ")));
      a.append(bI, bB); b.appendChild(a); c.appendChild(b);
    });
    if (hall.length) { const b = el("button", "boton secundario", "Poner comentarios en el documento"); b.onclick = () => H().ejecutar(async () => { const x = await Doc.comentar(hall.map(h => ({ parrafo: h.parrafo, fragmento: h.frase.slice(0, 200), comentario: "¿Según quién? " + h.motivo + ": agrega la cita (Autor, año) o reformúlalo como tu interpretación." }))); ui.confirmar(`${x.texto}`); }); c.appendChild(b); }
    const b2 = el("button", "boton secundario", "¿Mis citas dicen lo que les atribuyo?"); b2.onclick = () => H().ejecutar(citaFuente); c.appendChild(b2);
    tarjeta("Afirmaciones sin respaldo", c);
    ui.hablar(hall.length ? `Encontré ${hall.length} afirmaciones que necesitan una cita.` : "No encontré afirmaciones sin respaldo.");
    return hall;
  }

  /* ---------- Cita–fuente ---------- */
  async function citaFuente(signal) {
    if (Config.faltaClave()) throw new Error("Necesito tu IA conectada (Ajustes).");
    const { pedirHerramienta, el, tarjeta, etiqueta, irA, registrar } = H();
    const ps = await Doc.leerParrafos();
    const { refs, ini, fin } = Jurado._extraerReferencias(ps);
    if (!refs.length) throw new Error("No encontré la lista de «Referencias».");
    const citas = Jurado._extraerCitas(ps, ini, fin);
    const prim = (t) => norm(String(t).split(/,| y | & | et al/)[0]).split(" ").pop();
    const pares = [];
    const vistos = new Set();
    for (const ci of citas) {
      if (pares.length >= 24) break;
      const r = refs.find(x => norm(x.autor).includes(prim(ci.autor)) && String(x.anio).slice(0, 4) === String(ci.anio).slice(0, 4));
      if (!r || vistos.has(r.i + "|" + ci.parrafo)) continue; vistos.add(r.i + "|" + ci.parrafo);
      const p = ps.find(x => x.i === ci.parrafo);
      const frase = (oraciones(p.texto).find(o => o.includes(ci.texto.slice(0, 15))) || p.texto).trim();
      pares.push({ ci, r, frase });
    }
    // Resúmenes desde OpenAlex
    const biblio = todas();
    await Promise.all(pares.map(async (x) => {
      const b = biblio.find(y => norm(y.titulo).slice(0, 50) === norm(x.r.titulo).slice(0, 50));
      if (b && (b.ficha || b.resumen)) { x.resumen = b.ficha ? `${b.ficha.objetivo}. ${b.ficha.hallazgos}. ${b.ficha.conclusiones || ""}` : b.resumen; return; }
      try {
        const q = x.r.doi ? "https://api.openalex.org/works/https://doi.org/" + encodeURIComponent(x.r.doi) + "?select=display_name,abstract_inverted_index" : "https://api.openalex.org/works?per-page=1&select=display_name,abstract_inverted_index&search=" + encodeURIComponent(x.r.titulo.slice(0, 200));
        const j = await (await fetch(q)).json();
        const w = j.results ? j.results[0] : j;
        if (w && w.abstract_inverted_index) x.resumen = Inv._resumenDe(w.abstract_inverted_index);
      } catch (e) { /* sin resumen */ }
    }));
    const conRes = pares.filter(x => x.resumen);
    if (!conRes.length) throw new Error("No encontré los resúmenes de tus fuentes en OpenAlex. Haz sus fichas de lectura en «Mi biblioteca» y vuelve a intentarlo.");
    // De a 8 citas por consulta, para que la IA compare con calma cada una.
    const d = { veredictos: [] };
    for (let ini = 0; ini < conRes.length; ini += 8) {
      const lote = conRes.slice(ini, ini + 8);
      const r = await pedirHerramienta("cita_fuente", "¿La fuente respalda lo que el texto le atribuye?",
      { type: "object", properties: { veredictos: { type: "array", items: { type: "object", properties: {
        n: { type: "integer" }, veredicto: { type: "string", enum: ["respaldada", "parcial", "exagerada", "no_se_puede_saber", "contradice"] }, explicacion: { type: "string" }
      }, required: ["n", "veredicto", "explicacion"] } } }, required: ["veredictos"] },
      `Para cada par, decide si el resumen de la fuente respalda la afirmación del texto. Sé prudente: con solo el resumen, si no hay información suficiente, responde «no_se_puede_saber».

${lote.map((x, k) => `${k + 1}. AFIRMACIÓN: ${x.frase}\n   FUENTE: ${x.r.texto}\n   RESUMEN DE LA FUENTE: ${x.resumen.slice(0, 1500)}`).join("\n\n")}`, signal);
      (r.veredictos || []).forEach(v => d.veredictos.push(Object.assign({}, v, { n: v.n + ini })));
    }
    registrar("Cita–fuente", `${conRes.length} citas`, "modelo");
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("modelo", "comparado con el resumen de cada fuente"));
    const sinRes = pares.length - conRes.length;
    c.appendChild(el("p", "guia-resumen", `Comparé ${conRes.length} citas con el resumen de su fuente. Es una alerta, no un veredicto: confírmalo leyendo la fuente.${sinRes ? ` ${sinRes} no se pudieron comparar porque su fuente no tiene resumen: haz su ficha de lectura en «Mi biblioteca» (pegando el texto) y vuelve a intentarlo.` : ""}`));
    const ico = { respaldada: "✓ Respaldada", parcial: "≈ Parcial", exagerada: "⚠ Exagerada", no_se_puede_saber: "? No se puede saber con el resumen", contradice: "✗ Contradice" };
    (d.veredictos || []).forEach(v => {
      const x = conRes[v.n - 1]; if (!x) return;
      const b = el("div", "apa-hall");
      b.appendChild(el("b", "", ico[v.veredicto] || v.veredicto));
      b.appendChild(el("code", "", x.frase.length > 110 ? x.frase.slice(0, 107) + "…" : x.frase));
      b.appendChild(el("span", "", v.explicacion));
      const bI = el("button", "enlace-sutil", "Ir"); bI.onclick = () => irA(x.ci.parrafo); b.appendChild(bI);
      c.appendChild(b);
    });
    const malas = (d.veredictos || []).filter(v => ["parcial", "exagerada", "contradice"].includes(v.veredicto) && conRes[v.n - 1]);
    if (malas.length) {
      const bC = el("button", "boton secundario", "Poner comentarios en el documento");
      bC.onclick = () => H().ejecutar(async () => { await Doc.comentar(malas.map(v => { const x = conRes[v.n - 1]; return { parrafo: x.ci.parrafo, fragmento: x.frase.length <= 255 ? x.frase : "", comentario: `Romus · Fidelidad de la cita (${ico[v.veredicto]}): ${v.explicacion}` }; })); H().ui.confirmar(`Dejé ${malas.length} comentarios en el documento.`); });
      c.appendChild(bC);
    }
    tarjeta("¿Tus citas dicen lo que les atribuyes?", c);
    return d;
  }

  /* ================= Datos por confirmar ================= */
  // Romus deja marcas como «[dato por confirmar: cifras de uso de IA en Colombia]» donde falta evidencia.
  // Aquí se buscan fuentes para cada una y se reemplaza la marca por el dato que el investigador lee en la fuente.
  const RE_PENDIENTE = /\[[^\[\]]{0,240}?(por confirmar|por completar|completar con|pendiente|por definir)[^\[\]]{0,240}?\]/gi;
  async function porConfirmar() {
    const { el, tarjeta, etiqueta, irA, buscarOpenAlex, apa, registrar } = H();
    const ui = H().ui;
    const ps = await Doc.leerParrafos();
    const marcas = [];
    ps.forEach(p => { (p.texto.match(RE_PENDIENTE) || []).forEach(m => marcas.push({ parrafo: p.i, marca: m, frase: (oraciones(p.texto).find(o => o.includes(m.slice(0, 30))) || p.texto).trim() })); });
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("reglas", "marcas [por confirmar] de tu documento"));
    if (!marcas.length) {
      c.appendChild(el("p", "guia-resumen", "No hay datos por confirmar en tu documento. ¡Bien!"));
      tarjeta("Datos por confirmar", c); ui.hablar("No encontré datos por confirmar en tu documento."); return marcas;
    }
    c.appendChild(el("p", "guia-resumen", `Hay ${marcas.length} ${marcas.length === 1 ? "dato" : "datos"} por confirmar. Para cada uno busco fuentes reales; tú lees la fuente, escribes el dato y yo lo pongo en el texto con su cita y su referencia en APA 7.`));
    c.appendChild(el("p", "inv-nota", "Romus no inventa el dato: debe salir de la fuente que tú leíste o de tu institución."));
    marcas.slice(0, 15).forEach((m, k) => {
      const caja = el("div", "apa-hall pendiente");
      caja.appendChild(el("b", "", `Dato ${k + 1}`));
      caja.appendChild(el("code", "", m.frase.length > 160 ? m.frase.slice(0, 157) + "…" : m.frase));
      const dato = el("textarea", "ajuste"); dato.rows = 2; dato.placeholder = "Escribe aquí el dato tal como lo dice la fuente (ej.: el 62 % de los estudiantes usa IA cada semana)";
      caja.appendChild(dato);
      const lista = el("div", "pendiente-fuentes"); caja.appendChild(lista);
      let elegida = null;
      const acc = el("div", "inv-acciones");
      const bB = el("button", "enlace-sutil", "Buscar fuentes");
      bB.onclick = () => H().ejecutar(async () => {
        const tema = (m.marca.split(":").slice(1).join(":") || m.frase).replace(/[\[\]]/g, "").replace(/\b(dato|datos|cifras?) por confirmar\b/gi, "").trim();
        let obras = [];
        try { obras = await buscarOpenAlex(tema, true, true); } catch (e) { /* sigue */ }
        if (obras.length < 3) { try { (await buscarOpenAlex(tema, true)).forEach(w => { if (!obras.some(o => o.id === w.id)) obras.push(w); }); } catch (e) { /* sigue */ } }
        lista.innerHTML = "";
        if (!obras.length) { lista.appendChild(el("p", "inv-nota", "No encontré fuentes académicas. Prueba con datos de tu institución, el DANE, el Ministerio o un informe oficial, y cítalo con «Generar referencia».")); return; }
        obras.slice(0, 4).forEach(w => {
          const r = Object.assign(apa(w), { resumen: Inv._resumenDe(w.abstract_inverted_index) });
          const op = el("button", "verif-fila medio");
          op.append(el("b", "", `${r.cita} · ${r.titulo.slice(0, 90)}`), el("span", "", (r.resumen || "Sin resumen en OpenAlex").slice(0, 220) + (r.resumen && r.resumen.length > 220 ? "…" : "")));
          op.onclick = () => { elegida = r; lista.querySelectorAll(".verif-fila").forEach(x => x.classList.remove("ok")); op.classList.add("ok"); };
          lista.appendChild(op);
        });
        lista.appendChild(el("p", "inv-nota", "Toca una fuente para usarla y ábrela por su DOI para leer el dato exacto."));
      });
      const bR = el("button", "boton secundario", "Poner en el texto");
      bR.onclick = () => H().ejecutar(async () => {
        const t = dato.value.trim();
        if (!t) { dato.focus(); ui.hablar("Primero escribe el dato que leíste en la fuente."); return; }
        const nuevo = t.replace(/[.\s]+$/, "") + (elegida && !t.includes(elegida.cita) ? " " + elegida.cita : "");
        const ok = await Word.run(async (ctx) => {
          const r = ctx.document.body.search(m.marca.slice(0, 250), { matchCase: true }); r.load("items"); await ctx.sync();
          if (!r.items.length) return false;
          r.items[0].insertText(nuevo, "Replace"); await ctx.sync(); return true;
        });
        if (!ok) throw new Error("No encontré esa marca en el documento: quizá ya la cambiaste.");
        if (elegida) await Inv.citarObra(elegida, false);
        registrar("Dato por confirmar completado", t.slice(0, 60), elegida ? "fuente" : "documento");
        caja.classList.add("hecho"); bR.textContent = "Listo ✓"; bR.disabled = true;
        ui.confirmar(elegida ? `Puse el dato con la cita ${elegida.cita} y su referencia.` : "Puse el dato en el texto. Recuerda citar de dónde salió.");
      });
      const bI = el("button", "enlace-sutil", "Ir"); bI.onclick = () => irA(m.parrafo);
      acc.append(bR, bB, bI); caja.appendChild(acc);
      c.appendChild(caja);
    });
    if (marcas.length > 15) c.appendChild(el("p", "inv-nota", `Te muestro los primeros 15 de ${marcas.length}.`));
    tarjeta("Datos por confirmar", c);
    ui.hablar(`Tienes ${marcas.length} ${marcas.length === 1 ? "dato" : "datos"} por confirmar. Busco fuentes para cada uno; tú escribes el dato que leas.`);
    return marcas;
  }

  function comando(n) {
    const tarea = (fn) => async () => { H().ui.ocupar(true, "Biblioteca…"); try { await fn(); } catch (e) { H().ui.mostrarError(e); } finally { H().ui.ocupar(false); } };
    if (/^((abre|muestra|ver) )?(mi |la )?biblioteca( del proyecto)?$|^mis fuentes$/.test(n)) return () => abrir();
    if (/importa(r)? (mis )?(referencias|fuentes)|zotero|mendeley/.test(n)) return () => vistaImportar();
    if (/matriz de antecedentes/.test(n)) return () => matriz();
    if (/(organiza|estado del arte)/.test(n) && /estado del arte|antecedentes/.test(n)) return tarea(estadoArte);
    if (/(afirmaciones|frases) sin (respaldo|cita|fuente)|que necesitan cita|segun quien/.test(n)) return tarea(sinRespaldo);
    if (/(datos?|cifras?) (por confirmar|pendientes?)|completa(r)? (los )?datos/.test(n)) return tarea(porConfirmar);
    if (/(mis citas dicen|cita fuente|citas (respaldan|coinciden)|verifica (que )?las citas digan)/.test(n)) return tarea(citaFuente);
    return null;
  }

  return { abrir, todas, guardarObra, guardarRef, importar, parsearRIS, parsearBibTeX, ficha, matriz, estadoArte, sinRespaldo, citaFuente, porConfirmar, comando, _filasMatriz: filasMatriz };
})();
