/* Romus · APA 7: asesor (dudas + generador de referencias) y revisor de normas.
   Contenido escrito para Romus con base en el Manual de publicaciones de la APA (7.ª ed., 2020)
   y su edición en español (2021). Las reglas del revisor son deterministas: la IA solo se usa,
   si el usuario lo pide, para proponer correcciones de referencias, y esas propuestas se verifican. */
window.APA = (function () {
  const H = () => Inv._h;
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const FUENTE = "Manual de publicaciones de la APA, 7.ª ed. (2020; edición en español, 2021)";

  /* ================= 1. Base de conocimiento (se suma a la guía de Romus) ================= */
  const T = (id, titulo, claves, resumen, puntos, ejemplo, error) => ({ id: "apa-" + id, cat: "APA 7", titulo, claves, resumen, puntos, ejemplo, error, fuente: FUENTE });
  const TEMAS = [
    T("cita-basica", "Cómo citar en el texto (autor-fecha)", ["citar", "cita", "como cito", "como se cita", "cita parentetica", "cita narrativa", "autor fecha", "citas en el texto"],
      "APA usa el sistema autor-fecha. La cita puede ir entre paréntesis al final de la idea (parentética) o integrada en la frase (narrativa). Cada cita del texto debe tener su referencia en la lista final, y cada referencia debe estar citada.",
      ["Parentética: (Pérez, 2020).", "Narrativa: Pérez (2020) señala que…", "Si citas textualmente, agrega la página: (Pérez, 2020, p. 15).", "Varias obras en la misma cita: en orden alfabético y separadas con punto y coma: (Gómez, 2018; Pérez, 2020)."],
      "El juego cooperativo reduce los conflictos en el recreo (Ruiz, 2021). / Ruiz (2021) encontró que el juego cooperativo reduce los conflictos.",
      "Poner el nombre completo del autor, el título de la obra o la página web dentro de la cita."),
    T("autores", "Uno, dos, tres o más autores", ["dos autores", "tres autores", "varios autores", "et al", "cuantos autores", "y o &"],
      "Con uno o dos autores se escriben siempre los apellidos. Con tres o más, desde la primera cita se escribe solo el primer apellido seguido de «et al.». En textos en español, los dos autores se unen con «y», no con «&».",
      ["1 autor: (Pérez, 2020).", "2 autores: (Pérez y Gómez, 2020) · Pérez y Gómez (2020).", "3 o más: (Pérez et al., 2020) · Pérez et al. (2020).", "«et al.» lleva punto y no va en cursiva."],
      "(Hernández et al., 2019) — aunque la obra tenga cinco autores.",
      "Escribir los tres apellidos la primera vez (eso era APA 6) o usar «&» en un texto en español."),
    T("corporativo", "Autor institucional y siglas", ["autor institucional", "autor corporativo", "organizacion", "ministerio", "sigla en la cita", "oms", "unesco", "dane", "men"],
      "Cuando el autor es una institución, se escribe su nombre completo. Si tiene una sigla conocida, la primera cita lleva el nombre completo con la sigla entre corchetes; las siguientes, solo la sigla. En la lista de referencias va el nombre completo, sin sigla.",
      ["Primera cita: (Ministerio de Educación Nacional [MEN], 2022).", "Siguientes: (MEN, 2022).", "Narrativa: el Ministerio de Educación Nacional (MEN, 2022) establece…", "Referencia: Ministerio de Educación Nacional. (2022). Título…"],
      "(Organización Mundial de la Salud [OMS], 2020) y después (OMS, 2020).",
      "Usar la sigla desde la primera vez sin haberla presentado."),
    T("sin-autor-fecha", "Obras sin autor o sin fecha", ["sin autor", "sin fecha", "s f", "anonimo", "no tiene autor", "no tiene fecha"],
      "Si no hay autor, el título pasa al lugar del autor: en la cita se usan las primeras palabras del título. Si no hay fecha, se escribe «s. f.» (sin fecha).",
      ["Sin autor: («Convivencia escolar en Colombia», 2021) si es un artículo o página; en cursiva si es un libro o informe.", "Sin fecha: (Pérez, s. f.) · Referencia: Pérez, A. (s. f.). Título…", "Solo se usa «Anónimo» si la obra está firmada así."],
      "(Instituto Colombiano de Bienestar Familiar, s. f.)",
      "Escribir «s.f.» sin espacio o inventar un año aproximado."),
    T("textual", "Citas textuales cortas y largas", ["cita textual", "citar textualmente", "cita larga", "cita en bloque", "40 palabras", "comillas", "cita directa"],
      "Cuando copias las palabras exactas de una fuente debes indicar la página (o el párrafo si no hay páginas). Si la cita tiene menos de 40 palabras va entre comillas dentro del párrafo; si tiene 40 o más, va en un bloque aparte, con sangría de 1,27 cm y sin comillas.",
      ["Corta: «el juego es un espacio de aprendizaje social» (Ruiz, 2021, p. 34).", "Larga: bloque con sangría, sin comillas; la cita (Ruiz, 2021, p. 34) va después del punto final.", "Sin páginas: (Ruiz, 2021, párr. 4).", "Omisiones dentro de la cita: […]."],
      "Ruiz (2021) afirma que «el recreo es el aula más grande de la escuela» (p. 12).",
      "Citar textualmente sin página, o abusar de las citas textuales en lugar de parafrasear."),
    T("parafrasis", "Parafrasear bien", ["parafrasis", "parafrasear", "con mis palabras", "plagio", "resumir una fuente"],
      "Parafrasear es explicar la idea de un autor con tus propias palabras y tu propia estructura. Aunque no copies palabras, la idea es del autor: se cita igual, sin necesidad de página (aunque puedes incluirla).",
      ["Lee, cierra la fuente y escribe la idea como la entendiste.", "Cambia la estructura, no solo algunas palabras.", "Cita al final de la idea o al inicio, de forma narrativa.", "Si la paráfrasis ocupa varias oraciones seguidas, no hace falta repetir la cita en cada una mientras quede claro que sigue siendo la misma fuente."],
      "Original: «La cooperación en el juego disminuye la agresividad». Paráfrasis: cuando los niños juegan en equipo, las conductas agresivas bajan (Ruiz, 2021).",
      "Cambiar dos o tres palabras de la frase original: eso sigue siendo plagio."),
    T("secundaria", "Cita de cita (fuente secundaria)", ["cita de cita", "como se cito en", "fuente secundaria", "citado por", "citado en"],
      "Si no leíste la obra original sino otra que la cita, menciona la original y la que leíste con «como se citó en». En la lista de referencias va solo la obra que leíste. Úsala con moderación: lo mejor es buscar la original.",
      ["(Piaget, 1970, como se citó en Ruiz, 2021).", "Narrativa: Piaget (1970, como se citó en Ruiz, 2021) planteó…", "Referencias: solo Ruiz (2021)."],
      "Vygotsky (1978, como se citó en Gómez, 2019) consideraba el juego como zona de desarrollo próximo.",
      "Poner en referencias la obra original que no leíste."),
    T("comunicacion", "Entrevistas, clases y comunicaciones personales", ["comunicacion personal", "entrevista", "correo", "conversacion", "clase", "whatsapp"],
      "Lo que no puede consultar otra persona (un correo, una conversación, una clase no grabada) es una comunicación personal: se cita en el texto con la fecha exacta y no va en la lista de referencias. Las entrevistas a tus participantes no se citan así: son tus datos y se identifican con códigos.",
      ["(A. Gómez, comunicación personal, 3 de marzo de 2026).", "A. Gómez (comunicación personal, 3 de marzo de 2026) explicó…", "Participantes: «…» (P3) o (E2, docente)."],
      "(M. Rojas, comunicación personal, 12 de abril de 2026)",
      "Incluir comunicaciones personales en la lista de referencias."),
    T("ia", "Cómo citar una IA (ChatGPT, Claude, Gemini)", ["chatgpt", "inteligencia artificial", "citar ia", "citar chatgpt", "claude", "gemini", "copilot", "ia generativa"],
      "APA recomienda describir en el método cómo usaste la herramienta y citar a la empresa que la creó como autora, con la versión del modelo. Si citas lo que respondió, explica qué le pediste (el texto completo del pedido puede ir en un anexo). Revisa además la política de tu universidad.",
      ["Cita: (OpenAI, 2025) · (Anthropic, 2026).", "Referencia: OpenAI. (2025). ChatGPT (versión del 14 de marzo) [Modelo de lenguaje grande]. https://chat.openai.com", "Referencia: Anthropic. (2026). Claude (Opus 5.5) [Modelo de lenguaje grande]. https://claude.ai", "Romus también redacta tu «declaración de uso de IA»."],
      "Al pedirle a Claude que resumiera la teoría de Vygotsky, respondió que… (Anthropic, 2026).",
      "Citar a la IA como autora de ideas académicas o usar sus respuestas como si fueran fuentes verificadas."),
    T("referencias", "La lista de referencias", ["lista de referencias", "referencias", "bibliografia", "como hacer las referencias", "orden de las referencias", "sangria francesa"],
      "Va al final, en una página nueva titulada «Referencias» (centrado, en negrita). Incluye solo las obras citadas, en orden alfabético por el apellido del primer autor, con sangría francesa de 1,27 cm e interlineado doble. Cada referencia tiene cuatro partes: autor, fecha, título y fuente.",
      ["Autor: Apellido, A. A. (hasta 20 autores; no se usa «et al.» en la lista).", "Fecha: (2020). — o (2020, 5 de marzo) para periódicos y webs.", "Título: en cursiva si es una obra independiente (libro, informe, tesis, web); sin cursiva si es parte de otra (artículo, capítulo).", "Fuente: revista, volumen y número, páginas; editorial; o URL. El DOI se escribe como enlace: https://doi.org/…", "«Recuperado de» solo se usa si el contenido cambia con el tiempo, con la fecha de consulta."],
      "Ruiz, M. y Pérez, A. (2021). El juego cooperativo en el recreo escolar. Revista de Educación Física, 12(3), 45-60. https://doi.org/10.1234/ref.2021.03",
      "Llamarla «Bibliografía» incluyendo obras no citadas, o numerarla."),
    T("ref-tipos", "Ejemplos de referencias por tipo de fuente", ["referencia de libro", "referencia de articulo", "referencia de tesis", "referencia de pagina web", "referencia de capitulo", "como referencio", "referenciar"],
      "Cada tipo de fuente tiene su forma. Con el generador de referencias de Romus eliges el tipo, llenas los datos y obtienes la referencia y la cita listas.",
      ["Artículo: Apellido, A. (2020). Título del artículo. Nombre de la Revista, 12(3), 45-67. https://doi.org/…", "Libro: Apellido, A. (2020). Título del libro (2.ª ed.). Editorial.", "Capítulo: Apellido, A. (2020). Título del capítulo. En B. Editor (Ed.), Título del libro (pp. 10-25). Editorial.", "Tesis: Apellido, A. (2020). Título de la tesis [Tesis de maestría, Universidad X]. Repositorio X. https://…", "Página web: Organización. (2020, 5 de marzo). Título de la página. Nombre del sitio. https://…", "Video: Canal. (2020, 5 de marzo). Título del video [Video]. YouTube. https://…"],
      "Di «Ok Romus, genera una referencia» y elige el tipo.",
      "Usar el mismo formato para todo tipo de fuente."),
    T("leyes", "Leyes, decretos y normas", ["ley", "decreto", "resolucion", "norma", "constitucion", "como cito una ley", "jurisprudencia", "sentencia"],
      "APA remite a los estilos jurídicos de cada país. En Colombia es frecuente esta adaptación: autor (la entidad que la expide), fecha de expedición, nombre de la norma en cursiva con su epígrafe, y la publicación oficial. Consulta siempre la indicación de tu universidad.",
      ["Cita: (Ley 1581 de 2012) o (Congreso de la República de Colombia, 2012).", "Referencia: Congreso de la República de Colombia. (2012, 17 de octubre). Ley 1581 de 2012. Por la cual se dictan disposiciones generales para la protección de datos personales. Diario Oficial n.° 48.587.", "Constitución: (Constitución Política de Colombia, 1991, art. 67).", "Sentencias: Corte Constitucional de Colombia. (2020). Sentencia T-xxx de 2020 (M. P. Nombre)."],
      "La educación es un derecho de la persona y un servicio público (Constitución Política de Colombia, 1991, art. 67).",
      "Citar una ley sin año o sin el artículo cuando te refieres a uno específico."),
    T("formato-doc", "Formato del documento (APA 7, estudiantes)", ["formato apa", "margenes", "interlineado", "fuente", "letra", "tamano de letra", "sangria", "portada", "numero de pagina"],
      "El trabajo de estudiante en APA 7 usa interlineado doble en todo el documento, sangría de 1,27 cm en la primera línea de cada párrafo, márgenes de 2,54 cm y una fuente legible. Romus lo aplica con «formato APA».",
      ["Fuentes: Times New Roman 12, Calibri 11, Arial 11, Georgia 11 o Lucida Sans Unicode 10.", "Texto alineado a la izquierda (sin justificar), salvo que tu universidad pida lo contrario.", "Número de página arriba a la derecha, desde la portada.", "Portada de estudiante: título en negrita, autor, institución, programa, curso, docente y fecha."],
      "Di «Ok Romus, aplica el formato APA».",
      "Usar interlineado de 1,5 o justificar si la norma de tu universidad no lo pide."),
    T("titulos", "Niveles de títulos", ["titulos", "niveles de titulo", "encabezados", "subtitulos", "jerarquia de titulos"],
      "APA 7 tiene cinco niveles de título. No se numeran, salvo que tu universidad lo pida.",
      ["Nivel 1: centrado, en negrita.", "Nivel 2: a la izquierda, en negrita.", "Nivel 3: a la izquierda, en negrita y cursiva.", "Nivel 4: con sangría, en negrita, termina en punto y el texto sigue en la misma línea.", "Nivel 5: con sangría, en negrita y cursiva, termina en punto y el texto sigue en la misma línea.", "La introducción no lleva el título «Introducción»: se usa el título del trabajo."],
      "Método (nivel 1) → Participantes (nivel 2) → Criterios de inclusión (nivel 3).",
      "Escribir los títulos en MAYÚSCULAS o terminarlos en punto en los niveles 1 a 3."),
    T("tablas", "Tablas y figuras", ["tabla", "tablas", "figura", "figuras", "grafico", "graficos", "nota de tabla", "fuente de la tabla"],
      "Cada tabla y figura lleva un número en negrita (Tabla 1, Figura 1), debajo un título breve en cursiva, y al final una nota si hace falta. Todas se mencionan en el texto antes de aparecer.",
      ["Rótulo: «Tabla 1» en negrita; en la línea siguiente, el título en cursiva.", "Tablas con líneas horizontales solamente, sin líneas verticales.", "Debajo: «Nota.» en cursiva, seguida de la explicación o el origen de los datos (en APA no se usa «Fuente:»).", "En el texto: «como muestra la Tabla 1…» (con mayúscula inicial)."],
      "Tabla 1 / Distribución de los participantes por grado / Nota. Datos de la institución (2026).",
      "Escribir «Tabla N.° 1», poner el título debajo de la tabla o usar «Fuente:»."),
    T("numeros", "Números, estadísticos y porcentajes", ["numeros", "cifras", "porcentajes", "estadisticos", "valor p", "decimales", "numeros en letras"],
      "En general, del cero al nueve se escriben en letras y del 10 en adelante con cifras, pero siempre van en cifras las medidas, porcentajes, puntajes, edades, fechas, horas y los resultados estadísticos. Ninguna oración empieza con un número escrito en cifras.",
      ["«tres grupos», «15 estudiantes», «5 %», «edad de 8 años».", "Estadísticos con espacio a ambos lados del signo: p = .03, t(58) = 2.41.", "Sin cero inicial en valores que no pasan de 1: p, r, α, β.", "Símbolos estadísticos en cursiva: M, DE, n, N, p, t, F, r."],
      "Participaron 42 estudiantes de tres grupos (M = 11.4 años, DE = 0.8).",
      "Escribir p = 0.000; lo correcto es p < .001."),
    T("siglas", "Siglas y abreviaturas", ["siglas", "abreviaturas", "acronimos", "como uso una sigla"],
      "La primera vez se escribe el nombre completo seguido de la sigla entre paréntesis; después, solo la sigla. Usa siglas solo si el término aparece varias veces. No las definas en los títulos.",
      ["Primera vez: Proyecto Educativo Institucional (PEI).", "Después: el PEI…", "Las siglas no llevan puntos ni plural con «s»: los PEI.", "No es necesario definir siglas muy conocidas que aparecen como palabras en el diccionario (por ejemplo, «ovni»)."],
      "El Índice Sintético de Calidad Educativa (ISCE) mide… Según el ISCE…",
      "Usar una sigla sin haberla definido, o definirla y no volver a usarla."),
    T("sesgo", "Lenguaje sin sesgos", ["lenguaje inclusivo", "lenguaje sin sesgo", "sujetos o participantes", "discapacidad", "personas mayores", "sesgo"],
      "APA pide describir a las personas con precisión y respeto: usar los términos que el propio grupo prefiere, nombrar a la persona antes que la condición cuando corresponda y evitar etiquetas.",
      ["«participantes» o «estudiantes», en lugar de «sujetos».", "«personas con discapacidad», en lugar de «discapacitados».", "«personas mayores», en lugar de «ancianos».", "Menciona edad, género, etnia o condición solo si es relevante para el estudio."],
      "Participaron 12 estudiantes con discapacidad auditiva.",
      "Usar términos peyorativos o generalizaciones como «el hombre» para referirse a todas las personas."),
    T("apendices", "Anexos (apéndices)", ["anexos", "apendices", "anexo", "apendice"],
      "En APA se llaman apéndices; muchas universidades en español usan «anexos». Van después de las referencias, cada uno en una página nueva, con su rótulo (Anexo A, Anexo B…) y un título. Se mencionan en el texto.",
      ["Anexo A: Instrumento.", "Anexo B: Consentimiento informado.", "En el texto: (ver Anexo A)."],
      "El cuestionario completo se presenta en el Anexo A.",
      "Poner anexos que nunca se mencionan en el texto.")
  ];
  if (window.Guia) Guia.agregar(TEMAS);

  /* ================= 2. Generador de referencias ================= */
  const TIPOS = {
    articulo: { nombre: "Artículo de revista", campos: ["autores", "anio", "titulo", "revista", "volumen", "numero", "paginas", "doi"] },
    libro: { nombre: "Libro", campos: ["autores", "anio", "titulo", "edicion", "editorial", "doi"] },
    capitulo: { nombre: "Capítulo de libro", campos: ["autores", "anio", "titulo", "editores", "libro", "paginas", "editorial", "doi"] },
    tesis: { nombre: "Tesis o trabajo de grado", campos: ["autores", "anio", "titulo", "grado", "universidad", "repositorio", "url"] },
    web: { nombre: "Página web", campos: ["autores", "fecha", "titulo", "sitio", "url"] },
    informe: { nombre: "Informe institucional", campos: ["autores", "anio", "titulo", "numeroInforme", "editorial", "url"] },
    ley: { nombre: "Ley, decreto o resolución (Colombia)", campos: ["entidad", "fecha", "norma", "epigrafe", "publicacion", "url"] },
    video: { nombre: "Video (YouTube u otro)", campos: ["autores", "fecha", "titulo", "plataforma", "url"] },
    ponencia: { nombre: "Ponencia en congreso", campos: ["autores", "fechaEvento", "titulo", "evento", "lugar", "url"] },
    periodico: { nombre: "Artículo de periódico", campos: ["autores", "fecha", "titulo", "periodico", "url"] },
    ia: { nombre: "Inteligencia artificial", campos: ["empresa", "anio", "herramienta", "version", "url"] }
  };
  const ETIQUETAS = {
    autores: "Autores (uno por línea: Apellidos, Nombres · o una institución)", anio: "Año", fecha: "Fecha (ej.: 2026, 5 de marzo)", fechaEvento: "Fecha del evento (ej.: 2026, 5-7 de marzo)",
    titulo: "Título", revista: "Revista", volumen: "Volumen", numero: "Número", paginas: "Páginas (ej.: 45-67)", doi: "DOI o URL (opcional)",
    edicion: "Edición (si no es la primera; ej.: 2)", editorial: "Editorial o institución que publica", editores: "Editores del libro (ej.: B. Gómez y C. Ruiz)", libro: "Título del libro",
    grado: "Tipo (ej.: Tesis de maestría, Trabajo de grado de pregrado, Tesis doctoral)", universidad: "Universidad", repositorio: "Repositorio (ej.: Repositorio Institucional UIS)", url: "URL",
    sitio: "Nombre del sitio web (omítelo si es igual al autor)", numeroInforme: "Número del informe (opcional)", entidad: "Entidad que la expide (ej.: Congreso de la República de Colombia)",
    norma: "Norma (ej.: Ley 1581 de 2012)", epigrafe: "Epígrafe (ej.: Por la cual se dictan…)", publicacion: "Publicación oficial (ej.: Diario Oficial n.° 48.587)",
    plataforma: "Plataforma (ej.: YouTube)", evento: "Nombre del evento", lugar: "Ciudad y país", periodico: "Periódico", empresa: "Empresa (ej.: OpenAI, Anthropic, Google)",
    herramienta: "Herramienta (ej.: ChatGPT, Claude, Gemini)", version: "Versión (ej.: versión del 14 de marzo, Opus 5.5)"
  };

  function partir(linea) {
    const l = String(linea || "").trim();
    if (!l) return null;
    if (!l.includes(",")) return { institucion: l, apellido: l };
    const [ape, nom] = l.split(",").map(x => x.trim());
    const ini = (nom || "").split(/\s+/).filter(Boolean).map(n => n.split("-").map(s => s.charAt(0).toUpperCase() + ".").join("-")).join(" ");
    return { apellido: ape, iniciales: ini };
  }
  const autorRef = (a) => a.institucion ? a.institucion : `${a.apellido}${a.iniciales ? ", " + a.iniciales : ""}`;
  function listaAutores(texto) {
    const as = String(texto || "").split(/\n|;/).map(partir).filter(Boolean);
    let s;
    if (!as.length) s = "";
    else if (as.length === 1) s = autorRef(as[0]);
    else if (as.length <= 20) s = as.slice(0, -1).map(autorRef).join(", ") + " y " + autorRef(as[as.length - 1]);
    else s = as.slice(0, 19).map(autorRef).join(", ") + ", … " + autorRef(as[as.length - 1]);
    return { as, s };
  }
  const punto = (s) => /[.?!]$/.test(s) ? s : s + ".";
  const enlace = (d) => { d = String(d || "").trim(); if (!d) return ""; if (/^10\.\d/.test(d)) return "https://doi.org/" + d; return d.replace(/^doi:\s*/i, "https://doi.org/").replace(/^https?:\/\/dx\.doi\.org\//, "https://doi.org/"); };
  const ord = (e) => { e = String(e || "").trim(); return e && e !== "1" ? ` (${e.replace(/\D/g, "") || e}.ª ed.)` : ""; };

  /** Devuelve {texto, cursivas:[...], cita, narrativa} con los datos d del tipo dado. */
  function construir(tipo, d) {
    const A = listaAutores(d.autores), a = A.s, cur = [];
    const anio = String(d.anio || "").trim() || "s. f.";
    const fecha = String(d.fecha || "").trim() || anio;
    const C = (x) => { if (x) cur.push(x); return x; };
    let t = "", autoresCita = A.as;
    switch (tipo) {
      case "articulo": {
        const vol = String(d.volumen || "").trim(), num = String(d.numero || "").trim(), pag = String(d.paginas || "").trim();
        t = `${a ? punto(a) + " " : ""}(${anio}). ${punto(d.titulo)} ${C(vol ? `${d.revista}, ${vol}` : d.revista)}${num ? `(${num})` : ""}${pag ? ", " + pag : ""}.${enlace(d.doi) ? " " + enlace(d.doi) : ""}`;
        break;
      }
      case "libro": t = `${a ? punto(a) + " " : ""}(${anio}). ${C(d.titulo)}${ord(d.edicion)}. ${d.editorial ? punto(d.editorial) : ""}${enlace(d.doi) ? " " + enlace(d.doi) : ""}`; break;
      case "capitulo": t = `${a ? punto(a) + " " : ""}(${anio}). ${punto(d.titulo)} En ${d.editores ? d.editores + (/ y /.test(d.editores) ? " (Eds.), " : " (Ed.), ") : ""}${C(d.libro)}${d.paginas ? ` (pp. ${d.paginas})` : ""}. ${d.editorial ? punto(d.editorial) : ""}${enlace(d.doi) ? " " + enlace(d.doi) : ""}`; break;
      case "tesis": t = `${a ? punto(a) + " " : ""}(${anio}). ${C(d.titulo)} [${d.grado || "Tesis"}, ${d.universidad || "Universidad"}]. ${d.repositorio ? punto(d.repositorio) + " " : ""}${d.url || ""}`; break;
      case "web": t = `${a ? punto(a) + " " : ""}(${fecha}). ${C(d.titulo)}. ${d.sitio ? punto(d.sitio) + " " : ""}${d.url || ""}`; break;
      case "informe": t = `${a ? punto(a) + " " : ""}(${anio}). ${C(d.titulo)}${d.numeroInforme ? ` (${d.numeroInforme})` : ""}. ${d.editorial && norm(d.editorial) !== norm(a) ? punto(d.editorial) + " " : ""}${d.url || ""}`; break;
      case "ley": autoresCita = [{ institucion: d.entidad || d.norma }]; t = `${punto(d.entidad || "")} (${fecha}). ${C(d.norma)}${d.epigrafe ? ". " + C(d.epigrafe) : ""}. ${d.publicacion ? punto(d.publicacion) + " " : ""}${d.url || ""}`; break;
      case "video": t = `${a ? punto(a) + " " : ""}(${fecha}). ${C(d.titulo)} [Video]. ${punto(d.plataforma || "YouTube")} ${d.url || ""}`; break;
      case "ponencia": t = `${a ? punto(a) + " " : ""}(${d.fechaEvento || anio}). ${C(d.titulo)} [Ponencia]. ${d.evento || ""}${d.lugar ? ", " + d.lugar : ""}. ${d.url || ""}`; break;
      case "periodico": t = `${a ? punto(a) + " " : ""}(${fecha}). ${punto(d.titulo)} ${C(d.periodico)}. ${d.url || ""}`; break;
      case "ia": autoresCita = [{ institucion: d.empresa }]; t = `${punto(d.empresa || "")} (${anio}). ${C(d.herramienta)}${d.version ? ` (${d.version})` : ""} [Modelo de lenguaje grande]. ${d.url || ""}`; break;
    }
    t = t.replace(/\s+/g, " ").replace(/\.\./g, ".").replace(/\s+\./g, ".").trim();
    const y = String(tipo === "ia" ? d.anio : (d.anio || d.fecha || d.fechaEvento || "")).match(/(19|20)\d{2}/);
    const anioCita = y ? y[0] : "s. f.";
    const ap = autoresCita.map(x => x.apellido || x.institucion).filter(Boolean);
    const sinAutor = !ap.length;
    const quien = sinAutor ? `«${String(d.titulo || "").split(" ").slice(0, 4).join(" ")}»` : ap.length === 1 ? ap[0] : ap.length === 2 ? `${ap[0]} y ${ap[1]}` : `${ap[0]} et al.`;
    const cita = tipo === "ley" && d.norma ? `(${d.norma})` : `(${quien}, ${anioCita})`;
    const narrativa = `${quien} (${anioCita})`;
    return { texto: t, cursivas: cur.map(x => String(x).trim()).filter(Boolean), cita, narrativa };
  }

  function generador(tipoInicial) {
    const { el, tarjeta } = H();
    const c = el("div", "inv-cuerpo apa-gen");
    const sel = el("select", "ajuste");
    Object.entries(TIPOS).forEach(([k, v]) => { const o = el("option", "", v.nombre); o.value = k; sel.appendChild(o); });
    sel.value = TIPOS[tipoInicial] ? tipoInicial : "articulo";
    const l0 = el("label", "campo-pro"); l0.append(el("span", "", "Tipo de fuente"), sel); c.appendChild(l0);
    const campos = el("div", "apa-campos"); c.appendChild(campos);
    const vista = el("div", "apa-vista"); c.appendChild(vista);
    const acc = el("div", "inv-acciones"); c.appendChild(acc);
    let inputs = {}, ultimo = null;
    const pintar = () => {
      const d = {}; Object.keys(inputs).forEach(k => { d[k] = inputs[k].value.trim(); });
      ultimo = construir(sel.value, d);
      vista.innerHTML = "";
      const ref = el("p", "apa-ref");
      let resto = ultimo.texto;
      // Pinta las cursivas
      const marcas = ultimo.cursivas.map(x => ({ x, i: ultimo.texto.indexOf(x) })).filter(m => m.i >= 0).sort((a, b) => a.i - b.i);
      let pos = 0;
      marcas.forEach(m => { if (m.i < pos) return; ref.appendChild(document.createTextNode(resto.slice(pos, m.i))); ref.appendChild(el("i", "", m.x)); pos = m.i + m.x.length; });
      ref.appendChild(document.createTextNode(resto.slice(pos)));
      vista.append(el("small", "", "Referencia"), ref, el("small", "", "Cita parentética · narrativa"), el("p", "apa-cita", `${ultimo.cita} · ${ultimo.narrativa}`));
    };
    const armar = () => {
      campos.innerHTML = ""; inputs = {};
      TIPOS[sel.value].campos.forEach(k => {
        const l = el("label", "campo-pro"); l.appendChild(el("span", "", ETIQUETAS[k] || k));
        const i = k === "autores" ? el("textarea") : el("input"); if (k === "autores") i.rows = 3; i.className = "ajuste";
        if (k === "ia" || (sel.value === "ia" && k === "url")) i.placeholder = "https://chat.openai.com";
        i.oninput = pintar; inputs[k] = i; l.appendChild(i); campos.appendChild(l);
      });
      if (sel.value === "ley") vista.title = "Adaptación usada en Colombia: confirma con la norma de tu universidad.";
      pintar();
    };
    sel.onchange = armar;
    const bI = el("button", "boton primario", "Insertar cita y referencia");
    bI.onclick = () => H().ejecutar(() => insertar(ultimo, true));
    const bR = el("button", "boton secundario", "Solo la referencia");
    bR.onclick = () => H().ejecutar(() => insertar(ultimo, false));
    const bC = el("button", "boton secundario", "Copiar");
    bC.onclick = async () => { try { await navigator.clipboard.writeText(ultimo.texto); bC.textContent = "¡Copiada!"; } catch (e) { bC.textContent = "Selecciona y copia"; } };
    acc.append(bI, bR, bC);
    if (window.Biblio) { const bG = el("button", "boton secundario", "Guardar en mi biblioteca"); bG.onclick = () => { Biblio.guardarRef({ texto: ultimo.texto, cita: ultimo.cita, cursivas: ultimo.cursivas, titulo: (inputs.titulo || inputs.norma || {}).value || "" }); bG.textContent = "Guardada ✓"; }; acc.appendChild(bG); }
    armar();
    c.appendChild(el("p", "inv-nota", "Verifica los datos con la fuente original. «Insertar» pone la cita en el cursor y agrega la referencia en orden alfabético, con sangría francesa y cursivas."));
    tarjeta("Generador de referencias APA 7", c);
  }

  /** Inserta la cita en el cursor (opcional) y la referencia en la lista, en orden alfabético. */
  async function insertarReferencia(r, conCita) {
    await Word.run(async (ctx) => {
      const body = ctx.document.body;
      if (conCita) ctx.document.getSelection().insertText(" " + r.cita, "End");
      const ps = body.paragraphs; ps.load("items/text,items/style"); await ctx.sync();
      const items = ps.items;
      if (items.some(p => norm(p.text) === norm(r.texto))) { await ctx.sync(); return; }
      let iRef = -1;
      items.forEach((p, i) => { if (/^\s*(referencias|referencias bibliogr[aá]ficas|bibliograf[ií]a)\s*$/i.test(p.text)) iRef = i; });
      let nuevo;
      if (iRef < 0) { const h = body.insertParagraph("Referencias", "End"); h.styleBuiltIn = "Heading1"; nuevo = body.insertParagraph(r.texto, "End"); }
      else {
        let fin = iRef;
        for (let i = iRef + 1; i < items.length; i++) { if (Doc.esTitulo(items[i].style)) break; fin = i; }
        let antes = null;
        for (let i = iRef + 1; i <= fin; i++) if (items[i].text.trim() && items[i].text.localeCompare(r.texto, "es", { sensitivity: "base" }) > 0) { antes = items[i]; break; }
        nuevo = antes ? antes.insertParagraph(r.texto, "Before") : items[fin].insertParagraph(r.texto, "After");
      }
      nuevo.styleBuiltIn = "Normal";
      try { nuevo.leftIndent = 36; nuevo.firstLineIndent = -36; } catch (e) { /* opcional */ }
      const busq = (r.cursivas || []).filter(x => x.length <= 250).map(x => { const s = nuevo.search(x, { matchCase: true }); s.load("items"); return s; });
      await ctx.sync();
      busq.forEach(s => { if (s.items[0]) s.items[0].font.italic = true; });
      await ctx.sync();
    });
  }
  async function insertar(r, conCita) {
    if (!r || !r.texto) throw new Error("Completa los datos de la fuente.");
    await insertarReferencia(r, conCita);
    H().registrar("Referencia APA 7 generada", r.texto.slice(0, 80), "rubrica");
    H().ui.confirmar(conCita ? `Cité ${r.cita} y agregué la referencia.` : "Agregué la referencia en orden alfabético.");
  }

  /* ================= 3. Revisor de normas APA 7 ================= */
  const CATS = { citas: "Citas en el texto", refs: "Lista de referencias", cruce: "Citas ↔ referencias", titulos: "Títulos", tablas: "Tablas y figuras", numeros: "Números y estadísticos", siglas: "Siglas", lenguaje: "Lenguaje sin sesgos", formato: "Formato del documento" };
  const COMUNES = new Set(["APA", "DOI", "URL", "ISBN", "ISSN", "PDF", "PhD", "USA", "EE", "UU", "OK", "TV", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII", "XV", "XX", "XXI", "XIX", "SPSS", "PSPP", "IA", "CD", "DVD", "COVID", "ADN", "UNESCO"]);
  const SESGO = [
    [/\bsujetos\b/i, "Usa «participantes» o el nombre del grupo (estudiantes, docentes) en lugar de «sujetos»."],
    [/\b(los |las )?discapacitad[oa]s\b/i, "Usa «personas con discapacidad»."],
    [/\bminusv[aá]lid[oa]s?\b/i, "Usa «personas con discapacidad»."],
    [/\bancian[oa]s\b/i, "Usa «personas mayores»."],
    [/\benfermos mentales\b/i, "Usa «personas con trastornos mentales»."],
    [/\bel hombre\b(?= (es|ha|siempre|como especie|primitivo|moderno))/i, "Si te refieres a la humanidad, usa «el ser humano» o «las personas»."],
    [/\bniños? normales\b/i, "Evita «normales» como contraste; describe la característica (por ejemplo, «sin diagnóstico»)."]
  ];

  async function revisar() {
    const ps = await Doc.leerParrafos();
    const { refs, ini, fin } = window.Jurado ? Jurado._extraerReferencias(ps) : { refs: [], ini: -1, fin: -1 };
    const enRefs = (i) => ini >= 0 && i > ini && i <= fin;
    const hall = [];
    const add = (cat, p, fragmento, mensaje, arreglo) => hall.push({ cat, parrafo: p.i, fragmento: String(fragmento || "").slice(0, 200), mensaje, arreglo });
    const esTit = (p) => Doc.esTitulo(p.estilo);
    const cuerpo = ps.filter(p => p.texto.trim() && !enRefs(p.i) && p.i !== ini);
    const textoCuerpo = cuerpo.filter(p => !esTit(p)).map(p => p.texto).join("\n");

    cuerpo.forEach(p => {
      const t = p.texto;
      if (esTit(p)) {
        const s = t.trim();
        if (/^\d+(\.\d+)*\.?\s+\S/.test(s)) add("titulos", p, s.slice(0, 40), "APA 7 no numera los títulos. Quita la numeración, salvo que tu universidad la exija.");
        if (/[^.]\.$/.test(s) && s.length < 120 && (window.Formato ? Formato._nivelDe(p.estilo) : 1) <= 3) add("titulos", p, s.slice(-30), "Los títulos de nivel 1 a 3 no terminan en punto.", { buscar: s, reemplazar: s.slice(0, -1) });
        if (s.length > 4 && s === s.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{4}/.test(s)) add("titulos", p, s.slice(0, 40), "No escribas los títulos en MAYÚSCULAS: usa mayúscula inicial en las palabras principales o solo en la primera, según tu universidad.");
        return;
      }
      // ----- Citas -----
      let m;
      const reAmp = /([A-ZÁÉÍÓÚÑ][\wáéíóúñ'-]+) & ([A-ZÁÉÍÓÚÑ][\wáéíóúñ'-]+)/g;
      while ((m = reAmp.exec(t))) add("citas", p, m[0], "En un texto en español, une los autores con «y», no con «&».", { buscar: m[0], reemplazar: `${m[1]} y ${m[2]}` });
      const reEtal = /\bet\.? al\b(?!\.)|\bet\. al\./g;
      while ((m = reEtal.exec(t))) add("citas", p, m[0], "Se escribe «et al.» (con punto solo al final).", { buscar: m[0], reemplazar: "et al." });
      const reTres = /\(([A-ZÁÉÍÓÚÑ][^(),;]{1,40}),\s+([A-ZÁÉÍÓÚÑ][^(),;]{1,40})\s+(?:y|&)\s+([A-ZÁÉÍÓÚÑ][^(),;]{1,40}),\s*((?:19|20)\d{2}[a-z]?)/g;
      while ((m = reTres.exec(t))) add("citas", p, m[0], "Con tres o más autores, APA 7 usa el primer apellido y «et al.» desde la primera cita.", { buscar: m[0], reemplazar: `(${m[1].trim()} et al., ${m[4]}` });
      const reTresN = /\b([A-ZÁÉÍÓÚÑ][\wáéíóúñ'-]+),\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ'-]+)\s+(?:y|&)\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ'-]+)\s+\(((?:19|20)\d{2}[a-z]?)\)/g;
      while ((m = reTresN.exec(t))) add("citas", p, m[0], "Con tres o más autores, escribe solo el primero seguido de «et al.».", { buscar: m[0], reemplazar: `${m[1]} et al. (${m[4]})` });
      const reComa = /\(([A-ZÁÉÍÓÚÑ][a-záéíóúñü'-]+(?: et al\.)?)\s+((?:19|20)\d{2}[a-z]?)\)/g;
      while ((m = reComa.exec(t))) add("citas", p, m[0], "Falta la coma entre el autor y el año.", { buscar: m[0], reemplazar: `(${m[1]}, ${m[2]})` });
      const rePag = /\bp[áa]gs?\.?\s*(\d+)/g;
      while ((m = rePag.exec(t))) { const pl = /s/.test(m[0]); add("citas", p, m[0], `Para la página usa «${pl ? "pp." : "p."}».`, { buscar: m[0], reemplazar: `${pl ? "pp." : "p."} ${m[1]}` }); }
      if (/\b(ibid|ibídem|op\.? cit|loc\.? cit)\b/i.test(t)) add("citas", p, (t.match(/\b(ibid\w*|op\.? cit\.?|loc\.? cit\.?)/i) || [""])[0], "APA no usa «ibid.», «op. cit.» ni «loc. cit.»: repite la cita autor-fecha.");
      const reSf = /\bs\.f\./g;
      while ((m = reSf.exec(t))) add("citas", p, m[0], "Sin fecha se escribe «s. f.», con espacio.", { buscar: m[0], reemplazar: "s. f." });
      // Citas textuales: página y longitud
      const reQ = /[«“"]([^«»“”"]{12,})[»”"]\s*(\([^()]*\))?/g;
      while ((m = reQ.exec(t))) {
        const palabras = m[1].trim().split(/\s+/).length;
        if (palabras >= 40) add("citas", p, m[1].slice(0, 60), `Esta cita textual tiene ${palabras} palabras: con 40 o más va en bloque aparte, con sangría y sin comillas.`);
        const despues = t.slice(m.index, m.index + m[0].length + 60);
        const tieneCita = /\((?:[^()]*?(?:19|20)\d{2}|s\. f\.)[^()]*\)/.test(despues) || /\((?:p|pp|párr)\.\s*\d/.test(despues);
        if (tieneCita && palabras >= 4 && !/\b(p|pp|párr)\.\s*\d/.test(despues)) add("citas", p, m[1].slice(0, 60), "A las citas textuales les falta la página: (Autor, año, p. 00).");
      }
      // ----- Tablas y figuras -----
      const rot = t.trim().match(/^(Tabla|Figura)\s*(N[°º.]*\s*|No\.\s*|#\s*)(\d+)/i);
      if (rot) add("tablas", p, rot[0], `El rótulo se escribe «${rot[1]} ${rot[3]}», sin «N.°» ni «No.».`, { buscar: rot[0], reemplazar: `${rot[1].charAt(0).toUpperCase() + rot[1].slice(1).toLowerCase()} ${rot[3]}` });
      const mF = t.match(/^\s*Fuente\s*:\s*(\S)/i);
      if (mF) add("tablas", p, mF[0].trim(), "Debajo de tablas y figuras APA usa «Nota.» (en cursiva), no «Fuente:».", { buscar: mF[0].trim(), reemplazar: "Nota. " + mF[1].toUpperCase() });
      const reMin = /\b(la|las|en la|ver la|véase la) (tabla|figura) (\d+)/g;
      while ((m = reMin.exec(t))) add("tablas", p, m[0], "En el texto, «Tabla» y «Figura» van con mayúscula cuando llevan número.", { buscar: `${m[2]} ${m[3]}`, reemplazar: `${m[2].charAt(0).toUpperCase() + m[2].slice(1)} ${m[3]}` });
      // ----- Números y estadísticos -----
      const reP0 = /\bp\s*([=<>≤≥])\s*0([.,])(\d+)/g;
      while ((m = reP0.exec(t))) add("numeros", p, m[0], "Los valores p no llevan cero inicial (no pueden ser mayores que 1).", { buscar: m[0], reemplazar: `p ${m[1]} ${m[2]}${m[3]}` });
      const reP000 = /\bp\s*=\s*[.,]000\b/g;
      while ((m = reP000.exec(t))) add("numeros", p, m[0], "Nunca se informa p = .000: escribe p < .001.", { buscar: m[0], reemplazar: m[0].includes(",") ? "p < ,001" : "p < .001" });
      const reEsp = /\b([pFtrNMn]|DE)(\([^)]{1,12}\))?\s?([=<>])\s?([-−]?\d*[.,]?\d+)/g;
      while ((m = reEsp.exec(t))) if (!/ [=<>] /.test(m[0])) add("numeros", p, m[0], "Deja un espacio a cada lado del signo: p = .03.", { buscar: m[0], reemplazar: `${m[1]}${m[2] || ""} ${m[3]} ${m[4]}` });
      const reIni = /(?:^|[.!?]\s+)(\d+)\s+[a-záéíóúñ]/g;
      while ((m = reIni.exec(t))) if (!/^(19|20)\d{2}$/.test(m[1])) add("numeros", p, m[0].trim(), "No empieces una oración con una cifra: escríbela en letras o reorganiza la frase.");
      // ----- Lenguaje -----
      SESGO.forEach(([re, msg]) => { const x = t.match(re); if (x) add("lenguaje", p, x[0], msg); });
    });

    // ----- Siglas: deben definirse la primera vez -----
    const vistas = {};
    cuerpo.filter(p => !esTit(p)).forEach(p => {
      (p.texto.match(/\b[A-ZÁÉÍÓÚÑ]{2,7}s?\b/g) || []).forEach(s0 => {
        const s = /[a-z]$/.test(s0) ? s0.slice(0, -1) : s0;
        if (COMUNES.has(s) || /^[IVXLC]+$/.test(s) || vistas[s]) return;
        vistas[s] = p;
        const definida = new RegExp("[(\\[]" + s + "[)\\],]").test(p.texto) || new RegExp("\\(" + s + "\\)").test(p.texto);
        if (!definida) add("siglas", p, s, `La sigla «${s}» se usa sin definirla. La primera vez escribe el nombre completo y luego (${s}).`);
      });
    });

    // ----- Referencias -----
    const idiomaEs = true;
    refs.forEach(r => {
      const p = { i: r.i };
      if (window.Jurado && Jurado._formatoAPA) { r.problemas = []; Jurado._formatoAPA(r, idiomaEs); r.problemas.forEach(x => add("refs", p, r.texto.slice(0, 50), x)); }
      let m;
      if ((m = r.texto.match(/\b(?:doi|DOI)\s*:\s*(10\.\S+)/))) add("refs", p, m[0], "El DOI va como enlace: https://doi.org/…", { buscar: m[0], reemplazar: "https://doi.org/" + m[1] });
      if ((m = r.texto.match(/https?:\/\/dx\.doi\.org\//))) add("refs", p, m[0], "Usa el formato actual del DOI: https://doi.org/…", { buscar: m[0], reemplazar: "https://doi.org/" });
      if (/recuperado (de|desde)/i.test(r.texto) && /doi\.org/.test(r.texto)) add("refs", p, (r.texto.match(/recuperado (de|desde)/i) || [""])[0], "Con DOI no se escribe «Recuperado de». En APA 7 «Recuperado de» solo se usa si el contenido cambia con el tiempo.");
      else if (/recuperado (de|desde)\s+https?:/i.test(r.texto)) add("refs", p, (r.texto.match(/recuperado (de|desde)/i) || [""])[0], "En APA 7 la URL va sola, sin «Recuperado de» (salvo contenidos que cambian, con fecha de consulta).", { buscar: (r.texto.match(/recuperado (de|desde)\s+/i) || [""])[0], reemplazar: "" });
      if (/\b(Vol\.|No\.|Núm\.|N\.°)\s*\d/i.test(r.texto)) add("refs", p, (r.texto.match(/\b(Vol\.|No\.|Núm\.|N\.°)\s*\d+/i) || [""])[0], "En artículos, el volumen va en cursiva y el número entre paréntesis, sin «Vol.» ni «No.»: 12(3).");
      if (/\d+\s*\(\d+\)/.test(r.texto) && /\bpp\.\s*\d/.test(r.texto)) add("refs", p, (r.texto.match(/\bpp\.\s*/) || [""])[0], "En artículos de revista las páginas van sin «pp.».", { buscar: (r.texto.match(/,\s*pp\.\s*/) || [""])[0], reemplazar: ", " });
      if ((m = r.texto.match(/\(((?:19|20)\d{2}[a-z]?|s\. f\.)\)\s+[A-ZÁÉÍÓÚÑ¿]/))) add("refs", p, m[0], "Falta el punto después de la fecha: (2020). Título…", { buscar: m[0], reemplazar: m[0].replace(/\)\s+/, "). ") });
      const pals = String(r.titulo || "").split(/\s+/).filter(w => w.length > 3);
      if (pals.length >= 4 && pals.slice(1).filter(w => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(w)).length / Math.max(1, pals.length - 1) > 0.6) add("refs", p, r.titulo.slice(0, 50), "En la lista de referencias los títulos de artículos, libros y capítulos van con mayúscula solo al inicio (y en nombres propios).");
    });
    const ordenadas = refs.map(r => r.texto).slice().sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    const fuera = refs.findIndex((r, k) => r.texto !== ordenadas[k]);
    if (fuera >= 0) add("refs", { i: refs[fuera].i }, refs[fuera].texto.slice(0, 40), "Las referencias deben ir en orden alfabético por el apellido del primer autor.");
    if (ini < 0 && cuerpo.length > 5) add("refs", { i: cuerpo[cuerpo.length - 1].i }, "", "No encontré la lista de «Referencias» al final del documento.");

    // ----- Cruce citas ↔ referencias -----
    if (window.Jurado && ini >= 0) {
      const citas = Jurado._extraerCitas(ps, ini, fin);
      const prim = (t) => norm(String(t).split(/,| y | & | et al/)[0]).split(" ").pop().replace(/[^a-zñ-]/g, "");
      const vistasC = new Set();
      citas.forEach(c => {
        const k = prim(c.autor) + "|" + String(c.anio).slice(0, 4);
        if (vistasC.has(k)) return; vistasC.add(k);
        const sigla = /^[A-ZÁÉÍÓÚÑ]{2,8}$/.test(String(c.autor).trim()) ? String(c.autor).trim() : "";
        const iniciales = (t) => String(t).split(/[.,(]/)[0].split(/\s+/).filter(w => /^[A-ZÁÉÍÓÚÑ]/.test(w)).map(w => w[0]).join("");
        const ok = refs.some(r => (norm(r.autor).includes(prim(c.autor)) || (sigla && (iniciales(r.autor) === sigla || r.texto.includes("[" + sigla + "]") || r.texto.includes(sigla)))) && String(r.anio).slice(0, 4) === String(c.anio).slice(0, 4));
        if (!ok) add("cruce", { i: c.parrafo }, c.texto, `La cita «${c.texto}» no tiene referencia en la lista.`);
      });
      refs.forEach(r => {
        const ap = prim(r.autor);
        if (ap && !citas.some(c => prim(c.autor) === ap && String(c.anio).slice(0, 4) === String(r.anio).slice(0, 4))) add("cruce", { i: r.i }, r.texto.slice(0, 40), "Esta referencia no está citada en el texto: cítala o quítala.");
      });
    }
    // ----- Tablas: se mencionan en el texto -----
    ps.forEach(p => {
      const m = p.texto.trim().match(/^(Tabla|Figura)\s+(\d+)\s*$/);
      if (m) {
        const otras = ps.filter(q => q.i !== p.i && new RegExp(`\\b${m[1]}\\s+${m[2]}\\b`, "i").test(q.texto)).length;
        if (!otras) add("tablas", p, m[0], `La ${m[1].toLowerCase()} ${m[2]} no se menciona en el texto. Remite a ella antes de que aparezca («como muestra la ${m[1]} ${m[2]}»).`);
      }
    });
    // ----- Formato (si Word informa las propiedades) -----
    let formato = null;
    try {
      formato = await Word.run(async (ctx) => {
        const pp = ctx.document.body.paragraphs; pp.load("items/text,items/style,items/lineSpacing,items/firstLineIndent,items/font/name,items/font/size,items/tableNestingLevel"); await ctx.sync();
        const xs = pp.items.filter((x, i) => x.text.trim().length > 60 && !Doc.esTitulo(x.style) && !(x.tableNestingLevel > 0) && !enRefs(i));
        if (!xs.length || xs[0].lineSpacing == null) return null;
        const sinDoble = xs.filter(x => x.lineSpacing < (x.font.size || 12) * 1.9).length;
        const sinSangria = xs.filter(x => !(x.firstLineIndent > 20)).length;
        const fuentes = new Set(xs.map(x => x.font.name).filter(Boolean));
        return { total: xs.length, sinDoble, sinSangria, fuentes: Array.from(fuentes) };
      });
    } catch (e) { formato = null; }
    if (formato) {
      const pr = cuerpo.find(p => !esTit(p)) || cuerpo[0];
      if (formato.sinDoble) add("formato", pr, "", `${formato.sinDoble} de ${formato.total} párrafos no tienen interlineado doble.`);
      if (formato.sinSangria) add("formato", pr, "", `${formato.sinSangria} de ${formato.total} párrafos no tienen sangría de primera línea de 1,27 cm.`);
      if (formato.fuentes.length > 1) add("formato", pr, "", `El texto mezcla fuentes (${formato.fuentes.join(", ")}). Usa una sola.`);
    }
    return { hall, refs: refs.length, formato };
  }

  async function revisor() {
    const { el, tarjeta, etiqueta, registrar, irA } = H();
    const ui = H().ui;
    const r = await revisar();
    const hall = r.hall;
    registrar("Revisión de normas APA 7", `${hall.length} observaciones`, "rubrica");
    const c = el("div", "inv-cuerpo apa-rev");
    c.appendChild(etiqueta("reglas", "APA 7"));
    const porCat = {}; hall.forEach(h => { (porCat[h.cat] = porCat[h.cat] || []).push(h); });
    const res = el("div", "apa-resumen");
    Object.keys(CATS).forEach(k => {
      const n = (porCat[k] || []).length;
      const s = el("span", n ? "apa-chip con" : "apa-chip ok", `${n ? n : "✓"} ${CATS[k]}`);
      if (n) { s.style.cursor = "pointer"; s.onclick = () => { const d = c.querySelector(`details[data-cat="${k}"]`); if (d) { d.open = true; d.scrollIntoView({ block: "nearest" }); } }; }
      res.appendChild(s);
    });
    c.appendChild(res);
    if (!hall.length) c.appendChild(el("p", "guia-resumen", "¡Muy bien! No encontré problemas de normas APA 7 en lo que puedo revisar automáticamente."));
    else c.appendChild(el("p", "guia-resumen", `Encontré ${hall.length} observaciones. ${hall.filter(h => h.arreglo).length} se pueden corregir solas; las demás te las explico.`));
    Object.keys(CATS).forEach(k => {
      const xs = porCat[k]; if (!xs) return;
      const d = el("details", "apa-cat"); d.dataset.cat = k; if (Object.keys(porCat)[0] === k) d.open = true;
      d.appendChild(el("summary", "", `${CATS[k]} (${xs.length})`));
      xs.slice(0, 40).forEach(h => {
        const f = el("div", "apa-hall");
        f.appendChild(el("span", "", h.mensaje));
        if (h.fragmento) f.appendChild(el("code", "", h.fragmento.length > 70 ? h.fragmento.slice(0, 67) + "…" : h.fragmento));
        const a = el("div", "inv-acciones");
        const bI = el("button", "enlace-sutil", "Ir"); bI.onclick = () => irA(h.parrafo); a.appendChild(bI);
        if (h.arreglo) { const bC = el("button", "enlace-sutil", "Corregir → " + (h.arreglo.reemplazar || "quitar")); bC.onclick = () => H().ejecutar(async () => { const n = await corregir([h]); bC.textContent = n ? "Corregido ✓" : "No lo encontré"; bC.disabled = true; }); a.appendChild(bC); }
        f.appendChild(a); d.appendChild(f);
      });
      c.appendChild(d);
    });
    const acc = el("div", "inv-acciones");
    const seguros = hall.filter(h => h.arreglo);
    if (seguros.length) { const b = el("button", "boton primario", `Corregir lo seguro (${seguros.length})`); b.onclick = () => H().ejecutar(async () => { const n = await corregir(seguros); ui.confirmar(`Corregí ${n} detalles de APA 7.`); b.disabled = true; b.textContent = `Corregidos ${n} ✓`; }); acc.appendChild(b); }
    if (hall.length) { const b = el("button", "boton secundario", "Poner comentarios en el documento"); b.onclick = () => H().ejecutar(async () => { const x = await Doc.comentar(hall.filter(h => !h.arreglo).slice(0, 80).map(h => ({ parrafo: h.parrafo, fragmento: h.fragmento, comentario: "APA 7 · " + h.mensaje }))); ui.confirmar(`Dejé ${x.hechos} comentarios en tu documento.`); }); acc.appendChild(b); }
    c.appendChild(acc);
    const acc2 = el("div", "inv-acciones");
    if (window.Formato) { const b = el("button", "boton secundario", "Aplicar formato APA 7"); b.onclick = () => Formato.tarjetaOpciones(); acc2.appendChild(b); }
    if (r.refs) { const b = el("button", "boton secundario", "Corregir referencias con IA"); b.onclick = () => H().ejecutar(corregirReferenciasIA); acc2.appendChild(b); }
    if (window.Jurado) { const b = el("button", "boton secundario", "¿Mis fuentes existen?"); b.onclick = () => H().ejecutar(Jurado.verificar); acc2.appendChild(b); }
    c.appendChild(acc2);
    tarjeta("Revisor APA 7", c);
    ui.hablar(hall.length ? `Revisé tu documento con las normas APA siete. Encontré ${hall.length} observaciones; ${seguros.length} las puedo corregir de una vez.` : "Revisé tu documento: cumple las normas APA siete que puedo revisar.");
    return r;
  }

  /** Aplica correcciones {parrafo, arreglo:{buscar, reemplazar}} dentro de cada párrafo. */
  async function corregir(lista) {
    let n = 0;
    for (const h of lista.filter(x => x.arreglo && x.arreglo.buscar && x.arreglo.buscar.length <= 255)) {
      const ok = await Word.run(async (ctx) => {
        const ps = ctx.document.body.paragraphs; ps.load("items"); await ctx.sync();
        const par = ps.items[h.parrafo]; if (!par) return false;
        const r = par.search(h.arreglo.buscar.replace(/\^/g, "^^"), { matchCase: true }); r.load("items"); await ctx.sync();
        if (!r.items.length) return false;
        r.items[0].insertText(h.arreglo.reemplazar, "Replace"); await ctx.sync();
        return true;
      });
      if (ok) n++;
    }
    H().registrar("Correcciones APA 7", n + " detalles", "rubrica");
    return n;
  }

  /** La IA propone la versión corregida de cada referencia; Romus verifica que no cambie los datos. */
  async function corregirReferenciasIA(signal) {
    if (Config.faltaClave()) throw new Error("Para esto necesito tu IA conectada (Ajustes).");
    const { el, tarjeta, etiqueta, pedirHerramienta, registrar } = H();
    const ps = await Doc.leerParrafos();
    const { refs } = Jurado._extraerReferencias(ps);
    if (!refs.length) throw new Error("No encontré la lista de «Referencias».");
    const lote = refs.slice(0, 40);
    const d = await pedirHerramienta("referencias_apa7", "Corrige el formato APA 7 (en español) de cada referencia.",
      { type: "object", properties: { referencias: { type: "array", items: { type: "object", properties: {
        n: { type: "integer" }, tipo: { type: "string", description: "artículo, libro, capítulo, tesis, web, ley, informe, otro" },
        corregida: { type: "string", description: "Referencia en APA 7 con *asteriscos* alrededor de lo que va en cursiva. Si ya está bien, cópiala igual" },
        cambios: { type: "array", items: { type: "string" } },
        faltan: { type: "array", items: { type: "string" }, description: "Datos que faltan y NO debes inventar (ej.: número de páginas, DOI)" }
      }, required: ["n", "corregida"] } } }, required: ["referencias"] },
      `Corrige SOLO el formato de estas referencias según APA 7 en español: «y» antes del último autor, hasta 20 autores, (año). Título con mayúscula inicial. Revista en cursiva, volumen en cursiva, (número), páginas sin «pp.», DOI como https://doi.org/… Libros y tesis con título en cursiva.
NUNCA inventes datos: no agregues DOI, páginas, volúmenes, editoriales ni autores que no estén. Si falta algo, anótalo en «faltan». No cambies años ni nombres.

${lote.map((r, k) => `${k + 1}. ${r.texto}`).join("\n")}`, signal);
    const pal = (t) => new Set(norm(t).replace(/[^a-zñ0-9 ]/g, " ").split(" ").filter(w => w.length > 3));
    const propuestas = (d.referencias || []).map(x => {
      const r = lote[x.n - 1]; if (!r) return null;
      const plano = String(x.corregida || "").replace(/\*/g, "");
      const a = pal(r.texto), b = pal(plano);
      let comunes = 0; b.forEach(w => { if (a.has(w)) comunes++; });
      const nuevas = Array.from(b).filter(w => !a.has(w) && !/^(https|doi|org)$/.test(w));
      const anioOk = !r.anio || plano.includes(String(r.anio).slice(0, 4));
      const doiNuevo = /doi\.org\/10\./.test(plano) && !/10\.\d{4,}/.test(r.texto);
      const segura = anioOk && !doiNuevo && nuevas.length <= 2 && comunes / Math.max(1, a.size) > 0.8;
      return { r, x, plano, cursivas: (String(x.corregida).match(/\*([^*]+)\*/g) || []).map(s => s.slice(1, -1)), segura, igual: norm(plano) === norm(r.texto), nuevas };
    }).filter(Boolean);
    registrar("Referencias corregidas con IA", `${propuestas.filter(p => !p.igual).length} propuestas`, "modelo");
    const c = el("div", "inv-cuerpo apa-rev");
    c.appendChild(etiqueta("modelo", "propuestas de la IA · Romus verifica que no cambien los datos"));
    const cambian = propuestas.filter(p => !p.igual);
    c.appendChild(el("p", "guia-resumen", cambian.length ? `${cambian.length} referencias se pueden mejorar. Las marcadas con ⚠ cambian datos: revísalas a mano.` : "Tus referencias ya tienen buen formato."));
    cambian.forEach(p => {
      const b = el("div", "prioridad");
      b.appendChild(el("small", "", "Antes"));
      b.appendChild(el("span", "apa-antes", p.r.texto));
      b.appendChild(el("small", "", (p.segura ? "Después" : "⚠ Después (revisa: cambia datos" + (p.nuevas.length ? ": " + p.nuevas.slice(0, 4).join(", ") : "") + ")")));
      const dsp = el("span", "apa-despues"); dsp.innerHTML = Docx.xml(p.x.corregida).replace(/\*([^*]+)\*/g, "<i>$1</i>"); b.appendChild(dsp);
      if ((p.x.faltan || []).length) b.appendChild(el("small", "", "Falta: " + p.x.faltan.join("; ")));
      if (p.segura) { const bA = el("button", "enlace-sutil", "Aplicar"); bA.onclick = () => H().ejecutar(async () => { await reemplazarReferencia(p); bA.textContent = "Aplicada ✓"; bA.disabled = true; }); b.appendChild(bA); }
      c.appendChild(b);
    });
    const seguras = cambian.filter(p => p.segura);
    if (seguras.length) { const b = el("button", "boton primario", `Aplicar las ${seguras.length} seguras`); b.onclick = () => H().ejecutar(async () => { for (const p of seguras) await reemplazarReferencia(p); b.textContent = "Aplicadas ✓"; b.disabled = true; H().ui.confirmar("Actualicé las referencias."); }); c.appendChild(b); }
    tarjeta("Referencias en APA 7", c);
    H().ui.hablar(cambian.length ? `Propongo mejoras para ${cambian.length} referencias.` : "Tus referencias ya tienen buen formato.");
    return propuestas;
  }
  async function reemplazarReferencia(p) {
    await Word.run(async (ctx) => {
      const ps = ctx.document.body.paragraphs; ps.load("items"); await ctx.sync();
      const par = ps.items[p.r.i]; if (!par) return;
      par.insertText(p.plano, "Replace");
      par.font.italic = false;
      const bs = p.cursivas.filter(x => x.length <= 250).map(x => { const s = par.search(x, { matchCase: true }); s.load("items"); return s; });
      await ctx.sync();
      bs.forEach(s => { if (s.items[0]) s.items[0].font.italic = true; });
      await ctx.sync();
    });
  }

  /* ================= 4. Asesor APA 7 (puerta de entrada) ================= */
  function asesor() {
    const { el, tarjeta } = H();
    const c = el("div", "inv-cuerpo asesor");
    c.appendChild(el("p", "guia-resumen", "Soy tu asesor de normas APA 7. Te ayudo a citar, a armar referencias y a dejar tu documento con el formato correcto."));
    const op = (ico, t, d, fn) => { const b = el("button", "asesor-op"); b.append(el("i", "", ico)); const tx = el("span", ""); tx.append(el("b", "", t), el("small", "", d)); b.appendChild(tx); b.onclick = fn; c.appendChild(b); };
    op("🧾", "Generar una referencia", "Artículo, libro, tesis, página web, ley, video, IA…: llenas los datos y obtienes referencia y cita.", () => generador());
    op("🔍", "Revisar mi documento con APA 7", "Citas, referencias, títulos, tablas, números, siglas y lenguaje. Corrijo lo seguro y comento lo demás.", () => H().ejecutar(revisor));
    op("📐", "Aplicar el formato APA 7", "Fuente, interlineado, sangrías, títulos, referencias, portada, número de página e índice.", () => { if (window.Formato) Formato.tarjetaOpciones(); });
    op("✅", "¿Mis fuentes existen?", "Compruebo cada referencia en una base académica abierta.", () => { if (window.Jurado) H().ejecutar(Jurado.verificar); });
    c.appendChild(el("div", "inv-sub", "Dudas frecuentes"));
    const lista = el("div", "guia-relacionados");
    TEMAS.forEach(t => { const b = el("button", "enlace-sutil", t.titulo); b.onclick = () => Inv.mostrarTema(t); lista.appendChild(b); });
    c.appendChild(lista);
    const l = el("label", "campo-pro"); l.appendChild(el("span", "", "¿Otra duda de APA?"));
    const i = el("input"); i.className = "ajuste"; i.placeholder = "Ej.: ¿cómo cito un documento del MEN sin fecha?";
    i.onkeydown = (e) => { if (e.key === "Enter" && i.value.trim()) H().ejecutar(() => Inv.preguntar("APA 7: " + i.value.trim())); };
    l.appendChild(i); c.appendChild(l);
    tarjeta("Asesor APA 7", c);
    H().ui.hablar("Soy tu asesor de normas APA siete. Puedo generar referencias, revisar tu documento o aplicar el formato.");
  }

  function comando(n, original) {
    const tarea = (fn) => async () => { H().ui.ocupar(true, "APA 7…"); try { await fn(); } catch (e) { H().ui.mostrarError(e); } finally { H().ui.ocupar(false); } };
    if (/^((abre|activa|quiero)( el)? )?asesor( de)?( normas)? apa( 7| siete)?$|^(normas|ayuda con|dudas de|dudas sobre)( las)? (normas )?apa( 7| siete)?$|^apa( 7| siete)?$/.test(n)) return () => asesor();
    if (/^(revisa|revisar|revisame|evalua|chequea|verifica)( mi| el| las)? (documento|tesis|trabajo|normas)?\s?(con|en|segun)? ?(las )?(normas )?apa( 7| siete)?$|^revisor( de normas)? apa( 7| siete)?$/.test(n)) return tarea(revisor);
    if (/(genera|crea|haz|hazme|arma|armame|dame|necesito)( me)? (una )?referencia( apa)?|^generador de referencias$/.test(n)) {
      const t = /libro/.test(n) ? "libro" : /tesis|trabajo de grado/.test(n) ? "tesis" : /web|pagina/.test(n) ? "web" : /ley|decreto|resolucion/.test(n) ? "ley" : /video|youtube/.test(n) ? "video" : /capitulo/.test(n) ? "capitulo" : /chatgpt|claude|gemini|inteligencia artificial|\bia\b/.test(n) ? "ia" : "articulo";
      return () => generador(t);
    }
    if (/^corrige (mis |las )?referencias( con ia| en apa( 7)?)?$/.test(n)) return tarea(corregirReferenciasIA);
    return null;
  }

  return { asesor, generador, construir, insertarReferencia, revisor, revisar, corregir, corregirReferenciasIA, comando, TEMAS, TIPOS, _listaAutores: listaAutores };
})();
