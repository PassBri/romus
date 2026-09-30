/* VozDoc IA — reconocimiento de voz (Web Speech API) y lectura en voz alta (speechSynthesis). */
window.Voz = (function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const sintesis = window.speechSynthesis;

  /* ---------------- Reconocimiento ---------------- */
  let rec = null;
  let escuchando = false;
  let continuo = false;
  let manejadores = {};

  /* Motor de reconocimiento:
     - "navegador": el reconocimiento integrado (Chrome/Edge, Word para la web).
     - "ia": el oído propio de Romus (escucha.js): graba y transcribe con Gemini/OpenAI/Groq.
     - "auto": usa el del navegador y, si no existe o falla (Word de escritorio), cambia solo al propio. */
  let motorActual = "";
  function cfgVoz() { return (window.Config && Config.get()) || {}; }
  function oidoPropio() { return window.Escucha && Escucha.disponible(); }
  function elegirMotor() {
    const c = cfgVoz();
    const modo = c.motorVoz || "auto";
    if (modo === "ia") return oidoPropio() ? "ia" : (SR ? "navegador" : "");
    if (modo === "navegador") return SR ? "navegador" : "";
    if (SR && !c.falloNavegador) return "navegador";
    if (oidoPropio()) return "ia";
    return SR ? "navegador" : "";
  }

  function soportaReconocimiento() { return !!SR || !!(window.Escucha && Escucha.disponible()); }

  async function asegurarMicrofono() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true; // lo decide el reconocedor
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
      return true;
    } catch (e) {
      // En Word para la web, Office puede pedir el permiso por su cuenta.
      try {
        if (window.Office && Office.devicePermission && Office.devicePermission.requestPermissionsAsync) {
          const ok = await Office.devicePermission.requestPermissionsAsync([Office.DevicePermissionType.microphone]);
          if (ok) return true;
        }
      } catch (e2) { /* sin soporte */ }
      return false;
    }
  }

  function iniciar(opciones) {
    detenerEscucha(true);
    manejadores = opciones;
    continuo = !!opciones.continuo;
    const motor = elegirMotor();
    if (!motor) throw new Error("no-soportado");
    motorActual = motor;
    if (motor === "ia") { iniciarPropio(); return; }
    iniciarNavegador();
  }

  function iniciarPropio() {
    escuchando = true;
    Escucha.iniciar(Object.assign({}, manejadores, {
      continuo,
      estado: (v) => {
        if (motorActual !== "ia") return;
        escuchando = v;
        if (manejadores.estado) manejadores.estado(v);
      }
    }));
  }

  function iniciarNavegador() {
    let recibioAlgo = false;
    rec = new SR();
    rec.lang = manejadores.idioma || "es-CO";
    rec.interimResults = true;
    rec.continuous = continuo;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      recibioAlgo = true;
      let parcial = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else parcial += t;
      }
      if (parcial && manejadores.parcial) manejadores.parcial(parcial);
      if (final.trim() && manejadores.final) manejadores.final(final.trim());
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" && continuo) return; // silencio normal en manos libres
      if (e.error === "aborted") return;
      // Word de escritorio: el navegador interno no tiene servicio de voz. Se pasa al oído propio sin molestar.
      const servicioFalla = ["network", "service-not-allowed"].includes(e.error);
      const bloqueado = ["not-allowed", "audio-capture"].includes(e.error) && oidoPropio(); // el micrófono sí funciona, el servicio del navegador no
      if ((servicioFalla || bloqueado) && !recibioAlgo && (cfgVoz().motorVoz || "auto") === "auto") {
        if (window.Config) Config.set({ falloNavegador: true });
        if (oidoPropio()) {
          const r = rec; rec = null; motorActual = "ia";
          try { r.onend = null; r.abort(); } catch (x) { /* nada */ }
          iniciarPropio();
          return;
        }
        if (manejadores.error) manejadores.error("sin-transcriptor");
        continuo = false;
        return;
      }
      if (manejadores.error) manejadores.error(e.error);
      if (["not-allowed", "service-not-allowed", "network", "audio-capture"].includes(e.error)) {
        continuo = false; // no reintentar si el servicio no está disponible
      }
    };
    rec.onend = () => {
      if (motorActual !== "navegador") return;
      if (continuo && escuchando && rec) {
        try { rec.start(); return; } catch (e) { /* cae al cierre */ }
      }
      escuchando = false;
      if (manejadores.estado) manejadores.estado(false);
    };
    rec.start();
    escuchando = true;
    if (manejadores.estado) manejadores.estado(true);
  }

  function detenerEscucha(silencioso) {
    continuo = false;
    const motor = motorActual;
    motorActual = "";
    if (motor === "ia" && window.Escucha) Escucha.detener(true);
    if (rec) {
      const r = rec;
      rec = null;
      try { silencioso ? r.abort() : r.stop(); } catch (e) { /* ignorar */ }
    }
    const estaba = escuchando;
    escuchando = false;
    if (estaba && !silencioso && manejadores.estado) manejadores.estado(false);
  }

  /* ---------------- Síntesis (lectura en voz alta) ---------------- */
  let voces = [];
  let vozElegida = null;
  let velocidad = 1;
  let tono = 1;
  let pausaMs = 250;
  let fichaCancelacion = 0;
  let resolverActual = null;
  let enunciadoActual = null; // referencia viva (evita un error de Chrome que corta la voz)
  let hablando = false;
  let pausado = false;
  let alHablar = null;
  let alPalabraGlobal = null;

  function cargarVoces() {
    return new Promise((resolve) => {
      if (!sintesis) return resolve([]);
      const listar = () => {
        voces = sintesis.getVoices() || [];
        resolve(voces);
      };
      const v = sintesis.getVoices();
      if (v && v.length) { voces = v; return resolve(v); }
      sintesis.onvoiceschanged = listar;
      setTimeout(listar, 1500);
    });
  }

  function elegirVoz(uri, idioma) {
    const base = (idioma || "es-CO").slice(0, 2);
    vozElegida =
      voces.find(v => v.voiceURI === uri) ||
      voces.find(v => v.lang === idioma && /natural|online/i.test(v.name)) ||
      voces.find(v => v.lang === idioma) ||
      voces.find(v => v.lang && v.lang.startsWith(base) && /natural|online/i.test(v.name)) ||
      voces.find(v => v.lang && v.lang.startsWith(base)) ||
      null;
    return vozElegida;
  }

  function trocear(texto) {
    const limpio = texto.replace(/\s+/g, " ").trim();
    if (!limpio) return [];
    const frases = limpio.match(/[^.!?;:…]+[.!?;:…]*\s*/g) || [limpio];
    const trozos = [];
    let actual = "";
    for (const f of frases) {
      if ((actual + f).length > 220 && actual) { trozos.push(actual.trim()); actual = ""; }
      if (f.length > 220) {
        // frase muy larga: partir por comas o espacios
        let resto = f;
        while (resto.length > 220) {
          let corte = resto.lastIndexOf(",", 220);
          if (corte < 80) corte = resto.lastIndexOf(" ", 220);
          if (corte < 1) corte = 220;
          trozos.push(resto.slice(0, corte + 1).trim());
          resto = resto.slice(corte + 1);
        }
        actual += resto;
      } else {
        actual += f;
      }
    }
    if (actual.trim()) trozos.push(actual.trim());
    return trozos;
  }

  function hablarTrozo(texto, idioma, alPalabra) {
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(texto);
      enunciadoActual = u;
      if (vozElegida) { u.voice = vozElegida; u.lang = vozElegida.lang; } else { u.lang = idioma || "es-CO"; }
      u.rate = velocidad;
      u.pitch = tono;
      let terminado = false;
      const fin = (resultado) => {
        if (terminado) return;
        terminado = true;
        clearInterval(vigilante);
        resolverActual = null;
        resolve(resultado === "reinicio" ? "reinicio" : "fin");
      };
      resolverActual = fin;
      u.onboundary = (e) => {
        if (e.name && e.name !== "word") return;
        if (alPalabraGlobal) alPalabraGlobal();
        if (alPalabra) alPalabra(e.charIndex, e.charLength || 0, texto);
      };
      u.onend = () => fin();
      u.onerror = () => fin();
      // Vigilante: algunos navegadores no disparan "onend".
      const inicio = Date.now();
      const maximo = 4000 + (texto.length * 180) / velocidad;
      const vigilante = setInterval(() => {
        if (pausado) return;
        if (Date.now() - inicio > maximo && !sintesis.speaking) fin();
      }, 1000);
      sintesis.speak(u);
    });
  }

  /** Lee un texto. Devuelve true si terminó, false si fue interrumpido. */
  async function decir(texto, idioma, ganchos) {
    ganchos = ganchos || {};
    if (!sintesis) return false;
    const ficha = fichaCancelacion;
    const trozos = trocear(texto);
    hablando = true;
    if (alHablar) alHablar(true);
    for (let k = 0; k < trozos.length;) {
      if (ficha !== fichaCancelacion) break;
      if (ganchos.trozo) ganchos.trozo(trozos[k], k, trozos.length);
      const r = await hablarTrozo(trozos[k], idioma, ganchos.palabra);
      if (r === "reinicio") continue; // se cambió la velocidad o la voz: repetir la frase con el ajuste nuevo
      k++;
      if (pausaMs > 0 && ficha === fichaCancelacion) await new Promise(res => setTimeout(res, k < trozos.length ? pausaMs / 2 : pausaMs));
    }
    const completo = ficha === fichaCancelacion;
    if (completo) {
      hablando = false;
      if (alHablar) alHablar(false);
    }
    return completo;
  }

  function callar() {
    fichaCancelacion++;
    pausado = false;
    hablando = false;
    if (sintesis) sintesis.cancel();
    if (resolverActual) resolverActual();
    if (alHablar) alHablar(false);
  }

  /** Aplica de inmediato un cambio de voz, tono o velocidad repitiendo la frase actual. */
  function aplicarAhora() {
    if (!sintesis || !hablando || pausado || !resolverActual) return;
    const r = resolverActual;
    sintesis.cancel();
    r("reinicio");
  }

  /* Género aproximado según el nombre de la voz (las voces no lo informan). */
  const MUJERES = /sabina|helena|laura|elvira|salome|dalia|paloma|elena|ximena|camila|paulina|monica|m[oó]nica|lucia|luc[ií]a|abril|irene|estrella|beatriz|candela|carlota|larissa|lola|marina|nuria|renata|teresa|triana|vera|valentina|catalina|belkys|karla|margarita|maria|mar[ií]a|tatiana|yolanda|andrea|elsa|sofia|sof[ií]a|isabel|carmen|luciana|female|mujer|zira|jenny|aria|samantha|google español$/i;
  const HOMBRES = /pablo|raul|ra[uú]l|jorge|alvaro|[aá]lvaro|gonzalo|alonso|tomas|tom[aá]s|gerardo|diego|carlos|federico|emilio|mateo|nil|arnau|dario|dar[ií]o|dante|gabriel|jose|jos[eé]|lorenzo|luciano|marcelo|mario|santiago|sergio|victor|v[ií]ctor|juan|andres|andr[eé]s|mauricio|roberto|cecilio|liberto|male|hombre|david|mark|guy|juan/i;
  function generoVoz(v) {
    const n = (v && v.name) || "";
    if (MUJERES.test(n)) return "mujer";
    if (HOMBRES.test(n)) return "hombre";
    return "";
  }

  const PAISES = { CO: "Colombia", ES: "España", MX: "México", US: "EE. UU.", AR: "Argentina", CL: "Chile", PE: "Perú", VE: "Venezuela", EC: "Ecuador", BO: "Bolivia", UY: "Uruguay", PY: "Paraguay", CR: "Costa Rica", CU: "Cuba", DO: "Rep. Dominicana", GT: "Guatemala", HN: "Honduras", NI: "Nicaragua", PA: "Panamá", PR: "Puerto Rico", SV: "El Salvador", GQ: "Guinea Ecuatorial", GB: "Reino Unido", "419": "Latinoamérica" };
  function etiquetaVoz(v) {
    const natural = /natural|neural|online/i.test(v.name);
    let nombre = v.name.replace(/^(Microsoft|Google|Apple)\s+/i, "").replace(/\s*Online\s*\(Natural\)/i, "").replace(/\s*-\s*Spanish.*$|\s*-\s*English.*$/i, "").trim();
    const region = (v.lang || "").split(/[-_]/)[1] || "";
    const pais = PAISES[region.toUpperCase()] || region;
    const g = generoVoz(v);
    return `${nombre}${natural ? " ✦" : ""} — ${pais || v.lang}${g ? " · " + g : ""}`;
  }

  function pausar() { if (sintesis && hablando) { sintesis.pause(); pausado = true; } }
  function reanudar() { if (sintesis && pausado) { sintesis.resume(); pausado = false; } }

  return {
    soportaReconocimiento, asegurarMicrofono, iniciar, detenerEscucha,
    get escuchando() { return escuchando; },
    get motor() { return motorActual || elegirMotor(); },
    cargarVoces, elegirVoz,
    get voces() { return voces; },
    setVelocidad(v) { velocidad = Math.min(2, Math.max(0.5, v)); return velocidad; },
    get velocidad() { return velocidad; },
    setTono(t) { tono = Math.min(1.5, Math.max(0.5, t)); return tono; },
    get tono() { return tono; },
    setPausa(ms) { pausaMs = Math.max(0, ms); },
    get vozActual() { return vozElegida; },
    aplicarAhora, generoVoz, etiquetaVoz,
    decir, callar, pausar, reanudar,
    get hablando() { return hablando; },
    get pausado() { return pausado; },
    setManejadorHablando(fn) { alHablar = fn; },
    setManejadorPalabra(fn) { alPalabraGlobal = fn; },
    trocear
  };
})();
