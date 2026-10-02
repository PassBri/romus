/* Romus · Puente con SPSS y ATLAS.ti.
   - Romus → SPSS: sintaxis (.sps) desde la operacionalización e hipótesis del documento,
     plan de análisis redactado y plantilla de datos (.xlsx). Funciona también en PSPP (gratis).
   - SPSS → Romus: redacta los resultados en APA 7 a partir de la salida pegada y comprueba
     que cada número exista en esa salida.
   - Romus → ATLAS.ti: libro de códigos en Excel (formato de importación de ATLAS.ti) y en
     REFI-QDA (.qdc), que también abren NVivo y MAXQDA.
   - ATLAS.ti → Romus: redacta los resultados cualitativos desde un informe de códigos y citas,
     y comprueba que cada cita sea literal.
   La IA solo extrae y redacta; la sintaxis, los archivos y las verificaciones son deterministas. */
window.Datos = (function () {
  const H = () => Inv._h;
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  let ultimoPlan = null, ultimoLibro = null;

  /* ================= Utilidades de archivos ================= */

  function descargar(nombre, contenido, tipo) {
    const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo || "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nombre; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); return true; } catch (e) { /* WebView sin permiso */ }
    const t = document.createElement("textarea"); t.value = texto; t.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(t); t.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    t.remove(); return ok;
  }

  // ZIP sin compresión (suficiente para .xlsx) con CRC32.
  const TABLA_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABLA_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(archivos) {
    const enc = new TextEncoder(); const partes = []; const central = []; let off = 0;
    const u16 = (v) => [v & 255, (v >>> 8) & 255], u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    archivos.forEach(f => {
      const nombre = enc.encode(f.nombre), datos = typeof f.datos === "string" ? enc.encode(f.datos) : f.datos, crc = crc32(datos);
      const comun = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(datos.length), ...u32(datos.length), ...u16(nombre.length), ...u16(0)];
      const local = Uint8Array.from([...u32(0x04034b50), ...comun]);
      partes.push(local, nombre, datos);
      central.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...comun, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nombre);
      off += local.length + nombre.length + datos.length;
    });
    const tamC = central.reduce((a, x) => a + x.length, 0);
    const fin = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(archivos.length), ...u16(archivos.length), ...u32(tamC), ...u32(off), ...u16(0)]);
    return new Blob([...partes, ...central, fin], { type: "application/zip" });
  }
  const xml = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  function columna(n) { let s = ""; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

  /** Libro de Excel de una hoja. filas: arreglo de arreglos; la primera fila va en negrita. */
  function xlsx(filas, hoja) {
    const M = "http://schemas.openxmlformats.org/spreadsheetml/2006/main", R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships", P = "http://schemas.openxmlformats.org/package/2006/relationships";
    const cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const anchos = (filas[0] || []).map((_, j) => Math.min(60, Math.max(10, ...filas.map(f => String(f[j] == null ? "" : f[j]).length + 2))));
    const datos = filas.map((f, i) => `<row r="${i + 1}">` + f.map((v, j) => {
      const ref = columna(j) + (i + 1), s = i === 0 ? ' s="1"' : "";
      if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
    }).join("") + "</row>").join("");
    return zip([
      { nombre: "[Content_Types].xml", datos: cab + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { nombre: "_rels/.rels", datos: cab + `<Relationships xmlns="${P}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { nombre: "xl/workbook.xml", datos: cab + `<workbook xmlns="${M}" xmlns:r="${R}"><sheets><sheet name="${xml(hoja || "Hoja1")}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
      { nombre: "xl/_rels/workbook.xml.rels", datos: cab + `<Relationships xmlns="${P}"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${R}/styles" Target="styles.xml"/></Relationships>` },
      { nombre: "xl/styles.xml", datos: cab + `<styleSheet xmlns="${M}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
      { nombre: "xl/worksheets/sheet1.xml", datos: cab + `<worksheet xmlns="${M}"><cols>${anchos.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${datos}</sheetData></worksheet>` }
    ]);
  }

  /* ================= Elementos comunes de la interfaz ================= */

  function opcion(ico, titulo, desc, fn) {
    const { el } = H();
    const b = el("button", "asesor-op"); b.append(el("i", "", ico));
    const tx = el("span", ""); tx.append(el("b", "", titulo), el("small", "", desc)); b.appendChild(tx);
    b.onclick = fn; return b;
  }
  function boton(texto, clase, fn) { const b = H().el("button", "boton " + (clase || "secundario"), texto); b.onclick = fn; return b; }
  function exigirIA() {
    if (Config.faltaClave()) { H().ui.mostrarError(new Error("Para esto necesito tu IA conectada. Agrega tu clave en Ajustes (es gratis con Gemini).")); return false; }
    return true;
  }
  function campoPegar(etiquetaTxt, ayuda, filas) {
    const { el } = H();
    const l = el("label", "campo-pro"); l.appendChild(el("span", "", etiquetaTxt));
    const t = el("textarea"); t.rows = filas || 6; t.placeholder = ayuda; l.appendChild(t);
    return { l, t };
  }
  /** Inserta párrafos después del párrafo donde está el cursor. [{texto, estilo}] */
  async function insertarDespuesDelCursor(bloques) {
    await Word.run(async (ctx) => {
      const sel = ctx.document.getSelection();
      const ps = sel.paragraphs; ps.load("items"); await ctx.sync();
      let ref = ps.items[ps.items.length - 1];
      bloques.forEach(b => {
        ref = ref.insertParagraph(b.texto, "After");
        ref.styleBuiltIn = b.estilo || "Normal";
        if (b.sangria) { try { ref.leftIndent = 36; } catch (e) { /* opcional */ } }
      });
      await ctx.sync();
    });
  }

  /* ================= Puertas de entrada ================= */

  /** foco: "cuanti" (SPSS), "cuali" (ATLAS.ti) o nada (ambos). */
  function inicio(foco) {
    const { el, tarjeta } = H();
    const c = el("div", "inv-cuerpo asesor");
    c.appendChild(el("p", "guia-resumen", "Romus conecta tu proyecto con tus programas de análisis: prepara lo que necesitas antes de analizar y, después, redacta los resultados en APA comprobando cada dato."));
    const cuanti = foco !== "cuali", cuali = foco !== "cuanti";
    if (cuanti) {
      c.appendChild(el("div", "inv-sub", "Cuantitativo · SPSS o PSPP"));
      c.appendChild(opcion("📜", "Sintaxis de SPSS desde mi proyecto", "Etiquetas, valores, confiabilidad y una prueba por hipótesis, lista para ejecutar.", () => H().ejecutar(sintaxis)));
      c.appendChild(opcion("📊", "Redactar mis resultados en APA", "Pega las tablas de SPSS y te devuelvo el texto en APA 7, con cada número verificado.", () => resultadosAPA()));
    }
    if (cuali) {
      c.appendChild(el("div", "inv-sub", "Cualitativo · ATLAS.ti"));
      c.appendChild(opcion("🏷️", "Libro de códigos para ATLAS.ti", "Categorías y códigos de tu proyecto en Excel o QDC, listos para importar.", () => H().ejecutar(libroCodigos)));
      c.appendChild(opcion("💬", "Redactar mis resultados cualitativos", "Pega el informe de códigos y citas, y te devuelvo los hallazgos con citas literales verificadas.", () => resultadosCualitativos()));
    }
    if (foco) { const o = el("button", "enlace-sutil", foco === "cuanti" ? "¿Tus datos son cualitativos? Ver ATLAS.ti" : "¿Tus datos son cuantitativos? Ver SPSS"); o.onclick = () => inicio(foco === "cuanti" ? "cuali" : "cuanti"); c.appendChild(o); }
    c.appendChild(el("p", "inv-nota", cuanti ? "¿No tienes SPSS? PSPP es gratuito y ejecuta la misma sintaxis. Romus no sube tus datos: solo trabaja con tu documento y con lo que pegas." : "Romus no sube tus datos: solo trabaja con tu documento y con lo que pegas."));
    tarjeta(foco === "cuanti" ? "SPSS · análisis cuantitativo" : foco === "cuali" ? "ATLAS.ti · análisis cualitativo" : "Analizar mis datos", c);
    H().ui.hablar(foco === "cuanti" ? "Puedo generarte la sintaxis de SPSS desde tu proyecto o redactar tus resultados en APA." : foco === "cuali" ? "Puedo crearte el libro de códigos para ATLAS.ti o redactar tus hallazgos con citas verificadas." : "¿Tus datos son cuantitativos o cualitativos? Puedo prepararte la sintaxis de SPSS o el libro de códigos de ATLAS.ti, y después redactar tus resultados.");
  }

  /* ================= 1. Romus → SPSS: sintaxis ================= */

  const PRUEBAS = {
    descriptivos: { nombre: "estadísticos descriptivos", verbo: "se calcularán estadísticos descriptivos", efecto: "" },
    t_independientes: { nombre: "prueba t de Student para muestras independientes", alt: "U de Mann-Whitney", efecto: "d de Cohen", param: true },
    t_relacionadas: { nombre: "prueba t de Student para muestras relacionadas", alt: "prueba de rangos con signo de Wilcoxon", efecto: "d de Cohen", param: true },
    anova: { nombre: "ANOVA de un factor", verbo: "se aplicará un ANOVA de un factor", alt: "prueba H de Kruskal-Wallis", efecto: "eta cuadrado (η²)", param: true },
    mann_whitney: { nombre: "prueba U de Mann-Whitney", efecto: "r = Z/√N" },
    wilcoxon: { nombre: "prueba de rangos con signo de Wilcoxon", efecto: "r = Z/√N" },
    kruskal_wallis: { nombre: "prueba H de Kruskal-Wallis", efecto: "épsilon cuadrado (ε²)" },
    pearson: { nombre: "correlación de Pearson", alt: "correlación de Spearman", efecto: "el propio coeficiente r", param: true },
    spearman: { nombre: "correlación de Spearman (rho)", efecto: "el propio coeficiente rs" },
    chi_cuadrado: { nombre: "prueba chi cuadrado de independencia", efecto: "V de Cramér" },
    regresion: { nombre: "regresión lineal", verbo: "se ajustará un modelo de regresión lineal", efecto: "R² ajustado", param: true },
    alfa: { nombre: "alfa de Cronbach", verbo: "se calculará el alfa de Cronbach", efecto: "" }
  };
  const NIVELES_MED = { nominal: "NOMINAL", ordinal: "ORDINAL", escala: "SCALE" };
  const RESERVADAS = new Set(["ALL", "AND", "BY", "EQ", "GE", "GT", "LE", "LT", "NE", "NOT", "OR", "TO", "WITH"]);

  function nombreSPSS(s, usados) {
    let n = String(s || "var").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ñ/gi, "n").replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_");
    if (!/^[A-Za-z]/.test(n)) n = "v" + n;
    n = n.slice(0, 32).toLowerCase();
    if (RESERVADAS.has(n.toUpperCase())) n += "_";
    let base = n, k = 2;
    while (usados && usados.has(n)) n = base.slice(0, 29) + "_" + k++;
    if (usados) usados.add(n);
    return n;
  }
  const comilla = (t) => "'" + String(t || "").replace(/[\r\n]+/g, " ").replace(/'/g, "''").slice(0, 250) + "'";
  const comentario = (t) => "* " + String(t || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").replace(/\.\s*$/, "").trim() + ".";
  const num = (v) => { const x = Number(String(v).replace(",", ".")); return isFinite(x) ? x : null; };

  const ESQUEMA_PLAN = {
    type: "object",
    properties: {
      titulo: { type: "string", description: "Título corto del proyecto" },
      variables: { type: "array", description: "Todas las variables que se van a medir (incluye las sociodemográficas y cada ítem de las escalas si están definidos)", items: { type: "object", properties: {
        nombre: { type: "string", description: "Nombre corto para SPSS: minúsculas, sin tildes ni espacios, máx. 12 caracteres (ej.: sexo, edad, grupo, conv_total, p1)" },
        etiqueta: { type: "string", description: "Etiqueta legible (ej.: «Puntaje total de convivencia escolar»)" },
        nivel: { type: "string", enum: ["nominal", "ordinal", "escala"] },
        valores: { type: "array", items: { type: "object", properties: { codigo: { type: "number" }, etiqueta: { type: "string" } }, required: ["codigo", "etiqueta"] }, description: "Códigos numéricos de las categorías (solo nominales y ordinales; para escalas Likert, 1 a 5 con sus etiquetas)" },
        perdido: { type: "number", description: "Código de dato perdido (ej. 99 o 9) o se omite" },
        evidencia: { type: "string", description: "Fragmento LITERAL del documento donde aparece la variable (máx. 15 palabras) o vacío" }
      }, required: ["nombre", "etiqueta", "nivel"] } },
      escalas: { type: "array", description: "Escalas o dimensiones que suman o promedian ítems (deja vacío si el documento no define ítems)", items: { type: "object", properties: {
        nombre: { type: "string" }, etiqueta: { type: "string" }, items: { type: "array", items: { type: "string" }, description: "Nombres de las variables ítem" }, calculo: { type: "string", enum: ["media", "suma"] }
      }, required: ["nombre", "etiqueta", "items"] } },
      analisis: { type: "array", description: "Un análisis por cada hipótesis u objetivo específico cuantitativo", items: { type: "object", properties: {
        proposito: { type: "string", description: "La hipótesis u objetivo, tal como está en el documento (resumido si es largo)" },
        prueba: { type: "string", enum: Object.keys(PRUEBAS) },
        dependiente: { type: "string", description: "Variable dependiente o de resultado (nombre SPSS)" },
        independiente: { type: "string", description: "Variable de agrupación o predictora principal (nombre SPSS)" },
        variables: { type: "array", items: { type: "string" }, description: "Lista de variables cuando la prueba usa varias (correlaciones, descriptivos, pre y post en relacionadas, predictores en regresión, ítems en alfa)" },
        grupos: { type: "array", items: { type: "number" }, description: "Códigos de los dos grupos a comparar en t o Mann-Whitney (ej.: [1, 2])" },
        razon: { type: "string", description: "Por qué esta prueba, en una frase sencilla" }
      }, required: ["proposito", "prueba"] } },
      faltantes: { type: "array", items: { type: "string" }, description: "Lo que el documento no define y el estudiante debe decidir (ej.: códigos de una variable, ítems del instrumento)" }
    },
    required: ["variables", "analisis"]
  };

  async function extraerPlan(signal) {
    const { documentoNumerado, pedirHerramienta } = H();
    const doc = await documentoNumerado();
    const d = await pedirHerramienta("plan_spss", "Variables y plan de análisis estadístico del proyecto, para generar la sintaxis de SPSS.", ESQUEMA_PLAN,
      `Lee el proyecto y extrae su operacionalización: variables, su nivel de medición, sus categorías codificadas y un análisis estadístico adecuado para cada hipótesis u objetivo cuantitativo.
Criterios para elegir la prueba:
- Comparar 2 grupos independientes en una variable de escala → t_independientes; 3 o más grupos → anova.
- Pre y post en los mismos participantes → t_relacionadas (variables: [pre, post]).
- Relación entre dos variables de escala → pearson; si alguna es ordinal → spearman.
- Relación entre dos categóricas → chi_cuadrado (variables: [fila, columna]).
- Predecir una variable de escala con una o varias → regresion.
- Confiabilidad de una escala con ítems → alfa (variables: ítems).
- Objetivos descriptivos → descriptivos.
Usa códigos numéricos convencionales (1, 2, 3…). No inventes ítems que el documento no menciona: si faltan, anótalo en «faltantes».
Nivel: ${Inv.nivel().nombre}. Enfoque: ${Inv.enfoque().nombre}.

DOCUMENTO:
${doc.texto}`, signal);
    return { d, doc };
  }

  /** Construye el plan normalizado (nombres SPSS válidos y referencias resueltas). Determinista. */
  function normalizarPlan(d) {
    const usados = new Set(), mapa = {};
    const variables = (d.variables || []).map(v => {
      const n = nombreSPSS(v.nombre || v.etiqueta, usados);
      mapa[norm(v.nombre)] = n; mapa[norm(n)] = n;
      return { nombre: n, etiqueta: v.etiqueta || n, nivel: NIVELES_MED[v.nivel] ? v.nivel : "escala", valores: (v.valores || []).filter(x => num(x.codigo) != null), perdido: num(v.perdido), evidencia: v.evidencia || "" };
    });
    const escalas = (d.escalas || []).filter(e => (e.items || []).length).map(e => {
      const n = mapa[norm(e.nombre)] || nombreSPSS(e.nombre || e.etiqueta, usados);
      mapa[norm(e.nombre)] = n;
      if (!variables.find(v => v.nombre === n)) variables.push({ nombre: n, etiqueta: e.etiqueta || n, nivel: "escala", valores: [], perdido: null, calculada: true });
      return { nombre: n, etiqueta: e.etiqueta || n, items: e.items.map(i => mapa[norm(i)] || nombreSPSS(i)), calculo: e.calculo === "suma" ? "suma" : "media" };
    });
    const ref = (x) => x ? (mapa[norm(x)] || nombreSPSS(x)) : "";
    const analisis = (d.analisis || []).filter(a => PRUEBAS[a.prueba]).map(a => ({
      proposito: a.proposito || "", prueba: a.prueba, razon: a.razon || "",
      dependiente: ref(a.dependiente), independiente: ref(a.independiente),
      variables: (a.variables || []).map(ref).filter(Boolean), grupos: (a.grupos || []).map(num).filter(x => x != null)
    }));
    return { titulo: d.titulo || "", variables, escalas, analisis, faltantes: d.faltantes || [] };
  }

  const varDe = (plan, n) => plan.variables.find(v => v.nombre === n);
  const etq = (plan, n) => { const v = varDe(plan, n); return v ? v.etiqueta.charAt(0).toLowerCase() + v.etiqueta.slice(1) : n; };
  function codigosDe(plan, n) { const v = varDe(plan, n); return v ? v.valores.map(x => num(x.codigo)).filter(x => x != null).sort((a, b) => a - b) : []; }

  /** Genera el texto de la sintaxis. Compatible con SPSS y PSPP. */
  function construirSintaxis(plan) {
    const L = [];
    const fecha = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
    L.push("* Encoding: UTF-8.",
      "* ==================================================================.",
      comentario("Sintaxis generada por Romus" + (plan.titulo ? " para «" + plan.titulo + "»" : "")),
      comentario("Fecha: " + fecha + ". Revisa nombres y códigos antes de ejecutar"),
      "* Cómo usarla: abre tu base de datos en SPSS o PSPP, luego Archivo > Abrir > Sintaxis,",
      "* selecciona todo (Ctrl+E) y pulsa Ejecutar. Los nombres de las variables de tu base",
      "* deben coincidir con los de esta sintaxis.",
      "* ==================================================================.", "");
    const reales = plan.variables.filter(v => !v.calculada);
    // 1. Diccionario
    if (plan.variables.length) {
      L.push("* ---------- 1. Diccionario de variables ----------.", "VARIABLE LABELS");
      reales.forEach((v, i) => L.push((i ? "  /" : "  ") + v.nombre + " " + comilla(v.etiqueta)));
      L[L.length - 1] += ".";
      const conValores = reales.filter(v => v.valores.length);
      if (conValores.length) {
        L.push("VALUE LABELS");
        conValores.forEach((v, i) => L.push((i ? "  /" : "  ") + v.nombre + " " + v.valores.map(x => num(x.codigo) + " " + comilla(x.etiqueta)).join(" ")));
        L[L.length - 1] += ".";
      }
      const perd = reales.filter(v => v.perdido != null);
      if (perd.length) L.push("MISSING VALUES " + perd.map(v => `${v.nombre} (${v.perdido})`).join(" /") + ".");
      const porNivel = {};
      reales.forEach(v => { (porNivel[v.nivel] = porNivel[v.nivel] || []).push(v.nombre); });
      const niv = Object.keys(porNivel).map(k => porNivel[k].join(" ") + " (" + NIVELES_MED[k] + ")");
      if (niv.length) L.push("VARIABLE LEVEL " + niv.join(" /") + ".");
      L.push("");
    }
    // 2. Escalas: puntajes y confiabilidad
    if (plan.escalas.length) {
      L.push("* ---------- 2. Puntajes de las escalas y confiabilidad ----------.");
      plan.escalas.forEach(e => {
        L.push(comentario(`${e.etiqueta}: ${e.calculo === "suma" ? "suma" : "promedio"} de ${e.items.length} ítems`));
        L.push(`COMPUTE ${e.nombre} = ${e.calculo === "suma" ? "SUM" : "MEAN"}(${e.items.join(", ")}).`);
        L.push(`VARIABLE LABELS ${e.nombre} ${comilla(e.etiqueta)}.`);
        L.push("EXECUTE.");
        L.push(`RELIABILITY /VARIABLES=${e.items.join(" ")}`, `  /SCALE(${comilla(e.etiqueta.slice(0, 60))}) ALL`, "  /MODEL=ALPHA", "  /SUMMARY=TOTAL.", "");
      });
    }
    // 3. Descripción de la muestra
    const cat = plan.variables.filter(v => v.nivel !== "escala").map(v => v.nombre);
    const esc = plan.variables.filter(v => v.nivel === "escala" && !plan.escalas.some(e => e.items.includes(v.nombre))).map(v => v.nombre);
    L.push("* ---------- 3. Descripción de la muestra ----------.");
    if (cat.length) L.push(`FREQUENCIES VARIABLES=${cat.join(" ")}`, "  /ORDER=ANALYSIS.");
    if (esc.length) L.push(`DESCRIPTIVES VARIABLES=${esc.join(" ")}`, "  /STATISTICS=MEAN STDDEV MIN MAX.");
    L.push("");
    // 4. Normalidad (solo si hay pruebas paramétricas)
    const param = plan.analisis.filter(a => PRUEBAS[a.prueba].param);
    if (param.length) {
      L.push("* ---------- 4. Supuesto de normalidad ----------.",
        "* Shapiro-Wilk si n <= 50; Kolmogorov-Smirnov si n > 50. Si p < .05 en algún grupo,",
        "* usa la alternativa no paramétrica que aparece comentada bajo cada prueba.");
      const ya = new Set();
      param.forEach(a => {
        const ys = a.prueba === "t_relacionadas" || a.prueba === "pearson" ? (a.variables.length ? a.variables : [a.dependiente, a.independiente].filter(Boolean)) : [a.dependiente || a.variables[0]].filter(Boolean);
        const g = (a.prueba === "t_independientes" || a.prueba === "anova") && a.independiente ? " BY " + a.independiente : "";
        const clave = ys.join(" ") + g;
        if (!ys.length || ya.has(clave)) return; ya.add(clave);
        L.push(`EXAMINE VARIABLES=${ys.join(" ")}${g}`, "  /PLOT NPPLOT", "  /STATISTICS DESCRIPTIVES.");
      });
      L.push("");
    }
    // 5. Pruebas por hipótesis u objetivo
    L.push("* ---------- 5. Análisis por hipótesis u objetivo ----------.");
    plan.analisis.forEach((a, k) => {
      const p = PRUEBAS[a.prueba];
      L.push("", comentario(`Análisis ${k + 1}: ${a.proposito}`), comentario("Prueba: " + p.nombre));
      const y = a.dependiente || a.variables[0], x = a.independiente || a.variables[1], vs = a.variables.length ? a.variables : [y, x].filter(Boolean);
      const falta = (que) => L.push(comentario(`Revisa: falta ${que}. Complétalo y quita el asterisco de la línea siguiente`));
      let gr = a.grupos.length >= 2 ? a.grupos.slice(0, 2) : codigosDe(plan, x).slice(0, 2);
      switch (a.prueba) {
        case "descriptivos": {
          const c = vs.filter(n => (varDe(plan, n) || {}).nivel !== "escala"), e = vs.filter(n => (varDe(plan, n) || {}).nivel === "escala");
          if (c.length) L.push(`FREQUENCIES VARIABLES=${c.join(" ")}`, "  /ORDER=ANALYSIS.");
          if (e.length) L.push(`DESCRIPTIVES VARIABLES=${e.join(" ")}`, "  /STATISTICS=MEAN STDDEV MIN MAX.");
          if (!c.length && !e.length) falta("la lista de variables");
          break;
        }
        case "t_independientes":
        case "mann_whitney": {
          if (gr.length < 2) { falta(`los códigos de los dos grupos de ${x || "la variable de agrupación"}`); gr = [1, 2]; }
          if (a.prueba === "t_independientes") {
            L.push(`T-TEST GROUPS=${x}(${gr[0]} ${gr[1]})`, `  /VARIABLES=${y}`, "  /CRITERIA=CI(.95).");
            L.push("* Tamaño del efecto: en SPSS 27 o superior añade la línea /ES DISPLAY(TRUE) antes del punto.");
            L.push("* Alternativa no paramétrica:", `* NPAR TESTS /M-W=${y} BY ${x}(${gr[0]} ${gr[1]}).`);
          } else L.push(`NPAR TESTS /M-W=${y} BY ${x}(${gr[0]} ${gr[1]}).`);
          break;
        }
        case "t_relacionadas":
        case "wilcoxon": {
          const [pre, post] = vs.length >= 2 ? vs : [y, x];
          if (!pre || !post) { falta("las variables pre y post"); break; }
          if (a.prueba === "t_relacionadas") {
            L.push(`T-TEST PAIRS=${pre} WITH ${post} (PAIRED)`, "  /CRITERIA=CI(.95).");
            L.push("* Tamaño del efecto: en SPSS 27 o superior añade la línea /ES DISPLAY(TRUE) antes del punto.");
            L.push("* Alternativa no paramétrica:", `* NPAR TESTS /WILCOXON=${pre} WITH ${post} (PAIRED).`);
          } else L.push(`NPAR TESTS /WILCOXON=${pre} WITH ${post} (PAIRED).`);
          break;
        }
        case "anova":
        case "kruskal_wallis": {
          const cods = codigosDe(plan, x); const mn = cods.length ? cods[0] : 1, mx = cods.length ? cods[cods.length - 1] : 3;
          if (!cods.length) falta(`los códigos de los grupos de ${x || "la variable de agrupación"}`);
          if (a.prueba === "anova") {
            L.push(`ONEWAY ${y} BY ${x}`, "  /STATISTICS DESCRIPTIVES HOMOGENEITY", "  /POSTHOC=TUKEY ALPHA(0.05).");
            L.push("* Alternativa no paramétrica:", `* NPAR TESTS /K-W=${y} BY ${x}(${mn} ${mx}).`);
          } else L.push(`NPAR TESTS /K-W=${y} BY ${x}(${mn} ${mx}).`);
          break;
        }
        case "pearson":
          if (vs.length < 2) { falta("las dos variables a correlacionar"); break; }
          L.push(`CORRELATIONS /VARIABLES=${vs.join(" ")}`, "  /PRINT=TWOTAIL NOSIG", "  /STATISTICS DESCRIPTIVES.");
          L.push("* Alternativa no paramétrica:", `* NONPAR CORR /VARIABLES=${vs.join(" ")} /PRINT=SPEARMAN TWOTAIL NOSIG.`);
          break;
        case "spearman":
          if (vs.length < 2) { falta("las dos variables a correlacionar"); break; }
          L.push(`NONPAR CORR /VARIABLES=${vs.join(" ")}`, "  /PRINT=SPEARMAN TWOTAIL NOSIG.");
          break;
        case "chi_cuadrado":
          if (vs.length < 2) { falta("las dos variables categóricas"); break; }
          L.push(`CROSSTABS /TABLES=${vs[0]} BY ${vs[1]}`, "  /STATISTICS=CHISQ PHI", "  /CELLS=COUNT ROW EXPECTED.");
          L.push("* Si más del 20 % de las frecuencias esperadas es menor que 5, informa la prueba exacta de Fisher.");
          break;
        case "regresion": {
          const preds = a.variables.filter(n => n !== y);
          if (!y || !(preds.length || x)) { falta("la variable dependiente o los predictores"); break; }
          L.push("REGRESSION", "  /STATISTICS COEFF R ANOVA", `  /DEPENDENT ${y}`, `  /METHOD=ENTER ${(preds.length ? preds : [x]).join(" ")}.`);
          break;
        }
        case "alfa":
          if (vs.length < 2) { falta("los ítems de la escala"); break; }
          L.push(`RELIABILITY /VARIABLES=${vs.join(" ")}`, "  /SCALE('Escala') ALL", "  /MODEL=ALPHA", "  /SUMMARY=TOTAL.");
          break;
      }
    });
    L.push("", "* Fin de la sintaxis. Cuando tengas la salida, pídele a Romus: «redacta los resultados en APA».");
    return L.join("\r\n") + "\r\n";
  }

  /** Script equivalente en R (funciona en RStudio y en jamovi con el módulo Rj). Determinista. */
  function construirR(plan) {
    const L = [], q = (t) => '"' + String(t || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    const lab = {};
    plan.variables.forEach(v => { if (v.valores.length) lab[v.nombre] = v.valores; });
    const nivelesDe = (n, cods) => (lab[n] || []).filter(x => !cods || cods.includes(num(x.codigo))).map(x => q(x.etiqueta));
    L.push("# ==================================================================",
      "# Script de análisis generado por Romus" + (plan.titulo ? " para «" + plan.titulo + "»" : ""),
      "# Funciona en R/RStudio y en jamovi (módulo «Rj Editor»). Revisa nombres y códigos.",
      "# ==================================================================", "",
      "# Paquetes (instálalos solo la primera vez):",
      "# install.packages(c(\"readxl\", \"psych\"))",
      "library(readxl)", "",
      "# ---------- 1. Leer los datos ----------",
      "# Elige tu archivo de Excel (.xlsx). Si es CSV, usa: datos <- read.csv(file.choose(), fileEncoding = \"UTF-8\")",
      "datos <- as.data.frame(read_excel(file.choose()))", "");
    const perd = plan.variables.filter(v => !v.calculada && v.perdido != null);
    if (perd.length) { L.push("# ---------- 2. Datos perdidos ----------"); perd.forEach(v => L.push(`datos$${v.nombre}[datos$${v.nombre} == ${v.perdido}] <- NA`)); L.push(""); }
    if (plan.escalas.length) {
      L.push("# ---------- 3. Puntajes de las escalas y confiabilidad ----------");
      plan.escalas.forEach(e => {
        const it = "c(" + e.items.map(q).join(", ") + ")";
        L.push(`# ${e.etiqueta}`, `datos$${e.nombre} <- ${e.calculo === "suma" ? "rowSums" : "rowMeans"}(datos[, ${it}], na.rm = TRUE)`);
        L.push(`if (requireNamespace("psych", quietly = TRUE)) print(psych::alpha(datos[, ${it}])$total)`);
      });
      L.push("");
    }
    // Factores con etiquetas (se crean como columnas nuevas para conservar los códigos)
    const cat = plan.variables.filter(v => v.nivel === "nominal" && lab[v.nombre]);
    if (cat.length) {
      L.push("# ---------- 4. Etiquetas de las variables categóricas ----------");
      cat.forEach(v => L.push(`datos$${v.nombre}_f <- factor(datos$${v.nombre}, levels = c(${lab[v.nombre].map(x => num(x.codigo)).join(", ")}), labels = c(${nivelesDe(v.nombre).join(", ")}))`));
      L.push("");
    }
    const fac = (n) => cat.some(v => v.nombre === n) ? n + "_f" : n;
    L.push("# ---------- 5. Descripción de la muestra ----------",
      "describir <- function(x) c(n = sum(!is.na(x)), M = mean(x, na.rm = TRUE), DE = sd(x, na.rm = TRUE), Min = min(x, na.rm = TRUE), Max = max(x, na.rm = TRUE))");
    plan.variables.filter(v => v.nivel !== "escala").forEach(v => L.push(`print(table(datos$${fac(v.nombre)}, useNA = "ifany")); print(round(prop.table(table(datos$${fac(v.nombre)})) * 100, 1))`));
    const esc = plan.variables.filter(v => v.nivel === "escala").map(v => v.nombre);
    if (esc.length) L.push(`print(round(sapply(datos[, c(${esc.map(q).join(", ")}), drop = FALSE], describir), 2))`);
    L.push("", "# Tamaños del efecto",
      "d_cohen <- function(x, y) { nx <- sum(!is.na(x)); ny <- sum(!is.na(y)); sp <- sqrt(((nx - 1) * var(x, na.rm = TRUE) + (ny - 1) * var(y, na.rm = TRUE)) / (nx + ny - 2)); (mean(x, na.rm = TRUE) - mean(y, na.rm = TRUE)) / sp }",
      "v_cramer <- function(tabla) { chi <- suppressWarnings(chisq.test(tabla, correct = FALSE)); sqrt(unname(chi$statistic) / (sum(tabla) * (min(dim(tabla)) - 1))) }", "");
    L.push("# ---------- 6. Análisis por hipótesis u objetivo ----------");
    plan.analisis.forEach((a, k) => {
      const y = a.dependiente || a.variables[0], x = a.independiente || a.variables[1], vs = a.variables.length ? a.variables : [y, x].filter(Boolean);
      L.push("", `# Análisis ${k + 1}: ${String(a.proposito).replace(/\n/g, " ")}`, `# Prueba: ${PRUEBAS[a.prueba].nombre}`);
      const gr = a.grupos.length >= 2 ? a.grupos.slice(0, 2) : codigosDe(plan, x).slice(0, 2);
      switch (a.prueba) {
        case "descriptivos": vs.forEach(n => L.push((varDe(plan, n) || {}).nivel === "escala" ? `print(round(describir(datos$${n}), 2))` : `print(table(datos$${fac(n)}))`)); break;
        case "t_independientes": case "mann_whitney": {
          const g = gr.length === 2 ? gr : [1, 2];
          L.push(`sub <- subset(datos, ${x} %in% c(${g.join(", ")}))`, `g1 <- sub$${y}[sub$${x} == ${g[0]}]; g2 <- sub$${y}[sub$${x} == ${g[1]}]`);
          if (a.prueba === "t_independientes") L.push("print(shapiro.test(g1)); print(shapiro.test(g2))  # normalidad por grupo", "print(var.test(g1, g2))  # homogeneidad de varianzas", "print(t.test(g1, g2, var.equal = TRUE))  # si var.test da p < .05, usa var.equal = FALSE (Welch)", "cat(\"d de Cohen:\", round(d_cohen(g1, g2), 2), \"\\n\")", "# Alternativa no paramétrica:", "# print(wilcox.test(g1, g2))");
          else L.push("print(wilcox.test(g1, g2))");
          break;
        }
        case "t_relacionadas": case "wilcoxon": {
          const [pre, post] = vs.length >= 2 ? vs : [y, x];
          if (a.prueba === "t_relacionadas") L.push(`dif <- datos$${post} - datos$${pre}`, "print(shapiro.test(dif))", `print(t.test(datos$${post}, datos$${pre}, paired = TRUE))`, "cat(\"d de Cohen (dz):\", round(mean(dif, na.rm = TRUE) / sd(dif, na.rm = TRUE), 2), \"\\n\")", "# Alternativa no paramétrica:", `# print(wilcox.test(datos$${post}, datos$${pre}, paired = TRUE))`);
          else L.push(`print(wilcox.test(datos$${post}, datos$${pre}, paired = TRUE))`);
          break;
        }
        case "anova": case "kruskal_wallis":
          if (a.prueba === "anova") L.push(`modelo <- aov(${y} ~ factor(${x}), data = datos)`, "print(summary(modelo))", "print(TukeyHSD(modelo))", "ss <- summary(modelo)[[1]][[\"Sum Sq\"]]; cat(\"eta cuadrado:\", round(ss[1] / sum(ss), 3), \"\\n\")", "# Alternativa no paramétrica:", `# print(kruskal.test(${y} ~ factor(${x}), data = datos))`);
          else L.push(`print(kruskal.test(${y} ~ factor(${x}), data = datos))`);
          break;
        case "pearson": L.push(`print(cor.test(datos$${vs[0]}, datos$${vs[1]}, method = "pearson"))`, "# Alternativa no paramétrica:", `# print(cor.test(datos$${vs[0]}, datos$${vs[1]}, method = "spearman", exact = FALSE))`); break;
        case "spearman": L.push(`print(cor.test(datos$${vs[0]}, datos$${vs[1]}, method = "spearman", exact = FALSE))`); break;
        case "chi_cuadrado": L.push(`tabla <- table(datos$${fac(vs[0])}, datos$${fac(vs[1])})`, "print(tabla)", "prueba <- chisq.test(tabla, correct = FALSE); print(prueba)", "print(round(prueba$expected, 2))  # si más del 20 % es < 5, usa fisher.test(tabla)", "cat(\"V de Cramér:\", round(v_cramer(tabla), 3), \"\\n\")"); break;
        case "regresion": { const preds = a.variables.filter(n => n !== y); L.push(`print(summary(lm(${y} ~ ${(preds.length ? preds : [x]).join(" + ")}, data = datos)))`); break; }
        case "alfa": L.push(`if (requireNamespace("psych", quietly = TRUE)) print(psych::alpha(datos[, c(${vs.map(q).join(", ")})]))`); break;
      }
    });
    L.push("", "# Cuando tengas los resultados, copia la salida y pídele a Romus: «redacta los resultados en APA».");
    return L.join("\n") + "\n";
  }

  /** Párrafos del plan de análisis para el documento. Determinista. */
  function textoPlan(plan) {
    const P = [];
    const tieneCat = plan.variables.some(v => v.nivel !== "escala"), tieneEsc = plan.variables.some(v => v.nivel === "escala");
    let intro = "Los datos se analizarán con IBM SPSS Statistics (o con PSPP, su alternativa libre). ";
    if (tieneCat || tieneEsc) intro += "Primero se describirá la muestra" + (tieneCat ? " con frecuencias y porcentajes para las variables categóricas" : "") + (tieneCat && tieneEsc ? " y" : "") + (tieneEsc ? " con media y desviación estándar para las variables cuantitativas" : "") + ". ";
    if (plan.escalas.length) intro += "La confiabilidad de " + plan.escalas.map(e => e.etiqueta.charAt(0).toLowerCase() + e.etiqueta.slice(1)).join(", ") + " se estimará con el alfa de Cronbach. ";
    if (plan.analisis.some(a => PRUEBAS[a.prueba].param)) intro += "Antes de las pruebas inferenciales se verificará el supuesto de normalidad con la prueba de Shapiro-Wilk (o de Kolmogorov-Smirnov si n > 50); si no se cumple, se usará la alternativa no paramétrica indicada. ";
    intro += "Para todas las pruebas se adoptará un nivel de significancia de α = .05.";
    P.push(intro);
    plan.analisis.forEach(a => {
      const p = PRUEBAS[a.prueba];
      const y = a.dependiente || a.variables[0], x = a.independiente || a.variables[1];
      let que = "";
      if (/^t_ind|mann|anova|kruskal/.test(a.prueba) && y && x) que = `, comparando ${etq(plan, y)} según ${etq(plan, x)}`;
      else if (/^t_rel|wilcoxon/.test(a.prueba)) que = `, comparando ${etq(plan, a.variables[0] || y)} y ${etq(plan, a.variables[1] || x)}`;
      else if (/pearson|spearman|chi/.test(a.prueba) && a.variables.length >= 2) que = `, entre ${etq(plan, a.variables[0])} y ${etq(plan, a.variables[1])}`;
      else if (a.prueba === "regresion" && y) que = `, con ${etq(plan, y)} como variable dependiente`;
      const prop = String(a.proposito || "").replace(/\.\s*$/, "");
      let t = `Para ${prop ? "«" + prop + "»" : "este análisis"} ${p.verbo || "se aplicará la " + p.nombre}${que}.`;
      if (p.alt) t += ` Si no se cumplen sus supuestos, se usará la ${p.alt}.`;
      if (p.efecto) t += ` El tamaño del efecto se informará con ${p.efecto}.`;
      P.push(t);
    });
    return P;
  }

  async function sintaxis(signal) {
    if (!exigirIA()) return;
    const { el, tarjeta, etiqueta, registrar, verificar, irA } = H();
    const ui = H().ui;
    const { d, doc } = await extraerPlan(signal);
    const plan = normalizarPlan(d);
    ultimoPlan = plan;
    if (!plan.variables.length) throw new Error("No encontré variables en tu documento. Escribe primero la operacionalización (variables, dimensiones e indicadores) o las hipótesis.");
    const sps = construirSintaxis(plan);
    registrar("Sintaxis de SPSS", plan.variables.length + " variables, " + plan.analisis.length + " análisis", "modelo");

    const c = el("div", "inv-cuerpo datos");
    c.appendChild(etiqueta("modelo", "variables leídas por la IA · la sintaxis la arma Romus"));
    c.appendChild(el("p", "guia-resumen", `Encontré ${plan.variables.length} variables y ${plan.analisis.length} análisis. Revisa que los nombres coincidan con las columnas de tu base de datos.`));
    // Variables
    c.appendChild(el("div", "inv-sub", "Variables"));
    const tv = el("div", "datos-vars");
    plan.variables.forEach(v => {
      const f = el("div", "datos-var");
      const i = v.evidencia ? verificar(v.evidencia, doc.parrafos) : -1;
      f.append(el("code", "", v.nombre), el("span", "", v.etiqueta), el("small", "nivel-" + v.nivel, v.calculada ? "calculada" : v.nivel));
      if (i >= 0) { const b = el("button", "enlace-sutil", "✓ en tu doc"); b.title = "Ver dónde aparece"; b.onclick = () => irA(i); f.appendChild(b); }
      tv.appendChild(f);
    });
    c.appendChild(tv);
    // Análisis
    if (plan.analisis.length) {
      c.appendChild(el("div", "inv-sub", "Análisis"));
      const ol = el("ol", "guia-puntos");
      plan.analisis.forEach(a => { const li = el("li", ""); li.append(el("b", "", PRUEBAS[a.prueba].nombre.replace(/^./, m => m.toUpperCase())), document.createTextNode(" · " + a.proposito + (a.razon ? " — " + a.razon : ""))); ol.appendChild(li); });
      c.appendChild(ol);
    }
    if (plan.faltantes.length) {
      const f = el("div", "guia-caja error"); f.appendChild(el("b", "", "Debes decidir tú"));
      const ul = el("ul", "guia-puntos"); plan.faltantes.forEach(x => ul.appendChild(el("li", "", x))); f.appendChild(ul); c.appendChild(f);
    }
    // Sintaxis
    const det = el("details", "datos-codigo"); det.open = true;
    det.appendChild(el("summary", "", "Sintaxis (.sps)"));
    const pre = el("pre", "", sps); det.appendChild(pre); c.appendChild(det);
    const acc = el("div", "inv-acciones");
    acc.append(
      boton("Copiar sintaxis", "primario", async (e) => { const ok = await copiar(sps); e.target.textContent = ok ? "¡Copiada!" : "Selecciónala y copia"; }),
      boton("Descargar .sps", "", () => descargar("romus-analisis.sps", "﻿" + sps, "text/plain;charset=utf-8")),
      boton("Plantilla de datos (.xlsx)", "", () => descargar("romus-base-de-datos.xlsx", xlsx([plan.variables.filter(v => !v.calculada).map(v => v.nombre)], "datos"))),
      boton("Script de R / jamovi", "", () => descargar("romus-analisis.R", construirR(plan), "text/plain;charset=utf-8"))
    );
    c.appendChild(acc);
    const acc2 = el("div", "inv-acciones");
    acc2.append(boton("Insertar plan de análisis en el documento", "", () => H().ejecutar(() => insertarPlan(plan))));
    c.appendChild(acc2);
    c.appendChild(el("p", "inv-nota", "En SPSS: abre tu base, Archivo > Nueva > Sintaxis, pega, Ctrl+E y Ejecutar. La plantilla trae una columna por variable: llénala con un participante por fila y ábrela en SPSS. Si la descarga no arranca, usa «Copiar»."));
    tarjeta("Sintaxis de SPSS", c);
    ui.hablar(`Listo. Preparé la sintaxis con ${plan.variables.length} variables y ${plan.analisis.length} análisis. Revisa los nombres y cópiala en SPSS.`);
  }

  async function insertarPlan(plan) {
    const parrafos = textoPlan(plan);
    const filas = [["Variable", "Etiqueta", "Nivel", "Valores"]].concat(plan.variables.map(v => [v.nombre, v.etiqueta, v.calculada ? "escala (calculada)" : v.nivel, v.valores.map(x => `${x.codigo} = ${x.etiqueta}`).join("; ") || "—"]));
    await Word.run(async (ctx) => {
      const sel = ctx.document.getSelection();
      const ps = sel.paragraphs; ps.load("items"); await ctx.sync();
      let ref = ps.items[ps.items.length - 1];
      ref = ref.insertParagraph("Plan de análisis de datos", "After"); ref.styleBuiltIn = "Heading2";
      parrafos.forEach(t => { ref = ref.insertParagraph(t, "After"); ref.styleBuiltIn = "Normal"; });
      ref = ref.insertParagraph("Libro de códigos", "After"); ref.styleBuiltIn = "Heading3";
      try { ref.insertTable(filas.length, 4, "After", filas); } catch (e) { filas.slice(1).forEach(f => { ref = ref.insertParagraph(f.join(" · "), "After"); }); }
      await ctx.sync();
    });
    H().registrar("Plan de análisis insertado", plan.analisis.length + " análisis", "plantilla");
    H().ui.confirmar("Agregué el plan de análisis y el libro de códigos después del cursor.");
  }

  /* ================= 2. SPSS → Romus: resultados en APA ================= */

  /** Números de la salida de SPSS (acepta coma o punto decimal). */
  function numerosFuente(t) {
    const set = [];
    (String(t).replace(/−/g, "-").match(/-?\d[\d.,]*|-?[.,]\d+/g) || []).forEach(s => {
      let x = s.replace(/[.,]$/, "");
      const cands = [];
      if (/,/.test(x) && /\./.test(x)) cands.push(x.lastIndexOf(",") > x.lastIndexOf(".") ? x.replace(/\./g, "").replace(",", ".") : x.replace(/,/g, ""));
      else if (/,/.test(x)) { cands.push(x.replace(",", ".")); if (/^\d{1,3}(,\d{3})+$/.test(x)) cands.push(x.replace(/,/g, "")); }
      else cands.push(x);
      cands.forEach(c => { const v = Number(c); if (isFinite(v)) set.push(v); });
    });
    return set;
  }
  const UMBRALES = new Set([0.05, 0.01, 0.001, 95, 99, 90]);
  /** Revisa cada número estadístico del texto (con punto decimal) contra la salida. */
  function verificarNumeros(texto, fuente) {
    const vals = numerosFuente(fuente);
    const revisados = [], malos = [];
    const re = /(=|<|>|\(|\[)?\s?(-?\d*\.\d+|-?\d+)/g; let m;
    while ((m = re.exec(texto))) {
      const s = m[2], antes = texto[m.index - 1] || "";
      if (/[A-Za-zÁÉÍÓÚáéíóúñ_]/.test(antes) && !m[1]) continue; // H1, R2…
      const decimal = s.includes(".");
      if (!decimal && !m[1]) continue; // números sueltos (años, «tabla 2», «3 grupos»)
      const x = Number(s); if (!isFinite(x)) continue;
      if (UMBRALES.has(Math.abs(x)) && /[<>=]\s?$|IC|α/.test(texto.slice(Math.max(0, m.index - 6), m.index + 1))) continue;
      const k = decimal ? s.split(".")[1].length : 0;
      const f = Math.pow(10, k);
      const esGl = m[1] === "(" && /[A-Za-zχ²]\s?$/.test(texto.slice(Math.max(0, m.index - 3), m.index));
      const ok = (esGl && !decimal && vals.some(v => Number.isInteger(v) && (v === x || v - 1 === x || v - 2 === x))) || vals.some(v => Math.abs(Math.round(v * f) / f - x) < 1e-9 || Math.abs(Math.round(Math.abs(v) * f) / f - Math.abs(x)) < 1e-9 || (k === 3 && x === 0.001 && Math.abs(v) < 0.001));
      revisados.push(s);
      if (!ok) malos.push({ numero: s, contexto: texto.slice(Math.max(0, m.index - 28), Math.min(texto.length, m.index + m[0].length + 8)).trim() });
    }
    return { total: revisados.length, malos };
  }
  /** Ajustes de estilo APA deterministas sobre texto con punto decimal. */
  function pulirAPA(t) {
    return String(t)
      .replace(/\s*([=<>])\s*(?=[-−]?[.\d])/g, " $1 ")
      .replace(/\bp\s*=\s*0?\.000\b/g, "p < .001")
      .replace(/(^|[\s(])(p|r|rs|rho|α|β|R²|R2|η²|ηp²|ε²|V|φ)(\s?\(\d+\))?\s*([=<>])\s*(-?)0\.(\d)/g, "$1$2$3 $4 $5.$6")
      .replace(/ {2,}/g, " ");
  }
  /** Convierte a coma decimal (norma frecuente en Latinoamérica): t(58) = 2,41; p = ,019. */
  function aComa(t) {
    return String(t)
      .replace(/(\d|\))\s*,\s+(?=[A-Za-zα-ωχηεφρΗ][\w²]{0,3}\s*(?:\([^)]{0,14}\))?\s*[=<>])/g, "$1; ")
      .replace(/(\d)\.(\d)/g, "$1,$2")
      .replace(/([\s=<>(\[−-])\.(\d)/g, "$1,$2");
  }

  function resultadosAPA(textoInicial) {
    const { el, tarjeta } = H();
    const c = el("div", "inv-cuerpo datos");
    c.appendChild(el("p", "guia-resumen", "Pega aquí las tablas de tu salida de SPSS. Te devuelvo los resultados redactados en APA 7 y compruebo que cada número salga de tu salida."));
    const pasos = el("ol", "guia-puntos");
    ["En el visor de SPSS, haz clic derecho sobre la tabla → Copiar.", "Pégala abajo (puedes pegar varias tablas seguidas).", "O pega las tablas en Word, selecciónalas y pulsa «Usar mi selección»."].forEach(x => pasos.appendChild(el("li", "", x)));
    c.appendChild(pasos);
    const { l, t } = campoPegar("Salida de SPSS", "Prueba de muestras independientes…\nt  gl  Sig. (bilateral)…", 7);
    if (textoInicial) t.value = textoInicial;
    c.appendChild(l);
    const fila = el("div", "inv-acciones");
    const sel = el("select", "ajuste"); [["coma", "Decimales con coma (2,41)"], ["punto", "Decimales con punto (2.41)"]].forEach(([v, x]) => { const o = el("option", "", x); o.value = v; sel.appendChild(o); });
    sel.value = Config.get().decimalAPA || "coma";
    sel.onchange = () => Config.set({ decimalAPA: sel.value });
    fila.appendChild(sel); c.appendChild(fila);
    const acc = el("div", "inv-acciones");
    acc.append(
      boton("Redactar en APA", "primario", () => { if (!t.value.trim()) { t.focus(); return; } H().ejecutar(() => redactarAPA(t.value, sel.value)); }),
      boton("Usar mi selección", "", async () => { try { const s = await Doc.leerSeleccion(); if (s.hay) t.value = s.texto; else H().ui.hablar("Primero selecciona en Word las tablas pegadas."); } catch (e) { H().ui.mostrarError(e); } })
    );
    c.appendChild(acc);
    tarjeta("Resultados en APA desde SPSS", c);
    H().ui.hablar("Pega las tablas de SPSS y pulsa redactar.");
  }

  async function redactarAPA(fuente, decimal, signal) {
    if (!exigirIA()) return;
    const { el, tarjeta, etiqueta, registrar, pedirHerramienta, documentoNumerado } = H();
    const ui = H().ui;
    let contexto = "";
    try { const doc = await documentoNumerado(); contexto = doc.parrafos.filter(p => /hip[oó]tesis|objetivo|H\d|pregunta/i.test(p.texto)).map(p => p.texto).join("\n").slice(0, 5000); } catch (e) { /* sin documento */ }
    const d = await pedirHerramienta("resultados_apa", "Redacción de resultados cuantitativos en APA 7 a partir de la salida de SPSS.",
      { type: "object", properties: {
        parrafos: { type: "array", items: { type: "string" }, description: "Párrafos de resultados en español, APA 7, en el orden de la salida" },
        no_reportable: { type: "array", items: { type: "string" }, description: "Datos necesarios que NO están en la salida (ej.: «d de Cohen: calcúlalo o activa /ES DISPLAY»)" },
        advertencias: { type: "array", items: { type: "string" }, description: "Problemas detectados: supuestos incumplidos (Levene, normalidad), celdas con esperados < 5, etc." }
      }, required: ["parrafos"] },
      `Redacta la sección de resultados en APA 7 a partir de esta salida de SPSS.
Reglas estrictas:
- Usa SOLO números que aparecen en la salida. No calcules ni inventes valores. Si falta algo (como un tamaño del efecto), escribe [completar] y anótalo en «no_reportable».
- Escribe con PUNTO decimal (Romus convertirá el formato después).
- Redondea a dos decimales; los valores p, a tres. Si la salida dice ,000 o .000, escribe p < .001. Sin cero inicial en p, r, α y β.
- Formato: M = 24.31, DE = 3.12; t(58) = 2.41, p = .019; F(2, 87) = 5.12, p = .008; r(48) = .42, p = .002; χ²(1, N = 120) = 6.35, p = .012; U = 312.50, p = .041.
- En la t de muestras independientes, usa la fila que corresponda según la prueba de Levene y dilo.
- Indica si se acepta o rechaza cada hipótesis, sin interpretar ni discutir (eso va en la discusión).
- Frases claras y breves, en tercera persona.
${contexto ? "\nHIPÓTESIS Y OBJETIVOS DEL DOCUMENTO:\n" + contexto : ""}

SALIDA DE SPSS:
${fuente.slice(0, 30000)}`, signal);
    const pulidos = (d.parrafos || []).map(pulirAPA).filter(x => x.trim());
    if (!pulidos.length) throw new Error("La IA no devolvió resultados. Revisa que hayas pegado las tablas completas.");
    const ver = verificarNumeros(pulidos.join("\n"), fuente);
    const finales = decimal === "punto" ? pulidos : pulidos.map(aComa);
    registrar("Resultados en APA (SPSS)", `${ver.total - ver.malos.length}/${ver.total} números verificados`, ver.malos.length ? "modelo" : "documento");

    const c = el("div", "inv-cuerpo datos");
    c.appendChild(ver.malos.length ? etiqueta("modelo", `${ver.malos.length} número(s) no están en tu salida`) : etiqueta("documento", `los ${ver.total} números salen de tu salida`));
    const res = el("div", "datos-apa"); finales.forEach(p => res.appendChild(el("p", "", p))); c.appendChild(res);
    if (ver.malos.length) {
      const f = el("div", "guia-caja error"); f.appendChild(el("b", "", "Revisa estos números: no los encontré en tu salida"));
      const ul = el("ul", "guia-puntos"); ver.malos.forEach(x => ul.appendChild(el("li", "", `${x.numero} — «…${x.contexto}…»`))); f.appendChild(ul); c.appendChild(f);
    }
    [["Falta en la salida", d.no_reportable], ["Atención", d.advertencias]].forEach(([tt, xs]) => {
      if (!xs || !xs.length) return;
      const f = el("div", "guia-caja"); f.appendChild(el("b", "", tt));
      const ul = el("ul", "guia-puntos"); xs.forEach(x => ul.appendChild(el("li", "", x))); f.appendChild(ul); c.appendChild(f);
    });
    const acc = el("div", "inv-acciones");
    acc.append(
      boton("Insertar después del cursor", "primario", () => H().ejecutar(async () => { await insertarDespuesDelCursor(finales.map(texto => ({ texto }))); ui.confirmar("Agregué los resultados después del cursor."); })),
      boton("Copiar", "", async (e) => { const ok = await copiar(finales.join("\n\n")); e.target.textContent = ok ? "¡Copiado!" : "Selecciona y copia"; }),
      boton("Otra tabla", "", () => resultadosAPA())
    );
    c.appendChild(acc);
    c.appendChild(el("p", "inv-nota", "Recuerda poner en cursiva los símbolos estadísticos (M, DE, t, F, p, r, χ²) y numerar las tablas en formato APA."));
    tarjeta("Resultados en APA", c);
    ui.hablar(ver.malos.length ? `Listo, pero revisa ${ver.malos.length} número${ver.malos.length > 1 ? "s" : ""} que no encontré en tu salida.` : `Listo. Comprobé los ${ver.total} números contra tu salida de SPSS.`);
    return { finales, ver };
  }

  /* ================= 3. Romus → ATLAS.ti: libro de códigos ================= */

  async function libroCodigos(signal) {
    if (!exigirIA()) return;
    const { el, tarjeta, etiqueta, registrar, pedirHerramienta, documentoNumerado } = H();
    const ui = H().ui;
    const doc = await documentoNumerado();
    const d = await pedirHerramienta("libro_codigos", "Libro de códigos para el análisis cualitativo.",
      { type: "object", properties: {
        categorias: { type: "array", items: { type: "object", properties: {
          nombre: { type: "string", description: "Categoría (corta, sin dos puntos)" },
          definicion: { type: "string" },
          codigos: { type: "array", items: { type: "object", properties: {
            nombre: { type: "string", description: "Código o subcategoría (corto, sin dos puntos)" },
            definicion: { type: "string", description: "Cuándo se aplica este código (criterio de inclusión)" },
            ejemplo: { type: "string", description: "Ejemplo breve de un fragmento que llevaría este código (inventado y marcado como ejemplo) o vacío" }
          }, required: ["nombre", "definicion"] } }
        }, required: ["nombre", "codigos"] } },
        emergentes: { type: "string", description: "Recomendación breve sobre cómo manejar los códigos emergentes" }
      }, required: ["categorias"] },
      `Construye el libro de códigos deductivo del proyecto a partir de sus categorías, subcategorías, objetivos, preguntas y guion de entrevista (si los hay). Usa las categorías tal como aparecen en el documento; si no hay matriz de categorías, propónlas desde los objetivos específicos. Entre 3 y 7 categorías con 2 a 6 códigos cada una. Nombres breves y claros, en español.

DOCUMENTO:
${doc.texto}`, signal);
    const libro = (d.categorias || []).map(cat => ({
      nombre: String(cat.nombre || "Categoría").replace(/\s*:\s*/g, " ").replace(/\s+/g, " ").trim(), definicion: cat.definicion || "",
      codigos: (cat.codigos || []).map(x => ({ nombre: String(x.nombre || "").replace(/\s*:\s*/g, " ").replace(/\s+/g, " ").trim(), definicion: String(x.definicion || "").trim().replace(/([^.!?…])$/, "$1."), ejemplo: x.ejemplo || "" })).filter(x => x.nombre)
    })).filter(cat => cat.codigos.length);
    if (!libro.length) throw new Error("No encontré categorías en tu documento. Escribe primero tus objetivos o tu matriz de categorías.");
    ultimoLibro = libro;
    const total = libro.reduce((a, x) => a + x.codigos.length, 0);
    registrar("Libro de códigos (ATLAS.ti)", `${libro.length} categorías, ${total} códigos`, "modelo");

    const c = el("div", "inv-cuerpo datos");
    c.appendChild(etiqueta("modelo", "propuesto desde tu documento · revísalo"));
    c.appendChild(el("p", "guia-resumen", `${libro.length} categorías y ${total} códigos. En ATLAS.ti quedarán como «Categoría: código», que el programa agrupa automáticamente.`));
    libro.forEach(cat => {
      const b = el("div", "prioridad");
      b.appendChild(el("b", "", cat.nombre));
      if (cat.definicion) b.appendChild(el("span", "", cat.definicion));
      const ul = el("ul", "guia-puntos"); cat.codigos.forEach(x => { const li = el("li", ""); li.append(el("b", "", x.nombre + ": "), document.createTextNode(x.definicion)); ul.appendChild(li); });
      b.appendChild(ul); c.appendChild(b);
    });
    if (d.emergentes) c.appendChild(el("p", "inv-nota", "Códigos emergentes: " + d.emergentes));
    const acc = el("div", "inv-acciones");
    acc.append(
      boton("Excel para ATLAS.ti", "primario", () => descargar("romus-libro-de-codigos.xlsx", xlsx(filasAtlas(libro), "Códigos"))),
      boton("QDC (ATLAS.ti, NVivo, MAXQDA)", "", () => descargar("romus-libro-de-codigos.qdc", qdc(libro), "application/xml;charset=utf-8")),
      boton("Insertar en el documento", "", () => H().ejecutar(() => insertarLibro(libro)))
    );
    c.appendChild(acc);
    c.appendChild(el("p", "inv-nota", "En ATLAS.ti: Códigos > Importar lista de códigos (Excel) y marca «Mis datos contienen encabezados». El archivo QDC se importa como libro de códigos REFI-QDA."));
    tarjeta("Libro de códigos para ATLAS.ti", c);
    ui.hablar(`Listo: ${libro.length} categorías y ${total} códigos. Descarga el Excel e impórtalo en ATLAS.ti.`);
  }

  /** Formato de importación de ATLAS.ti: col. 1 nombre, col. 2 comentario, col. 3 grupo. */
  function filasAtlas(libro) {
    const filas = [["Código", "Comentario", "Grupo de códigos"]];
    libro.forEach(cat => cat.codigos.forEach(x => filas.push([`${cat.nombre}: ${x.nombre}`, x.definicion + (x.ejemplo ? ` Ejemplo: ${x.ejemplo}` : ""), cat.nombre])));
    return filas;
  }
  function uuid() { try { return crypto.randomUUID(); } catch (e) { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }); } }
  const COLORES = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];
  /** Libro de códigos REFI-QDA (.qdc). */
  function qdc(libro) {
    const codigo = (nombre, desc, color, hijos) => `<Code guid="${uuid()}" name="${xml(nombre)}" isCodable="true" color="${color}">` + (desc ? `<Description>${xml(desc)}</Description>` : "") + (hijos || "") + "</Code>";
    const cuerpo = libro.map((cat, i) => codigo(cat.nombre, cat.definicion, COLORES[i % COLORES.length], cat.codigos.map(x => codigo(x.nombre, x.definicion + (x.ejemplo ? ` Ejemplo: ${x.ejemplo}` : ""), COLORES[i % COLORES.length])).join(""))).join("");
    return '<?xml version="1.0" encoding="utf-8"?>\n<CodeBook xmlns="urn:QDA-XML:codebook:1.0" origin="Romus"><Codes>' + cuerpo + "</Codes></CodeBook>\n";
  }
  async function insertarLibro(libro) {
    const filas = [["Categoría", "Código", "Definición"]];
    libro.forEach(cat => cat.codigos.forEach(x => filas.push([cat.nombre, x.nombre, x.definicion])));
    await Word.run(async (ctx) => {
      const sel = ctx.document.getSelection();
      const ps = sel.paragraphs; ps.load("items"); await ctx.sync();
      let ref = ps.items[ps.items.length - 1];
      ref = ref.insertParagraph("Libro de códigos", "After"); ref.styleBuiltIn = "Heading2";
      try { ref.insertTable(filas.length, 3, "After", filas); } catch (e) { filas.slice(1).forEach(f => { ref = ref.insertParagraph(f.join(" · "), "After"); }); }
      await ctx.sync();
    });
    H().ui.confirmar("Agregué el libro de códigos después del cursor.");
  }

  /* ================= 4. ATLAS.ti → Romus: resultados cualitativos ================= */

  function resultadosCualitativos(textoInicial) {
    const { el, tarjeta } = H();
    const c = el("div", "inv-cuerpo datos");
    c.appendChild(el("p", "guia-resumen", "Pega el informe de tus códigos con sus citas. Redacto los hallazgos por categoría y compruebo que cada cita sea literal."));
    const pasos = el("ol", "guia-puntos");
    ["En ATLAS.ti abre el Gestor de códigos y selecciona los códigos.", "Elige Informe (Report) con las citas y expórtalo o cópialo.", "Pégalo abajo o selecciónalo en Word y pulsa «Usar mi selección»."].forEach(x => pasos.appendChild(el("li", "", x)));
    c.appendChild(pasos);
    const { l, t } = campoPegar("Informe de códigos y citas", "Código: Convivencia: conflictos en el recreo\n3:12 «A veces nos peleamos por el balón…»", 8);
    if (textoInicial) t.value = textoInicial;
    c.appendChild(l);
    const acc = el("div", "inv-acciones");
    acc.append(
      boton("Redactar hallazgos", "primario", () => { if (!t.value.trim()) { t.focus(); return; } H().ejecutar(() => redactarCualitativo(t.value)); }),
      boton("Usar mi selección", "", async () => { try { const s = await Doc.leerSeleccion(); if (s.hay) t.value = s.texto; else H().ui.hablar("Primero selecciona en Word el informe pegado."); } catch (e) { H().ui.mostrarError(e); } })
    );
    c.appendChild(acc);
    tarjeta("Resultados cualitativos desde ATLAS.ti", c);
    H().ui.hablar("Pega el informe de códigos con sus citas y pulsa redactar.");
  }

  /** Extrae las citas entre comillas de un texto. */
  function citasDe(t) {
    const out = []; const re = /[«“"]([^«»“”"]{12,})[»”"]/g; let m;
    while ((m = re.exec(t))) out.push(m[1].trim());
    return out;
  }
  function citaLiteral(cita, fuente) {
    const c = norm(cita).replace(/[.…,;:]+$/g, "").replace(/^[.…]+/, "").replace(/\s*(\.\.\.|…|\[\.\.\.\])\s*/g, "|");
    const f = norm(fuente).replace(/[«»“”"]/g, "");
    return c.split("|").map(x => x.trim()).filter(x => x.length >= 6).every(x => f.includes(x));
  }

  async function redactarCualitativo(fuente, signal) {
    if (!exigirIA()) return;
    const { el, tarjeta, etiqueta, registrar, pedirHerramienta } = H();
    const ui = H().ui;
    const d = await pedirHerramienta("resultados_cualitativos", "Redacción de resultados cualitativos desde un informe de ATLAS.ti.",
      { type: "object", properties: {
        categorias: { type: "array", items: { type: "object", properties: {
          categoria: { type: "string" },
          texto: { type: "string", description: "Uno o dos párrafos con la síntesis de la categoría y 1 a 3 citas LITERALES entre comillas latinas «…», cada una seguida de su identificador entre paréntesis, ej.: (3:12) o (P3)" }
        }, required: ["categoria", "texto"] } },
        hallazgo_central: { type: "string", description: "Una o dos frases que integren los hallazgos" }
      }, required: ["categorias"] },
      `Redacta la sección de resultados cualitativos (APA 7) a partir de este informe de ATLAS.ti.
Reglas estrictas:
- Organiza por categorías y describe lo que dicen los participantes, sin interpretar con teoría (eso va en la discusión).
- Las citas deben ser COPIA LITERAL del informe, entre « », con su identificador. Si recortas, usa […]. Nunca inventes ni parafrasees dentro de las comillas.
- Indica la densidad cuando el informe la tenga (ej.: «el código más frecuente, con 14 citas»).
- Tercera persona, frases claras, en español.

INFORME:
${fuente.slice(0, 30000)}`, signal);
    const cats = (d.categorias || []).filter(x => x.texto);
    if (!cats.length) throw new Error("La IA no devolvió hallazgos. Revisa que el informe incluya las citas.");
    const malas = [], todas = [];
    cats.forEach(x => citasDe(x.texto).forEach(q => { todas.push(q); if (!citaLiteral(q, fuente)) malas.push({ cita: q, categoria: x.categoria }); }));
    registrar("Resultados cualitativos (ATLAS.ti)", `${todas.length - malas.length}/${todas.length} citas literales`, malas.length ? "modelo" : "documento");

    const c = el("div", "inv-cuerpo datos");
    c.appendChild(malas.length ? etiqueta("modelo", `${malas.length} cita(s) no son literales`) : etiqueta("documento", `las ${todas.length} citas son literales`));
    if (d.hallazgo_central) { const h = el("div", "guia-sencillo"); h.append(el("b", "", "Hallazgo central"), el("span", "", d.hallazgo_central)); c.appendChild(h); }
    const res = el("div", "datos-apa");
    cats.forEach(x => { res.appendChild(el("b", "", x.categoria)); String(x.texto).split(/\n+/).filter(Boolean).forEach(p => res.appendChild(el("p", "", p))); });
    c.appendChild(res);
    if (malas.length) {
      const f = el("div", "guia-caja error"); f.appendChild(el("b", "", "Estas citas no aparecen tal cual en tu informe"));
      const ul = el("ul", "guia-puntos"); malas.forEach(x => ul.appendChild(el("li", "", `«${x.cita}» (${x.categoria})`))); f.appendChild(ul);
      f.appendChild(el("span", "", "Cámbialas por el texto exacto del participante antes de entregar.")); c.appendChild(f);
    }
    const bloques = [];
    cats.forEach(x => { bloques.push({ texto: x.categoria, estilo: "Heading3" }); String(x.texto).split(/\n+/).filter(Boolean).forEach(p => bloques.push({ texto: p })); });
    const acc = el("div", "inv-acciones");
    acc.append(
      boton("Insertar después del cursor", "primario", () => H().ejecutar(async () => { await insertarDespuesDelCursor(bloques); ui.confirmar("Agregué los hallazgos después del cursor."); })),
      boton("Copiar", "", async (e) => { const ok = await copiar(bloques.map(b => b.texto).join("\n\n")); e.target.textContent = ok ? "¡Copiado!" : "Selecciona y copia"; }),
      boton("Otro informe", "", () => resultadosCualitativos())
    );
    c.appendChild(acc);
    c.appendChild(el("p", "inv-nota", "Las citas de 40 palabras o más van en bloque aparte, con sangría y sin comillas (APA 7)."));
    tarjeta("Hallazgos cualitativos", c);
    ui.hablar(malas.length ? `Listo, pero ${malas.length} cita${malas.length > 1 ? "s no son literales" : " no es literal"}. Revísalas.` : `Listo. Comprobé las ${todas.length} citas contra tu informe.`);
    return { cats, malas, todas };
  }

  /* ================= Comandos de voz ================= */
  function comando(n) {
    const tarea = (fn) => async () => { H().ui.ocupar(true, "Datos…"); try { await fn(); } catch (e) { H().ui.mostrarError(e); } finally { H().ui.ocupar(false); } };
    if (/^((abre|usa|activa|quiero) )?(analizar (mis )?datos|analisis de datos|tengo (mis )?datos|spss y atlas ti)$/.test(n)) return () => inicio();
    if (/(sintaxis|syntax|script|codigo)( de| para| en)? (spss|pspp)|^(genera|crea|haz|dame|arma|escribe)(me)? (la |una |el )?(sintaxis|plan de analisis)( de spss)?$|^(spss|pspp)$/.test(n)) return /^(spss|pspp)$/.test(n) ? () => inicio("cuanti") : tarea(sintaxis);
    if (/(redacta|escribe|pasa|convierte|reporta|interpreta)(me)? (los |mis )?resultados (de spss )?((en|a|con) )?(normas |formato )?apa|^resultados (en )?apa$|^(redacta|escribe)(me)? los resultados de spss$/.test(n)) return () => resultadosAPA();
    if (/(libro|lista) de codigos|codebook|(exporta|exportar|pasa|lleva)( mis)?( (codigos|categorias))? a atlas ti/.test(n)) return tarea(libroCodigos);
    if (/(redacta|escribe)(me)? (los |mis )?(resultados|hallazgos) cualitativos|resultados (de|desde) atlas ti/.test(n)) return () => resultadosCualitativos();
    if (/^((abre|usa) )?(atlas ti|atlasti)$/.test(n)) return () => inicio("cuali");
    return null;
  }

  return { inicio, sintaxis, resultadosAPA, redactarAPA, libroCodigos, resultadosCualitativos, redactarCualitativo, comando,
    _construirSintaxis: construirSintaxis, _construirR: construirR, _normalizarPlan: normalizarPlan, _verificarNumeros: verificarNumeros, _pulirAPA: pulirAPA, _aComa: aComa, _xlsx: xlsx, _qdc: qdc, _filasAtlas: filasAtlas, _citaLiteral: citaLiteral, _textoPlan: textoPlan,
    get ultimoPlan() { return ultimoPlan; }, get ultimoLibro() { return ultimoLibro; } };
})();
