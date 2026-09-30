/* Romus OS — telemetría y mapa del documento (todo local, sin IA). */
window.Panel = (function () {
  const $ = (id) => document.getElementById(id);
  let parrafos = [];
  let seleccion = null;
  let leyendo = -1;
  let temporizador = null;

  /* ---------- Legibilidad: índice de Fernández-Huerta (adaptación de Flesch al español) ---------- */
  function silabas(palabra) {
    const p = palabra.toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
    if (!p) return 0;
    const grupos = p.match(/[aeiouáéíóúü]+/g) || [];
    let n = 0;
    for (const g of grupos) {
      n += 1;
      // hiato: dos vocales fuertes seguidas (a, e, o o vocal con tilde) forman sílabas distintas
      for (let i = 1; i < g.length; i++) if (/[aeoáéíóú]/.test(g[i]) && /[aeoáéíóú]/.test(g[i - 1])) n += 1;
    }
    return Math.max(1, n);
  }

  function legibilidad(texto) {
    const palabras = texto.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g) || [];
    if (palabras.length < 20) return null;
    const oraciones = Math.max(1, (texto.match(/[.!?…]+(\s|$)/g) || []).length);
    const sil = palabras.reduce((s, w) => s + silabas(w), 0);
    const P = (sil / palabras.length) * 100;
    const F = (oraciones / palabras.length) * 100;
    const L = 206.84 - 0.6 * P - 1.02 * F;
    return Math.max(0, Math.min(100, L));
  }

  function etiquetaLegibilidad(L) {
    if (L == null) return "—";
    const v = Math.round(L);
    if (L >= 80) return `Fácil · ${v}/100`;
    if (L >= 65) return `Normal · ${v}/100`;
    if (L >= 50) return `Algo difícil · ${v}/100`;
    return `Difícil · ${v}/100`;
  }

  const fmt = (n) => n.toLocaleString("es-CO");

  function esTitulo(p) { return /t[ií]tulo|heading|title/i.test(p.estilo || ""); }

  /* ---------- Telemetría ---------- */
  async function actualizar() {
    if (!window.Word || !window.Doc) return;
    try {
      const [ps, sel] = await Promise.all([Doc.leerParrafos(), Doc.leerSeleccion()]);
      parrafos = ps; seleccion = sel;
      const texto = ps.map(p => p.texto).join("\n");
      const palabras = (texto.match(/\S+/g) || []).length;
      const conTexto = ps.filter(p => p.texto.trim()).length;
      const ppm = 160 * (window.Voz ? Voz.velocidad : 1);
      $("mPalabras").textContent = fmt(palabras);
      $("mParrafos").textContent = fmt(conTexto);
      const min = palabras / ppm;
      $("mEscucha").textContent = palabras ? (min < 10 ? min.toFixed(1).replace(".", ",") : fmt(Math.round(min))) : "0";
      const L = legibilidad(texto);
      $("mLegTexto").textContent = etiquetaLegibilidad(L);
      const marca = $("mLegMarca");
      marca.classList.toggle("visible", L != null);
      if (L != null) marca.style.left = Math.max(2, Math.min(98, L)) + "%";
      const relleno = $("mLegRelleno");
      if (relleno) relleno.style.width = (L == null ? 0 : Math.max(2, Math.min(100, L))) + "%";
      const cambios = await Doc.contarCambios();
      $("mCambios").textContent = cambios == null ? "—" : fmt(cambios);
      $("mCambios").parentElement.classList.toggle("alerta", !!cambios);
      $("mCambios").parentElement.title = cambios == null ? "Tu versión de Word no informa los cambios pendientes" : "";
      pintarMapa();
    } catch (e) { /* el documento puede estar ocupado; se reintenta en el próximo evento */ }
  }

  function programar(ms) {
    clearTimeout(temporizador);
    temporizador = setTimeout(actualizar, ms == null ? 700 : ms);
  }

  /* ---------- Mapa del documento ---------- */
  function pintarMapa() {
    const cont = $("mapaDoc");
    cont.innerHTML = "";
    const utiles = parrafos.filter(p => p.texto.trim());
    if (!utiles.length) { cont.innerHTML = '<span class="vacio-mapa">Documento vacío</span>'; $("mapaSeccion").textContent = "—"; return; }
    // Si hay muchos párrafos se agrupan en columnas
    const maxCols = Math.max(20, Math.floor((cont.clientWidth || 300) / 4));
    const grupo = Math.ceil(utiles.length / maxCols);
    const cols = [];
    for (let k = 0; k < utiles.length; k += grupo) cols.push(utiles.slice(k, k + grupo));
    const maxLen = Math.max(...cols.map(c => c.reduce((s, p) => s + p.texto.length, 0)));
    const selIni = seleccion ? seleccion.ini : -1, selFin = seleccion ? seleccion.fin : -1;
    cols.forEach(c => {
      const b = document.createElement("div");
      b.className = "barra-p";
      const largo = c.reduce((s, p) => s + p.texto.length, 0);
      b.style.height = Math.max(10, Math.sqrt(largo / maxLen) * 100) + "%";
      const primero = c[0], ultimo = c[c.length - 1];
      if (c.some(esTitulo)) b.classList.add("titulo");
      if (selIni >= 0 && primero.i <= selFin && ultimo.i >= selIni) b.classList.add("sel");
      if (leyendo >= primero.i && leyendo <= ultimo.i) b.classList.add("leyendo");
      b.dataset.i = primero.i;
      b.dataset.f = ultimo.i;
      const vista = primero.texto.slice(0, 90) + (primero.texto.length > 90 ? "…" : "");
      b.title = (c.length > 1 ? `Párrafos ${primero.i + 1}–${ultimo.i + 1}: ` : `Párrafo ${primero.i + 1}: `) + vista;
      b.addEventListener("mouseenter", () => { $("mapaTip").textContent = b.title; });
      b.addEventListener("click", () => {
        Doc.seleccionarParrafo(+b.dataset.i).then(() => programar(200)).catch(() => {});
      });
      cont.appendChild(b);
    });
    // Sección actual: último título antes de la selección
    const ref = leyendo >= 0 ? leyendo : selIni;
    const titulo = parrafos.filter(p => esTitulo(p) && p.i <= ref && p.texto.trim()).pop();
    $("mapaSeccion").textContent = titulo ? titulo.texto.slice(0, 40) : (ref >= 0 ? `Párrafo ${ref + 1}` : "—");
  }

  function marcarLectura(i) {
    leyendo = i;
    pintarMapa();
  }

  /* ---------- Reloj HUD ---------- */
  function reloj() {
    const d = new Date();
    const r = $("relojHud");
    if (r) r.textContent = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function iniciar(enWord) {
    reloj();
    setInterval(reloj, 15000);
    $("btnRefrescar").addEventListener("click", () => actualizar());
    if (!enWord) { $("mapaDoc").innerHTML = '<span class="vacio-mapa">Abre Romus dentro de Word</span>'; return; }
    try {
      Office.context.document.addHandlerAsync(Office.EventType.DocumentSelectionChanged, () => programar(800));
    } catch (e) { /* sin eventos: se actualiza tras cada acción */ }
    actualizar();
    window.addEventListener("resize", () => pintarMapa());
  }

  return { iniciar, actualizar, programar, marcarLectura, legibilidad, silabas };
})();
