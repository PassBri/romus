/* Romus · Escribir los capítulos finales y difundir.
   - Discusión triangulada: cada resultado frente a los antecedentes citados en el documento.
   - Conclusiones frente a objetivos: ¿cada objetivo tiene su conclusión?
   - Resumen y abstract con palabras clave (y comprobación de extensión).
   - De la tesis al artículo científico (IMRyD) y revistas donde se publica el tema (OpenAlex).
   - Diapositivas de sustentación: esquema que PowerPoint convierte en presentación + guion del orador.
   Todo lo que la IA dice que está en el documento se verifica literalmente. */
window.Escritura = (function () {
  const H = () => Inv._h;
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const tutor = () => (Config.get().modoAyuda || "tutor") === "tutor";
  const exigir = () => { if (Config.faltaClave()) throw new Error("Para esto necesito tu IA conectada (Ajustes)."); };
  const palabras = (t) => String(t || "").trim().split(/\s+/).filter(Boolean).length;
  async function insertar(bloques) {
    await Word.run(async (ctx) => {
      const ps = ctx.document.getSelection().paragraphs; ps.load("items"); await ctx.sync();
      let ref = ps.items[ps.items.length - 1];
      bloques.forEach(b => {
        if (b.tabla) { try { ref.insertTable(b.tabla.length, b.tabla[0].length, "After", b.tabla); } catch (e) { b.tabla.forEach(f => { ref = ref.insertParagraph(f.join(" · "), "After"); }); } return; }
        ref = ref.insertParagraph(b.texto, "After"); ref.styleBuiltIn = b.estilo || "Normal";
        if (b.negrita) ref.font.bold = true; if (b.centrado) ref.alignment = "Centered";
      });
      await ctx.sync();
    });
  }
  function seccion(parrafos, re) {
    const tit = parrafos.filter(p => Doc.esTitulo(p.estilo));
    const t = tit.find(p => re.test(p.texto.trim()));
    if (!t) return "";
    const sig = tit.find(p => p.i > t.i && (Formato._nivelDe(p.estilo) || 1) <= (Formato._nivelDe(t.estilo) || 1));
    return parrafos.filter(p => p.i > t.i && (!sig || p.i < sig.i)).map(p => `[${p.i}] ${p.texto}`).join("\n");
  }

  /* ---------- Discusión triangulada ---------- */
  async function discusion(signal) {
    exigir();
    const { documentoNumerado, pedirHerramienta, el, tarjeta, etiqueta, verificar, irA, registrar } = H();
    const doc = await documentoNumerado();
    const res = seccion(doc.parrafos, /resultados|hallazgos|an[aá]lisis de (los )?(datos|resultados)/i);
    if (!res) throw new Error("No encontré la sección de resultados (un título «Resultados»). Escríbela primero.");
    const marco = [seccion(doc.parrafos, /antecedentes|estado del arte/i), seccion(doc.parrafos, /marco te[oó]rico|referentes? te[oó]ricos?|marco conceptual/i)].join("\n").slice(0, 40000);
    const d = await pedirHerramienta("discusion", "Triangulación de los resultados con los antecedentes y la teoría citados en el documento.",
      { type: "object", properties: { hallazgos: { type: "array", items: { type: "object", properties: {
        resultado: { type: "string", description: "Fragmento LITERAL de los resultados (máx. 30 palabras)" },
        relaciones: { type: "array", items: { type: "object", properties: { cita: { type: "string", description: "Cita tal como aparece en el documento, ej.: (Ruiz, 2021)" }, relacion: { type: "string", enum: ["coincide", "contradice", "amplía", "matiza"] }, explicacion: { type: "string" } }, required: ["cita", "relacion", "explicacion"] } },
        explicacion_posible: { type: "string", description: "Posibles razones del resultado (contexto, método, población)" },
        implicacion: { type: "string", description: "Qué significa para la práctica o la teoría" },
        borrador: { type: "string", description: tutor() ? "Vacío (modo tutor)" : "Párrafo de discusión en APA 7 usando solo citas del documento" }
      }, required: ["resultado", "relaciones"] } },
        preguntas: { type: "array", items: { type: "string" }, description: "Preguntas que el jurado haría sobre la discusión" },
        limitaciones: { type: "array", items: { type: "string" } }
      }, required: ["hallazgos"] },
      `Para cada resultado principal, compáralo con los antecedentes y la teoría que el documento YA cita: ¿coincide, contradice, amplía o matiza? Usa SOLO citas que aparecen en el documento; no agregues autores nuevos. Máximo 6 hallazgos.
${tutor() ? "MODO TUTOR: no redactes la discusión; deja «borrador» vacío y da orientaciones." : ""}

RESULTADOS:
${res}

ANTECEDENTES Y MARCO TEÓRICO:
${marco || "(no encontré estas secciones)"}`, signal);
    const texto = norm(doc.texto);
    const hall = (d.hallazgos || []).map(h => {
      const i = verificar(h.resultado, doc.parrafos);
      const rel = (h.relaciones || []).map(r => Object.assign(r, { enDoc: texto.includes(norm(r.cita).replace(/[()]/g, "").split(",")[0]) }));
      return Object.assign(h, { i, relaciones: rel });
    }).filter(h => h.i >= 0);
    registrar("Discusión triangulada", `${hall.length} hallazgos`, "modelo");
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("documento", "resultados verificados en tu documento"));
    c.appendChild(el("p", "guia-resumen", `Triangulé ${hall.length} resultados con lo que ya citas. Una buena discusión explica, compara y dice qué significa: no repite los resultados.`));
    const tb = el("table", "tabla-mini");
    const filas = [["Resultado", "Antecedente", "Relación", "Explicación"]];
    hall.forEach(h => { h.relaciones.forEach((r, k) => filas.push([k ? "" : h.resultado, r.cita + (r.enDoc ? "" : " ⚠"), r.relacion, r.explicacion])); if (!h.relaciones.length) filas.push([h.resultado, "Sin antecedentes citados", "—", "Busca literatura para discutir este hallazgo."]); });
    filas.forEach((f, i) => { const tr = el("tr"); f.forEach(x => tr.appendChild(el(i ? "td" : "th", "", x))); tb.appendChild(tr); });
    c.appendChild(tb);
    hall.forEach(h => {
      const b = el("div", "prioridad");
      b.appendChild(el("b", "", h.resultado.length > 90 ? h.resultado.slice(0, 87) + "…" : h.resultado));
      if (h.explicacion_posible) b.appendChild(el("span", "", "Posible explicación: " + h.explicacion_posible));
      if (h.implicacion) b.appendChild(el("span", "", "Implicación: " + h.implicacion));
      if (h.borrador) b.appendChild(el("small", "", "Borrador: " + h.borrador));
      const bI = el("button", "enlace-sutil", "Ver el resultado"); bI.onclick = () => irA(h.i); b.appendChild(bI);
      c.appendChild(b);
    });
    if (hall.some(h => h.relaciones.some(r => !r.enDoc))) c.appendChild(el("p", "inv-nota", "⚠ = la IA mencionó una cita que no encontré en tu documento: no la uses sin verificarla."));
    if ((d.preguntas || []).length) { c.appendChild(el("div", "inv-sub", "Lo que preguntaría el jurado")); const ul = el("ul", "guia-puntos"); d.preguntas.forEach(q => ul.appendChild(el("li", "", q))); c.appendChild(ul); }
    if ((d.limitaciones || []).length) { c.appendChild(el("div", "inv-sub", "Limitaciones que conviene declarar")); const ul = el("ul", "guia-puntos"); d.limitaciones.forEach(q => ul.appendChild(el("li", "", q))); c.appendChild(ul); }
    const acc = el("div", "inv-acciones");
    const bT = el("button", "boton secundario", "Insertar matriz de triangulación"); bT.onclick = () => H().ejecutar(async () => { await insertar([{ texto: "Matriz de triangulación de resultados", negrita: true }, { tabla: filas }]); H().ui.confirmar("Agregué la matriz después del cursor."); }); acc.appendChild(bT);
    if (!tutor() && hall.some(h => h.borrador)) { const bB = el("button", "boton primario", "Insertar borrador"); bB.onclick = () => H().ejecutar(async () => { await insertar(hall.filter(h => h.borrador).map(h => ({ texto: h.borrador }))); H().ui.confirmar("Agregué el borrador. Reescríbelo con tu voz."); }); acc.appendChild(bB); }
    c.appendChild(acc);
    tarjeta("Discusión triangulada", c);
    H().ui.hablar(`Triangulé ${hall.length} resultados con tus antecedentes.`);
    return { hall, d };
  }

  /* ---------- Conclusiones frente a objetivos ---------- */
  async function conclusiones(signal) {
    exigir();
    const { documentoNumerado, pedirHerramienta, el, tarjeta, etiqueta, verificar, irA, registrar } = H();
    const doc = await documentoNumerado();
    const d = await pedirHerramienta("conclusiones_objetivos", "Correspondencia entre objetivos y conclusiones.",
      { type: "object", properties: { pares: { type: "array", items: { type: "object", properties: {
        objetivo: { type: "string", description: "Objetivo (general o específico), LITERAL del documento" },
        conclusion: { type: "string", description: "Fragmento LITERAL de la conclusión que lo responde, o vacío si no hay" },
        estado: { type: "string", enum: ["respondido", "parcial", "sin_conclusion"] },
        sugerencia: { type: "string", description: "Qué falta concluir, apoyado en los resultados del documento" }
      }, required: ["objetivo", "estado"] } },
        conclusiones_sin_objetivo: { type: "array", items: { type: "string" }, description: "Conclusiones LITERALES que no responden a ningún objetivo (o que concluyen más de lo que se estudió)" }
      }, required: ["pares"] },
      `Empareja cada objetivo (general y específicos) con la conclusión que lo responde. Señala objetivos sin conclusión y conclusiones que no se derivan de ningún objetivo o que van más allá de los resultados.

DOCUMENTO:
${doc.texto}`, signal);
    const pares = (d.pares || []).map(p => Object.assign(p, { iO: verificar(p.objetivo, doc.parrafos), iC: p.conclusion ? verificar(p.conclusion, doc.parrafos) : -1 })).filter(p => p.iO >= 0);
    pares.forEach(p => { if (p.conclusion && p.iC < 0) { p.estado = "sin_conclusion"; p.conclusion = ""; } });
    if (!pares.length) throw new Error("No encontré tus objetivos en el documento. Escríbelos bajo un título «Objetivos» y vuelve a intentarlo.");
    const sobran = (d.conclusiones_sin_objetivo || []).filter(x => verificar(x, doc.parrafos) >= 0);
    const ok = pares.filter(p => p.estado === "respondido").length;
    registrar("Conclusiones vs. objetivos", `${ok}/${pares.length}`, "documento");
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("documento", "objetivos y conclusiones verificados en tu documento"));
    c.appendChild(el("div", "inv-puntaje")).append(el("b", "", `${ok}/${pares.length}`), el("span", "", "objetivos con conclusión"));
    const tb = el("table", "tabla-mini");
    const tr0 = el("tr"); ["Objetivo", "Conclusión", "Estado"].forEach(x => tr0.appendChild(el("th", "", x))); tb.appendChild(tr0);
    const txt = { respondido: "Respondido", parcial: "Parcial", sin_conclusion: "Sin conclusión" };
    pares.forEach(p => { const tr = el("tr"); tr.append(el("td", "", p.objetivo), el("td", "", p.conclusion || "—"), el("td", p.estado === "respondido" ? "ok" : p.estado === "parcial" ? "medio" : "mal", txt[p.estado])); tb.appendChild(tr); });
    c.appendChild(tb);
    pares.filter(p => p.estado !== "respondido" && p.sugerencia).forEach(p => { const b = el("div", "prioridad"); b.append(el("b", "", p.objetivo.slice(0, 80)), el("span", "", p.sugerencia)); const bI = el("button", "enlace-sutil", "Ver el objetivo"); bI.onclick = () => irA(p.iO); b.appendChild(bI); c.appendChild(b); });
    if (sobran.length) { const f = el("div", "guia-caja error"); f.appendChild(el("b", "", "Conclusiones que no responden a un objetivo")); const ul = el("ul", "guia-puntos"); sobran.forEach(x => ul.appendChild(el("li", "", x))); f.appendChild(ul); c.appendChild(f); }
    const pend = pares.filter(p => p.estado !== "respondido");
    if (pend.length) { const b = el("button", "boton secundario", "Comentar en el documento"); b.onclick = () => H().ejecutar(async () => { const x = await Doc.comentar(pend.map(p => ({ parrafo: p.iO, fragmento: p.objetivo.slice(0, 200), comentario: `Este objetivo ${p.estado === "parcial" ? "solo se responde en parte" : "no tiene conclusión"}. ${p.sugerencia || ""}` }))); H().ui.confirmar(`Dejé ${x.hechos} comentarios.`); }); c.appendChild(b); }
    tarjeta("Conclusiones frente a objetivos", c);
    H().ui.hablar(`${ok} de ${pares.length} objetivos tienen su conclusión.`);
    return { pares, sobran };
  }

  /* ---------- Resumen y abstract ---------- */
  async function resumen(signal) {
    exigir();
    const { documentoNumerado, pedirHerramienta, el, tarjeta, etiqueta, registrar } = H();
    const doc = await documentoNumerado();
    const d = await pedirHerramienta("resumen_abstract", "Resumen y abstract del trabajo.",
      { type: "object", properties: {
        resumen: { type: "string", description: "Un solo párrafo de 150 a 250 palabras: problema y objetivo, método (enfoque, diseño, participantes, instrumentos), resultados principales y conclusión. Sin citas." },
        palabras_clave: { type: "array", items: { type: "string" }, description: "3 a 5 palabras clave en español, preferiblemente términos del Tesauro de la UNESCO" },
        abstract: { type: "string", description: "Traducción fiel al inglés académico del resumen" },
        keywords: { type: "array", items: { type: "string" } }
      }, required: ["resumen", "palabras_clave", "abstract", "keywords"] },
      `Redacta el resumen del trabajo usando SOLO lo que dice el documento. Si aún no hay resultados, descríbelos como esperados. No inventes cifras.

DOCUMENTO:
${doc.texto}`, signal);
    const n = palabras(d.resumen);
    const cifras = (d.resumen.match(/\d+(?:[.,]\d+)?/g) || []).filter(x => !norm(doc.texto).includes(norm(x)));
    registrar("Resumen y abstract", `${n} palabras`, "modelo");
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("modelo", `${n} palabras${n > 250 ? " · supera 250" : ""}`));
    c.appendChild(el("b", "", "Resumen")); c.appendChild(el("p", "apa-ref", d.resumen));
    c.appendChild(el("p", "inv-nota", "Palabras clave: " + d.palabras_clave.join(", ")));
    c.appendChild(el("b", "", "Abstract")); c.appendChild(el("p", "apa-ref", d.abstract));
    c.appendChild(el("p", "inv-nota", "Keywords: " + d.keywords.join(", ")));
    if (cifras.length) c.appendChild(el("p", "inv-nota", "⚠ Estas cifras no aparecen en tu documento: " + cifras.join(", ") + ". Revísalas."));
    const a = el("a", "enlace-sutil", "Comprobar las palabras clave en el Tesauro de la UNESCO ↗"); a.href = "https://vocabularies.unesco.org/browser/thesaurus/es/"; a.target = "_blank"; a.rel = "noopener"; c.appendChild(a);
    const b = el("button", "boton primario", "Insertar después del cursor");
    b.onclick = () => H().ejecutar(async () => { await insertar([{ texto: "Resumen", estilo: "Heading1" }, { texto: d.resumen }, { texto: "Palabras clave: " + d.palabras_clave.join(", ") }, { texto: "Abstract", estilo: "Heading1" }, { texto: d.abstract }, { texto: "Keywords: " + d.keywords.join(", ") }]); H().ui.confirmar("Agregué el resumen y el abstract."); });
    c.appendChild(b);
    tarjeta("Resumen y abstract", c);
    return d;
  }

  /* ---------- De la tesis al artículo ---------- */
  async function articulo(signal) {
    exigir();
    const { documentoNumerado, pedirHerramienta, el, tarjeta, etiqueta, registrar } = H();
    const doc = await documentoNumerado();
    const d = await pedirHerramienta("articulo_cientifico", "Artículo científico (IMRyD) a partir de la tesis.",
      { type: "object", properties: {
        titulo: { type: "string", description: "Máximo 15 palabras" }, titulo_en: { type: "string" },
        resumen: { type: "string", description: "150 a 250 palabras" }, palabras_clave: { type: "array", items: { type: "string" } },
        abstract: { type: "string" }, keywords: { type: "array", items: { type: "string" } },
        introduccion: { type: "string", description: "Problema, antecedentes clave, vacío y objetivo (párrafos separados por saltos de línea)" },
        metodo: { type: "string" }, resultados: { type: "string" }, discusion: { type: "string" }, conclusiones: { type: "string" }
      }, required: ["titulo", "resumen", "introduccion", "metodo", "resultados", "discusion", "conclusiones"] },
      `Convierte esta tesis en un borrador de artículo científico con estructura IMRyD, de 4000 a 6000 palabras. Condensa: el artículo no es un resumen de cada capítulo, sino el hallazgo central bien argumentado.
Reglas: usa SOLO datos y citas que aparecen en la tesis (con el mismo formato de cita); no inventes cifras ni autores; escribe en tercera persona y en pasado para método y resultados.

TESIS:
${doc.texto}`, signal);
    // Referencias: solo las de la tesis que el artículo cita
    const { refs } = Jurado._extraerReferencias(doc.parrafos);
    const cuerpo = [d.introduccion, d.metodo, d.resultados, d.discusion, d.conclusiones].join(" ");
    const usadas = refs.filter(r => r.primer && new RegExp("\\b" + r.primer.replace(/[^a-zñ]/g, "") + "\\b", "i").test(norm(cuerpo)) && cuerpo.includes(String(r.anio).slice(0, 4)));
    const ajenas = (cuerpo.match(/\(([A-ZÁÉÍÓÚÑ][^()]{1,60}?),\s*((?:19|20)\d{2})/g) || []).filter(c => !norm(doc.texto).includes(norm(c.replace(/^\(/, "").split(",")[0])));
    const total = palabras(cuerpo) + palabras(d.resumen);
    registrar("Artículo desde la tesis", `${total} palabras`, "modelo");
    const P = (t) => String(t || "").split(/\n+/).map(x => x.trim()).filter(Boolean).map(x => ({ texto: x, sangria: true }));
    const bloques = () => [{ t: "titulo", texto: d.titulo }].concat(d.titulo_en ? [{ texto: "_" + d.titulo_en + "_", centrado: true }] : [])
      .concat([{ texto: Docx.datos().estudiante || "[Autor]", centrado: true }, { texto: Docx.datos().institucion || "", centrado: true },
        { t: "h2", texto: "Resumen" }, { texto: d.resumen }, { texto: "**Palabras clave:** " + (d.palabras_clave || []).join(", ") },
        { t: "h2", texto: "Abstract" }, { texto: d.abstract || "" }, { texto: "**Keywords:** " + (d.keywords || []).join(", ") },
        { t: "h1", texto: "Introducción" }]).concat(P(d.introduccion))
      .concat([{ t: "h1", texto: "Método" }]).concat(P(d.metodo))
      .concat([{ t: "h1", texto: "Resultados" }]).concat(P(d.resultados))
      .concat([{ t: "h1", texto: "Discusión" }]).concat(P(d.discusion))
      .concat([{ t: "h1", texto: "Conclusiones" }]).concat(P(d.conclusiones))
      .concat([{ t: "h1", texto: "Referencias", salto: true }]).concat(usadas.map(r => ({ t: "ref", texto: r.texto })));
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("modelo", `borrador de ${total} palabras · ${usadas.length} referencias de tu tesis`));
    c.appendChild(el("p", "guia-resumen", `«${d.titulo}». Ábrelo en un documento nuevo, revísalo con tu asesor y adáptalo a las normas de la revista que elijas.`));
    if (ajenas.length) c.appendChild(el("p", "inv-nota", "⚠ Citas que no están en tu tesis (bórralas o verifícalas): " + ajenas.join("; ")));
    c.appendChild(Docx.botones(bloques, "articulo-cientifico.docx", { apa: true, doble: true }, "Abrir artículo en Word"));
    const b = el("button", "boton secundario", "¿Dónde puedo publicarlo?"); b.onclick = () => H().ejecutar(() => revistas((d.palabras_clave || []).concat(d.keywords || []).slice(0, 6).join(" ")));
    c.appendChild(b);
    tarjeta("Artículo desde tu tesis", c);
    H().ui.hablar("Preparé el borrador del artículo. Ábrelo en Word y revísalo con tu asesor.");
    return d;
  }

  /* ---------- Revistas donde se publica el tema ---------- */
  async function revistas(tema) {
    const { el, tarjeta, etiqueta, registrar } = H();
    tema = String(tema || "").trim();
    if (!tema) { const t = (Docx.datos().titulo || "").trim(); if (!t) throw new Error("Dime el tema: «¿dónde publico sobre…?»"); tema = t; }
    const consulta = async (es) => {
      const p = new URLSearchParams({ search: tema, group_by: "primary_location.source.id", filter: "type:article,from_publication_date:" + (new Date().getFullYear() - 5) + "-01-01" + (es ? ",language:es" : "") });
      const r = await fetch("https://api.openalex.org/works?" + p); if (!r.ok) throw new Error("No pude consultar OpenAlex.");
      return ((await r.json()).group_by || []).filter(g => g.key && g.key !== "unknown").slice(0, 6);
    };
    const [es, todo] = await Promise.all([consulta(true), consulta(false)]);
    const ids = Array.from(new Set(es.concat(todo).map(g => g.key.split("/").pop())));
    let fuentes = [];
    if (ids.length) {
      const r = await fetch("https://api.openalex.org/sources?per-page=20&select=id,display_name,issn_l,homepage_url,summary_stats,is_oa,is_in_doaj,country_code,apc_usd,host_organization_name&filter=openalex_id:" + ids.join("|"));
      if (r.ok) fuentes = (await r.json()).results || [];
    }
    const info = (g) => Object.assign({ n: g.count }, fuentes.find(f => f.id.split("/").pop() === g.key.split("/").pop()) || { display_name: g.key_display_name });
    registrar("Revistas sugeridas", tema, "fuente");
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("fuente", "artículos de los últimos 5 años"));
    c.appendChild(el("p", "guia-resumen", `Revistas que más han publicado sobre «${tema}». Verifica su categoría en Publindex (Minciencias) o su cuartil en Scimago, y lee sus normas para autores.`));
    [["En español", es], ["En todos los idiomas", todo]].forEach(([t, xs]) => {
      if (!xs.length) return;
      c.appendChild(el("div", "inv-sub", t));
      xs.map(info).forEach(s => {
        const b = el("div", "prioridad");
        b.appendChild(el("b", "", s.display_name));
        b.appendChild(el("small", "", [`${s.n} artículos sobre el tema`, s.country_code, s.summary_stats ? "índice h " + s.summary_stats.h_index : "", s.is_in_doaj ? "DOAJ" : "", s.is_oa ? "acceso abierto" : "", s.apc_usd ? `cobra ${s.apc_usd} USD por publicar` : s.is_oa ? "sin cobro registrado" : ""].filter(Boolean).join(" · ")));
        const a = el("div", "inv-acciones");
        if (s.homepage_url) { const l = el("a", "enlace-sutil", "Sitio"); l.href = s.homepage_url; l.target = "_blank"; l.rel = "noopener"; a.appendChild(l); }
        if (s.issn_l) { const l = el("a", "enlace-sutil", "Scimago"); l.href = "https://www.scimagojr.com/journalsearch.php?q=" + s.issn_l; l.target = "_blank"; l.rel = "noopener"; a.appendChild(l); }
        b.appendChild(a); c.appendChild(b);
      });
    });
    if (!es.length && !todo.length) c.appendChild(el("p", "inv-nota", "No encontré revistas con esos términos. Prueba con palabras clave en inglés."));
    c.appendChild(el("p", "inv-nota", "Cuidado con las revistas depredadoras: desconfía si te escriben ofreciendo publicar rápido a cambio de un pago."));
    tarjeta("¿Dónde publicar?", c);
  }

  /* ---------- Diapositivas de sustentación ---------- */
  async function diapositivas(signal) {
    exigir();
    const { documentoNumerado, pedirHerramienta, el, tarjeta, etiqueta, registrar } = H();
    const doc = await documentoNumerado();
    const d = await pedirHerramienta("diapositivas", "Esquema de diapositivas para la sustentación.",
      { type: "object", properties: { minutos: { type: "integer" }, diapositivas: { type: "array", items: { type: "object", properties: {
        titulo: { type: "string", description: "Título corto (máx. 8 palabras)" },
        puntos: { type: "array", items: { type: "string" }, description: "2 a 4 puntos de máximo 12 palabras; sin párrafos" },
        visual: { type: "string", description: "Sugerencia de gráfico, tabla o imagen para esta diapositiva" },
        notas: { type: "string", description: "Lo que el estudiante dice en esta diapositiva (60 a 120 palabras, en primera persona)" }
      }, required: ["titulo", "puntos", "notas"] } } }, required: ["diapositivas"] },
      `Prepara la sustentación de este trabajo en 12 a 15 diapositivas para unos 20 minutos: título, problema, pregunta y objetivos, referentes clave, método, resultados (2 a 4 diapositivas), discusión, conclusiones, aportes y limitaciones, cierre. Usa solo datos del documento. Poco texto por diapositiva.

DOCUMENTO:
${doc.texto}`, signal);
    const ds = d.diapositivas || [];
    registrar("Diapositivas de sustentación", `${ds.length} diapositivas`, "modelo");
    const esquema = () => ds.flatMap(s => [{ t: "h1", texto: s.titulo }].concat((s.puntos || []).map(p => ({ t: "h2", texto: p }))));
    const guion = () => [{ t: "titulo", texto: "Guion para la sustentación" }].concat(ds.flatMap((s, k) => [{ t: "h2", texto: `${k + 1}. ${s.titulo}` }, { texto: s.notas, justificado: true }].concat(s.visual ? [{ texto: "_Visual sugerido: " + s.visual + "_" }] : [])));
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("modelo", `${ds.length} diapositivas · con datos de tu documento`));
    const ol = el("ol", "guia-puntos"); ds.forEach(s => ol.appendChild(el("li", "", s.titulo))); c.appendChild(ol);
    c.appendChild(el("div", "inv-sub", "1. Esquema para PowerPoint"));
    c.appendChild(Docx.botones(esquema, "esquema-diapositivas.docx", {}, "Descargar esquema"));
    c.appendChild(el("p", "inv-nota", "En PowerPoint: Inicio → Nueva diapositiva → Diapositivas del esquema → elige este archivo. Cada título se vuelve una diapositiva. Luego aplica un diseño en Diseño → Diseñador."));
    c.appendChild(el("div", "inv-sub", "2. Guion del orador"));
    c.appendChild(Docx.botones(guion, "guion-sustentacion.docx", { tam: 12 }, "Abrir guion en Word"));
    const b = el("button", "boton secundario", "Practicar con el simulacro de jurado"); b.onclick = () => { if (window.Jurado) H().ejecutar(() => Jurado.iniciar(5)); }; c.appendChild(b);
    tarjeta("Diapositivas de sustentación", c);
    H().ui.hablar(`Preparé ${ds.length} diapositivas y el guion para tu sustentación.`);
    return d;
  }

  function comando(n, original) {
    const tarea = (fn) => async () => { H().ui.ocupar(true, "Escritura…"); try { await fn(); } catch (e) { H().ui.mostrarError(e); } finally { H().ui.ocupar(false); } };
    if (/(discusion|triangula)/.test(n) && /(ayudame|haz|hazme|revisa|triangula|construye|arma|redacta|matriz)/.test(n)) return tarea(discusion);
    if (/conclusiones/.test(n) && /objetivos/.test(n)) return tarea(conclusiones);
    if (/(haz|hazme|redacta|escribe|crea|genera)( me)?( el| un)? (resumen y abstract|abstract|resumen del trabajo|resumen de la tesis)/.test(n) || /^(resumen y abstract|abstract)$/.test(n)) return tarea(resumen);
    if (/(convierte|pasa|transforma|haz|hazme)( mi| la)? (tesis|trabajo) (en|a)( un)? articulo|^articulo (cientifico )?(de|desde) (mi |la )?tesis$/.test(n)) return tarea(articulo);
    const m = original.match(/d[oó]nde\s+(?:puedo\s+)?publico(?:\s+sobre)?\s*(.*)$|revistas\s+(?:para|sobre|de)\s+(.+)$/i);
    if (m && /(publico|revistas)/.test(n)) return tarea(() => revistas((m[1] || m[2] || "").replace(/[?.!]+$/, "")));
    if (/(diapositivas|presentacion|powerpoint)/.test(n) && /(sustentacion|haz|hazme|crea|genera|prepara)/.test(n)) return tarea(() => window.Presentacion ? Presentacion.crear() : diapositivas());
    return null;
  }

  return { discusion, conclusiones, resumen, articulo, revistas, diapositivas, comando };
})();
