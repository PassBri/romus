/* Romus · Compatibilidad entre versiones de Word.
   Se carga antes que todo y está escrito en JavaScript antiguo (ES5) a propósito:
   - Word 2016 sin actualizar y Word en Windows viejos usan el motor de Internet Explorer: ahí Romus no puede
     funcionar, así que se muestra una explicación clara en lugar de un panel en blanco.
   - Word 2019 usa Edge «antiguo» (EdgeHTML): le faltan algunas funciones modernas que aquí se completan.
   - Compat.info() resume qué permite tu Word (versión, motor y nivel de la API de Word). */
(function () {
  var ua = navigator.userAgent || "";
  var esIE = !!document.documentMode || /Trident\/|MSIE /.test(ua);

  if (esIE) {
    window.__romusSinSoporte = true;
    var mostrar = function () {
      var b = document.body; if (!b) return;
      b.innerHTML =
        '<div style="font-family:Segoe UI,Arial,sans-serif;padding:20px;line-height:1.5;color:#1b1d21">' +
        '<h2 style="margin:0 0 8px;font-size:18px">Romus necesita un Word más nuevo</h2>' +
        '<p>Tu Word abre los complementos con el motor de <b>Internet Explorer</b>. Pasa con Word 2013, con Word 2016 sin actualizar ' +
        'o con Windows anteriores a Windows 10 (versión 1903). Romus no puede funcionar con ese motor.</p>' +
        '<p><b>Opciones:</b></p><ol style="padding-left:18px">' +
        '<li>Actualiza Windows y Office (Archivo → Cuenta → Opciones de actualización → Actualizar ahora).</li>' +
        '<li>Usa <b>Word para la web</b>, gratis con una cuenta de Microsoft en office.com: Romus funciona completo ahí.</li>' +
        '<li>Usa Word 2019, 2021, 2024 o Microsoft 365 en Windows 10 u 11.</li></ol>' +
        '<p style="color:#5c6370;font-size:13px">Guía: passbri.github.io/romus/tutorial.html</p></div>';
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mostrar); else mostrar();
    window.onerror = function () { return true; }; // los demás archivos no se pueden leer en este motor
    return;
  }

  /* ---------- Funciones que faltan en Edge antiguo (Word 2019) ---------- */
  if (!Object.fromEntries) Object.fromEntries = function (it) { var o = {}; Array.from(it).forEach(function (p) { o[p[0]] = p[1]; }); return o; };
  if (!Array.prototype.flat) Object.defineProperty(Array.prototype, "flat", { configurable: true, writable: true, value: function (d) {
    d = d === undefined ? 1 : d; return this.reduce(function (a, x) { return a.concat(Array.isArray(x) && d > 0 ? x.flat(d - 1) : [x]); }, []); } });
  if (!Array.prototype.flatMap) Object.defineProperty(Array.prototype, "flatMap", { configurable: true, writable: true, value: function (f, t) { return this.map(f, t).flat(1); } });
  if (!Array.prototype.at) Object.defineProperty(Array.prototype, "at", { configurable: true, writable: true, value: function (i) { i = Math.trunc(i) || 0; return this[i < 0 ? this.length + i : i]; } });
  if (!String.prototype.trimStart) String.prototype.trimStart = String.prototype.trimLeft || function () { return this.replace(/^\s+/, ""); };
  if (!String.prototype.trimEnd) String.prototype.trimEnd = String.prototype.trimRight || function () { return this.replace(/\s+$/, ""); };
  if (!String.prototype.replaceAll) String.prototype.replaceAll = function (a, b) { return typeof a === "string" ? this.split(a).join(b) : this.replace(a, b); };
  if (window.Promise && !Promise.allSettled) Promise.allSettled = function (ps) { return Promise.all(Array.from(ps).map(function (p) { return Promise.resolve(p).then(function (v) { return { status: "fulfilled", value: v }; }, function (e) { return { status: "rejected", reason: e }; }); })); };
  if (window.Element && !Element.prototype.replaceChildren) Element.prototype.replaceChildren = function () { while (this.firstChild) this.removeChild(this.firstChild); for (var i = 0; i < arguments.length; i++) this.append(arguments[i]); };
  if (window.crypto && !window.crypto.randomUUID) window.crypto.randomUUID = function () {
    var b = new Uint8Array(16); window.crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  };
  if (!window.TextEncoder) window.TextEncoder = function () {};
  if (!window.TextEncoder.prototype.encode) window.TextEncoder.prototype.encode = function (s) {
    var u = unescape(encodeURIComponent(String(s))), a = new Uint8Array(u.length); for (var i = 0; i < u.length; i++) a[i] = u.charCodeAt(i); return a;
  };
  if (!window.TextDecoder) {
    window.TextDecoder = function () {};
    window.TextDecoder.prototype.decode = function (buf) {
      var a = buf instanceof Uint8Array ? buf : new Uint8Array(buf && buf.buffer ? buf.buffer : buf || []), s = "";
      for (var i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192));
      try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
    };
  }
  if (!window.ResizeObserver) window.ResizeObserver = function (cb) {
    var self = this; this._f = function () { cb([], self); };
    this.observe = function () { window.addEventListener("resize", self._f); setTimeout(self._f, 0); };
    this.unobserve = this.disconnect = function () { window.removeEventListener("resize", self._f); };
  };

  /* ---------- Qué permite este Word ---------- */
  function nivelApi() {
    var v = ["1.9", "1.8", "1.7", "1.6", "1.5", "1.4", "1.3", "1.2", "1.1"];
    try { for (var i = 0; i < v.length; i++) if (Office.context.requirements.isSetSupported("WordApi", v[i])) return v[i]; } catch (e) { /* fuera de Word */ }
    return "";
  }
  function motor() {
    if (/Edg\//.test(ua) || /WebView2/.test(ua)) return "Edge moderno (WebView2)";
    if (/Edge\//.test(ua)) return "Edge antiguo (EdgeHTML)";
    if (/Macintosh/.test(ua) && /AppleWebKit/.test(ua) && !/Chrome/.test(ua)) return "Safari (Mac)";
    if (/Chrome\//.test(ua)) return "Chromium";
    return "navegador";
  }
  function info() {
    var d = {}; try { d = Office.context.diagnostics || {}; } catch (e) { d = {}; }
    var api = nivelApi(), n = parseFloat(api || "0");
    var faltan = [];
    if (n && n < 1.4) faltan.push("comentarios de Word (Romus deja notas resaltadas [Romus: …] en el texto)", "activar el control de cambios desde Romus (actívalo tú en Revisar → Control de cambios)", "leer los comentarios del jurado");
    if (n && n < 1.5) faltan.push("número de página y tabla de contenido automáticos (Romus te dice cómo ponerlos)");
    if (n && n < 1.6) faltan.push("aceptar o rechazar todos los cambios desde Romus");
    if (n && n < 1.3) faltan.push("tablas, estilos de título y formato APA (tu Word es demasiado antiguo)");
    if (/EdgeHTML/.test(motor())) faltan.push("leer archivos PDF en Mis documentos (Word, PowerPoint y texto sí)");
    return { version: d.version || "", plataforma: d.platform || "", api: api, motor: motor(), faltan: faltan };
  }
  window.Compat = { info: info, nivelApi: nivelApi, motor: motor };
})();
