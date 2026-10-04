/* Romus · Formato APA 7 en un clic (sin IA: reglas fijas sobre el documento de Word).
   Aplica: fuente y tamaño, interlineado doble, sangría de primera línea, alineación,
   los 5 niveles de título de APA 7, referencias con sangría francesa, rótulos de tablas y figuras,
   notas de tabla, portada de estudiante, número de página y tabla de contenido.
   Al final informa lo que hizo y lo que el estudiante debe revisar a mano. */
window.Formato = (function () {
  const H = () => Inv._h;
  const FUENTES = { tnr: ["Times New Roman", 12], calibri: ["Calibri", 11], arial: ["Arial", 11], georgia: ["Georgia", 11] };
  const RE_REF = /^\s*(referencias|referencias bibliogr[aá]ficas|bibliograf[ií]a|lista de referencias)\s*$/i;
  const RE_ANEXO = /^\s*(anexos?|ap[eé]ndices?)\b/i;
  const RE_ROTULO = /^\s*(Tabla|Figura)\s+(\d+)\s*[.:]?\s*(.*)$/;
  const nivelDe = (estilo) => { const m = String(estilo || "").match(/(heading|t[ií]tulo|titre|überschrift)\s*([1-9])/i); return m ? +m[2] : 0; };
  const esTituloDoc = (estilo) => /^(title|t[ií]tulo|titre)$/i.test(String(estilo || "").trim());
  const soporta = (v) => !!(window.Doc && Doc.soporta ? Doc.soporta(v) : (() => { try { return Office.context.requirements.isSetSupported("WordApi", v); } catch (e) { return false; } })());
  const palabras = (t) => (String(t).match(/\S+/g) || []).length;

  /* ---------- 1. Estilos de Word con las reglas de APA 7 ----------
     Se modifican los estilos del documento (Normal, Título 1 a 5, Título del documento) y se crean
     «Referencia APA», «Cita en bloque APA», «Tabla número APA» y «Tabla título APA». Así lo que el
     estudiante escriba después ya sale en APA, y los títulos alimentan el panel de navegación y el índice. */
  async function estilosWord(fuente, tam, alin) {
    if (!soporta("1.5")) return { ok: false };
    try {
      return await Word.run(async (ctx) => {
        const sts = ctx.document.getStyles(); sts.load("items/nameLocal,items/builtIn,items/type"); await ctx.sync();
        const doble = tam * 2, cambiados = [];
        const fijar = (st, f, pf) => {
          Object.assign(st.font, Object.assign({ name: fuente, size: tam, color: "#000000", bold: false, italic: false }, f || {}));
          Object.assign(st.paragraphFormat, Object.assign({ lineSpacing: doble, spaceBefore: 0, spaceAfter: 0, leftIndent: 0, rightIndent: 0, firstLineIndent: 0, alignment: "Left", widowControl: true }, pf || {}));
        };
        sts.items.forEach((st) => {
          const n = String(st.nameLocal || "");
          if (/^(normal)$/i.test(n)) { fijar(st, {}, { firstLineIndent: 0.5 * 72, alignment: alin }); cambiados.push("Normal"); return; }
          const nv = nivelDe(n);
          if (nv >= 1 && nv <= 5) {
            fijar(st, { bold: true, italic: nv === 3 || nv === 5 }, { alignment: nv === 1 ? "Centered" : "Left", firstLineIndent: nv >= 4 ? 0.5 * 72 : 0, keepWithNext: true });
            cambiados.push(n); return;
          }
          if (esTituloDoc(n)) { fijar(st, { bold: true }, { alignment: "Centered", keepWithNext: true }); cambiados.push(n); }
          if (/^(caption|descripci[oó]n|leyenda)$/i.test(n)) { fijar(st, { bold: true }, {}); cambiados.push(n); }
        });
        await ctx.sync();
        // Estilos propios de Romus
        const propios = [
          ["Referencia APA", {}, { leftIndent: 0.5 * 72, firstLineIndent: -0.5 * 72 }],
          ["Cita en bloque APA", {}, { leftIndent: 0.5 * 72, firstLineIndent: 0 }],
          ["Tabla número APA", { bold: true }, { keepWithNext: true }],
          ["Tabla título APA", { italic: true }, { keepWithNext: true }],
          ["Nota de tabla APA", {}, {}]
        ];
        for (const [nombre, f, pf] of propios) {
          let st = sts.items.find((x) => x.nameLocal === nombre);
          if (!st) { try { st = ctx.document.addStyle(nombre, "Paragraph"); } catch (e) { st = null; } }
          if (st) fijar(st, f, pf);
        }
        await ctx.sync();
        return { ok: true, cambiados };
      });
    } catch (e) { console.warn("Romus: estilos APA", e); return { ok: false }; }
  }

  /* ---------- 2. Tablas en formato APA: sin líneas verticales, bordes arriba, abajo y bajo el encabezado ---------- */
  async function tablasAPA(fuente, tam) {
    if (!soporta("1.3")) return 0;
    try {
      return await Word.run(async (ctx) => {
        const ts = ctx.document.body.tables; ts.load("items/rowCount"); await ctx.sync();
        for (const t of ts.items) {
          ["All"].forEach((loc) => { try { const b = t.getBorder(loc); b.type = "None"; } catch (e) { /* sin bordes */ } });
          ["Top", "Bottom"].forEach((loc) => { try { const b = t.getBorder(loc); b.type = "Single"; b.width = 1; b.color = "#000000"; } catch (e) { /* opcional */ } });
          try { t.headerRowCount = 1; } catch (e) { /* opcional */ }
          t.font.name = fuente; t.font.size = tam; t.font.color = "#000000"; t.font.italic = false;
          try { t.shadingColor = "#FFFFFF"; } catch (e) { /* opcional */ }
          const enc = t.rows.getFirst();
          enc.font.bold = true; enc.font.color = "#000000";
          try { enc.shadingColor = "#FFFFFF"; } catch (e) { /* opcional */ }
          try { const b = enc.getBorder("Bottom"); b.type = "Single"; b.width = 1; b.color = "#000000"; } catch (e) { /* opcional */ }
          const ps = t.getRange("Whole").paragraphs; ps.load("items"); await ctx.sync();
          ps.items.forEach((p) => { p.firstLineIndent = 0; p.leftIndent = 0; p.lineSpacing = tam * 1.15; p.spaceAfter = 0; p.spaceBefore = 0; });
        }
        await ctx.sync();
        return ts.items.length;
      });
    } catch (e) { console.warn("Romus: tablas APA", e); return 0; }
  }

  /* ---------- 3. Márgenes de 2,54 cm (si tu Word lo permite desde complementos) ---------- */
  async function margenes() {
    try {
      return await Word.run(async (ctx) => {
        const secs = ctx.document.sections; secs.load("items"); await ctx.sync();
        let ok = false;
        secs.items.forEach((sec) => { const ps = sec.pageSetup; if (ps) { ps.topMargin = 72; ps.bottomMargin = 72; ps.leftMargin = 72; ps.rightMargin = 72; ok = true; } });
        if (!ok) return false;
        await ctx.sync();
        return true;
      });
    } catch (e) { return false; }
  }

  /* ---------- 4. DOI y URL de las referencias como hipervínculos ---------- */
  async function enlacesReferencias(refs) {
    const urls = [...new Set(refs.flatMap((r) => (r.match(/https?:\/\/[^\s<>"»]+[^\s<>"».,;)]/g) || [])))].slice(0, 120);
    if (!urls.length) return 0;
    try {
      return await Word.run(async (ctx) => {
        const rs = urls.map((u) => { const r = ctx.document.body.search(u.slice(0, 250), { matchCase: true }); r.load("items"); return [u, r]; });
        await ctx.sync();
        let n = 0;
        rs.forEach(([u, r]) => r.items.forEach((x) => { try { x.hyperlink = u; x.font.color = "#000000"; x.font.underline = "None"; n++; } catch (e) { /* sin hipervínculo */ } }));
        await ctx.sync();
        return n;
      });
    } catch (e) { return 0; }
  }

  function tarjetaOpciones() {
    const { el, tarjeta } = H();
    const cfg = Config.get().formatoAPA || {};
    const c = el("div", "inv-cuerpo formato");
    c.appendChild(el("p", "guia-resumen", "Dejo tu documento con el formato de APA 7 (estudiantes) usando las herramientas de Word: estilos (Normal, Título 1 a 5 y estilos APA propios), márgenes, interlineado doble, sangrías, referencias con sangría francesa, tablas sin líneas verticales, citas en bloque, saltos de página, número de página, portada y tabla de contenido automática. No cambio tu texto."));
    const fila = (txt, ctrl) => { const l = el("label", "campo-pro"); l.appendChild(el("span", "", txt)); l.appendChild(ctrl); c.appendChild(l); return ctrl; };
    const sel = (ops, v) => { const s = el("select", "ajuste"); ops.forEach(([k, t]) => { const o = el("option", "", t); o.value = k; s.appendChild(o); }); s.value = v; return s; };
    const sF = fila("Fuente", sel([["tnr", "Times New Roman 12"], ["calibri", "Calibri 11"], ["arial", "Arial 11"], ["georgia", "Georgia 11"]], cfg.fuente || "tnr"));
    const sA = fila("Alineación del texto", sel([["izquierda", "A la izquierda (lo que pide APA 7)"], ["justificado", "Justificado (si tu universidad lo exige)"]], cfg.alineacion || "izquierda"));
    const chk = (txt, v) => { const l = el("label", "interruptor pequeno"); const i = el("input"); i.type = "checkbox"; i.checked = v; l.append(i, el("span", "riel"), el("span", "", txt)); c.appendChild(l); return i; };
    const cP = chk("Agregar portada de estudiante", cfg.portada !== false);
    const cN = chk("Número de página arriba a la derecha", cfg.numero !== false);
    const cT = chk("Tabla de contenido", cfg.indice !== false);
    const cS = chk("Referencias y anexos en página nueva", cfg.saltos !== false);
    const cE = chk("Ajustar los estilos de Word (Normal, Título 1 a 5) para que todo lo nuevo salga en APA", cfg.estilos !== false);
    c.appendChild(el("p", "inv-nota", "Consejo: guarda una copia antes. Si algo no te gusta, Ctrl+Z deshace los cambios."));
    const b = el("button", "boton primario", "Aplicar formato APA 7");
    b.onclick = () => {
      const o = { fuente: sF.value, alineacion: sA.value, portada: cP.checked, numero: cN.checked, indice: cT.checked, saltos: cS.checked, estilos: cE.checked };
      Config.set({ formatoAPA: o });
      if (o.portada && Docx.faltan(["titulo", "estudiante", "institucion", "programa"]).length) {
        const f = Docx.formulario(["titulo", "estudiante", "institucion", "facultad", "programa", "curso", "asesor"], () => H().ejecutar(() => aplicar(o)), "Para la portada necesito estos datos. Los guardo para la próxima vez.");
        H().tarjeta("Datos para la portada", f);
        return;
      }
      H().ejecutar(() => aplicar(o));
    };
    c.appendChild(b);
    tarjeta("Formato APA 7", c);
    H().ui.hablar("Elige la fuente y pulsa aplicar. Dejo tu documento en formato APA siete.");
  }

  async function aplicar(o) {
    o = Object.assign({ fuente: "tnr", alineacion: "izquierda", portada: true, numero: true, indice: true, saltos: true, estilos: true }, o || {});
    const [fuente, tam] = FUENTES[o.fuente] || FUENTES.tnr;
    const alin = o.alineacion === "justificado" ? "Justified" : "Left";
    const hecho = [], revisar = [];
    const cuenta = { cuerpo: 0, titulos: [0, 0, 0, 0, 0, 0], refs: 0, tablas: 0, figuras: 0, notas: 0, separados: 0, bloques: 0, saltos: 0 };
    // Primero los estilos de Word: así el formato queda en el documento y no solo «pintado» encima.
    const est = o.estilos ? await estilosWord(fuente, tam, alin) : { ok: false };
    const conEstilos = est.ok;
    const numeros = { Tabla: [], Figura: [] };
    let refsTexto = [];

    await Word.run(async (ctx) => {
      const ps = ctx.document.body.paragraphs;
      ps.load("items/text,items/style,items/tableNestingLevel");
      await ctx.sync();
      const items = ps.items;
      let enRefs = false, siguienteTituloRotulo = false;
      const nuevos = [];
      items.forEach((p, i) => {
        const t = (p.text || "").replace(/\r/g, "").trim();
        const nivel = nivelDe(p.style);
        const enTabla = (p.tableNestingLevel || 0) > 0;
        p.font.name = fuente; p.font.size = tam;
        if (enTabla) return;
        if (nivel || RE_REF.test(t) || RE_ANEXO.test(t) && t.length < 40) {
          enRefs = RE_REF.test(t);
          const n = nivel || 1;
          // Referencias y anexos empiezan en página nueva (APA 7); si el párrafo anterior está vacío, ya hay un salto.
          if (o.saltos && n === 1 && (RE_REF.test(t) || RE_ANEXO.test(t)) && i > 0 && (items[i - 1].text || "").trim()) {
            try { p.insertBreak("Page", "Before"); cuenta.saltos++; } catch (e) { /* sin salto */ }
          }
          if (!nivel) p.styleBuiltIn = "Heading1";
          cuenta.titulos[n]++;
          p.font.name = fuente; p.font.size = tam; p.font.color = "#000000";
          p.font.bold = true; p.font.italic = n === 3 || n === 5;
          p.alignment = n === 1 ? "Centered" : "Left";
          p.firstLineIndent = n >= 4 ? 36 : 0; p.leftIndent = 0;
          p.lineSpacing = tam * 2; p.spaceBefore = 0; p.spaceAfter = 0;
          return;
        }
        if (esTituloDoc(p.style)) { p.font.bold = true; p.font.color = "#000000"; p.alignment = "Centered"; p.firstLineIndent = 0; return; }
        if (!t) { siguienteTituloRotulo = false; return; }
        const rot = t.match(RE_ROTULO);
        if (rot && t.length < 160) {
          const tipo = rot[1]; numeros[tipo].push(+rot[2]);
          cuenta[tipo === "Tabla" ? "tablas" : "figuras"]++;
          p.firstLineIndent = 0; p.leftIndent = 0; p.alignment = "Left"; p.lineSpacing = tam * 2; p.spaceAfter = 0; p.spaceBefore = 0;
          if (conEstilos) p.style = "Tabla número APA";
          if (rot[3]) { // «Tabla 1. Título» → número en negrita y título en cursiva en la línea siguiente
            p.insertText(`${tipo} ${rot[2]}`, "Replace");
            const q = p.insertParagraph(rot[3].replace(/^[.:\s]+/, ""), "After");
            if (conEstilos) q.style = "Tabla título APA";
            q.font.name = fuente; q.font.size = tam; q.font.bold = false; q.font.italic = true; q.firstLineIndent = 0; q.leftIndent = 0; q.alignment = "Left"; q.lineSpacing = tam * 2; q.spaceAfter = 0;
            cuenta.separados++;
          }
          p.font.bold = true; p.font.italic = false;
          siguienteTituloRotulo = !rot[3];
          return;
        }
        if (siguienteTituloRotulo) { // título de la tabla o figura
          if (conEstilos) p.style = "Tabla título APA";
          p.font.italic = true; p.font.bold = false; p.firstLineIndent = 0; p.leftIndent = 0; p.alignment = "Left"; p.lineSpacing = tam * 2; p.spaceAfter = 0;
          siguienteTituloRotulo = false; return;
        }
        if (/^Nota\.\s/.test(t)) {
          if (conEstilos) p.style = "Nota de tabla APA";
          p.firstLineIndent = 0; p.leftIndent = 0; p.alignment = "Left"; p.lineSpacing = tam * 2; p.spaceAfter = 0;
          const r = p.search("Nota.", { matchCase: true }); r.load("items"); nuevos.push(r); cuenta.notas++;
          return;
        }
        p.lineSpacing = tam * 2; p.spaceBefore = 0; p.spaceAfter = 0; p.font.color = "#000000";
        if (enRefs) {
          if (conEstilos) p.style = "Referencia APA";
          p.leftIndent = 36; p.firstLineIndent = -36; p.alignment = "Left";
          cuenta.refs++; refsTexto.push(t);
        } else if (/^[«"“]/.test(t) && palabras(t) >= 40 && /[»"”]\s*\(?[^()]*\d{4}[^()]*\)?\.?$|\(\s*[^()]*\d{4}[^()]*\)\.?$/.test(t)) {
          // Cita textual de 40 palabras o más: bloque con sangría, sin comillas (las comillas las quita el revisor APA)
          if (conEstilos) p.style = "Cita en bloque APA";
          p.leftIndent = 36; p.firstLineIndent = 0; p.alignment = "Left";
          cuenta.bloques++;
        } else {
          p.leftIndent = 0; p.firstLineIndent = 36; p.alignment = alin;
          cuenta.cuerpo++;
        }
      });
      await ctx.sync();
      nuevos.forEach(r => { if (r.items && r.items[0]) r.items[0].font.italic = true; });
      await ctx.sync();
    });
    const nTablas = await tablasAPA(fuente, tam);
    const conMargenes = await margenes();
    const nEnlaces = await enlacesReferencias(refsTexto);
    if (conEstilos) hecho.push(`Estilos de Word ajustados a APA 7 (${est.cambiados.slice(0, 7).join(", ")}${est.cambiados.length > 7 ? "…" : ""}) y estilos nuevos «Referencia APA», «Cita en bloque APA», «Tabla número APA», «Tabla título APA» y «Nota de tabla APA»: lo que escribas después ya sale en APA, y los títulos aparecen en el panel de navegación (Vista → Panel de navegación).`);
    else if (o.estilos) revisar.push("Tu versión de Word no deja que los complementos cambien los estilos: apliqué el formato párrafo por párrafo. Si escribes texto nuevo, vuelve a aplicar el formato al final.");
    hecho.push(`Fuente ${fuente} ${tam} e interlineado doble en todo el texto.`);
    if (cuenta.cuerpo) hecho.push(`${cuenta.cuerpo} párrafos con sangría de primera línea de 1,27 cm, ${o.alineacion === "justificado" ? "justificados" : "alineados a la izquierda"} y sin espacio extra entre párrafos.`);
    const niv = cuenta.titulos.map((n, k) => n && k ? `nivel ${k}: ${n}` : "").filter(Boolean);
    if (niv.length) hecho.push(`Títulos con los niveles de APA 7 (${niv.join(", ")}): nivel 1 centrado en negrita, nivel 2 a la izquierda en negrita, nivel 3 en negrita y cursiva.`);
    else revisar.push("No encontré títulos con estilo. Aplica los estilos «Título 1», «Título 2»… a tus títulos (pestaña Inicio de Word) y vuelve a aplicar el formato.");
    if (cuenta.refs) hecho.push(`${cuenta.refs} referencia${cuenta.refs === 1 ? "" : "s"} con sangría francesa${cuenta.refs > 1 ? " (estilo «Referencia APA»)" : ""}.`);
    if (cuenta.tablas || cuenta.figuras) hecho.push(`${cuenta.tablas} tablas y ${cuenta.figuras} figuras: número en negrita y título en cursiva${cuenta.separados ? ` (separé ${cuenta.separados} rótulos que tenían el título en la misma línea)` : ""}.`);
    if (cuenta.notas) hecho.push(`${cuenta.notas} notas de tabla con «Nota.» en cursiva.`);
    if (nTablas) hecho.push(`${nTablas} tabla${nTablas === 1 ? "" : "s"} con formato APA: sin líneas verticales, bordes solo arriba, abajo y bajo el encabezado, encabezado en negrita sobre fondo blanco y repetido si la tabla cambia de página.`);
    if (cuenta.bloques) hecho.push(`${cuenta.bloques} cita${cuenta.bloques === 1 ? "" : "s"} de 40 palabras o más en bloque con sangría de 1,27 cm (quítales las comillas o usa «Corregir lo seguro» del revisor APA).`);
    if (cuenta.saltos) hecho.push(`${cuenta.saltos} salto${cuenta.saltos === 1 ? "" : "s"} de página antes de Referencias o Anexos.`);
    if (nEnlaces) hecho.push(`${nEnlaces} DOI o URL de las referencias convertidos en hipervínculos.`);
    // Revisión de numeración de tablas y figuras
    ["Tabla", "Figura"].forEach(tipo => {
      const ns = numeros[tipo]; const malos = ns.filter((n, k) => n !== k + 1);
      if (malos.length) revisar.push(`La numeración de ${tipo === "Tabla" ? "las tablas" : "las figuras"} no es consecutiva (${ns.join(", ")}). Debe ir 1, 2, 3… en el orden en que aparecen.`);
    });
    // Orden alfabético de referencias
    const orden = refsTexto.slice().sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    const fuera = refsTexto.findIndex((r, k) => r !== orden[k]);
    if (fuera >= 0) revisar.push(`Las referencias no están en orden alfabético (revisa desde «${refsTexto[fuera].slice(0, 40)}…»).`);
    if (!cuenta.refs) revisar.push("No encontré la sección «Referencias». Agrégala al final con un título.");

    // Portada, número de página y tabla de contenido
    if (o.portada) { const r = await portada(fuente, tam); if (r === "hecha") hecho.push("Portada de estudiante con título, autor, institución, programa, curso, docente y fecha."); else if (r === "existe") hecho.push("Ya tenías portada: la dejé como estaba."); }
    if (o.numero) { if (await numeroPagina()) hecho.push("Número de página arriba a la derecha."); else revisar.push("Agrega el número de página: Insertar → Número de página → Principio de página → Número sin formato 3."); }
    if (o.indice) { const r = await indice(); if (r === "hecha") hecho.push("Tabla de contenido después de la portada (clic derecho → Actualizar campos cuando termines)."); else if (r !== "existe") revisar.push("Agrega la tabla de contenido: Referencias → Tabla de contenido → Tabla automática 1."); }
    if (conMargenes) hecho.push("Márgenes de 2,54 cm en los cuatro lados.");
    else revisar.push("Márgenes de 2,54 cm en los cuatro lados: Disposición → Márgenes → Normal (tu versión de Word no deja cambiarlos desde complementos).");
    if (!cuenta.bloques) revisar.push("Las citas de 40 palabras o más van en bloque aparte, con sangría de 1,27 cm y sin comillas.");

    H().registrar("Formato APA 7", `${cuenta.cuerpo} párrafos, ${cuenta.refs} referencias`, "rubrica");
    const { el, tarjeta, etiqueta } = H();
    const c = el("div", "inv-cuerpo formato");
    c.appendChild(etiqueta("reglas", "APA 7"));
    c.appendChild(el("div", "inv-sub", "Lo que hice"));
    const ul = el("ul", "guia-puntos lista-ok"); hecho.forEach(x => ul.appendChild(el("li", "", x))); c.appendChild(ul);
    c.appendChild(el("div", "inv-sub", "Revisa tú"));
    const ul2 = el("ul", "guia-puntos lista-revisar"); revisar.forEach(x => ul2.appendChild(el("li", "", x))); c.appendChild(ul2);
    const acc = el("div", "inv-acciones");
    const bV = el("button", "boton secundario", "Verificar referencias"); bV.onclick = () => { if (window.Jurado) H().ejecutar(Jurado.verificar); };
    const bS = el("button", "boton secundario", "Frases sin cita"); bS.onclick = () => { if (window.Biblio) H().ejecutar(() => Biblio.sinRespaldo()); };
    acc.append(bV, bS); c.appendChild(acc);
    tarjeta("Formato APA 7 aplicado", c);
    H().ui.hablar(`Listo. Apliqué el formato APA siete. ${revisar.length ? "Te dejé " + revisar.length + " cosas para revisar." : ""}`);
    return { hecho, revisar, cuenta };
  }

  /** Portada de estudiante (APA 7). Devuelve "hecha", "existe" o "no". */
  async function portada(fuente, tam) {
    const d = Docx.datos();
    if (!d.titulo) return "no";
    return Word.run(async (ctx) => {
      const ps = ctx.document.body.paragraphs; ps.load("items/text"); await ctx.sync();
      const primeros = ps.items.slice(0, 12).map(p => H().norm(p.text));
      if (primeros.some(t => t && t === H().norm(d.titulo))) return "existe";
      const body = ctx.document.body;
      const lineas = [
        ["", false], ["", false], ["", false],
        [d.titulo, true], ["", false],
        [d.estudiante, false],
        [[d.facultad, d.institucion].filter(Boolean).join(", ") || d.institucion, false],
        [d.programa, false],
        [d.curso, false],
        [d.asesor ? (d.asesor.match(/^(dr|dra|mg|lic|esp|prof)\b/i) ? d.asesor : d.asesor) : "", false],
        [Docx.fechaLarga(), false]
      ].filter(([t], k) => k < 5 || t);
      // Insertar al inicio en orden inverso
      let primero = null;
      for (let k = lineas.length - 1; k >= 0; k--) {
        const [t, negrita] = lineas[k];
        const p = body.insertParagraph(t, "Start");
        p.styleBuiltIn = "Normal";
        p.alignment = "Centered"; p.firstLineIndent = 0; p.leftIndent = 0; p.lineSpacing = tam * 2; p.spaceAfter = 0;
        p.font.name = fuente; p.font.size = tam; p.font.bold = negrita; p.font.italic = false;
        if (k === lineas.length - 1) primero = p;
      }
      try { primero.insertBreak("Page", "After"); } catch (e) { /* sin salto: el estudiante lo agrega */ }
      await ctx.sync();
      return "hecha";
    });
  }

  async function numeroPagina() {
    try {
      return await Word.run(async (ctx) => {
        const sec = ctx.document.sections.getFirst();
        const enc = sec.getHeader("Primary");
        enc.load("text"); await ctx.sync();
        if (/\d/.test(enc.text || "")) return true;
        const p = enc.insertParagraph("", "Start");
        p.alignment = "Right"; p.firstLineIndent = 0; p.leftIndent = 0; p.lineSpacing = 12;
        p.getRange("Start").insertField("Start", "Page");
        await ctx.sync();
        return true;
      });
    } catch (e) { return false; }
  }

  async function indice() {
    try {
      return await Word.run(async (ctx) => {
        const ps = ctx.document.body.paragraphs; ps.load("items/text,items/style"); await ctx.sync();
        if (ps.items.some(p => /^(tabla de contenido|contenido|[ií]ndice)$/i.test(p.text.trim()))) return "existe";
        const primerTitulo = ps.items.find(p => nivelDe(p.style) === 1);
        if (!primerTitulo) return "no";
        const h = primerTitulo.insertParagraph("Tabla de contenido", "Before");
        h.alignment = "Centered"; h.font.bold = true; h.firstLineIndent = 0;
        const q = primerTitulo.insertParagraph("", "Before");
        q.getRange("Start").insertField("Start", "TOC", '\\o "1-3" \\h \\z \\u', true);
        try { q.insertBreak("Page", "After"); } catch (e) { /* opcional */ }
        await ctx.sync();
        return "hecha";
      });
    } catch (e) { return "no"; }
  }

  function comando(n) {
    if (/(formato|normas?) apa|^(aplica|pon|dale|ponle|dame)( el)? formato( apa)?( 7| siete)?( al documento| a mi (tesis|documento|trabajo))?$|^formatea( el| mi)? (documento|trabajo|tesis)( en apa)?$/.test(n) && !/(referencia|cita)/.test(n)) return () => tarjetaOpciones();
    if (/^(pon|agrega|inserta|crea|haz)( me)?( la| una)? portada( apa)?$/.test(n)) return () => tarjetaOpciones();
    if (/^(datos del proyecto|mis datos|cambia mis datos)$/.test(n)) return () => H().tarjeta("Datos del proyecto", Docx.formulario(null, () => H().ui.confirmar("Guardé los datos del proyecto.")));
    return null;
  }

  return { tarjetaOpciones, aplicar, portada, comando, estilosWord, tablasAPA, margenes, _nivelDe: nivelDe };
})();
