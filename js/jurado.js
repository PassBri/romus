/* Romus · Lo que lo hace insustituible:
   1) Simulacro de sustentación por voz: Romus hace de jurado, pregunta en voz alta sobre TU documento,
      escucha tu respuesta, la evalúa con criterios y al final te dice qué preparar.
   2) Verificador de citas y referencias: cruza las citas del texto con la lista de referencias,
      revisa el formato APA 7 y comprueba en OpenAlex que cada fuente exista de verdad
      (las IA inventan referencias; Romus las caza). */
window.Jurado = (function () {
  const H = () => Inv._h;
  const $ = (id) => document.getElementById(id);
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

  /* =====================================================================
     1. SIMULACRO DE SUSTENTACIÓN
     ===================================================================== */
  let sim = null; // { preguntas, i, buffer, inicio, evaluaciones, reloj, estado: "pregunta"|"evaluada" }

  const TIPOS = { metodologia: "Metodología", aporte: "Aporte", coherencia: "Coherencia", teoria: "Marco teórico", resultados: "Resultados", limitaciones: "Limitaciones", etica: "Ética", pertinencia: "Pertinencia" };

  function activo() { return !!sim; }

  async function iniciar(cantidad) {
    const { documentoNumerado, pedirHerramienta, registrar } = H();
    const doc = await documentoNumerado();
    if (doc.parrafos.filter(p => p.texto.trim()).length < 4) throw new Error("Para el simulacro necesito tu proyecto o tesis en el documento: escribe al menos el problema, los objetivos y la metodología.");
    const n = Inv.nivel(), e = Inv.enfoque();
    const d = await pedirHerramienta("preguntas_jurado",
      "Prepara las preguntas de un jurado de sustentación sobre el documento.",
      { type: "object", properties: {
        preguntas: { type: "array", items: { type: "object", properties: {
          pregunta: { type: "string", description: "Pregunta como la haría un jurado en voz alta, una sola idea, máximo 35 palabras" },
          tipo: { type: "string", enum: Object.keys(TIPOS) },
          criterios: { type: "array", items: { type: "string" }, description: "2 a 4 elementos que una buena respuesta debe incluir" },
          parrafo: { type: "integer", description: "Párrafo [n] del documento al que se refiere, o -1" }
        }, required: ["pregunta", "tipo", "criterios"] } }
      }, required: ["preguntas"] },
      `Eres un jurado exigente pero justo de una sustentación de ${n.producto} (${n.nombre}, enfoque ${e.nombre.toLowerCase()}).
Haz ${cantidad} preguntas variadas y ESPECÍFICAS sobre este documento (no genéricas): coherencia entre problema, objetivos y método; decisiones metodológicas; aporte; limitaciones; y lo que un jurado de ${n.nombre} suele exigir. Ordénalas de la más sencilla a la más difícil.

DOCUMENTO:
${doc.texto}`);
    sim = { preguntas: (d.preguntas || []).slice(0, cantidad), i: 0, buffer: [], evaluaciones: [], estado: "pregunta", inicio: 0, reloj: null };
    if (!sim.preguntas.length) { sim = null; throw new Error("La IA no devolvió preguntas. Intenta de nuevo."); }
    registrar("Simulacro de sustentación", `${sim.preguntas.length} preguntas · ${n.nombre}`, "modelo");
    H().ui.agregarMensaje("ia", `Simulacro de sustentación: ${sim.preguntas.length} preguntas. Responde con tu voz o escribiendo. Cuando termines cada respuesta di «terminé». Para salir di «salir del simulacro».`);
    preguntar();
  }

  function preguntar() {
    const { tarjeta, el } = H();
    const q = sim.preguntas[sim.i];
    sim.buffer = []; sim.estado = "pregunta"; sim.inicio = Date.now();
    const c = el("div", "inv-cuerpo jurado");
    const cab = el("div", "jurado-cab");
    cab.append(el("span", "jurado-tipo", TIPOS[q.tipo] || "Pregunta"), el("span", "jurado-num", `Pregunta ${sim.i + 1} de ${sim.preguntas.length}`));
    c.appendChild(cab);
    c.appendChild(el("p", "jurado-pregunta", q.pregunta));
    const resp = el("div", "jurado-respuesta"); resp.id = "juradoRespuesta";
    resp.appendChild(el("span", "jurado-espera", "Tu respuesta aparecerá aquí mientras hablas…"));
    c.appendChild(resp);
    const reloj = el("div", "jurado-reloj"); reloj.id = "juradoReloj"; reloj.textContent = "0:00"; c.appendChild(reloj);
    const acc = el("div", "inv-acciones");
    const bT = el("button", "boton primario", "Terminé mi respuesta"); bT.onclick = () => H().ejecutar(evaluar);
    const bR = el("button", "boton secundario", "Repetir"); bR.onclick = () => H().ui.hablar(q.pregunta);
    const bS = el("button", "boton secundario", "Salir"); bS.onclick = () => salir();
    acc.append(bT, bR, bS); c.appendChild(acc);
    tarjeta("Simulacro de sustentación", c);
    clearInterval(sim.reloj);
    sim.reloj = setInterval(() => {
      const r = $("juradoReloj"); if (!r || !sim) return;
      const s = Math.floor((Date.now() - sim.inicio) / 1000);
      r.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      r.classList.toggle("largo", s > 180);
    }, 1000);
    H().ui.hablar(`Pregunta ${sim.i + 1}. ${q.pregunta}`);
  }

  function pintarRespuesta() {
    const r = $("juradoRespuesta"); if (!r) return;
    r.textContent = sim.buffer.join(" ");
  }

  /** Recibe lo que dice o escribe el usuario mientras el simulacro está activo. Devuelve true si lo manejó. */
  async function recibir(texto) {
    if (!sim) return false;
    const limpio = texto.replace(/^\s*(ok|okey|oye|hola)?[\s,]*r[oó]mus[\s,.:]*/i, "").trim();
    const n = norm(limpio).replace(/[.,;:!?¡¿]/g, "").trim();
    if (/^(salir|sal|termina|terminar|cancela|cancelar|cierra|detener|deten)( del| el)? simulacro$/.test(n)) { salir(); return true; }
    if (/^(repite|repitela|repite la pregunta|otra vez la pregunta|no escuche)$/.test(n)) { H().ui.hablar(sim.preguntas[sim.i].pregunta); return true; }
    if (sim.estado === "evaluada") {
      if (/^(siguiente|siguiente pregunta|continua|continuar|otra|dale|listo|sigamos)$/.test(n)) { siguiente(); return true; }
      return true; // entre preguntas no se acumula texto
    }
    if (/^(termine|ya termine|listo|eso es todo|es todo|siguiente|siguiente pregunta|he terminado|fin de la respuesta)$/.test(n)) {
      await H().ejecutar(evaluar); return true;
    }
    if (/^(salta|saltar|paso|pasa|no se|siguiente sin responder)$/.test(n)) { sim.buffer = ["(sin respuesta)"]; await H().ejecutar(evaluar); return true; }
    // Termina la respuesta si la frase acaba en «terminé».
    const fin = limpio.match(/^(.*?)[\s,.]*(ya )?termin[eé]\.?$/i);
    sim.buffer.push(fin ? fin[1] : limpio);
    pintarRespuesta();
    if (fin) await H().ejecutar(evaluar);
    return true;
  }

  async function evaluar() {
    if (!sim || sim.estado !== "pregunta") return;
    const { pedirHerramienta, tarjeta, el } = H();
    const q = sim.preguntas[sim.i];
    const respuesta = sim.buffer.join(" ").trim() || "(sin respuesta)";
    const segundos = Math.round((Date.now() - sim.inicio) / 1000);
    clearInterval(sim.reloj);
    sim.estado = "evaluando";
    let d;
    try { d = await pedirHerramienta("evaluar_respuesta", "Evalúa la respuesta del estudiante como jurado.",
      { type: "object", properties: {
        puntaje: { type: "integer", description: "1 = no responde, 2 = débil, 3 = aceptable, 4 = buena, 5 = excelente" },
        cumplidos: { type: "array", items: { type: "string" }, description: "Criterios que sí cubrió" },
        faltantes: { type: "array", items: { type: "string" }, description: "Criterios que faltaron" },
        retroalimentacion: { type: "string", description: "2 o 3 frases como las diría un jurado amable y exigente" },
        respuesta_sugerida: { type: "string", description: "Cómo podría responderla mejor, en 2 a 4 frases, usando su propio proyecto" }
      }, required: ["puntaje", "retroalimentacion", "respuesta_sugerida"] },
      `Nivel: ${Inv.nivel().nombre}.\nPregunta del jurado: «${q.pregunta}»\nCriterios de una buena respuesta: ${q.criterios.join("; ")}\nRespuesta oral del estudiante (transcrita, puede tener errores de transcripción): «${respuesta}»\nDuración: ${segundos} s.`); } catch (e) { if (sim) sim.estado = "pregunta"; throw e; }
    if (!sim) return;
    const puntaje = Math.max(1, Math.min(5, d.puntaje || 1));
    sim.evaluaciones.push({ pregunta: q.pregunta, tipo: q.tipo, respuesta, puntaje, segundos, faltantes: d.faltantes || [], sugerida: d.respuesta_sugerida });
    sim.estado = "evaluada";
    const c = el("div", "inv-cuerpo jurado");
    const cab = el("div", "jurado-cab");
    cab.append(el("span", "jurado-tipo", TIPOS[q.tipo] || "Pregunta"), el("span", "jurado-num", `Pregunta ${sim.i + 1} de ${sim.preguntas.length} · ${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`));
    c.appendChild(cab);
    c.appendChild(el("p", "jurado-pregunta chica", q.pregunta));
    const est = el("div", "jurado-estrellas"); est.textContent = "★".repeat(puntaje) + "☆".repeat(5 - puntaje); est.title = puntaje + " de 5"; c.appendChild(est);
    c.appendChild(H().etiqueta("modelo", "jurado simulado"));
    c.appendChild(el("p", "guia-resumen", d.retroalimentacion));
    if ((d.faltantes || []).length) { const f = el("div", "guia-caja error"); f.appendChild(el("b", "", "Te faltó")); f.appendChild(el("span", "", d.faltantes.join(" · "))); c.appendChild(f); }
    const s = el("div", "guia-caja ejemplo"); s.appendChild(el("b", "", "Una respuesta más sólida")); s.appendChild(el("span", "", d.respuesta_sugerida)); c.appendChild(s);
    const acc = el("div", "inv-acciones");
    const ultima = sim.i + 1 >= sim.preguntas.length;
    const b = el("button", "boton primario", ultima ? "Ver resultado final" : "Siguiente pregunta →"); b.onclick = () => siguiente();
    const bS = el("button", "boton secundario", "Salir"); bS.onclick = () => salir();
    acc.append(b, bS); c.appendChild(acc);
    tarjeta("Simulacro de sustentación", c);
    H().ui.hablar(`${puntaje} de 5. ${d.retroalimentacion} ${ultima ? "Di «siguiente» para ver tu resultado." : "Di «siguiente» cuando estés listo."}`);
  }

  function siguiente() {
    if (!sim) return;
    if (sim.i + 1 < sim.preguntas.length) { sim.i++; preguntar(); return; }
    resumen();
  }

  function resumen() {
    const { tarjeta, el, registrar } = H();
    const ev = sim.evaluaciones;
    const prom = ev.length ? ev.reduce((a, x) => a + x.puntaje, 0) / ev.length : 0;
    const nota = Math.round(prom / 5 * 100);
    const c = el("div", "inv-cuerpo jurado");
    const pun = el("div", "inv-puntaje"); pun.append(el("b", "", nota), el("span", "", "/100 · preparación para la sustentación")); c.appendChild(pun);
    c.appendChild(H().etiqueta("rubrica", "promedio de las respuestas"));
    const lista = el("div", "jurado-lista");
    ev.forEach((x, k) => {
      const f = el("details", "inv-criterio");
      const s = el("summary"); s.appendChild(el("span", "", `${k + 1}. ${TIPOS[x.tipo] || "Pregunta"}`));
      s.appendChild(el("span", "jurado-mini", "★".repeat(x.puntaje) + "☆".repeat(5 - x.puntaje)));
      f.appendChild(s);
      f.appendChild(el("p", "inv-nota", x.pregunta));
      if (x.faltantes.length) f.appendChild(el("p", "inv-nota", "Preparar: " + x.faltantes.join(" · ")));
      lista.appendChild(f);
    });
    c.appendChild(lista);
    const debiles = ev.filter(x => x.puntaje <= 3);
    if (debiles.length) c.appendChild(el("p", "inv-nota", "Repasa antes de la sustentación: " + Array.from(new Set(debiles.map(x => TIPOS[x.tipo] || x.tipo))).join(", ").toLowerCase() + "."));
    const acc = el("div", "inv-acciones");
    const bOtra = el("button", "boton primario", "Otro simulacro"); bOtra.onclick = () => { sim = null; H().ejecutar(() => iniciar(5)); };
    acc.appendChild(bOtra); c.appendChild(acc);
    tarjeta("Resultado del simulacro", c);
    registrar("Resultado del simulacro", `${nota}/100`, "rubrica");
    H().ui.hablar(`Terminamos. Tu preparación es de ${nota} sobre 100. ${debiles.length ? "Repasa sobre todo " + (TIPOS[debiles[0].tipo] || "").toLowerCase() + "." : "Vas muy bien preparado."}`);
    clearInterval(sim.reloj);
    sim = null;
  }

  function salir() {
    if (!sim) return;
    clearInterval(sim.reloj);
    const habia = sim.evaluaciones.length;
    sim = null;
    $("invResultado").classList.add("oculto");
    H().ui.agregarMensaje("ia", habia ? `Simulacro detenido después de ${habia} ${habia === 1 ? "pregunta" : "preguntas"}.` : "Simulacro cancelado.");
  }

  /* =====================================================================
     2. VERIFICADOR DE CITAS Y REFERENCIAS
     ===================================================================== */

  const RE_TITULO_REF = /^\s*(referencias|referencias bibliogr[aá]ficas|bibliograf[ií]a|lista de referencias|obras citadas|fuentes)\s*$/i;
  const primera = (t) => norm(String(t || "").split(/,| y | & | et al/)[0]).split(" ")[0].replace(/[^a-zñ-]/g, "");

  /** Citas dentro del texto: [{autor, anio, texto, parrafo}] */
  function extraerCitas(parrafos, desde, hasta) {
    const citas = [];
    parrafos.forEach(p => {
      if (p.i >= desde && p.i <= hasta) return; // la lista de referencias no cuenta
      const t = p.texto;
      // Parentéticas: (Pérez, 2020; Gómez y Ruiz, 2019, p. 4)
      (t.match(/\(([^()]*?\b(1[89]\d{2}|20\d{2})[a-z]?[^()]*?)\)/g) || []).forEach(grupo => {
        grupo.slice(1, -1).split(";").forEach(parte => {
          const m = parte.trim().match(/^(?:v[ée]ase\s+|cf\.\s+|como se cit[oó] en\s+)?([A-ZÁÉÍÓÚÑ][^,()]*?),\s*((?:1[89]|20)\d{2}[a-z]?|s\.\s?f\.)/);
          if (m && /[a-záéíóúñ]/i.test(m[1])) citas.push({ autor: m[1].trim(), anio: m[2].replace(/\s/g, ""), texto: parte.trim(), parrafo: p.i });
        });
      });
      // Narrativas: Pérez (2020), Gómez y Ruiz (2019), Hernández Sampieri et al. (2014)
      const re = /([A-ZÁÉÍÓÚÑ][\wáéíóúñü'-]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñü'-]+)?(?:\s+(?:y|&)\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñü'-]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñü'-]+)?|\s+et al\.)?)\s+\(((?:1[89]|20)\d{2}[a-z]?)(?:,\s*pp?\.\s*[\d-]+)?\)/g;
      let m;
      while ((m = re.exec(t))) {
        if (/^(En|El|La|Los|Las|Del|Al|Según|Segun|Como|Para|Desde|Durante|Entre|Hasta|Año|Desde)$/.test(m[1].split(" ")[0])) continue;
        citas.push({ autor: m[1], anio: m[2], texto: m[0], parrafo: p.i });
      }
    });
    return citas;
  }

  function extraerReferencias(parrafos) {
    let ini = -1;
    parrafos.forEach(p => { if (RE_TITULO_REF.test(p.texto)) ini = p.i; });
    if (ini < 0) return { ini: -1, fin: -1, refs: [] };
    const refs = [];
    let fin = ini;
    for (const p of parrafos.filter(x => x.i > ini)) {
      if (Doc.esTitulo(p.estilo) || /^(anexos?|ap[ée]ndices?)\b/i.test(p.texto.trim())) break;
      fin = p.i;
      if (!p.texto.trim()) continue;
      const t = p.texto.trim();
      const mAnio = t.match(/\(((?:1[89]|20)\d{2}[a-z]?|s\.\s?f\.)[^)]*\)/);
      const anio = mAnio ? mAnio[1] : "";
      const despues = mAnio ? t.slice(mAnio.index + mAnio[0].length).replace(/^\.?\s*/, "") : t;
      const titulo = (despues.match(/^(.+?[.?!])(\s|$)/) || [, despues])[1]
        .replace(/\s*\((?:\d+\.?ª?\s*ed\.?|[^)]*edici[oó]n[^)]*)\)/gi, "").replace(/[.]$/, "").trim();
      const doi = (t.match(/10\.\d{4,9}\/[^\s]+[^\s.,;]/) || [])[0] || "";
      refs.push({ i: p.i, texto: t, autor: t.split(/\(/)[0].trim(), primer: primera(t.split(/\(/)[0]), anio: anio.replace(/\s/g, ""), titulo, doi, problemas: [], estado: "" });
    }
    return { ini, fin, refs };
  }

  function formatoAPA(r, idiomaEs) {
    if (!r.anio) r.problemas.push("Falta el año entre paréntesis después de los autores.");
    if (/et al\./i.test(r.autor)) r.problemas.push("En la lista de referencias APA 7 no se usa «et al.»: escribe hasta 20 autores.");
    if (idiomaEs && / & /.test(r.autor)) r.problemas.push("En un documento en español, une los dos últimos autores con «y».");
    if (r.doi && !/https:\/\/doi\.org\//i.test(r.texto)) r.problemas.push("Escribe el DOI como enlace: https://doi.org/…");
    if (!r.titulo || r.titulo.length < 6) r.problemas.push("No identifico el título de la obra.");
  }

  const palabras = (t) => new Set(norm(t).replace(/[^a-zñ0-9 ]/g, " ").split(" ").filter(w => w.length > 2));
  function parecido(a, b) {
    const A = palabras(a), B = palabras(b);
    if (!A.size || !B.size) return 0;
    let c = 0; A.forEach(w => { if (B.has(w)) c++; });
    return c / Math.max(A.size, B.size);
  }

  async function existe(r) {
    const sel = "id,doi,display_name,publication_year,authorships";
    try {
      if (r.doi) {
        const x = await fetch("https://api.openalex.org/works/https://doi.org/" + encodeURIComponent(r.doi) + "?select=" + sel);
        if (x.ok) {
          const w = await x.json();
          const sim = parecido(r.titulo, w.display_name);
          return { estado: sim >= 0.5 ? "verificada" : "doi-distinto", obra: w, sim };
        }
        if (x.status === 404) return { estado: "doi-inexistente" };
      }
      if (!r.titulo) return { estado: "sin-dato" };
      const q = new URLSearchParams({ search: r.titulo.slice(0, 200), "per-page": "5", select: sel });
      const y = await fetch("https://api.openalex.org/works?" + q);
      if (!y.ok) return { estado: "sin-dato" };
      const j = await y.json();
      let mejor = null, max = 0;
      (j.results || []).forEach(w => { const s = parecido(r.titulo, w.display_name); if (s > max) { max = s; mejor = w; } });
      if (!mejor) return { estado: "no-encontrada" };
      const anioOk = !r.anio || !mejor.publication_year || Math.abs(parseInt(r.anio, 10) - mejor.publication_year) <= 1;
      const autorOk = !r.primer || (mejor.authorships || []).some(a => norm(a.author && a.author.display_name).includes(r.primer));
      if (max >= 0.8 && anioOk && autorOk) return { estado: "verificada", obra: mejor, sim: max };
      if (max >= 0.6) return { estado: "probable", obra: mejor, sim: max, anioOk, autorOk };
      return { estado: "no-encontrada", obra: mejor, sim: max };
    } catch (e) { return { estado: "sin-dato" }; }
  }

  const ESTADOS = {
    "verificada": ["ok", "Existe (OpenAlex)"],
    "probable": ["medio", "Coincide en parte: revisa año, autores o título"],
    "doi-distinto": ["bajo", "El DOI existe pero es de otra obra"],
    "doi-inexistente": ["bajo", "El DOI no existe"],
    "no-encontrada": ["bajo", "No la encontré: si la sugirió una IA, compruébala"],
    "sin-dato": ["medio", "No se pudo comprobar (sin conexión o sin título)"]
  };

  async function verificar() {
    const { documentoNumerado, tarjeta, el, etiqueta, registrar, irA } = H();
    const ui = H().ui;
    const doc = await documentoNumerado();
    const { ini, fin, refs } = extraerReferencias(doc.parrafos);
    const citas = extraerCitas(doc.parrafos, ini, fin < ini ? ini : fin);
    if (ini < 0 && !citas.length) throw new Error("No encontré citas ni una sección «Referencias» en el documento.");
    const es = !/\b(the|and|of)\b/i.test(doc.parrafos.slice(0, 40).map(p => p.texto).join(" ")) || true;

    // 1) Cruce citas ↔ referencias (por primer apellido y año)
    const clave = (a, y) => primera(a) + "|" + String(y).replace(/[a-z]$/, "");
    const enLista = new Set(refs.map(r => clave(r.autor, r.anio)));
    const citadas = new Set(citas.map(c => clave(c.autor, c.anio)));
    const huerfanas = []; const vistas = new Set();
    citas.forEach(c => { const k = clave(c.autor, c.anio); if (!enLista.has(k) && !vistas.has(k)) { vistas.add(k); huerfanas.push(c); } });
    const sinCitar = refs.filter(r => !citadas.has(clave(r.autor, r.anio)));
    // 2) Formato APA y orden alfabético
    refs.forEach(r => formatoAPA(r, es));
    refs.forEach((r, k) => { if (k && refs[k - 1].texto.localeCompare(r.texto, "es", { sensitivity: "base" }) > 0) r.problemas.push("Fuera del orden alfabético."); });
    // 3) Existencia real (OpenAlex), en serie para no saturar
    const max = Math.min(refs.length, 40);
    for (let k = 0; k < max; k++) {
      ui.ocupar(true, `Verificando referencias ${k + 1}/${max}…`);
      const r = refs[k];
      const x = await existe(r);
      r.estado = x.estado; r.obra = x.obra;
      await new Promise(res => setTimeout(res, 120));
    }
    // 4) Comentarios en Word
    const comentarios = [];
    huerfanas.forEach(c => comentarios.push({ parrafo: c.parrafo, fragmento: c.texto.length < 200 ? c.texto : "", comentario: `Romus · Esta cita (${c.autor}, ${c.anio}) no aparece en la lista de referencias.` }));
    refs.forEach(r => {
      const msgs = [];
      if (sinCitar.includes(r)) msgs.push("No se cita en el texto: APA 7 pide citar todo lo que va en la lista.");
      if (["no-encontrada", "doi-inexistente", "doi-distinto"].includes(r.estado)) msgs.push(ESTADOS[r.estado][1] + ".");
      if (r.estado === "probable" && r.obra) msgs.push(`Coincide en parte con «${r.obra.display_name}» (${r.obra.publication_year}).`);
      msgs.push(...r.problemas);
      if (msgs.length) comentarios.push({ parrafo: r.i, fragmento: "", comentario: "Romus · Referencia: " + msgs.join(" ") });
    });
    if (comentarios.length) await Doc.comentar(comentarios);

    // 5) Puntaje por reglas
    const verif = refs.filter(r => r.estado === "verificada").length;
    const chequeos = citas.length + refs.length * 3 || 1;
    const fallos = huerfanas.length + sinCitar.length + refs.reduce((a, r) => a + (r.problemas.length ? 1 : 0) + (["no-encontrada", "doi-inexistente", "doi-distinto"].includes(r.estado) ? 1 : 0), 0);
    const salud = Math.max(0, Math.round((1 - fallos / chequeos) * 100));
    registrar("Verificación de referencias", `${refs.length} referencias, ${verif} verificadas, ${huerfanas.length} citas sin referencia`, "fuente");

    const c = el("div", "inv-cuerpo verif");
    const pun = el("div", "inv-puntaje"); pun.append(el("b", "", salud), el("span", "", "/100 · salud de las referencias")); c.appendChild(pun);
    c.appendChild(etiqueta("fuente", "y reglas APA 7"));
    const res = el("div", "verif-resumen");
    [[refs.length, "referencias"], [verif, "existen"], [citas.length, "citas en el texto"], [huerfanas.length, "citas sin referencia"], [sinCitar.length, "referencias sin citar"]].forEach(([v, t]) => {
      const d = el("div", (t.includes("sin") && v) ? "alerta" : ""); d.append(el("b", "", v), el("span", "", t)); res.appendChild(d);
    });
    c.appendChild(res);
    if (huerfanas.length) {
      c.appendChild(el("div", "inv-sub", "Citas sin referencia"));
      huerfanas.forEach(h => { const b = el("button", "verif-fila bajo", `${h.autor}, ${h.anio}`); b.onclick = () => irA(h.parrafo); c.appendChild(b); });
    }
    if (refs.length) {
      c.appendChild(el("div", "inv-sub", "Referencias"));
      refs.forEach(r => {
        const [cls, txt] = ESTADOS[r.estado] || ["medio", "Sin comprobar (límite de 40)"];
        const peor = r.problemas.length || sinCitar.includes(r) ? (cls === "ok" ? "medio" : cls) : cls;
        const b = el("button", "verif-fila " + peor);
        b.appendChild(el("b", "", `${r.autor.slice(0, 60)}${r.autor.length > 60 ? "…" : ""} (${r.anio || "s. a."})`));
        const det = [txt].concat(sinCitar.includes(r) ? ["no se cita en el texto"] : []).concat(r.problemas.map(p => p.replace(/\.$/, "").toLowerCase()));
        b.appendChild(el("span", "", det.join(" · ")));
        b.onclick = () => irA(r.i);
        c.appendChild(b);
      });
    }
    if (ini < 0) c.appendChild(el("p", "inv-nota", "No encontré una sección titulada «Referencias». Agrégala con estilo de título para revisarla."));
    if (comentarios.length) c.appendChild(el("p", "inv-nota", `Dejé ${comentarios.length} ${comentarios.length === 1 ? "comentario" : "comentarios"} en el documento.`));
    c.appendChild(el("p", "inv-nota", "OpenAlex cubre más de 250 millones de trabajos académicos; algunos libros, normas y documentos locales pueden no estar."));
    // Existir no basta: el siguiente paso compara lo que el texto atribuye con lo que la fuente dice.
    if (window.Biblio && Biblio.citaFuente && verif && citas.length) {
      const caja = el("div", "guia-caja");
      caja.append(el("b", "", "Que existan no basta"), el("span", "", "Comprueba también que cada cita diga lo que tú le atribuyes: Romus compara tus frases con el resumen de cada fuente."));
      const bF = el("button", "boton secundario", "¿Mis citas dicen lo que les atribuyo?"); bF.onclick = () => H().ejecutar(Biblio.citaFuente);
      caja.appendChild(bF); c.appendChild(caja);
    }
    tarjeta("Verificador de citas y referencias", c);
    const noExisten = refs.filter(r => ["no-encontrada", "doi-inexistente", "doi-distinto"].includes(r.estado)).length;
    ui.hablar(`Revisé ${refs.length} referencias y ${citas.length} citas. ${verif} existen. ${noExisten ? noExisten + " no las pude encontrar. " : ""}${huerfanas.length ? huerfanas.length + " citas no tienen referencia. " : ""}${sinCitar.length ? sinCitar.length + " referencias no se citan." : ""}`);
  }

  /* ===================================================================== */

  function comando(n, original) {
    const tarea = (fn) => async () => { H().ui.ocupar(true, "Romus…"); try { await fn(); } catch (e) { H().ui.mostrarError(e); } finally { H().ui.ocupar(false); } };
    if (/^((inicia|empieza|haz|hagamos|quiero|activa|abre)( un| el)? )?(simulacro|simulacion|ensayo|practica)( de( la)?)? (sustentacion|defensa|jurado)( de (mi )?(tesis|proyecto|trabajo))?$|^(preparame|prepararme) para (la|mi) (sustentacion|defensa)$|^(hazme|haz) preguntas como (un )?jurado$/.test(n))
      return tarea(() => iniciar(/\b(rapido|corto|breve)\b/.test(n) ? 3 : 5));
    if (/^(verifica|revisa|comprueba|chequea|valida)( las| mis| todas las)? (referencias|citas|citas y referencias|referencias y citas|bibliografia|fuentes)$|^verificador( de referencias)?$/.test(n))
      return tarea(verificar);
    return null;
  }

  return { activo, iniciar, recibir, salir, verificar, comando, _extraerCitas: extraerCitas, _extraerReferencias: extraerReferencias, _formatoAPA: formatoAPA };
})();
