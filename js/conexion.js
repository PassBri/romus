/* Romus — formas fáciles de conectar la IA (se suman a la configuración manual de Ajustes, no la reemplazan).
   1. Un clic con OpenRouter (inicio de sesión OAuth PKCE: la clave llega sola, sin copiar ni pegar).
   2. Gemini guiado: guía animada, clave detectada al pegar o desde el portapapeles, y validación inmediata.
   3. Respaldo: exportar e importar toda la configuración con un código o un archivo.
   El usuario puede cambiar de forma cuando quiera: cada conexión queda como un perfil más en Ajustes. */
window.Conexion = (function () {
  const BASE = location.origin + location.pathname.replace(/[^/]*$/, "");
  const CALLBACK = BASE + "conectar.html";
  let alConectar = () => {}; // la página (Word o PowerPoint) actualiza su interfaz

  /* ---------- Reconocer la clave por su forma ---------- */
  const FORMAS = [
    [/^AIza[0-9A-Za-z_-]{30,}$/, "gemini", "Google Gemini"],
    [/^AQ\.[0-9A-Za-z_-]{30,}$/, "gemini", "Google Gemini"], // formato nuevo de AI Studio
    [/^sk-ant-[0-9A-Za-z_-]{20,}$/, "anthropic", "Claude (Anthropic)"],
    [/^sk-or-(v1-)?[0-9A-Za-z_-]{20,}$/, "openrouter", "OpenRouter"],
    [/^gsk_[0-9A-Za-z]{20,}$/, "groq", "Groq"],
    [/^sk-[0-9a-f]{32}$/, "deepseek", "DeepSeek"],
    [/^sk-(proj-|svcacct-)?[0-9A-Za-z_-]{20,}$/, "openai", "OpenAI (ChatGPT)"]
  ];
  function reconocer(clave) {
    const k = String(clave || "").trim().replace(/^["'\s]+|["'\s]+$/g, "");
    const f = FORMAS.find(([re]) => re.test(k));
    return f ? { clave: k, proveedor: f[1], nombre: f[2] } : null;
  }
  /** Explica por qué una clave pegada no sirve, en palabras sencillas. */
  function diagnostico(clave) {
    const k = String(clave || "").trim();
    if (!k) return "Pega la clave completa.";
    if (/\s/.test(k)) return "La clave tiene espacios: cópiala de nuevo, sin texto adicional.";
    if (/^AIza/.test(k) && k.length < 39) return "La clave de Gemini está incompleta: debe tener 39 caracteres y tiene " + k.length + ".";
    if (/^https?:/.test(k)) return "Eso es una dirección web, no una clave. En AI Studio pulsa «Copiar» junto a tu clave.";
    if (k.length < 20) return "Es muy corta para ser una clave. Cópiala completa.";
    return "No reconozco el tipo de clave. Si es de otro servicio, configúrala en Ajustes → «+ Agregar».";
  }

  /* ---------- Crear o actualizar el perfil y probarlo ---------- */
  async function conectarClave(clave, proveedorForzado, extra) {
    const r = proveedorForzado ? { clave: String(clave).trim(), proveedor: proveedorForzado } : reconocer(clave);
    if (!r) return { ok: false, mensaje: diagnostico(clave) };
    const c = Config.get();
    // Se prueba en una copia: si la clave no sirve, la IA que ya funcionaba sigue igual.
    const previo = c.perfiles.find(x => x.proveedor === r.proveedor);
    const p = Object.assign(previo ? Object.assign({}, previo) : Config.nuevoPerfil(r.proveedor), extra || {}, { apiKey: r.clave });
    if (!p.modelo) p.modelo = (Config.PROVEEDORES.find(x => x.id === r.proveedor) || {}).modelos[0] || "";
    const prueba = await probar(p);
    if (!prueba.ok) return Object.assign({ perfil: p }, prueba);
    const perfiles = previo ? c.perfiles.map(x => x === previo ? p : x) : c.perfiles.concat([p]);
    Config.set({ perfiles, perfilActivo: p.id });
    alConectar(p, prueba);
    return Object.assign({ perfil: p }, prueba);
  }
  /* ---------- Oído: una IA solo para transcribir la voz (la que escribe no cambia) ---------- */
  const AUDIO = ["gemini", "openai", "groq"];
  async function conectarOido(clave) {
    const r = reconocer(clave);
    if (!r) return { ok: false, mensaje: diagnostico(clave) };
    if (!AUDIO.includes(r.proveedor)) return { ok: false, mensaje: `Esa clave es de ${r.nombre}, que no entiende audio. Para el oído usa una clave de Google Gemini (gratis), OpenAI o Groq.` };
    const c = Config.get();
    const activo = c.perfiles.find(x => x.id === c.perfilActivo && (x.apiKey || "").trim());
    const previo = c.perfiles.find(x => x.proveedor === r.proveedor);
    const p = Object.assign(previo ? Object.assign({}, previo) : Config.nuevoPerfil(r.proveedor), { apiKey: r.clave });
    if (!p.modelo) p.modelo = (Config.PROVEEDORES.find(x => x.id === r.proveedor) || {}).modelos[0] || "";
    const prueba = await probar(p);
    if (!prueba.ok) return Object.assign({ perfil: p }, prueba);
    const perfiles = previo ? c.perfiles.map(x => x === previo ? p : x) : c.perfiles.concat([p]);
    const cambios = { perfiles, perfilVoz: p.id };
    if (!activo) cambios.perfilActivo = p.id; // sin otra IA: también escribe
    Config.set(cambios);
    const sigue = activo && activo.proveedor !== p.proveedor ? ` ${activo.nombre} sigue escribiendo; ${p.nombre} solo transcribe lo que dices.` : "";
    return { ok: true, perfil: p, mensaje: `✓ Oído listo con ${p.nombre}.${sigue}` };
  }
  async function probar(p) {
    try {
      const r = await IA.probarConexion(p);
      return r.herramientas ? { ok: true, mensaje: `✓ Conectado: ${p.nombre} · ${p.modelo} (respondió en ${r.segundos.toFixed(1)} s).` }
        : { ok: true, aviso: true, mensaje: `Conectado a ${p.nombre}, pero el modelo «${p.modelo}» no usa herramientas. Elige otro modelo en Ajustes o activa el modo básico.` };
    } catch (e) {
      const m = String(e && e.message || e);
      if (/401|403|inv[aá]lid|no es v[aá]lida|API key/i.test(m)) return { ok: false, mensaje: "La clave no es válida o no está activa. Revisa que la copiaste completa." };
      if (/429|l[ií]mite|quota/i.test(m)) return { ok: true, aviso: true, mensaje: "La clave funciona, pero llegaste al límite de uso por ahora. Espera un minuto o usa otro modelo." };
      if (/conectar|network|fetch/i.test(m)) return { ok: false, mensaje: "No pude comunicarme con la IA. Revisa tu conexión a internet." };
      return { ok: false, mensaje: m };
    }
  }

  /* ---------- 1. OpenRouter con un clic (OAuth PKCE) ---------- */
  const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  async function pkce() {
    const verificador = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const reto = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificador)));
    return { verificador, reto };
  }
  /** Abre la ventana de inicio de sesión y devuelve el código que OpenRouter manda a conectar.html. */
  function pedirCodigo(reto) {
    const inicio = `${CALLBACK}?ir=openrouter&reto=${encodeURIComponent(reto)}`;
    return new Promise((resolve, reject) => {
      const recibir = (msg) => {
        let d; try { d = JSON.parse(msg); } catch (e) { return; }
        if (d.tipo !== "romus-openrouter") return;
        d.codigo ? resolve(d.codigo) : reject(new Error(d.error === "cancelado" ? "Cancelaste el inicio de sesión." : "OpenRouter no devolvió la autorización. Intenta de nuevo."));
      };
      // En Word/PowerPoint: ventana de diálogo de Office (la página empieza en el mismo dominio y luego va a OpenRouter).
      if (window.Office && Office.context && Office.context.ui && Office.context.ui.displayDialogAsync) {
        Office.context.ui.displayDialogAsync(inicio, { height: 70, width: 40, promptBeforeOpen: false }, (res) => {
          if (res.status !== Office.AsyncResultStatus.Succeeded) { reject(new Error("Word no pudo abrir la ventana de inicio de sesión. Revisa que no esté bloqueada e intenta de nuevo.")); return; }
          const dlg = res.value;
          dlg.addEventHandler(Office.EventType.DialogMessageReceived, (a) => { try { dlg.close(); } catch (e) { /* ya cerrada */ } recibir(a.message); });
          dlg.addEventHandler(Office.EventType.DialogEventReceived, () => reject(new Error("Cerraste la ventana antes de terminar.")));
        });
        return;
      }
      // En el navegador (página web de Romus): ventana emergente y postMessage.
      const w = window.open(inicio, "romus-openrouter", "width=520,height=720");
      if (!w) { reject(new Error("El navegador bloqueó la ventana emergente. Permítela e intenta de nuevo.")); return; }
      const fn = (ev) => { if (ev.origin !== location.origin) return; window.removeEventListener("message", fn); recibir(ev.data); };
      window.addEventListener("message", fn);
    });
  }
  async function openRouter(alAvanzar) {
    const paso = alAvanzar || (() => {});
    const { verificador, reto } = await pkce();
    paso("Inicia sesión en OpenRouter (puedes usar tu cuenta de Google) y pulsa «Authorize».");
    const codigo = await pedirCodigo(reto);
    paso("Recibiendo tu clave…");
    const red = (e) => { throw new Error("No pude comunicarme con OpenRouter. Revisa tu conexión a internet e intenta de nuevo."); };
    const r = await fetch("https://openrouter.ai/api/v1/auth/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: codigo, code_verifier: verificador, code_challenge_method: "S256" }) }).catch(red);
    if (!r.ok) throw new Error(`OpenRouter no entregó la clave (error ${r.status}). Intenta de nuevo.`);
    const { key } = await r.json();
    if (!key) throw new Error("OpenRouter no entregó la clave. Intenta de nuevo.");
    paso("Eligiendo un modelo gratuito que sirva para Romus…");
    const modelo = await modeloGratis().catch(() => "");
    return conectarClave(key, "openrouter", { nombre: "OpenRouter", modelo: modelo || "openrouter/auto", conexion: "un-clic" });
  }
  /** Modelos gratuitos de OpenRouter que manejan herramientas (Romus las necesita). */
  async function modelosGratis() {
    const j = await (await fetch("https://openrouter.ai/api/v1/models")).json();
    const gratis = (j.data || []).filter(m => /:free$/.test(m.id) && (m.supported_parameters || []).includes("tools"));
    const pref = [/gemini/i, /llama-3\.3-70b|llama-4/i, /qwen3?.*(72|235|32)b|qwen3-coder/i, /deepseek/i, /mistral/i];
    const puntaje = (m) => { const k = pref.findIndex(re => re.test(m.id)); return (k < 0 ? 99 : k) * 1e6 - (m.context_length || 0) / 1000; };
    return gratis.sort((a, b) => puntaje(a) - puntaje(b)).map(m => ({ id: m.id, nombre: m.name || m.id }));
  }
  async function modeloGratis() { const l = await modelosGratis(); return l.length ? l[0].id : ""; }

  /* ---------- 2. Portapapeles: ofrecer la clave que el usuario acaba de copiar ---------- */
  async function claveEnPortapapeles() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) return null;
      const t = (await navigator.clipboard.readText() || "").trim();
      return t.length < 200 ? reconocer(t) : null;
    } catch (e) { return null; } // Word puede no dar permiso: entonces se pega a mano
  }

  /* ---------- 3. Respaldo de la configuración ---------- */
  const CAMPOS = ["perfiles", "perfilActivo", "perfilVoz", "nivelInvestigacion", "enfoqueInvestigacion", "datosProyecto", "codigoPro", "idioma", "vozURI", "estilo", "velocidad", "tono", "modoAyuda", "minutosSustentacion"];
  function exportar() {
    const c = Config.get(), o = { v: 1, fecha: new Date().toISOString().slice(0, 10) };
    CAMPOS.forEach(k => { if (c[k] !== undefined) o[k] = c[k]; });
    return "ROMUS1-" + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  }
  function importar(codigo) {
    const t = String(codigo || "").trim().replace(/\s+/g, "");
    const m = t.match(/ROMUS1-([A-Za-z0-9+/=]+)/);
    if (!m) throw new Error("Ese no es un código de respaldo de Romus (empieza por ROMUS1-).");
    let o; try { o = JSON.parse(decodeURIComponent(escape(atob(m[1])))); } catch (e) { throw new Error("El código está incompleto o dañado. Cópialo de nuevo, completo."); }
    if (!Array.isArray(o.perfiles) || !o.perfiles.length) throw new Error("El respaldo no trae ninguna IA configurada.");
    const c = Config.get(), cambios = {};
    // Se suman las IA del respaldo a las que ya hay (no se borra nada); si coincide el proveedor, se actualiza.
    const perfiles = c.perfiles.filter(p => p.apiKey || !Config.proveedorDe(p).clave);
    o.perfiles.forEach(np => { const k = perfiles.findIndex(p => p.proveedor === np.proveedor && p.url === np.url); if (k >= 0) perfiles[k] = Object.assign({}, perfiles[k], np, { id: perfiles[k].id }); else perfiles.push(np); });
    cambios.perfiles = perfiles;
    const activo = o.perfiles.find(p => p.id === o.perfilActivo) || o.perfiles[0];
    cambios.perfilActivo = (perfiles.find(p => p.proveedor === activo.proveedor && p.url === activo.url) || perfiles[0]).id;
    CAMPOS.filter(k => !["perfiles", "perfilActivo"].includes(k) && o[k] !== undefined).forEach(k => { cambios[k] = o[k]; });
    Config.set(cambios);
    alConectar(Config.perfil(), { ok: true, mensaje: `Restauré tu configuración del ${o.fecha || "respaldo"}: ${o.perfiles.length} ${o.perfiles.length === 1 ? "IA" : "IA guardadas"}.` });
    return { ias: o.perfiles.length, fecha: o.fecha };
  }
  function descargarRespaldo() {
    const blob = new Blob([exportar() + "\n"], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `romus-respaldo-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function leerArchivo(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { try { res(importar(r.result)); } catch (e) { rej(e); } }; r.onerror = () => rej(new Error("No pude leer el archivo.")); r.readAsText(file); }); }

  /* ---------- Guía animada para sacar la clave de Gemini ---------- */
  const PASOS_GEMINI = [
    ["Abre AI Studio", "Pulsa el botón «Abrir AI Studio» y entra con tu cuenta de Google.", "abrir"],
    ["Crea la clave", "Pulsa «Create API key» (Crear clave de API). Si te pide un proyecto, elige el que aparece.", "crear"],
    ["Cópiala", "Junto a la clave (empieza por AIza… o AQ.…), pulsa el ícono de copiar.", "copiar"],
    ["Vuelve a Word", "Romus la reconoce sola: pulsa «Pegar la clave que copiaste» o pégala en la casilla.", "pegar"]
  ];
  function guiaGemini(cont) {
    const caja = document.createElement("div"); caja.className = "guia-anim";
    caja.innerHTML = `<div class="ga-pantalla"><div class="ga-barra"><i></i><i></i><i></i><span>aistudio.google.com/apikey</span></div><div class="ga-cuerpo">
      <div class="ga-boton">+ Create API key</div><div class="ga-clave"><code>AIzaSy…x9Qk</code><b class="ga-copiar">⧉</b></div><div class="ga-word"><span>Romus</span><div class="ga-input">AIzaSy…x9Qk</div><em>✓ Conectado</em></div>
      <div class="ga-cursor"></div></div></div><ol class="ga-pasos"></ol>`;
    const ol = caja.querySelector(".ga-pasos");
    PASOS_GEMINI.forEach(([t, d]) => { const li = document.createElement("li"); li.innerHTML = "<b></b><span></span>"; li.querySelector("b").textContent = t; li.querySelector("span").textContent = d; ol.appendChild(li); });
    let k = 0;
    const mostrar = () => { caja.dataset.paso = PASOS_GEMINI[k][2]; ol.querySelectorAll("li").forEach((li, i) => li.classList.toggle("activo", i === k)); k = (k + 1) % PASOS_GEMINI.length; };
    mostrar();
    const t = setInterval(() => { if (!document.body.contains(caja)) { clearInterval(t); return; } mostrar(); }, 2600);
    ol.querySelectorAll("li").forEach((li, i) => li.onclick = () => { k = i; mostrar(); });
    cont.appendChild(caja);
    return caja;
  }

  function abrirEnlace(url) {
    try { if (window.Office && Office.context && Office.context.ui && Office.context.ui.openBrowserWindow) { Office.context.ui.openBrowserWindow(url); return; } } catch (e) { /* sin API */ }
    window.open(url, "_blank", "noopener");
  }

  return { reconocer, diagnostico, conectarClave, conectarOido, probar, openRouter, modelosGratis, claveEnPortapapeles, exportar, importar, descargarRespaldo, leerArchivo, guiaGemini, abrirEnlace, CALLBACK,
    set alConectar(fn) { alConectar = fn || (() => {}); } };
})();
