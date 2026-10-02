/* Romus — Citas en el texto según APA 7 (español), todas las clases:
   paráfrasis, textual corta y en bloque, narrativa (de autor) y parentética (de contenido), cita de cita,
   autor corporativo con sigla (primera mención y siguientes), sin autor, sin fecha, varios autores,
   varios trabajos, mismo autor y año (a, b), obras clásicas o reeditadas, comunicación personal,
   traducción propia, énfasis añadido, omisiones y leyes.
   Lo usan Mis documentos, el generador de citas y el revisor APA. */
window.Citas = (function () {
  /* ---------- Autores ---------- */
  const apellido = (x) => { x = String(x || "").trim(); if (!x) return ""; if (x.includes(",")) return x.split(",")[0].trim(); const p = window.Inv && Inv._partirNombre ? Inv._partirNombre(x) : null; return p ? p.apellido : x.split(/\s+/).pop(); };
  /** Lista de autores escrita por el usuario → apellidos. Acepta «Pérez, A.; Gómez, L.» o «Ana Pérez y Luis Gómez». */
  function partirAutores(txt) { return String(txt || "").split(/\s*(?:;|&|\s+y\s+|\s+and\s+)\s*/).map(x => x.trim()).filter(Boolean); }
  /** Parte de autor de una cita: 1 → Pérez; 2 → Pérez y Gómez; 3+ → Pérez et al. */
  function autoresCita(lista) {
    const as = lista.map(apellido).filter(Boolean);
    if (!as.length) return "";
    if (as.length === 1) return as[0];
    if (as.length === 2) return `${as[0]} y ${as[1]}`;
    return `${as[0]} et al.`;
  }
  const esCorporativo = (x) => /^(ministerio|universidad|instituto|secretar|organizaci|unesco|unicef|banco|departamento|congreso|corte|consejo|fundaci|asociaci|sociedad|comisi|agencia|federaci|naciones unidas|world|american|national|openai|google|anthropic|microsoft|dane|icfes|sena|men\b)/i.test(String(x || "").trim());

  /* ---------- Ubicación (página, párrafo, diapositiva…) ---------- */
  function ubicacion(u) {
    if (!u) return "";
    const s = String(u).trim();
    if (/^(p|pp|párr|diap|cap|min|sec)\.\s/.test(s) || /^(capítulo|sección|tabla|figura)\b/i.test(s)) return s;
    if (/^\d+\s*[-–]\s*\d+$/.test(s)) return "pp. " + s.replace(/\s*[-–]\s*/, "–");
    if (/^\d+$/.test(s)) return "p. " + s;
    return s;
  }

  /* ---------- La cita ---------- */
  /** o: {autores:[...] | autor:"texto", corporativo:{nombre, sigla}, primera:bool, titulo, tipoObra:'articulo'|'libro',
          anio, anioOriginal, sufijo:'a', ubic, narrativa:bool, original:{autor, anio} (cita de cita),
          traduccion:bool, comunicacion:{nombre, fecha}}
      Devuelve {texto, nota} con la cita lista para el texto. */
  function formato(o) {
    o = o || {};
    const anioTxt = (o.anioOriginal ? `${o.anioOriginal}/` : "") + (o.anio ? String(o.anio).trim() : "s. f.") + (o.sufijo || "");
    const extras = [ubicacion(o.ubic), o.traduccion ? "traducción propia" : "", o.enfasis ? "énfasis añadido" : ""].filter(Boolean);
    const notas = [];
    // Comunicación personal: inicial y apellido, fecha completa; no va en la lista de referencias.
    if (o.comunicacion) {
      const n = String(o.comunicacion.nombre || "").trim().split(/\s+/);
      const nom = (n.length > 1 ? n.slice(0, -1).map(x => x.charAt(0).toUpperCase() + ".").join(" ") + " " : "") + (n[n.length - 1] || "");
      return { texto: o.narrativa ? `${nom} (comunicación personal, ${o.comunicacion.fecha})` : `(${nom}, comunicación personal, ${o.comunicacion.fecha})`, nota: "Las comunicaciones personales no van en la lista de referencias." };
    }
    // Quién: autor(es), institución o título.
    let quien, siglaNarr = "";
    if (o.corporativo && o.corporativo.nombre) {
      const { nombre, sigla } = o.corporativo;
      if (sigla && o.primera) { notas.push("Primera mención: nombre completo y sigla. Después usa solo la sigla."); if (o.narrativa) { quien = nombre; siglaNarr = sigla; } else quien = `${nombre} [${sigla}]`; }
      else quien = sigla || nombre;
    } else if (o.titulo && !(o.autores && o.autores.length) && !o.autor) {
      const t = String(o.titulo).split(/[:.]/)[0].trim().split(/\s+/).slice(0, 5).join(" ");
      quien = o.tipoObra === "libro" ? `*${t}*` : `«${t}»`;
      notas.push(o.tipoObra === "libro" ? "Sin autor: el título del libro o informe va en cursiva." : "Sin autor: el título del artículo o capítulo va entre comillas.");
    } else quien = autoresCita(o.autores || partirAutores(o.autor));
    const dentro = [anioTxt].concat(extras).join(", ");
    // Cita de cita: (Original, año, como se citó en Fuente, año).
    if (o.original && o.original.autor) {
      notas.push("Cita de cita: en la lista de referencias va solo la fuente que leíste, no la original.");
      const orig = autoresCita(partirAutores(o.original.autor)), aO = o.original.anio ? String(o.original.anio).trim() : "";
      const fuente = `${quien}, ${dentro}`;
      return { texto: o.narrativa ? `${orig} (${aO ? aO + ", " : ""}como se citó en ${fuente})` : `(${orig}${aO ? ", " + aO : ""}, como se citó en ${fuente})`, nota: notas.join(" ") };
    }
    const texto = o.narrativa ? `${quien} (${siglaNarr ? siglaNarr + ", " : ""}${dentro})` : `(${quien}, ${dentro})`;
    return { texto, nota: notas.join(" ") };
  }
  /** Varios trabajos en un mismo paréntesis: orden alfabético, separados por punto y coma; mismo autor → años separados por coma. */
  function varias(citas) {
    const partes = citas.map(c => String(c).replace(/^\(|\)$/g, "").trim()).filter(Boolean);
    const grupos = [];
    partes.forEach(pz => { const m = pz.match(/^(.*?),\s*((?:\d{4}|s\. f\.).*)$/); const autor = m ? m[1] : pz, resto = m ? m[2] : ""; const g = grupos.find(x => x.autor === autor); g ? g.anios.push(resto) : grupos.push({ autor, anios: [resto] }); });
    const norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    grupos.sort((a, b) => norm(a.autor).localeCompare(norm(b.autor)));
    return "(" + grupos.map(g => g.autor + (g.anios[0] ? ", " + g.anios.sort((x, y) => String(x).localeCompare(String(y), "es", { numeric: true })).join(", ") : "")).join("; ") + ")";
  }
  /** Cita textual lista para insertar: corta (comillas) o en bloque (≥ 40 palabras, sin comillas, cita después del punto). */
  function textual(texto, cita, narrativaInicio) {
    const limpio = String(texto || "").trim().replace(/^[«"“]+|[»"”]+$/g, "");
    const palabras = limpio.split(/\s+/).filter(Boolean).length;
    if (palabras >= 40) {
      const fin = /[.!?…]$/.test(limpio) ? limpio : limpio + ".";
      return { bloque: true, palabras, texto: narrativaInicio ? fin : `${fin} ${cita}`, nota: "Cita en bloque (40 palabras o más): párrafo aparte con sangría de 1,27 cm, sin comillas, y la cita después del punto final." };
    }
    return { bloque: false, palabras, texto: narrativaInicio ? `«${limpio}»` : `«${limpio}» ${cita}`, nota: "Cita textual corta: entre comillas y con la página." };
  }
  /** Cuántas palabras seguidas comparten dos textos (para alertar de paráfrasis demasiado cercanas al original). */
  function coincidenciaMaxima(a, b) {
    const n = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter(Boolean);
    const A = n(a), B = n(b); let mejor = 0;
    const idx = {}; B.forEach((w, i) => { (idx[w] = idx[w] || []).push(i); });
    A.forEach((w, i) => (idx[w] || []).forEach(j => { let k = 0; while (A[i + k] && A[i + k] === B[j + k]) k++; if (k > mejor) mejor = k; }));
    return mejor;
  }
  /** Siglas ya presentadas en el documento: «[OMS]» o «(OMS)» después de un nombre. */
  function siglasDefinidas(textoDoc) {
    const s = new Set(); let m; const re = /\[([A-ZÁÉÍÓÚÑ]{2,10})\]|[a-záéíóúñ]\s+\(([A-ZÁÉÍÓÚÑ]{2,10})(?:,|\))/g;
    while ((m = re.exec(String(textoDoc || "")))) s.add(m[1] || m[2]);
    return s;
  }

  /* ---------- Clasificación (para la guía y el generador) ---------- */
  const TIPOS = [
    ["parafrasis", "Paráfrasis (indirecta)", "Dices con tus palabras la idea del autor. La página es opcional pero recomendada.", "Los juegos cooperativos reducen la agresión (Ruiz, 2021)."],
    ["textual", "Textual corta (menos de 40 palabras)", "Palabras exactas entre comillas, con la página.", "«Se burlan del que pierde» (Ruiz, 2021, p. 4)."],
    ["bloque", "Textual en bloque (40 palabras o más)", "Párrafo aparte con sangría, sin comillas; la cita va después del punto final.", "…del recreo. (Ruiz, 2021, p. 4)"],
    ["narrativa", "Narrativa (centrada en el autor)", "El autor forma parte de tu oración y el año va entre paréntesis.", "Ruiz (2021) encontró que…"],
    ["parentetica", "Parentética (centrada en el contenido)", "Autor y año al final de la idea, entre paréntesis.", "…reducen la agresión (Ruiz, 2021)."],
    ["secundaria", "Cita de cita (fuente secundaria)", "Citas una obra que no leíste, a través de otra. Solo la que leíste va en referencias.", "(Piaget, 1932, como se citó en Ruiz, 2021)"],
    ["corporativa", "Autor corporativo o institucional", "Primera vez: nombre completo y sigla; después, solo la sigla.", "(Organización Mundial de la Salud [OMS], 2020) → (OMS, 2020)"],
    ["autores", "Uno, dos, tres o más autores", "Dos: ambos unidos con «y». Tres o más: el primero y «et al.» desde la primera cita.", "(Pérez y Gómez, 2020) · (Pérez et al., 2020)"],
    ["varias", "Varios trabajos a la vez", "En el mismo paréntesis, en orden alfabético y separados por punto y coma.", "(Gómez, 2019; Ruiz, 2021)"],
    ["mismo", "Mismo autor, varios años o mismo año", "Años separados por coma; si coincide el año, letras a, b (también en referencias).", "(Pérez, 2018, 2020) · (Pérez, 2020a, 2020b)"],
    ["sinautor", "Sin autor", "El título abreviado reemplaza al autor: entre comillas si es artículo, en cursiva si es libro.", "(«Juego y escuela», 2019)"],
    ["sinfecha", "Sin fecha", "Se escribe «s. f.».", "(Ruiz, s. f.)"],
    ["clasica", "Obra clásica o reeditada", "Año original y año de la edición que leíste, separados por barra.", "(Freud, 1900/1953)"],
    ["comunicacion", "Comunicación personal", "Entrevistas, correos o clases no publicadas: inicial, apellido y fecha. No va en referencias.", "(L. Gómez, comunicación personal, 12 de marzo de 2026)"],
    ["traduccion", "Traducción propia", "Si traduces tú una cita, dilo en el paréntesis.", "(Smith, 2020, p. 5, traducción propia)"],
    ["enfasis", "Énfasis añadido u omisiones", "Si resaltas palabras: [énfasis añadido]. Si omites texto: puntos suspensivos; si agregas, corchetes.", "«los niños *no* compiten [énfasis añadido]» · «el juego … reduce»"],
    ["ley", "Leyes y normas", "Nombre de la norma y año; en referencias, con el número y la entidad.", "(Ley 1581 de 2012) · Ley 115 de 1994"],
    ["ia", "Inteligencia artificial", "El autor es la empresa del modelo; describe en el texto cómo lo usaste.", "(OpenAI, 2025) · (Anthropic, 2026)"]
  ];

  return { formato, varias, textual, coincidenciaMaxima, siglasDefinidas, autoresCita, partirAutores, apellido, ubicacion, esCorporativo, TIPOS };
})();
