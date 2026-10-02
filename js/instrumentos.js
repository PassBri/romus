/* Romus · Del proyecto al trabajo de campo.
   - Calculadora de tamaño de muestra (cálculo exacto, sin IA).
   - Instrumentos desde la operacionalización: cuestionario Likert o guion de entrevista,
     con su matriz y el formato de validación para jueces expertos.
   - Validación por jueces: V de Aiken con intervalo de confianza (Penfield y Giacobbi, 2004)
     y razón de validez de contenido de Lawshe con valor crítico exacto (Ayre y Scally, 2014).
   - Ética: consentimiento informado, consentimiento de acudientes y asentimiento de menores,
     carta a la institución y autorización de tratamiento de datos (Colombia). */
window.Instrumentos = (function () {
  const H = () => Inv._h;
  const Z = { 90: 1.6449, 95: 1.96, 99: 2.5758 };
  const ZB = { 80: 0.8416, 90: 1.2816 };
  const fmt = (x, d) => Number(x).toLocaleString("es-CO", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const dec = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace(".", ",");
  let ultimoInstrumento = null;

  async function insertarParrafos(textos, titulo) {
    await Word.run(async (ctx) => {
      const sel = ctx.document.getSelection();
      const ps = sel.paragraphs; ps.load("items"); await ctx.sync();
      let ref = ps.items[ps.items.length - 1];
      if (titulo) { ref = ref.insertParagraph(titulo, "After"); ref.styleBuiltIn = "Heading3"; }
      textos.forEach(t => { ref = ref.insertParagraph(t, "After"); ref.styleBuiltIn = "Normal"; });
      await ctx.sync();
    });
  }
  async function insertarTabla(filas, titulo) {
    await Word.run(async (ctx) => {
      const sel = ctx.document.getSelection();
      const ps = sel.paragraphs; ps.load("items"); await ctx.sync();
      let ref = ps.items[ps.items.length - 1];
      if (titulo) { const [num, tit] = titulo.split("|"); ref = ref.insertParagraph(num, "After"); ref.font.bold = true; ref.firstLineIndent = 0; if (tit) { ref = ref.insertParagraph(tit, "After"); ref.font.bold = false; ref.font.italic = true; ref.firstLineIndent = 0; } }
      try { const t = ref.insertTable(filas.length, filas[0].length, "After", filas); try { t.headerRowCount = 1; } catch (e) { /* opcional */ } }
      catch (e) { filas.forEach(f => { ref = ref.insertParagraph(f.join(" · "), "After"); }); }
      await ctx.sync();
    });
  }

  /* ================= 1. Tamaño de muestra ================= */
  function calcular(tipo, v) {
    const z = Z[v.confianza || 95], zb = ZB[v.potencia || 80];
    const ajustar = (n) => { const r = Math.min(0.9, Math.max(0, (+v.perdida || 0) / 100)); return { n, final: Math.ceil(n / (1 - r)) }; };
    if (tipo === "finita" || tipo === "infinita") {
      const p = Math.min(0.99, Math.max(0.01, (+v.p || 50) / 100)), q = 1 - p, e = Math.max(0.005, (+v.error || 5) / 100);
      const n0 = z * z * p * q / (e * e);
      if (tipo === "infinita") return Object.assign(ajustar(Math.ceil(n0)), { formula: "n = Z² · p · q / e²", z, p, e });
      const N = Math.max(1, Math.round(+v.N || 0));
      if (!N) throw new Error("Escribe el tamaño de la población (N).");
      const n = Math.ceil(N * z * z * p * q / (e * e * (N - 1) + z * z * p * q));
      return Object.assign(ajustar(Math.min(n, N)), { formula: "n = N · Z² · p · q / [e² (N − 1) + Z² · p · q]", z, p, e, N });
    }
    if (tipo === "medias") {
      const d = Math.max(0.05, +v.d || 0.5);
      const n = Math.ceil(2 * Math.pow((z + zb) / d, 2));
      return Object.assign(ajustar(n), { porGrupo: true, formula: "n por grupo = 2 · (Zα/2 + Zβ)² / d²", z, zb, d });
    }
    if (tipo === "correlacion") {
      const r = Math.min(0.95, Math.max(0.05, +v.r || 0.3));
      const C = 0.5 * Math.log((1 + r) / (1 - r));
      const n = Math.ceil(Math.pow((z + zb) / C, 2) + 3);
      return Object.assign(ajustar(n), { formula: "n = [(Zα/2 + Zβ) / C]² + 3, con C = ½ · ln[(1 + r)/(1 − r)]", z, zb, r });
    }
    return null;
  }
  function redaccion(tipo, v, r) {
    const conf = v.confianza || 95;
    let t = "";
    if (tipo === "finita") t = `El tamaño de la muestra se calculó con la fórmula para poblaciones finitas, con un nivel de confianza del ${conf} % (Z = ${dec(r.z, 2)}), un margen de error del ${dec(r.e * 100, 1).replace(",0", "")} % y una proporción esperada de p = ${dec(r.p, 2)}. Con una población de N = ${fmt(r.N)}, la muestra mínima es de n = ${fmt(r.n)} participantes`;
    if (tipo === "infinita") t = `Como el tamaño de la población es desconocido, el tamaño de la muestra se calculó con la fórmula para poblaciones infinitas, con un nivel de confianza del ${conf} % (Z = ${dec(r.z, 2)}), un margen de error del ${dec(r.e * 100, 1).replace(",0", "")} % y p = ${dec(r.p, 2)}, lo que da una muestra mínima de n = ${fmt(r.n)} participantes`;
    if (tipo === "medias") t = `El tamaño de la muestra se estimó para comparar dos medias, con un nivel de significancia de α = ${dec(1 - conf / 100, 2).replace(/^0/, "")}, una potencia estadística del ${v.potencia || 80} % y un tamaño del efecto esperado de d = ${dec(r.d, 2)}; se requieren n = ${fmt(r.n)} participantes por grupo`;
    if (tipo === "correlacion") t = `El tamaño de la muestra se estimó para detectar una correlación de r = ${dec(r.r, 2)}, con α = ${dec(1 - conf / 100, 2).replace(/^0/, "")} (bilateral) y una potencia del ${v.potencia || 80} %; se requieren n = ${fmt(r.n)} participantes`;
    if (r.final > r.n) t += `. Considerando una pérdida esperada del ${v.perdida} %, se invitará a ${fmt(r.final)}${r.porGrupo ? " por grupo" : ""}`;
    return t + ".";
  }
  function muestra() {
    const { el, tarjeta, etiqueta } = H();
    const c = el("div", "inv-cuerpo muestra");
    c.appendChild(el("p", "guia-resumen", "Calculo el tamaño mínimo de tu muestra y te dejo el párrafo redactado para la metodología."));
    const sel = el("select", "ajuste");
    [["finita", "Encuesta · conozco el tamaño de la población"], ["infinita", "Encuesta · población desconocida o muy grande"], ["medias", "Comparar dos grupos (pre/post, experimental/control)"], ["correlacion", "Relación entre dos variables (correlación)"], ["cualitativo", "Estudio cualitativo"]].forEach(([k, t]) => { const o = el("option", "", t); o.value = k; sel.appendChild(o); });
    const l0 = el("label", "campo-pro"); l0.append(el("span", "", "¿Qué vas a hacer?"), sel); c.appendChild(l0);
    const campos = el("div", "apa-campos"); c.appendChild(campos);
    const salida = el("div", "inv-cuerpo"); c.appendChild(salida);
    let ins = {};
    const campo = (k, t, v, ayuda) => { const l = el("label", "campo-pro"); l.appendChild(el("span", "", t)); const i = el(k === "confianza" || k === "potencia" ? "select" : "input"); i.className = "ajuste"; if (k === "confianza") [[90, "90 %"], [95, "95 % (lo usual)"], [99, "99 %"]].forEach(([a, b]) => { const o = el("option", "", b); o.value = a; i.appendChild(o); }); else if (k === "potencia") [[80, "80 % (lo usual)"], [90, "90 %"]].forEach(([a, b]) => { const o = el("option", "", b); o.value = a; i.appendChild(o); }); else i.type = "number"; i.value = v; i.oninput = i.onchange = pintar; ins[k] = i; l.appendChild(i); if (ayuda) l.appendChild(el("small", "inv-nota", ayuda)); campos.appendChild(l); };
    function armar() {
      campos.innerHTML = ""; ins = {};
      const t = sel.value;
      if (t === "finita") campo("N", "Tamaño de la población (N)", "", "Por ejemplo, todos los estudiantes de sexto de la institución.");
      if (t === "finita" || t === "infinita") { campo("error", "Margen de error (%)", 5, "Lo usual es 5 %. Si tu población es pequeña, puedes usar 5 a 10 %."); campo("p", "Proporción esperada p (%)", 50, "Si no la conoces, deja 50 %: da la muestra más segura."); }
      if (t === "medias") campo("d", "Tamaño del efecto esperado (d de Cohen)", 0.5, "0,2 pequeño · 0,5 mediano · 0,8 grande. Si no hay estudios previos, usa 0,5.");
      if (t === "correlacion") campo("r", "Correlación esperada (r)", 0.3, "0,1 débil · 0,3 moderada · 0,5 fuerte.");
      if (t !== "cualitativo") { campo("confianza", "Nivel de confianza", 95); if (t === "medias" || t === "correlacion") campo("potencia", "Potencia estadística", 80); campo("perdida", "Pérdida esperada de participantes (%)", 10, "Para compensar a quienes no respondan o se retiren."); }
      pintar();
    }
    function pintar() {
      salida.innerHTML = "";
      const t = sel.value;
      if (t === "cualitativo") {
        salida.appendChild(etiqueta("guia", "orientación"));
        salida.appendChild(el("p", "guia-resumen", "En la investigación cualitativa no se calcula la muestra con fórmulas: se elige a propósito y se cierra cuando los datos nuevos ya no aportan categorías nuevas (saturación)."));
        const tb = el("table", "tabla-mini");
        [["Diseño", "Orientación frecuente"], ["Fenomenológico", "5 a 25 participantes"], ["Teoría fundamentada", "20 a 30 entrevistas"], ["Narrativo", "1 a 5 casos en profundidad"], ["Etnográfico", "Un grupo o comunidad"], ["Estudio de caso", "1 a 4 casos"], ["Investigación-acción", "El grupo que participa en el cambio"]].forEach((f, i) => { const tr = el("tr"); f.forEach(x => tr.appendChild(el(i ? "td" : "th", "", x))); tb.appendChild(tr); });
        salida.appendChild(tb);
        salida.appendChild(el("p", "inv-nota", "Describe en tu metodología el tipo de muestreo (intencional, por conveniencia, bola de nieve, casos tipo), los criterios de inclusión y cómo decidirás la saturación."));
        return;
      }
      const v = {}; Object.keys(ins).forEach(k => { v[k] = ins[k].value; });
      let r;
      try { r = calcular(t, v); } catch (e) { salida.appendChild(el("p", "inv-nota", e.message)); return; }
      if (!r || !isFinite(r.n)) return;
      salida.appendChild(etiqueta("calculo", r.formula));
      const big = el("div", "resultado-calc", `n = ${fmt(r.n)}${r.porGrupo ? " por grupo" : ""}`);
      salida.appendChild(big);
      if (r.final > r.n) salida.appendChild(el("p", "inv-nota", `Con ${v.perdida} % de pérdida, invita a ${fmt(r.final)}${r.porGrupo ? " por grupo" : ""}.`));
      const txt = redaccion(t, v, r);
      salida.appendChild(el("p", "guia-resumen", txt));
      const acc = el("div", "inv-acciones");
      const b = el("button", "boton primario", "Insertar en mi metodología");
      b.onclick = () => H().ejecutar(async () => { await insertarParrafos([txt]); H().ui.confirmar("Agregué el cálculo de la muestra después del cursor."); H().registrar("Cálculo de muestra", `n = ${r.n}`, "calculo"); });
      acc.appendChild(b); salida.appendChild(acc);
    }
    sel.onchange = armar;
    sel.value = Inv.enfoque().id === "cualitativo" ? "cualitativo" : "finita";
    armar();
    tarjeta("Tamaño de la muestra", c);
    H().ui.hablar("Elige qué vas a hacer y llena los datos. Calculo la muestra y te dejo el párrafo para la metodología.");
  }

  /* ================= 2. Instrumentos desde la operacionalización ================= */
  async function instrumento(tipoForzado, signal) {
    if (Config.faltaClave()) throw new Error("Para diseñar el instrumento necesito tu IA conectada (Ajustes).");
    const { documentoNumerado, pedirHerramienta, el, tarjeta, etiqueta, registrar } = H();
    const ui = H().ui;
    const doc = await documentoNumerado();
    const cuali = tipoForzado ? tipoForzado === "guion" : Inv.enfoque().id === "cualitativo";
    let d;
    if (!cuali) {
      d = await pedirHerramienta("cuestionario", "Cuestionario tipo Likert construido desde la operacionalización del proyecto.",
        { type: "object", properties: {
          titulo: { type: "string" }, poblacion: { type: "string", description: "A quién se aplica (ej.: estudiantes de 11 a 13 años)" },
          instrucciones: { type: "string", description: "Instrucciones para quien responde, en lenguaje adecuado a la población" },
          escala: { type: "array", items: { type: "string" }, description: "Etiquetas de la escala de menor a mayor (ej.: Nunca, Casi nunca, A veces, Casi siempre, Siempre)" },
          sociodemograficos: { type: "array", items: { type: "object", properties: { pregunta: { type: "string" }, opciones: { type: "array", items: { type: "string" } } }, required: ["pregunta"] } },
          dimensiones: { type: "array", items: { type: "object", properties: {
            variable: { type: "string" }, dimension: { type: "string" }, definicion: { type: "string", description: "Definición operacional breve de la dimensión" },
            indicadores: { type: "array", items: { type: "object", properties: { indicador: { type: "string" }, items: { type: "array", items: { type: "object", properties: { texto: { type: "string" }, invertido: { type: "boolean" } }, required: ["texto"] } } }, required: ["indicador", "items"] } }
          }, required: ["variable", "dimension", "indicadores"] } },
          advertencias: { type: "array", items: { type: "string" }, description: "Lo que el documento no define y el estudiante debe decidir" }
        }, required: ["titulo", "escala", "dimensiones"] },
        `Diseña el cuestionario del proyecto a partir de su operacionalización (variables, dimensiones e indicadores). Si el documento no la tiene completa, propónla desde los objetivos y anótalo en «advertencias».
Reglas de redacción de ítems: una sola idea por ítem, afirmaciones claras y breves, sin dobles negaciones, sin términos técnicos, adaptadas a la población (si son niños, frases muy sencillas). Entre 2 y 4 ítems por indicador, máximo 40 en total. Incluye algunos ítems invertidos (marcados) para controlar la aquiescencia.
Nivel: ${Inv.nivel().nombre}.

DOCUMENTO:
${doc.texto}`, signal);
    } else {
      d = await pedirHerramienta("guion_entrevista", "Guion de entrevista semiestructurada desde las categorías del proyecto.",
        { type: "object", properties: {
          titulo: { type: "string" }, poblacion: { type: "string" },
          presentacion: { type: "string", description: "Texto inicial para el entrevistado: propósito, duración, confidencialidad y permiso para grabar" },
          categorias: { type: "array", items: { type: "object", properties: {
            categoria: { type: "string" }, subcategoria: { type: "string" }, definicion: { type: "string" },
            preguntas: { type: "array", items: { type: "object", properties: { pregunta: { type: "string" }, repreguntas: { type: "array", items: { type: "string" } } }, required: ["pregunta"] } }
          }, required: ["categoria", "preguntas"] } },
          cierre: { type: "string" },
          advertencias: { type: "array", items: { type: "string" } }
        }, required: ["titulo", "categorias"] },
        `Diseña el guion de entrevista semiestructurada del proyecto a partir de sus categorías y subcategorías (o de sus objetivos, si no las tiene; anótalo en «advertencias»).
Reglas: preguntas abiertas, neutrales, de una idea; sin preguntas que sugieran la respuesta; empieza por lo general y cómodo; 2 a 4 preguntas por subcategoría con repreguntas para profundizar. Máximo 20 preguntas. Lenguaje adecuado a la población.

DOCUMENTO:
${doc.texto}`, signal);
    }
    d.tipo = cuali ? "guion" : "cuestionario";
    // Numerar ítems (p1, p2…) para que coincidan con la sintaxis de SPSS
    let k = 0;
    if (!cuali) (d.dimensiones || []).forEach(dm => (dm.indicadores || []).forEach(ind => (ind.items || []).forEach(it => { it.codigo = "p" + (++k); })));
    else (d.categorias || []).forEach(ct => (ct.preguntas || []).forEach(q => { q.codigo = "E" + (++k); }));
    d.total = k;
    ultimoInstrumento = d;
    try { localStorage.setItem("romus.instrumento." + H().claveDoc(), JSON.stringify(d)); } catch (e) { /* opcional */ }
    registrar(cuali ? "Guion de entrevista" : "Cuestionario", `${k} ${cuali ? "preguntas" : "ítems"}`, "modelo");

    const c = el("div", "inv-cuerpo instrumento");
    c.appendChild(etiqueta("modelo", "borrador para validar con jueces y prueba piloto"));
    c.appendChild(el("p", "guia-resumen", cuali ? `Guion con ${k} preguntas en ${(d.categorias || []).length} categorías.` : `Cuestionario de ${k} ítems en ${(d.dimensiones || []).length} dimensiones, con escala de ${(d.escala || []).length} opciones (${(d.escala || []).join(", ")}).`));
    const det = el("details", "apa-cat"); det.appendChild(el("summary", "", cuali ? "Ver preguntas" : "Ver ítems"));
    if (!cuali) (d.dimensiones || []).forEach(dm => { det.appendChild(el("b", "", `${dm.variable} · ${dm.dimension}`)); const ol = el("ul", "guia-puntos"); (dm.indicadores || []).forEach(ind => (ind.items || []).forEach(it => ol.appendChild(el("li", "", `${it.codigo}. ${it.texto}${it.invertido ? " (invertido)" : ""}`)))); det.appendChild(ol); });
    else (d.categorias || []).forEach(ct => { det.appendChild(el("b", "", `${ct.categoria}${ct.subcategoria ? " · " + ct.subcategoria : ""}`)); const ol = el("ul", "guia-puntos"); (ct.preguntas || []).forEach(q => ol.appendChild(el("li", "", `${q.codigo}. ${q.pregunta}`))); det.appendChild(ol); });
    c.appendChild(det);
    if ((d.advertencias || []).length) { const f = el("div", "guia-caja error"); f.appendChild(el("b", "", "Debes decidir tú")); const ul = el("ul", "guia-puntos"); d.advertencias.forEach(x => ul.appendChild(el("li", "", x))); f.appendChild(ul); c.appendChild(f); }
    c.appendChild(el("div", "inv-sub", "Documentos"));
    c.appendChild(el("span", "inv-nota", cuali ? "Guion de entrevista para usar en el campo:" : "Cuestionario listo para imprimir o pasar a Forms:"));
    c.appendChild(Docx.botones(() => docInstrumento(d), cuali ? "guion-de-entrevista.docx" : "cuestionario.docx", { tam: 11 }));
    c.appendChild(el("span", "inv-nota", "Formato para que los jueces expertos califiquen cada ítem:"));
    c.appendChild(Docx.botones(() => docValidacion(d), "formato-validacion-jueces.docx", { tam: 10, horizontal: true }, "Abrir formato de jueces"));
    const acc = el("div", "inv-acciones");
    const bM = el("button", "boton secundario", cuali ? "Insertar matriz de categorías" : "Insertar matriz de operacionalización");
    bM.onclick = () => H().ejecutar(async () => { await insertarTabla(matriz(d), cuali ? "Tabla X|Matriz de categorías" : "Tabla X|Matriz de operacionalización de variables"); ui.confirmar("Agregué la matriz después del cursor. Ajusta el número de la tabla."); });
    const bV = el("button", "boton secundario", "Calcular validez (V de Aiken)"); bV.onclick = () => validacion();
    acc.append(bM, bV); c.appendChild(acc);
    c.appendChild(el("p", "inv-nota", "Antes de aplicarlo: valídalo con 3 a 7 jueces expertos, ajusta los ítems y haz una prueba piloto con personas parecidas a tu población."));
    tarjeta(cuali ? "Guion de entrevista" : "Cuestionario", c);
    ui.hablar(cuali ? `Listo: un guion con ${k} preguntas. También te dejo el formato para los jueces.` : `Listo: un cuestionario de ${k} ítems. También te dejo el formato para los jueces expertos.`);
    return d;
  }
  function matriz(d) {
    if (d.tipo === "guion") {
      const f = [["Categoría", "Subcategoría", "Definición", "Preguntas"]];
      (d.categorias || []).forEach(ct => f.push([ct.categoria, ct.subcategoria || "", ct.definicion || "", (ct.preguntas || []).map(q => q.codigo).join(", ")]));
      return f;
    }
    const f = [["Variable", "Dimensión", "Indicador", "Ítems", "Escala"]];
    (d.dimensiones || []).forEach(dm => (dm.indicadores || []).forEach(ind => f.push([dm.variable, dm.dimension, ind.indicador, (ind.items || []).map(i => i.codigo).join(", "), "Ordinal (Likert)"])));
    return f;
  }
  function docInstrumento(d) {
    const dp = Docx.datos();
    const b = [{ t: "titulo", texto: d.titulo }];
    if (dp.institucion) b.push({ texto: dp.institucion, centrado: true });
    if (d.tipo === "guion") {
      b.push({ t: "h2", texto: "Presentación" }, { texto: d.presentacion || "" });
      b.push({ t: "tabla", filas: [["Código del entrevistado", ""], ["Fecha", ""], ["Lugar", ""], ["Duración", ""]], cabecera: false, anchos: [3000, 6000] });
      (d.categorias || []).forEach(ct => {
        b.push({ t: "h2", texto: ct.categoria + (ct.subcategoria ? " · " + ct.subcategoria : "") });
        (ct.preguntas || []).forEach(q => { b.push({ texto: `**${q.codigo}.** ${q.pregunta}` }); if ((q.repreguntas || []).length) b.push({ t: "lista", items: q.repreguntas.map(r => "_" + r + "_") }); });
      });
      if (d.cierre) b.push({ t: "h2", texto: "Cierre" }, { texto: d.cierre });
      return b;
    }
    b.push({ texto: d.instrucciones || "Lee cada frase y marca con una X la opción que mejor describe lo que piensas o haces. No hay respuestas buenas ni malas.", justificado: true });
    if ((d.sociodemograficos || []).length) {
      b.push({ t: "h2", texto: "Datos generales" });
      d.sociodemograficos.forEach(s => b.push({ texto: `${s.pregunta}: ${(s.opciones || []).length ? s.opciones.map(o => "☐ " + o).join("   ") : "______________________"}` }));
    }
    const esc = d.escala || ["1", "2", "3", "4", "5"];
    b.push({ t: "h2", texto: "Cuestionario" });
    const filas = [["N.°", "Afirmación"].concat(esc)];
    (d.dimensiones || []).forEach(dm => (dm.indicadores || []).forEach(ind => (ind.items || []).forEach(it => filas.push([it.codigo.replace("p", ""), it.texto].concat(esc.map(() => "")))))) ;
    const resto = Math.floor(3600 / esc.length);
    b.push({ t: "tabla", filas, anchos: [600, 4800].concat(esc.map(() => resto)), tam: 10 });
    b.push({ texto: "¡Gracias por tu participación!", centrado: true, negrita: true });
    return b;
  }
  function docValidacion(d) {
    const dp = Docx.datos();
    const b = [{ t: "titulo", texto: "Formato de validación de contenido por juicio de expertos" }];
    b.push({ texto: `**Instrumento:** ${d.titulo}` });
    if (dp.titulo) b.push({ texto: `**Proyecto:** ${dp.titulo}` });
    if (dp.estudiante) b.push({ texto: `**Investigador(a):** ${dp.estudiante}${dp.programa ? " · " + dp.programa : ""}${dp.institucion ? " · " + dp.institucion : ""}` });
    b.push({ t: "h2", texto: "Datos del juez experto" });
    b.push({ t: "tabla", filas: [["Nombre", ""], ["Formación académica", ""], ["Experiencia (años)", ""], ["Institución", ""], ["Fecha", ""]], cabecera: false, anchos: [3500, 9000] });
    b.push({ t: "h2", texto: "Instrucciones" });
    b.push({ texto: "Califique cada ítem de 1 a 4 en cada criterio: 1 = No cumple, 2 = Nivel bajo, 3 = Nivel moderado, 4 = Nivel alto. Si tiene sugerencias, escríbalas en la columna de observaciones.", justificado: true });
    b.push({ t: "tabla", filas: [["Criterio", "¿Qué se evalúa?"], ["Claridad", "El ítem se comprende fácilmente; su sintaxis y semántica son adecuadas."], ["Coherencia", "El ítem tiene relación lógica con la dimensión o categoría que mide."], ["Relevancia", "El ítem es esencial o importante y debe incluirse."], ["Suficiencia", "Los ítems de la dimensión bastan para medirla (se califica por dimensión)."]], anchos: [2500, 10000] });
    b.push({ t: "h2", texto: "Evaluación de los ítems" });
    const filas = [["Código", d.tipo === "guion" ? "Categoría" : "Dimensión", d.tipo === "guion" ? "Pregunta" : "Ítem", "Claridad", "Coherencia", "Relevancia", "Observaciones"]];
    if (d.tipo === "guion") (d.categorias || []).forEach(ct => (ct.preguntas || []).forEach(q => filas.push([q.codigo, ct.categoria, q.pregunta, "", "", "", ""])));
    else (d.dimensiones || []).forEach(dm => (dm.indicadores || []).forEach(ind => (ind.items || []).forEach(it => filas.push([it.codigo, dm.dimension, it.texto, "", "", "", ""]))));
    b.push({ t: "tabla", filas, anchos: [900, 2000, 4500, 1100, 1200, 1200, 2000], tam: 9 });
    b.push({ t: "h2", texto: "Suficiencia por dimensión" });
    const suf = [["Dimensión o categoría", "Suficiencia (1 a 4)", "Observaciones"]];
    (d.tipo === "guion" ? (d.categorias || []).map(c => c.categoria) : (d.dimensiones || []).map(x => x.dimension)).forEach(n => suf.push([n, "", ""]));
    b.push({ t: "tabla", filas: suf, anchos: [5000, 2500, 5500] });
    b.push({ t: "h2", texto: "Concepto general" });
    b.push({ texto: "☐ Aplicable    ☐ Aplicable después de corregir    ☐ No aplicable" });
    b.push({ t: "firma", nombres: ["Firma del juez experto"] });
    return b;
  }

  /* ================= 3. Validación por jueces ================= */
  function leerMatriz(texto) {
    return String(texto || "").trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.split(/\t|;|,(?=\s*\d)|\s+/).map(x => x.trim()).filter(x => x !== "")).filter(f => f.length);
  }
  /** V de Aiken por ítem con IC (método score de Penfield y Giacobbi, 2004). */
  function aiken(filas, minimo, maximo, confianza) {
    const k = maximo - minimo, z = Z[confianza || 95];
    return filas.map(f => {
      const nombre = isNaN(+f[0].replace(",", ".")) ? f[0] : null;
      const vals = (nombre ? f.slice(1) : f).map(x => +String(x).replace(",", ".")).filter(x => isFinite(x));
      const n = vals.length; if (!n) return null;
      const S = vals.reduce((a, x) => a + (x - minimo), 0);
      const V = S / (n * k);
      const a = 2 * n * k * V + z * z, b = z * Math.sqrt(4 * n * k * V * (1 - V) + z * z), c = 2 * (n * k + z * z);
      return { nombre, n, V, L: Math.max(0, (a - b) / c), U: Math.min(1, (a + b) / c) };
    }).filter(Boolean);
  }
  // Binomial exacta para el valor crítico de Lawshe (Ayre y Scally, 2014)
  function colaBinomial(N, ne) { let s = 0; const lc = (n, k) => { let r = 0; for (let i = 1; i <= k; i++) r += Math.log(n - k + i) - Math.log(i); return r; }; for (let k = ne; k <= N; k++) s += Math.exp(lc(N, k) + N * Math.log(0.5)); return s; }
  function cvrCritico(N) { for (let ne = Math.ceil(N / 2); ne <= N; ne++) if (colaBinomial(N, ne) < 0.05) return { ne, cvr: (ne - N / 2) / (N / 2) }; return { ne: N, cvr: 1 }; }
  function lawshe(filas, esencial) {
    return filas.map(f => {
      const nombre = isNaN(+f[0].replace(",", ".")) ? f[0] : null;
      const vals = (nombre ? f.slice(1) : f).map(x => String(x).trim());
      const N = vals.length; if (!N) return null;
      const ne = vals.filter(x => norm(x) === norm(esencial) || x === String(esencial)).length;
      return { nombre, N, ne, CVR: (ne - N / 2) / (N / 2) };
    }).filter(Boolean);
  }
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

  function validacion() {
    const { el, tarjeta } = H();
    const c = el("div", "inv-cuerpo validacion");
    c.appendChild(el("p", "guia-resumen", "Copia de Excel las calificaciones de los jueces (una fila por ítem, una columna por juez; la primera columna puede ser el código del ítem) y pégalas aquí."));
    const sel = el("select", "ajuste");
    [["aiken", "V de Aiken (escala de 1 a 4 o de 1 a 5)"], ["lawshe", "Razón de validez de contenido de Lawshe (esencial / útil / no necesario)"]].forEach(([k, t]) => { const o = el("option", "", t); o.value = k; sel.appendChild(o); });
    const l0 = el("label", "campo-pro"); l0.append(el("span", "", "Método"), sel); c.appendChild(l0);
    const ta = el("textarea", "ajuste"); ta.rows = 7; ta.placeholder = "p1\t4\t4\t3\t4\t4\np2\t3\t4\t4\t2\t3\np3\t4\t4\t4\t4\t4";
    const l1 = el("label", "campo-pro"); l1.append(el("span", "", "Calificaciones"), ta); c.appendChild(l1);
    const fila = el("div", "inv-acciones");
    const iMin = el("input", "ajuste"); iMin.type = "number"; iMin.value = 1; iMin.style.width = "70px"; iMin.title = "Valor mínimo de la escala";
    const iMax = el("input", "ajuste"); iMax.type = "number"; iMax.value = 4; iMax.style.width = "70px"; iMax.title = "Valor máximo de la escala";
    const iEs = el("input", "ajuste"); iEs.value = "3"; iEs.style.width = "90px"; iEs.title = "Código que significa «esencial»";
    const lMin = el("span", "inv-nota", "Escala de"), lA = el("span", "inv-nota", "a"), lEs = el("span", "inv-nota", "«Esencial» se codificó como");
    fila.append(lMin, iMin, lA, iMax, lEs, iEs); c.appendChild(fila);
    const ver = () => { const a = sel.value === "aiken"; [lMin, iMin, lA, iMax].forEach(x => x.style.display = a ? "" : "none"); [lEs, iEs].forEach(x => x.style.display = a ? "none" : ""); };
    sel.onchange = ver; ver();
    const salida = el("div", "inv-cuerpo");
    const b = el("button", "boton primario", "Calcular");
    b.onclick = () => { salida.innerHTML = ""; try { resultadoValidacion(salida, sel.value, leerMatriz(ta.value), +iMin.value, +iMax.value, iEs.value); } catch (e) { salida.appendChild(el("p", "inv-nota", e.message)); } };
    c.append(b, salida);
    tarjeta("Validez de contenido por jueces", c);
    H().ui.hablar("Pega las calificaciones de los jueces y pulsa calcular.");
  }
  function resultadoValidacion(salida, metodo, filas, min, max, esencial) {
    const { el, etiqueta } = H();
    if (!filas.length) throw new Error("Pega al menos una fila de calificaciones.");
    let tabla, texto, decisiones;
    if (metodo === "aiken") {
      if (!(max > min)) throw new Error("Revisa la escala: el máximo debe ser mayor que el mínimo.");
      const r = aiken(filas, min, max, 95);
      const n = r[0].n;
      decisiones = r.map(x => x.V >= 0.7 && x.L >= 0.5 ? "Válido" : x.V >= 0.5 ? "Revisar" : "Eliminar o reformular");
      tabla = [["Ítem", "V", "IC 95 %", "Decisión"]].concat(r.map((x, i) => [x.nombre || `Ítem ${i + 1}`, dec(x.V, 2), `[${dec(x.L, 2)}; ${dec(x.U, 2)}]`, decisiones[i]]));
      const validos = decisiones.filter(x => x === "Válido").length;
      const Vt = r.reduce((a, x) => a + x.V, 0) / r.length;
      texto = `La validez de contenido se estimó con el coeficiente V de Aiken a partir de las calificaciones de ${n} jueces expertos en una escala de ${min} a ${max}, con intervalos de confianza del 95 % calculados por el método de Penfield y Giacobbi (2004). Se consideraron válidos los ítems con V ≥ ,70 y límite inferior del intervalo ≥ ,50. ${validos} de ${r.length} ítems cumplieron el criterio y el instrumento obtuvo una V promedio de ${dec(Vt, 2).replace(/^0/, "")}.`;
      salida.appendChild(etiqueta("calculo", "V = S / [n (c − 1)] · IC de Penfield y Giacobbi"));
    } else {
      const r = lawshe(filas, esencial);
      const N = r[0].N, crit = cvrCritico(N);
      decisiones = r.map(x => x.CVR >= crit.cvr - 1e-9 ? "Se conserva" : "Eliminar o reformular");
      tabla = [["Ítem", "Esencial", "CVR", "Decisión"]].concat(r.map((x, i) => [x.nombre || `Ítem ${i + 1}`, `${x.ne} de ${x.N}`, dec(x.CVR, 2), decisiones[i]]));
      const ok = r.filter((x, i) => decisiones[i] === "Se conserva");
      const cvi = ok.length ? ok.reduce((a, x) => a + x.CVR, 0) / ok.length : 0;
      texto = `La validez de contenido se estimó con la razón de validez de contenido (CVR) de Lawshe a partir del juicio de ${N} expertos. Con ${N} jueces, el valor crítico exacto es CVR = ${dec(crit.cvr, 2)} (Ayre y Scally, 2014), es decir, al menos ${crit.ne} jueces deben calificar el ítem como esencial. Se conservaron ${ok.length} de ${r.length} ítems y el índice de validez de contenido del instrumento fue CVI = ${dec(cvi, 2)}.`;
      salida.appendChild(etiqueta("calculo", `CVR = (ne − N/2) / (N/2) · valor crítico con ${N} jueces: ${dec(crit.cvr, 2)}`));
    }
    const tb = el("table", "tabla-mini");
    tabla.forEach((f, i) => { const tr = el("tr"); f.forEach((x, j) => tr.appendChild(el(i ? "td" : "th", i && j === 3 ? (/V[aá]lido|conserva/.test(x) ? "ok" : /Revisar/.test(x) ? "medio" : "mal") : "", x))); tb.appendChild(tr); });
    salida.appendChild(tb);
    salida.appendChild(el("p", "guia-resumen", texto));
    const acc = el("div", "inv-acciones");
    const bI = el("button", "boton primario", "Insertar tabla y párrafo");
    bI.onclick = () => H().ejecutar(async () => { await insertarTabla(tabla, "Tabla X|" + (metodo === "aiken" ? "Coeficiente V de Aiken por ítem" : "Razón de validez de contenido de Lawshe por ítem")); await insertarParrafos([texto]); H().ui.confirmar("Agregué la tabla y el párrafo después del cursor."); H().registrar("Validez de contenido", metodo, "calculo"); });
    acc.appendChild(bI); salida.appendChild(acc);
    salida.appendChild(el("p", "inv-nota", "Agrega a tus referencias: Penfield, R. D. y Giacobbi, P. R. (2004). Applying a score confidence interval to Aiken's item content-relevance index. Measurement in Physical Education and Exercise Science, 8(4), 213-225. https://doi.org/10.1207/s15327841mpee0804_3 · Ayre, C. y Scally, A. J. (2014). Critical values for Lawshe's content validity ratio. Measurement and Evaluation in Counseling and Development, 47(1), 79-86. https://doi.org/10.1177/0748175613513808"));
    return { tabla, texto };
  }

  /* ================= 4. Ética ================= */
  async function etica(signal) {
    const { el, tarjeta } = H();
    const falta = Docx.faltan(["titulo", "estudiante", "institucion", "programa", "correo"]);
    if (falta.length) { tarjeta("Datos para los documentos de ética", Docx.formulario(["titulo", "estudiante", "documento", "asesor", "institucion", "programa", "ciudad", "correo", "telefono"], () => etica(signal), "Estos datos van en los consentimientos y en la carta. Los guardo para la próxima vez.")); return; }
    const c = el("div", "inv-cuerpo etica");
    c.appendChild(el("p", "guia-resumen", "Preparo los documentos éticos de tu investigación con los datos de tu proyecto. Son plantillas de apoyo: el comité de ética de tu universidad debe revisarlas y aprobarlas."));
    const chk = (t, v) => { const l = el("label", "interruptor pequeno"); const i = el("input"); i.type = "checkbox"; i.checked = v; l.append(i, el("span", "riel"), el("span", "", t)); c.appendChild(l); return i; };
    const cA = chk("Consentimiento informado (participantes adultos)", true);
    const cM = chk("Consentimiento de padres o acudientes y asentimiento del menor", false);
    const cC = chk("Carta de solicitud a la institución", true);
    const cD = chk("Autorización de tratamiento de datos personales (Ley 1581 de 2012)", true);
    const campo = (t, ph) => { const l = el("label", "campo-pro"); l.appendChild(el("span", "", t)); const i = el("input", "ajuste"); i.placeholder = ph || ""; l.appendChild(i); c.appendChild(l); return i; };
    const iI = campo("Institución donde harás el trabajo de campo", "Ej.: Institución Educativa San Bernardo");
    const iR = campo("A quién va dirigida la carta (cargo y nombre)", "Ej.: Rector(a) …");
    const b = el("button", "boton primario", "Preparar documentos");
    b.onclick = () => H().ejecutar(() => generarEtica({ adultos: cA.checked, menores: cM.checked, carta: cC.checked, datos: cD.checked, institucionCampo: iI.value.trim(), destinatario: iR.value.trim() }, signal));
    c.appendChild(b);
    tarjeta("Documentos de ética", c);
  }
  async function generarEtica(o, signal) {
    const { documentoNumerado, pedirHerramienta, el, tarjeta, etiqueta, registrar } = H();
    const dp = Docx.datos();
    let info = { objetivo: "[Describe en palabras sencillas para qué es el estudio]", procedimiento: "[Qué hará el participante, cuántas veces y cuánto tiempo]", duracion: "[Duración]", riesgo: "riesgo mínimo", riesgos: "No se prevén riesgos mayores que los de la vida cotidiana.", beneficios: "[Beneficios]", poblacion: "[Participantes]", registro: "[Cómo se registran los datos]", menores: o.menores };
    if (!Config.faltaClave()) {
      try {
        const doc = await documentoNumerado();
        info = Object.assign(info, await pedirHerramienta("datos_etica", "Datos del proyecto para los documentos de ética, en lenguaje sencillo.",
          { type: "object", properties: {
            objetivo: { type: "string", description: "Propósito del estudio en 1 o 2 frases sencillas, sin tecnicismos" },
            objetivo_ninos: { type: "string", description: "El propósito explicado para un niño de 10 años, en 1 frase" },
            poblacion: { type: "string", description: "Quiénes participan (ej.: estudiantes de sexto grado)" },
            procedimiento: { type: "string", description: "Qué hará el participante: actividades, instrumentos, número de sesiones" },
            duracion: { type: "string", description: "Tiempo total aproximado o «[por definir]»" },
            registro: { type: "string", description: "Cómo se registran los datos (cuestionario, grabación de audio, fotografías, observación)" },
            riesgo: { type: "string", enum: ["sin riesgo", "riesgo mínimo", "riesgo mayor que el mínimo"], description: "Clasificación según el artículo 11 de la Resolución 8430 de 1993" },
            riesgos: { type: "string", description: "Riesgos o molestias posibles y cómo se manejan" },
            beneficios: { type: "string", description: "Beneficios para los participantes y la institución (sin prometer pagos)" },
            menores: { type: "boolean", description: "true si participan menores de 18 años" }
          }, required: ["objetivo", "procedimiento", "riesgo"] },
          `Extrae del proyecto la información necesaria para los documentos de consentimiento. Usa lenguaje claro para personas sin formación en investigación. Si algo no está en el documento, escribe «[por definir]» en lugar de inventarlo.

DOCUMENTO:
${doc.texto.slice(0, 60000)}`, signal));
      } catch (e) { /* se usan los campos por llenar */ }
    }
    if (info.menores) o.menores = true;
    const b = bloquesEtica(o, info, dp);
    registrar("Documentos de ética", Object.keys(o).filter(k => o[k] === true).join(", "), "plantilla");
    const c = el("div", "inv-cuerpo etica");
    c.appendChild(etiqueta("plantilla", "plantilla para revisar con el comité de ética"));
    c.appendChild(el("p", "guia-resumen", `Preparé ${[o.adultos && "el consentimiento informado", o.menores && "el consentimiento de acudientes y el asentimiento", o.carta && "la carta a la institución", o.datos && "la autorización de datos"].filter(Boolean).join(", ")}. Clasificación del riesgo propuesta: ${info.riesgo} (Resolución 8430 de 1993).`));
    c.appendChild(Docx.botones(b, "documentos-de-etica.docx", { tam: 11 }));
    const ul = el("ul", "guia-puntos lista-revisar");
    ["Completa lo que está entre corchetes [ ].", "Confirma la clasificación del riesgo con tu asesor.", "Si grabas audio o video o tomas fotografías, el consentimiento debe decirlo explícitamente (ya está incluido).", "Guarda los consentimientos firmados en un lugar seguro y menciónalos en tu metodología (apartado de consideraciones éticas)."].forEach(x => ul.appendChild(el("li", "", x)));
    c.appendChild(ul);
    tarjeta("Documentos de ética listos", c);
    H().ui.hablar("Listo. Preparé los documentos de ética. Revísalos con tu asesor y el comité de ética.");
    return b;
  }
  function bloquesEtica(o, info, dp) {
    const B = [];
    const inv = dp.estudiante || "[Nombre del investigador]", uni = dp.institucion || "[Universidad]", prog = dp.programa || "[Programa]";
    const contacto = [dp.correo, dp.telefono].filter(Boolean).join(" · ") || "[correo y teléfono]";
    const campo = o.institucionCampo || "[Institución donde se hará el estudio]";
    const titulo = dp.titulo || "[Título del proyecto]";
    const encabezado = (t) => { if (B.length) B.push({ t: "salto" }); B.push({ t: "titulo", texto: t }, { texto: `${uni} · ${prog}`, centrado: true }, { texto: `**Proyecto:** ${titulo}` }, { texto: `**Investigador(a):** ${inv}${dp.asesor ? " · **Asesor(a):** " + dp.asesor : ""}` }); };
    const comun = (quien) => [
      { t: "h2", texto: "¿Para qué es este estudio?" }, { texto: info.objetivo, justificado: true },
      { t: "h2", texto: `¿Qué ${quien === "acudiente" ? "hará su hijo(a) o acudido(a)" : "hará usted"}?` }, { texto: `${info.procedimiento}${info.duracion ? " Duración aproximada: " + info.duracion + "." : ""}${info.registro ? " Los datos se registrarán mediante: " + info.registro + "." : ""}`, justificado: true },
      { t: "h2", texto: "Riesgos y beneficios" }, { texto: `Según el artículo 11 de la Resolución 8430 de 1993 del Ministerio de Salud, este estudio se considera de **${info.riesgo}**. ${info.riesgos || ""} ${info.beneficios ? "Beneficios: " + info.beneficios : ""} La participación no tiene costo ni pago.`, justificado: true },
      { t: "h2", texto: "Confidencialidad" }, { texto: "La información será confidencial. Los nombres se reemplazarán por códigos, los datos se guardarán de forma segura y solo los usará el equipo investigador con fines académicos. Los resultados se publicarán sin identificar a ninguna persona.", justificado: true },
      { t: "h2", texto: "Participación voluntaria" }, { texto: "La participación es voluntaria. Puede negarse a participar o retirarse en cualquier momento, sin dar explicaciones y sin ninguna consecuencia académica, laboral o de otro tipo.", justificado: true },
      { t: "h2", texto: "Preguntas" }, { texto: `Si tiene dudas, puede comunicarse con ${inv}: ${contacto}.` }
    ];
    if (o.adultos) {
      encabezado("Consentimiento informado");
      B.push({ texto: `Usted ha sido invitado(a) a participar en una investigación que se realizará en ${campo}. Antes de decidir, lea con atención este documento y haga todas las preguntas que necesite.`, justificado: true });
      B.push(...comun("adulto"));
      B.push({ t: "h2", texto: "Declaración" }, { texto: "Declaro que leí (o me leyeron) este documento, que entendí la información, que pude hacer preguntas y que acepto participar voluntariamente. Autorizo ☐ sí ☐ no la grabación de audio o video y el uso de fotografías sin rostros identificables.", justificado: true });
      B.push({ t: "tabla", filas: [["Nombre del participante", ""], ["Documento de identidad", ""], ["Fecha", ""]], cabecera: false, anchos: [3500, 5500] });
      B.push({ t: "firma", nombres: ["Firma del participante", `Firma del investigador(a): ${inv}`] });
    }
    if (o.menores) {
      encabezado("Consentimiento informado de padres, madres o acudientes");
      B.push({ texto: `Su hijo(a) o acudido(a) ha sido invitado(a) a participar en una investigación que se realizará en ${campo}. De acuerdo con la Ley 1098 de 2006 (Código de la Infancia y la Adolescencia), su autorización es necesaria, y también la voluntad del niño, niña o adolescente.`, justificado: true });
      B.push(...comun("acudiente"));
      B.push({ t: "h2", texto: "Autorización" }, { texto: "Declaro que leí este documento, que entendí la información y que autorizo voluntariamente la participación de mi hijo(a) o acudido(a). Autorizo ☐ sí ☐ no la grabación de audio o video y el uso de fotografías sin rostros identificables.", justificado: true });
      B.push({ t: "tabla", filas: [["Nombre del estudiante", ""], ["Grado", ""], ["Nombre del padre, madre o acudiente", ""], ["Documento de identidad", ""], ["Parentesco", ""], ["Fecha", ""]], cabecera: false, anchos: [4000, 5000] });
      B.push({ t: "firma", nombres: ["Firma del padre, madre o acudiente", `Firma del investigador(a): ${inv}`] });
      B.push({ t: "salto" }, { t: "titulo", texto: "Asentimiento informado" }, { texto: "(Para leer junto con el niño, niña o adolescente)", centrado: true });
      B.push({ texto: `Hola. Me llamo ${inv} y estoy haciendo un estudio. ${info.objetivo_ninos || "Quiero aprender cómo podemos mejorar algunas cosas en el colegio."}`, justificado: true });
      B.push({ texto: `Si aceptas, te pediré que ${String(info.procedimiento || "participes en unas actividades").charAt(0).toLowerCase() + String(info.procedimiento || "participes en unas actividades").slice(1)}`, justificado: true });
      B.push({ t: "lista", items: ["No tienes que participar si no quieres. Nadie se va a enojar contigo.", "Puedes dejar de participar cuando quieras, aunque ya hayas empezado.", "No es un examen: no hay respuestas buenas ni malas y no afecta tus notas.", "No voy a decir tu nombre a nadie. Usaré un código en lugar de tu nombre.", "Tus padres o acudientes ya saben de este estudio.", "Puedes preguntarme lo que quieras."] });
      B.push({ texto: "¿Quieres participar? Marca tu respuesta:" }, { texto: "☐ Sí, quiero participar        ☐ No quiero participar", centrado: true });
      B.push({ t: "tabla", filas: [["Mi nombre", ""], ["Fecha", ""]], cabecera: false, anchos: [3000, 6000] });
      B.push({ t: "firma", nombres: ["Mi firma"] });
    }
    if (o.carta) {
      if (B.length) B.push({ t: "salto" });
      B.push({ texto: `${dp.ciudad || "[Ciudad]"}, ${Docx.fechaLarga()}` }, { t: "vacio" });
      B.push({ texto: o.destinatario || "Señor(a) Rector(a)" }, { texto: campo }, { texto: "Ciudad" }, { t: "vacio" });
      B.push({ texto: "**Asunto:** Solicitud de autorización para realizar trabajo de campo de investigación" }, { t: "vacio" });
      B.push({ texto: "Cordial saludo." });
      B.push({ texto: `Me dirijo a usted como estudiante del programa ${prog} de ${uni} para solicitar su autorización para realizar en ${campo} el trabajo de campo del proyecto de investigación «${titulo}»${dp.asesor ? ", bajo la asesoría de " + dp.asesor : ""}.`, justificado: true });
      B.push({ texto: `El estudio busca ${String(info.objetivo || "").charAt(0).toLowerCase() + String(info.objetivo || "").slice(1)} Participarían ${info.poblacion || "[participantes]"}. ${info.procedimiento}${info.duracion ? " Duración aproximada: " + info.duracion + "." : ""}`, justificado: true });
      B.push({ texto: "Me comprometo a obtener el consentimiento informado de los participantes (y de los acudientes, en el caso de menores de edad), a proteger la confidencialidad de la información, a no interferir con las actividades académicas y a compartir los resultados con la institución.", justificado: true });
      B.push({ texto: "Agradezco de antemano su atención y quedo atento(a) a cualquier inquietud." }, { t: "vacio" }, { texto: "Atentamente," });
      B.push({ t: "firma", nombres: [`${inv}${dp.documento ? " · C. C. " + dp.documento : ""}\n${prog} · ${uni}\n${contacto}`] });
    }
    if (o.datos) {
      if (B.length) B.push({ t: "salto" });
      B.push({ t: "titulo", texto: "Autorización para el tratamiento de datos personales" });
      B.push({ texto: `En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, autorizo a ${inv}, estudiante de ${prog} de ${uni}, para recolectar, almacenar y usar mis datos personales${o.menores ? " (o los de mi hijo/a o acudido/a)" : ""} con la única finalidad de desarrollar el proyecto de investigación «${titulo}».`, justificado: true });
      B.push({ t: "lista", items: ["Los datos se usarán solo con fines académicos y se presentarán de forma anónima.", "No se entregarán a terceros sin mi autorización.", "Puedo conocer, actualizar, rectificar o pedir que se supriman mis datos en cualquier momento, escribiendo a " + contacto + ".", "Los datos sensibles (imágenes, voz, información de menores) solo se tratarán con autorización expresa, y no estoy obligado(a) a autorizarlos."] });
      B.push({ t: "tabla", filas: [["Nombre", ""], ["Documento de identidad", ""], ["Fecha", ""]], cabecera: false, anchos: [3500, 5500] });
      B.push({ t: "firma", nombres: ["Firma"] });
    }
    return B;
  }

  /* ================= Comandos ================= */
  function comando(n) {
    const tarea = (fn) => async () => { H().ui.ocupar(true, "Instrumentos…"); try { await fn(); } catch (e) { H().ui.mostrarError(e); } finally { H().ui.ocupar(false); } };
    if (/(calcula|calcular|calculame|cual es|de cuanto es|cuantos participantes|tamano)( el| la| de| mi)* (tamano de (la )?)?muestra|^muestra$|calculadora de muestra/.test(n)) return () => muestra();
    if (/(disena|crea|creame|haz|hazme|arma|genera|construye|elabora)( me)?( el| un| mi)? (cuestionario|encuesta|instrumento)/.test(n)) return tarea(() => instrumento("cuestionario"));
    if (/(disena|crea|creame|haz|hazme|arma|genera|construye|elabora)( me)?( el| un| mi)? (guion|guia) de (la )?entrevista/.test(n)) return tarea(() => instrumento("guion"));
    if (/(v de aiken|aiken|lawshe|juicio de expertos|validez de contenido|valida(r)? (el |mi )?instrumento|validacion por (jueces|expertos))/.test(n)) return () => validacion();
    if (/(consentimiento|asentimiento|documentos de etica|carta (a|para) la institucion|tratamiento de datos|comite de etica|etica)/.test(n) && !/(declaracion|uso de ia)/.test(n)) return tarea(() => etica());
    return null;
  }

  return { muestra, calcular, instrumento, validacion, etica, generarEtica, comando, _aiken: aiken, _lawshe: lawshe, _cvrCritico: cvrCritico, _docInstrumento: docInstrumento, _docValidacion: docValidacion, _bloquesEtica: bloquesEtica, _resultadoValidacion: resultadoValidacion, get ultimo() { return ultimoInstrumento; } };
})();
