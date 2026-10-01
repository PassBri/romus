/* Romus · Modo investigación (método Kuetz).
   Acompaña proyectos de investigación de pregrado a posdoctorado dentro de Word:
   - Estructura por nivel (con guías como comentarios).
   - Ideación: de la idea a la pregunta, el problema y los objetivos.
   - Matriz de coherencia (problema → pregunta → objetivos → metodología → resultados) + conceptos sin cubrir.
   - Literatura real desde OpenAlex, citada en APA 7.
   - Autoevaluación con rúbrica: el puntaje lo calculan reglas fijas; la IA solo aporta evidencias que Romus verifica.
   - Trust Label en cada resultado y registro de uso de IA para la declaración del documento. */
window.Inv = (function () {
  const $ = (id) => document.getElementById(id);
  if (window.TEORIA && window.Guia) Guia.agregar(window.TEORIA); // biblioteca «Teoría» de Brian Suárez
  let ui = {}; // funciones del panel: agregarMensaje, hablar, confirmar, ocupar, mostrarError

  /* ================= Niveles y estructuras ================= */

  const GUIAS = {
    "Título": "Máximo 20 palabras. Debe nombrar el fenómeno, la población y el contexto. Evita «Estudio sobre…».",
    "Resumen": "150 a 250 palabras: problema, objetivo, método, resultados esperados y aporte. Se escribe al final.",
    "Resumen ejecutivo": "Una página: problema, solución propuesta, impacto, equipo y presupuesto. Pensado para evaluadores y financiadores.",
    "Introducción": "Presenta el tema, el vacío que motiva el estudio y cómo está organizado el documento.",
    "Planteamiento del problema": "Describe la situación problemática con datos y evidencia: qué pasa, a quién, dónde y desde cuándo. Termina en la pregunta.",
    "Descripción del problema": "Situación actual con evidencia (cifras, estudios, observaciones). Distingue el problema de sus causas y efectos.",
    "Contexto y necesidad": "Describe la organización o comunidad, la necesidad concreta y por qué requiere intervención.",
    "Problema y brecha de conocimiento": "No basta un problema práctico: muestra qué no se sabe todavía en la literatura y por qué importa resolverlo.",
    "Problema y relevancia": "Problema científico y su relevancia estratégica para la línea del grupo o la entidad anfitriona.",
    "Pregunta de investigación": "Una pregunta abierta, precisa e investigable con los recursos disponibles. Debe derivarse del problema.",
    "Preguntas e hipótesis": "Pregunta central y, si el enfoque es cuantitativo, hipótesis contrastables. En cualitativo, supuestos o preguntas orientadoras.",
    "Supuestos y preguntas orientadoras": "En la ruta cualitativa no se prueban hipótesis al inicio: se plantean supuestos y preguntas que orientan y pueden emerger o cambiar en el campo.",
    "Hipótesis o supuestos": "Hipótesis verificables (cuantitativo) o supuestos de trabajo (cualitativo). Deben responder a la pregunta.",
    "Justificación": "Argumenta con criterios: conveniencia, relevancia social, implicaciones prácticas, valor teórico y utilidad metodológica (Hernández Sampieri et al., 2014). Incluye viabilidad y qué deficiencias del conocimiento atiende.",
    "Objetivos": "Un objetivo general que responde a la pregunta y 3 o 4 específicos que, sumados, lo logran. Verbos en infinitivo y medibles.",
    "Objetivo general": "Uno solo. Responde directamente a la pregunta de investigación. Verbo en infinitivo (analizar, determinar, diseñar…).",
    "Objetivos específicos": "3 o 4 pasos que juntos logran el general. Evita verbos vagos como «conocer» o «entender».",
    "Marco referencial": "Antecedentes, teoría y conceptos que sustentan el estudio.",
    "Antecedentes": "Estudios de los últimos 5 a 10 años: autor, año, objetivo, método y hallazgo. Cierra con lo que aún falta.",
    "Estado del arte": "Revisión organizada por temas o tendencias, no un listado de resúmenes. Identifica la brecha.",
    "Estado del arte crítico": "Revisión sistemática o integrativa: tendencias, debates, vacíos y el lugar exacto donde se ubica tu aporte.",
    "Estado del arte y brecha": "Síntesis crítica de la frontera del conocimiento y la brecha que el proyecto cubrirá.",
    "Marco teórico": "Teorías y autores que explican el fenómeno. Define desde qué perspectiva lo miras.",
    "Marco teórico y posicionamiento epistemológico": "Teorías de base y desde qué paradigma investigas (positivista, interpretativo, crítico, complejo…), y por qué.",
    "Marco conceptual": "Definición operativa de los conceptos clave tal como los usarás en el estudio.",
    "Marco legal": "Normas que regulan el tema (leyes, decretos, políticas). Solo las pertinentes.",
    "Aporte original": "Qué conocimiento nuevo produce la tesis: teórico, metodológico o aplicado. Es lo que la hace doctoral.",
    "Propuesta de intervención": "Describe la solución: componentes, actividades, recursos y cómo se implementará.",
    "Metodología": "Cómo vas a lograr cada objetivo: enfoque, diseño, participantes, instrumentos, análisis y ética.",
    "Diseño metodológico": "Paradigma, enfoque, diseño, participantes o corpus, instrumentos y su validación, plan de análisis, rigor y ética.",
    "Enfoque y tipo de investigación": "Cuantitativo, cualitativo o mixto; y el tipo (descriptivo, correlacional, experimental, etnográfico, investigación-acción…).",
    "Población y muestra": "Quiénes participan, cuántos, cómo se seleccionan y con qué criterios de inclusión y exclusión.",
    "Técnicas e instrumentos": "Encuestas, entrevistas, pruebas, observación… y cómo se validan (juicio de expertos, pilotaje, confiabilidad).",
    "Variables o categorías": "Operacionaliza variables (definición, dimensión, indicador) o define categorías de análisis.",
    "Análisis de datos": "Técnicas estadísticas o de análisis cualitativo y el software que usarás.",
    "Validez y confiabilidad": "Cómo garantizas el rigor: validez de contenido, confiabilidad (alfa de Cronbach), triangulación, saturación.",
    "Procedimiento": "Fases del trabajo de campo en orden.",
    "Consideraciones éticas": "Consentimiento informado, confidencialidad, manejo de datos personales (Ley 1581 de 2012) y aval del comité de ética.",
    "Evaluación e indicadores": "Indicadores para medir si la intervención funcionó: línea base, meta y fuente de verificación.",
    "Resultados esperados": "Productos concretos que se obtendrán y a qué objetivo responde cada uno.",
    "Resultados esperados e impacto": "Productos de nuevo conocimiento, apropiación social y formación; impacto académico y social.",
    "Impacto y transferencia": "Cómo llegarán los resultados a la sociedad, la industria o la política pública.",
    "Plan de divulgación": "Artículos previstos (revistas objetivo), ponencias y productos de apropiación social.",
    "Trayectoria del investigador y del grupo": "Experiencia que garantiza la ejecución: publicaciones, proyectos y grupo de investigación.",
    "Plan de trabajo con la entidad anfitriona": "Actividades, mentor, productos y calendario acordados con la institución.",
    "Plan de financiación": "Convocatoria o fuente de financiación, montos y contrapartidas.",
    "Cronograma": "Tabla de actividades por mes o semana, alineada con los objetivos específicos.",
    "Presupuesto": "Rubros (personal, equipos, materiales, salidas de campo, publicación) con fuente de financiación.",
    "Alcance de la investigación": "Exploratorio, descriptivo, correlacional o explicativo. El alcance depende de cuánto se sabe del tema y define el tipo de hipótesis y de diseño (Hernández Sampieri et al., 2014).",
    "Hipótesis y variables": "Hipótesis de investigación, nula y alternativa según el alcance (descriptivas, correlacionales, de diferencia de grupos o causales). Cada variable con definición conceptual y definición operacional.",
    "Diseño de investigación": "Experimental (preexperimento, experimento puro o cuasiexperimento) o no experimental (transeccional o longitudinal). Justifica por qué ese diseño responde la pregunta.",
    "Muestra": "Delimita la población, el marco muestral y el tipo de muestra (probabilística o no probabilística). Si es probabilística, calcula el tamaño con nivel de confianza y error.",
    "Instrumentos: confiabilidad y validez": "Cada instrumento debe reportar confiabilidad (p. ej., alfa de Cronbach), validez de contenido, de criterio y de constructo, y objetividad.",
    "Análisis estadístico": "Estadística descriptiva por variable y pruebas inferenciales según el nivel de medición y las hipótesis. Indica el software.",
    "Paradigma y posicionamiento epistemológico": "Declara desde dónde conoces: interpretativo, crítico, sistémico o complejo. Para Martínez Miguélez, todo método está inserto en un paradigma y la observación depende del punto de vista del investigador.",
    "Diseño cualitativo": "Teoría fundamentada, etnográfico, narrativo, fenomenológico o investigación-acción. El diseño es flexible y emergente: explica cómo se ajustará en el campo.",
    "Participantes y muestreo cualitativo": "Muestra intencional (de casos tipo, expertos, bola de nieve, por conveniencia…). El tamaño se decide por saturación de categorías, no por cálculo estadístico.",
    "Técnicas de recolección": "Entrevista en profundidad, observación participante, grupos focales, documentos o historias de vida. Describe la inmersión inicial en el campo.",
    "Categorización y análisis": "Codificación abierta, axial y selectiva; estructuración de categorías, contrastación con la teoría y teorización. Indica el software (Atlas.ti, NVivo…).",
    "Rigor cualitativo": "Dependencia (consistencia), credibilidad, transferencia y confirmabilidad: triangulación, auditoría, descripción densa, chequeo con participantes y reflexividad del investigador.",
    "Diseño mixto": "Secuencial explicativo (CUAN → cual), secuencial exploratorio (CUAL → cuan), convergente o anidado. Justifica la prioridad y la secuencia de cada enfoque.",
    "Integración de resultados": "Cómo y en qué momento se integran los datos cuantitativos y cualitativos (metainferencias).",
    "Referencias": "En APA 7. Solo fuentes citadas en el texto. Romus puede buscar y citar literatura real: di «busca literatura sobre…»."
  };

  const NIVELES = {
    pregrado: {
      nombre: "Pregrado", producto: "Proyecto o trabajo de grado",
      secciones: [
        ["Título"], ["Planteamiento del problema", ["Descripción del problema", "Pregunta de investigación"]], ["Justificación"],
        ["Objetivos", ["Objetivo general", "Objetivos específicos"]],
        ["Marco referencial", ["Antecedentes", "Marco teórico", "Marco conceptual", "Marco legal"]],
        ["Metodología", ["Enfoque y tipo de investigación", "Población y muestra", "Técnicas e instrumentos", "Procedimiento", "Consideraciones éticas"]],
        ["Cronograma"], ["Presupuesto"], ["Referencias"]
      ]
    },
    especializacion: {
      nombre: "Especialización", producto: "Trabajo aplicado o de intervención",
      secciones: [
        ["Título"], ["Contexto y necesidad"], ["Justificación"], ["Objetivos", ["Objetivo general", "Objetivos específicos"]],
        ["Marco referencial", ["Antecedentes", "Marco teórico", "Marco legal"]],
        ["Propuesta de intervención"], ["Metodología", ["Enfoque y tipo de investigación", "Población y muestra", "Técnicas e instrumentos", "Evaluación e indicadores"]],
        ["Resultados esperados"], ["Cronograma"], ["Presupuesto"], ["Referencias"]
      ]
    },
    maestria: {
      nombre: "Maestría", producto: "Tesis de investigación o de profundización",
      secciones: [
        ["Título"], ["Resumen"], ["Planteamiento del problema", ["Descripción del problema", "Pregunta de investigación"]], ["Justificación"],
        ["Objetivos", ["Objetivo general", "Objetivos específicos"]], ["Estado del arte"], ["Marco teórico"], ["Hipótesis o supuestos"],
        ["Metodología", ["Enfoque y tipo de investigación", "Población y muestra", "Variables o categorías", "Técnicas e instrumentos", "Validez y confiabilidad", "Análisis de datos", "Consideraciones éticas"]],
        ["Resultados esperados e impacto"], ["Cronograma"], ["Presupuesto"], ["Referencias"]
      ]
    },
    doctorado: {
      nombre: "Doctorado", producto: "Proyecto de tesis doctoral",
      secciones: [
        ["Título"], ["Resumen"], ["Introducción"], ["Problema y brecha de conocimiento"], ["Preguntas e hipótesis"],
        ["Objetivos", ["Objetivo general", "Objetivos específicos"]], ["Estado del arte crítico"], ["Marco teórico y posicionamiento epistemológico"],
        ["Aporte original"],
        ["Diseño metodológico", ["Enfoque y tipo de investigación", "Población y muestra", "Técnicas e instrumentos", "Validez y confiabilidad", "Análisis de datos", "Consideraciones éticas"]],
        ["Resultados esperados e impacto"], ["Plan de divulgación"], ["Cronograma"], ["Presupuesto"], ["Referencias"]
      ]
    },
    posdoctorado: {
      nombre: "Posdoctorado", producto: "Proyecto posdoctoral financiable",
      secciones: [
        ["Título"], ["Resumen ejecutivo"], ["Trayectoria del investigador y del grupo"], ["Problema y relevancia"], ["Preguntas e hipótesis"],
        ["Objetivos", ["Objetivo general", "Objetivos específicos"]], ["Estado del arte y brecha"], ["Marco teórico"],
        ["Diseño metodológico", ["Enfoque y tipo de investigación", "Técnicas e instrumentos", "Análisis de datos", "Consideraciones éticas"]],
        ["Resultados esperados e impacto"], ["Impacto y transferencia"], ["Plan de trabajo con la entidad anfitriona"], ["Plan de financiación"],
        ["Cronograma"], ["Presupuesto"], ["Referencias"]
      ]
    }
  };

  /* Subapartados de la metodología según la ruta (Hernández Sampieri et al., 2014; Martínez Miguélez). */
  const ENFOQUES = {
    cuantitativo: { nombre: "Cuantitativo", metodo: ["Alcance de la investigación", "Hipótesis y variables", "Diseño de investigación", "Muestra", "Instrumentos: confiabilidad y validez", "Análisis estadístico", "Consideraciones éticas"] },
    cualitativo: { nombre: "Cualitativo", metodo: ["Paradigma y posicionamiento epistemológico", "Diseño cualitativo", "Participantes y muestreo cualitativo", "Técnicas de recolección", "Categorización y análisis", "Rigor cualitativo", "Consideraciones éticas"] },
    mixto: { nombre: "Mixto", metodo: ["Paradigma y posicionamiento epistemológico", "Diseño mixto", "Muestra", "Técnicas de recolección", "Instrumentos: confiabilidad y validez", "Análisis estadístico", "Categorización y análisis", "Integración de resultados", "Consideraciones éticas"] }
  };
  function enfoque() { const id = Config.get().enfoqueInvestigacion || "cuantitativo"; return Object.assign({ id }, ENFOQUES[id] || ENFOQUES.cuantitativo); }
  function fijarEnfoque(id) { if (ENFOQUES[id]) { Config.set({ enfoqueInvestigacion: id }); if ($("selEnfoque")) $("selEnfoque").value = id; } return enfoque(); }
  /** Secciones del nivel con la metodología ajustada al enfoque. */
  function secciones() {
    const n = nivel(), e = enfoque();
    return n.secciones.map(([t, subs]) => {
      if (/^(Metodolog[ií]a|Dise[ñn]o metodol[oó]gico)$/.test(t)) {
        let m = e.metodo.slice();
        if (n.id === "especializacion") m = m.filter(x => !/Paradigma/.test(x)).concat(["Evaluación e indicadores"]);
        if (n.id === "pregrado") m = m.filter(x => !/Paradigma|Integración/.test(x));
        if (n.secciones.some(([x]) => /epistemol/i.test(x))) m = m.filter(x => !/Paradigma/.test(x));
        // Si el nivel ya tiene un apartado de hipótesis, aquí solo van las variables.
        if (n.secciones.some(([x]) => /hip[oó]tesis/i.test(x))) m = m.map(x => x === "Hipótesis y variables" ? "Variables o categorías" : x);
        return [t, m];
      }
      if (/^Hip[oó]tesis o supuestos$/.test(t) && e.id === "cualitativo") return ["Supuestos y preguntas orientadoras"];
      return [t, subs];
    });
  }

  function nivel() { const id = Config.get().nivelInvestigacion || "maestria"; return Object.assign({ id }, NIVELES[id] || NIVELES.maestria); }
  function fijarNivel(id) { if (NIVELES[id]) { Config.set({ nivelInvestigacion: id }); if ($("selNivel")) $("selNivel").value = id; } return nivel(); }

  /* ================= Trust Label ================= */

  const ORIGENES = {
    documento: { txt: "Basado en tu documento", cls: "doc" },
    fuente: { txt: "Fuente verificable · OpenAlex", cls: "fuente" },
    rubrica: { txt: "Rúbrica Romus · puntaje por reglas", cls: "rubrica" },
    modelo: { txt: "Inferencia de la IA · verifícala", cls: "modelo" },
    plantilla: { txt: "Plantilla del nivel", cls: "rubrica" },
    guia: { txt: "Guía Romus", cls: "guia" },
    teoria: { txt: "Teoría · Suárez (2025)", cls: "teoria" }
  };
  function etiqueta(origen, extra) {
    const o = ORIGENES[origen] || ORIGENES.modelo;
    const s = document.createElement("span");
    s.className = "trust " + o.cls;
    s.textContent = o.txt + (extra ? " · " + extra : "");
    s.title = {
      doc: "Romus comprobó que la evidencia citada aparece literalmente en tu documento.",
      fuente: "Dato tomado de una base académica abierta (OpenAlex). Revisa el formato de los nombres.",
      rubrica: "Calculado con criterios fijos, no por la opinión de la IA.",
      modelo: "Propuesta generada por la IA. No está comprobada en tu documento ni en fuentes: revísala.",
      teoria: "Contenido del libro «Teoría: conocimiento científico» de Brian Gonzalo Suárez Acevedo (2025).",
      guia: "Explicación de la guía metodológica de Romus, redactada a partir de Hernández Sampieri et al. (2014) y Martínez Miguélez (2004)."
    }[o.cls] || "";
    return s;
  }

  /* ================= Registro de uso de IA ================= */

  const CLAVE_REG = "romus.registroIA.v1";
  function claveDoc() { try { return (Office.context.document.url || "documento-sin-nombre"); } catch (e) { return "documento-sin-nombre"; } }
  function leerRegistro() { try { return (JSON.parse(localStorage.getItem(CLAVE_REG) || "{}")[claveDoc()]) || []; } catch (e) { return []; } }
  function registrar(accion, detalle, origen) {
    try {
      const todo = JSON.parse(localStorage.getItem(CLAVE_REG) || "{}");
      const lista = todo[claveDoc()] || [];
      const p = window.Config ? Config.perfil() : null;
      lista.push({ fecha: new Date().toISOString(), accion, detalle: String(detalle || "").slice(0, 160), origen: origen || "modelo", modelo: p ? `${p.nombre} · ${p.modelo}` : "" });
      todo[claveDoc()] = lista.slice(-300);
      localStorage.setItem(CLAVE_REG, JSON.stringify(todo));
    } catch (e) { /* sin almacenamiento */ }
  }

  /* ================= Utilidades ================= */

  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[«»"“”'’`]/g, "").replace(/\s+/g, " ").trim();
  /** ¿La evidencia aparece en el documento? Acepta coincidencia literal o del 85 % de sus palabras dentro de un párrafo. */
  function verificar(evidencia, parrafos) {
    const e = norm(evidencia);
    if (e.length < 8) return -1;
    for (const p of parrafos) if (norm(p.texto).includes(e)) return p.i;
    const pal = e.split(" ").filter(w => w.length > 3);
    if (pal.length < 3) return -1;
    let mejor = -1, max = 0;
    for (const p of parrafos) {
      const t = " " + norm(p.texto) + " ";
      const n = pal.filter(w => t.includes(" " + w)).length / pal.length;
      if (n > max) { max = n; mejor = p.i; }
    }
    return max >= 0.85 ? mejor : -1;
  }

  const VACIAS = new Set("para como sobre entre desde hasta donde cuando cual cuales este esta estos estas ese esa esos esas aquel aquella mediante traves través partir dentro fuera hacia según segun durante sobre ante bajo cabe contra mismo misma mismos mismas otro otra otros otras cada todo toda todos todas nivel niveles forma manera proceso parte tipo tipos caso casos además ademas tambien también objetivo objetivos general especifico especificos específicos estudio investigacion investigación analizar determinar identificar describir establecer diseñar disenar evaluar proponer implementar comparar caracterizar desarrollar fortalecer mejorar conocer relacion relación entre efecto efectos influencia incidencia".split(" "));
  function conceptos(texto) {
    return Array.from(new Set(norm(texto).replace(/[^a-zñ0-9 ]/g, " ").split(" ").filter(w => w.length >= 6 && !VACIAS.has(w))));
  }

  async function documentoNumerado() {
    const parrafos = await Doc.leerParrafos();
    return { parrafos, texto: Doc.construirContexto(parrafos, null) };
  }

  function sistemaAsesor() {
    const n = nivel(), e = enfoque();
    return `Eres Romus en modo asesor metodológico (método Kuetz). Acompañas un proyecto de nivel ${n.nombre} (${n.producto}) con enfoque ${e.nombre.toLowerCase()}.
Base metodológica (aplícala con tus propias palabras; no inventes citas textuales):
- Hernández Sampieri, Fernández y Baptista (2014), Metodología de la investigación, 6.ª ed.: rutas cuantitativa, cualitativa y mixta; el planteamiento incluye objetivos, preguntas, justificación (conveniencia, relevancia social, implicaciones prácticas, valor teórico, utilidad metodológica), viabilidad y deficiencias en el conocimiento; alcances exploratorio, descriptivo, correlacional y explicativo; hipótesis y variables con definición conceptual y operacional; diseños experimentales y no experimentales; muestreo probabilístico y no probabilístico; confiabilidad, validez y objetividad de los instrumentos. En lo cualitativo: planteamiento abierto y emergente, inmersión en el campo, muestras intencionales y saturación, diseños (teoría fundamentada, etnográfico, narrativo, fenomenológico, investigación-acción) y rigor (dependencia, credibilidad, transferencia, confirmabilidad). En lo mixto: diseños secuenciales, convergentes y anidados, e integración.
- Martínez Miguélez, Epistemología y metodología cualitativa en las ciencias sociales: todo método está inserto en un paradigma; la observación depende de la teoría y del punto de vista del investigador; paradigma sistémico y dialéctico que integra lo empírico, lo interpretativo y lo crítico; la cientificidad exige rigor, sistematicidad y criticidad, junto con apertura y creatividad.
Cuando un consejo se apoye en estos autores, puedes mencionarlos (por ejemplo: «según Hernández Sampieri et al.»).
Reglas:
- Eres riguroso y honesto: señalas vacíos y debilidades con precisión, y propones cómo resolverlos.
- La exigencia se ajusta al nivel: en pregrado, claridad y viabilidad; en especialización, aplicabilidad; en maestría, rigor metodológico y estado del arte; en doctorado, aporte original y posicionamiento epistemológico; en posdoctorado, impacto, transferencia y financiación.
- Cuando cites evidencia del documento, copia el fragmento LITERAL (tal cual aparece), corto (máximo 25 palabras).
- Nunca inventes referencias bibliográficas, autores ni datos.
- Escribe en español claro y profesional, sin markdown.`;
  }

  async function pedirHerramienta(nombre, descripcion, esquema, mensaje, signal) {
    const r = await IA.llamar({
      system: [{ type: "text", text: sistemaAsesor() }],
      messages: [{ role: "user", content: mensaje }],
      tools: [{ name: nombre, description: descripcion, input_schema: esquema }],
      tool_choice: { type: "tool", name: nombre },
      max_tokens: 6000
    }, signal);
    const ll = IA.herramientasDe(r).find(x => x.nombre === nombre);
    if (!ll) throw new Error("La IA no devolvió el resultado esperado. Prueba de nuevo o usa un modelo más capaz.");
    return ll.datos;
  }

  /* ================= Panel de resultados ================= */

  function tarjeta(titulo, contenido) {
    const caja = $("invResultado");
    caja.innerHTML = "";
    const cab = document.createElement("div");
    cab.className = "inv-cab";
    const h = document.createElement("b"); h.textContent = titulo;
    const x = document.createElement("button"); x.className = "enlace-sutil"; x.textContent = "Cerrar"; x.onclick = () => { caja.innerHTML = ""; caja.classList.add("oculto"); };
    cab.append(h, x);
    caja.append(cab, contenido);
    caja.classList.remove("oculto");
    caja.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function irA(i) { if (i != null && i >= 0) Doc.seleccionarParrafo(i).catch(() => {}); }

  /* ================= 1. Estructura por nivel ================= */

  async function insertarEstructura() {
    const n = nivel();
    const parrafos = await Doc.leerParrafos();
    const llenos = parrafos.filter(p => p.texto.trim()).length;
    const conComentarios = Doc.soporta("1.4");
    const secs = secciones(), e = enfoque();
    await Word.run(async (ctx) => {
      const body = ctx.document.body;
      if (llenos <= 1) body.clear();
      const pendientes = [];
      const agregar = (texto, estilo) => {
        const p = body.insertParagraph(texto, "End");
        p.styleBuiltIn = estilo;
        return p;
      };
      if (llenos > 1) agregar(`${n.producto} · ${n.nombre}`, "Title");
      secs.forEach(([titulo, subs]) => {
        const h = agregar(titulo, "Heading1");
        pendientes.push([h, titulo]);
        if (!subs) { agregar("", "Normal"); return; }
        subs.forEach(s => { const h2 = agregar(s, "Heading2"); pendientes.push([h2, s]); agregar("", "Normal"); });
      });
      await ctx.sync();
      pendientes.forEach(([p, t]) => {
        const g = GUIAS[t];
        if (!g) return;
        if (conComentarios) p.getRange("Content").insertComment("Romus · " + g);
      });
      await ctx.sync();
    });
    const total = secs.reduce((a, [, s]) => a + 1 + (s ? s.length : 0), 0);
    registrar("Estructura del proyecto", `${n.nombre}, enfoque ${e.nombre.toLowerCase()}: ${total} apartados`, "plantilla");
    const m = ui.agregarMensaje("accion", `Inserté la estructura de ${n.producto.toLowerCase()} (${n.nombre}, enfoque ${e.nombre.toLowerCase()}): ${total} apartados con títulos navegables${conComentarios ? " y una guía en comentario para cada uno" : ""}.`);
    m.appendChild(etiqueta("plantilla"));
    ui.hablar(`Listo. Inserté la estructura para ${n.nombre} con enfoque ${e.nombre.toLowerCase()}. Cada apartado tiene una guía en el margen.`);
  }

  /* ================= 2. Ideación ================= */

  async function idear(idea, signal) {
    const n = nivel();
    const doc = await documentoNumerado();
    const base = idea && idea.trim() ? `Idea del usuario: «${idea}»` : "El usuario no dio una idea explícita: usa lo que haya en el documento.";
    const d = await pedirHerramienta("propuesta_investigacion",
      "Convierte una idea en una propuesta de investigación inicial ajustada al nivel.",
      {
        type: "object",
        properties: {
          titulo: { type: "string" },
          problema: { type: "string", description: "2 a 4 frases" },
          preguntas: { type: "array", items: { type: "string" }, description: "3 preguntas alternativas, de la más acotada a la más amplia" },
          objetivo_general: { type: "string" },
          objetivos_especificos: { type: "array", items: { type: "string" } },
          enfoque: { type: "string", description: "Enfoque y diseño metodológico sugerido, en una o dos frases" },
          variables_o_categorias: { type: "array", items: { type: "string" } },
          riesgos: { type: "array", items: { type: "string" }, description: "Riesgos de viabilidad o de alcance" },
          busqueda: { type: "string", description: "3 a 6 palabras clave en inglés para buscar literatura" }
        },
        required: ["titulo", "problema", "preguntas", "objetivo_general", "objetivos_especificos", "enfoque", "busqueda"]
      },
      `${base}\nNivel: ${n.nombre} (${n.producto}). Enfoque preferido: ${enfoque().nombre.toLowerCase()} (si la idea pide otro, dilo en «enfoque»).\n\nDocumento actual (contexto):\n${doc.texto.slice(0, 20000)}`, signal);

    registrar("Ideación", d.titulo, "modelo");
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("modelo"));
    const bloque = (t, v) => { if (!v || (Array.isArray(v) && !v.length)) return; c.appendChild(el("div", "inv-sub", t)); if (Array.isArray(v)) { const ol = el("ol"); v.forEach(x => ol.appendChild(el("li", "", x))); c.appendChild(ol); } else c.appendChild(el("p", "", v)); };
    bloque("Título tentativo", d.titulo);
    bloque("Problema", d.problema);
    bloque("Preguntas posibles", d.preguntas);
    bloque("Objetivo general", d.objetivo_general);
    bloque("Objetivos específicos", d.objetivos_especificos);
    bloque("Enfoque sugerido", d.enfoque);
    bloque("Variables o categorías", d.variables_o_categorias);
    bloque("Riesgos a cuidar", d.riesgos);
    const fila = el("div", "inv-acciones");
    const bIns = el("button", "boton secundario", "Insertar en el documento");
    bIns.onclick = async () => {
      const lineas = [`Título tentativo: ${d.titulo}`, `Problema: ${d.problema}`, `Pregunta de investigación: ${d.preguntas[0]}`, `Objetivo general: ${d.objetivo_general}`]
        .concat((d.objetivos_especificos || []).map((o, k) => `Objetivo específico ${k + 1}: ${o}`)).concat([`Enfoque: ${d.enfoque}`]);
      await Doc.insertarTexto({ posicion: "en_cursor", texto: lineas.join("\n") });
      registrar("Inserción de propuesta", d.titulo, "modelo");
      ui.confirmar("Inserté la propuesta en el cursor. Ajústala con tu voz de autor.");
    };
    const bLit = el("button", "boton secundario", "Buscar literatura");
    bLit.onclick = () => literatura(d.busqueda);
    fila.append(bIns, bLit);
    c.appendChild(fila);
    tarjeta("Propuesta inicial · " + n.nombre, c);
    ui.hablar(`Te propongo esta pregunta: ${d.preguntas[0]} Revisa las alternativas y los objetivos en el panel.`);
  }

  /* ================= 3. Matriz de coherencia ================= */

  const ESLABONES = [
    ["problema", "pregunta", "El problema conduce a la pregunta"],
    ["pregunta", "objetivo_general", "El objetivo general responde la pregunta"],
    ["objetivo_general", "objetivos_especificos", "Los específicos, sumados, logran el general"],
    ["objetivos_especificos", "metodologia", "La metodología permite cumplir cada objetivo específico"],
    ["metodologia", "resultados", "Los resultados esperados se derivan de la metodología"]
  ];
  const NOMBRE_EL = { problema: "Problema", pregunta: "Pregunta", objetivo_general: "Objetivo general", objetivos_especificos: "Objetivos específicos", metodologia: "Metodología", resultados: "Resultados esperados" };

  async function coherencia(signal) {
    const doc = await documentoNumerado();
    if (doc.parrafos.filter(p => p.texto.trim()).length < 3) throw new Error("El documento está casi vacío. Escribe al menos el problema y los objetivos, o di «inserta la estructura».");
    const d = await pedirHerramienta("matriz_coherencia",
      "Ubica los elementos del proyecto y evalúa cada eslabón de coherencia.",
      {
        type: "object",
        properties: {
          elementos: { type: "array", items: { type: "object", properties: {
            tipo: { type: "string", enum: Object.keys(NOMBRE_EL) },
            texto_literal: { type: "string", description: "Fragmento literal del documento (máx. 25 palabras); vacío si no existe" },
            parrafo: { type: "integer", description: "Número de párrafo [n]; -1 si no existe" }
          }, required: ["tipo", "texto_literal", "parrafo"] } },
          eslabones: { type: "array", items: { type: "object", properties: {
            de: { type: "string" }, a: { type: "string" },
            estado: { type: "string", enum: ["coherente", "debil", "ausente"] },
            explicacion: { type: "string", description: "Una o dos frases" },
            sugerencia: { type: "string", description: "Qué cambiar, en concreto" }
          }, required: ["de", "a", "estado", "explicacion", "sugerencia"] } }
        },
        required: ["elementos", "eslabones"]
      },
      `Analiza la coherencia interna de este proyecto. Ubica cada elemento (${Object.keys(NOMBRE_EL).join(", ")}) y evalúa EXACTAMENTE estos eslabones:\n` +
      ESLABONES.map(([a, b, t]) => `- ${a} → ${b}: ${t}`).join("\n") +
      `\n\nDOCUMENTO (párrafos numerados):\n${doc.texto}`, signal);

    // Verificación (Trust Layer): ¿los fragmentos existen en el documento?
    const elementos = {};
    (d.elementos || []).forEach(e => {
      const i = e.texto_literal ? verificar(e.texto_literal, doc.parrafos) : -1;
      const prev = elementos[e.tipo];
      if (!prev || (i >= 0 && prev.i < 0)) elementos[e.tipo] = { texto: e.texto_literal, i, verificado: i >= 0 };
    });
    // Puntaje por reglas: coherente 1, débil 0.5, ausente 0. Un eslabón cuyo extremo no existe en el documento cuenta como ausente.
    const PESO = { coherente: 1, debil: 0.5, ausente: 0 };
    const filas = ESLABONES.map(([a, b, t]) => {
      const r = (d.eslabones || []).find(x => x.de === a && x.a === b) || { estado: "ausente", explicacion: "La IA no evaluó este eslabón.", sugerencia: "" };
      const falta = [a, b].filter(k => !(elementos[k] && elementos[k].verificado));
      if (falta.length) return { a, b, t, estado: "ausente", original: r.estado,
        explicacion: `No encontré ${falta.map(k => NOMBRE_EL[k].toLowerCase()).join(" ni ")} en el documento.`,
        sugerencia: `Escribe ${falta.length > 1 ? "esos apartados" : "ese apartado"} para poder verificar este eslabón.` };
      return { a, b, t, estado: r.estado, original: r.estado, explicacion: r.explicacion, sugerencia: r.sugerencia };
    });
    const puntaje = Math.round(filas.reduce((s, f) => s + PESO[f.estado], 0) / filas.length * 100);

    // Knowledge Graph ligero: conceptos del objetivo general que no aparecen en la metodología.
    let sinCubrir = [];
    const og = elementos.objetivo_general, met = elementos.metodologia;
    if (og && og.verificado && met && met.verificado) {
      const textoMet = norm(doc.parrafos.filter(p => p.i >= met.i && p.i < met.i + 25).map(p => p.texto).join(" "));
      sinCubrir = conceptos(og.texto).filter(c => !textoMet.includes(c.slice(0, Math.max(6, c.length - 2))));
    }

    // Comentarios en Word para los eslabones débiles o ausentes.
    const comentarios = filas.filter(f => f.estado !== "coherente").map(f => {
      const ancla = (elementos[f.b] && elementos[f.b].verificado ? elementos[f.b] : elementos[f.a]);
      if (!ancla || ancla.i < 0) return null;
      return { parrafo: ancla.i, fragmento: "", comentario: `Romus · Coherencia (${f.estado === "debil" ? "débil" : "falta"}): ${f.t}. ${f.explicacion} Sugerencia: ${f.sugerencia}` };
    }).filter(Boolean);
    if (sinCubrir.length && og.i >= 0) comentarios.push({ parrafo: og.i, fragmento: "", comentario: `Romus · Conceptos del objetivo general que no aparecen en la metodología: ${sinCubrir.join(", ")}. ¿Cómo los vas a abordar?` });
    if (comentarios.length) await Doc.comentar(comentarios);
    registrar("Matriz de coherencia", `${puntaje}/100`, "documento");

    // Tarjeta
    const c = el("div", "inv-cuerpo");
    const pun = el("div", "inv-puntaje");
    pun.append(el("b", "", puntaje), el("span", "", "/100 coherencia"));
    c.append(pun, etiqueta("rubrica"));
    const lista = el("div", "inv-matriz");
    filas.forEach(f => {
      const fila = el("div", "inv-fila " + f.estado);
      fila.appendChild(el("i", "punto"));
      const tx = el("div", "");
      tx.appendChild(el("b", "", `${NOMBRE_EL[f.a]} → ${NOMBRE_EL[f.b]}`));
      tx.appendChild(el("span", "", f.estado === "coherente" ? f.explicacion : `${f.explicacion} ${f.sugerencia}`));
      fila.appendChild(tx);
      const ancla = elementos[f.b] && elementos[f.b].i >= 0 ? elementos[f.b].i : (elementos[f.a] ? elementos[f.a].i : -1);
      if (ancla >= 0) { fila.title = "Ir al texto"; fila.onclick = () => irA(ancla); fila.classList.add("clic"); }
      lista.appendChild(fila);
    });
    c.appendChild(lista);
    const noVer = Object.keys(NOMBRE_EL).filter(k => !(elementos[k] && elementos[k].verificado));
    if (noVer.length) c.appendChild(el("p", "inv-nota", "No encontré en el documento: " + noVer.map(k => NOMBRE_EL[k].toLowerCase()).join(", ") + "."));
    if (sinCubrir.length) c.appendChild(el("p", "inv-nota", "Conceptos del objetivo general sin rastro en la metodología: " + sinCubrir.join(", ") + "."));
    if (comentarios.length) c.appendChild(el("p", "inv-nota", `Dejé ${comentarios.length} ${comentarios.length === 1 ? "comentario" : "comentarios"} en el documento.`));
    tarjeta("Matriz de coherencia", c);
    const debiles = filas.filter(f => f.estado !== "coherente");
    ui.hablar(debiles.length
      ? `Coherencia de ${puntaje} sobre 100. Lo más urgente: ${debiles[0].t.toLowerCase()}. ${debiles[0].sugerencia}`
      : `Coherencia de ${puntaje} sobre 100. Todos los eslabones están bien conectados.`);
  }

  /* ================= 4. Literatura real (OpenAlex) + APA 7 ================= */

  let ultimos = [];

  function partirNombre(nombre) {
    const t = String(nombre || "").trim().split(/\s+/).filter(Boolean);
    if (t.length <= 1) return { apellido: t[0] || "", iniciales: "" };
    const nApe = t.length >= 3 ? 2 : 1; // nombres hispanos: dos apellidos
    const apellido = t.slice(-nApe).join(" ");
    const iniciales = t.slice(0, -nApe).map(x => x.replace(/[^A-Za-zÀ-ÿ-]/g, "").split("-").map(s => s.charAt(0).toUpperCase() + ".").join("-")).join(" ");
    return { apellido, iniciales };
  }

  function apa(w) {
    const autores = (w.authorships || []).map(a => partirNombre(a.author && a.author.display_name));
    const fmt = (a) => a.iniciales ? `${a.apellido}, ${a.iniciales}` : a.apellido;
    let lista;
    if (!autores.length) lista = "";
    else if (autores.length === 1) lista = fmt(autores[0]);
    else if (autores.length <= 20) lista = autores.slice(0, -1).map(fmt).join(", ") + " y " + fmt(autores[autores.length - 1]); // APA 7 en español: sin coma antes de «y»
    else lista = autores.slice(0, 19).map(fmt).join(", ") + ", … " + fmt(autores[autores.length - 1]);
    const anio = w.publication_year || "s. f.";
    const titulo = (w.display_name || w.title || "").replace(/\.$/, "");
    const fuente = w.primary_location && w.primary_location.source ? w.primary_location.source.display_name : "";
    const b = w.biblio || {};
    let detalle = "";
    if (b.volume) detalle += `, ${b.volume}`;
    if (b.issue) detalle += `(${b.issue})`;
    if (b.first_page) detalle += `, ${b.first_page}${b.last_page && b.last_page !== b.first_page ? "-" + b.last_page : ""}`;
    const doi = w.doi ? " " + w.doi : "";
    const texto = `${lista ? lista + " " : ""}(${anio}). ${titulo}.${fuente ? " " + fuente + detalle + "." : ""}${doi}`;
    let cita;
    if (!autores.length) cita = `(${titulo.split(" ").slice(0, 4).join(" ")}, ${anio})`;
    else if (autores.length === 1) cita = `(${autores[0].apellido}, ${anio})`;
    else if (autores.length === 2) cita = `(${autores[0].apellido} y ${autores[1].apellido}, ${anio})`;
    else cita = `(${autores[0].apellido} et al., ${anio})`;
    return { texto, cita, fuente, titulo, anio, doi: w.doi || "", citas: w.cited_by_count || 0, abierto: !!(w.open_access && w.open_access.is_oa), autores: autores.map(a => a.apellido) };
  }

  async function buscarOpenAlex(consulta, recientes) {
    const params = new URLSearchParams({
      search: consulta, "per-page": "8",
      select: "id,doi,display_name,publication_year,authorships,primary_location,biblio,cited_by_count,open_access,type"
    });
    params.set("filter", "type:article|review|book-chapter|book|dissertation" + (recientes ? ",from_publication_date:" + (new Date().getFullYear() - 8) + "-01-01" : ""));
    const r = await fetch("https://api.openalex.org/works?" + params.toString());
    if (!r.ok) throw new Error("No pude consultar OpenAlex (" + r.status + "). Revisa tu conexión.");
    const j = await r.json();
    return (j.results || []).filter(w => w.display_name && (w.authorships || []).length);
  }

  async function literatura(tema, opciones) {
    tema = String(tema || "").trim();
    if (!tema) throw new Error("Dime el tema: «busca literatura sobre…».");
    const recientes = !(opciones && opciones.todas);
    let obras = await buscarOpenAlex(tema, recientes);
    // Si hay pocos resultados, la IA (si está conectada) propone palabras clave en inglés.
    if (obras.length < 4 && !Config.faltaClave()) {
      try {
        const d = await pedirHerramienta("palabras_clave", "Palabras clave en inglés para buscar literatura académica.",
          { type: "object", properties: { consulta: { type: "string" } }, required: ["consulta"] },
          `Tema: «${tema}». Devuelve 3 a 6 palabras clave en inglés, sin comillas ni operadores.`);
        if (d.consulta) { const mas = await buscarOpenAlex(d.consulta, recientes); obras = obras.concat(mas.filter(m => !obras.some(o => o.id === m.id))); }
      } catch (e) { /* seguir con lo que hay */ }
    }
    ultimos = obras.slice(0, 6).map(apa);
    registrar("Búsqueda de literatura", tema, "fuente");
    const c = el("div", "inv-cuerpo");
    c.appendChild(etiqueta("fuente", recientes ? "últimos 8 años" : ""));
    if (!ultimos.length) {
      c.appendChild(el("p", "inv-nota", "No encontré trabajos con esos términos. Prueba con palabras más generales o en inglés."));
      tarjeta("Literatura · " + tema, c);
      ui.hablar("No encontré trabajos con esos términos. Prueba con palabras más generales.");
      return;
    }
    const lista = el("ol", "inv-lit");
    ultimos.forEach((w, k) => {
      const li = el("li");
      li.appendChild(el("div", "inv-lit-titulo", w.titulo));
      li.appendChild(el("div", "inv-lit-meta", `${w.autores.slice(0, 3).join(", ")}${w.autores.length > 3 ? " et al." : ""} · ${w.anio}${w.fuente ? " · " + w.fuente : ""} · ${w.citas} citas${w.abierto ? " · acceso abierto" : ""}`));
      const acc = el("div", "inv-acciones");
      const bC = el("button", "boton secundario", "Citar " + (k + 1));
      bC.onclick = () => citar(k).catch(ui.mostrarError);
      acc.appendChild(bC);
      if (w.doi) { const a = el("a", "enlace-sutil", "Abrir"); a.href = w.doi; a.target = "_blank"; a.rel = "noopener"; acc.appendChild(a); }
      li.appendChild(acc);
      lista.appendChild(li);
    });
    c.appendChild(lista);
    c.appendChild(el("p", "inv-nota", "«Citar» pone la cita en el cursor y agrega la referencia en APA 7 a la lista de Referencias. Lee la fuente antes de citarla."));
    tarjeta("Literatura · " + tema, c);
    ui.hablar(`Encontré ${ultimos.length} trabajos. El primero: ${ultimos[0].titulo}, de ${ultimos[0].anio}. Di «cita el uno» para citarlo.`);
  }

  async function citar(k) {
    const w = ultimos[k];
    if (!w) throw new Error("Primero busca literatura: «busca literatura sobre…».");
    await Word.run(async (ctx) => {
      const body = ctx.document.body;
      // 1) Cita en el cursor
      const sel = ctx.document.getSelection();
      sel.insertText(" " + w.cita, "End");
      // 2) Referencia en la lista
      const ps = body.paragraphs;
      ps.load("items/text,items/style");
      await ctx.sync();
      const items = ps.items;
      let iRef = -1;
      items.forEach((p, i) => { if (/^\s*(referencias|referencias bibliogr[aá]ficas|bibliograf[ií]a)\s*$/i.test(p.text)) iRef = i; });
      if (items.some(p => (w.doi && p.text.includes(w.doi)) || norm(p.text).includes(norm(w.titulo).slice(0, 60)))) { await ctx.sync(); return; }
      let nuevo;
      if (iRef < 0) {
        const h = body.insertParagraph("Referencias", "End"); h.styleBuiltIn = "Heading1";
        nuevo = body.insertParagraph(w.texto, "End");
      } else {
        // Orden alfabético dentro de la sección (hasta el siguiente título).
        let fin = iRef;
        for (let i = iRef + 1; i < items.length; i++) { if (Doc.esTitulo(items[i].style)) break; fin = i; }
        let antes = null;
        for (let i = iRef + 1; i <= fin; i++) {
          if (items[i].text.trim() && items[i].text.localeCompare(w.texto, "es", { sensitivity: "base" }) > 0) { antes = items[i]; break; }
        }
        if (antes) nuevo = antes.insertParagraph(w.texto, "Before");
        else if (fin === iRef || !items[fin].text.trim()) nuevo = (fin === iRef ? items[iRef] : items[fin]).insertParagraph(w.texto, fin === iRef ? "After" : "Before");
        else nuevo = items[fin].insertParagraph(w.texto, "After");
      }
      nuevo.styleBuiltIn = "Normal";
      try { nuevo.leftIndent = 36; nuevo.firstLineIndent = -36; } catch (e) { /* sangría francesa opcional */ }
      if (w.fuente) {
        const r = nuevo.search(w.fuente.slice(0, 250), { matchCase: true });
        r.load("items");
        await ctx.sync();
        if (r.items.length) r.items[0].font.italic = true;
      }
      await ctx.sync();
    });
    registrar("Cita insertada", w.cita + " " + w.titulo, "fuente");
    const m = ui.agregarMensaje("accion", `Cité ${w.cita} y agregué la referencia en APA 7.`);
    m.appendChild(etiqueta("fuente"));
    ui.hablar(`Listo, cité ${w.cita}.`);
  }

  /* ================= 5. Rúbrica (puntaje por reglas) ================= */

  const RUBRICA_BASE = [
    ["problema", "Problema", 15, ["El problema describe una situación concreta (qué, a quién, dónde)", "Presenta evidencia o datos que muestran el problema", "Está delimitado (población, lugar o tiempo)"]],
    ["pregunta", "Pregunta", 10, ["Hay una pregunta de investigación explícita", "La pregunta se deriva del problema", "Es investigable con los recursos y el tiempo previstos"]],
    ["objetivos", "Objetivos", 15, ["El objetivo general responde la pregunta", "Los específicos usan verbos medibles", "Los específicos, sumados, logran el general"]],
    ["justificacion", "Justificación", 8, ["Argumenta al menos tres criterios: conveniencia, relevancia social, implicaciones prácticas, valor teórico o utilidad metodológica", "Expone la viabilidad (tiempo, recursos, acceso)", "Identifica las deficiencias en el conocimiento que atiende"]],
    ["teoria", "Marco teórico y antecedentes", 14, ["Presenta antecedentes con autor y año", "Define la teoría o perspectiva que guía el estudio", "Identifica el vacío que el estudio cubre"]],
    ["metodo", "Metodología", 20, ["Declara enfoque y diseño", "Define población o muestra y su selección", "Describe técnicas e instrumentos", "Explica cómo se analizarán los datos", "Incluye consideraciones éticas"]],
    ["viabilidad", "Viabilidad", 8, ["Incluye cronograma", "Incluye presupuesto o recursos"]],
    ["referencias", "Citas y referencias", 10, ["Hay citas dentro del texto", "Hay una lista de referencias", "Las referencias siguen un formato normalizado (APA u otro)"]]
  ];
  const RUBRICA_EXTRA = {
    especializacion: [["intervencion", "Propuesta de intervención", 12, ["La propuesta describe actividades concretas", "Define indicadores para evaluar la intervención"]]],
    maestria: [["estado", "Estado del arte", 12, ["La revisión de la literatura está organizada por temas o tendencias", "Incluye estudios recientes (últimos 5 a 10 años)", "Cierra con el vacío que justifica el estudio"]]],
    doctorado: [["aporte", "Aporte original y epistemología", 18, ["Declara explícitamente el aporte original al conocimiento", "Expone el posicionamiento epistemológico y su coherencia con el método", "El estado del arte es crítico, no solo descriptivo", "Muestra rigor, sistematicidad y criticidad en la argumentación"]],
                ["divulgacion", "Divulgación", 6, ["Prevé publicaciones o productos de divulgación"]]],
    posdoctorado: [["impacto", "Impacto y transferencia", 14, ["Describe el impacto esperado y cómo se transfiere", "Incluye plan de trabajo con la entidad anfitriona"]],
                   ["financiacion", "Financiación", 8, ["Identifica la fuente o convocatoria de financiación"]]]
  };

  const METODO_ENFOQUE = {
    cuantitativo: ["Define el alcance (exploratorio, descriptivo, correlacional o explicativo)", "Formula hipótesis coherentes con el alcance, o justifica por qué no las hay", "Define las variables conceptual y operacionalmente", "Declara el diseño (experimental o no experimental) y lo justifica", "Delimita población y muestra y su tipo de muestreo", "Reporta confiabilidad y validez de los instrumentos", "Explica el análisis estadístico", "Incluye consideraciones éticas"],
    cualitativo: ["Declara el paradigma o posicionamiento epistemológico", "Nombra el diseño cualitativo (teoría fundamentada, etnográfico, narrativo, fenomenológico, investigación-acción…)", "Describe participantes, muestreo intencional y criterio de saturación", "Describe las técnicas de recolección y la inmersión en el campo", "Explica la categorización y el análisis", "Expone criterios de rigor (credibilidad, dependencia, transferencia, confirmabilidad)", "Incluye consideraciones éticas"],
    mixto: ["Declara el paradigma que justifica combinar enfoques", "Nombra el diseño mixto (secuencial, convergente o anidado) y la prioridad de cada enfoque", "Describe la muestra de cada fase", "Reporta confiabilidad y validez de los instrumentos cuantitativos", "Explica el análisis estadístico y el cualitativo", "Explica cómo se integran los resultados", "Incluye consideraciones éticas"]
  };

  function rubricaNivel() {
    const n = nivel(), e = enfoque();
    const base = RUBRICA_BASE.map(c => c[0] === "metodo" ? ["metodo", "Metodología (" + e.nombre.toLowerCase() + ")", 22, METODO_ENFOQUE[e.id]] : c);
    return base.concat((RUBRICA_EXTRA[n.id] || []).filter(c => !(e.id === "cualitativo" && c[0] === "rigor"))).map(([id, nombre, peso, items]) => ({ id, nombre, peso, items: items.map((t, k) => ({ id: `${id}.${k + 1}`, texto: t })) }));
  }

  async function evaluarRubrica(signal) {
    const n = nivel();
    const doc = await documentoNumerado();
    if (doc.parrafos.filter(p => p.texto.trim()).length < 3) throw new Error("El documento está casi vacío para evaluarlo.");
    const rub = rubricaNivel();
    const items = rub.flatMap(c => c.items);
    const d = await pedirHerramienta("evaluar_items",
      "Para cada ítem de la rúbrica, indica si el documento lo cumple y copia la evidencia literal.",
      {
        type: "object",
        properties: {
          items: { type: "array", items: { type: "object", properties: {
            id: { type: "string" },
            estado: { type: "string", enum: ["si", "parcial", "no"] },
            evidencia: { type: "string", description: "Fragmento LITERAL del documento (máx. 25 palabras) que lo demuestra; vacío si no hay" },
            recomendacion: { type: "string", description: "Qué hacer para cumplirlo (vacío si ya se cumple)" }
          }, required: ["id", "estado", "evidencia"] } },
          fortaleza: { type: "string", description: "La principal fortaleza del proyecto, en una frase" }
        },
        required: ["items"]
      },
      `Nivel: ${n.nombre}. Evalúa estos ítems (responde todos, con su id):\n` + items.map(i => `${i.id}: ${i.texto}`).join("\n") +
      `\n\nDOCUMENTO:\n${doc.texto}`, signal);

    // Reglas: sí con evidencia verificada = 1; sí sin evidencia verificable = 0,5; parcial = 0,5; no = 0.
    const resp = {};
    (d.items || []).forEach(x => { resp[x.id] = x; });
    let total = 0, pesos = 0, rebajados = 0;
    const criterios = rub.map(c => {
      let s = 0;
      const det = c.items.map(it => {
        const r = resp[it.id] || { estado: "no", evidencia: "" };
        const i = r.evidencia ? verificar(r.evidencia, doc.parrafos) : -1;
        let v = r.estado === "si" ? 1 : r.estado === "parcial" ? 0.5 : 0;
        if (r.estado === "si" && i < 0) { v = 0.5; rebajados++; }
        s += v;
        return { texto: it.texto, valor: v, i, recomendacion: r.recomendacion || "" };
      });
      const nota = s / c.items.length;
      total += nota * c.peso; pesos += c.peso;
      return { nombre: c.nombre, peso: c.peso, nota, det };
    });
    const puntaje = Math.round(total / pesos * 100);
    registrar("Autoevaluación con rúbrica", `${n.nombre}: ${puntaje}/100`, "rubrica");

    const c = el("div", "inv-cuerpo");
    const pun = el("div", "inv-puntaje");
    pun.append(el("b", "", puntaje), el("span", "", `/100 · rúbrica ${n.nombre} · ${enfoque().nombre.toLowerCase()}`));
    c.append(pun, etiqueta("rubrica"));
    c.appendChild(el("p", "inv-nota", "Criterios basados en Hernández Sampieri et al. (2014) y Martínez Miguélez."));
    const lista = el("div", "inv-rubrica");
    criterios.forEach(cr => {
      const f = el("details", "inv-criterio");
      const s = el("summary");
      s.appendChild(el("span", "", cr.nombre));
      const barra = el("i", "barra"); const relleno = el("i"); relleno.style.width = Math.round(cr.nota * 100) + "%"; relleno.className = cr.nota >= .8 ? "ok" : cr.nota >= .5 ? "medio" : "bajo"; barra.appendChild(relleno);
      s.append(barra, el("small", "", Math.round(cr.nota * 100) + "%"));
      f.appendChild(s);
      cr.det.forEach(x => {
        const li = el("div", "inv-item " + (x.valor === 1 ? "ok" : x.valor ? "medio" : "bajo"));
        li.appendChild(el("span", "", (x.valor === 1 ? "✓ " : x.valor ? "◐ " : "✗ ") + x.texto));
        if (x.valor < 1 && x.recomendacion) li.appendChild(el("small", "", x.recomendacion));
        if (x.i >= 0) { li.classList.add("clic"); li.title = "Ir a la evidencia"; li.onclick = () => irA(x.i); }
        f.appendChild(li);
      });
      lista.appendChild(f);
    });
    c.appendChild(lista);
    if (rebajados) c.appendChild(el("p", "inv-nota", `${rebajados} ${rebajados === 1 ? "ítem marcado como cumplido no tenía" : "ítems marcados como cumplidos no tenían"} evidencia verificable en el documento: cuentan como parciales.`));
    if (d.fortaleza) c.appendChild(el("p", "inv-nota", "Fortaleza: " + d.fortaleza));
    tarjeta("Autoevaluación con rúbrica", c);
    const peor = criterios.slice().sort((a, b) => a.nota - b.nota)[0];
    ui.hablar(`Tu proyecto obtiene ${puntaje} sobre 100 en la rúbrica de ${n.nombre}. Lo más débil es ${peor.nombre.toLowerCase()}.${d.fortaleza ? " Fortaleza: " + d.fortaleza : ""}`);
  }

  /* ================= 6. Declaración de uso de IA ================= */

  async function declaracion() {
    const reg = leerRegistro();
    const p = Config.perfil();
    const conteo = {};
    reg.forEach(r => { conteo[r.accion] = (conteo[r.accion] || 0) + 1; });
    const usos = Object.entries(conteo).map(([a, n]) => `${a.toLowerCase()} (${n})`).join(", ");
    const modelos = Array.from(new Set(reg.map(r => r.modelo).filter(Boolean)));
    const parrafo = reg.length
      ? `En la elaboración de este documento se utilizó el asistente Romus para Microsoft Word, con el modelo de inteligencia artificial ${modelos.join(" y ") || (p.nombre + " · " + p.modelo)}, como apoyo en las siguientes tareas: ${usos}. Las referencias bibliográficas sugeridas provienen de la base académica abierta OpenAlex y fueron revisadas por el autor. Las propuestas generadas por la IA se tomaron como orientación; el análisis, las decisiones metodológicas y la redacción final son responsabilidad del autor.`
      : `En la elaboración de este documento se dispuso del asistente Romus para Microsoft Word como herramienta de apoyo. Hasta la fecha no se registraron tareas realizadas con inteligencia artificial en este documento.`;
    await Word.run(async (ctx) => {
      const body = ctx.document.body;
      const h = body.insertParagraph("Declaración de uso de inteligencia artificial", "End"); h.styleBuiltIn = "Heading1";
      body.insertParagraph(parrafo, "End").styleBuiltIn = "Normal";
      if (reg.length) {
        const filas = [["Fecha", "Tarea", "Detalle", "Origen"]].concat(reg.slice(-40).map(r => [
          new Date(r.fecha).toLocaleDateString("es-CO"), r.accion, r.detalle, (ORIGENES[r.origen] || ORIGENES.modelo).txt.split(" · ")[0]
        ]));
        try {
          const ultimo = body.insertParagraph("", "End");
          const t = ultimo.insertTable(filas.length, 4, "After", filas);
          try { t.headerRowCount = 1; } catch (e) { /* opcional */ }
        } catch (e) { /* tablas no disponibles: queda el párrafo */ }
      }
      await ctx.sync();
    });
    ui.confirmar(`Agregué la declaración de uso de IA al final, con ${reg.length} ${reg.length === 1 ? "registro" : "registros"}.`);
  }

  /* ================= 7. Guía metodológica y modo tutorial ================= */

  let tutorialActivo = false;

  function botonAccion(t) {
    const mapa = {
      coherencia: ["Revisar la coherencia de mi documento", () => ejecutar(() => coherencia())],
      literatura: ["Buscar literatura", () => { if (ui.prefijar) ui.prefijar("Busca literatura sobre "); }],
      idear: ["Idear mi proyecto", () => { if (ui.prefijar) ui.prefijar("Ayúdame a idear un proyecto sobre "); }],
      declaracion: ["Agregar la declaración de uso de IA", () => ejecutar(declaracion)],
      enfoque: ["Elegir enfoque", () => { const s = $("selEnfoque"); if (s) { s.focus(); s.scrollIntoView({ block: "center" }); } }]
    };
    const a = mapa[t.accion];
    if (!a) return null;
    const b = el("button", "boton secundario", a[0]); b.onclick = a[1];
    return b;
  }
  async function ejecutar(fn) { ui.ocupar(true, "Investigación…"); try { await fn(); } catch (e) { ui.mostrarError(e); } finally { ui.ocupar(false); } }

  /** Tarjeta de un tema de la guía. ruta/paso: si viene del tutorial. */
  function mostrarTema(t, ruta, paso, hablarlo) {
    const c = el("div", "inv-cuerpo guia");
    const esTeoria = /^Teoría/.test(t.cat);
    c.appendChild(etiqueta(esTeoria ? "teoria" : "guia", esTeoria ? t.fuente.replace(/^.*?, (?=§|Cap|Ecos)/, "") : t.fuente));
    if (t.complejidad) c.appendChild(el("span", "guia-nivel", "Nivel de complejidad: " + t.complejidad));
    if (ruta) {
      const total = Guia.RUTAS[ruta].length;
      const prog = el("div", "guia-progreso");
      prog.appendChild(el("span", "", `Tutorial ${ENFOQUES[ruta].nombre.toLowerCase()} · paso ${paso + 1} de ${total}`));
      const barra = el("i", "barra"); const r = el("i"); r.style.width = Math.round((paso + 1) / total * 100) + "%"; barra.appendChild(r); prog.appendChild(barra);
      c.appendChild(prog);
    }
    c.appendChild(el("p", "guia-resumen", t.resumen));
    if (t.puntos && t.puntos.length) { const ul = el("ul", "guia-puntos"); t.puntos.forEach(x => ul.appendChild(el("li", "", x))); c.appendChild(ul); }
    const desplegable = (titulo, xs, ordenada, abierto) => {
      if (!xs || !xs.length) return;
      const d = el("details", "guia-mas"); if (abierto) d.open = true;
      d.appendChild(el("summary", "", titulo));
      const l = el(ordenada ? "ol" : "ul", "guia-puntos"); xs.forEach(x => l.appendChild(el("li", "", x))); d.appendChild(l);
      c.appendChild(d);
    };
    desplegable("Tipos", t.tipos);
    desplegable("Cómo se construye", t.pasos, true, esTeoria);
    desplegable("Partes", t.partes, true);
    desplegable("Ejemplos por nivel académico", t.niveles);
    if (t.ejemplo) { const ej = el("div", "guia-caja ejemplo"); ej.appendChild(el("b", "", "Ejemplo")); ej.appendChild(el("span", "", t.ejemplo)); c.appendChild(ej); }
    if (t.error) { const er = el("div", "guia-caja error"); er.appendChild(el("b", "", "Error frecuente")); er.appendChild(el("span", "", t.error)); c.appendChild(er); }
    const acc = el("div", "inv-acciones");
    const bEsc = el("button", "boton secundario", "Escuchar"); bEsc.onclick = () => ui.hablar(`${t.titulo}. ${t.resumen} ${(t.puntos || []).join(" ")}`);
    acc.appendChild(bEsc);
    if (!Config.faltaClave()) {
      const bAp = el("button", "boton secundario", "Revisar mi documento con esto");
      bAp.onclick = () => ejecutar(() => aplicarTema(t));
      acc.appendChild(bAp);
    }
    const bx = botonAccion(t); if (bx) acc.appendChild(bx);
    if (esTeoria && ((t.pasos && t.pasos.length) || (t.partes && t.partes.length)) && !Config.faltaClave()) {
      const bc = el("button", "boton primario", "Construir uno para mi proyecto");
      bc.onclick = () => ejecutar(() => construir(t, ""));
      acc.appendChild(bc);
    }
    c.appendChild(acc);
    if (ruta) {
      const nav = el("div", "inv-acciones guia-nav");
      const ant = el("button", "boton secundario", "← Anterior"); ant.disabled = paso === 0; ant.onclick = () => pasoTutorial(-1);
      const sig = el("button", "boton primario", paso + 1 < Guia.RUTAS[ruta].length ? "Siguiente →" : "Terminar"); sig.onclick = () => paso + 1 < Guia.RUTAS[ruta].length ? pasoTutorial(1) : salirTutorial();
      nav.append(ant, sig);
      c.appendChild(nav);
    } else {
      const rel = Guia.buscar(t.titulo + " " + t.claves.slice(0, 3).join(" "), 4).filter(x => x.t.id !== t.id).slice(0, 3);
      if (rel.length) {
        const r = el("div", "guia-relacionados"); r.appendChild(el("span", "", "Relacionados:"));
        rel.forEach(x => { const a = el("button", "enlace-sutil", x.t.titulo); a.onclick = () => mostrarTema(x.t); r.appendChild(a); });
        c.appendChild(r);
      }
    }
    tarjeta(t.titulo, c);
    if (hablarlo) ui.hablar(`${t.titulo}. ${t.resumen}`);
  }

  /** Índice de la guía con buscador. */
  function indiceGuia(soloTeoria) {
    const c = el("div", "inv-cuerpo guia");
    c.appendChild(el("p", "inv-nota", soloTeoria
      ? "«Teoría: conocimiento científico» de Brian Gonzalo Suárez Acevedo (2025): los elementos con los que se construye el conocimiento (axiomas, postulados, constructos, modelos, teorías…) y los modelos del autor. Pregunta («Ok Romus, ¿qué es un postulado?») o pide «ayúdame a construir un axioma para mi tesis»."
      : "Guía metodológica de Romus, redactada a partir de Hernández Sampieri et al. (2014) y Martínez Miguélez (2004), más la Teoría de Brian Suárez. Pregunta con la voz («Ok Romus, ¿qué es la saturación?») o elige un tema."));
    const fila = el("div", "guia-buscar");
    const inp = el("input"); inp.placeholder = "¿Qué quieres saber? Ej.: tipos de muestreo";
    const b = el("button", "boton primario", "Buscar");
    const ir = () => { const v = inp.value.trim(); if (v) ejecutar(() => preguntar(v)); };
    b.onclick = ir; inp.onkeydown = (e) => { if (e.key === "Enter") ir(); };
    fila.append(inp, b); c.appendChild(fila);
    if (!soloTeoria) { const tut = el("button", "boton secundario", `▶ Tutorial paso a paso (${enfoque().nombre.toLowerCase()})`); tut.onclick = () => iniciarTutorial(); c.appendChild(tut); }
    Guia.categorias().filter(cat => !soloTeoria || /^Teoría/.test(cat)).forEach(cat => {
      const d = el("details", "guia-cat");
      d.appendChild(el("summary", "", cat));
      Guia.TEMAS.filter(t => t.cat === cat).forEach(t => { const a = el("button", "guia-tema", t.titulo); a.onclick = () => mostrarTema(t); d.appendChild(a); });
      c.appendChild(d);
    });
    if (soloTeoria) c.querySelectorAll(".guia-cat").forEach(d => d.open = true);
    tarjeta(soloTeoria ? "Teoría · Brian Suárez" : "Guía metodológica", c);
    setTimeout(() => inp.focus(), 50);
  }

  /** Responde una duda: con la guía local (rápido, sin internet) o con la IA apoyada en la guía. */
  async function preguntar(pregunta, signal) {
    const res = Guia.buscar(pregunta, 3);
    const definicion = /\b(que es|que son|que significa|cuales son|tipos de|que tipos|diferencia|define|definicion)\b/.test(Guia.norm(pregunta));
    const fuerte = res.length && res[0].puntos >= 5;
    registrar("Consulta a la guía", pregunta, "guia");
    if ((fuerte && definicion) || Config.faltaClave() || !res.length) {
      if (!res.length) { ui.agregarMensaje("ia", "No encontré ese tema en la guía. Prueba con otras palabras o abre la guía completa."); indiceGuia(); return; }
      mostrarTema(res[0].t, null, null, true);
      return;
    }
    // IA apoyada en la guía (RAG sobre contenido propio).
    const contexto = res.map(r => Guia.textoPlano(r.t)).join("\n\n---\n\n");
    const doc = await documentoNumerado().catch(() => ({ texto: "" }));
    const d = await pedirHerramienta("respuesta_guia", "Responde la duda metodológica del usuario apoyándote en la guía de Romus.",
      { type: "object", properties: {
        respuesta: { type: "string", description: "Respuesta clara, en 3 a 7 frases, en español, sin markdown" },
        cubierto_por_guia: { type: "boolean", description: "true si la respuesta se apoya principalmente en la guía" },
        aplicacion: { type: "string", description: "Si el documento del usuario tiene algo relacionado, una sugerencia concreta para su proyecto; si no, vacío" }
      }, required: ["respuesta", "cubierto_por_guia"] },
      `Duda del usuario: «${pregunta}»\n\nGUÍA DE ROMUS (fuente principal; respétala):\n${contexto}\n\nDOCUMENTO DEL USUARIO (contexto, puede estar vacío):\n${(doc.texto || "").slice(0, 15000)}\n\nSi la guía no cubre la duda, respóndela con tu conocimiento y marca cubierto_por_guia=false.`, signal);
    const c = el("div", "inv-cuerpo guia");
    const deTeoria = /^Teoría/.test(res[0].t.cat);
    c.appendChild(etiqueta(d.cubierto_por_guia ? (deTeoria ? "teoria" : "guia") : "modelo", d.cubierto_por_guia ? res[0].t.fuente : ""));
    c.appendChild(el("p", "guia-resumen", d.respuesta));
    if (d.aplicacion) { const ap = el("div", "guia-caja ejemplo"); ap.appendChild(el("b", "", "En tu proyecto")); ap.appendChild(el("span", "", d.aplicacion)); c.appendChild(ap); }
    const r = el("div", "guia-relacionados"); r.appendChild(el("span", "", "Ver en la guía:"));
    res.forEach(x => { const a = el("button", "enlace-sutil", x.t.titulo); a.onclick = () => mostrarTema(x.t); r.appendChild(a); });
    c.appendChild(r);
    tarjeta(pregunta.length > 60 ? pregunta.slice(0, 57) + "…" : pregunta, c);
    ui.hablar(d.respuesta);
  }

  /** Construye un elemento (axioma, postulado, constructo, modelo…) para el proyecto del usuario, siguiendo la Teoría. */
  function singular(t) {
    const k = Object.keys(ELEMENTOS_VOZ).find(x => ELEMENTOS_VOZ[x] === t.id);
    const n = k ? k.replace("enunciado empirico", "enunciado empírico").replace("enunciado teorico", "enunciado teórico").replace("definicion", "definición").replace("simulacion", "simulación").replace("hipotesis", "hipótesis").replace("teoria", "teoría").replace("metateoria", "metateoría").replace("inferencia", "inferencia").replace("proposicion", "proposición") : t.titulo;
    return n.charAt(0).toUpperCase() + n.slice(1);
  }

  async function construir(t, tema, signal) {
    const doc = await documentoNumerado().catch(() => ({ texto: "", parrafos: [] }));
    const partes = (t.partes || []).map(p => p.split(":")[0].trim()).filter(Boolean);
    const d = await pedirHerramienta("construir_elemento", `Construye ${t.titulo.toLowerCase()} para el proyecto del usuario siguiendo la Teoría de Brian Suárez.`,
      { type: "object", properties: {
        partes: { type: "array", items: { type: "object", properties: { parte: { type: "string" }, contenido: { type: "string" } }, required: ["parte", "contenido"] },
          description: partes.length ? "Una entrada por cada parte: " + partes.join(", ") : "Las partes que correspondan" },
        enunciado: { type: "string", description: "El elemento redactado de forma completa y lista para insertar" },
        verificacion: { type: "array", items: { type: "string" }, description: "Cómo se cumplen los pasos o criterios de construcción" }
      }, required: ["partes", "enunciado"] },
      `Elemento a construir según la Teoría:\n${Guia.textoPlano(t)}\n\n` +
      (tema ? `Tema que indica el usuario: «${tema}»\n` : "") +
      `Nivel: ${nivel().nombre}. Enfoque: ${enfoque().nombre}.\n\nDOCUMENTO DEL USUARIO (úsalo para que el elemento encaje con su proyecto):\n${(doc.texto || "(vacío)").slice(0, 20000)}`, signal);
    const c = el("div", "inv-cuerpo guia");
    c.appendChild(etiqueta("modelo", "con la Teoría de Suárez (2025)"));
    const enun = el("div", "guia-caja ejemplo"); enun.appendChild(el("b", "", singular(t) + " · propuesta")); enun.appendChild(el("span", "", d.enunciado)); c.appendChild(enun);
    const tabla = el("div", "guia-partes");
    (d.partes || []).forEach(p => { const f = el("div", ""); f.appendChild(el("b", "", p.parte)); f.appendChild(el("span", "", p.contenido)); tabla.appendChild(f); });
    c.appendChild(tabla);
    if (d.verificacion && d.verificacion.length) { const dd = el("details", "guia-mas"); dd.appendChild(el("summary", "", "Cómo cumple los pasos de construcción")); const l = el("ul", "guia-puntos"); d.verificacion.forEach(x => l.appendChild(el("li", "", x))); dd.appendChild(l); c.appendChild(dd); }
    const acc = el("div", "inv-acciones");
    const bi = el("button", "boton primario", "Insertar en el documento");
    bi.onclick = () => ejecutar(async () => {
      const lineas = [`${singular(t)}: ${d.enunciado}`].concat((d.partes || []).map(p => `${p.parte}: ${p.contenido}`));
      await Doc.insertarTexto({ posicion: "en_cursor", texto: lineas.join("\n") });
      registrar("Inserción de " + t.titulo.toLowerCase(), d.enunciado, "modelo");
      ui.confirmar("Lo inserté en el cursor. Revísalo y ajústalo con tu voz de autor.");
    });
    const bv = el("button", "boton secundario", "← Ver la teoría"); bv.onclick = () => mostrarTema(t);
    acc.append(bi, bv); c.appendChild(acc);
    tarjeta("Construir · " + t.titulo, c);
    registrar("Construcción de " + t.titulo.toLowerCase(), d.enunciado, "modelo");
    ui.hablar(`Te propongo: ${d.enunciado}`);
  }

  const ELEMENTOS_VOZ = { axioma: "teo-axiomas", postulado: "teo-postulados", definicion: "teo-definiciones", corolario: "teo-corolarios", simulacion: "teo-simulaciones", paradoja: "teo-paradojas", teorema: "teo-teoremas", tesis: "teo-la-tesis-afirmacion-principal", hipotesis: "teo-hipotesis-segun-la-teoria", constructo: "teo-constructos-teoricos", modelo: "teo-modelos-cientificos", teoria: "teo-teorias-cientificas", ley: "teo-leyes-cientificas", metateoria: "teo-metateorias", paradigma: "teo-paradigmas-segun-la-teoria", supuesto: "teo-supuestos", inferencia: "teo-inferencias", principio: "teo-principios", proposicion: "teo-proposiciones", concepto: "teo-conceptos", problema: "teo-el-problema-cientifico", "enunciado empirico": "teo-enunciados-empiricos", "enunciado teorico": "teo-enunciados-teoricos", argumento: "teo-argumentos-cientificos", premisa: "teo-premisas", variable: "teo-variables-segun-la-teoria", indicador: "teo-indicadores" };

  async function aplicarTema(t, signal) {
    const doc = await documentoNumerado();
    if (doc.parrafos.filter(p => p.texto.trim()).length < 2) throw new Error("Tu documento está casi vacío. Escribe ese apartado y vuelve a pedirlo.");
    const d = await pedirHerramienta("revision_guia", "Revisa el documento del usuario a la luz de un tema de la guía.",
      { type: "object", properties: {
        diagnostico: { type: "string", description: "2 a 4 frases sobre cómo está ese aspecto en el documento" },
        evidencia: { type: "string", description: "Fragmento literal del documento relacionado (máx. 25 palabras); vacío si no existe" },
        mejoras: { type: "array", items: { type: "string" }, description: "2 a 4 mejoras concretas" }
      }, required: ["diagnostico", "mejoras"] },
      `Tema de la guía:\n${Guia.textoPlano(t)}\n\nRevisa este aspecto en el DOCUMENTO:\n${doc.texto}`, signal);
    const i = d.evidencia ? verificar(d.evidencia, doc.parrafos) : -1;
    const c = el("div", "inv-cuerpo guia");
    c.appendChild(etiqueta(i >= 0 ? "documento" : "modelo"));
    c.appendChild(el("p", "guia-resumen", d.diagnostico));
    if (i >= 0) { const b = el("button", "enlace-sutil", "Ir al texto relacionado"); b.onclick = () => irA(i); c.appendChild(b); }
    const ul = el("ul", "guia-puntos"); (d.mejoras || []).forEach(x => ul.appendChild(el("li", "", x))); c.appendChild(ul);
    const v = el("button", "boton secundario", "← Volver al tema"); v.onclick = () => mostrarTema(t); c.appendChild(v);
    tarjeta("Tu documento · " + t.titulo, c);
    registrar("Revisión con la guía", t.titulo, i >= 0 ? "documento" : "modelo");
    ui.hablar(d.diagnostico);
  }

  function iniciarTutorial() {
    tutorialActivo = true;
    const ruta = enfoque().id;
    const t = Config.get().tutorial || {};
    const paso = t.ruta === ruta ? Math.min(t.paso || 0, Guia.RUTAS[ruta].length - 1) : 0;
    Config.set({ tutorial: { ruta, paso } });
    mostrarTema(Guia.tema(Guia.RUTAS[ruta][paso]), ruta, paso, true);
    if (paso === 0) ui.agregarMensaje("ia", `Empezamos el tutorial de la ruta ${enfoque().nombre.toLowerCase()}. Di «siguiente paso» para avanzar o «paso anterior» para volver.`);
  }
  function pasoTutorial(delta) {
    const t = Config.get().tutorial;
    if (!t || !Guia.RUTAS[t.ruta]) return iniciarTutorial();
    tutorialActivo = true;
    const paso = Math.max(0, Math.min(Guia.RUTAS[t.ruta].length - 1, (t.paso || 0) + delta));
    Config.set({ tutorial: { ruta: t.ruta, paso } });
    mostrarTema(Guia.tema(Guia.RUTAS[t.ruta][paso]), t.ruta, paso, true);
  }
  function salirTutorial() {
    tutorialActivo = false;
    Config.set({ tutorial: null });
    $("invResultado").classList.add("oculto");
    ui.agregarMensaje("ia", "Terminaste el tutorial. Cuando quieras repasar un tema, pregúntame o abre la guía.");
    ui.hablar("Terminaste el tutorial. Pregúntame cuando tengas dudas.");
  }

  /* ================= Comandos de voz ================= */

  const NUM = { uno: 0, una: 0, primero: 0, primera: 0, "1": 0, dos: 1, segundo: 1, segunda: 1, "2": 1, tres: 2, tercero: 2, tercera: 2, "3": 2, cuatro: 3, cuarto: 3, cuarta: 3, "4": 3, cinco: 4, quinto: 4, quinta: 4, "5": 4, seis: 5, sexto: 5, sexta: 5, "6": 5 };
  const RE_NIVEL = /(pregrado|especializacion|maestria|doctorado|posdoctorado|postdoctorado)/;

  /** Devuelve una función si el comando es del modo investigación; si no, null. n = texto normalizado; original = texto con tildes. */
  function comando(n, original, signal) {
    const tarea = (fn) => async () => {
      ui.ocupar(true, "Investigación…");
      try { await fn(); } catch (e) { ui.mostrarError(e); } finally { ui.ocupar(false); }
    };
    let m = n.match(/^(nivel|modo|el nivel es|trabajo de|es (una|un) (tesis|trabajo|proyecto) de|soy (estudiante|investigador) de) ?(de )?(pregrado|especializacion|maestria|doctorado|posdoctorado|postdoctorado)$/) ||
            n.match(/^(cambia|pon|usa) (el )?nivel (a |de )?(pregrado|especializacion|maestria|doctorado|posdoctorado|postdoctorado)$/);
    if (m) return () => { const id = n.match(RE_NIVEL)[1].replace("postdoctorado", "posdoctorado"); const v = fijarNivel(id); ui.agregarMensaje("ia", `Nivel: ${v.nombre} (${v.producto}).`); ui.hablar(`Perfecto, trabajamos a nivel de ${v.nombre}.`); };
    m = n.match(/^(enfoque|ruta|metodo|investigacion|es|sera) ?(es )?(cuantitativ[oa]|cualitativ[oa]|mixt[oa])$/) || n.match(/^(cambia|pon|usa) (el )?(enfoque|la ruta) (a |de )?(cuantitativ[oa]|cualitativ[oa]|mixt[oa])$/);
    if (m) return () => { const id = n.match(/(cuantitativ|cualitativ|mixt)/)[1]; const v = fijarEnfoque({ cuantitativ: "cuantitativo", cualitativ: "cualitativo", mixt: "mixto" }[id]); ui.agregarMensaje("ia", `Enfoque: ${v.nombre}.`); ui.hablar(`Entendido, enfoque ${v.nombre.toLowerCase()}.`); };
    if (/^(inserta|crea|arma|genera|pon|dame) (la |una )?(estructura|plantilla)( de (la|mi|una) (tesis|proyecto|trabajo|propuesta))?( de (pregrado|especializacion|maestria|doctorado|posdoctorado))?$/.test(n)) {
      const nv = n.match(RE_NIVEL); if (nv) fijarNivel(nv[1]);
      return tarea(insertarEstructura);
    }
    if (/^(revisa|analiza|evalua|haz|dame|verifica)( la| una| mi)? (coherencia|matriz de coherencia)( del (proyecto|documento))?$|^matriz de coherencia$|^(es|esta) coherente (mi|el) proyecto$/.test(n)) return tarea(() => coherencia(signal));
    if (/^(evalua|califica|revisa)( mi| el| la)? (proyecto|propuesta|tesis|documento)? ?(con|segun) (la )?rubrica$|^(evalua|califica)( mi| el| la)? (proyecto|propuesta|tesis)$|^(autoevaluacion|rubrica)$/.test(n)) return tarea(() => evaluarRubrica(signal));
    m = original.match(/^\s*(?:busca(?:me)?|encuentra|dame)\s+(?:literatura|autores|art[ií]culos|referencias|fuentes|antecedentes|estudios|investigaciones)\s+(?:sobre|de|acerca de|del|para)\s+(.{3,})$/i);
    if (m) { const todas = /\b(todas las [ée]pocas|cl[aá]sic[oa]s|sin l[ií]mite)\b/i.test(m[1]); return tarea(() => literatura(m[1].replace(/[.?!]+$/, ""), { todas })); }
    m = n.match(/^cita (el |la )?(articulo |trabajo |numero |referencia )?(uno|una|primero|primera|dos|segundo|segunda|tres|tercero|tercera|cuatro|cuarto|cuarta|cinco|quinto|quinta|seis|sexto|sexta|[1-6])$/);
    if (m) return tarea(() => citar(NUM[m[3]]));
    m = n.match(/^(ayudame a |quiero |puedes )?(construir|formular|crear|redactar|plantear|elaborar|proponer|hacer|disenar)(me)? (un |una |el |la |mi |mis |unos |unas |los |las )?(axioma|postulado|definicion|corolario|simulacion|paradoja|teorema|tesis|hipotesis|constructo|modelo|teoria|ley|metateoria|paradigma|supuesto|inferencia|principio|proposicion|concepto|problema cientifico|enunciado empirico|enunciado teorico|argumento|premisa|variable|indicador)(e?s)?( cientific[oa]s?| teoric[oa]s?)?\b ?(para|sobre|de|acerca de|con)? ?(.*)$/);
    if (m && !Config.faltaClave()) {
      const clave = m[5].replace(" cientifico", "");
      const t = Guia.tema(ELEMENTOS_VOZ[clave] || ELEMENTOS_VOZ[m[5]]);
      if (t) return tarea(() => construir(t, m[9] || "", signal));
    }
    if (/^((abre|muestra|ver) (la )?)?(teoria|libro de teoria|biblioteca)( de brian( suarez)?| del autor)?$/.test(n)) return () => indiceGuia(true);
    m = original.match(/^\s*(?:ay[uú]dame a\s+)?(?:idear|formular|plantear|convertir)\s*(?:un proyecto|una tesis|una investigaci[oó]n|una pregunta|la idea|mi idea)?\s*(?:sobre|de|acerca de|con|:)?\s*(.*)$/i);
    if (m && /^(ayudame a )?(idear|formular|plantear|convertir)/.test(n)) return tarea(() => idear(m[1], signal));
    if (/(declaracion|registro) (de )?(uso de )?(la )?(ia|inteligencia artificial)/.test(n)) return tarea(declaracion);
    // Guía y tutorial
    if (/^((inicia|empieza|abre|activa|comienza) (el )?)?(modo )?tutorial( de investigacion)?$|^ensename a investigar$/.test(n)) return () => iniciarTutorial();
    if (/^(siguiente|proximo) (paso|tema)$|^avanza$/.test(n) && (tutorialActivo || (Config.get().tutorial && /paso|tema/.test(n)))) return () => pasoTutorial(1);
    if (/^(paso|tema) anterior$|^(regresa|vuelve) (al )?paso anterior$/.test(n)) return () => pasoTutorial(-1);
    if (/^(sal|salir|termina|terminar|cierra) (del |el )?tutorial$/.test(n)) return () => salirTutorial();
    if (/^((abre|muestra|ver) (la )?)?guia( metodologica| de investigacion)?$|^ayuda (de|en) investigacion$/.test(n)) return () => indiceGuia();
    if (/^(que es|que son|que significa|que significan|cuales son|cual es|como (se )?(hace|hago|redacta|redacto|formula|formulo|plantea|planteo|calcula|calculo|elige|elijo|escoge|escojo|define|defino|construye|construyo|elabora|elaboro|valida|valido|analiza|analizo|escribe|escribo|cita|cito|selecciona|selecciono)|para que sirve|diferencia(s)? entre|explicame (que|como|el|la|los|las|en que)|que tipos de|tipos de|guia (de|sobre)|ayuda (con|sobre)|tengo una duda (sobre|con))\b/.test(n)) {
      if (Guia.buscar(original, 1).length) return tarea(() => preguntar(original.replace(/^\s*(ok|oye|hola)?\s*romus[\s,]*/i, "").trim(), signal));
    }
    return null;
  }

  function conectar(funciones) { ui = funciones; }

  return {
    NIVELES, ENFOQUES, nivel, fijarNivel, enfoque, fijarEnfoque, secciones, conectar, comando, etiqueta, registrar, leerRegistro,
    insertarEstructura, idear, coherencia, literatura, citar, evaluarRubrica, declaracion,
    preguntar, indiceGuia, mostrarTema, construir, iniciarTutorial, pasoTutorial, salirTutorial,
    _apa: apa, _verificar: verificar, _partirNombre: partirNombre
  };
})();
