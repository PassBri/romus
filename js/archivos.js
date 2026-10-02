/* Romus — Mis documentos: carga tus archivos (PDF, Word, PowerPoint, texto), conversa con ellos, extrae información
   y codifícalos como en ATLAS.ti. Los archivos se guardan solo en este equipo (IndexedDB); a la IA solo viajan los
   fragmentos necesarios para responder, y cada cita que devuelve se comprueba literalmente en el documento. */
window.Archivos = (function () {
  const H = () => Inv._h;
  const MAX_MB = 40;
  const COLORES = ["#2563eb", "#c026d3", "#059669", "#d97706", "#dc2626", "#0891b2", "#7c3aed", "#65a30d", "#db2777", "#475569"];

  /* ================= Almacenamiento (IndexedDB, por documento de Word) ================= */
  let db = null; const memoria = { docs: [], codigos: [], citas: [] };
  function abrirBD() {
    if (db) return Promise.resolve(db);
    return new Promise((res) => {
      try {
        const r = indexedDB.open("romus-archivos", 1);
        r.onupgradeneeded = () => { const d = r.result; ["docs", "codigos", "citas"].forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: "id" }).createIndex("proyecto", "proyecto"); }); };
        r.onsuccess = () => { db = r.result; res(db); };
        r.onerror = () => res(null);
      } catch (e) { res(null); }
    });
  }
  const proyecto = () => { try { return H().claveDoc(); } catch (e) { return "documento-sin-nombre"; } };
  async function todos(tienda) {
    const d = await abrirBD();
    if (!d) return memoria[tienda].filter(x => x.proyecto === proyecto());
    return new Promise((res) => { const t = d.transaction(tienda).objectStore(tienda).index("proyecto").getAll(proyecto()); t.onsuccess = () => res(t.result || []); t.onerror = () => res([]); });
  }
  async function guardar(tienda, obj) {
    obj.proyecto = obj.proyecto || proyecto();
    const d = await abrirBD();
    if (!d) { const l = memoria[tienda]; const k = l.findIndex(x => x.id === obj.id); if (k >= 0) l[k] = obj; else l.push(obj); return obj; }
    return new Promise((res, rej) => { const t = d.transaction(tienda, "readwrite"); t.objectStore(tienda).put(obj); t.oncomplete = () => res(obj); t.onerror = () => rej(new Error("No pude guardar en este equipo (¿espacio lleno?).")); });
  }
  async function borrar(tienda, id) {
    const d = await abrirBD();
    if (!d) { memoria[tienda] = memoria[tienda].filter(x => x.id !== id); return; }
    return new Promise((res) => { const t = d.transaction(tienda, "readwrite"); t.objectStore(tienda).delete(id); t.oncomplete = () => res(); t.onerror = () => res(); });
  }
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ================= Lectura de archivos ================= */
  function cargarScript(src) {
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("No pude cargar el lector de " + src.split("/").pop())); document.head.appendChild(s); });
  }
  const limpiar = (t) => String(t || "").replace(/­/g, "").replace(/[ \t ]+/g, " ").trim();
  async function leerPDF(buf) {
    if (!window.pdfjsLib) { await cargarScript("vendor/pdf.min.js?v=1"); }
    pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js?v=1";
    const pdf = await pdfjsLib.getDocument({ data: buf, isEvalSupported: false }).promise;
    const paginas = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const pg = await pdf.getPage(n);
      const tc = await pg.getTextContent();
      // Reconstruir líneas por posición y luego párrafos (salto grande entre líneas o línea corta con punto final).
      const lineas = []; let actual = null;
      tc.items.forEach(it => {
        if (!it.str && !it.hasEOL) return;
        const y = Math.round(it.transform[5]), h = Math.abs(it.transform[3]) || 10;
        if (!actual || Math.abs(actual.y - y) > h * 0.4) { actual = { y, h, t: "" }; lineas.push(actual); }
        actual.t += it.str;
        if (it.hasEOL) actual = null;
      });
      const ls = lineas.filter(l => l.t.trim());
      const ancho = Math.max(...ls.map(l => l.t.length), 1);
      const pars = []; let buf2 = "";
      ls.forEach((l, i) => {
        const t = l.t.trim();
        buf2 = buf2 ? (/-$/.test(buf2) ? buf2.slice(0, -1) + t : buf2 + " " + t) : t;
        const sig = ls[i + 1];
        const salto = !sig || Math.abs(l.y - sig.y) > l.h * 1.9 || Math.abs(l.h - sig.h) > 1.2 || (/[.:?!»”"]$/.test(t) && t.length < ancho * 0.8);
        if (salto) { pars.push(limpiar(buf2)); buf2 = ""; }
      });
      paginas.push({ n, parrafos: pars.filter(Boolean) });
    }
    let meta = {};
    try { const m = await pdf.getMetadata(); const i = m.info || {}; meta = { autor: i.Author || "", titulo: i.Title || "", anio: (String(i.CreationDate || "").match(/(19|20)\d{2}/) || [""])[0] }; } catch (e) { /* sin metadatos */ }
    return { paginas, meta, conPaginas: true };
  }
  async function leerDOCX(buf) {
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file("word/document.xml").async("string");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const paginas = [{ n: 1, parrafos: [] }]; let saltos = 0;
    Array.from(doc.getElementsByTagNameNS(W, "p")).forEach(p => {
      let t = "";
      Array.from(p.getElementsByTagNameNS(W, "*")).forEach(e => {
        if (e.localName === "t") t += e.textContent;
        else if (e.localName === "tab") t += " ";
        else if ((e.localName === "br" && e.getAttributeNS(W, "type") === "page") || e.localName === "lastRenderedPageBreak") { if (t.trim() || paginas[paginas.length - 1].parrafos.length) { if (t.trim()) paginas[paginas.length - 1].parrafos.push(limpiar(t)); t = ""; paginas.push({ n: paginas.length + 1, parrafos: [] }); saltos++; } }
      });
      if (limpiar(t)) paginas[paginas.length - 1].parrafos.push(limpiar(t));
    });
    let meta = {};
    try { const core = await zip.file("docProps/core.xml").async("string"); meta = { autor: (core.match(/<dc:creator>([^<]*)/) || [])[1] || "", titulo: (core.match(/<dc:title>([^<]*)/) || [])[1] || "", anio: (core.match(/<dcterms:created[^>]*>(\d{4})/) || [])[1] || "" }; } catch (e) { /* sin metadatos */ }
    const pags = paginas.filter(p => p.parrafos.length);
    return { paginas: saltos ? pags.map((p, i) => Object.assign(p, { n: i + 1 })) : [{ n: 1, parrafos: pags.flatMap(p => p.parrafos) }], meta, conPaginas: saltos > 0 };
  }
  async function leerPPTX(buf) {
    const zip = await JSZip.loadAsync(buf);
    const nombres = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
    const paginas = [];
    for (const [i, n] of nombres.entries()) {
      const xml = await zip.file(n).async("string");
      const pars = xml.split(/<\/a:p>/).map(p => limpiar((p.match(/<a:t>([^<]*)<\/a:t>/g) || []).map(x => x.replace(/<\/?a:t>/g, "")).join(""))).filter(Boolean);
      paginas.push({ n: i + 1, parrafos: pars.map(x => x.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')) });
    }
    return { paginas, meta: {}, conPaginas: true, unidad: "diap." };
  }
  function leerTexto(t) {
    const pars = String(t).replace(/\r/g, "").split(/\n\s*\n|\n(?=\s*[-•*\d]+[.)]?\s)/).map(x => limpiar(x.replace(/\n/g, " "))).filter(Boolean);
    return { paginas: [{ n: 1, parrafos: pars }], meta: {}, conPaginas: false };
  }
  async function leerArchivo(file) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (file.size > MAX_MB * 1048576) throw new Error(`«${file.name}» pesa más de ${MAX_MB} MB.`);
    let r;
    if (ext === "pdf") r = await leerPDF(await file.arrayBuffer());
    else if (ext === "docx") r = await leerDOCX(await file.arrayBuffer());
    else if (ext === "pptx") r = await leerPPTX(await file.arrayBuffer());
    else if (["txt", "md", "csv", "tsv", "text"].includes(ext)) r = leerTexto(await file.text());
    else if (ext === "doc" || ext === "ppt") throw new Error(`«${file.name}» es un formato antiguo. Ábrelo y guárdalo como .${ext}x.`);
    else throw new Error(`«${file.name}»: por ahora leo PDF, Word (.docx), PowerPoint (.pptx) y texto (.txt, .md, .csv).`);
    const palabras = r.paginas.reduce((a, p) => a + p.parrafos.join(" ").split(/\s+/).filter(Boolean).length, 0);
    if (ext === "pdf" && palabras < r.paginas.length * 15) throw new Error(`«${file.name}» parece escaneado (imágenes sin texto). Pásalo por un OCR (por ejemplo, ábrelo con Word o Google Drive) y vuelve a cargarlo.`);
    if (!palabras) throw new Error(`«${file.name}» no tiene texto que pueda leer.`);
    // Los metadatos del archivo suelen ser del programa o del equipo, no de la publicación: el año nunca se toma de ahí
    // (es la fecha de creación del archivo) y se descartan autores genéricos.
    const meta = Object.assign({ autor: "", anio: "", titulo: "" }, r.meta || {}, { anio: "" });
    if (/usuario|user|admin|microsoft|office|word|pdf|propietario|owner|^hp$|dell|lenovo|acer|asus|windows|^autor$|^author$|^\W*$/i.test(meta.autor || "")) meta.autor = "";
    if (/^(microsoft word - |untitled|sin título|documento\d*|presentaci[oó]n\d*)/i.test(meta.titulo || "") || /\.(docx?|pdf)$/i.test(meta.titulo || "")) meta.titulo = "";
    if (!meta.titulo) meta.titulo = file.name.replace(/\.[^.]+$/, "");
    return { id: uid("d"), nombre: file.name, tipo: ext, bytes: file.size, fecha: new Date().toISOString(), paginas: r.paginas, conPaginas: r.conPaginas, unidad: r.unidad || "p.", palabras, meta };
  }

  /* ================= Utilidades de texto ================= */
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[«»“”"'’‘]/g, "").replace(/\s+/g, " ").trim();
  const VACIAS = new Set("de la el los las un una unos unas y o u e en con por para que se su sus al del lo le les es son como mas pero sin sobre entre este esta estos estas ese esa eso cual cuales cuando donde quien muy ya hay ser fue han ha a the of and to in is for on with by an be are as at this that from or it".split(" "));
  const terminos = (t) => norm(t).replace(/[^a-z0-9ñ ]/g, " ").split(" ").filter(w => w.length > 2 && !VACIAS.has(w));
  /** Todos los párrafos de los documentos, con su referencia. */
  function parrafosDe(docs) {
    const l = [];
    docs.forEach(d => d.paginas.forEach(p => p.parrafos.forEach((t, k) => l.push({ doc: d, pag: p.n, par: k, texto: t }))));
    return l;
  }
  function ref(d, pag, parGlobal) {
    if (d.conPaginas) return `${d.unidad === "diap." ? "diap." : "p."} ${pag}`;
    return `párr. ${parGlobal + 1}`;
  }
  function indiceGlobal(d, pag, par) { let k = 0; for (const p of d.paginas) { if (p.n === pag) return k + par; k += p.parrafos.length; } return par; }
  /** Fragmentos de ~700 caracteres para la búsqueda por relevancia. */
  function fragmentos(docs) {
    const fr = [];
    docs.forEach(d => d.paginas.forEach(p => {
      let actual = null;
      p.parrafos.forEach((t, k) => {
        if (!actual || actual.texto.length + t.length > 900) { actual = { doc: d, pag: p.n, par: k, texto: "" }; fr.push(actual); }
        actual.texto += (actual.texto ? "\n" : "") + t;
      });
    }));
    return fr;
  }
  function relevantes(docs, pregunta, max) {
    const fr = fragmentos(docs), q = Array.from(new Set(terminos(pregunta)));
    if (!q.length) return fr.slice(0, max);
    const N = fr.length, df = {};
    fr.forEach(f => { f.tok = terminos(f.texto); const s = new Set(f.tok); q.forEach(w => { if (Array.from(s).some(x => x.startsWith(w.slice(0, Math.max(4, w.length - 2))))) df[w] = (df[w] || 0) + 1; }); });
    const prom = fr.reduce((a, f) => a + f.tok.length, 0) / Math.max(1, N);
    fr.forEach(f => {
      f.puntaje = q.reduce((a, w) => {
        const raiz = w.slice(0, Math.max(4, w.length - 2));
        const tf = f.tok.filter(x => x.startsWith(raiz)).length; if (!tf) return a;
        const idf = Math.log(1 + (N - (df[w] || 0) + 0.5) / ((df[w] || 0) + 0.5));
        return a + idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * f.tok.length / prom));
      }, 0);
    });
    return fr.filter(f => f.puntaje > 0).sort((a, b) => b.puntaje - a.puntaje).slice(0, max);
  }
  /** ¿El fragmento citado está literalmente en el texto? Devuelve la posición o -1. */
  function ubicar(cita, texto) {
    const c = norm(cita).replace(/[.…]+$/, "").replace(/^[.…]+/, ""), t = norm(texto);
    if (c.length < 8) return -1;
    let i = t.indexOf(c); if (i >= 0) return i;
    const partes = c.split(/\s*(?:\.\.\.|…|\[\.\.\.\])\s*/).filter(x => x.length > 10);
    return partes.length && partes.every(p => t.includes(p)) ? t.indexOf(partes[0]) : -1;
  }
  /** Busca la cita ignorando mayúsculas, tildes, comillas y espacios, y devuelve su posición en el texto ORIGINAL. */
  function mapa(t) {
    let s = "", prevEsp = false; const idx = [];
    for (let i = 0; i < t.length; i++) {
      let n = t[i].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (/[«»“”"'’‘]/.test(n)) continue;
      if (/\s/.test(n)) { if (prevEsp) continue; n = " "; prevEsp = true; } else prevEsp = false;
      for (const ch of n) { s += ch; idx.push(i); }
    }
    return { s, idx };
  }
  function buscarEn(texto, cita) {
    const { s, idx } = mapa(String(texto || "")), c = mapa(String(cita || "")).s.trim().replace(/[.…]+$/, "").replace(/^[.…]+/, "").trim();
    if (c.length < 3) return null;
    const p = s.indexOf(c); if (p < 0) return null;
    return { ini: idx[p], fin: idx[p + c.length - 1] + 1 };
  }
  function citaAPA(d, refTxt, conParentesis) {
    const a = d.meta.autor ? apellidos(d.meta.autor) : `«${(d.meta.titulo || d.nombre).slice(0, 40)}»`;
    const y = d.meta.anio || "s. f.";
    return conParentesis === false ? `${a} (${y}, ${refTxt})` : `(${a}, ${y}, ${refTxt})`;
  }
  function apellidos(autor) {
    const as = String(autor).split(/\s*(?:;|&|\by\b|\band\b)\s*/).map(x => x.trim()).filter(Boolean);
    const ap = (x) => x.includes(",") ? x.split(",")[0].trim() : x.split(/\s+/).slice(-1)[0];
    if (as.length === 1) return ap(as[0]);
    if (as.length === 2) return `${ap(as[0])} y ${ap(as[1])}`;
    return `${ap(as[0])} et al.`;
  }
  const exigirIA = () => { if (Config.faltaClave()) throw new Error("Para esto necesito tu IA conectada (botón «Conectar IA» o Ajustes). Buscar en tus documentos funciona sin IA."); };

  /* ================= Vista principal: Mis documentos ================= */
  let docsCache = [];
  async function abrir() {
    const { el, tarjeta, etiqueta } = H();
    const ui = H().ui;
    const docs = docsCache = await todos("docs");
    const codigos = await todos("codigos"), citas = await todos("citas");
    const c = el("div", "inv-cuerpo archivos");
    c.appendChild(etiqueta("documento", "tus archivos se quedan en este equipo"));
    const res = el("div", "arch-resumen");
    res.append(el("b", "", `${docs.length} ${docs.length === 1 ? "documento" : "documentos"}`), el("span", "", `${docs.reduce((a, d) => a + d.palabras, 0).toLocaleString("es-CO")} palabras · ${codigos.length} códigos · ${citas.length} citas`));
    c.appendChild(res);
    // Zona para soltar o elegir archivos
    const zona = el("label", "arch-zona");
    const inp = el("input"); inp.type = "file"; inp.multiple = true; inp.accept = ".pdf,.docx,.pptx,.txt,.md,.csv"; inp.hidden = true;
    zona.append(el("b", "", "＋ Cargar documentos"), el("span", "", "PDF, Word, PowerPoint o texto · arrástralos aquí o toca para elegir"), inp);
    inp.onchange = () => { cargar(Array.from(inp.files)); inp.value = ""; };
    zona.ondragover = (e) => { e.preventDefault(); zona.classList.add("encima"); };
    zona.ondragleave = () => zona.classList.remove("encima");
    zona.ondrop = (e) => { e.preventDefault(); zona.classList.remove("encima"); cargar(Array.from(e.dataTransfer.files)); };
    c.appendChild(zona);
    if (docs.length) {
      const acc = el("div", "arch-herr");
      [["💬", "Preguntar", () => preguntar()], ["🔎", "Buscar", () => buscar()], ["🧾", "Extraer", () => extraer()], ["🏷️", "Códigos", () => codigosVista()], ["📑", "Reporte", () => reporte()]].forEach(([i, t, f]) => { const b = el("button", "arch-btn"); b.append(el("span", "", i), el("b", "", t)); b.onclick = f; acc.appendChild(b); });
      c.appendChild(acc);
      const lista = el("div", "arch-lista");
      docs.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).forEach(d => {
        const f = el("div", "arch-doc");
        const n = citas.filter(x => x.doc === d.id).length;
        const info = el("div", "");
        info.append(el("b", "", d.nombre), el("small", "", `${d.tipo.toUpperCase()} · ${d.conPaginas ? d.paginas.length + (d.unidad === "diap." ? " diap." : " pág.") + " · " : ""}${d.palabras.toLocaleString("es-CO")} palabras${n ? ` · ${n} citas` : ""}`), el("small", "arch-meta", d.meta.autor ? `${apellidos(d.meta.autor)} (${d.meta.anio || "s. f."})` : "Sin autor: agrégalo para citar en APA"));
        const bA = el("button", "enlace-sutil", "Abrir"); bA.onclick = () => leer(d.id);
        const bD = el("button", "enlace-sutil", "Datos"); bD.onclick = () => datosDoc(d.id);
        const bQ = el("button", "enlace-sutil peligro", "Quitar"); bQ.onclick = async () => { if (!confirm(`¿Quitar «${d.nombre}» y sus citas de Romus? (El archivo original no se borra.)`)) return; await borrar("docs", d.id); for (const x of citas.filter(x => x.doc === d.id)) await borrar("citas", x.id); abrir(); };
        const a = el("div", "arch-acc"); a.append(bA, bD, bQ);
        f.append(info, a); lista.appendChild(f);
      });
      c.appendChild(lista);
    } else {
      c.appendChild(el("p", "guia-resumen", "Carga tus artículos, entrevistas transcritas, leyes, informes o tus propios capítulos. Luego puedes preguntarles, buscar, extraer datos y citas, y codificarlos como en ATLAS.ti."));
    }
    c.appendChild(el("p", "inv-nota", "Privacidad: los archivos se guardan solo en este equipo, junto a este documento de Word. Cuando preguntas o extraes, a tu IA solo viajan los fragmentos necesarios."));
    tarjeta("Mis documentos", c);
    ui.hablar(docs.length ? `Tienes ${docs.length} documentos. Puedes preguntarles, buscar, extraer información o codificarlos.` : "Carga tus documentos: PDF, Word, PowerPoint o texto.");
  }
  async function cargar(files) {
    const ui = H().ui;
    if (!files.length) return;
    ui.ocupar(true, "Leyendo documentos…");
    const ok = [], malos = [];
    try {
      for (const f of files) {
        try { const d = await leerArchivo(f); await guardar("docs", d); ok.push(d); }
        catch (e) { malos.push(e.message); }
      }
    } finally { ui.ocupar(false); }
    H().registrar("Documentos cargados", ok.map(d => d.nombre).join(", "), "documento");
    await abrir();
    if (malos.length) ui.mostrarError(new Error(malos.join(" ")));
    if (ok.length) ui.confirmar(`Cargué ${ok.length} ${ok.length === 1 ? "documento" : "documentos"}: ${ok.map(d => d.nombre).join(", ")}.`);
    const sinAutor = ok.filter(d => !d.meta.autor);
    if (sinAutor.length === 1 && ok.length === 1) datosDoc(sinAutor[0].id, true);
  }
  async function obtener(id) { return (await todos("docs")).find(d => d.id === id); }

  /* Datos bibliográficos del documento (para citar en APA) */
  async function datosDoc(id, recien) {
    const { el, tarjeta } = H();
    const d = await obtener(id); if (!d) return abrir();
    const c = el("div", "inv-cuerpo");
    if (recien) c.appendChild(el("p", "guia-resumen", "Para que Romus pueda citar este documento en APA, completa el autor y el año (si los conoces)."));
    const campo = (k, t, ph) => { const l = el("label", "campo-pro"); l.appendChild(el("span", "", t)); const i = el("input", "ajuste"); i.value = d.meta[k] || ""; i.placeholder = ph; l.appendChild(i); c.appendChild(l); return i; };
    const iA = campo("autor", "Autor(es)", "Ej.: Searle, J. R.  ·  o  Ministerio de Educación Nacional");
    const iY = campo("anio", "Año", "Ej.: 2021");
    const iT = campo("titulo", "Título", "Título de la obra");
    const acc = el("div", "inv-acciones");
    const bG = el("button", "boton primario", "Guardar"); bG.onclick = async () => { d.meta = { autor: iA.value.trim(), anio: iY.value.trim(), titulo: iT.value.trim() }; await guardar("docs", d); H().ui.confirmar("Guardé los datos del documento."); abrir(); };
    const bV = el("button", "enlace-sutil", "Volver"); bV.onclick = () => abrir();
    acc.append(bG, bV); c.appendChild(acc);
    tarjeta(`Datos de «${d.nombre}»`, c);
  }

  /* ================= Lector con codificación (selecciona texto → código) ================= */
  async function leer(id, enfocar) {
    const { el, tarjeta } = H();
    const d = await obtener(id); if (!d) return abrir();
    const codigos = await todos("codigos"), citas = (await todos("citas")).filter(x => x.doc === id);
    const c = el("div", "inv-cuerpo lector");
    c.appendChild(el("p", "inv-nota", "Selecciona un fragmento para codificarlo o citarlo en tu documento de Word."));
    const cuerpo = el("div", "lector-texto");
    let parG = 0;
    d.paginas.forEach(p => {
      if (d.conPaginas) cuerpo.appendChild(el("div", "lector-pag", `${d.unidad === "diap." ? "Diapositiva" : "Página"} ${p.n}`));
      p.parrafos.forEach((t, k) => {
        const par = el("p", "");
        par.dataset.pag = p.n; par.dataset.par = k; par.dataset.g = parG++;
        const marcas = citas.filter(x => x.pag === p.n && x.par === k).sort((a, b) => a.ini - b.ini);
        let pos = 0;
        marcas.forEach(m => {
          if (m.ini < pos) return;
          par.appendChild(document.createTextNode(t.slice(pos, m.ini)));
          const mk = el("mark", "", t.slice(m.ini, m.fin));
          const cs = m.codigos.map(cid => codigos.find(x => x.id === cid)).filter(Boolean);
          mk.style.borderBottomColor = (cs[0] || {}).color || "#888"; mk.title = cs.map(x => x.nombre).join(", ") || "Sin código";
          mk.onclick = (e) => { e.stopPropagation(); editarCita(m.id, id); };
          par.appendChild(mk); pos = m.fin;
        });
        par.appendChild(document.createTextNode(t.slice(pos)));
        cuerpo.appendChild(par);
      });
    });
    c.appendChild(cuerpo);
    // Barra de selección
    const barra = el("div", "lector-barra oculto");
    const bC = el("button", "boton primario", "🏷️ Codificar"), bW = el("button", "boton secundario", "❝ Citar en Word");
    barra.append(bC, bW); c.appendChild(barra);
    let sel = null;
    cuerpo.addEventListener("mouseup", () => setTimeout(() => {
      const s = window.getSelection(); const txt = s ? s.toString().trim() : "";
      const p = s && s.anchorNode ? (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement).closest("p[data-pag]") : null;
      if (!txt || txt.length < 3 || !p) { barra.classList.add("oculto"); sel = null; return; }
      const tPar = d.paginas.find(x => x.n === +p.dataset.pag).parrafos[+p.dataset.par];
      const primera = txt.split(/\n/)[0].trim();
      const ini = tPar.indexOf(primera);
      if (ini < 0) { barra.classList.add("oculto"); return; }
      sel = { pag: +p.dataset.pag, par: +p.dataset.par, ini, fin: ini + primera.length, texto: primera, g: +p.dataset.g };
      barra.classList.remove("oculto");
    }, 10));
    cuerpo.addEventListener("touchend", () => cuerpo.dispatchEvent(new Event("mouseup")));
    bC.onclick = () => { if (sel) elegirCodigo(d, sel); };
    bW.onclick = () => { if (sel) H().ejecutar(() => citarEnWord(d, sel.texto, ref(d, sel.pag, sel.g))); };
    const acc = el("div", "inv-acciones");
    const bV = el("button", "enlace-sutil", "← Mis documentos"); bV.onclick = () => abrir();
    const bP = el("button", "enlace-sutil", "Preguntar a este documento"); bP.onclick = () => preguntar(id);
    acc.append(bV, bP); c.appendChild(acc);
    tarjeta(d.nombre, c);
    if (enfocar) setTimeout(() => { const p = cuerpo.querySelector(`p[data-pag="${enfocar.pag}"][data-par="${enfocar.par}"]`); if (p) { p.scrollIntoView({ block: "center" }); p.classList.add("resaltado"); } }, 60);
  }
  async function elegirCodigo(d, sel, despues) {
    const { el, tarjeta } = H();
    const codigos = await todos("codigos");
    const c = el("div", "inv-cuerpo");
    c.appendChild(el("code", "cita-sel", sel.texto.length > 240 ? sel.texto.slice(0, 237) + "…" : sel.texto));
    const marcados = new Set();
    const lista = el("div", "codigos-chips");
    codigos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).forEach(cd => { const b = el("button", "chip-codigo", cd.nombre); b.style.borderColor = cd.color; b.onclick = () => { b.classList.toggle("activo"); b.classList.contains("activo") ? marcados.add(cd.id) : marcados.delete(cd.id); }; lista.appendChild(b); });
    c.appendChild(lista);
    const nuevo = el("input", "ajuste"); nuevo.placeholder = codigos.length ? "O escribe un código nuevo" : "Escribe el nombre del código (ej.: Agresión en el juego)";
    c.appendChild(nuevo);
    const com = el("input", "ajuste"); com.placeholder = "Comentario (opcional)"; c.appendChild(com);
    const acc = el("div", "inv-acciones");
    const bG = el("button", "boton primario", "Guardar cita");
    bG.onclick = () => H().ejecutar(async () => {
      if (nuevo.value.trim()) { const cd = await crearCodigo(nuevo.value.trim()); marcados.add(cd.id); }
      if (!marcados.size) { H().ui.hablar("Elige o escribe al menos un código."); return; }
      await guardar("citas", { id: uid("c"), doc: d.id, pag: sel.pag, par: sel.par, ini: sel.ini, fin: sel.fin, texto: sel.texto, codigos: Array.from(marcados), comentario: com.value.trim(), origen: "usuario", fecha: new Date().toISOString() });
      H().ui.confirmar("Guardé la cita.");
      despues ? despues() : leer(d.id, sel);
    });
    const bV = el("button", "enlace-sutil", "Cancelar"); bV.onclick = () => despues ? despues() : leer(d.id, sel);
    acc.append(bG, bV); c.appendChild(acc);
    tarjeta("Codificar cita", c);
    setTimeout(() => (codigos.length ? lista.querySelector("button") || nuevo : nuevo).focus(), 50);
  }
  async function crearCodigo(nombre, definicion) {
    const cs = await todos("codigos");
    const ya = cs.find(x => norm(x.nombre) === norm(nombre)); if (ya) return ya;
    return guardar("codigos", { id: uid("k"), nombre, definicion: definicion || "", color: COLORES[cs.length % COLORES.length] });
  }
  async function editarCita(cid, docId) {
    const { el, tarjeta } = H();
    const cita = (await todos("citas")).find(x => x.id === cid); if (!cita) return;
    const codigos = await todos("codigos");
    const c = el("div", "inv-cuerpo");
    c.appendChild(el("code", "cita-sel", cita.texto));
    c.appendChild(el("p", "inv-nota", "Códigos: " + (cita.codigos.map(k => (codigos.find(x => x.id === k) || {}).nombre).filter(Boolean).join(", ") || "ninguno") + (cita.comentario ? " · " + cita.comentario : "") + (cita.origen === "ia" ? " · propuesta por la IA y aceptada por ti" : "")));
    const acc = el("div", "inv-acciones");
    const bW = el("button", "boton secundario", "❝ Citar en Word"); bW.onclick = async () => { const d = await obtener(cita.doc); H().ejecutar(() => citarEnWord(d, cita.texto, ref(d, cita.pag, indiceGlobal(d, cita.pag, cita.par)))); };
    const bB = el("button", "enlace-sutil peligro", "Quitar cita"); bB.onclick = async () => { await borrar("citas", cid); leer(docId); };
    const bV = el("button", "enlace-sutil", "Volver"); bV.onclick = () => leer(docId);
    acc.append(bW, bB, bV); c.appendChild(acc);
    tarjeta("Cita", c);
  }
  /** Párrafo donde está el cursor (para insertar contenido después de él). */
  async function parrafoDelCursor(ctx) {
    const ps = ctx.document.getSelection().paragraphs; ps.load("items"); await ctx.sync();
    return ps.items[ps.items.length - 1];
  }
  /** Inserta la cita textual en Word con su referencia APA 7 (en bloque si tiene 40 palabras o más). */
  async function citarEnWord(d, texto, refTxt) {
    const palabras = texto.split(/\s+/).length;
    const cita = citaAPA(d, refTxt);
    await Word.run(async (ctx) => {
      const sel = ctx.document.getSelection();
      if (palabras >= 40) {
        const p = (await parrafoDelCursor(ctx)).insertParagraph(`${texto.replace(/^[«"“]|[»"”]$/g, "")} ${cita}`, "After");
        try { p.leftIndent = 36; p.firstLineIndent = 0; } catch (e) { /* sangría opcional */ }
      } else sel.insertText(` «${texto.replace(/^[«"“]|[»"”]$/g, "")}» ${cita}`, "End");
      await ctx.sync();
    });
    H().registrar("Cita textual de un documento propio", `${d.nombre} ${refTxt}`, "documento");
    H().ui.confirmar(palabras >= 40 ? "Inserté la cita en bloque (40 palabras o más), con su referencia." : `Inserté la cita ${cita}.`);
    if (!d.meta.autor) H().ui.hablar("Ojo: el documento no tiene autor. Agrégalo en «Datos» para que la cita quede completa en APA.");
  }

  /* ================= Buscar (sin IA) ================= */
  async function buscar(consultaInicial) {
    const { el, tarjeta } = H();
    const docs = await todos("docs");
    if (!docs.length) return abrir();
    const c = el("div", "inv-cuerpo");
    const fila = el("div", "con-boton"); const q = el("input", "ajuste"); q.placeholder = "Palabra o frase (ej.: convivencia escolar)"; q.value = consultaInicial || "";
    const b = el("button", "boton primario", "Buscar"); fila.append(q, b); c.appendChild(fila);
    const out = el("div", ""); c.appendChild(out);
    const correr = async () => {
      out.innerHTML = "";
      const t = norm(q.value); if (t.length < 2) return;
      const hits = parrafosDe(docs).filter(p => norm(p.texto).includes(t));
      out.appendChild(el("p", "inv-nota", `${hits.length} ${hits.length === 1 ? "resultado" : "resultados"} en ${new Set(hits.map(h => h.doc.id)).size} documentos.`));
      hits.slice(0, 60).forEach(h => {
        const u = buscarEn(h.texto, q.value) || { ini: 0, fin: 0 };
        const ini = Math.max(0, u.ini - 70), ctxt = (ini ? "…" : "") + h.texto.slice(ini, u.ini) + "⟦" + h.texto.slice(u.ini, u.fin) + "⟧" + h.texto.slice(u.fin, u.fin + 90) + "…";
        const fila2 = el("button", "verif-fila medio");
        const s = el("span", ""); ctxt.split(/⟦|⟧/).forEach((x, k) => s.appendChild(k === 1 ? el("mark", "", x) : document.createTextNode(x)));
        fila2.append(el("b", "", `${h.doc.nombre} · ${ref(h.doc, h.pag, indiceGlobal(h.doc, h.pag, h.par))}`), s);
        fila2.onclick = () => leer(h.doc.id, h);
        out.appendChild(fila2);
      });
      if (hits.length) {
        const bC = el("button", "boton secundario", `🏷️ Codificar los ${Math.min(hits.length, 200)} resultados`);
        bC.onclick = () => codificarResultados(hits.slice(0, 200), q.value);
        out.appendChild(bC);
      }
    };
    b.onclick = correr; q.onkeydown = (e) => { if (e.key === "Enter") correr(); };
    tarjeta("Buscar en mis documentos", c);
    if (consultaInicial) correr(); else setTimeout(() => q.focus(), 50);
  }
  /** Autocodificación por búsqueda (como en ATLAS.ti): cada resultado se guarda como cita con el código elegido. */
  async function codificarResultados(hits, termino) {
    const nombre = prompt(`¿Con qué código marco las ${hits.length} citas de «${termino}»?`, termino);
    if (!nombre) return;
    const cd = await crearCodigo(nombre.trim());
    const ya = await todos("citas");
    let n = 0;
    for (const h of hits) {
      const i = (buscarEn(h.texto, termino) || { ini: 0 }).ini;
      // la cita es la oración que contiene el término
      const ors = h.texto.match(/[^.!?]+[.!?]*/g) || [h.texto];
      let pos = 0, o = h.texto;
      for (const x of ors) { if (pos + x.length > i) { o = x; break; } pos += x.length; }
      const ini = h.texto.indexOf(o.trim()), fin = ini + o.trim().length;
      if (ya.some(c => c.doc === h.doc.id && c.pag === h.pag && c.par === h.par && c.ini === ini && c.codigos.includes(cd.id))) continue;
      await guardar("citas", { id: uid("c"), doc: h.doc.id, pag: h.pag, par: h.par, ini, fin, texto: o.trim(), codigos: [cd.id], comentario: "", origen: "busqueda", fecha: new Date().toISOString() }); n++;
    }
    H().ui.confirmar(`Codifiqué ${n} citas con «${cd.nombre}».`);
    codigosVista();
  }

  /* ================= Preguntar a los documentos (IA con citas verificadas) ================= */
  let conversacion = [];
  async function preguntar(soloDoc, preguntaInicial) {
    const { el, tarjeta } = H();
    const docs = await todos("docs");
    if (!docs.length) return abrir();
    const c = el("div", "inv-cuerpo docs-chat");
    const selD = el("select", "ajuste"); [["", `Todos mis documentos (${docs.length})`]].concat(docs.map(d => [d.id, d.nombre])).forEach(([v, t]) => { const o = el("option", "", t); o.value = v; selD.appendChild(o); }); selD.value = soloDoc || "";
    c.appendChild(selD);
    const hist = el("div", "chat-docs"); c.appendChild(hist);
    const fila = el("div", "con-boton"); const q = el("textarea", "ajuste"); q.rows = 2; q.placeholder = "Pregunta lo que quieras: ¿qué concluye el autor?, ¿qué dicen sobre la saturación?, compara los dos estudios…"; q.value = preguntaInicial || "";
    const b = el("button", "boton primario", "Preguntar"); fila.append(q, b); c.appendChild(fila);
    c.appendChild(el("p", "inv-nota", "Romus responde solo con lo que dicen tus documentos y comprueba cada cita en el texto original."));
    const pintar = (r) => {
      const m = el("div", "chat-q", r.pregunta); hist.appendChild(m);
      const a = el("div", "chat-a");
      const p = el("p", "");
      String(r.respuesta).split(/(\[\d+\])/).forEach(seg => {
        const k = seg.match(/^\[(\d+)\]$/);
        if (!k) { p.appendChild(document.createTextNode(seg)); return; }
        const ci = r.citas.find(x => x.n === +k[1]);
        const s = el("button", "chip-ref" + (ci && ci.ok ? "" : " no"), ci ? `${ci.docNombre.slice(0, 18)}, ${ci.ref}` : `[${k[1]}]`);
        if (ci) { s.title = (ci.ok ? "Cita verificada: " : "No encontré esta cita literal: ") + ci.fragmento; s.onclick = () => leer(ci.docId, { pag: ci.pag, par: ci.par }); }
        p.appendChild(s);
      });
      a.appendChild(p);
      const malas = r.citas.filter(x => !x.ok).length;
      a.appendChild(el("small", "inv-nota", r.citas.length ? `${r.citas.length - malas} de ${r.citas.length} citas verificadas en el texto${malas ? " · revisa las marcadas en rojo" : ""}.` : "Sin citas."));
      const acc = el("div", "inv-acciones");
      const bI = el("button", "enlace-sutil", "Insertar en Word"); bI.onclick = () => H().ejecutar(async () => {
        const texto = String(r.respuesta).replace(/\s*\[(\d+)\]/g, (_, n) => { const ci = r.citas.find(x => x.n === +n); return ci && ci.ok ? " " + citaAPA(ci.doc, ci.ref) : " [no verificado en tus documentos: revísalo]"; });
        await Word.run(async (ctx) => { (await parrafoDelCursor(ctx)).insertParagraph(texto, "After"); await ctx.sync(); });
        H().ui.confirmar("Inserté la respuesta con sus citas APA después del cursor. Reescríbela con tu voz.");
      });
      acc.appendChild(bI); a.appendChild(acc);
      hist.appendChild(a);
    };
    conversacion.filter(r => (r.doc || "") === (soloDoc || "")).forEach(pintar);
    const enviar = () => H().ejecutar(async () => {
      exigirIA();
      const pregunta = q.value.trim(); if (!pregunta) { q.focus(); return; }
      const usados = selD.value ? docs.filter(d => d.id === selD.value) : docs;
      const total = usados.reduce((a, d) => a + d.palabras, 0);
      // Documentos cortos: van completos; si no, solo los fragmentos más relevantes.
      const anteriores = conversacion.slice(-2).map(r => r.pregunta).join(" ");
      let frs = total < 9000 ? fragmentos(usados) : relevantes(usados, pregunta + " " + anteriores, 16);
      if (!frs.length) frs = fragmentos(usados).slice(0, 10);
      const lista = frs.map((f, k) => `[${k + 1}] (${f.doc.nombre}, ${ref(f.doc, f.pag, indiceGlobal(f.doc, f.pag, f.par))})\n${f.texto}`).join("\n\n");
      const previo = conversacion.slice(-3).map(r => `P: ${r.pregunta}\nR: ${String(r.respuesta).slice(0, 600)}`).join("\n");
      const d = await H().pedirHerramienta("respuesta_documentos", "Respuesta basada solo en los documentos del usuario, con citas verificables.",
        { type: "object", properties: {
          respuesta: { type: "string", description: "Respuesta en español, clara y completa, con marcas [n] del fragmento que respalda cada afirmación" },
          citas: { type: "array", items: { type: "object", properties: { n: { type: "integer", description: "Número del fragmento" }, fragmento: { type: "string", description: "Texto LITERAL copiado del fragmento (máx. 40 palabras)" } }, required: ["n", "fragmento"] } },
          sin_respuesta: { type: "boolean", description: "true si los documentos no responden la pregunta" }
        }, required: ["respuesta", "citas"] },
        `Responde la pregunta usando SOLO estos fragmentos de los documentos del usuario. Marca cada afirmación con [n]. Si los documentos no lo dicen, dilo con claridad y no completes con conocimiento propio.
${previo ? "\nCONVERSACIÓN PREVIA:\n" + previo + "\n" : ""}
PREGUNTA: ${pregunta}

FRAGMENTOS:
${lista}`);
      const citas = (d.citas || []).map(x => { const f = frs[x.n - 1]; if (!f) return null; const ok = ubicar(x.fragmento, f.texto) >= 0; return { n: x.n, fragmento: x.fragmento, ok, doc: f.doc, docId: f.doc.id, docNombre: f.doc.nombre, pag: f.pag, par: f.par, ref: ref(f.doc, f.pag, indiceGlobal(f.doc, f.pag, f.par)) }; }).filter(Boolean);
      // Marcas [n] sin cita: se ligan al fragmento aunque no haya texto literal.
      (String(d.respuesta).match(/\[(\d+)\]/g) || []).forEach(m => { const n = +m.slice(1, -1); if (!citas.some(x => x.n === n) && frs[n - 1]) { const f = frs[n - 1]; citas.push({ n, fragmento: f.texto.slice(0, 120), ok: true, doc: f.doc, docId: f.doc.id, docNombre: f.doc.nombre, pag: f.pag, par: f.par, ref: ref(f.doc, f.pag, indiceGlobal(f.doc, f.pag, f.par)) }); } });
      const r = { doc: selD.value, pregunta, respuesta: d.respuesta, citas };
      conversacion.push(r); pintar(r); q.value = "";
      H().registrar("Pregunta a mis documentos", pregunta.slice(0, 60), "modelo");
      H().ui.hablar(String(d.respuesta).replace(/\[\d+\]/g, "").slice(0, 400));
    });
    b.onclick = enviar; q.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } };
    tarjeta("Preguntar a mis documentos", c);
    if (preguntaInicial) enviar(); else setTimeout(() => q.focus(), 50);
  }

  /* ================= Extraer información ================= */
  const PLANTILLAS = {
    ficha: ["Ficha de lectura", "Objetivo, método, participantes, hallazgos, conclusiones y limitaciones", [["campo", "Campo (objetivo, método, participantes, hallazgos, conclusiones, limitaciones)"], ["contenido", "Lo que dice el documento"]]],
    datos: ["Datos y cifras", "Porcentajes, cantidades, fechas y resultados numéricos", [["dato", "El dato o cifra"], ["contexto", "A qué se refiere"]]],
    conceptos: ["Conceptos y definiciones", "Cómo define el autor los conceptos clave", [["concepto", "Concepto"], ["definicion", "Definición según el documento"]]],
    citas: ["Citas sobre un tema", "Fragmentos textuales útiles sobre el tema que indiques", [["idea", "Idea que expresa la cita"]]],
    matriz: ["Matriz comparativa", "Compara documentos por categorías (autor × categoría)", [["categoria", "Categoría"], ["postura", "Qué plantea el documento sobre la categoría"]]]
  };
  async function extraer(tipoIni) {
    const { el, tarjeta } = H();
    const docs = await todos("docs"); if (!docs.length) return abrir();
    const c = el("div", "inv-cuerpo");
    const selT = el("select", "ajuste"); Object.entries(PLANTILLAS).forEach(([k, [n, dsc]]) => { const o = el("option", "", `${n} — ${dsc}`); o.value = k; selT.appendChild(o); }); selT.value = tipoIni || "ficha";
    c.appendChild(selT);
    const caja = el("div", "arch-docs-sel"); docs.forEach(d => { const l = el("label", ""); const ch = el("input"); ch.type = "checkbox"; ch.checked = docs.length <= 5 || docs.indexOf(d) < 3; ch.value = d.id; l.append(ch, document.createTextNode(" " + d.nombre)); caja.appendChild(l); }); c.appendChild(caja);
    const extra = el("input", "ajuste"); c.appendChild(extra);
    const ajustar = () => { const t = selT.value; extra.classList.toggle("oculto", !["citas", "matriz"].includes(t)); extra.placeholder = t === "citas" ? "Tema (ej.: violencia en el recreo)" : "Categorías separadas por coma (vacío: las de tu proyecto o códigos)"; };
    selT.onchange = ajustar; ajustar();
    const b = el("button", "boton primario", "Extraer"); c.appendChild(b);
    const out = el("div", ""); c.appendChild(out);
    b.onclick = () => H().ejecutar(async () => {
      exigirIA();
      const ids = Array.from(caja.querySelectorAll("input:checked")).map(x => x.value);
      const usados = docs.filter(d => ids.includes(d.id)); if (!usados.length) { H().ui.hablar("Elige al menos un documento."); return; }
      const t = selT.value, [nombre, , campos] = PLANTILLAS[t];
      let categorias = [];
      if (t === "matriz") {
        categorias = extra.value.split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
        if (!categorias.length) categorias = (await todos("codigos")).map(x => x.nombre).slice(0, 8);
        if (!categorias.length) { try { const ins = JSON.parse(localStorage.getItem("romus.instrumento." + H().claveDoc()) || "null"); categorias = ((ins && (ins.categorias || ins.dimensiones)) || []).map(x => x.categoria || x.dimension).slice(0, 8); } catch (e) { /* sin instrumento */ } }
        if (!categorias.length) throw new Error("Escribe las categorías para comparar, separadas por coma.");
      }
      if (t === "citas" && !extra.value.trim()) { extra.focus(); throw new Error("Escribe el tema de las citas."); }
      const filas = [];
      for (const d of usados) {
        H().ui.ocupar(true, `Extrayendo de ${d.nombre}…`);
        const consulta = t === "citas" ? extra.value : t === "matriz" ? categorias.join(" ") : t === "datos" ? "porcentaje cifra resultados datos número total muestra" : "";
        const frs = d.palabras < 12000 ? fragmentos([d]) : (consulta ? relevantes([d], consulta, 18) : fragmentos([d]).filter((_, i, a) => i < 8 || i > a.length - 8 || i % Math.ceil(a.length / 10) === 0).slice(0, 26));
        const lista = frs.map((f, k) => `[${k + 1}] (${ref(d, f.pag, indiceGlobal(d, f.pag, f.par))}) ${f.texto}`).join("\n\n");
        const props = {}; campos.forEach(([k, dsc]) => { props[k] = { type: "string", description: dsc }; });
        props.cita = { type: "string", description: "Fragmento LITERAL del documento que lo respalda (máx. 40 palabras)" };
        props.n = { type: "integer", description: "Número del fragmento de donde sale la cita" };
        const r = await H().pedirHerramienta("extraer_informacion", `${nombre} de un documento del usuario, con citas literales.`,
          { type: "object", properties: { items: { type: "array", items: { type: "object", properties: props, required: campos.map(x => x[0]).concat(["cita", "n"]) } } }, required: ["items"] },
          `${t === "ficha" ? "Haz la ficha de lectura del documento: un ítem por campo (objetivo, método, participantes, hallazgos, conclusiones, limitaciones)." : t === "datos" ? "Extrae todos los datos y cifras relevantes." : t === "conceptos" ? "Extrae los conceptos clave y cómo los define el documento." : t === "citas" ? `Extrae las citas textuales más útiles sobre: «${extra.value}». Entre 3 y 10.` : `Para cada categoría (${categorias.join("; ")}), resume qué plantea el documento; si no trata una categoría, escribe «No la aborda» y deja la cita vacía.`}
Cada ítem debe llevar una cita LITERAL copiada del fragmento y su número. No inventes nada que no esté en el texto.

DOCUMENTO: ${d.nombre}${d.meta.autor ? ` · ${d.meta.autor} (${d.meta.anio || "s. f."})` : ""}
FRAGMENTOS:
${lista}`);
        (r.items || []).forEach(x => { const f = frs[x.n - 1]; const ok = !x.cita || (f ? ubicar(x.cita, f.texto) >= 0 : false); filas.push(Object.assign({ doc: d, refTxt: f ? ref(d, f.pag, indiceGlobal(d, f.pag, f.par)) : "", pag: f && f.pag, par: f && f.par, ok }, x)); });
      }
      H().ui.ocupar(false);
      pintarExtraccion(out, t, filas, campos, categorias);
      H().registrar("Extracción de información", `${nombre} · ${usados.length} documentos`, "modelo");
    });
    tarjeta("Extraer información", c);
  }
  function pintarExtraccion(out, t, filas, campos, categorias) {
    const { el } = H();
    out.innerHTML = "";
    const malas = filas.filter(f => f.cita && !f.ok).length;
    out.appendChild(el("p", "inv-nota", `${filas.length} elementos · ${filas.filter(f => f.cita && f.ok).length} citas verificadas en el texto${malas ? ` · ${malas} no encontradas (marcadas)` : ""}.`));
    filas.forEach(f => {
      const b = el("div", "apa-hall" + (f.cita && !f.ok ? " no-verif" : ""));
      b.appendChild(el("b", "", `${campos.map(([k]) => f[k]).filter(Boolean)[0] || ""}`));
      if (campos[1]) b.appendChild(el("span", "", f[campos[1][0]] || ""));
      if (f.cita) b.appendChild(el("code", "", `«${f.cita}» — ${f.doc.nombre}, ${f.refTxt}${f.ok ? " ✓" : " ⚠ no encontrada literal"}`));
      const a = el("div", "inv-acciones");
      if (f.cita && f.ok) { const bW = el("button", "enlace-sutil", "Citar en Word"); bW.onclick = () => H().ejecutar(() => citarEnWord(f.doc, f.cita, f.refTxt)); a.appendChild(bW); }
      const bI = el("button", "enlace-sutil", "Ir"); bI.onclick = () => leer(f.doc.id, f); if (f.pag) a.appendChild(bI);
      b.appendChild(a); out.appendChild(b);
    });
    const cab = ["Documento", "Autor y año"].concat(campos.map(x => x[1].split(" (")[0])).concat(["Cita textual", "Ubicación", "Verificada"]);
    const tabla = [cab].concat(filas.map(f => [f.doc.nombre, f.doc.meta.autor ? `${apellidos(f.doc.meta.autor)} (${f.doc.meta.anio || "s. f."})` : ""].concat(campos.map(([k]) => f[k] || "")).concat([f.cita || "", f.refTxt, f.cita ? (f.ok ? "Sí" : "No") : ""])));
    const acc = el("div", "inv-acciones");
    const bX = el("button", "boton secundario", "Descargar Excel"); bX.onclick = () => Docx.descargar(`extraccion-${t}.xlsx`, Datos._xlsx(tabla, "Extracción"));
    const bT = el("button", "boton secundario", "Insertar tabla en Word"); bT.onclick = () => H().ejecutar(async () => {
      const filasW = t === "matriz" ? matrizAutorCategoria(filas, categorias) : tabla.map(f => [f[0], f[2], f[3] != null ? f[3] : "", f[f.length - 2]].slice(0, campos.length > 1 ? 4 : 3));
      await Word.run(async (ctx) => { const p = (await parrafoDelCursor(ctx)).insertParagraph(t === "matriz" ? "Matriz comparativa por categorías" : PLANTILLAS[t][0], "After"); p.insertTable(filasW.length, filasW[0].length, "After", filasW); await ctx.sync(); });
      H().ui.confirmar("Inserté la tabla después del cursor.");
    });
    const bC = el("button", "enlace-sutil", "Guardar como citas codificadas"); bC.onclick = () => H().ejecutar(async () => {
      let n = 0;
      for (const f of filas.filter(x => x.cita && x.ok && x.pag != null)) {
        // la cita puede estar en cualquier párrafo del fragmento
        const pg = f.doc.paginas.find(p => p.n === f.pag); let u = null, parK = f.par;
        for (let k = f.par; k < pg.parrafos.length && !u; k++) { u = buscarEn(pg.parrafos[k], f.cita); parK = k; }
        if (!u) continue; const tPar = pg.parrafos[parK];
        const cd = await crearCodigo(t === "matriz" ? f.categoria : PLANTILLAS[t][0] + (t === "ficha" ? ": " + f.campo : ""));
        await guardar("citas", { id: uid("c"), doc: f.doc.id, pag: f.pag, par: parK, ini: u.ini, fin: u.fin, texto: tPar.slice(u.ini, u.fin), codigos: [cd.id], comentario: f[campos[1] ? campos[1][0] : campos[0][0]] || "", origen: "ia", fecha: new Date().toISOString() }); n++;
      }
      H().ui.confirmar(`Guardé ${n} citas codificadas.`);
    });
    acc.append(bX, bT, bC); out.appendChild(acc);
  }
  function matrizAutorCategoria(filas, categorias) {
    const docs = Array.from(new Set(filas.map(f => f.doc)));
    const etq = (d) => d.meta.autor ? `${apellidos(d.meta.autor)} (${d.meta.anio || "s. f."})` : d.nombre;
    return [["Documento"].concat(categorias)].concat(docs.map(d => [etq(d)].concat(categorias.map(cg => { const f = filas.find(x => x.doc === d && norm(x.categoria) === norm(cg)); return f ? f.postura : ""; }))));
  }

  /* ================= Códigos (como ATLAS.ti) ================= */
  async function codigosVista() {
    const { el, tarjeta } = H();
    const codigos = await todos("codigos"), citas = await todos("citas"), docs = await todos("docs");
    const c = el("div", "inv-cuerpo");
    const fila = el("div", "con-boton"); const iN = el("input", "ajuste"); iN.placeholder = "Nuevo código (ej.: Competencia mal gestionada)";
    const bN = el("button", "boton secundario", "Crear"); bN.onclick = async () => { if (!iN.value.trim()) return; await crearCodigo(iN.value.trim()); codigosVista(); };
    fila.append(iN, bN); c.appendChild(fila);
    const imp = el("div", "inv-acciones");
    const bI = el("button", "enlace-sutil", "Traer las categorías de mi proyecto"); bI.onclick = () => H().ejecutar(importarCategorias);
    imp.appendChild(bI); c.appendChild(imp);
    if (!codigos.length) c.appendChild(el("p", "guia-resumen", "Crea tus códigos o tráelos de tu proyecto. Luego codifica seleccionando texto en el lector, desde una búsqueda o con la IA."));
    codigos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).forEach(cd => {
      const n = citas.filter(x => x.codigos.includes(cd.id)).length;
      const f = el("div", "codigo-fila");
      const pt = el("i", "punto-codigo"); pt.style.background = cd.color;
      const info = el("div", ""); info.append(el("b", "", cd.nombre), el("small", "", `${n} ${n === 1 ? "cita" : "citas"} · ${(() => { const nd = new Set(citas.filter(x => x.codigos.includes(cd.id)).map(x => x.doc)).size; return nd + (nd === 1 ? " documento" : " documentos"); })()}${cd.definicion ? " · " + cd.definicion : ""}`));
      const bV = el("button", "enlace-sutil", "Ver"); bV.onclick = () => reporte(cd.id);
      const bR = el("button", "enlace-sutil", "Renombrar"); bR.onclick = async () => { const v = prompt("Nuevo nombre del código:", cd.nombre); if (v && v.trim()) { cd.nombre = v.trim(); await guardar("codigos", cd); codigosVista(); } };
      const bB = el("button", "enlace-sutil peligro", "Quitar"); bB.onclick = async () => { if (!confirm(`¿Quitar el código «${cd.nombre}»? Las citas quedan sin ese código.`)) return; await borrar("codigos", cd.id); for (const x of citas.filter(x => x.codigos.includes(cd.id))) { x.codigos = x.codigos.filter(k => k !== cd.id); x.codigos.length ? await guardar("citas", x) : await borrar("citas", x.id); } codigosVista(); };
      const a = el("div", "arch-acc"); a.append(bV, bR, bB);
      f.append(pt, info, a); c.appendChild(f);
    });
    if (codigos.length && docs.length) {
      c.appendChild(el("div", "inv-sub", "Codificar con IA"));
      c.appendChild(el("p", "inv-nota", "Romus propone citas para tus códigos; tú aceptas o descartas cada una. Solo se guardan citas que existen literalmente en el documento."));
      const caja = el("div", "arch-docs-sel"); docs.forEach(d => { const l = el("label", ""); const ch = el("input"); ch.type = "checkbox"; ch.checked = true; ch.value = d.id; l.append(ch, document.createTextNode(" " + d.nombre)); caja.appendChild(l); }); c.appendChild(caja);
      const bA = el("button", "boton primario", "Proponer citas para mis códigos"); bA.onclick = () => H().ejecutar(() => autocodificar(Array.from(caja.querySelectorAll("input:checked")).map(x => x.value)));
      c.appendChild(bA);
    }
    const acc = el("div", "inv-acciones");
    const bR = el("button", "boton secundario", "📑 Reporte de códigos"); bR.onclick = () => reporte();
    const bQ = el("button", "boton secundario", "Exportar a ATLAS.ti / NVivo (.qdpx)"); bQ.onclick = () => H().ejecutar(exportarQDPX);
    const bV = el("button", "enlace-sutil", "← Mis documentos"); bV.onclick = () => abrir();
    acc.append(bR, bQ, bV); c.appendChild(acc);
    tarjeta("Códigos", c);
  }
  async function importarCategorias() {
    let cats = [];
    try { const ins = JSON.parse(localStorage.getItem("romus.instrumento." + H().claveDoc()) || "null"); if (ins && ins.categorias) cats = ins.categorias.map(x => [x.categoria + (x.subcategoria ? " · " + x.subcategoria : ""), x.definicion || ""]); } catch (e) { /* sin instrumento */ }
    try { const lib = window.Datos && Datos.ultimoLibro; if (!cats.length && lib && lib.categorias) cats = lib.categorias.flatMap(x => (x.codigos || [x]).map(k => [k.codigo || k.nombre || x.categoria, k.definicion || ""])); } catch (e) { /* sin libro */ }
    if (!cats.length) {
      exigirIA();
      const doc = await H().documentoNumerado();
      const r = await H().pedirHerramienta("proponer_codigos", "Códigos iniciales para analizar documentos según el proyecto.",
        { type: "object", properties: { codigos: { type: "array", items: { type: "object", properties: { nombre: { type: "string" }, definicion: { type: "string" } }, required: ["nombre"] } } }, required: ["codigos"] },
        `Propón entre 5 y 10 códigos (categorías a priori) para analizar documentos según los objetivos y el marco teórico de este proyecto. Nombres breves; definición de una frase.\n\nPROYECTO:\n${doc.texto.slice(0, 20000)}`);
      cats = (r.codigos || []).map(x => [x.nombre, x.definicion || ""]);
    }
    for (const [n, d] of cats) if (n) await crearCodigo(n, d);
    H().ui.confirmar(`Traje ${cats.length} códigos.`);
    codigosVista();
  }
  async function autocodificar(ids) {
    exigirIA();
    const { el, tarjeta } = H();
    const codigos = await todos("codigos"), docs = (await todos("docs")).filter(d => ids.includes(d.id));
    const propuestas = [];
    for (const d of docs) {
      const frs = fragmentos([d]);
      for (let i = 0; i < frs.length; i += 14) {
        const lote = frs.slice(i, i + 14);
        H().ui.ocupar(true, `Leyendo ${d.nombre} (${Math.min(100, Math.round((i + 14) / frs.length * 100))} %)…`);
        const r = await H().pedirHerramienta("codificar_citas", "Citas del documento que corresponden a cada código.",
          { type: "object", properties: { citas: { type: "array", items: { type: "object", properties: { codigo: { type: "string" }, n: { type: "integer" }, cita: { type: "string", description: "Fragmento LITERAL (una o dos oraciones)" }, razon: { type: "string" } }, required: ["codigo", "n", "cita"] } } }, required: ["citas"] },
          `Marca las citas de estos fragmentos que corresponden a alguno de los códigos. Sé selectivo: solo citas claras y relevantes. Copia el texto exacto.

CÓDIGOS:
${codigos.map(x => `- ${x.nombre}${x.definicion ? ": " + x.definicion : ""}`).join("\n")}

FRAGMENTOS (${d.nombre}):
${lote.map((f, k) => `[${k + 1}] ${f.texto}`).join("\n\n")}`);
        (r.citas || []).forEach(x => {
          const f = lote[x.n - 1]; const cd = codigos.find(k => norm(k.nombre) === norm(x.codigo)); if (!f || !cd) return;
          // ubicar el párrafo exacto dentro del fragmento
          const pags = d.paginas.find(p => p.n === f.pag);
          // Si la cita abarca dos párrafos, se usa su trozo más largo que esté completo en un párrafo.
          const trozos = [x.cita].concat(String(x.cita).split(/(?<=[.?!])\s+/).filter(z => z.length >= 25).sort((p1, p2) => p2.length - p1.length));
          let hecho = false;
          for (const cita of trozos) { if (hecho) break; for (let k = f.par; k < pags.parrafos.length; k++) { const t = pags.parrafos[k]; const u = buscarEn(t, cita); if (u && u.fin - u.ini > 8) { if (!propuestas.some(q => q.doc === d && q.pag === f.pag && q.par === k && q.ini === u.ini && q.codigo === cd)) propuestas.push({ doc: d, pag: f.pag, par: k, ini: u.ini, fin: u.fin, texto: t.slice(u.ini, u.fin), codigo: cd, razon: x.razon || "" }); hecho = true; break; } } }
        });
      }
    }
    H().ui.ocupar(false);
    const c = el("div", "inv-cuerpo");
    c.appendChild(el("p", "guia-resumen", propuestas.length ? `Romus propone ${propuestas.length} citas, todas comprobadas en el texto. Desmarca las que no te convenzan y guarda.` : "No encontré citas claras para tus códigos. Prueba con definiciones más precisas."));
    const checks = propuestas.map(p => {
      const l = el("label", "propuesta"); const ch = el("input"); ch.type = "checkbox"; ch.checked = true;
      const t = el("div", ""); const chip = el("b", "chip-codigo activo", p.codigo.nombre); chip.style.borderColor = p.codigo.color;
      t.append(chip, el("code", "", `«${p.texto}»`), el("small", "", `${p.doc.nombre}, ${ref(p.doc, p.pag, indiceGlobal(p.doc, p.pag, p.par))}${p.razon ? " · " + p.razon : ""}`));
      l.append(ch, t); c.appendChild(l); return ch;
    });
    const acc = el("div", "inv-acciones");
    if (propuestas.length) {
      const bG = el("button", "boton primario", "Guardar las citas marcadas");
      bG.onclick = () => H().ejecutar(async () => {
        let n = 0; for (const [k, p] of propuestas.entries()) { if (!checks[k].checked) continue; await guardar("citas", { id: uid("c"), doc: p.doc.id, pag: p.pag, par: p.par, ini: p.ini, fin: p.fin, texto: p.texto, codigos: [p.codigo.id], comentario: p.razon, origen: "ia", fecha: new Date().toISOString() }); n++; }
        H().registrar("Codificación asistida", `${n} citas`, "modelo");
        H().ui.confirmar(`Guardé ${n} citas.`); codigosVista();
      });
      acc.appendChild(bG);
    }
    const bV = el("button", "enlace-sutil", "Volver"); bV.onclick = () => codigosVista(); acc.appendChild(bV);
    c.appendChild(acc);
    tarjeta("Citas propuestas", c);
  }

  /* ================= Reporte de códigos ================= */
  async function reporte(soloCodigo) {
    const { el, tarjeta } = H();
    const codigos = (await todos("codigos")).filter(x => !soloCodigo || x.id === soloCodigo), citas = await todos("citas"), docs = await todos("docs");
    const porId = (id) => docs.find(d => d.id === id);
    const c = el("div", "inv-cuerpo");
    const grupos = codigos.map(cd => ({ cd, cs: citas.filter(x => x.codigos.includes(cd.id) && porId(x.doc)) })).filter(g => g.cs.length);
    if (!grupos.length) c.appendChild(el("p", "guia-resumen", "Aún no hay citas codificadas."));
    grupos.forEach(({ cd, cs }) => {
      const det = el("details", "apa-cat"); det.open = !!soloCodigo;
      const s = el("summary", "", `${cd.nombre} (${cs.length})`); s.style.borderLeft = `4px solid ${cd.color}`; det.appendChild(s);
      cs.forEach(x => { const d = porId(x.doc); const b = el("button", "verif-fila medio"); b.append(el("b", "", `${d.nombre}, ${ref(d, x.pag, indiceGlobal(d, x.pag, x.par))}`), el("span", "", `«${x.texto}»`)); b.onclick = () => leer(d.id, x); det.appendChild(b); });
      c.appendChild(det);
    });
    // Tabla de co-ocurrencia documento × código
    if (grupos.length && docs.length > 1) {
      c.appendChild(el("div", "inv-sub", "Documento × código"));
      const tb = el("table", "tabla-mini"); const tr0 = el("tr"); tr0.appendChild(el("th", "", "Documento")); grupos.forEach(g => tr0.appendChild(el("th", "", g.cd.nombre))); tb.appendChild(tr0);
      docs.forEach(d => { const tr = el("tr"); tr.appendChild(el("td", "", d.nombre)); grupos.forEach(g => tr.appendChild(el("td", "", String(g.cs.filter(x => x.doc === d.id).length || "")))); tb.appendChild(tr); });
      const envol = el("div", "tabla-scroll"); envol.appendChild(tb); c.appendChild(envol);
    }
    const informe = () => grupos.map(({ cd, cs }) => `Código: ${cd.nombre}${cd.definicion ? "\nDefinición: " + cd.definicion : ""}\n` + cs.map((x, k) => { const d = porId(x.doc); return `${k + 1}:${x.par + 1} «${x.texto}» (${d.nombre}, ${ref(d, x.pag, indiceGlobal(d, x.pag, x.par))})`; }).join("\n")).join("\n\n");
    const acc = el("div", "inv-acciones");
    if (grupos.length) {
      const bD = el("button", "boton secundario", "Reporte en Word"); bD.onclick = () => Docx.abrir([{ t: "titulo", texto: "Reporte de códigos y citas" }].concat(grupos.flatMap(({ cd, cs }) => [{ t: "h2", texto: `${cd.nombre} (${cs.length})` }].concat(cd.definicion ? [{ texto: "_" + cd.definicion + "_" }] : []).concat(cs.map(x => { const d = porId(x.doc); return { texto: `«${x.texto}» ${citaAPA(d, ref(d, x.pag, indiceGlobal(d, x.pag, x.par)))}`, justificado: true }; })))), "reporte-codigos.docx", { tam: 11 });
      const bX = el("button", "boton secundario", "Excel"); bX.onclick = () => Docx.descargar("citas-codificadas.xlsx", Datos._xlsx([["Código", "Cita", "Documento", "Ubicación", "Autor y año", "Comentario", "Origen"]].concat(grupos.flatMap(({ cd, cs }) => cs.map(x => { const d = porId(x.doc); return [cd.nombre, x.texto, d.nombre, ref(d, x.pag, indiceGlobal(d, x.pag, x.par)), d.meta.autor ? `${apellidos(d.meta.autor)} (${d.meta.anio || "s. f."})` : "", x.comentario || "", { usuario: "Manual", ia: "IA (aceptada)", busqueda: "Búsqueda" }[x.origen] || ""]; }))), "Citas"));
      const bH = el("button", "boton primario", "Redactar hallazgos"); bH.onclick = () => H().ejecutar(() => Datos.redactarCualitativo(informe()));
      acc.append(bH, bD, bX);
    }
    const bV = el("button", "enlace-sutil", "← Códigos"); bV.onclick = () => codigosVista(); acc.appendChild(bV);
    c.appendChild(acc);
    tarjeta(soloCodigo && codigos[0] ? `Código: ${codigos[0].nombre}` : "Reporte de códigos", c);
  }

  /* ================= Exportar a ATLAS.ti, NVivo o MAXQDA (REFI-QDA .qdpx) ================= */
  const guid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => { const r = Math.random() * 16 | 0; return (ch === "x" ? r : (r & 3 | 8)).toString(16); }).toUpperCase();
  const esc = (t) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  /** Texto plano del documento y posición (en caracteres) de cada párrafo, para ubicar las citas. */
  function textoPlano(d) {
    let t = ""; const pos = {};
    d.paginas.forEach(p => p.parrafos.forEach((x, k) => { pos[p.n + ":" + k] = Array.from(t).length; t += x + "\n"; }));
    return { t, pos };
  }
  async function exportarQDPX() {
    if (!window.JSZip) throw new Error("No pude cargar el compresor de archivos.");
    const docs = await todos("docs"), codigos = await todos("codigos"), citas = await todos("citas");
    const ahora = new Date().toISOString().replace(/\.\d+Z$/, "Z"), usuario = guid();
    const gCod = {}; codigos.forEach(cd => { gCod[cd.id] = guid(); });
    const zip = new JSZip();
    const fuentes = docs.map(d => {
      const g = guid(), { t, pos } = textoPlano(d);
      zip.file(`sources/${g}.txt`, t);
      const sels = citas.filter(x => x.doc === d.id).map(x => {
        const ini = (pos[x.pag + ":" + x.par] || 0) + Array.from(d.paginas.find(p => p.n === x.pag).parrafos[x.par].slice(0, x.ini)).length;
        const fin = ini + Array.from(x.texto).length;
        return `<PlainTextSelection guid="${guid()}" name="${esc(x.texto.slice(0, 60))}" startPosition="${ini}" endPosition="${fin}" creatingUser="${usuario}" creationDateTime="${ahora}">${x.comentario ? `<Description>${esc(x.comentario)}</Description>` : ""}${x.codigos.filter(k => gCod[k]).map(k => `<Coding guid="${guid()}" creatingUser="${usuario}" creationDateTime="${ahora}"><CodeRef targetGUID="${gCod[k]}"/></Coding>`).join("")}</PlainTextSelection>`;
      }).join("");
      return `<TextSource guid="${g}" name="${esc(d.nombre.replace(/\.[^.]+$/, ""))}" plainTextPath="internal://${g}.txt" creatingUser="${usuario}" creationDateTime="${ahora}">${sels}</TextSource>`;
    }).join("");
    const nombre = (Docx.datos().titulo || "Proyecto Romus").slice(0, 80);
    const qde = `<?xml version="1.0" encoding="utf-8"?>
<Project xmlns="urn:QDA-XML:project:1.0" name="${esc(nombre)}" origin="Romus" creationDateTime="${ahora}">
<Users><User guid="${usuario}" name="Romus"/></Users>
<CodeBook><Codes>${codigos.map(cd => `<Code guid="${gCod[cd.id]}" name="${esc(cd.nombre)}" isCodable="true" color="${cd.color}">${cd.definicion ? `<Description>${esc(cd.definicion)}</Description>` : ""}</Code>`).join("")}</Codes></CodeBook>
<Sources>${fuentes}</Sources>
</Project>`;
    zip.file("project.qde", qde);
    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/zip" });
    Docx.descargar("proyecto-romus.qdpx", blob);
    H().registrar("Exportación REFI-QDA", `${docs.length} documentos · ${citas.length} citas`, "documento");
    H().ui.confirmar("Descargué el proyecto .qdpx. En ATLAS.ti: Archivo → Importar → Proyecto REFI-QDA (también lo abren NVivo y MAXQDA).");
  }

  /* ================= Comandos de voz ================= */
  function comando(n, original) {
    const tarea = (fn) => async () => { H().ui.ocupar(true, "Mis documentos…"); try { await fn(); } catch (e) { H().ui.mostrarError(e); } finally { H().ui.ocupar(false); } };
    if (/^((abre|muestra|ver) )?(mis documentos|mis archivos)$|^(carga|cargar|sube|subir|abrir) (un |mis |los )?(documentos?|archivos?|pdfs?)( propios)?$/.test(n)) return tarea(abrir);
    let m = String(original || "").match(/^\s*(?:preg[uú]ntale|pregunta) a (?:mis|los) (?:documentos|archivos)[,:]?\s*(.*)$/i);
    if (m) return tarea(() => preguntar("", m[1].trim()));
    m = String(original || "").match(/^\s*busca en (?:mis|los) (?:documentos|archivos)\s+(.+)$/i);
    if (m) return tarea(() => buscar(m[1].replace(/^(la palabra|el término|sobre)\s+/i, "").trim()));
    if (/^(extrae|extraer|saca) (informacion|datos|citas|la ficha)( de mis documentos)?$/.test(n)) return tarea(() => extraer(/datos/.test(n) ? "datos" : /citas/.test(n) ? "citas" : "ficha"));
    if (/^((mis )?codigos|codifica(r)? (mis )?documentos)$/.test(n)) return tarea(codigosVista);
    if (/^reporte de (codigos|citas)$/.test(n)) return tarea(() => reporte());
    return null;
  }

  return { abrir, cargar, leer, buscar, preguntar, extraer, codigosVista, reporte, exportarQDPX, comando,
    _leerArchivo: leerArchivo, _relevantes: relevantes, _ubicar: ubicar, _buscarEn: buscarEn, _todos: todos, _citaAPA: citaAPA, _textoPlano: textoPlano };
})();
