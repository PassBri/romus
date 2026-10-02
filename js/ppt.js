/* Romus para PowerPoint · Ensayo, revisión de diapositivas y simulacro de jurado.
   Lee la presentación completa con la API común de Office (getFileAsync) y JSZip, así obtiene
   el texto, el tamaño de letra, las imágenes y las NOTAS DEL ORADOR de cada diapositiva
   en cualquier versión de PowerPoint que admita complementos. */
window.RomusPPT = (function () {
  const $ = (id) => document.getElementById(id);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  let diapos = [], orbe = null, enOffice = false;

  /* ================= Leer la presentación ================= */
  function archivo() {
    return new Promise((ok, mal) => {
      Office.context.document.getFileAsync(Office.FileType.Compressed, { sliceSize: 4194304 }, (r) => {
        if (r.status !== Office.AsyncResultStatus.Succeeded) return mal(new Error("No pude leer la presentación: " + (r.error && r.error.message)));
        const f = r.value, n = f.sliceCount, partes = [];
        let leidas = 0;
        const leer = (i) => f.getSliceAsync(i, (s) => {
          if (s.status !== Office.AsyncResultStatus.Succeeded) { f.closeAsync(); return mal(new Error("No pude leer la presentación.")); }
          partes[i] = s.value.data; leidas++;
          if (leidas === n) { f.closeAsync(); const total = partes.reduce((a, p) => a + p.length, 0); const u = new Uint8Array(total); let o = 0; partes.forEach(p => { u.set(p, o); o += p.length; }); ok(u); }
          else leer(i + 1);
        });
        leer(0);
      });
    });
  }
  const dom = (x) => new DOMParser().parseFromString(x, "application/xml");
  const NS = { a: "http://schemas.openxmlformats.org/drawingml/2006/main", p: "http://schemas.openxmlformats.org/presentationml/2006/main", r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships" };
  const todos = (d, ns, n) => Array.from(d.getElementsByTagNameNS(NS[ns], n));
  function rels(x) { const m = {}; if (!x) return m; Array.from(dom(x).getElementsByTagName("Relationship")).forEach(r => { m[r.getAttribute("Id")] = r.getAttribute("Target"); }); return m; }
  const resolver = (base, t) => { const ps = (base.replace(/[^/]+$/, "") + t).split("/"); const o = []; ps.forEach(p => { if (p === "..") o.pop(); else if (p && p !== ".") o.push(p); }); return o.join("/"); };
  function parrafos(d, excluirPh) {
    return todos(d, "p", "sp").filter(sp => { const ph = sp.getElementsByTagNameNS(NS.p, "ph")[0]; return !(ph && excluirPh.includes(ph.getAttribute("type"))); })
      .map(sp => {
        const ph = sp.getElementsByTagNameNS(NS.p, "ph")[0];
        const tipo = ph ? ph.getAttribute("type") || "body" : "";
        const ps = todos(sp, "a", "p").map(p => ({ texto: todos(p, "a", "t").map(t => t.textContent).join(""), tams: todos(p, "a", "rPr").map(r => +r.getAttribute("sz") || 0).filter(Boolean) })).filter(p => p.texto.trim());
        return { tipo, ps };
      }).filter(s => s.ps.length);
  }
  async function leerPresentacion(bytes) {
    const zip = await JSZip.loadAsync(bytes || await archivo());
    const leer = (n) => zip.file(n) ? zip.file(n).async("string") : Promise.resolve("");
    const pres = dom(await leer("ppt/presentation.xml"));
    const pr = rels(await leer("ppt/_rels/presentation.xml.rels"));
    const ids = todos(pres, "p", "sldId").map(s => s.getAttributeNS(NS.r, "id"));
    const salida = [];
    for (let k = 0; k < ids.length; k++) {
      const ruta = resolver("ppt/presentation.xml", pr[ids[k]]);
      const xml = await leer(ruta);
      const d = dom(xml);
      const formas = parrafos(d, ["sldNum", "dt", "ftr"]);
      const tituloForma = formas.find(f => f.tipo === "title" || f.tipo === "ctrTitle");
      const titulo = tituloForma ? tituloForma.ps.map(p => p.texto).join(" ") : (formas[0] ? formas[0].ps[0].texto : "");
      let cuerpo = formas.filter(f => f !== tituloForma).flatMap(f => f.ps);
      if (!tituloForma && cuerpo.length && cuerpo[0].texto === titulo) cuerpo = cuerpo.slice(1); // título en un cuadro de texto común
      const sr = rels(await leer(ruta.replace(/slides\/(slide\d+\.xml)$/, "slides/_rels/$1.rels")));
      let notas = "";
      const rn = Object.values(sr).find(t => /notesSlide/.test(t));
      if (rn) { const dn = dom(await leer(resolver(ruta, rn))); notas = parrafos(dn, ["sldNum", "sldImg", "hdr", "ftr", "dt"]).flatMap(f => f.ps.map(p => p.texto)).join("\n").trim(); }
      const plan = (notas.match(/Tiempo sugerido:\s*(?:(\d+)\s*min)?\s*(?:(\d+)\s*s)?/i) || []);
      const planSeg = plan[0] ? (+(plan[1] || 0)) * 60 + (+(plan[2] || 0)) : 0;
      const palabras = cuerpo.reduce((a, p) => a + p.texto.trim().split(/\s+/).length, 0);
      salida.push({
        n: k + 1, titulo: titulo.trim(), cuerpo: cuerpo.map(p => p.texto), palabras,
        tams: cuerpo.flatMap(p => p.tams.map(t => ({ pt: t / 100, texto: p.texto }))),
        imagenes: todos(d, "p", "pic").length, graficos: (xml.match(/<c:chart\b|drawingml\/2006\/chart/g) || []).length, tablas: todos(d, "a", "tbl").length,
        notas: notas.replace(/^Tiempo sugerido:[^\n]*\n*/i, "").trim(), planSeg
      });
    }
    return salida;
  }

  async function cargar(bytes) {
    estadoOrbe("pensando", "Leyendo tu presentación…");
    try {
      diapos = await leerPresentacion(bytes);
      $("infoPpt").textContent = `${diapos.length} diapositivas · ${diapos.filter(d => d.notas).length} con notas`;
      estadoOrbe("reposo", diapos.length ? "Listo para ensayar" : "La presentación está vacía");
      prepararEnsayo(); revisar();
    } catch (e) {
      estadoOrbe("reposo", "No pude leer la presentación");
      aviso(e.message + " Guarda la presentación y pulsa ⟳ arriba.");
    }
    return diapos;
  }
  function aviso(t) { const a = $("avisoPpt"); a.textContent = t; a.classList.toggle("oculto", !t); }

  /* ================= Navegar en PowerPoint ================= */
  function irA(n) { if (!enOffice) return; try { Office.context.document.goToByIdAsync(n, Office.GoToType.Index, () => {}); } catch (e) { /* sin navegación */ } }
  function actual() {
    return new Promise((ok) => {
      if (!enOffice) return ok(null);
      try { Office.context.document.getSelectedDataAsync(Office.CoercionType.SlideRange, (r) => ok(r.status === "succeeded" && r.value && r.value.slides && r.value.slides[0] ? r.value.slides[0].index : null)); } catch (e) { ok(null); }
    });
  }

  /* ================= Orbe y estado ================= */
  function estadoOrbe(e, texto) { if (orbe) orbe.estado(e); const n = document.querySelector(".nucleo"); if (n) n.dataset.estado = e; if (texto != null) $("estadoPpt").textContent = texto; }
  async function hablar(t) {
    if (!t) return;
    estadoOrbe("hablando");
    try { await Voz.decir(t, (Config.get().idioma || "es-CO")); } catch (e) { /* sin voz */ }
    estadoOrbe("reposo");
  }

  /* ================= 1. Ensayo ================= */
  const E = { activo: false, idx: 0, inicio: 0, acumulado: [], totalPlan: 1200, plan: [], timer: null, pausa: true, ultimoTick: 0 };
  function prepararEnsayo() {
    const min = +$("selMinutos").value || 20;
    E.totalPlan = min * 60;
    const conPlan = diapos.filter(d => d.planSeg).length === diapos.length && diapos.length;
    if (conPlan) {
      const suma = diapos.reduce((a, d) => a + d.planSeg, 0);
      E.plan = diapos.map(d => d.planSeg * E.totalPlan / suma);
      $("planNota").textContent = "Uso los tiempos sugeridos de tus notas, ajustados a la duración elegida.";
    } else {
      const pesos = diapos.map(d => Math.max(30, (d.notas || "").split(/\s+/).length + d.palabras));
      const suma = pesos.reduce((a, b) => a + b, 0) || 1;
      E.plan = pesos.map(p => p * E.totalPlan / suma);
      $("planNota").textContent = diapos.length ? `Reparto ${min} minutos según el contenido de cada diapositiva (unos ${mmss(E.totalPlan / Math.max(1, diapos.length))} por diapositiva).` : "";
    }
    E.acumulado = diapos.map(() => 0); E.idx = 0;
    pintarEnsayo();
  }
  function tick() {
    if (E.pausa || !E.activo) return;
    const ahora = performance.now();
    E.acumulado[E.idx] += (ahora - E.ultimoTick) / 1000; E.ultimoTick = ahora;
    pintarEnsayo();
  }
  function pintarEnsayo() {
    const d = diapos[E.idx];
    const t = E.acumulado[E.idx] || 0, p = E.plan[E.idx] || 0;
    const tot = E.acumulado.reduce((a, b) => a + b, 0);
    $("crDiapo").textContent = mmss(t); $("crDiapoPlan").textContent = "de " + mmss(p);
    $("crTotal").textContent = mmss(tot); $("crTotalPlan").textContent = "de " + mmss(E.totalPlan);
    const color = (x, y) => x <= y ? "ok" : x <= y * 1.2 ? "medio" : "mal";
    const bd = $("barDiapo"), bt = $("barTotal");
    bd.style.width = Math.min(100, p ? t / p * 100 : 0) + "%"; bd.className = color(t, p);
    bt.style.width = Math.min(100, tot / E.totalPlan * 100) + "%"; bt.className = color(tot, E.totalPlan);
    document.querySelectorAll(".crono")[0].classList.toggle("excedido", p && t > p * 1.2);
    $("numDiapo").textContent = diapos.length ? `${E.idx + 1} / ${diapos.length}` : "—";
    $("titDiapo").textContent = d ? (d.titulo || "Diapositiva " + d.n) : "Abre una presentación";
    $("notasDiapo").textContent = d ? (d.notas || "Esta diapositiva no tiene notas del orador. Escríbelas en el panel de notas de PowerPoint: te ayudan a no olvidar lo importante.") : "—";
    $("btnPlay").textContent = !E.activo ? "Iniciar ensayo" : E.pausa ? "Continuar" : "Pausar";
  }
  function cambiar(i, desdePpt) {
    if (!diapos.length) return;
    i = Math.max(0, Math.min(diapos.length - 1, i));
    if (E.activo && !E.pausa) { tick(); }
    E.idx = i; E.ultimoTick = performance.now();
    if (!desdePpt) irA(i + 1);
    if ($("btnLeerNotas").dataset.leyendo === "1") { Voz.callar(); $("btnLeerNotas").dataset.leyendo = ""; $("btnLeerNotas").textContent = "Leer en voz alta"; }
    pintarEnsayo();
  }
  function alternar() {
    if (!diapos.length) return;
    if (!E.activo) { E.activo = true; E.pausa = false; E.ultimoTick = performance.now(); irA(E.idx + 1); clearInterval(E.timer); E.timer = setInterval(tick, 250); estadoOrbe("escuchando", "Ensayando…"); }
    else { tick(); E.pausa = !E.pausa; E.ultimoTick = performance.now(); estadoOrbe(E.pausa ? "reposo" : "escuchando", E.pausa ? "En pausa" : "Ensayando…"); }
    pintarEnsayo();
  }
  function terminar() {
    if (!E.activo) return;
    tick(); clearInterval(E.timer); E.activo = false; E.pausa = true;
    const tot = E.acumulado.reduce((a, b) => a + b, 0);
    const clave = "romus.ensayos." + norm(diapos[0] ? diapos[0].titulo : "presentacion").slice(0, 60);
    let hist = []; try { hist = JSON.parse(localStorage.getItem(clave) || "[]"); } catch (e) { hist = []; }
    const previo = hist[hist.length - 1];
    hist.push({ fecha: new Date().toISOString(), total: tot, plan: E.totalPlan }); try { localStorage.setItem(clave, JSON.stringify(hist.slice(-20))); } catch (e) { /* opcional */ }
    const c = $("resEnsayo"); c.innerHTML = "";
    const dif = tot - E.totalPlan;
    const veredicto = Math.abs(dif) <= E.totalPlan * 0.1 ? "¡En el tiempo justo!" : dif > 0 ? `Te pasaste ${mmss(dif)}` : `Te sobraron ${mmss(-dif)}`;
    const pun = el("div", "inv-puntaje"); pun.append(el("b", "", mmss(tot)), el("span", "", `de ${mmss(E.totalPlan)} · ${veredicto}${previo ? ` · ensayo anterior: ${mmss(previo.total)}` : ""}`)); c.appendChild(pun);
    const tb = el("table", "tabla-mini");
    const tr0 = el("tr"); ["#", "Diapositiva", "Plan", "Real"].forEach(x => tr0.appendChild(el("th", "", x))); tb.appendChild(tr0);
    diapos.forEach((d, i) => { const tr = el("tr"); const r = E.acumulado[i], p = E.plan[i]; tr.append(el("td", "", String(i + 1)), el("td", "", d.titulo || "—"), el("td", "", mmss(p)), el("td", r > p * 1.2 ? "mal" : r < p * 0.5 && r > 0 ? "medio" : "ok", mmss(r))); tr.style.cursor = "pointer"; tr.onclick = () => cambiar(i); tb.appendChild(tr); });
    c.appendChild(tb);
    const largas = diapos.map((d, i) => ({ d, i, x: E.acumulado[i] - E.plan[i] })).filter(o => o.x > E.plan[o.i] * 0.2).sort((a, b) => b.x - a.x).slice(0, 3);
    const consejos = [];
    if (largas.length) consejos.push(`Donde más te extendiste: ${largas.map(o => `«${o.d.titulo || "diapositiva " + (o.i + 1)}» (+${mmss(o.x)})`).join(", ")}. Lleva los detalles a tus notas y di solo la idea central.`);
    const saltadas = diapos.filter((d, i) => E.acumulado[i] < 5).length;
    if (saltadas) consejos.push(`${saltadas} diapositiva${saltadas > 1 ? "s" : ""} casi sin tiempo: ¿sobran o te faltó explicarlas?`);
    if (dif < -E.totalPlan * 0.1) consejos.push("Vas rápido: respira, haz pausas después de cada idea importante y mira al jurado.");
    if (!consejos.length) consejos.push("Ritmo equilibrado. Repite el ensayo de pie y en voz alta, como el día de la sustentación.");
    const ul = el("ul", "guia-puntos"); consejos.forEach(x => ul.appendChild(el("li", "", x))); c.appendChild(ul);
    hablar(`Terminaste en ${Math.round(tot / 60)} minutos. ${veredicto}.`);
    estadoOrbe("reposo", "Ensayo terminado");
  }

  /* ================= 2. Revisión de diapositivas ================= */
  function revisar() {
    const c = $("resRevision"); c.innerHTML = "";
    if (!diapos.length) { c.appendChild(el("p", "inv-nota", "No hay diapositivas para revisar.")); return []; }
    const min = +$("selMinutos").value || 20;
    const h = [];
    // Textos que se repiten en muchas diapositivas (pies de página) no cuentan para el tamaño de letra
    const cuenta = {}; diapos.forEach(d => new Set(d.tams.map(t => norm(t.texto))).forEach(t => { cuenta[t] = (cuenta[t] || 0) + 1; }));
    const repetido = (t) => cuenta[norm(t)] >= Math.max(2, diapos.length * 0.4);
    const contenido = (d) => d.cuerpo.filter(p => !repetido(p) && !/^\s*\d+\s*$/.test(p) && !/^\s*(visual sugerido|nota\.)/i.test(p));
    diapos.forEach(d => { d.contenido = contenido(d); d.palabrasC = d.contenido.reduce((a, p) => a + p.trim().split(/\s+/).length, 0); });
    diapos.forEach((d, i) => {
      const extremo = i === 0 || i === diapos.length - 1;
      if (!d.titulo) h.push([i, "Sin título", "Cada diapositiva necesita un título que diga la idea principal."]);
      if (!extremo && d.palabrasC > 40) h.push([i, `Demasiado texto (${d.palabrasC} palabras)`, "Deja máximo 3 o 4 ideas cortas; lo demás va en tus notas. El jurado lee o te escucha, no ambas cosas."]);
      if (!extremo && d.contenido.length > 6) h.push([i, `${d.contenido.length} viñetas`, "Usa máximo 4 o 5 viñetas por diapositiva."]);
      const larga = d.contenido.find(p => p.split(/\s+/).length > 15);
      if (!extremo && larga) h.push([i, "Frase larga", `«${larga.slice(0, 60)}…» tiene ${larga.split(/\s+/).length} palabras. Conviértela en una idea de 6 a 12 palabras.`]);
      const peq = d.tams.filter(t => t.pt && t.pt < 18 && t.texto.split(/\s+/).length > 3 && !repetido(t.texto) && !/^(nota\.|fuente|visual sugerido)/i.test(t.texto.trim())).map(t => t.pt);
      if (!extremo && peq.length) h.push([i, `Letra pequeña (${Math.min(...peq)} pt)`, "Usa mínimo 18 pt (ideal 24 pt) para que se lea desde el fondo del salón."]);
      if (!d.notas) h.push([i, "Sin notas del orador", "Escribe en las notas lo que vas a decir: Romus las usa en el ensayo."]);
    });
    let seguidas = 0;
    diapos.forEach((d, i) => { const visual = d.imagenes + d.graficos + d.tablas > 0 || d.palabrasC <= 8; seguidas = visual || i === 0 ? 0 : seguidas + 1; if (seguidas === 3) h.push([i, "Tres diapositivas seguidas solo con texto", "Alterna con un gráfico, una tabla, un esquema o una imagen."]); });
    const porMin = diapos.length / min;
    const global = [];
    if (porMin > 1.2) global.push(`Tienes ${diapos.length} diapositivas para ${min} minutos: son muchas. Lo recomendable es una por minuto o menos.`);
    if (porMin < 0.4) global.push(`Tienes ${diapos.length} diapositivas para ${min} minutos: quizá pocas para mostrar tu trabajo completo.`);
    const pun = el("div", "inv-puntaje");
    const sanas = diapos.length - new Set(h.map(x => x[0])).size;
    pun.append(el("b", "", `${sanas}/${diapos.length}`), el("span", "", "diapositivas sin observaciones")); c.appendChild(pun);
    const et = el("span", "trust rubrica", "Reglas fijas · sin IA"); c.appendChild(et);
    global.forEach(g => c.appendChild(el("p", "guia-resumen", g)));
    if (!h.length) c.appendChild(el("p", "guia-resumen", "¡Muy bien! Tus diapositivas tienen poco texto, letra legible y notas."));
    const porDiapo = {}; h.forEach(x => { (porDiapo[x[0]] = porDiapo[x[0]] || []).push(x); });
    Object.keys(porDiapo).forEach(i => {
      const d = diapos[i];
      const b = el("div", "prioridad");
      b.appendChild(el("b", "", `${+i + 1}. ${d.titulo || "Sin título"}`));
      porDiapo[i].forEach(([, t, m]) => { const f = el("span", ""); f.append(el("strong", "", t + ": "), document.createTextNode(m)); b.appendChild(f); });
      const acc = el("div", "inv-acciones");
      const bI = el("button", "enlace-sutil", "Ir a la diapositiva"); bI.onclick = () => irA(+i + 1); acc.appendChild(bI);
      if (d.palabrasC > 40 || d.contenido.some(p => p.split(/\s+/).length > 15)) { const bC = el("button", "enlace-sutil", "Proponer versión corta"); bC.onclick = () => versionCorta(d, b, bC); acc.appendChild(bC); }
      b.appendChild(acc); c.appendChild(b);
    });
    return h;
  }
  async function versionCorta(d, caja, boton) {
    if (Config.faltaClave()) { abrirIA(); return; }
    boton.disabled = true; boton.textContent = "Pensando…"; estadoOrbe("pensando");
    try {
      const r = await pedir("version_corta", "Versión breve del texto de una diapositiva.", { type: "object", properties: { titulo: { type: "string" }, ideas: { type: "array", items: { type: "string" }, description: "3 o 4 ideas de máximo 10 palabras" }, a_notas: { type: "string", description: "Lo que se quitó y conviene decir en voz alta (para las notas)" } }, required: ["ideas"] },
        `Reduce esta diapositiva de sustentación a lo esencial, sin cambiar su contenido.\nTítulo: ${d.titulo}\nTexto:\n${d.cuerpo.join("\n")}`);
      const box = el("div", "guia-caja ejemplo");
      box.appendChild(el("b", "", "Versión corta (cópiala en tu diapositiva)"));
      const ul = el("ul", "guia-puntos"); r.ideas.forEach(x => ul.appendChild(el("li", "", x))); box.appendChild(ul);
      if (r.a_notas) box.appendChild(el("small", "", "Para tus notas: " + r.a_notas));
      const bc = el("button", "enlace-sutil", "Copiar"); bc.onclick = async () => { try { await navigator.clipboard.writeText(r.ideas.join("\n")); bc.textContent = "¡Copiado!"; } catch (e) { bc.textContent = "Selecciona y copia"; } }; box.appendChild(bc);
      caja.appendChild(box); boton.remove();
    } catch (e) { boton.disabled = false; boton.textContent = "Proponer versión corta"; aviso(e.message); }
    estadoOrbe("reposo");
  }

  /* ================= IA ================= */
  async function pedir(nombre, descripcion, esquema, mensaje) {
    const nivel = { pregrado: "pregrado", especializacion: "especialización", maestria: "maestría", doctorado: "doctorado", posdoctorado: "posdoctorado" }[Config.get().nivelInvestigacion] || "posgrado";
    const r = await IA.llamar({
      system: [{ type: "text", text: `Eres Romus, asesor de sustentaciones de trabajos de grado de ${nivel}. Respondes en español claro, con respeto y precisión.` }],
      messages: [{ role: "user", content: mensaje }],
      tools: [{ name: nombre, description: descripcion, input_schema: esquema }],
      tool_choice: { type: "tool", name: nombre }, max_tokens: 4000
    });
    const ll = IA.herramientasDe(r).find(x => x.nombre === nombre);
    if (!ll) throw new Error("La IA no devolvió el resultado esperado. Prueba de nuevo.");
    return ll.datos;
  }

  /* ================= 3. Simulacro de jurado ================= */
  const J = { preguntas: [], k: 0, resultados: [], respuesta: "", escuchando: false, inicio: 0 };
  async function iniciarJurado() {
    if (!diapos.length) { aviso("Primero abre tu presentación."); return; }
    if (Config.faltaClave()) { abrirIA(); return; }
    const n = +$("selPreg").value || 5, rigor = $("selRigor").value;
    estadoOrbe("pensando", "Preparando las preguntas del jurado…");
    $("btnJurado").disabled = true;
    try {
      const d = await pedir("preguntas_jurado", "Preguntas de un jurado de sustentación sobre las diapositivas.",
        { type: "object", properties: { preguntas: { type: "array", items: { type: "object", properties: {
          pregunta: { type: "string" }, diapositiva: { type: "integer", description: "Número de la diapositiva a la que se refiere" },
          tipo: { type: "string", enum: ["metodologia", "resultados", "teoria", "aporte", "limitaciones", "coherencia"] },
          esperado: { type: "array", items: { type: "string" }, description: "Puntos clave que debería tener una buena respuesta" }
        }, required: ["pregunta", "diapositiva", "esperado"] } } }, required: ["preguntas"] },
        `Eres un jurado ${rigor}. Formula ${n} preguntas distintas, de las que de verdad hace un jurado, basadas en estas diapositivas y notas del orador. Combina tipos: metodología, resultados, aporte, limitaciones y coherencia. Una pregunta por idea, sin preguntas dobles.

${diapos.map(x => `[${x.n}] ${x.titulo}\n${x.cuerpo.join(" · ")}${x.notas ? "\nNotas: " + x.notas.slice(0, 700) : ""}`).join("\n\n")}`);
      J.preguntas = (d.preguntas || []).slice(0, n); J.k = 0; J.resultados = [];
      $("juradoInicio").classList.add("oculto"); $("juradoResumen").innerHTML = "";
      mostrarPregunta();
    } catch (e) { aviso(e.message); estadoOrbe("reposo", "Listo"); }
    $("btnJurado").disabled = false;
  }
  function mostrarPregunta() {
    const q = J.preguntas[J.k];
    const c = $("juradoPregunta"); c.innerHTML = ""; c.classList.remove("oculto");
    if (!q) return resumenJurado();
    J.respuesta = ""; J.inicio = 0;
    if (q.diapositiva) irA(q.diapositiva);
    c.appendChild(el("small", "inv-sub", `Pregunta ${J.k + 1} de ${J.preguntas.length}${q.diapositiva ? " · diapositiva " + q.diapositiva : ""}`));
    c.appendChild(el("p", "pregunta-jurado", q.pregunta));
    const ta = el("textarea", "ajuste"); ta.rows = 5; ta.placeholder = "Responde en voz alta con «Responder por voz» o escribe aquí tu respuesta…"; ta.id = "txtRespuesta";
    c.appendChild(ta);
    const acc = el("div", "inv-acciones");
    const bV = el("button", "boton primario", "Responder por voz"); bV.id = "btnVozResp";
    bV.onclick = () => J.escuchando ? terminarRespuesta() : escucharRespuesta(ta, bV);
    const bE = el("button", "boton secundario", "Evaluar mi respuesta"); bE.onclick = () => evaluar(ta.value);
    const bR = el("button", "enlace-sutil", "Repetir la pregunta"); bR.onclick = () => hablar(q.pregunta);
    const bS = el("button", "enlace-sutil", "Saltar"); bS.onclick = () => { J.resultados.push({ q, saltada: true }); J.k++; mostrarPregunta(); };
    acc.append(bV, bE, bR, bS); c.appendChild(acc);
    estadoOrbe("reposo", "El jurado pregunta");
    hablar(q.pregunta);
  }
  function escucharRespuesta(ta, b) {
    Voz.callar();
    J.escuchando = true; J.inicio = J.inicio || performance.now();
    b.textContent = "Terminé"; estadoOrbe("escuchando", "Te escucho… pulsa «Terminé» al acabar");
    const base = ta.value.trim();
    let acum = "";
    Voz.iniciar({
      idioma: Config.get().idioma || "es-CO", continuo: true,
      parcial: (t) => { ta.value = [base, acum, t].filter(Boolean).join(" "); },
      final: (t) => { acum = [acum, t].filter(Boolean).join(" "); ta.value = [base, acum].filter(Boolean).join(" "); },
      error: (codigo) => { J.escuchando = false; b.textContent = "Responder por voz"; estadoOrbe("reposo", ""); aviso(codigo === "sin-transcriptor" ? "Para escucharte necesito una IA con audio (Gemini). Mientras tanto, escribe tu respuesta." : "No pude usar el micrófono (" + codigo + "). Escribe tu respuesta."); },
      estado: () => {}
    });
  }
  function terminarRespuesta() {
    J.escuchando = false;
    try { Voz.detenerEscucha(false); } catch (e) { /* ya detenido */ }
    const b = $("btnVozResp"); if (b) b.textContent = "Responder por voz";
    setTimeout(() => { const ta = $("txtRespuesta"); if (ta && ta.value.trim()) evaluar(ta.value); }, 900);
  }
  async function evaluar(respuesta) {
    const q = J.preguntas[J.k];
    if (!String(respuesta || "").trim()) { aviso("Responde primero (por voz o escribiendo)."); return; }
    if (J.escuchando) terminarRespuesta();
    aviso("");
    const seg = J.inicio ? (performance.now() - J.inicio) / 1000 : 0;
    estadoOrbe("pensando", "El jurado evalúa tu respuesta…");
    try {
      const d = await pedir("evaluar_respuesta", "Evaluación de una respuesta oral de sustentación.",
        { type: "object", properties: {
          claridad: { type: "integer", minimum: 1, maximum: 5 }, fundamento: { type: "integer", minimum: 1, maximum: 5 }, precision: { type: "integer", minimum: 1, maximum: 5 },
          bien: { type: "string", description: "Lo que hizo bien, en una frase" }, falto: { type: "array", items: { type: "string" }, description: "Lo que faltó o sobró" },
          mejor_respuesta: { type: "string", description: "Cómo respondería un estudiante bien preparado, en 3 a 5 frases y en primera persona, usando solo lo que está en las diapositivas" },
          comentario_oral: { type: "string", description: "Retroalimentación breve para decir en voz alta (máx. 25 palabras)" }
        }, required: ["claridad", "fundamento", "precision", "falto", "mejor_respuesta", "comentario_oral"] },
        `Pregunta del jurado: ${q.pregunta}
Puntos esperados: ${(q.esperado || []).join("; ")}
Diapositiva relacionada: ${q.diapositiva ? (diapos[q.diapositiva - 1] || {}).titulo + " — " + ((diapos[q.diapositiva - 1] || {}).cuerpo || []).join(" · ") : ""}
Respuesta del estudiante (transcrita de su voz, puede tener errores de transcripción que no debes penalizar):
«${respuesta}»`);
      const prom = (d.claridad + d.fundamento + d.precision) / 3;
      J.resultados.push({ q, d, prom, seg, respuesta });
      const c = $("juradoPregunta");
      const box = el("div", "eval-jurado");
      const notas = el("div", "notas-jurado");
      [["Claridad", d.claridad], ["Fundamento", d.fundamento], ["Precisión", d.precision]].forEach(([t, v]) => { const x = el("span", v >= 4 ? "ok" : v >= 3 ? "medio" : "mal"); x.append(el("b", "", v + "/5"), el("small", "", t)); notas.appendChild(x); });
      box.appendChild(notas);
      if (d.bien) box.appendChild(el("p", "", "✓ " + d.bien));
      if ((d.falto || []).length) { const ul = el("ul", "guia-puntos"); d.falto.forEach(x => ul.appendChild(el("li", "", x))); box.appendChild(ul); }
      if (seg > 150) box.appendChild(el("p", "inv-nota", `Tu respuesta duró ${mmss(seg)}: intenta responder en 1 a 2 minutos, empezando por la idea central.`));
      const m = el("details", "apa-cat"); m.appendChild(el("summary", "", "Una respuesta más sólida")); m.appendChild(el("p", "", d.mejor_respuesta)); box.appendChild(m);
      const sig = el("button", "boton primario", J.k + 1 < J.preguntas.length ? "Siguiente pregunta" : "Ver resultados");
      sig.onclick = () => { J.k++; mostrarPregunta(); };
      box.appendChild(sig);
      c.appendChild(box);
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
      await hablar(d.comentario_oral);
      estadoOrbe("reposo", "Evaluación lista");
    } catch (e) { aviso(e.message); estadoOrbe("reposo", ""); }
  }
  function resumenJurado() {
    $("juradoPregunta").classList.add("oculto");
    const c = $("juradoResumen"); c.innerHTML = "";
    const res = J.resultados.filter(r => r.d);
    const prom = res.length ? res.reduce((a, r) => a + r.prom, 0) / res.length : 0;
    const pun = el("div", "inv-puntaje"); pun.append(el("b", "", prom ? prom.toFixed(1).replace(".", ",") : "—"), el("span", "", `/5 promedio · ${res.length} de ${J.preguntas.length} respondidas`)); c.appendChild(pun);
    const debiles = res.filter(r => r.prom < 3.5).map(r => r.q);
    const tb = el("table", "tabla-mini");
    const tr0 = el("tr"); ["Pregunta", "Nota"].forEach(x => tr0.appendChild(el("th", "", x))); tb.appendChild(tr0);
    J.resultados.forEach(r => { const tr = el("tr"); tr.append(el("td", "", r.q.pregunta), el("td", r.saltada ? "mal" : r.prom >= 4 ? "ok" : r.prom >= 3 ? "medio" : "mal", r.saltada ? "Saltada" : r.prom.toFixed(1).replace(".", ","))); tb.appendChild(tr); });
    c.appendChild(tb);
    if (debiles.length) { c.appendChild(el("div", "inv-sub", "Repasa antes de sustentar")); const ul = el("ul", "guia-puntos"); debiles.forEach(q => ul.appendChild(el("li", "", `${q.pregunta}${q.diapositiva ? " (diapositiva " + q.diapositiva + ")" : ""}`))); c.appendChild(ul); }
    const otra = el("button", "boton primario", "Otro simulacro"); otra.onclick = () => { c.innerHTML = ""; $("juradoInicio").classList.remove("oculto"); };
    c.appendChild(otra);
    hablar(prom ? `Terminamos. Tu promedio es ${prom.toFixed(1).replace(".", ",")} sobre 5.${debiles.length ? " Repasa las preguntas marcadas." : " ¡Vas muy bien preparado!"}` : "Terminamos el simulacro.");
    estadoOrbe("reposo", "Simulacro terminado");
  }

  /* ================= Interfaz ================= */
  function irPestana(n) {
    document.querySelectorAll("[data-pestana]").forEach(x => x.classList.toggle("fuera-pestana", x.dataset.pestana !== n));
    document.querySelectorAll(".pestana").forEach(b => b.setAttribute("aria-selected", b.dataset.ir === n ? "true" : "false"));
    try { Config.set({ pestanaPpt: n }); } catch (e) { /* opcional */ }
  }
  function aplicarTema() {
    const t = Config.get().tema || "auto";
    let oscuro = t === "oscuro" || (t === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    try { const th = Office.context.officeTheme; if (t === "auto" && th && th.bodyBackgroundColor) { const h = th.bodyBackgroundColor.replace("#", ""); oscuro = (parseInt(h.slice(0, 2), 16) * 299 + parseInt(h.slice(2, 4), 16) * 587 + parseInt(h.slice(4, 6), 16) * 114) / 1000 < 110; } } catch (e) { /* sin tema */ }
    document.documentElement.dataset.tema = oscuro ? "oscuro" : "claro";
  }
  function chipIA() { const p = Config.perfil(); $("iaPpt").textContent = Config.faltaClave() ? "Sin IA (el jurado necesita una)" : `${p.nombre} · ${p.modelo}`; $("iaPpt").classList.toggle("sin-clave", Config.faltaClave()); }
  function abrirIA() { $("hojaIA").classList.remove("oculto"); $("inpClavePpt").focus(); }
  function conectar() {
    const clave = $("inpClavePpt").value.trim();
    if (clave.length < 20) { $("notaClave").textContent = "Pega la clave completa (empieza por AIza…)."; return; }
    const c = Config.get();
    let p = c.perfiles.find(x => x.proveedor === "gemini");
    if (!p) { p = Config.nuevoPerfil("gemini"); c.perfiles.push(p); }
    p.apiKey = clave; if (!p.modelo) p.modelo = "gemini-flash-latest";
    c.perfilActivo = p.id; Config.guardar();
    chipIA(); $("hojaIA").classList.add("oculto"); hablar("Listo, ya estoy conectado.");
  }

  const ACCIONES = { Ensayo: () => irPestana("ensayo"), Revision: () => { irPestana("revision"); revisar(); }, Jurado: () => irPestana("jurado") };
  function registrarCinta() {
    if (!(window.Office && Office.actions && Office.actions.associate)) return;
    Object.keys(ACCIONES).forEach(k => { try { Office.actions.associate("romusPpt" + k, async (ev) => { try { if (Office.addin && Office.addin.showAsTaskpane) await Office.addin.showAsTaskpane(); } catch (e) { /* visible */ } ev.completed(); ACCIONES[k](); }); } catch (e) { /* ya registrada */ } });
  }

  function iniciar(info) {
    enOffice = !!(info && info.host);
    aplicarTema(); chipIA();
    try { orbe = window.crearOrbe ? crearOrbe($("orbePpt")) : null; } catch (e) { orbe = null; }
    Voz.cargarVoces && Voz.cargarVoces();
    Voz.setManejadorHablando && Voz.setManejadorHablando((h) => estadoOrbe(h ? "hablando" : (J.escuchando ? "escuchando" : "reposo")));
    document.querySelectorAll(".pestana").forEach(b => b.addEventListener("click", () => irPestana(b.dataset.ir)));
    irPestana(Config.get().pestanaPpt || "ensayo");
    $("selMinutos").value = String(Config.get().minutosSustentacion || 20);
    $("selMinutos").onchange = () => { Config.set({ minutosSustentacion: +$("selMinutos").value }); prepararEnsayo(); revisar(); };
    $("btnPlay").onclick = alternar; $("btnAnt").onclick = () => cambiar(E.idx - 1); $("btnSig").onclick = () => cambiar(E.idx + 1);
    $("btnTerminar").onclick = terminar;
    $("btnLeerNotas").onclick = () => { const b = $("btnLeerNotas"); if (b.dataset.leyendo === "1") { Voz.callar(); b.dataset.leyendo = ""; b.textContent = "Leer en voz alta"; return; } b.dataset.leyendo = "1"; b.textContent = "Detener lectura"; hablar(diapos[E.idx] && diapos[E.idx].notas).then(() => { b.dataset.leyendo = ""; b.textContent = "Leer en voz alta"; }); };
    $("btnRecargar").onclick = () => cargar();
    $("btnTema").onclick = () => { const o = document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro"; Config.set({ tema: o }); aplicarTema(); };
    $("btnAjustesPpt").onclick = abrirIA; $("btnCerrarIA").onclick = () => $("hojaIA").classList.add("oculto");
    $("btnGuardarClave").onclick = conectar; $("btnJurado").onclick = iniciarJurado;
    document.addEventListener("keydown", (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); cambiar(E.idx + 1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); cambiar(E.idx - 1); }
      if (e.key === " ") { e.preventDefault(); alternar(); }
    });
    // Si cambias de diapositiva en PowerPoint, el ensayo te sigue
    if (enOffice) {
      try { Office.context.document.addHandlerAsync(Office.EventType.DocumentSelectionChanged, async () => { const i = await actual(); if (i && i - 1 !== E.idx) cambiar(i - 1, true); }); } catch (e) { /* sin evento */ }
      registrarCinta();
      cargar();
    } else aviso("Esta página funciona dentro de PowerPoint: abre la pestaña «Romus» en PowerPoint.");
  }
  if (window.Office && Office.onReady) Office.onReady(iniciar); else document.addEventListener("DOMContentLoaded", () => iniciar(null));

  return { cargar, leerPresentacion, revisar, iniciarJurado, evaluar, terminar, alternar, cambiar, get diapos() { return diapos; }, _E: E, _J: J };
})();
