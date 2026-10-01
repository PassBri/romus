/* VozDoc IA — conexión con la API de Claude (Anthropic) y definición de herramientas. */
window.IA = (function () {

  const SISTEMA_GENERAL = `Eres Romus, un asistente de voz integrado en Microsoft Word que ayuda a leer, comprender, corregir y editar documentos mediante comandos de voz o de texto.

Contexto importante:
- Te llamas Romus. Si te preguntan quién eres, di que eres Romus, el asistente de voz para Word.
- El usuario suele hablar por micrófono; su comando puede traer errores de transcripción (palabras parecidas, sin puntuación). Interpreta la intención más probable.
- Los párrafos del documento vienen numerados como [n]. Usa esos números exactos en las herramientas.
- "Esto", "aquí", "este párrafo", "lo seleccionado" o "el texto marcado" se refieren a la selección actual; si no hay selección, al párrafo donde está el cursor.

Cómo actuar:
- Siempre actúas llamando herramientas.
- Para contestar preguntas, resumir, explicar, opinar o conversar usa "responder". Tus respuestas se leerán en voz alta. Sin markdown, sin asteriscos, sin viñetas con símbolos, sin emojis.

Cómo hablas (esto es lo que más se nota):
- Hablas como una persona culta y cercana, en un español natural y fluido, como lo haría un buen asistente conversacional. Nada de frases de robot.
- Ve directo a lo importante. No repitas la orden del usuario ni anuncies lo que vas a hacer («Voy a…», «He procedido a…»); di el resultado.
- Varía tus frases: no empieces siempre igual ni cierres siempre con una pregunta. Pregunta solo si de verdad necesitas algo del usuario.
- Tras una acción, confirma en una frase corta y concreta qué cambió (por ejemplo: «Listo, agregué un párrafo sobre la Luna al final.»).
- Al explicar o resumir, usa frases completas y bien hiladas, con conectores naturales; adapta la extensión a lo que se pide.
- Usa el tuteo, salvo que el usuario te trate de usted.
- Los textos que escribas en el documento (párrafos, conclusiones, reescrituras) deben tener calidad editorial: precisos, con buena puntuación, sin muletillas ni relleno, con el registro adecuado al documento.
- Para revisar ortografía y gramática de una parte extensa o de todo el documento usa "corregir".
- Para cambios puntuales (una palabra, una frase) usa "aplicar_correcciones": el campo "original" debe ser una copia literal EXACTA del texto del párrafo.
- Para cambiar todas las apariciones de una palabra o expresión usa "buscar_y_reemplazar".
- Para reescribir (simplificar, hacer más formal, acortar, ampliar, traducir, cambiar el tono) usa "reescribir_parrafos". Conserva el idioma del documento salvo que pidan traducir. Escribe texto plano y separa párrafos con un salto de línea.
- Para redactar contenido nuevo (una conclusión, un título, un párrafo) usa "insertar_texto".
- Para dejar observaciones sin modificar el texto usa "comentar".
- Para negrita, cursiva, subrayado, resaltado, tamaño o convertir en título usa "dar_formato".
- Para leer en voz alta una parte concreta del documento usa "leer_parrafos".
- Nunca inventes información que no esté en el documento; si algo no aparece, dilo.
- Nunca inventes referencias bibliográficas, autores, años ni DOI. Si piden fuentes, usa la herramienta "investigacion" con accion "literatura".
- Si el documento es un proyecto de investigación o una tesis, actúa también como asesor metodológico (método Kuetz): orienta, señala vacíos y explica; si te piden redactar un apartado completo, hazlo como borrador para que el autor lo adapte.
- Puedes llamar varias herramientas en orden si el comando lo requiere.`;

  const ESTILOS_RESPUESTA = {
    natural: "Estilo pedido: natural y cálido, como una conversación con un colega experto. Respuestas habladas de unas 2 a 4 frases, salvo que pidan más.",
    profesional: "Estilo pedido: profesional y preciso, con vocabulario formal y tono sobrio, como un editor académico. Respuestas habladas de unas 2 a 4 frases, salvo que pidan más.",
    breve: "Estilo pedido: muy breve. Responde con una o dos frases como máximo; nada de explicaciones que no se pidieron.",
    detallado: "Estilo pedido: detallado y didáctico. Explica con ejemplos cuando ayuden; respuestas habladas de hasta unas 180 palabras."
  };

  function estiloUsuario() {
    const c = (window.Config && Config.get()) || {};
    let t = "\n\n" + (ESTILOS_RESPUESTA[c.estiloRespuesta] || ESTILOS_RESPUESTA.natural);
    const extra = (c.instrucciones || "").trim();
    if (extra) t += "\n\nINSTRUCCIONES PERSONALES DEL USUARIO (síguelas siempre, salvo que contradigan una orden concreta):\n" + extra;
    return t;
  }

  const SISTEMA_CORRECTOR = `Eres un corrector profesional de textos. Revisas documentos en español según la norma de la RAE y la ASALE (y documentos en otros idiomas según su propia norma).

Recibirás párrafos numerados como [n]. Devuelve, con la herramienta "aplicar_correcciones", cada error encontrado:
- parrafo: el número del párrafo.
- original: copia literal EXACTA del fragmento con error, tal como aparece (mismas tildes, mayúsculas y signos). Lo más corto posible, pero que aparezca una sola vez dentro del párrafo (añade palabras vecinas si hace falta). Máximo 200 caracteres. Nunca incluyas saltos de línea.
- correccion: el texto que debe reemplazar exactamente al fragmento original.
- motivo: explicación muy breve en español (por ejemplo: "tilde diacrítica", "concordancia de número", "coma antes de pero").

Reglas:
- No corrijas nombres propios, citas textuales, referencias bibliográficas, URL, código ni términos técnicos válidos.
- No reescribas lo que ya está correcto ni cambies el sentido.
- Si no hay errores, devuelve la lista vacía.`;

  const NIVELES = {
    ortografia: "Nivel de revisión: solo errores objetivos de ortografía, tildes, puntuación, mayúsculas, concordancia y gramática.",
    estilo: "Nivel de revisión: errores objetivos y además mejoras de estilo y claridad (redundancias, muletillas, frases confusas), sin cambiar el sentido ni el registro del autor."
  };

  const esquemaCorreccion = {
    type: "object",
    properties: {
      parrafo: { type: "integer" },
      original: { type: "string" },
      correccion: { type: "string" },
      motivo: { type: "string" }
    },
    required: ["parrafo", "original", "correccion", "motivo"]
  };

  const HERRAMIENTAS = [
    {
      name: "responder",
      description: "Responde al usuario (se muestra en el panel y se lee en voz alta). Úsalo para preguntas, resúmenes, explicaciones y confirmaciones.",
      input_schema: { type: "object", properties: { texto: { type: "string" } }, required: ["texto"] }
    },
    {
      name: "corregir",
      description: "Inicia una revisión completa de ortografía y gramática por lotes sobre el documento o la selección.",
      input_schema: {
        type: "object",
        properties: {
          alcance: { type: "string", enum: ["documento", "seleccion"] },
          modo: { type: "string", enum: ["cambios", "comentarios"], description: "cambios = corrige el texto (con control de cambios); comentarios = solo deja comentarios" },
          nivel: { type: "string", enum: ["ortografia", "estilo"] }
        },
        required: ["alcance", "modo", "nivel"]
      }
    },
    {
      name: "aplicar_correcciones",
      description: "Aplica reemplazos puntuales dentro de párrafos concretos conservando el formato.",
      input_schema: {
        type: "object",
        properties: { correcciones: { type: "array", items: esquemaCorreccion }, resumen: { type: "string" } },
        required: ["correcciones"]
      }
    },
    {
      name: "buscar_y_reemplazar",
      description: "Reemplaza todas las apariciones de un texto en el documento.",
      input_schema: {
        type: "object",
        properties: {
          buscar: { type: "string" },
          reemplazar: { type: "string" },
          coincidir_mayusculas: { type: "boolean" },
          palabra_completa: { type: "boolean" }
        },
        required: ["buscar", "reemplazar"]
      }
    },
    {
      name: "reescribir_parrafos",
      description: "Reemplaza el contenido de los párrafos desde parrafo_inicio hasta parrafo_fin (inclusive) por texto nuevo.",
      input_schema: {
        type: "object",
        properties: {
          parrafo_inicio: { type: "integer" },
          parrafo_fin: { type: "integer" },
          texto_nuevo: { type: "string" },
          resumen: { type: "string", description: "Qué se cambió, en una frase." }
        },
        required: ["parrafo_inicio", "parrafo_fin", "texto_nuevo"]
      }
    },
    {
      name: "insertar_texto",
      description: "Inserta texto nuevo en el documento.",
      input_schema: {
        type: "object",
        properties: {
          posicion: { type: "string", enum: ["despues_parrafo", "antes_parrafo", "inicio_documento", "final_documento", "en_cursor"] },
          parrafo: { type: "integer", description: "Obligatorio con despues_parrafo o antes_parrafo." },
          texto: { type: "string" },
          resumen: { type: "string" }
        },
        required: ["posicion", "texto"]
      }
    },
    {
      name: "comentar",
      description: "Agrega comentarios de Word sobre fragmentos, sin modificar el texto.",
      input_schema: {
        type: "object",
        properties: {
          comentarios: {
            type: "array",
            items: {
              type: "object",
              properties: {
                parrafo: { type: "integer" },
                fragmento: { type: "string", description: "Copia literal del fragmento comentado (máx. 200 caracteres). Vacío = todo el párrafo." },
                comentario: { type: "string" }
              },
              required: ["parrafo", "comentario"]
            }
          },
          resumen: { type: "string" }
        },
        required: ["comentarios"]
      }
    },
    {
      name: "dar_formato",
      description: "Aplica formato a párrafos o a un fragmento dentro de un párrafo.",
      input_schema: {
        type: "object",
        properties: {
          parrafo_inicio: { type: "integer" },
          parrafo_fin: { type: "integer" },
          fragmento: { type: "string", description: "Opcional: texto literal dentro de parrafo_inicio al que se aplica el formato." },
          negrita: { type: "boolean" },
          cursiva: { type: "boolean" },
          subrayado: { type: "boolean" },
          resaltado: { type: "string", enum: ["amarillo", "verde", "turquesa", "rosa", "ninguno"] },
          tamano: { type: "number" },
          estilo: { type: "string", enum: ["titulo1", "titulo2", "titulo3", "normal"] },
          alineacion: { type: "string", enum: ["izquierda", "centro", "derecha", "justificado"] }
        },
        required: ["parrafo_inicio"]
      }
    },
    {
      name: "leer_parrafos",
      description: "Lee en voz alta los párrafos indicados, seleccionándolos en pantalla.",
      input_schema: {
        type: "object",
        properties: { parrafo_inicio: { type: "integer" }, parrafo_fin: { type: "integer" } },
        required: ["parrafo_inicio"]
      }
    },
    {
      name: "investigacion",
      description: "Funciones del modo investigación de Romus. Úsalo cuando pidan: buscar literatura, autores o antecedentes reales (accion=literatura, tema=palabras clave); revisar la coherencia del proyecto (accion=coherencia); evaluar el proyecto con la rúbrica (accion=rubrica); insertar la estructura de la tesis o proyecto (accion=estructura); idear o formular un proyecto a partir de una idea (accion=idear, tema=la idea); agregar la declaración de uso de IA (accion=declaracion); o explicar un concepto o resolver una duda de metodología de la investigación —qué es, cómo se hace, tipos, diferencias— con la guía metodológica de Romus (accion=guia, tema=la duda tal como la dijo el usuario). NUNCA inventes referencias: para fuentes usa accion=literatura.",
      input_schema: {
        type: "object",
        properties: {
          accion: { type: "string", enum: ["literatura", "coherencia", "rubrica", "estructura", "idear", "declaracion", "guia"] },
          tema: { type: "string" }
        },
        required: ["accion"]
      }
    }
  ];

  /* ===================== Conexión con el proveedor ===================== */

  function describirError(status, mensaje, prov) {
    const quien = prov ? prov.nombre : "la IA";
    if (status === 401) return `La clave de ${quien} no es válida. Revísala en Ajustes.`;
    if (status === 403) return `Tu clave de ${quien} no tiene permiso para este modelo o esta acción.`;
    if (status === 404) return `El modelo o la dirección no existen en ${quien}. Revisa el modelo en Ajustes (usa «Cargar modelos»).`;
    if (status === 429) return `${quien}: se alcanzó el límite de uso. Espera un momento e inténtalo de nuevo.`;
    if (status === 529 || status === 503 || status === 502) return `${quien} está saturado. Inténtalo de nuevo en unos segundos.`;
    if (/credit|balance|quota|billing|insufficient/i.test(mensaje || "")) return `Tu cuenta de ${quien} no tiene saldo o cuota disponible.`;
    return `Error de ${quien} (${status}): ${mensaje || "sin detalle"}`;
  }

  function errorDeConexion(prov, perfil) {
    const local = /localhost|127\.0\.0\.1/.test(perfil.url || "");
    if (local) return `No pude conectar con ${prov.nombre} en ${perfil.url}. Verifica que esté abierto y que permita conexiones desde Word (Ollama: OLLAMA_ORIGINS=* · LM Studio: «Enable CORS»).`;
    return `No pude conectar con ${prov.nombre}. Revisa tu internet y la dirección de la API. Algunos proveedores no aceptan llamadas directas desde el navegador (CORS); en ese caso usa OpenRouter o un servidor intermedio.`;
  }

  function base(url) { return (url || "").trim().replace(/\/+$/, "").replace(/\/(chat\/completions|messages)$/, ""); }

  function cabeceras(prov, perfil) {
    if (prov.tipo === "anthropic") {
      return {
        "content-type": "application/json",
        "x-api-key": perfil.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      };
    }
    const h = { "content-type": "application/json" };
    if (perfil.apiKey) h.authorization = "Bearer " + perfil.apiKey;
    if (prov.id === "openrouter") { h["X-Title"] = "Romus para Word"; }
    return h;
  }

  async function pedir(url, opciones, prov, perfil) {
    for (let intento = 0; intento < 3; intento++) {
      let r;
      try { r = await fetch(url, opciones); }
      catch (e) {
        if (e.name === "AbortError") throw e;
        throw new Error(errorDeConexion(prov, perfil));
      }
      if (r.ok) return r.json();
      let mensaje = "";
      try { const j = await r.json(); mensaje = (j.error && (j.error.message || j.error)) || j.message || ""; if (typeof mensaje !== "string") mensaje = JSON.stringify(mensaje); } catch (e) { /* ignorar */ }
      if ([429, 529, 503, 502].includes(r.status) && intento < 2) {
        await new Promise(res => setTimeout(res, 2500 * (intento + 1)));
        continue;
      }
      const err = new Error(describirError(r.status, mensaje, prov));
      err.status = r.status; err.detalle = mensaje;
      throw err;
    }
  }

  /* --- Traducción entre el formato de Claude (interno) y el compatible con OpenAI --- */

  function aTextoSistema(system) {
    if (!system) return "";
    if (typeof system === "string") return system;
    return system.map(b => b.text).join("\n\n");
  }

  const ESFUERZO_GEMINI = {}; // modelo → "none" | "low" | "" (sin parámetro), según lo que acepte
  const ES_RAZONAMIENTO = /reasoning|thinking|budget/i;

  function aOpenAI(cuerpo, perfil, prov) {
    const mensajes = [];
    const sis = aTextoSistema(cuerpo.system);
    if (sis) mensajes.push({ role: "system", content: sis });
    (cuerpo.messages || []).forEach(m => mensajes.push({ role: m.role, content: typeof m.content === "string" ? m.content : m.content.map(b => b.text || "").join("\n") }));
    const p = { model: perfil.modelo, messages: mensajes };
    // Gemini «piensa» antes de responder y eso lo hace lento; para órdenes cortas se le pide razonar lo mínimo.
    if (prov.id === "gemini") {
      const r = ESFUERZO_GEMINI[perfil.modelo];
      if (r !== "") p.reasoning_effort = r || "none";
    }
    const tope = cuerpo.max_tokens || 8000;
    if (prov.id === "openai") p.max_completion_tokens = tope; else p.max_tokens = tope;
    if (cuerpo.tools) {
      p.tools = cuerpo.tools.map(t => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
      const tc = cuerpo.tool_choice;
      if (tc && tc.type === "tool") p.tool_choice = { type: "function", function: { name: tc.name } };
      else if (tc && tc.type === "any") p.tool_choice = "required";
    }
    return p;
  }

  function desdeOpenAI(j) {
    const msg = (j.choices && j.choices[0] && j.choices[0].message) || {};
    const content = [];
    if (msg.content) content.push({ type: "text", text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) });
    (msg.tool_calls || []).forEach(tc => {
      let input = {};
      try { input = JSON.parse((tc.function && tc.function.arguments) || "{}"); } catch (e) { input = extraerJSON(tc.function.arguments) || {}; }
      content.push({ type: "tool_use", name: tc.function.name, input });
    });
    return { content };
  }

  /* --- Modo básico: para modelos sin soporte de herramientas se piden las acciones en JSON --- */

  function resumirHerramientas(tools) {
    return tools.map(t => `- ${t.name}: ${t.description} Campos: ${JSON.stringify(t.input_schema.properties)}`).join("\n");
  }

  function aModoBasico(cuerpo) {
    const tools = cuerpo.tools || [];
    const obligada = cuerpo.tool_choice && cuerpo.tool_choice.type === "tool" ? cuerpo.tool_choice.name : null;
    const instrucciones = `\n\nFORMATO DE RESPUESTA OBLIGATORIO: responde SOLO con un objeto JSON válido, sin texto antes ni después y sin bloques de código, con esta forma:\n{"acciones":[{"herramienta":"<nombre>","datos":{...}}]}\n` +
      (obligada ? `Usa únicamente la herramienta "${obligada}".\n` : "") +
      `Herramientas disponibles:\n${resumirHerramientas(tools)}`;
    const c = Object.assign({}, cuerpo);
    c.system = aTextoSistema(cuerpo.system) + instrucciones;
    delete c.tools; delete c.tool_choice;
    return c;
  }

  function extraerJSON(texto) {
    if (!texto) return null;
    const limpio = texto.replace(/```(?:json)?/gi, "").trim();
    try { return JSON.parse(limpio); } catch (e) { /* buscar el primer objeto */ }
    const i = limpio.indexOf("{"), f = limpio.lastIndexOf("}");
    if (i >= 0 && f > i) { try { return JSON.parse(limpio.slice(i, f + 1)); } catch (e) { return null; } }
    return null;
  }

  function desdeModoBasico(respuesta) {
    const texto = textoLibre(respuesta);
    const j = extraerJSON(texto);
    if (j && Array.isArray(j.acciones)) {
      return { content: j.acciones.filter(a => a && a.herramienta).map(a => ({ type: "tool_use", name: a.herramienta, input: a.datos || {} })) };
    }
    if (j && Array.isArray(j.correcciones)) return { content: [{ type: "tool_use", name: "aplicar_correcciones", input: j }] };
    return { content: [{ type: "text", text: texto }] };
  }

  const NO_SOPORTA_HERRAMIENTAS = /tool|function.?call|not support|unsupported|unknown parameter|required/i;

  /** Llama al proveedor activo. Recibe y devuelve siempre el formato interno (estilo Claude). */
  async function llamar(cuerpo, signal, perfilForzado) {
    const perfil = perfilForzado || Config.perfil();
    const prov = Config.proveedorDe(perfil);
    if (Config.faltaClave(perfil)) {
      const e = new Error(`Falta la clave de API de ${prov.nombre}. Ábrela en Ajustes (ícono de engranaje).`);
      e.sinClave = true;
      throw e;
    }
    if (!base(perfil.url) || !perfil.modelo) throw new Error("Falta la dirección de la API o el modelo en Ajustes.");

    const basico = perfil.modoBasico && cuerpo.tools;
    const c = basico ? aModoBasico(cuerpo) : cuerpo;

    let respuesta;
    if (prov.tipo === "anthropic") {
      const peticion = Object.assign({ model: perfil.modelo, max_tokens: 8000 }, c);
      respuesta = await pedir(base(perfil.url) + "/messages", { method: "POST", signal, headers: cabeceras(prov, perfil), body: JSON.stringify(peticion) }, prov, perfil);
    } else {
      try {
        const j = await pedir(base(perfil.url) + "/chat/completions", { method: "POST", signal, headers: cabeceras(prov, perfil), body: JSON.stringify(aOpenAI(c, perfil, prov)) }, prov, perfil);
        respuesta = desdeOpenAI(j);
      } catch (e) {
        // Gemini: si el modelo no acepta ese nivel de razonamiento, se prueba el siguiente y se recuerda.
        if (prov.id === "gemini" && e.status === 400 && ES_RAZONAMIENTO.test(e.detalle || "")) {
          const actual = ESFUERZO_GEMINI[perfil.modelo];
          if (actual !== "") {
            ESFUERZO_GEMINI[perfil.modelo] = actual === "low" ? "" : "low";
            return llamar(cuerpo, signal, perfilForzado);
          }
        }
        // Si el modelo no admite herramientas, se reintenta automáticamente en modo básico.
        if (!basico && cuerpo.tools && e.status === 400 && NO_SOPORTA_HERRAMIENTAS.test(e.detalle || "")) {
          const r = await llamar(cuerpo, signal, Object.assign({}, perfil, { modoBasico: true }));
          if (!perfilForzado) { Config.perfil().modoBasico = true; Config.guardar(); } // recordarlo para la próxima vez
          return r;
        }
        throw e;
      }
    }
    if (basico) return desdeModoBasico(respuesta);
    // Algunos modelos responden en texto con JSON aunque se les pidan herramientas.
    if (cuerpo.tools && !llamadasDeHerramienta(respuesta).length) {
      const alt = desdeModoBasico(respuesta);
      if (llamadasDeHerramienta(alt).length) return alt;
    }
    return respuesta;
  }

  /** Lista los modelos disponibles del proveedor. */
  async function listarModelos(perfil) {
    const prov = Config.proveedorDe(perfil);
    const j = await pedir(base(perfil.url) + "/models", { method: "GET", headers: cabeceras(prov, perfil) }, prov, perfil);
    const lista = (j.data || j.models || []).map(m => (m.id || m.name || "").replace(/^models\//, "")).filter(Boolean);
    return Array.from(new Set(lista)).sort();
  }

  function llamadasDeHerramienta(respuesta) {
    return (respuesta.content || []).filter(b => b.type === "tool_use").map(b => ({ nombre: b.name, datos: b.input || {} }));
  }

  function textoLibre(respuesta) {
    return (respuesta.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  }

  /** Comando general: devuelve la lista de herramientas que la IA quiere ejecutar. */
  async function interpretar({ documento, estadoSeleccion, historial, comando, signal }) {
    const mensajes = historial.slice(-8).concat([{
      role: "user",
      content: `${estadoSeleccion}\n\nComando del usuario: «${comando}»`
    }]);
    const respuesta = await llamar({
      system: [
        { type: "text", text: SISTEMA_GENERAL + estiloUsuario() },
        { type: "text", text: "DOCUMENTO ACTUAL (párrafos numerados):\n\n" + documento, cache_control: { type: "ephemeral" } }
      ],
      messages: mensajes,
      tools: HERRAMIENTAS,
      tool_choice: { type: "any" }
    }, signal);
    const llamadas = llamadasDeHerramienta(respuesta);
    if (!llamadas.length) {
      const t = textoLibre(respuesta);
      if (t) llamadas.push({ nombre: "responder", datos: { texto: t } });
    }
    return llamadas;
  }

  /** Revisión por lotes: devuelve las correcciones de un grupo de párrafos. */
  async function revisarLote({ textoLote, nivel, signal }) {
    const respuesta = await llamar({
      system: SISTEMA_CORRECTOR + "\n\n" + (NIVELES[nivel] || NIVELES.ortografia),
      messages: [{ role: "user", content: "Revisa estos párrafos:\n\n" + textoLote }],
      tools: [HERRAMIENTAS.find(h => h.name === "aplicar_correcciones")],
      tool_choice: { type: "tool", name: "aplicar_correcciones" }
    }, signal);
    const llamada = llamadasDeHerramienta(respuesta)[0];
    return (llamada && Array.isArray(llamada.datos.correcciones)) ? llamada.datos.correcciones : [];
  }

  /** Prueba la conexión y la calidad: pide corregir una frase con errores conocidos. */
  async function probarConexion(perfil) {
    const t0 = performance.now();
    const texto = "[0] Ayer fuimos aver la pelicula y nos gusto mucho a todos.";
    const respuesta = await llamar({
      system: SISTEMA_CORRECTOR + "\n\n" + NIVELES.ortografia,
      messages: [{ role: "user", content: "Revisa estos párrafos:\n\n" + texto }],
      tools: [HERRAMIENTAS.find(h => h.name === "aplicar_correcciones")],
      tool_choice: { type: "tool", name: "aplicar_correcciones" },
      max_tokens: 1500
    }, undefined, perfil);
    const segundos = (performance.now() - t0) / 1000;
    const llamada = llamadasDeHerramienta(respuesta)[0];
    const correcciones = (llamada && Array.isArray(llamada.datos.correcciones)) ? llamada.datos.correcciones : [];
    const validas = correcciones.filter(c => c.original && texto.includes(c.original) && c.original !== c.correccion);
    return { segundos, total: correcciones.length, validas: validas.length, herramientas: !!llamada };
  }

  return { interpretar, revisarLote, probarConexion, listarModelos, llamar, herramientasDe: llamadasDeHerramienta, textoLibre };
})();
