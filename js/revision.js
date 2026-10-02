/* Romus · Revisión entre asesor, jurado y estudiante.
   - Respuesta a observaciones: lee los comentarios de Word (jurado o asesor), revisa si el texto
     actual ya los atiende y arma la matriz «observación · respuesta · ubicación · estado».
   - Acta de asesoría: documento formal a partir de las sesiones de Romus.
   - Modo director: informe de revisión del trabajo de un estudiante y seguimiento de varios estudiantes. */
window.Revision = (function () {
  const H = () => Inv._h;
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const fecha = (iso) => { try { return new Date(String(iso).length <= 10 ? iso + "T12:00:00" : iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return iso; } };

  /* ---------- Leer comentarios de Word ---------- */
  async function leerComentarios() {
    const ps = await Doc.leerParrafos();
    const titulos = ps.filter(p => Doc.esTitulo(p.estilo) && p.texto.trim());
    const lista = await Word.run(async (ctx) => {
      const cs = ctx.document.body.getComments();
      cs.load("items/content,items/authorName,items/creationDate,items/resolved,items/id");
      await ctx.sync();
      const rangos = cs.items.map(c => { const r = c.getRange(); r.load("text"); const pr = r.paragraphs.getFirst(); pr.load("text"); return { r, pr }; });
      await ctx.sync();
      return cs.items.map((c, k) => ({ id: c.id, texto: c.content, autor: c.authorName || "", fecha: c.creationDate ? String(c.creationDate) : "", resuelto: !!c.resolved, ancla: rangos[k].r.text || "", parrafoTexto: rangos[k].pr.text || "" }));
    });
    return lista.filter(c => c.texto && !/^(APA 7 ·|¿Según quién\?)/.test(c.texto)).map((c, k) => {
      const p = ps.find(x => norm(x.texto) === norm(c.parrafoTexto)) || ps.find(x => c.ancla && norm(x.texto).includes(norm(c.ancla).slice(0, 60)));
      const i = p ? p.i : -1;
      const sec = i >= 0 ? (titulos.filter(t => t.i <= i).pop() || {}).texto || "Inicio del documento" : "—";
      return Object.assign(c, { n: k + 1, i, seccion: sec, actual: p ? p.texto : c.parrafoTexto });
    });
  }

  async function observaciones(signal) {
    const { el, tarjeta, etiqueta, pedirHerramienta, irA, registrar } = H();
    const ui = H().ui;
    let obs;
    try { obs = await leerComentarios(); } catch (e) { throw new Error("Tu versión de Word no permite leer los comentarios desde complementos (se necesita Word 2021, Microsoft 365 o Word para la web)."); }
    if (!obs.length) throw new Error("No encontré comentarios en el documento. Abre el archivo con las observaciones de tu jurado o asesor (con sus comentarios) y vuelve a intentarlo.");
    const tutor = (Config.get().modoAyuda || "tutor") === "tutor";
    if (!Config.faltaClave()) {
      const d = await pedirHerramienta("respuesta_observaciones", "Estado de cada observación y respuesta para la matriz.",
        { type: "object", properties: { respuestas: { type: "array", items: { type: "object", properties: {
          n: { type: "integer" },
          estado: { type: "string", enum: ["atendida", "parcial", "pendiente", "aclaracion"], description: "atendida: el texto actual ya la resuelve; aclaracion: no exige cambio sino explicar una decisión" },
          respuesta: { type: "string", description: tutor ? "Qué debe hacer el estudiante para atenderla (indicación, no el texto)" : "Respuesta al evaluador en primera persona y en pasado (ej.: «Se amplió la justificación con datos del DANE…»); si está pendiente, qué se hará" },
          tipo: { type: "string", enum: ["forma", "fondo", "metodologica", "normas"], description: "Tipo de observación" }
        }, required: ["n", "estado", "respuesta"] } } }, required: ["respuestas"] },
        `Para cada observación del evaluador, compara con el texto ACTUAL del párrafo comentado y decide si ya está atendida. Sé exigente: «atendida» solo si el cambio se ve en el texto. Responde con respeto y precisión, sin justificarte en exceso.

${obs.map(o => `${o.n}. OBSERVACIÓN (${o.autor}): ${o.texto}\n   TEXTO COMENTADO: «${o.ancla.slice(0, 300)}»\n   PÁRRAFO ACTUAL: «${o.actual.slice(0, 1200)}»`).join("\n\n")}`, signal);
      (d.respuestas || []).forEach(r => { const o = obs[r.n - 1]; if (o) Object.assign(o, { estado: o.resuelto ? "atendida" : r.estado, respuesta: r.respuesta, tipo: r.tipo || "" }); });
    }
    obs.forEach(o => { if (!o.estado) { o.estado = o.resuelto ? "atendida" : "pendiente"; o.respuesta = o.respuesta || ""; } });
    registrar("Matriz de respuesta a observaciones", `${obs.length} observaciones`, Config.faltaClave() ? "documento" : "modelo");
    const at = obs.filter(o => o.estado === "atendida").length;
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta(Config.faltaClave() ? "documento" : "modelo", "comentarios leídos de tu documento"));
    c.appendChild(el("div", "inv-puntaje")).append(el("b", "", `${at}/${obs.length}`), el("span", "", "observaciones atendidas"));
    const txt = { atendida: "Atendida", parcial: "Parcial", pendiente: "Pendiente", aclaracion: "Aclaración" };
    obs.forEach(o => {
      const b = el("div", "prioridad");
      b.appendChild(el("b", "", `${o.n}. ${o.texto.length > 120 ? o.texto.slice(0, 117) + "…" : o.texto}`));
      b.appendChild(el("small", "", `${o.autor || "Evaluador"} · ${o.seccion} · ${txt[o.estado]}${o.tipo ? " · " + o.tipo : ""}`));
      if (o.respuesta) b.appendChild(el("span", "", (tutor ? "Qué hacer: " : "Respuesta: ") + o.respuesta));
      const bI = el("button", "enlace-sutil", "Ir"); bI.onclick = () => irA(o.i); b.appendChild(bI);
      c.appendChild(b);
    });
    const d = Docx.datos();
    const bloques = () => [
      { t: "titulo", texto: "Matriz de respuesta a observaciones" },
      { texto: `**Trabajo:** ${d.titulo || "[Título]"}` }, { texto: `**Estudiante(s):** ${d.estudiante || "[Nombre]"}${d.programa ? " · " + d.programa : ""}` },
      { texto: `**Fecha:** ${Docx.fechaLarga()}` },
      { t: "tabla", filas: [["N.°", "Observación", "Evaluador", "Ubicación", "Respuesta del estudiante", "Estado"]].concat(obs.map(o => [String(o.n), o.texto, o.autor, o.seccion, o.respuesta || "", txt[o.estado]])), anchos: [600, 3800, 1500, 1800, 4200, 1100], tam: 10 },
      { t: "firma", nombres: [d.estudiante || "Estudiante"] }
    ];
    c.appendChild(Docx.botones(bloques, "matriz-respuesta-observaciones.docx", { tam: 11, horizontal: true }, "Abrir matriz en Word"));
    const acc = el("div", "inv-acciones");
    if (!tutor) { const bR = el("button", "boton secundario", "Responder dentro de cada comentario"); bR.onclick = () => H().ejecutar(async () => { const n = await responderComentarios(obs); ui.confirmar(`Respondí ${n} comentarios en el documento.`); }); acc.appendChild(bR); }
    const atendidas = obs.filter(o => o.estado === "atendida" && !o.resuelto);
    if (atendidas.length) { const bM = el("button", "boton secundario", `Marcar ${atendidas.length} como resueltos`); bM.onclick = () => H().ejecutar(async () => { await resolver(atendidas); ui.confirmar("Marqué como resueltos los comentarios atendidos."); }); acc.appendChild(bM); }
    c.appendChild(acc);
    c.appendChild(el("p", "inv-nota", "Revisa cada respuesta: debe decir exactamente qué cambiaste y dónde. Si no estás de acuerdo con una observación, explícalo con argumentos y fuentes."));
    tarjeta("Respuesta a observaciones", c);
    ui.hablar(`Leí ${obs.length} observaciones. ${at} ya están atendidas.`);
    return obs;
  }
  async function responderComentarios(obs) {
    let n = 0;
    await Word.run(async (ctx) => {
      const cs = ctx.document.body.getComments(); cs.load("items/id"); await ctx.sync();
      obs.forEach(o => { const c = cs.items.find(x => x.id === o.id); if (c && o.respuesta) { try { c.reply(o.respuesta); n++; } catch (e) { /* sin soporte */ } } });
      await ctx.sync();
    });
    return n;
  }
  async function resolver(obs) {
    await Word.run(async (ctx) => {
      const cs = ctx.document.body.getComments(); cs.load("items/id"); await ctx.sync();
      obs.forEach(o => { const c = cs.items.find(x => x.id === o.id); if (c) c.resolved = true; });
      await ctx.sync();
    });
  }

  /* ---------- Acta de asesoría ---------- */
  function acta() {
    const { el, tarjeta } = H();
    const falta = Docx.faltan(["estudiante", "asesor", "institucion", "programa"]);
    if (falta.length) { tarjeta("Datos para el acta", Docx.formulario(["titulo", "estudiante", "asesor", "institucion", "facultad", "programa"], () => acta(), "El acta lleva estos datos. Los guardo para las próximas.")); return; }
    const p = window.Asesor ? Asesor.proyecto() : { sesiones: [] };
    const ses = p.sesiones || [];
    const c = el("div", "inv-cuerpo");
    c.appendChild(el("p", "guia-resumen", ses.length ? "Elige la sesión. Armo el acta con lo que trabajamos: temas, avances, compromisos con fecha y firmas." : "Aún no hay sesiones de asesoría registradas. Puedes hacer una sesión con Romus o descargar un acta en blanco."));
    const sel = el("select", "ajuste");
    ses.forEach((s, k) => { const o = el("option", "", `Sesión ${k + 1} · ${fecha(s.fecha.slice(0, 10))}`); o.value = k; sel.appendChild(o); });
    const oB = el("option", "", "Acta en blanco"); oB.value = "-1"; sel.appendChild(oB);
    sel.value = ses.length ? String(ses.length - 1) : "-1";
    const l = el("label", "campo-pro"); l.append(el("span", "", "Sesión"), sel); c.appendChild(l);
    const mod = el("select", "ajuste"); ["Presencial", "Virtual"].forEach(x => { const o = el("option", "", x); o.value = x; mod.appendChild(o); });
    const l2 = el("label", "campo-pro"); l2.append(el("span", "", "Modalidad"), mod); c.appendChild(l2);
    const prox = el("input", "ajuste"); prox.type = "date";
    const l3 = el("label", "campo-pro"); l3.append(el("span", "", "Próxima sesión"), prox); c.appendChild(l3);
    c.appendChild(Docx.botones(() => bloquesActa(+sel.value, ses, mod.value, prox.value), "acta-de-asesoria.docx", { tam: 11 }, "Abrir acta en Word"));
    if (!ses.length && window.Asesor) { const b = el("button", "boton secundario", "Hacer una sesión de asesoría"); b.onclick = () => H().ejecutar(() => Asesor.sesion()); c.appendChild(b); }
    tarjeta("Acta de asesoría", c);
  }
  function bloquesActa(k, ses, modalidad, proxima) {
    const d = Docx.datos();
    const s = k >= 0 ? ses[k] : null;
    const f = s ? new Date(s.fecha) : new Date();
    const mas = (dias) => { const x = new Date(f.getTime() + (dias || 7) * 864e5); return x.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }); };
    const B = [{ t: "titulo", texto: `Acta de asesoría${s ? " N.° " + (k + 1) : ""}` }, { texto: [d.institucion, d.facultad, d.programa].filter(Boolean).join(" · "), centrado: true }];
    B.push({ t: "tabla", cabecera: false, anchos: [3000, 6000], filas: [["Trabajo", d.titulo || ""], ["Estudiante(s)", d.estudiante || ""], ["Asesor(a)", d.asesor || ""], ["Fecha", s ? Docx.fechaLarga(f) : ""], ["Modalidad", modalidad || ""], ["Etapa", s ? ((window.Asesor && Asesor.ETAPAS.find(e => e.id === s.etapa)) || {}).nombre || "" : ""]] });
    B.push({ t: "h2", texto: "1. Temas tratados" });
    if (s) { B.push({ texto: s.diagnostico || "", justificado: true }); B.push({ t: "lista", num: true, items: (s.prioridades || []).map(p => `**${p.titulo}.** ${(p.porque || "").replace(/([^.!?])$/, "$1.")} ${p.como ? "Cómo: " + p.como : ""}`.trim()) }); }
    else B.push({ texto: "\n\n" });
    B.push({ t: "h2", texto: "2. Avances presentados" });
    B.push({ texto: s ? `${s.avance || ""} El documento tenía ${s.palabras || 0} palabras en esta sesión.`.trim() : "\n\n", justificado: true });
    B.push({ t: "h2", texto: "3. Compromisos" });
    B.push({ t: "tabla", anchos: [600, 5000, 1700, 1700], filas: [["N.°", "Compromiso", "Responsable", "Fecha límite"]].concat(s && (s.tareas || []).length ? s.tareas.map((t, i) => [String(i + 1), t.tarea, "Estudiante", mas(t.plazo_dias)]) : [["1", "", "", ""], ["2", "", "", ""], ["3", "", "", ""]]) });
    B.push({ t: "h2", texto: "4. Observaciones" });
    B.push({ texto: s && (s.preguntas || []).length ? "Preguntas para profundizar: " + s.preguntas.join(" ") : "\n\n", justificado: true });
    B.push({ texto: `**Próxima sesión:** ${proxima ? fecha(proxima) : "____________________"}` });
    B.push({ t: "firma", nombres: [`${d.estudiante || "Estudiante"}\nEstudiante`, `${d.asesor || "Asesor(a)"}\nAsesor(a)`] });
    B.push({ texto: "_Acta elaborada con apoyo de Romus a partir del registro de la sesión de asesoría._", tam: 9 });
    return B;
  }

  /* ---------- Modo director ---------- */
  const CLAVE_DIR = "romus.director.v1";
  const historial = () => { try { return JSON.parse(localStorage.getItem(CLAVE_DIR) || "[]"); } catch (e) { return []; } };
  async function director(signal) {
    const { el, tarjeta } = H();
    const c0 = el("div", "inv-cuerpo");
    // Datos del estudiante evaluado (no se mezclan con los datos propios)
    const iE = el("input", "ajuste"), iT = el("input", "ajuste"), iD = el("input", "ajuste");
    iE.placeholder = "Nombre del estudiante"; iT.placeholder = "Título del trabajo"; iD.placeholder = "Tu nombre (director o jurado)";
    iD.value = Config.get().nombreDirector || "";
    [["Estudiante", iE], ["Trabajo", iT], ["Director o jurado", iD]].forEach(([t, i]) => { const l = el("label", "campo-pro"); l.append(el("span", "", t), i); c0.appendChild(l); });
    const doc0 = await Doc.leerParrafos();
    const tit = doc0.find(p => /^(title|t[ií]tulo)$/i.test(p.estilo) && p.texto.trim()) || doc0.find(p => p.texto.trim());
    if (tit) iT.value = tit.texto.trim().slice(0, 200);
    const h = historial();
    if (h.length) { c0.appendChild(el("div", "inv-sub", "Trabajos revisados")); const tb = el("table", "tabla-mini"); const tr0 = el("tr"); ["Estudiante", "Fecha", "Rúbrica", "Avance", "Concepto"].forEach(x => tr0.appendChild(el("th", "", x))); tb.appendChild(tr0); h.slice(-12).reverse().forEach(x => { const tr = el("tr"); [x.estudiante, fecha(x.fecha.slice(0, 10)), x.puntaje != null ? x.puntaje + "/100" : "—", x.avance + "%", x.concepto].forEach(v => tr.appendChild(el("td", "", String(v)))); tb.appendChild(tr); }); c0.appendChild(tb); }
    const b = el("button", "boton primario", "Revisar este trabajo");
    b.onclick = () => { Config.set({ nombreDirector: iD.value.trim() }); H().ejecutar(() => revisarTrabajo({ estudiante: iE.value.trim(), titulo: iT.value.trim(), director: iD.value.trim() }, signal)); };
    c0.appendChild(b);
    c0.appendChild(el("p", "inv-nota", "Abre el documento del estudiante en Word y pulsa revisar. Romus aplica la rúbrica del nivel, revisa APA 7 y coherencia, y prepara un informe de revisión con concepto."));
    tarjeta("Modo director", c0);
  }
  async function revisarTrabajo(info, signal) {
    const { el, tarjeta, etiqueta, pedirHerramienta, documentoNumerado, verificar, registrar } = H();
    const ui = H().ui;
    if (Config.faltaClave()) throw new Error("El modo director necesita tu IA conectada (Ajustes).");
    ui.ocupar(true, "Revisando el trabajo…");
    let rub = null, apa = null, avance = null;
    try { rub = await Inv.evaluarRubrica(signal); } catch (e) { if (e.status || /clave|límite|conectar|saturad|temporal/i.test(e.message)) { ui.ocupar(false); throw e; } rub = null; }
    try { apa = await APA.revisar(); } catch (e) { apa = null; }
    try { avance = await Asesor.avance(); } catch (e) { avance = null; }
    const doc = await documentoNumerado();
    const d = await pedirHerramienta("informe_director", "Informe de revisión de un trabajo de grado por su director o jurado.",
      { type: "object", properties: {
        fortalezas: { type: "array", items: { type: "string" } },
        mejoras: { type: "array", items: { type: "object", properties: { aspecto: { type: "string" }, detalle: { type: "string" }, evidencia: { type: "string", description: "Fragmento LITERAL del documento (máx. 20 palabras) o vacío" }, prioridad: { type: "string", enum: ["alta", "media", "baja"] } }, required: ["aspecto", "detalle", "prioridad"] } },
        concepto: { type: "string", enum: ["Aprobado", "Aprobado con ajustes menores", "Requiere ajustes de fondo", "No aprobado"] },
        sintesis: { type: "string", description: "Concepto general en 3 a 5 frases, respetuoso y claro" }
      }, required: ["fortalezas", "mejoras", "concepto", "sintesis"] },
      `Eres director o jurado de un trabajo de ${Inv.nivel().nombre}. Evalúa con rigor y respeto.
${rub ? `Rúbrica: ${rub.puntaje}/100 (${rub.criterios.map(c => `${c.nombre} ${Math.round(c.nota * 100)}%`).join(", ")}).` : ""}
${apa ? `Revisión APA 7: ${apa.hall.length} observaciones de forma.` : ""}
${avance ? `Avance estimado: ${avance.porc}% (etapa: ${avance.actual.nombre}).` : ""}
Da máximo 8 aspectos por mejorar, ordenados por prioridad, con evidencia literal cuando sea posible.

TRABAJO:
${doc.texto}`, signal);
    const mejoras = (d.mejoras || []).map(m => Object.assign(m, { i: m.evidencia ? verificar(m.evidencia, doc.parrafos) : -1 }));
    const reg = { estudiante: info.estudiante || "Sin nombre", titulo: info.titulo, fecha: new Date().toISOString(), puntaje: rub ? rub.puntaje : null, avance: avance ? avance.porc : 0, concepto: d.concepto, apa: apa ? apa.hall.length : null };
    const h = historial(); const previo = h.filter(x => x.estudiante === reg.estudiante && x.titulo === reg.titulo).pop();
    h.push(reg); try { localStorage.setItem(CLAVE_DIR, JSON.stringify(h.slice(-200))); } catch (e) { /* opcional */ }
    registrar("Informe de director", `${reg.estudiante}: ${d.concepto}`, "modelo");
    const porCat = {}; if (apa) apa.hall.forEach(x => { porCat[x.cat] = (porCat[x.cat] || 0) + 1; });
    const bloques = () => [
      { t: "titulo", texto: "Informe de revisión de trabajo de grado" },
      { t: "tabla", cabecera: false, anchos: [3000, 6000], filas: [["Trabajo", info.titulo || ""], ["Estudiante(s)", info.estudiante || ""], ["Nivel", Inv.nivel().nombre], ["Revisado por", info.director || ""], ["Fecha", Docx.fechaLarga()]] },
      { t: "h2", texto: "Concepto" }, { texto: `**${d.concepto}.** ${d.sintesis}`, justificado: true },
      { t: "h2", texto: "Indicadores" },
      { t: "tabla", anchos: [4500, 4500], filas: [["Indicador", "Resultado"]].concat(rub ? [["Rúbrica del nivel (criterios fijos)", `${rub.puntaje}/100`]].concat(rub.criterios.map(c => ["   " + c.nombre, Math.round(c.nota * 100) + " %"])) : []).concat(avance ? [["Avance estimado", `${avance.porc} % · etapa: ${avance.actual.nombre}`]] : []).concat(apa ? [["Observaciones de normas APA 7", String(apa.hall.length)]] : []).concat(previo ? [["Revisión anterior", `${fecha(previo.fecha.slice(0, 10))}: ${previo.puntaje != null ? previo.puntaje + "/100" : "—"} · ${previo.concepto}`]] : []) },
      { t: "h2", texto: "Fortalezas" }, { t: "lista", items: d.fortalezas || [] },
      { t: "h2", texto: "Aspectos por mejorar" },
      { t: "tabla", anchos: [1200, 2600, 5200], filas: [["Prioridad", "Aspecto", "Detalle"]].concat(mejoras.map(m => [m.prioridad, m.aspecto, m.detalle + (m.evidencia && m.i >= 0 ? ` Ej.: «${m.evidencia}»` : "")])) },
      { t: "firma", nombres: [info.director || "Director(a) o jurado"] },
      { texto: "_Informe preparado con apoyo de Romus. El concepto final es responsabilidad del evaluador._", tam: 9 }
    ];
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("modelo", "con rúbrica por reglas, APA 7 y avance calculados por Romus"));
    const pun = el("div", "inv-puntaje"); pun.append(el("b", "", rub ? String(rub.puntaje) : "—"), el("span", "", `/100 · ${d.concepto}${previo && previo.puntaje != null && rub ? ` · antes ${previo.puntaje}` : ""}`)); c.appendChild(pun);
    c.appendChild(el("p", "guia-resumen", d.sintesis));
    c.appendChild(el("div", "inv-sub", "Aspectos por mejorar"));
    mejoras.forEach(m => { const b = el("div", "prioridad"); b.append(el("b", "", `${m.aspecto} · ${m.prioridad}`), el("span", "", m.detalle)); if (m.i >= 0) { const bI = el("button", "enlace-sutil", "Ver en el documento"); bI.onclick = () => H().irA(m.i); b.appendChild(bI); } c.appendChild(b); });
    c.appendChild(Docx.botones(bloques, `informe-revision-${norm(info.estudiante || "estudiante").replace(/[^a-z0-9]+/g, "-")}.docx`, { tam: 11 }, "Abrir informe en Word"));
    const conEv = mejoras.filter(m => m.i >= 0);
    if (conEv.length) { const b = el("button", "boton secundario", `Comentar ${conEv.length} aspectos en el documento`); b.onclick = () => H().ejecutar(async () => { const x = await Doc.comentar(conEv.map(m => ({ parrafo: m.i, fragmento: m.evidencia, comentario: `${m.aspecto}: ${m.detalle}` }))); ui.confirmar(`Dejé ${x.hechos} comentarios en el trabajo.`); }); c.appendChild(b); }
    const bV = el("button", "boton secundario", "Revisar otro trabajo"); bV.onclick = () => director(); c.appendChild(bV);
    tarjeta("Informe de revisión", c);
    ui.ocupar(false);
    ui.hablar(`Revisión lista. Concepto: ${d.concepto}.`);
    return { d, rub, apa, avance };
  }

  function comando(n) {
    const tarea = (fn) => async () => { H().ui.ocupar(true, "Revisión…"); try { await fn(); } catch (e) { H().ui.mostrarError(e); } finally { H().ui.ocupar(false); } };
    if (/(responde(r)?|respuesta|matriz)( a| de)? (las )?(observaciones|correcciones|comentarios)( del (jurado|asesor|evaluador))?/.test(n)) return tarea(observaciones);
    if (/^(haz|hazme|genera|crea|dame)?( el| un| mi)? ?acta( de (la )?asesoria)?$/.test(n)) return () => acta();
    if (/^((modo|soy) )?(director|jurado|docente evaluador)( de (tesis|trabajos de grado))?$|revisar (el )?trabajo de (mi|un) estudiante|modo director/.test(n)) return tarea(director);
    return null;
  }

  return { observaciones, acta, director, revisarTrabajo, comando, _bloquesActa: bloquesActa, _leerComentarios: leerComentarios };
})();
