/* VozDoc IA — todo lo que toca el documento de Word (Office.js / Word API). */
window.Doc = (function () {
  const soporta = (v) => {
    try { return Office.context.requirements.isSetSupported("WordApi", v); } catch (e) { return false; }
  };

  const LIMITE_CONTEXTO = 120000; // caracteres enviados a la IA como máximo

  /** Word usa ^ como carácter especial en la búsqueda. */
  function escapar(t) { return t.replace(/\^/g, "^^"); }

  function limpiarTexto(t) { return (t || "").replace(/\r/g, "").replace(/\u0007/g, ""); }

  /** Devuelve [{i, texto, estilo}] con todos los párrafos. */
  async function leerParrafos() {
    return Word.run(async (ctx) => {
      const ps = ctx.document.body.paragraphs;
      ps.load("items/text,items/style");
      await ctx.sync();
      return ps.items.map((p, i) => ({ i, texto: limpiarTexto(p.text), estilo: p.style || "" }));
    });
  }

  /** Información de la selección: texto e índices de párrafo inicial y final. */
  async function leerSeleccion() {
    return Word.run(async (ctx) => {
      const body = ctx.document.body;
      const sel = ctx.document.getSelection();
      sel.load("text");
      const psSel = sel.paragraphs;
      psSel.load("items");
      const psTodos = body.paragraphs;
      psTodos.load("items");
      let psAntes = null;
      try {
        psAntes = body.getRange("Start").expandTo(sel.getRange("Start")).paragraphs;
        psAntes.load("items");
      } catch (e) { psAntes = null; }
      await ctx.sync();

      const total = psTodos.items.length;
      const nSel = Math.max(1, psSel.items.length);
      let estimado = psAntes ? Math.max(0, psAntes.items.length - 1) : 0;

      // Verificar el índice comparando rangos alrededor del estimado.
      let ini = -1;
      if (psSel.items.length) {
        const primero = psSel.items[0].getRange("Whole");
        const candidatos = [estimado, estimado + 1, estimado - 1].filter(c => c >= 0 && c < total);
        const comparaciones = candidatos.map(c => psTodos.items[c].getRange("Whole").compareLocationWith(primero));
        await ctx.sync();
        const k = comparaciones.findIndex(r => r.value === "Equal");
        if (k >= 0) ini = candidatos[k];
      }
      if (ini < 0) ini = Math.min(estimado, Math.max(0, total - 1));
      const fin = Math.min(total - 1, ini + nSel - 1);
      const texto = limpiarTexto(sel.text);
      return { texto, hay: texto.trim().length > 0, ini, fin, total };
    });
  }

  function esTitulo(estilo) { return /t[ií]tulo|heading|title/i.test(estilo || ""); }

  /** Texto numerado para la IA. Si el documento es muy largo, envía una ventana alrededor de la selección. */
  function construirContexto(parrafos, seleccion) {
    const linea = (p) => `[${p.i}]${esTitulo(p.estilo) ? " (" + p.estilo + ")" : ""} ${p.texto}`;
    const utiles = parrafos.filter(p => p.texto.trim());
    const completo = utiles.map(linea).join("\n");
    if (completo.length <= LIMITE_CONTEXTO) return completo || "(El documento está vacío.)";

    const centro = seleccion ? seleccion.ini : 0;
    const orden = utiles.slice().sort((a, b) => Math.abs(a.i - centro) - Math.abs(b.i - centro));
    const elegidos = new Set();
    let tam = 0;
    for (const p of orden) {
      const l = linea(p).length + 1;
      if (tam + l > LIMITE_CONTEXTO * 0.85) break;
      elegidos.add(p.i); tam += l;
    }
    const titulos = utiles.filter(p => esTitulo(p.estilo) && !elegidos.has(p.i));
    const visibles = utiles.filter(p => elegidos.has(p.i));
    const a = visibles[0].i, b = visibles[visibles.length - 1].i;
    return `(Documento largo: se muestran completos los párrafos ${a} a ${b} de ${parrafos.length}.)\n` +
      (titulos.length ? "Títulos del resto del documento:\n" + titulos.map(linea).join("\n") + "\n\n" : "") +
      visibles.map(linea).join("\n");
  }

  async function seleccionarParrafo(i) {
    return Word.run(async (ctx) => {
      const ps = ctx.document.body.paragraphs;
      ps.load("items");
      await ctx.sync();
      if (ps.items[i]) ps.items[i].select("Select");
      await ctx.sync();
    });
  }

  /** Selecciona en Word la frase que se está leyendo (si no la ubica, selecciona el párrafo). */
  async function seleccionarFrase(i, frase) {
    return Word.run(async (ctx) => {
      const ps = ctx.document.body.paragraphs;
      ps.load("items");
      await ctx.sync();
      const p = ps.items[i];
      if (!p) return;
      const limpia = frase.trim();
      const ini = limpia.slice(0, 40), fin = limpia.slice(-40);
      const rIni = p.search(escapar(ini), { matchCase: true });
      const rFin = p.search(escapar(fin), { matchCase: true });
      rIni.load("items"); rFin.load("items");
      await ctx.sync();
      if (rIni.items.length && rFin.items.length) {
        const a = rIni.items[0];
        // el final debe estar después del inicio: se toma la primera coincidencia que no quede antes
        const comps = rFin.items.map(r => r.compareLocationWith(a));
        await ctx.sync();
        const k = comps.findIndex(c => c.value !== "Before");
        const b = rFin.items[k >= 0 ? k : 0];
        a.expandTo(b).select("Select");
      } else {
        p.select("Select");
      }
      await ctx.sync();
    });
  }

  /** Inserta texto dictado en la posición del cursor. Devuelve el texto realmente insertado. */
  async function insertarDictado(texto) {
    return Word.run(async (ctx) => {
      const punto = ctx.document.getSelection().getRange("End");
      const insertado = punto.insertText(texto, "End");
      insertado.getRange("End").select("Select");
      await ctx.sync();
      return texto;
    });
  }

  /** Texto del párrafo donde está el cursor, hasta el cursor (para decidir espacios y mayúsculas al dictar). */
  async function textoAntesDelCursor() {
    return Word.run(async (ctx) => {
      const sel = ctx.document.getSelection();
      const p = sel.paragraphs.getFirst();
      const r = p.getRange("Start").expandTo(sel.getRange("Start"));
      r.load("text");
      await ctx.sync();
      return (r.text || "").replace(/\r/g, "");
    });
  }

  /** Borra la última aparición de un texto dentro del párrafo del cursor (para «borra eso» al dictar). */
  async function borrarUltimo(texto) {
    if (!texto || texto.length > 255) return false;
    return Word.run(async (ctx) => {
      const sel = ctx.document.getSelection();
      const p = sel.paragraphs.getFirst();
      const r = p.search(escapar(texto), { matchCase: true });
      r.load("items");
      await ctx.sync();
      if (!r.items.length) return false;
      r.items[r.items.length - 1].insertText("", "Replace");
      await ctx.sync();
      return true;
    });
  }

  function activarSeguimiento(ctx) {
    if (Config.get().controlCambios && soporta("1.4")) {
      ctx.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
    }
  }

  /** Número de cambios con control de cambios pendientes de revisar (null si Word no lo permite). */
  async function contarCambios() {
    if (!soporta("1.6")) return null;
    try {
      return await Word.run(async (ctx) => {
        const tc = ctx.document.body.getTrackedChanges();
        tc.load("items");
        await ctx.sync();
        return tc.items.length;
      });
    } catch (e) { return null; }
  }

  async function estadoControlCambios() {
    if (!soporta("1.4")) return null;
    return Word.run(async (ctx) => {
      ctx.document.load("changeTrackingMode");
      await ctx.sync();
      return ctx.document.changeTrackingMode !== "Off";
    });
  }

  async function fijarControlCambios(activo) {
    if (!soporta("1.4")) throw new Error("Tu versión de Word no permite cambiar el control de cambios desde complementos.");
    return Word.run(async (ctx) => {
      ctx.document.changeTrackingMode = activo ? Word.ChangeTrackingMode.trackAll : Word.ChangeTrackingMode.off;
      await ctx.sync();
    });
  }

  async function resolverCambios(aceptar) {
    if (!soporta("1.6")) throw new Error("Tu versión de Word no permite aceptar o rechazar cambios desde complementos. Hazlo en Revisar > Aceptar/Rechazar.");
    return Word.run(async (ctx) => {
      const tc = ctx.document.body.getTrackedChanges();
      if (aceptar) tc.acceptAll(); else tc.rejectAll();
      await ctx.sync();
    });
  }

  /**
   * Aplica correcciones [{parrafo, original, correccion, motivo}].
   * modo "cambios": reemplaza el texto (con control de cambios si está activo).
   * modo "comentarios": deja un comentario con la sugerencia.
   */
  async function aplicarCorrecciones(correcciones, modo) {
    return Word.run(async (ctx) => {
      if (modo !== "comentarios") activarSeguimiento(ctx);
      const ps = ctx.document.body.paragraphs;
      ps.load("items");
      await ctx.sync();

      const busquedas = correcciones.map((c) => {
        const p = ps.items[c.parrafo];
        const original = (c.original || "").replace(/[\r\n]/g, " ");
        if (!p || !original || original.length > 255 || original === c.correccion) return null;
        const r = p.search(escapar(original), { matchCase: true });
        r.load("items");
        return r;
      });
      await ctx.sync();

      const puedeComentar = soporta("1.4");
      let aplicadas = 0;
      const fallidas = [];
      correcciones.forEach((c, k) => {
        const r = busquedas[k];
        if (!r || !r.items.length) { if (c.original !== c.correccion) fallidas.push(c); return; }
        const rango = r.items[0];
        if (modo === "comentarios") {
          const nota = `${c.motivo || "Sugerencia"}. Sugerencia: «${c.correccion}»`;
          if (puedeComentar) rango.insertComment(nota);
          else rango.font.highlightColor = "Yellow";
        } else {
          rango.insertText((c.correccion || "").replace(/[\r\n]+/g, " "), "Replace");
        }
        aplicadas++;
      });
      await ctx.sync();
      return { aplicadas, fallidas };
    });
  }

  async function buscarYReemplazar({ buscar, reemplazar, coincidir_mayusculas, palabra_completa }) {
    if (!buscar || buscar.length > 255) throw new Error("El texto a buscar está vacío o es demasiado largo.");
    return Word.run(async (ctx) => {
      activarSeguimiento(ctx);
      const r = ctx.document.body.search(escapar(buscar), { matchCase: !!coincidir_mayusculas, matchWholeWord: !!palabra_completa });
      r.load("items");
      await ctx.sync();
      r.items.forEach(x => x.insertText(reemplazar, "Replace"));
      await ctx.sync();
      return r.items.length;
    });
  }

  async function reescribirParrafos(ini, fin, texto) {
    return Word.run(async (ctx) => {
      activarSeguimiento(ctx);
      const ps = ctx.document.body.paragraphs;
      ps.load("items");
      await ctx.sync();
      const n = ps.items.length;
      ini = Math.max(0, Math.min(ini, n - 1));
      fin = Math.max(ini, Math.min(fin == null ? ini : fin, n - 1));
      const nuevo = texto.replace(/\r/g, "").replace(/\n{2,}/g, "\n").trim();
      let rango = ps.items[ini].getRange("Content");
      if (fin > ini) rango = rango.expandTo(ps.items[fin].getRange("Content"));
      rango.insertText(nuevo, "Replace");
      await ctx.sync();
    });
  }

  async function insertarTexto({ posicion, parrafo, texto }) {
    const lineas = texto.replace(/\r/g, "").split(/\n+/).map(l => l.trim()).filter(Boolean);
    if (!lineas.length) return;
    return Word.run(async (ctx) => {
      activarSeguimiento(ctx);
      const body = ctx.document.body;
      const ps = body.paragraphs;
      ps.load("items");
      await ctx.sync();
      const n = ps.items.length;
      const idx = Math.max(0, Math.min(parrafo == null ? n - 1 : parrafo, n - 1));
      if (posicion === "inicio_documento") {
        for (let k = lineas.length - 1; k >= 0; k--) body.insertParagraph(lineas[k], "Start");
      } else if (posicion === "final_documento") {
        lineas.forEach(l => body.insertParagraph(l, "End"));
      } else if (posicion === "antes_parrafo") {
        lineas.forEach(l => ps.items[idx].insertParagraph(l, "Before"));
      } else if (posicion === "en_cursor") {
        const sel = ctx.document.getSelection();
        sel.insertText(lineas.join("\n"), "End");
      } else { // despues_parrafo
        let ref = ps.items[idx];
        lineas.forEach(l => { ref = ref.insertParagraph(l, "After"); });
      }
      await ctx.sync();
    });
  }

  async function comentar(comentarios) {
    return Word.run(async (ctx) => {
      const ps = ctx.document.body.paragraphs;
      ps.load("items");
      await ctx.sync();
      const puede = soporta("1.4");
      const objetivos = comentarios.map(c => {
        const p = ps.items[c.parrafo];
        if (!p) return null;
        const frag = (c.fragmento || "").trim();
        if (frag && frag.length <= 255) {
          const r = p.search(escapar(frag), { matchCase: false });
          r.load("items");
          return { p, r };
        }
        return { p, r: null };
      });
      await ctx.sync();
      let hechos = 0;
      comentarios.forEach((c, k) => {
        const o = objetivos[k];
        if (!o) return;
        const rango = (o.r && o.r.items.length) ? o.r.items[0] : o.p.getRange("Content");
        if (puede) rango.insertComment(c.comentario);
        else rango.font.highlightColor = "Yellow";
        hechos++;
      });
      await ctx.sync();
      return { hechos, conComentarios: puede };
    });
  }

  const COLORES = { amarillo: "Yellow", verde: "BrightGreen", turquesa: "Turquoise", rosa: "Pink", ninguno: null };
  const ESTILOS = { titulo1: "Heading1", titulo2: "Heading2", titulo3: "Heading3", normal: "Normal" };
  const ALINEACION = { izquierda: "Left", centro: "Centered", derecha: "Right", justificado: "Justified" };

  async function darFormato(f) {
    return Word.run(async (ctx) => {
      activarSeguimiento(ctx);
      const ps = ctx.document.body.paragraphs;
      ps.load("items");
      await ctx.sync();
      const n = ps.items.length;
      const ini = Math.max(0, Math.min(f.parrafo_inicio, n - 1));
      const fin = Math.max(ini, Math.min(f.parrafo_fin == null ? ini : f.parrafo_fin, n - 1));
      const parrafos = ps.items.slice(ini, fin + 1);

      let rangos = parrafos.map(p => p.getRange("Content"));
      if (f.fragmento && f.fragmento.length <= 255) {
        const r = ps.items[ini].search(escapar(f.fragmento), { matchCase: false });
        r.load("items");
        await ctx.sync();
        if (r.items.length) rangos = [r.items[0]];
      }
      rangos.forEach(rg => {
        if (f.negrita != null) rg.font.bold = f.negrita;
        if (f.cursiva != null) rg.font.italic = f.cursiva;
        if (f.subrayado != null) rg.font.underline = f.subrayado ? "Single" : "None";
        if (f.resaltado) rg.font.highlightColor = COLORES[f.resaltado];
        if (f.tamano) rg.font.size = f.tamano;
      });
      parrafos.forEach(p => {
        if (f.estilo && ESTILOS[f.estilo]) p.styleBuiltIn = ESTILOS[f.estilo];
        if (f.alineacion && ALINEACION[f.alineacion]) p.alignment = ALINEACION[f.alineacion];
      });
      await ctx.sync();
    });
  }

  return {
    soporta, leerParrafos, leerSeleccion, construirContexto, seleccionarParrafo,
    estadoControlCambios, fijarControlCambios, resolverCambios, contarCambios,
    seleccionarFrase, insertarDictado, textoAntesDelCursor, borrarUltimo,
    aplicarCorrecciones, buscarYReemplazar, reescribirParrafos, insertarTexto,
    comentar, darFormato, esTitulo
  };
})();
