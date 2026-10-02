/* Romus · Presentación de sustentación en PowerPoint (.pptx real) generada desde Word.
   - Diseño propio: portada y cierre oscuros con la esfera de puntos, diapositivas de contenido claras.
   - Notas del orador en cada diapositiva, con el tiempo sugerido (Romus para PowerPoint lo usa en el ensayo).
   - Gráficos nativos de PowerPoint solo cuando sus datos aparecen literalmente en el documento;
     si no, deja un recuadro con la sugerencia de gráfico.
   Usa PptxGenJS (vendor/pptxgen.bundle.js), que se carga solo cuando se necesita. */
window.Presentacion = (function () {
  const H = () => Inv._h;
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const C = { noche: "0E1B2E", noche2: "16294A", azul: "185ABD", azulClaro: "4F9BFF", magenta: "C239B3", oro: "E0B04A", texto: "1F2937", gris: "6B7280", linea: "E5E7EB", fondo: "FFFFFF", suave: "F3F6FB" };
  const FUENTE = "Segoe UI";

  function cargar() {
    if (window.PptxGenJS) return Promise.resolve();
    return new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = "vendor/pptxgen.bundle.js?v=3.3";
      s.onload = () => window.PptxGenJS ? ok() : mal(new Error("No pude cargar el generador de PowerPoint."));
      s.onerror = () => mal(new Error("No pude cargar el generador de PowerPoint. Revisa tu conexión."));
      document.head.appendChild(s);
    });
  }

  /* ---------- Números: ¿el dato está en el documento? ---------- */
  function numerosDoc(texto) {
    const set = new Set();
    (String(texto).match(/\d+(?:[.,]\d+)?/g) || []).forEach(s => { set.add(s); set.add(s.replace(",", ".")); set.add(s.replace(".", ",")); const n = Number(s.replace(",", ".")); if (isFinite(n)) set.add(String(n)); });
    return set;
  }
  function graficoVerificado(g, set) {
    if (!g || !Array.isArray(g.valores) || g.valores.length < 2 || !Array.isArray(g.etiquetas) || g.etiquetas.length !== g.valores.length) return null;
    const vals = g.valores.map(v => Number(String(v).replace(",", ".")));
    if (vals.some(v => !isFinite(v))) return null;
    const todos = vals.every(v => set.has(String(v)) || set.has(String(v).replace(".", ",")));
    return todos ? Object.assign({}, g, { valores: vals }) : null;
  }

  /* ---------- Esfera decorativa (puntos en espiral de Fibonacci, proyectados en 2D) ---------- */
  function esfera(s, cx, cy, r, n) {
    const oro = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * oro;
      const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
      if (z < -0.15) continue; // solo la cara visible
      const prof = (z + 1) / 2, d = 0.035 + prof * 0.05;
      const color = i % 5 === 0 ? C.magenta : i % 7 === 0 ? C.oro : (prof > 0.6 ? C.azulClaro : C.azul);
      s.addShape("ellipse", { x: cx + x * r - d / 2, y: cy - y * r - d / 2, w: d, h: d, fill: { color, transparency: Math.round(70 - prof * 55) }, line: { type: "none" } });
    }
    s.addShape("ellipse", { x: cx - r * 1.12, y: cy - r * 1.12, w: r * 2.24, h: r * 2.24, fill: { type: "none" }, line: { color: C.azulClaro, width: 0.75, transparency: 55 } });
    s.addShape("ellipse", { x: cx - 0.09, y: cy - 0.09, w: 0.18, h: 0.18, fill: { color: C.oro }, line: { type: "none" } });
  }

  const tiempo = (seg) => { seg = Math.max(15, Math.round(seg / 15) * 15); const m = Math.floor(seg / 60), s = seg % 60; return `${m ? m + " min" : ""}${m && s ? " " : ""}${s ? s + " s" : ""}`; };

  /** Construye el .pptx. d = {diapositivas:[...]}, datos = datos del proyecto, opciones = {minutos} */
  async function construir(d, datos, opciones) {
    await cargar();
    const pres = new PptxGenJS();
    pres.layout = "LAYOUT_WIDE"; // 13,33 × 7,5 in
    pres.title = datos.titulo || "Sustentación";
    pres.author = datos.estudiante || "";
    pres.company = datos.institucion || "";
    const W = 13.333, Hh = 7.5;
    const ds = d.diapositivas || [];
    const total = (opciones && opciones.minutos || 20) * 60;
    const pesos = ds.map(x => Math.max(1, String(x.notas || "").split(/\s+/).length));
    const suma = pesos.reduce((a, b) => a + b, 0);
    const pie = (s, k) => {
      s.addShape("line", { x: 0.6, y: Hh - 0.55, w: W - 1.2, h: 0, line: { color: C.linea, width: 0.75 } });
      s.addText(String(datos.titulo || "").slice(0, 90), { x: 0.6, y: Hh - 0.5, w: W - 2.4, h: 0.35, fontFace: FUENTE, fontSize: 10, color: C.gris });
      s.addText(String(k + 1), { x: W - 1.6, y: Hh - 0.5, w: 1, h: 0.35, fontFace: FUENTE, fontSize: 10, color: C.gris, align: "right" });
    };
    const notas = (x, k) => `Tiempo sugerido: ${tiempo(total * pesos[k] / suma)}\n\n${x.notas || ""}${x.visual ? "\n\nVisual sugerido: " + x.visual : ""}`;
    ds.forEach((x, k) => {
      const s = pres.addSlide();
      const tipo = x.tipo || (k === 0 ? "portada" : k === ds.length - 1 ? "cierre" : "contenido");
      if (tipo === "portada" || tipo === "cierre" || tipo === "seccion") {
        s.background = { color: C.noche };
        s.addShape("rect", { x: 0, y: 0, w: W, h: Hh, fill: { type: "solid", color: C.noche2, transparency: 40 }, line: { type: "none" } });
        esfera(s, W - 3.2, Hh / 2, tipo === "seccion" ? 1.7 : 2.2, tipo === "seccion" ? 160 : 260);
        if (tipo === "portada") {
          s.addShape("rect", { x: 0.75, y: 1.55, w: 0.12, h: 2.1, fill: { color: C.azulClaro }, line: { type: "none" } });
          const tit = x.titulo || datos.titulo || "";
          // Si la IA acortó el título («Conocer sin creer»), el subtítulo conserva el resto del título real.
          let subt = (x.puntos || [])[0] || "";
          if (!subt && datos.titulo && datos.titulo !== tit) subt = datos.titulo.startsWith(tit) ? datos.titulo.slice(tit.length).replace(/^[\s:·.,-]+/, "") : datos.titulo;
          s.addText(tit, { x: 1.05, y: 1.25, w: 7.4, h: subt ? 1.8 : 2.5, fontFace: FUENTE, fontSize: 34, bold: true, color: "FFFFFF", valign: subt ? "bottom" : "middle", fit: "shrink" });
          if (subt) s.addText(subt.charAt(0).toUpperCase() + subt.slice(1), { x: 1.05, y: 3.1, w: 7.4, h: 0.85, fontFace: FUENTE, fontSize: 18, color: "FFFFFF", valign: "top", fit: "shrink" });
          const sub = [datos.estudiante, datos.programa, datos.institucion].filter(Boolean).join("\n");
          s.addText(sub || (x.puntos || []).slice(1).join("\n"), { x: 1.05, y: 4.1, w: 7.4, h: 1.5, fontFace: FUENTE, fontSize: 16, color: "C9D6EA", valign: "top" });
          const pie2 = [datos.asesor ? "Asesor(a): " + datos.asesor : "", Docx.fechaLarga()].filter(Boolean).join("  ·  ");
          s.addText(pie2, { x: 1.05, y: 6.2, w: 8, h: 0.4, fontFace: FUENTE, fontSize: 12, color: "8FA3C2" });
        } else if (tipo === "seccion") {
          s.addText(x.titulo || "", { x: 0.9, y: 2.6, w: 7.5, h: 1.4, fontFace: FUENTE, fontSize: 40, bold: true, color: "FFFFFF" });
          if ((x.puntos || []).length) s.addText(x.puntos.join(" · "), { x: 0.9, y: 4.0, w: 7.5, h: 0.8, fontFace: FUENTE, fontSize: 18, color: "C9D6EA" });
        } else {
          s.addText(x.titulo || "Gracias", { x: 0.9, y: 2.2, w: 7.5, h: 1.4, fontFace: FUENTE, fontSize: 44, bold: true, color: "FFFFFF" });
          const t = (x.puntos || []).concat([datos.estudiante, datos.correo].filter(Boolean)).join("\n");
          s.addText(t, { x: 0.9, y: 3.7, w: 7.5, h: 1.8, fontFace: FUENTE, fontSize: 18, color: "C9D6EA", valign: "top" });
        }
      } else {
        s.background = { color: C.fondo };
        s.addShape("rect", { x: 0, y: 0, w: 0.16, h: Hh, fill: { color: C.azul }, line: { type: "none" } });
        s.addText(x.titulo || "", { x: 0.6, y: 0.35, w: W - 1.2, h: 0.95, fontFace: FUENTE, fontSize: 30, bold: true, color: C.texto, valign: "middle", fit: "shrink" });
        s.addShape("rect", { x: 0.62, y: 1.3, w: 0.9, h: 0.06, fill: { color: C.magenta }, line: { type: "none" } });
        const g = x.graficoOk;
        const anchoTexto = g || x.visual ? 6.4 : W - 1.4;
        const puntos = (x.puntos || []).slice(0, 5);
        if (puntos.length) s.addText(puntos.map(p => ({ text: p, options: { bullet: { code: "25A0" }, paraSpaceAfter: 14 } })), { x: 0.6, y: 1.65, w: anchoTexto, h: 4.9, fontFace: FUENTE, fontSize: puntos.length > 4 ? 18 : 21, color: C.texto, valign: "top", fit: "shrink" });
        if (g) {
          const tipoG = g.tipo === "torta" ? pres.ChartType.doughnut : g.tipo === "lineas" ? pres.ChartType.line : pres.ChartType.bar;
          s.addChart(tipoG, [{ name: g.titulo || "", labels: g.etiquetas.map(String), values: g.valores }], {
            x: 7.2, y: 1.6, w: 5.6, h: 4.8, chartColors: [C.azul, C.magenta, C.oro, C.azulClaro, "10B981", "8B5CF6"],
            showTitle: !!g.titulo, title: g.titulo || "", titleFontFace: FUENTE, titleFontSize: 14, titleColor: C.texto,
            showValue: true, dataLabelFormatCode: g.valores.some(v => !Number.isInteger(v)) ? "0.00" : "0", valAxisMinVal: tipoG === pres.ChartType.doughnut ? undefined : Math.min(0, ...g.valores), valAxisLabelFormatCode: g.valores.some(v => !Number.isInteger(v)) ? "0.0" : "0", dataLabelFontSize: 12, dataLabelColor: C.texto, catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, showLegend: tipoG === pres.ChartType.doughnut, legendPos: "b", barGapWidthPct: 60, holeSize: 55, valGridLine: { color: C.linea, size: 0.5 }
          });
          if (g.unidad || g.fuente) s.addText(["Nota. ", g.unidad ? `Valores en ${g.unidad}. ` : "", g.fuente ? `Fuente: ${g.fuente}.` : ""].join(""), { x: 7.2, y: 6.35, w: 5.6, h: 0.35, fontFace: FUENTE, fontSize: 10, italic: true, color: C.gris });
        } else if (x.visual) {
          s.addShape("roundRect", { x: 7.3, y: 1.7, w: 5.4, h: 4.5, rectRadius: 0.12, fill: { color: C.suave }, line: { color: "B8C7E0", width: 1, dashType: "dash" } });
          s.addText([{ text: "Visual sugerido: ", options: { bold: true, fontSize: 14, color: C.azul } }, { text: x.visual, options: { fontSize: 14, color: C.texto } }], { x: 7.6, y: 2.0, w: 4.8, h: 3.9, fontFace: FUENTE, valign: "middle", align: "center" });
        }
        pie(s, k);
      }
      s.addNotes(notas(x, k));
    });
    return pres;
  }

  /** Pide el guion a la IA, verifica gráficos y genera el .pptx. */
  async function crear(signal) {
    if (Config.faltaClave()) throw new Error("Para preparar la presentación necesito tu IA conectada (Ajustes).");
    const { documentoNumerado, pedirHerramienta, el, tarjeta, etiqueta, registrar } = H();
    const ui = H().ui;
    const doc = await documentoNumerado();
    const minutos = +(Config.get().minutosSustentacion || 20);
    const d = await pedirHerramienta("diapositivas_pptx", "Presentación de sustentación con notas del orador.",
      { type: "object", properties: { diapositivas: { type: "array", items: { type: "object", properties: {
        tipo: { type: "string", enum: ["portada", "seccion", "contenido", "cierre"] },
        titulo: { type: "string", description: "Título corto (máx. 8 palabras)" },
        puntos: { type: "array", items: { type: "string" }, description: "2 a 4 ideas de máximo 12 palabras; nunca párrafos" },
        visual: { type: "string", description: "Gráfico, tabla, esquema o imagen que apoyaría esta diapositiva" },
        grafico: { type: "object", description: "Solo si el documento trae datos numéricos para graficar", properties: {
          tipo: { type: "string", enum: ["barras", "torta", "lineas"] }, titulo: { type: "string" },
          etiquetas: { type: "array", items: { type: "string" } }, valores: { type: "array", items: { type: "number" }, description: "Copiados EXACTAMENTE del documento" },
          unidad: { type: "string" }, fuente: { type: "string" } } },
        notas: { type: "string", description: "Lo que el estudiante dice en esta diapositiva, en primera persona, 60 a 130 palabras" }
      }, required: ["titulo", "notas"] } } }, required: ["diapositivas"] },
      `Prepara la sustentación de este trabajo para unos ${minutos} minutos, en ${Math.round(minutos * 0.6)} a ${Math.round(minutos * 0.8)} diapositivas: portada, problema, pregunta y objetivos, referentes clave, método, resultados (con gráficos si el documento trae datos), discusión, conclusiones, aportes y limitaciones, y cierre.
Reglas: poco texto por diapositiva (ideas, no párrafos); los números de los gráficos deben copiarse EXACTAMENTE del documento; no inventes datos; si no hay datos, deja «grafico» vacío y usa «visual».

DOCUMENTO:
${doc.texto}`, signal);
    const set = numerosDoc(doc.texto);
    // Evita tres diapositivas seguidas solo con texto (la revisión de PowerPoint lo marcaría).
    let seguidas = 0;
    (d.diapositivas || []).forEach(x => { if ((x.tipo || "contenido") !== "contenido") { seguidas = 0; return; } if (x.visual || x.grafico) { seguidas = 0; return; } if (++seguidas >= 3) { x.visual = `Esquema que resuma «${x.titulo}»`; seguidas = 0; } });
    let conGrafico = 0, descartados = 0;
    (d.diapositivas || []).forEach(x => { if (x.grafico) { x.graficoOk = graficoVerificado(x.grafico, set); if (x.graficoOk) conGrafico++; else { descartados++; if (!x.visual) x.visual = `Gráfico: ${x.grafico.titulo || "con los datos de tus resultados"}`; } } });
    const datos = Docx.datos();
    const pres = await construir(d, datos, { minutos });
    const blob = await pres.write({ outputType: "blob" });
    ultimo = { d, blob, nombre: "sustentacion-" + norm(datos.estudiante || "romus").replace(/[^a-z0-9]+/g, "-").slice(0, 30) + ".pptx" };
    registrar("Presentación de sustentación (.pptx)", `${d.diapositivas.length} diapositivas, ${conGrafico} gráficos`, "modelo");
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("modelo", `${d.diapositivas.length} diapositivas · gráficos solo con datos de tu documento`));
    c.appendChild(el("p", "guia-resumen", `Tu presentación de unos ${minutos} minutos está lista, con notas del orador y el tiempo sugerido para cada diapositiva.${conGrafico ? ` Incluye ${conGrafico} gráfico${conGrafico > 1 ? "s" : ""} con datos verificados en tu documento.` : ""}${descartados ? ` Descarté ${descartados} gráfico${descartados > 1 ? "s" : ""} porque sus números no aparecen en tu documento.` : ""}`));
    const ol = el("ol", "guia-puntos"); d.diapositivas.forEach(x => ol.appendChild(el("li", "", x.titulo + (x.graficoOk ? " 📊" : "")))); c.appendChild(ol);
    const acc = el("div", "inv-acciones");
    const b = el("button", "boton primario", "Descargar presentación (.pptx)"); b.onclick = () => { Docx.descargar(ultimo.nombre, ultimo.blob); b.textContent = "Descargada ✓"; };
    acc.appendChild(b);
    const sel = el("select", "ajuste"); [10, 15, 20, 30, 45].forEach(m => { const o = el("option", "", m + " min"); o.value = m; sel.appendChild(o); }); sel.value = minutos; sel.title = "Duración de la sustentación";
    sel.onchange = () => { Config.set({ minutosSustentacion: +sel.value }); H().ejecutar(() => crear()); };
    acc.appendChild(sel);
    c.appendChild(acc);
    const pasos = el("ol", "guia-puntos lista-revisar");
    ["Ábrela en PowerPoint y revisa cada diapositiva: cambia lo que no te represente.", "En PowerPoint, abre la pestaña «Romus»: ensaya con cronómetro, revisa el texto de tus diapositivas y haz el simulacro de jurado.", "Reemplaza los recuadros de «Visual sugerido» por tus gráficos, tablas o fotos."].forEach(x => pasos.appendChild(el("li", "", x)));
    c.appendChild(pasos);
    c.appendChild(Docx.botones(() => [{ t: "titulo", texto: "Guion para la sustentación" }].concat(d.diapositivas.flatMap((s, k) => [{ t: "h2", texto: `${k + 1}. ${s.titulo}` }, { texto: s.notas, justificado: true }])), "guion-sustentacion.docx", { tam: 12 }, "Guion del orador en Word"));
    tarjeta("Presentación de sustentación", c);
    ui.hablar(`Listo: ${d.diapositivas.length} diapositivas con notas del orador. Descárgala y ábrela en PowerPoint para ensayar con Romus.`);
    return d;
  }
  let ultimo = null;

  return { crear, construir, _graficoVerificado: graficoVerificado, _numerosDoc: numerosDoc };
})();
