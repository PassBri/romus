/* Romus · Generador de documentos de Word (.docx) sin librerías externas.
   Lo usan el acta de asesoría, la matriz de observaciones, los instrumentos, los consentimientos,
   la matriz de antecedentes, el artículo y el esquema de diapositivas.
   Además guarda los «datos del proyecto» (estudiante, asesor, institución…) que reutilizan
   la portada APA, los documentos de ética y las actas. */
window.Docx = (function () {
  const enc = new TextEncoder();

  /* ---------- ZIP (sin compresión) ---------- */
  const TABLA = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABLA[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(archivos, tipo) {
    const partes = [], central = []; let off = 0;
    const u16 = (v) => [v & 255, (v >>> 8) & 255], u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    archivos.forEach(f => {
      const nombre = enc.encode(f.nombre), datos = typeof f.datos === "string" ? enc.encode(f.datos) : f.datos, crc = crc32(datos);
      const comun = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(datos.length), ...u32(datos.length), ...u16(nombre.length), ...u16(0)];
      const local = Uint8Array.from([...u32(0x04034b50), ...comun]);
      partes.push(local, nombre, datos);
      central.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...comun, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nombre);
      off += local.length + nombre.length + datos.length;
    });
    const tamC = central.reduce((a, x) => a + x.length, 0);
    const fin = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(archivos.length), ...u16(archivos.length), ...u32(tamC), ...u32(off), ...u16(0)]);
    return new Blob([...partes, ...central, fin], { type: tipo || "application/zip" });
  }
  const xml = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  /* ---------- Contenido ---------- */
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  /** texto: cadena (admite **negrita** y _cursiva_) o arreglo de {texto, negrita, cursiva} */
  function runs(texto, base) {
    base = base || {};
    let seg = Array.isArray(texto) ? texto : [];
    if (!Array.isArray(texto)) {
      const s = String(texto == null ? "" : texto);
      // Sin «lookbehind» (Word 2019 usa un motor que no lo entiende): el carácter previo se captura aparte.
      const re = /\*\*(.+?)\*\*|(^|[^\w])_(.+?)_(?![\w])/g; let m, ult = 0;
      while ((m = re.exec(s))) {
        const ini = m[1] != null ? m.index : m.index + m[2].length;
        if (ini > ult) seg.push({ texto: s.slice(ult, ini) });
        seg.push(m[1] != null ? { texto: m[1], negrita: true } : { texto: m[3], cursiva: true });
        ult = m.index + m[0].length;
      }
      if (ult < s.length) seg.push({ texto: s.slice(ult) });
    }
    return seg.map(x => {
      const rpr = (x.negrita || base.negrita ? "<w:b/>" : "") + (x.cursiva || base.cursiva ? "<w:i/>" : "") + (base.tam ? `<w:sz w:val="${base.tam * 2}"/>` : "");
      return String(x.texto).split("\n").map((l, i) => (i ? "<w:r><w:br/></w:r>" : "") + `<w:r>${rpr ? "<w:rPr>" + rpr + "</w:rPr>" : ""}<w:t xml:space="preserve">${xml(l)}</w:t></w:r>`).join("");
    }).join("");
  }
  function parrafo(texto, o) {
    o = o || {};
    let ppr = "";
    if (o.estilo) ppr += `<w:pStyle w:val="${o.estilo}"/>`;
    if (o.salto) ppr += "<w:pageBreakBefore/>";
    if (o.espacio != null) ppr += `<w:spacing w:before="0" w:after="${o.espacio}"/>`;
    if (o.sangria || o.francesa || o.izq) ppr += `<w:ind w:left="${o.francesa ? 720 : (o.izq || 0)}"${o.francesa ? ' w:hanging="720"' : o.sangria ? ' w:firstLine="720"' : ""}/>`;
    if (o.centrado) ppr += '<w:jc w:val="center"/>'; else if (o.derecha) ppr += '<w:jc w:val="right"/>'; else if (o.justificado) ppr += '<w:jc w:val="both"/>';
    return `<w:p>${ppr ? "<w:pPr>" + ppr + "</w:pPr>" : ""}${runs(texto, o)}</w:p>`;
  }
  function tabla(filas, o) {
    o = o || {};
    const n = Math.max(...filas.map(f => f.length));
    const ancho = o.anchos || Array(n).fill(Math.floor(9000 / n));
    const borde = '<w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/>';
    let x = `<w:tbl><w:tblPr><w:tblStyle w:val="TablaRomus"/><w:tblW w:w="${ancho.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblBorders>${borde}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${ancho.map(a => `<w:gridCol w:w="${a}"/>`).join("")}</w:tblGrid>`;
    filas.forEach((f, i) => {
      const cab = i === 0 && o.cabecera !== false;
      x += `<w:tr>${cab ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}`;
      for (let j = 0; j < n; j++) {
        // Encabezado: fondo blanco y texto negro en negrita
        x += `<w:tc><w:tcPr><w:tcW w:w="${ancho[j]}" w:type="dxa"/>${cab ? '<w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/>' : ""}</w:tcPr>`;
        const v = f[j] == null ? "" : f[j];
        String(v).split(/\n/).forEach(l => { x += parrafo(l, { negrita: cab, espacio: 0, tam: o.tam }); });
        x += "</w:tc>";
      }
      x += "</w:tr>";
    });
    return x + "</w:tbl>" + parrafo("", { espacio: 0 });
  }
  function cuerpo(bloques) {
    return bloques.map(b => {
      switch (b.t) {
        case "titulo": return parrafo(b.texto, { estilo: "Title", centrado: true });
        case "h1": return parrafo(b.texto, { estilo: "Heading1", salto: b.salto });
        case "h2": return parrafo(b.texto, { estilo: "Heading2" });
        case "h3": return parrafo(b.texto, { estilo: "Heading3" });
        case "lista": return (b.items || []).map((it, k) => parrafo((b.num ? `${k + 1}. ` : "• ") + it, { izq: 360, espacio: 60 })).join("");
        case "tabla": return (b.titulo ? parrafo(b.titulo, { negrita: true, espacio: 60 }) : "") + tabla(b.filas, b) + (b.nota ? parrafo(b.nota, { cursiva: true, tam: 10 }) : "");
        case "firma": return '<w:p/>' + (b.nombres || []).map(n => parrafo("_______________________________", { espacio: 0 }) + parrafo(n, { espacio: 240 })).join("");
        case "salto": return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
        case "vacio": return "<w:p/>";
        case "ref": return parrafo(b.texto, { francesa: true });
        default: return parrafo(b.texto, b);
      }
    }).join("");
  }
  function estilos(o) {
    const f = xml(o.fuente || "Times New Roman"), tam = (o.tam || 12) * 2, linea = o.doble ? 480 : 276;
    const h = (id, nombre, nivel, extra) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nombre}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/>${extra.ppr || ""}<w:outlineLvl w:val="${nivel}"/></w:pPr><w:rPr><w:b/>${extra.rpr || ""}</w:rPr></w:style>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}" w:eastAsia="${f}"/><w:sz w:val="${tam}"/><w:szCs w:val="${tam}"/><w:lang w:val="es-CO"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="${linea}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
      + `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>`
      + `<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="${tam + 4}"/></w:rPr></w:style>`
      + h("Heading1", "heading 1", 0, { ppr: o.apa ? '<w:jc w:val="center"/>' : "", rpr: o.apa ? "" : `<w:sz w:val="${tam + 2}"/>` })
      + h("Heading2", "heading 2", 1, {})
      + h("Heading3", "heading 3", 2, { rpr: "<w:i/>" })
      + `<w:style w:type="table" w:styleId="TablaRomus"><w:name w:val="Tabla Romus"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr></w:style></w:styles>`;
  }

  /** bloques → Blob .docx. o: {fuente, tam, doble, apa, horizontal} */
  function crear(bloques, o) {
    o = o || {};
    const pg = o.horizontal ? '<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>' : '<w:pgSz w:w="12240" w:h="15840"/>';
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${cuerpo(bloques)}<w:sectPr>${pg}<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    return zip([
      { nombre: "[Content_Types].xml", datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
      { nombre: "_rels/.rels", datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { nombre: "word/_rels/document.xml.rels", datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { nombre: "word/document.xml", datos: doc },
      { nombre: "word/styles.xml", datos: estilos(o) }
    ], "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  }

  function base64(blob) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
  }
  function descargar(nombre, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nombre; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  /** Abre el documento como un archivo nuevo de Word; si no se puede, lo descarga. */
  async function abrir(bloques, nombre, o) {
    const blob = crear(bloques, o);
    try {
      const b64 = await base64(blob);
      await Word.run(async (ctx) => { ctx.application.createDocument(b64).open(); await ctx.sync(); });
      return "word";
    } catch (e) { descargar(nombre, blob); return "descarga"; }
  }
  /** Botones «Abrir en Word» y «Descargar .docx» para un documento. */
  function botones(bloques, nombre, o, etiquetaAbrir) {
    const c = document.createElement("div"); c.className = "inv-acciones";
    const b1 = document.createElement("button"); b1.className = "boton primario"; b1.textContent = etiquetaAbrir || "Abrir en Word";
    b1.onclick = async () => { const r = await abrir(typeof bloques === "function" ? bloques() : bloques, nombre, o); b1.textContent = r === "word" ? "Abierto en Word ✓" : "Descargado ✓"; };
    const b2 = document.createElement("button"); b2.className = "boton secundario"; b2.textContent = "Descargar .docx";
    b2.onclick = () => descargar(nombre, crear(typeof bloques === "function" ? bloques() : bloques, o));
    c.append(b1, b2); return c;
  }

  /* ---------- Datos del proyecto (una sola vez, se reutilizan) ---------- */
  const CAMPOS = [
    ["titulo", "Título del trabajo"], ["estudiante", "Estudiante(s)"], ["documento", "Documento de identidad (opcional)"],
    ["asesor", "Asesor o director"], ["institucion", "Universidad o institución"], ["facultad", "Facultad"],
    ["programa", "Programa"], ["curso", "Curso o asignatura (opcional)"], ["ciudad", "Ciudad"], ["correo", "Correo de contacto"], ["telefono", "Teléfono de contacto (opcional)"]
  ];
  function datos() { return Object.assign({}, Config.get().datosProyecto || {}); }
  function faltan(claves) { const d = datos(); return claves.filter(k => !String(d[k] || "").trim()); }
  /** Formulario de datos. Llama a listo(datos) al guardar. */
  function formulario(claves, listo, intro) {
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    const c = el("div", "inv-cuerpo datos-proyecto");
    c.appendChild(el("p", "inv-nota", intro || "Escríbelos una vez: Romus los usa en la portada, las actas y los documentos de ética."));
    const d = datos(), inputs = {};
    CAMPOS.filter(([k]) => !claves || claves.includes(k)).forEach(([k, t]) => {
      const l = el("label", "campo-pro"); l.appendChild(el("span", "", t));
      const i = el("input"); i.type = k === "correo" ? "email" : "text"; i.value = d[k] || ""; i.className = "ajuste";
      inputs[k] = i; l.appendChild(i); c.appendChild(l);
    });
    const b = el("button", "boton primario", "Guardar y continuar");
    b.onclick = () => { const n = datos(); Object.keys(inputs).forEach(k => { n[k] = inputs[k].value.trim(); }); Config.set({ datosProyecto: n }); listo(n); };
    c.appendChild(b);
    return c;
  }
  const fechaLarga = (d) => (d || new Date()).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

  return { crear, abrir, botones, descargar, base64, zip, xml, datos, faltan, formulario, fechaLarga, CAMPOS };
})();
