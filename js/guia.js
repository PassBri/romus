/* Romus · Guía metodológica (ayuda y modo tutorial).
   Contenido ORIGINAL redactado para Romus a partir de los conceptos de:
   - Hernández Sampieri, R., Fernández Collado, C. y Baptista Lucio, M. P. (2014). Metodología de la investigación (6.ª ed.). McGraw-Hill. [HS]
   - Martínez Miguélez, M. (2004). Epistemología y metodología cualitativa en las ciencias sociales. Trillas, cap. 3. [MM]
   No reproduce texto de las obras: explica sus ideas con palabras propias e indica dónde ampliarlas. */
window.Guia = (function () {
  const HS = "Hernández Sampieri et al. (2014)";
  const MM = "Martínez Miguélez (2004)";

  /* Cada tema: id, cat, titulo, claves (palabras para encontrarlo), resumen, puntos, ejemplo, error, fuente, accion (opcional: comando de Romus). */
  const TEMAS = [
    /* ---------- Fundamentos ---------- */
    { id: "investigacion", cat: "Fundamentos", titulo: "¿Qué es investigar?",
      claves: ["investigacion", "investigar", "que es investigar", "proceso de investigacion"],
      resumen: "Investigar es aplicar un conjunto de procesos sistemáticos, críticos y empíricos para estudiar un fenómeno o problema. No es solo buscar información: es producir conocimiento con un método que otros puedan revisar.",
      puntos: ["Sistemático: sigue pasos ordenados y explícitos.", "Crítico: se evalúa y se mejora constantemente.", "Empírico: se apoya en datos o en la experiencia del fenómeno.", "Hay tres grandes rutas: cuantitativa, cualitativa y mixta."],
      ejemplo: "Preguntarse por qué hay conflictos en el recreo y diseñar cómo estudiarlo con datos es investigar; leer opiniones en internet sobre el tema, no.",
      error: "Confundir una revisión bibliográfica o un ensayo de opinión con una investigación.",
      fuente: HS + ", cap. 1" },
    { id: "enfoques", cat: "Fundamentos", titulo: "Enfoques: cuantitativo, cualitativo y mixto",
      claves: ["enfoque", "enfoques", "ruta", "rutas", "cuantitativo", "cualitativo", "mixto", "diferencia entre cuantitativo y cualitativo", "paradigma"],
      resumen: "El enfoque cuantitativo mide, prueba hipótesis y generaliza con estadística; es secuencial. El cualitativo comprende significados desde la perspectiva de los participantes; es inductivo, flexible y en espiral. El mixto combina ambos para obtener una visión más completa.",
      puntos: ["Cuantitativo: variables, medición, muestras representativas, análisis estadístico.", "Cualitativo: categorías, datos en palabras o imágenes, muestras intencionales, interpretación.", "Mixto: integra datos de ambos tipos y produce metainferencias.", "Ningún enfoque es «mejor»: se elige según la pregunta."],
      ejemplo: "¿Cuánto mejora la convivencia con un programa de juegos? → cuantitativo. ¿Cómo viven los estudiantes el conflicto en el recreo? → cualitativo.",
      error: "Elegir el enfoque antes de tener clara la pregunta, o mezclar lenguaje de ambos (por ejemplo, «hipótesis» y «saturación» sin justificar un diseño mixto).",
      fuente: HS + ", cap. 1", accion: "enfoque" },
    { id: "idea", cat: "Fundamentos", titulo: "De la idea al tema de investigación",
      claves: ["idea", "ideas", "tema", "elegir tema", "como elegir un tema", "origen de la investigacion", "fuentes de ideas"],
      resumen: "Las investigaciones nacen de ideas que suelen ser vagas al principio: experiencias, lecturas, conversaciones, observaciones o problemas del trabajo. Para volverlas investigables hay que conocer los antecedentes y acotarlas.",
      puntos: ["Revisa qué se ha estudiado antes sobre la idea.", "Busca un ángulo novedoso o un contexto no estudiado.", "Una buena idea es interesante para ti, aporta algo nuevo y ayuda a resolver un problema o a construir teoría.", "Acota: quién, dónde, cuándo y qué aspecto."],
      ejemplo: "Idea vaga: «el deporte y los jóvenes». Acotada: «efecto del entrenamiento funcional en la condición física de estudiantes de 10.º de un colegio público de Floridablanca».",
      error: "Quedarse con un tema tan amplio que no cabe en un proyecto.",
      fuente: HS + ", cap. 2", accion: "idear" },
    { id: "epistemologia", cat: "Fundamentos", titulo: "Epistemología y paradigma",
      claves: ["epistemologia", "epistemologico", "posicionamiento epistemologico", "paradigma", "paradigmas", "ontologia", "sistemico", "positivismo", "interpretativo"],
      resumen: "Todo método está inserto en un paradigma, y el paradigma en una visión del mundo. Para Martínez Miguélez, la observación nunca es neutral: depende de la teoría y del punto de vista del investigador. Por eso conviene declarar desde dónde se investiga.",
      puntos: ["Declara tu paradigma: positivista, interpretativo, crítico, sistémico o complejo.", "Explica por qué ese paradigma es coherente con tu pregunta y tu método.", "Martínez Miguélez propone un paradigma sistémico y dialéctico, que integra lo empírico, lo interpretativo y lo crítico.", "La cientificidad exige rigor, sistematicidad y criticidad, junto con apertura y creatividad."],
      ejemplo: "«Esta investigación se sitúa en el paradigma interpretativo, porque busca comprender los significados que los docentes atribuyen a la evaluación».",
      error: "Nombrar un paradigma sin que el método sea coherente con él.",
      fuente: MM + ", cap. 3" },
    { id: "cientificidad", cat: "Fundamentos", titulo: "¿Qué hace científico un estudio?",
      claves: ["cientificidad", "rigor cientifico", "ciencia", "conocimiento cientifico", "criticidad", "sistematicidad"],
      resumen: "Para Martínez Miguélez, lo científico no se reduce a medir: exige rigor, sistematicidad y criticidad. Propone superar una idea restrictiva de cientificidad que excluye la creatividad y el estudio de lo humano.",
      puntos: ["Rigor: procedimientos cuidadosos y justificados.", "Sistematicidad: un orden lógico explícito y verificable.", "Criticidad: someter las propias ideas a revisión.", "Apertura: admitir métodos adecuados a la naturaleza del objeto."],
      ejemplo: "Un estudio cualitativo es científico si documenta cómo recolectó y analizó los datos y somete sus interpretaciones a contraste.",
      error: "Creer que un estudio cualitativo es «menos científico» por no usar estadística.",
      fuente: MM + ", cap. 3" },

    /* ---------- Planteamiento ---------- */
    { id: "planteamiento", cat: "Planteamiento", titulo: "Planteamiento del problema",
      claves: ["planteamiento", "planteamiento del problema", "problema", "problema de investigacion", "plantear el problema", "descripcion del problema"],
      resumen: "Plantear el problema es afinar y estructurar la idea. En la ruta cuantitativa incluye objetivos, preguntas, justificación, viabilidad, deficiencias en el conocimiento y consecuencias del estudio. Debe expresar una relación entre conceptos o variables y poder estudiarse empíricamente.",
      puntos: ["Describe la situación con evidencia: qué pasa, a quién, dónde, desde cuándo.", "Delimita población, lugar y tiempo.", "Muestra qué no se sabe todavía (deficiencias en el conocimiento).", "Termina en la pregunta de investigación."],
      ejemplo: "«En la institución X, los registros de convivencia muestran 120 conflictos en el recreo durante 2025, concentrados en sexto grado…».",
      error: "Describir el tema en general sin evidencia del problema, o confundir el problema con su solución.",
      fuente: HS + ", cap. 3", accion: "coherencia" },
    { id: "objetivos", cat: "Planteamiento", titulo: "Objetivos de investigación",
      claves: ["objetivo", "objetivos", "objetivo general", "objetivos especificos", "verbos", "redactar objetivos", "como redactar objetivos"],
      resumen: "Los objetivos dicen qué pretende la investigación. Deben ser claros, alcanzables y congruentes entre sí. El general responde a la pregunta; los específicos son los pasos que, juntos, lo logran.",
      puntos: ["Empiezan con un verbo en infinitivo: describir, determinar, analizar, comparar, comprender, diseñar.", "Un solo objetivo general; tres o cuatro específicos.", "Cada específico debe poder rastrearse en la metodología.", "Evita verbos vagos como «conocer» o «entender» y acciones que no son de investigación (capacitar, implementar) si no las evaluarás."],
      ejemplo: "General: «Determinar el efecto de un programa de juegos cooperativos en la convivencia escolar de estudiantes de sexto grado». Específico: «Medir el nivel de convivencia antes y después del programa».",
      error: "Objetivos específicos que no suman al general, o un general que no responde la pregunta.",
      fuente: HS + ", cap. 3", accion: "coherencia" },
    { id: "preguntas", cat: "Planteamiento", titulo: "Preguntas de investigación",
      claves: ["pregunta", "preguntas", "pregunta de investigacion", "formular la pregunta", "como formular una pregunta"],
      resumen: "Las preguntas presentan el problema de forma directa. Deben ser claras, precisas y responderse con el estudio. Una buena pregunta dice qué se estudia, en quiénes y, si aplica, qué relación se busca.",
      puntos: ["Evita preguntas de sí o no y preguntas demasiado generales.", "Incluye los conceptos o variables centrales.", "Debe ser respondible con los recursos y el tiempo disponibles.", "En lo cualitativo, la pregunta es abierta y puede ajustarse en el campo."],
      ejemplo: "Débil: «¿El deporte es bueno?». Mejor: «¿Qué relación existe entre la actividad física semanal y el rendimiento académico en estudiantes de grado 10?».",
      error: "Hacer una pregunta que el diseño no puede responder (por ejemplo, preguntar por causas con un diseño descriptivo).",
      fuente: HS + ", cap. 3" },
    { id: "justificacion", cat: "Planteamiento", titulo: "Justificación",
      claves: ["justificacion", "justificar", "por que investigar", "relevancia", "conveniencia", "valor teorico", "utilidad metodologica", "implicaciones practicas"],
      resumen: "La justificación explica por qué vale la pena el estudio. Hernández Sampieri et al. proponen cinco criterios para argumentarla; no hace falta cumplirlos todos, pero cuantos más, mejor.",
      puntos: ["Conveniencia: ¿para qué sirve?", "Relevancia social: ¿quiénes se benefician y cómo?", "Implicaciones prácticas: ¿ayuda a resolver un problema real?", "Valor teórico: ¿llena un vacío o aporta a una teoría?", "Utilidad metodológica: ¿crea o mejora un instrumento o una forma de estudiar el fenómeno?"],
      ejemplo: "«Los resultados permitirán a la institución diseñar estrategias de convivencia basadas en evidencia (implicación práctica) y aportan un instrumento validado para medirla (utilidad metodológica)».",
      error: "Justificar solo con opiniones («es muy importante porque sí») o repetir el problema.",
      fuente: HS + ", cap. 3" },
    { id: "viabilidad", cat: "Planteamiento", titulo: "Viabilidad",
      claves: ["viabilidad", "factibilidad", "recursos", "es viable", "tiempo", "acceso"],
      resumen: "Un estudio es viable si se dispone de tiempo, recursos financieros, humanos y materiales, y del acceso al lugar y a los participantes. Conviene evaluarlo antes de comprometerse.",
      puntos: ["¿Tengo acceso a la población y permisos?", "¿El tiempo alcanza para recolectar y analizar?", "¿Cuento con los instrumentos y el software?", "¿Hay costos que no puedo cubrir?"],
      ejemplo: "Un experimento con 600 estudiantes en un semestre puede no ser viable para un trabajo de pregrado; una muestra de 60 en dos cursos sí.",
      error: "Plantear un alcance que no se puede ejecutar con los recursos reales.",
      fuente: HS + ", cap. 3" },
    { id: "planteamiento-cualitativo", cat: "Planteamiento", titulo: "Planteamiento cualitativo",
      claves: ["planteamiento cualitativo", "problema cualitativo", "proposito", "inmersion", "inmersion inicial", "ambiente", "campo"],
      resumen: "En la ruta cualitativa el planteamiento es abierto, expansivo y se va enfocando. Incluye propósito, preguntas, justificación, viabilidad y deficiencias en el conocimiento, además de una primera definición del ambiente o contexto. La inmersión inicial en el campo ayuda a afinarlo.",
      puntos: ["Plantea un propósito de comprensión, no una relación a probar.", "Las preguntas son generales y pueden cambiar.", "Las hipótesis no se prueban al inicio: emergen durante el estudio.", "Describe el ambiente y cómo entrarás al campo."],
      ejemplo: "Propósito: «Comprender cómo los estudiantes de sexto grado viven y significan los conflictos durante el recreo».",
      error: "Escribir un planteamiento cualitativo con lenguaje de variables y medición.",
      fuente: HS + ", cap. 12" },

    /* ---------- Marco teórico ---------- */
    { id: "marco-teorico", cat: "Marco teórico", titulo: "Marco teórico (perspectiva teórica)",
      claves: ["marco teorico", "perspectiva teorica", "teoria", "teorias", "como hacer el marco teorico", "marco referencial"],
      resumen: "El marco teórico sustenta el estudio con teorías, investigaciones previas y antecedentes. Sirve para prevenir errores, orientar el método, ampliar el horizonte, sugerir hipótesis y servir de referencia para interpretar los resultados.",
      puntos: ["Etapas: revisión analítica de la literatura y construcción del marco.", "Dos métodos para organizarlo: por mapeo (un mapa conceptual de la literatura) o por índices (un esquema de temas y subtemas).", "No es un collage de citas: debe hilar un argumento.", "Termina mostrando el vacío que tu estudio atiende."],
      ejemplo: "Índice: 1. Convivencia escolar (definiciones). 2. Juego cooperativo (teorías). 3. Estudios que relacionan ambos. 4. Vacío: pocos estudios en contextos rurales colombianos.",
      error: "Acumular definiciones de diccionario o copiar párrafos sin análisis.",
      fuente: HS + ", cap. 4", accion: "literatura" },
    { id: "revision-literatura", cat: "Marco teórico", titulo: "Revisión de la literatura",
      claves: ["revision de la literatura", "literatura", "antecedentes", "estado del arte", "fuentes", "buscar fuentes", "fuentes primarias", "fuentes secundarias"],
      resumen: "La revisión consiste en detectar, obtener y consultar la literatura útil, y extraer de ella lo relevante. Las fuentes primarias son los estudios originales; las secundarias y terciarias los resumen o los listan.",
      puntos: ["Prioriza artículos científicos recientes (últimos 5 a 10 años) y revisiones sistemáticas.", "De cada estudio extrae: autor, año, objetivo, método, muestra, hallazgo y limitaciones.", "Organiza por temas o tendencias, no estudio por estudio.", "Con Romus: «busca literatura sobre…» trae trabajos reales y los cita en APA 7."],
      ejemplo: "Una matriz de antecedentes con columnas Autor-año | Objetivo | Método | Hallazgo | Aporte a mi estudio.",
      error: "Citar solo fuentes secundarias (blogs, manuales) o trabajos muy antiguos sin justificación.",
      fuente: HS + ", cap. 4", accion: "literatura" },

    /* ---------- Ruta cuantitativa ---------- */
    { id: "alcance", cat: "Ruta cuantitativa", titulo: "Alcance: exploratorio, descriptivo, correlacional o explicativo",
      claves: ["alcance", "alcances", "exploratorio", "descriptivo", "correlacional", "explicativo", "tipo de investigacion", "nivel de investigacion"],
      resumen: "El alcance indica hasta dónde llega el estudio. Depende de cuánto se sabe del tema y de lo que se quiere lograr. Un mismo estudio puede combinar alcances.",
      puntos: ["Exploratorio: tema poco estudiado; abre camino.", "Descriptivo: especifica propiedades y características de un fenómeno o grupo.", "Correlacional: mide el grado de asociación entre dos o más variables (sin afirmar causa).", "Explicativo: busca las causas de los fenómenos; suele requerir diseño experimental.", "El alcance define el tipo de hipótesis y de diseño."],
      ejemplo: "«¿Se asocia el tiempo de pantalla con el rendimiento?» es correlacional; «¿El programa X mejora el rendimiento?» es explicativo.",
      error: "Afirmar causalidad a partir de una correlación (correlaciones espurias).",
      fuente: HS + ", cap. 5" },
    { id: "hipotesis", cat: "Ruta cuantitativa", titulo: "Hipótesis",
      claves: ["hipotesis", "hipotesis nula", "hipotesis alternativa", "tipos de hipotesis", "formular hipotesis", "prueba de hipotesis"],
      resumen: "Una hipótesis es una explicación tentativa del fenómeno, formulada como proposición que puede someterse a prueba. No todos los estudios cuantitativos las requieren: dependen del alcance (los exploratorios no las formulan).",
      puntos: ["Tipos de hipótesis de investigación: descriptivas de un dato, correlacionales, de diferencia de grupos y causales.", "Hipótesis nula (H0): niega la relación planteada.", "Hipótesis alternativa: otra posibilidad distinta a la de investigación y la nula.", "Debe referirse a una situación real, con variables comprensibles, relación clara y técnicas disponibles para probarla."],
      ejemplo: "Hi: «Los estudiantes que participan en el programa presentan mayor nivel de convivencia que los que no participan». H0: «No hay diferencia en el nivel de convivencia…».",
      error: "Formular hipótesis en un estudio exploratorio o cualitativo sin justificarlo, o hipótesis imposibles de medir.",
      fuente: HS + ", cap. 6" },
    { id: "variables", cat: "Ruta cuantitativa", titulo: "Variables: definición conceptual y operacional",
      claves: ["variable", "variables", "operacionalizacion", "operacionalizar", "definicion operacional", "definicion conceptual", "independiente", "dependiente", "dimensiones", "indicadores"],
      resumen: "Una variable es una propiedad que puede fluctuar y medirse u observarse. Cada variable necesita una definición conceptual (qué significa, según la teoría) y una definición operacional (cómo se medirá exactamente).",
      puntos: ["Independiente: la que se supone causa o se manipula.", "Dependiente: la que recibe el efecto y se mide.", "Operacionaliza en una tabla: variable → definición → dimensiones → indicadores → ítems → escala.", "El nivel de medición (nominal, ordinal, de intervalo o de razón) define el análisis estadístico."],
      ejemplo: "Convivencia escolar (conceptual: forma de relacionarse en la escuela basada en el respeto…). Operacional: puntaje en la escala X de 24 ítems tipo Likert, con dimensiones de respeto, cooperación y manejo de conflictos.",
      error: "Definir las variables solo con el diccionario o no decir con qué instrumento se medirán.",
      fuente: HS + ", cap. 6" },
    { id: "diseno-experimental", cat: "Ruta cuantitativa", titulo: "Diseños experimentales",
      claves: ["diseno experimental", "experimento", "experimental", "cuasiexperimental", "cuasiexperimento", "preexperimento", "grupo control", "preprueba", "posprueba", "pretest", "postest", "solomon", "factorial"],
      resumen: "En un experimento se manipula intencionalmente una o más variables independientes para analizar sus efectos sobre variables dependientes, con control de la situación. Hay preexperimentos, experimentos «puros» y cuasiexperimentos.",
      puntos: ["Requisitos: manipular la variable independiente, medir la dependiente y lograr control y validez interna.", "Experimento puro: grupos de comparación y asignación al azar (o emparejamiento).", "Cuasiexperimento: grupos ya formados (por ejemplo, cursos), sin asignación al azar.", "Preexperimento: un solo grupo, control mínimo; sirve como aproximación.", "Amenazas a la validez interna: historia, maduración, administración de pruebas, instrumentación, regresión, selección, mortalidad, entre otras."],
      ejemplo: "Dos cursos de sexto: uno recibe el programa (experimental) y otro no (control); ambos se miden antes y después. Es un cuasiexperimento con preprueba y posprueba.",
      error: "Llamar «experimental» a un estudio sin grupo de comparación ni manipulación.",
      fuente: HS + ", cap. 7" },
    { id: "diseno-no-experimental", cat: "Ruta cuantitativa", titulo: "Diseños no experimentales",
      claves: ["diseno no experimental", "no experimental", "transeccional", "transversal", "longitudinal", "panel", "cohorte", "tendencia", "encuesta"],
      resumen: "En los diseños no experimentales no se manipulan variables: se observan los fenómenos tal como ocurren. Pueden ser transeccionales (una sola medición) o longitudinales (varias mediciones en el tiempo).",
      puntos: ["Transeccionales: exploratorios, descriptivos o correlacionales-causales.", "Longitudinales: de tendencia, de evolución de grupo (cohortes) o panel (los mismos participantes).", "Útiles cuando no es ético o posible manipular la variable.", "Permiten describir y relacionar, pero la causalidad se afirma con cautela."],
      ejemplo: "Aplicar una encuesta de hábitos de actividad física a todos los estudiantes en octubre de 2026 es un diseño transeccional descriptivo.",
      error: "Concluir causas a partir de una sola medición transversal.",
      fuente: HS + ", cap. 7" },
    { id: "muestra", cat: "Ruta cuantitativa", titulo: "Población y muestra",
      claves: ["muestra", "muestreo", "poblacion", "tamano de muestra", "probabilistica", "no probabilistica", "aleatorio", "estratificado", "racimos", "conglomerados", "marco muestral", "calcular la muestra"],
      resumen: "La población es el conjunto de casos que concuerdan con ciertas especificaciones; la muestra es un subgrupo de ella. Primero se define la unidad de análisis (sobre qué o quiénes), luego la población y finalmente el tipo de muestra.",
      puntos: ["Probabilística: todos tienen la misma probabilidad de ser elegidos; permite generalizar (simple, estratificada, por racimos, sistemática).", "No probabilística: la elección depende del investigador; no permite generalizar estadísticamente.", "El tamaño de una muestra probabilística se calcula con el tamaño de la población, el nivel de confianza (p. ej., 95 %) y el margen de error (p. ej., 5 %).", "Describe el marco muestral: la lista de donde se eligen los casos."],
      ejemplo: "Población: 480 estudiantes de secundaria. Con 95 % de confianza y 5 % de error se necesitan unos 214; muestreo estratificado por grado.",
      error: "Llamar «aleatoria» a una muestra elegida por conveniencia.",
      fuente: HS + ", cap. 8" },
    { id: "instrumentos", cat: "Ruta cuantitativa", titulo: "Instrumentos: confiabilidad, validez y objetividad",
      claves: ["instrumento", "instrumentos", "confiabilidad", "validez", "validacion", "alfa de cronbach", "cronbach", "juicio de expertos", "validez de contenido", "validez de constructo", "validez de criterio", "objetividad", "cuestionario", "escala likert", "likert", "prueba piloto"],
      resumen: "Medir es vincular conceptos abstractos con indicadores empíricos. Todo instrumento debe ser confiable (resultados consistentes), válido (mide lo que dice medir) y objetivo (poco influido por quien lo aplica).",
      puntos: ["Confiabilidad: test-retest, formas alternativas, mitades partidas o consistencia interna (alfa de Cronbach; suele aceptarse desde 0,70).", "Validez de contenido: los ítems cubren todo el dominio (juicio de expertos).", "Validez de criterio: se compara con otra medida externa.", "Validez de constructo: el instrumento se comporta como predice la teoría (p. ej., análisis factorial).", "Haz una prueba piloto antes de aplicarlo."],
      ejemplo: "Escala de convivencia validada por cinco expertos (contenido), piloteada con 30 estudiantes (alfa = 0,86).",
      error: "Usar un cuestionario hecho por uno mismo sin ningún proceso de validación.",
      fuente: HS + ", cap. 9" },
    { id: "analisis-cuantitativo", cat: "Ruta cuantitativa", titulo: "Análisis de datos cuantitativos",
      claves: ["analisis cuantitativo", "analisis de datos", "estadistica", "estadistica descriptiva", "estadistica inferencial", "spss", "prueba t", "chi cuadrado", "correlacion de pearson", "pruebas parametricas", "no parametricas", "normalidad"],
      resumen: "El análisis sigue pasos: elegir el programa, explorar los datos, evaluar la confiabilidad y validez del instrumento, analizar descriptivamente cada variable y luego probar las hipótesis con estadística inferencial.",
      puntos: ["Descriptiva: frecuencias, media, mediana, moda y desviación estándar.", "Inferencial: pruebas paramétricas (t de Student, ANOVA, correlación de Pearson) si los datos cumplen supuestos como la normalidad.", "No paramétricas (chi cuadrado, U de Mann-Whitney, Spearman) si no los cumplen o el nivel de medición es nominal u ordinal.", "Reporta el nivel de significancia (p. ej., p < 0,05) y el tamaño del efecto."],
      ejemplo: "Para comparar la convivencia antes y después en el mismo grupo: prueba t para muestras relacionadas (o Wilcoxon si no hay normalidad).",
      error: "Elegir la prueba estadística sin considerar el nivel de medición ni la hipótesis.",
      fuente: HS + ", cap. 10" },
    { id: "reporte-cuantitativo", cat: "Ruta cuantitativa", titulo: "Reporte de resultados cuantitativo",
      claves: ["reporte", "informe final", "resultados", "discusion", "conclusiones", "reporte cuantitativo", "estructura del informe"],
      resumen: "Antes de escribir, define quién leerá el reporte y en qué contexto (académico o no académico). El reporte académico suele incluir portada, resumen, introducción, marco teórico, método, resultados, discusión, referencias y apéndices.",
      puntos: ["Resultados: presenta los datos sin interpretarlos (tablas y figuras numeradas).", "Discusión: interpreta, compara con la literatura, señala limitaciones y recomendaciones.", "Conclusiones: responden a la pregunta y a los objetivos.", "Usa normas como APA 7 para citas, tablas y referencias."],
      ejemplo: "Tabla 1. Puntajes de convivencia antes y después del programa (media y desviación estándar por grupo).",
      error: "Mezclar resultados con opiniones o presentar conclusiones que no se derivan de los datos.",
      fuente: HS + ", cap. 11" },

    /* ---------- Ruta cualitativa ---------- */
    { id: "muestreo-cualitativo", cat: "Ruta cualitativa", titulo: "Muestreo cualitativo y saturación",
      claves: ["muestreo cualitativo", "muestra cualitativa", "saturacion", "saturacion de categorias", "participantes", "muestra intencional", "bola de nieve", "informantes clave", "casos tipo", "expertos", "conveniencia", "maxima variacion"],
      resumen: "En lo cualitativo la muestra no busca representatividad estadística sino profundidad. Se eligen casos que ayuden a entender el fenómeno y el tamaño se decide en el campo hasta la saturación: cuando los nuevos casos ya no aportan información nueva.",
      puntos: ["Tipos: de máxima variación, homogénea, en cadena o bola de nieve, de casos extremos, teórica, de expertos, de casos tipo, por oportunidad o por conveniencia.", "Factores para el tamaño: capacidad operativa del investigador, entendimiento del fenómeno (saturación) y naturaleza del fenómeno.", "Primero hay una muestra inicial tras la inmersión; puede ajustarse.", "Justifica por qué esos participantes y no otros."],
      ejemplo: "Doce estudiantes de sexto elegidos por máxima variación (género, curso y nivel de participación en conflictos), hasta saturar las categorías.",
      error: "Calcular un tamaño de muestra estadístico para un estudio cualitativo.",
      fuente: HS + ", cap. 13" },
    { id: "recoleccion-cualitativa", cat: "Ruta cualitativa", titulo: "Recolección cualitativa: entrevistas, observación y grupos focales",
      claves: ["recoleccion cualitativa", "entrevista", "entrevistas", "entrevista semiestructurada", "observacion", "observacion participante", "grupo focal", "grupos focales", "diario de campo", "bitacora", "documentos", "historias de vida"],
      resumen: "En la ruta cualitativa el investigador es el principal instrumento. Recolecta datos en el ambiente natural de los participantes: observación, entrevistas, grupos de enfoque, documentos, materiales audiovisuales e historias de vida.",
      puntos: ["Entrevista: estructurada, semiestructurada o abierta; con guía flexible.", "Observación: no es mirar; implica estar atento a detalles, registrar y reflexionar.", "Grupos de enfoque: interacción de 3 a 10 personas sobre un tema.", "Lleva una bitácora o diario de campo con descripciones e interpretaciones separadas."],
      ejemplo: "Guía de entrevista semiestructurada con 8 preguntas abiertas sobre cómo viven los estudiantes el recreo, más observación de 6 recreos.",
      error: "Hacer entrevistas con preguntas cerradas de sí o no, como si fueran una encuesta.",
      fuente: HS + ", cap. 14" },
    { id: "analisis-cualitativo", cat: "Ruta cualitativa", titulo: "Análisis cualitativo: codificación y categorías",
      claves: ["analisis cualitativo", "codificacion", "codificar", "codificacion abierta", "codificacion axial", "codificacion selectiva", "categorias", "categorizacion", "temas", "unidades de analisis", "atlas ti", "nvivo", "memos"],
      resumen: "El análisis cualitativo no espera a tener todos los datos: recolección y análisis ocurren a la vez. Se organizan los datos, se definen unidades de análisis y se codifican en dos planos: primero se generan categorías y luego se relacionan entre sí en temas.",
      puntos: ["Prepara y transcribe los datos.", "Codificación en primer plano (abierta): asignar códigos a fragmentos y agruparlos en categorías.", "Codificación en segundo plano (axial o selectiva): relacionar categorías y generar temas o una teoría.", "Escribe memos analíticos y usa software (Atlas.ti, NVivo, MAXQDA) si lo necesitas."],
      ejemplo: "Fragmentos como «me empujaron en la fila» y «se burlan del que pierde» → código «agresión en el juego» → categoría «competencia mal gestionada».",
      error: "Presentar citas de los participantes sin categorizarlas ni interpretarlas.",
      fuente: HS + ", cap. 14" },
    { id: "rigor-cualitativo", cat: "Ruta cualitativa", titulo: "Rigor cualitativo",
      claves: ["rigor", "rigor cualitativo", "credibilidad", "dependencia", "transferencia", "transferibilidad", "confirmabilidad", "confirmacion", "triangulacion", "validez cualitativa"],
      resumen: "La calidad de un estudio cualitativo se valora con criterios propios, equivalentes a la confiabilidad y la validez de lo cuantitativo.",
      puntos: ["Dependencia (consistencia lógica): otros investigadores llegarían a interpretaciones similares con los mismos datos.", "Credibilidad: se captó el significado completo de las experiencias de los participantes.", "Transferencia: el lector puede valorar si los resultados aplican a otro contexto (descripción densa).", "Confirmación: se minimizan los sesgos del investigador (auditoría, reflexividad).", "Estrategias: triangulación de fuentes, investigadores y métodos; chequeo con participantes; bitácora."],
      ejemplo: "«Para la credibilidad se devolvieron las interpretaciones a cinco participantes; para la dependencia, dos investigadores codificaron por separado y se compararon los códigos».",
      error: "Hablar de «validez estadística» en un estudio cualitativo o no decir nada sobre el rigor.",
      fuente: HS + ", cap. 14" },
    { id: "disenos-cualitativos", cat: "Ruta cualitativa", titulo: "Diseños cualitativos",
      claves: ["diseno cualitativo", "disenos cualitativos", "teoria fundamentada", "etnografia", "etnografico", "narrativo", "fenomenologico", "fenomenologia", "investigacion accion", "investigacion-accion", "estudio de caso", "estudio de casos"],
      resumen: "El diseño cualitativo es el abordaje general del estudio; es flexible y se ajusta en el campo. Los básicos son: teoría fundamentada, etnográfico, narrativo, fenomenológico e investigación-acción.",
      puntos: ["Teoría fundamentada: produce una teoría desde los datos (sistemática o emergente).", "Etnográfico: describe y analiza la cultura de un grupo.", "Narrativo: reconstruye historias y experiencias en secuencia.", "Fenomenológico: explora la esencia de una experiencia compartida.", "Investigación-acción: busca resolver un problema práctico con participación de los involucrados (ciclos de diagnóstico, plan, acción y reflexión)."],
      ejemplo: "Un docente que diagnostica la convivencia, diseña con sus estudiantes un programa, lo aplica y reflexiona sobre los cambios hace investigación-acción.",
      error: "Elegir un diseño por su nombre sin seguir sus procedimientos.",
      fuente: HS + ", cap. 15" },
    { id: "reporte-cualitativo", cat: "Ruta cualitativa", titulo: "Reporte cualitativo",
      claves: ["reporte cualitativo", "informe cualitativo", "resultados cualitativos", "escribir resultados cualitativos"],
      resumen: "El reporte cualitativo describe el estudio, el método, las categorías y temas, y su interpretación, con citas de los participantes que ilustran cada categoría. Es más narrativo y flexible que el cuantitativo.",
      puntos: ["Presenta cada categoría con su definición y fragmentos que la sustentan.", "Muestra las relaciones entre categorías (un modelo o un diagrama).", "Discute los hallazgos frente a la literatura.", "Incluye la reflexión del investigador y los criterios de rigor aplicados."],
      ejemplo: "Categoría 1: «Competencia mal gestionada». Definición, tres citas de estudiantes y su interpretación.",
      error: "Convertir el reporte en una lista de citas sin análisis.",
      fuente: HS + ", cap. 16" },

    /* ---------- Ruta mixta ---------- */
    { id: "mixtos", cat: "Ruta mixta", titulo: "Métodos mixtos",
      claves: ["metodos mixtos", "metodo mixto", "enfoque mixto", "investigacion mixta", "diseno mixto", "disenos mixtos", "secuencial", "concurrente", "triangulacion", "anidado", "explicativo secuencial", "exploratorio secuencial", "integracion", "metainferencias"],
      resumen: "Los métodos mixtos recolectan y analizan datos cuantitativos y cualitativos, y los integran para obtener una comprensión más completa del fenómeno. El diseño depende de la prioridad de cada enfoque, la secuencia y el propósito de la integración.",
      puntos: ["Exploratorio secuencial: primero cualitativo, luego cuantitativo (p. ej., para construir un instrumento).", "Explicativo secuencial: primero cuantitativo, luego cualitativo para explicar los resultados.", "De triangulación concurrente: ambos a la vez, para comparar y confirmar.", "Anidado: un enfoque dominante con otro incrustado.", "La integración produce metainferencias: conclusiones que ningún enfoque daría por sí solo."],
      ejemplo: "Fase 1: encuesta de convivencia a 200 estudiantes. Fase 2: entrevistas a 10 con los puntajes más bajos para entender por qué (explicativo secuencial).",
      error: "Llamar «mixto» a un estudio que solo agrega una pregunta abierta a una encuesta, sin integrar los resultados.",
      fuente: HS + ", cap. 17" },

    /* ---------- Escritura y normas ---------- */
    { id: "etica", cat: "Escritura y ética", titulo: "Ética en la investigación",
      claves: ["etica", "consentimiento", "consentimiento informado", "asentimiento", "confidencialidad", "comite de etica", "menores", "datos personales", "ley 1581", "habeas data"],
      resumen: "Toda investigación con personas debe proteger su dignidad, su autonomía y su bienestar. Con menores de edad se requiere el consentimiento de los padres y el asentimiento del menor.",
      puntos: ["Consentimiento informado por escrito: objetivo, procedimientos, riesgos, beneficios y derecho a retirarse.", "Confidencialidad y anonimato en el reporte.", "En Colombia, el tratamiento de datos personales se rige por la Ley 1581 de 2012.", "Solicita el aval del comité de ética de tu institución cuando aplique."],
      ejemplo: "«Los datos se codificarán con números; ningún nombre aparecerá en el informe».",
      error: "Recolectar datos de estudiantes sin autorización de los acudientes ni de la institución.",
      fuente: HS + " (centro de recursos en línea: ética en la investigación); Ley 1581 de 2012" },
    { id: "apa", cat: "Escritura y ética", titulo: "Citas y referencias en APA 7",
      claves: ["apa", "apa 7", "normas apa", "citas", "citar", "referencias", "bibliografia", "como citar", "cita textual", "parafraseo", "et al"],
      resumen: "APA 7 usa el sistema autor-año. Toda cita en el texto debe tener su referencia en la lista final, y viceversa. Romus puede buscar fuentes reales y citarlas automáticamente.",
      puntos: ["Parafraseo: (Apellido, año). Cita textual corta: entre comillas con página (Apellido, año, p. 23).", "Dos autores: (Pérez y Gómez, 2021). Tres o más: (Pérez et al., 2021).", "Cita textual de 40 palabras o más: en bloque aparte, sin comillas, con sangría.", "Referencias en orden alfabético, con sangría francesa y DOI cuando exista."],
      ejemplo: "Gómez Rojas, M. F., Pérez, L. y Ruiz Díaz, A. (2021). Juegos cooperativos y convivencia escolar. Revista de Educación Física, 12(3), 45-60. https://doi.org/…",
      error: "Poner en la lista de referencias obras que no se citan en el texto, o citar sin referencia.",
      fuente: "Manual de publicaciones APA, 7.ª ed.", accion: "literatura" },
    { id: "uso-ia", cat: "Escritura y ética", titulo: "Uso responsable de la IA en tu proyecto",
      claves: ["inteligencia artificial", "ia", "uso de ia", "declaracion de uso de ia", "plagio", "integridad academica", "chatgpt"],
      resumen: "La IA puede orientar, revisar y sugerir, pero la autoría, las decisiones metodológicas y la responsabilidad son del investigador. Muchas instituciones piden declarar cómo se usó.",
      puntos: ["Verifica todo lo que proponga la IA: puede equivocarse o inventar datos.", "Nunca uses referencias que no hayas comprobado (Romus solo cita fuentes reales de OpenAlex).", "Reescribe con tu voz lo que la IA sugiera.", "Declara el uso: di «declaración de uso de IA» y Romus la agrega con el registro."],
      ejemplo: "«Se usó Romus con el modelo X para revisar la coherencia y buscar literatura; las decisiones y la redacción final son del autor».",
      error: "Entregar texto generado por IA como propio sin revisarlo ni declararlo.",
      fuente: "Romus", accion: "declaracion" }
  ];

  /* ---------- Rutas del modo tutorial (orden del proceso) ---------- */
  const RUTAS = {
    cuantitativo: ["investigacion", "enfoques", "idea", "planteamiento", "objetivos", "preguntas", "justificacion", "viabilidad", "marco-teorico", "revision-literatura", "alcance", "hipotesis", "variables", "diseno-experimental", "diseno-no-experimental", "muestra", "instrumentos", "analisis-cuantitativo", "etica", "reporte-cuantitativo", "apa", "uso-ia"],
    cualitativo: ["investigacion", "enfoques", "epistemologia", "idea", "planteamiento-cualitativo", "preguntas", "justificacion", "viabilidad", "marco-teorico", "revision-literatura", "disenos-cualitativos", "muestreo-cualitativo", "recoleccion-cualitativa", "analisis-cualitativo", "rigor-cualitativo", "etica", "reporte-cualitativo", "cientificidad", "apa", "uso-ia"],
    mixto: ["investigacion", "enfoques", "epistemologia", "idea", "planteamiento", "objetivos", "preguntas", "justificacion", "marco-teorico", "revision-literatura", "mixtos", "muestra", "muestreo-cualitativo", "instrumentos", "recoleccion-cualitativa", "analisis-cuantitativo", "analisis-cualitativo", "rigor-cualitativo", "etica", "apa", "uso-ia"]
  };

  /* ---------- Búsqueda ---------- */
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
  const VACIAS = new Set("que es son como se hace hago una uno unos unas el la los las de del al en y o a para por con sin sobre mi mis tu su sus me te lo le les esto este esta eso cual cuales cuando donde quien explica explicame dime ayuda ayudame guia tutorial significa significan sirve hacer hacerlo redacto redactar formulo formular escribo escribir elijo elegir defino definir calculo calcular diferencia entre tipos tipo romus ok porfa favor por favor quiero saber necesito".split(" "));
  const indexar = (t) => ({ t, frases: [norm(t.titulo)].concat(t.claves.map(norm)), texto: " " + norm([t.titulo, t.claves.join(" "), t.resumen, t.puntos.join(" "), (t.tipos || []).join(" ")].join(" ")) + " " });
  let INDICE = TEMAS.map(indexar);
  /** Agrega temas de otra biblioteca (por ejemplo, la Teoría de Brian Suárez). */
  function agregar(temas) { temas.forEach(t => { if (!TEMAS.some(x => x.id === t.id)) { TEMAS.push(t); INDICE.push(indexar(t)); } }); }
  const raiz = (w) => w.length > 6 ? w.slice(0, w.length - 2) : w;

  /** Devuelve [{t, puntos}] ordenados por relevancia. */
  function buscar(consulta, max) {
    const q = " " + norm(consulta) + " ";
    const palabras = norm(consulta).split(" ").filter(w => w.length >= 3 && !VACIAS.has(w));
    if (!palabras.length) return [];
    return INDICE.map(({ t, frases, texto }) => {
      let p = 0;
      frases.forEach(f => { if (f.length > 3 && q.includes(" " + f + " ")) p += 3 + f.split(" ").length; });
      palabras.forEach(w => {
        const r = raiz(w);
        if (frases.some(f => (" " + f + " ").includes(" " + r))) p += 2;
        else if (texto.includes(" " + r)) p += 0.5;
      });
      return { t, puntos: p };
    }).filter(x => x.puntos >= 2).sort((a, b) => b.puntos - a.puntos).slice(0, max || 3);
  }

  function tema(id) { return TEMAS.find(t => t.id === id); }
  function categorias() { const c = []; TEMAS.forEach(t => { if (!c.includes(t.cat)) c.push(t.cat); }); return c; }

  /** Texto plano de un tema (para la IA o para leer en voz alta). */
  function textoPlano(t) {
    const lista = (nombre, xs) => xs && xs.length ? `\n${nombre}:\n- ${xs.join("\n- ")}` : "";
    return `${t.titulo}\n${t.resumen}${lista("Puntos clave", t.puntos)}${lista("Tipos", t.tipos)}${lista("Cómo se construye", t.pasos)}${lista("Partes", t.partes)}${lista("Ejemplos por nivel", t.niveles)}` +
      (t.ejemplo ? `\nEjemplo: ${t.ejemplo}` : "") + (t.error ? `\nError frecuente: ${t.error}` : "") + `\nFuente: ${t.fuente}`;
  }

  return { TEMAS, RUTAS, buscar, tema, categorias, textoPlano, norm, agregar };
})();
