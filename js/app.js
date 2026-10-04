/* VozDoc IA — lógica principal del panel. */
(function () {
  const $ = (id) => document.getElementById(id);

  const estado = {
    ocupado: false,
    abort: null,
    historial: [],               // conversación corta para la IA
    lectura: { activa: false, sesion: 0, indice: 0, fin: 0, parrafos: [] },
    enWord: false,
    ultimaTecla: 0,
    temporizadorDictado: null,
    modoVoz: false,
    orbe: null,
    detenerMedidor: null,
    nivelSintetico: 0,
    burbuja: null,
    dictado: false,
    ultimoDictado: "",
    ultimoEstadoOrbe: ""
  };

  /* ============ Utilidades de interfaz ============ */

  function normalizar(t) {
    return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[¿?¡!.,;:«»"“”()]/g, " ").replace(/\s+/g, " ").trim();
  }

  function fijarEstado(texto, tipo) {
    const e = $("estado");
    e.textContent = texto;
    e.className = "estado" + (tipo ? " " + tipo : "");
  }

  /* ---------- Pestañas: Inicio · Investigar · Documento ---------- */
  const PESTANAS = ["inicio", "investigar", "documento"];
  function pestanaActual() { return document.body.dataset.pestana || "inicio"; }
  function irPestana(nombre, opciones) {
    if (!PESTANAS.includes(nombre)) return;
    const antes = pestanaActual();
    document.body.dataset.pestana = nombre;
    document.querySelectorAll("[data-pestana]").forEach(el => el.classList.toggle("fuera-pestana", el.dataset.pestana !== nombre));
    document.querySelectorAll(".pestana").forEach(b => {
      const si = b.dataset.ir === nombre;
      b.setAttribute("aria-selected", si ? "true" : "false");
      if (si) b.classList.remove("novedad");
    });
    try { Config.set({ pestana: nombre }); } catch (e) { /* sin almacenamiento */ }
    const main = $("principal");
    if (main && antes !== nombre && !(opciones && opciones.sinScroll)) main.scrollTop = nombre === "inicio" ? main.scrollHeight : 0;
    if (nombre === "documento" && window.Panel && Panel.actualizar) { try { Panel.actualizar(); } catch (e) { /* opcional */ } }
  }
  function marcarPestana(nombre) { const b = document.querySelector(`.pestana[data-ir="${nombre}"]`); if (b && pestanaActual() !== nombre) b.classList.add("novedad"); }
  window.RomusUI = { irPestana, pestanaActual, marcarPestana };

  function agregarMensaje(tipo, texto, extra) {
    const div = document.createElement("div");
    div.className = "mensaje " + tipo;
    const quien = { usuario: "Tú", ia: "Romus", accion: "Hecho", error: "Error", sistema: "Romus" }[tipo] || "";
    const hora = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
    div.dataset.meta = `${quien} · ${hora}`;
    div.textContent = texto;
    if ((tipo === "ia" || tipo === "accion") && Voz.recordarDicho) Voz.recordarDicho(texto);
    if (extra) div.appendChild(extra);
    $("conversacion").appendChild(div);
    if (texto && !extra && !/^▶ /.test(texto)) guardarChat({ tipo, texto, meta: div.dataset.meta });
    if (estado.burbuja && (tipo === "usuario" || tipo === "ia" || tipo === "accion" || tipo === "error")) enviarBurbuja({ tipo: "texto", quien: tipo, texto });
    if (pestanaActual() === "inicio") { const main = $("principal"); main.scrollTop = main.scrollHeight; }
    else if (tipo !== "usuario" && tipo !== "sistema") marcarPestana("inicio");
    return div;
  }

  /* La conversación sobrevive cuando Word recarga el panel (botones de la cinta clásica). */
  const CHAT = "romus.chat";
  function guardarChat(m) {
    try {
      const l = JSON.parse(localStorage.getItem(CHAT) || "[]").filter(x => Date.now() - x.t < 2 * 3600000);
      l.push(Object.assign({ t: Date.now() }, m));
      localStorage.setItem(CHAT, JSON.stringify(l.slice(-30)));
    } catch (e) { /* sin almacenamiento */ }
  }
  function restaurarChat() {
    try {
      const l = JSON.parse(localStorage.getItem(CHAT) || "[]").filter(x => Date.now() - x.t < 2 * 3600000);
      l.forEach(m => { const d = document.createElement("div"); d.className = "mensaje " + m.tipo; d.dataset.meta = m.meta || ""; d.textContent = m.texto; $("conversacion").appendChild(d); });
      estado.historial = l.filter(m => m.tipo === "usuario" || m.tipo === "ia").slice(-12).map(m => ({ role: m.tipo === "usuario" ? "user" : "assistant", content: m.texto }));
    } catch (e) { /* nada guardado */ }
  }

  function mostrarEscribiendo() {
    const d = agregarMensaje("ia", "");
    d.innerHTML = '<span class="escribiendo"><i></i><i></i><i></i></span>';
    return d;
  }

  function mostrarProgreso(texto, fraccion) {
    $("progreso").classList.remove("oculto");
    $("progresoTexto").textContent = texto;
    const barra = $("progresoBarra").parentElement;
    if (fraccion == null) { barra.classList.add("indeterminada"); $("progresoBarra").style.width = ""; }
    else { barra.classList.remove("indeterminada"); $("progresoBarra").style.width = Math.round(fraccion * 100) + "%"; }
  }
  function ocultarProgreso() { $("progreso").classList.add("oculto"); }

  function ocupar(si, texto) {
    estado.ocupado = si;
    document.querySelectorAll(".chip").forEach(b => b.disabled = si);
    fijarEstado(si ? (texto || "Trabajando…") : "Listo", si ? "activo" : "");
    sincronizarOrbe();
    if (!si) { ocultarProgreso(); estado.abort = null; extenderConversacion(); if (window.Panel) Panel.programar(500); }
  }

  /* ============ Romus: palabra de activación ============ */

  const RE_ACTIVACION = /^\s*(?:(?:ok(?:ey|ay|a)?|okey|oka|oye|hola|hey|ey|eh|o|y)[\s,.]+)?(?:r[oóò]m[uúoó]s|ramos|rumos|romos|rommus|romu|jromus|homus|romus)(?=[\s,.:;!¡¿?]|$)[\s,.:;!¡¿?]*/i;

  function quitarPalabraActivacion(texto) {
    const m = texto.match(RE_ACTIVACION);
    if (!m) return { desperto: false, resto: texto };
    return { desperto: true, resto: texto.slice(m[0].length).trim() };
  }

  function sonidoActivacion() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      estado.ac = estado.ac || new AC();
      const ac = estado.ac, t = ac.currentTime;
      [[660, 0], [990, 0.11]].forEach(([f, d]) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + d);
        g.gain.linearRampToValueAtTime(0.08, t + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.22);
        o.connect(g).connect(ac.destination);
        o.start(t + d); o.stop(t + d + 0.25);
      });
    } catch (e) { /* sin audio */ }
  }

  function despertar() {
    if (Voz.hablando && !estado.lectura.activa) Voz.callar();   // si estaba respondiendo, se calla para escuchar
    estado.conversacion = true;
    estado.despiertoHasta = Date.now() + 20000;
    sonidoActivacion();
    if (estado.orbe) estado.orbe.pulso(0.8);
    if (estado.orbePanel) estado.orbePanel.pulso(0.8);
    if (estado.burbuja) enviarBurbuja({ tipo: "pulso" });
    if (estado.modoVoz) mostrarSubtitulo("");
    sincronizarOrbe();
    actualizarBotonMic(Voz.escuchando);
  }

  function dormir(despedirse) {
    estado.conversacion = false;
    sincronizarOrbe();
    actualizarBotonMic(Voz.escuchando);
    if (despedirse) { agregarMensaje("ia", "Con gusto. Aquí estaré; di «Ok Romus» cuando me necesites."); hablar("Con gusto."); }
  }

  function extenderConversacion() {
    if (estado.conversacion) estado.despiertoHasta = Date.now() + 15000;
  }

  function revisarSueno() {
    if (estado.conversacion && Date.now() > estado.despiertoHasta && !Voz.hablando && !estado.ocupado && !estado.lectura.activa) dormir(false);
  }

  function esperandoPalabra() {
    return Config.get().palabraActivacion && !estado.conversacion && !estado.dictado && (Voz.escuchando || estado.burbujaEscuchando);
  }

  let textoOriginalActual = "";
  function comandoActual() { return textoOriginalActual; }
  function prefijar(t) { const c = $("txtComando"); c.value = t; c.focus(); c.setSelectionRange(t.length, t.length); ajustarAltura(); }
  function responderLocal(texto) { agregarMensaje("ia", texto); hablar(texto); }

  async function hablar(texto) {
    if (!Config.get().leerRespuestas || !texto) return;
    detenerLectura(false);
    await Voz.decir(texto, Config.get().idioma, ganchosSubtitulo());
  }

  function confirmar(texto) {
    agregarMensaje("accion", texto);
    hablar(texto);
  }

  function mostrarError(e) {
    if (e && e.name === "AbortError") { agregarMensaje("sistema", "Tarea cancelada."); return; }
    const msg = (e && e.message) || String(e);
    agregarMensaje("error", msg);
    fijarEstado("Error", "error");
    if (e && e.sinClave) $("avisoClave").classList.remove("oculto");
    console.error(e);
  }

  /* ============ Lectura en voz alta ============ */

  function mostrarLector(si) { $("lector").classList.toggle("oculto", !si); }

  function actualizarLector() {
    const L = estado.lectura;
    const conTexto = L.parrafos.filter((p, k) => k <= L.fin && p.texto.trim());
    const pos = conTexto.findIndex(p => p.i === L.indice) + 1;
    $("lectorPosicion").textContent = `Párrafo ${pos} de ${conTexto.length}`;
    $("lectorProgreso").style.width = (conTexto.length ? (pos / conTexto.length) * 100 : 0) + "%";
    if (window.Panel) Panel.marcarLectura(L.indice);
    $("icoPausa").innerHTML = Voz.pausado ? '<path d="M7 5l12 7-12 7z"/>' : '<path d="M8 5v14M16 5v14"/>';
  }

  async function leerRango(ini, fin) {
    detenerLectura(false);
    const parrafos = await Doc.leerParrafos();
    if (!parrafos.some(p => p.texto.trim())) { confirmar("El documento está vacío."); return; }
    const L = estado.lectura;
    L.parrafos = parrafos;
    L.indice = Math.max(0, Math.min(ini, parrafos.length - 1));
    L.fin = Math.min(fin == null ? parrafos.length - 1 : fin, parrafos.length - 1);
    L.activa = true;
    const s = ++L.sesion;
    mostrarLector(true);
    fijarEstado("Leyendo", "activo");
    bucleLectura(s);
  }

  async function bucleLectura(s) {
    const L = estado.lectura;
    while (L.sesion === s && L.indice <= L.fin) {
      const p = L.parrafos[L.indice];
      if (p && p.texto.trim()) {
        actualizarLector();
        const idx = L.indice;
        const completo = await Voz.decir(p.texto, Config.get().idioma, {
          trozo: (t) => {
            mostrarSubtitulo(t);
            if (L.sesion === s) Doc.seleccionarFrase(idx, t).catch(() => Doc.seleccionarParrafo(idx).catch(() => {}));
          },
          palabra: (ci) => resaltarPalabra(ci)
        });
        if (!completo || L.sesion !== s) return;
      }
      L.indice++;
    }
    if (L.sesion === s) terminarLectura();
  }

  function terminarLectura() {
    const L = estado.lectura;
    L.activa = false;
    mostrarLector(false);
    if (window.Panel) Panel.marcarLectura(-1);
    if (!estado.ocupado) fijarEstado("Listo");
  }

  function detenerLectura(mostrarAviso) {
    const L = estado.lectura;
    const estaba = L.activa;
    L.sesion++;
    Voz.callar();
    if (estaba) terminarLectura();
    if (mostrarAviso && estaba) agregarMensaje("sistema", "Lectura detenida.");
  }

  function saltar(delta) {
    const L = estado.lectura;
    if (!L.activa) return false;
    let k = L.indice + delta;
    while (k >= 0 && k <= L.fin && !(L.parrafos[k] && L.parrafos[k].texto.trim())) k += delta > 0 ? 1 : -1;
    if (k < 0 || k > L.fin) return true;
    L.indice = k;
    const s = ++L.sesion;
    Voz.callar();
    L.activa = true;
    mostrarLector(true);
    bucleLectura(s);
    return true;
  }

  function alternarPausa() {
    if (Voz.pausado) Voz.reanudar(); else Voz.pausar();
    actualizarLector();
  }

  /* ============ Voz, estilo, velocidad y tono ============ */

  let temporizadorAplicar = null;
  function aplicarPronto() {
    clearTimeout(temporizadorAplicar);
    if (!Voz.hablando) return; // solo tiene sentido si está leyendo en este momento
    temporizadorAplicar = setTimeout(() => Voz.aplicarAhora(), 200);
  }

  function cambiarVelocidad(v, desdeEstilo) {
    const nueva = Voz.setVelocidad(Math.round(v * 20) / 20);
    Config.set({ velocidad: nueva });
    $("rngVelocidad").value = nueva;
    $("rngVelocidadLector").value = nueva;
    const txt = nueva.toFixed(2).replace(/0$/, "") + "×";
    $("velValor").textContent = txt;
    $("velAjuste").textContent = txt;
    if (!desdeEstilo) marcarPersonalizado();
    actualizarResumenVoz();
    aplicarPronto();
    return nueva;
  }

  function describirTono(t) {
    if (Math.abs(t - 1) < 0.03) return "Normal";
    const pct = Math.round(Math.abs(t - 1) * 100);
    return (t < 1 ? "Más grave " : "Más agudo ") + pct + " %";
  }

  function cambiarTono(t, desdeEstilo) {
    const nuevo = Voz.setTono(Math.round(t * 20) / 20);
    Config.set({ tono: nuevo });
    $("rngTono").value = nuevo;
    $("tonoValor").textContent = describirTono(nuevo);
    if (!desdeEstilo) marcarPersonalizado();
    actualizarResumenVoz();
    aplicarPronto();
    return nuevo;
  }

  function aplicarEstilo(id) {
    const e = Config.ESTILOS.find(x => x.id === id);
    if (!e) return null;
    Config.set({ estilo: id, pausa: e.pausa });
    Voz.setPausa(e.pausa);
    cambiarVelocidad(e.velocidad, true);
    cambiarTono(e.tono, true);
    pintarEstilos();
    actualizarResumenVoz();
    return e;
  }

  function marcarPersonalizado() {
    if (Config.get().estilo !== "personalizado") {
      Config.set({ estilo: "personalizado" });
      pintarEstilos();
    }
  }

  function pintarEstilos() {
    const actual = Config.get().estilo;
    const cont = $("estilos");
    cont.innerHTML = "";
    const lista = Config.ESTILOS.slice();
    if (actual === "personalizado") lista.push({ id: "personalizado", nombre: "Personalizado" });
    lista.forEach(e => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "estilo";
      b.textContent = e.nombre;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(e.id === actual));
      if (e.id !== "personalizado") {
        b.addEventListener("click", () => {
          aplicarEstilo(e.id);
          if (!Voz.hablando) probarVoz();
        });
      }
      cont.appendChild(b);
    });
  }

  function nombreCortoVoz(v) {
    if (!v) return "Voz del sistema";
    return Voz.etiquetaVoz(v).split(" — ")[0].replace(" ✦", "");
  }

  function actualizarResumenVoz() {
    const c = Config.get();
    const est = Config.ESTILOS.find(e => e.id === c.estilo);
    $("resumenVoz").textContent = `${nombreCortoVoz(Voz.vozActual)} · ${est ? est.nombre : "Personalizado"} · ${Voz.velocidad.toFixed(2).replace(/0$/, "")}×`;
    $("roVoz").textContent = `${nombreCortoVoz(Voz.vozActual)} · ${Voz.velocidad.toFixed(1)}×`;
  }

  function vocesDelIdioma() {
    const base = Config.get().idioma.slice(0, 2);
    return Voz.voces.filter(v => v.lang && v.lang.toLowerCase().startsWith(base));
  }

  function elegirVozPorURI(uri) {
    Config.set({ vozURI: uri });
    Voz.elegirVoz(uri, Config.get().idioma);
    $("selVoz").value = uri;
    actualizarResumenVoz();
    aplicarPronto();
    return Voz.vozActual;
  }

  function probarVoz() {
    const v = Voz.vozActual;
    const ingles = v && /^en/i.test(v.lang);
    const muestra = ingles ? "Hello, this is how your documents will sound." : "Hola, así sonará la lectura de tus documentos.";
    detenerLectura(false);
    Voz.decir(muestra, Config.get().idioma);
  }

  /* ============ Comandos de control (sin IA) ============ */

  function comandoControl(n) {
    if (/^(para|parar|detente|deten|detener|stop|silencio|callate|calla|basta|cancela|cancelar|alto)( (la )?(lectura|de leer|todo|eso))?$/.test(n)) {
      return () => {
        if (estado.abort) estado.abort.abort();
        detenerLectura(true);
      };
    }
    if (/^(pausa|pausar|pausa la lectura|espera)$/.test(n)) return () => { if (Voz.hablando) { Voz.pausar(); actualizarLector(); } };
    if (/^(continua|continuar|reanuda|reanudar|sigue|sigue leyendo|continua leyendo)$/.test(n)) {
      return () => {
        if (Voz.pausado) { Voz.reanudar(); actualizarLector(); }
        else if (!estado.lectura.activa && estado.lectura.parrafos.length && estado.lectura.indice <= estado.lectura.fin) {
          estado.lectura.activa = true; mostrarLector(true); bucleLectura(++estado.lectura.sesion);
        }
      };
    }
    if (/^(siguiente|siguiente parrafo|el siguiente|salta|saltar|adelante)$/.test(n)) return () => saltar(1);
    if (/^(anterior|parrafo anterior|el anterior|atras|vuelve|repite|repite eso|otra vez)$/.test(n)) {
      return () => { if (/repite|otra vez/.test(n)) saltar(0) || null; else saltar(-1); };
    }
    if (/^(voz |tono |lee )?mas (grave|gruesa|grueso|bajo)$/.test(n)) return () => { cambiarTono(Voz.tono - 0.15); agregarMensaje("sistema", "Tono: " + describirTono(Voz.tono)); };
    if (/^(voz |tono |lee )?mas (aguda|agudo|fina|fino|alto)$/.test(n)) return () => { cambiarTono(Voz.tono + 0.15); agregarMensaje("sistema", "Tono: " + describirTono(Voz.tono)); };
    if (/^(velocidad normal|lee normal|tono normal)$/.test(n)) return () => { if (/tono/.test(n)) cambiarTono(1); else cambiarVelocidad(1); agregarMensaje("sistema", "Listo, " + (/tono/.test(n) ? "tono" : "velocidad") + " normal."); };
    let mEstilo = n.match(/^(estilo|modo|voz|lee en (modo|estilo)|lee como|lee con voz|lee con estilo|pon (el )?(estilo|modo)|usa (el )?(estilo|modo)) (de )?(natural|narrador|clase|clase pausada|profesor|calmad[oa]|tranquil[oa]|energic[oa]|animad[oa]|grave|agud[oa]|rapid[oa]|lectura rapida)$/);
    if (mEstilo) {
      const palabra = mEstilo[mEstilo.length - 1];
      const mapa = { natural: "natural", narrador: "narrador", clase: "clase", "clase pausada": "clase", profesor: "clase", calmado: "calmado", calmada: "calmado", tranquilo: "calmado", tranquila: "calmado", energico: "energico", energica: "energico", animado: "energico", animada: "energico", grave: "grave", agudo: "agudo", aguda: "agudo", rapido: "rapida", rapida: "rapida", "lectura rapida": "rapida" };
      return () => { const e = aplicarEstilo(mapa[palabra]); if (e) agregarMensaje("sistema", "Estilo de voz: " + e.nombre + "."); };
    }
    if (/^(cambia (la |de )?voz|otra voz|siguiente voz|cambiar voz)$/.test(n)) {
      return () => {
        const lista = vocesDelIdioma();
        if (lista.length < 2) { agregarMensaje("sistema", "Solo hay una voz disponible en tu idioma en este equipo."); return; }
        const k = lista.indexOf(Voz.vozActual);
        const v = elegirVozPorURI(lista[(k + 1) % lista.length].voiceURI);
        agregarMensaje("sistema", "Voz: " + Voz.etiquetaVoz(v));
      };
    }
    const mGenero = n.match(/^(pon |usa |cambia a |quiero )?(una |la )?voz (de )?(hombre|masculina|mujer|femenina)$/);
    if (mGenero) {
      const genero = /hombre|masculina/.test(mGenero[4]) ? "hombre" : "mujer";
      return () => {
        const lista = vocesDelIdioma().filter(v => Voz.generoVoz(v) === genero)
          .sort((a, b) => (/natural|online/i.test(b.name) ? 1 : 0) - (/natural|online/i.test(a.name) ? 1 : 0));
        if (!lista.length) { agregarMensaje("sistema", `No encontré una voz de ${genero} en tu idioma en este equipo.`); return; }
        const actual = lista.indexOf(Voz.vozActual);
        const v = elegirVozPorURI(lista[(actual + 1) % lista.length].voiceURI);
        agregarMensaje("sistema", "Voz: " + Voz.etiquetaVoz(v));
      };
    }
    if (/^(mas rapido|lee mas rapido|acelera)$/.test(n)) return () => { const v = cambiarVelocidad(Voz.velocidad + 0.15); agregarMensaje("sistema", "Velocidad " + v.toFixed(2) + "×"); };
    if (/^(mas lento|mas despacio|lee mas lento|lee mas despacio|despacio)$/.test(n)) return () => { const v = cambiarVelocidad(Voz.velocidad - 0.15); agregarMensaje("sistema", "Velocidad " + v.toFixed(2) + "×"); };
    return null;
  }

  /* ============ Comandos locales (lectura, cambios, ayuda) ============ */

  function comandoLocal(n) {
    const mp = n.match(/^(ve|vamos|ir|llevame|abre|muestra|muestrame|cambia)( a| al)?( la)?( pestana| seccion)?( de)? (inicio|investigar|investigacion|documento|el documento|datos del documento)$/);
    if (mp) return () => { const d = /^inic/.test(mp[6]) ? "inicio" : /^invest/.test(mp[6]) ? "investigar" : "documento"; irPestana(d); hablar(d === "inicio" ? "Listo." : d === "investigar" ? "Aquí tienes tu investigación." : "Estos son los datos de tu documento."); };
    // Estilo de las respuestas
    const me = n.match(/^(habla|hablame|responde|respondeme|contesta|se)( de forma| de manera| en tono| con tono| mas)? (mas )?(formal|profesional|natural|calido|cercano|breve|corto|conciso|detallado|didactico|extenso)$/);
    if (me) return () => {
      const mapa = { formal: "profesional", profesional: "profesional", natural: "natural", calido: "natural", cercano: "natural", breve: "breve", corto: "breve", conciso: "breve", detallado: "detallado", didactico: "detallado", extenso: "detallado" };
      const e = mapa[me[4]];
      Config.set({ estiloRespuesta: e }); $("selEstiloRespuesta").value = e;
      responderLocal({ natural: "Perfecto, te hablaré de forma natural y cercana.", profesional: "De acuerdo, usaré un tono más profesional.", breve: "Entendido, seré breve.", detallado: "Claro, te daré respuestas más completas." }[e]);
    };
    // Instrucciones permanentes: «a partir de ahora…», «de ahora en adelante…», «recuerda que…»
    const mi = textoOriginalActual.match(/^\s*(a partir de ahora|de ahora en adelante|desde ahora|siempre|recuerda que|recuerda siempre que)[\s,:]+(.{4,})$/i);
    if (mi && !/^(lee|leeme|corrige)/.test(n)) return () => {
      const nueva = mi[2].trim().replace(/[.。]*$/, ".");
      const previas = (Config.get().instrucciones || "").trim();
      const todo = (previas ? previas + "\n" : "") + nueva.charAt(0).toUpperCase() + nueva.slice(1);
      Config.set({ instrucciones: todo.slice(-1500) }); $("txtInstrucciones").value = Config.get().instrucciones;
      responderLocal("Anotado. Lo tendré en cuenta de ahora en adelante.");
    };
    if (/^(olvida|borra|elimina) (mis|tus|las) instrucciones$/.test(n)) return () => {
      Config.set({ instrucciones: "" }); $("txtInstrucciones").value = "";
      responderLocal("Listo, borré tus instrucciones personales.");
    };
    // Tema claro / oscuro
    const mt = n.match(/^((pon|activa|cambia|cambia a|usa|pasa a) )?(el )?(modo|tema) (oscuro|noche|nocturno|claro|dia|diurno)$/);
    if (mt) return () => {
      const t = cambiarTema(/^(oscuro|noche|nocturno)$/.test(mt[5]) ? "oscuro" : "claro");
      agregarMensaje("sistema", t === "oscuro" ? "Modo oscuro activado." : "Modo claro activado.");
    };
    // Lectura
    let m = n.match(/^(lee|leeme|leer|lea|leelo|leemelo)( (el|la|lo|todo|toda|esto|este|aqui|desde|el cursor|documento|documento completo|texto|seleccion|seleccionado|completo|todo el documento|en voz alta))*$/);
    if (m) {
      return async () => {
        if (/desde (aqui|el cursor)/.test(n)) {
          const sel = await Doc.leerSeleccion();
          return leerRango(sel.ini, null);
        }
        if (/documento|todo|completo|texto/.test(n)) return leerRango(0, null);
        const sel = await Doc.leerSeleccion();
        if (/seleccion|seleccionado|esto|este|lo$|leelo|leemelo/.test(n)) {
          if (sel.hay) return leerRango(sel.ini, sel.fin);
          return leerRango(sel.ini, sel.ini); // párrafo del cursor
        }
        return sel.hay ? leerRango(sel.ini, sel.fin) : leerRango(0, null);
      };
    }

    // Corrección por lotes
    m = n.match(/^(corrige|corregir|corrigeme|revisa|revisar|revisame)( (la|el|lo|los|las|de|del|y|tambien|todo|toda|esto|este|ortografia|gramatica|redaccion|puntuacion|estilo|documento|documento completo|completo|seleccion|texto|parrafo|errores|con|comentarios|comentario|mediante|en))*$/);
    if (m && !/^(revisa|revisar|revisame)$/.test(n)) {
      const modo = /comentario/.test(n) ? "comentarios" : "cambios";
      const nivel = /estilo|redaccion/.test(n) ? "estilo" : "ortografia";
      let alcance = "auto";
      if (/documento|completo|todo/.test(n)) alcance = "documento";
      else if (/seleccion|esto/.test(n)) alcance = "seleccion";
      else if (/parrafo/.test(n)) alcance = "parrafo";
      return () => corregirPorLotes({ alcance, modo, nivel });
    }

    // Control de cambios
    if (/^(activa|activar|enciende|prende) (el )?control de cambios$/.test(n)) {
      return async () => { await Doc.fijarControlCambios(true); Config.set({ controlCambios: true }); $("chkControlCambios").checked = true; confirmar("Control de cambios activado."); };
    }
    if (/^(desactiva|desactivar|apaga|quita) (el )?control de cambios$/.test(n)) {
      return async () => { await Doc.fijarControlCambios(false); Config.set({ controlCambios: false }); $("chkControlCambios").checked = false; confirmar("Control de cambios desactivado."); };
    }
    if (/^acepta(r)? (todos )?(los )?cambios$/.test(n)) return async () => { await Doc.resolverCambios(true); confirmar("Acepté todos los cambios."); };
    if (/^rechaza(r)? (todos )?(los )?cambios$/.test(n)) return async () => { await Doc.resolverCambios(false); confirmar("Rechacé todos los cambios."); };

    // Dictado, modo voz y burbuja
    if (/^(modo dictado|dictado|dictar|dicta|empieza a dictar|comienza a dictar|activa el dictado|activa dictado|quiero dictar|voy a dictar)$/.test(n)) return () => activarDictado(true);
    if (/^(modo voz|modo conversacion|abre el modo voz|conversemos|hablemos)$/.test(n)) return () => abrirModoVoz();
    const mIA = n.match(/^(usa|usar|cambia a|cambiar a|pasa a|conecta|conectate a|activa) (la ia |el modelo |la inteligencia artificial )?(de )?(.+)$/);
    if (mIA && Config.get().perfiles.length && !/control de cambios|dictado|burbuja|modo voz/.test(n)) {
      const nombre = mIA[4].replace(/^(ia |la ia )/, "").replace(/ local$/, " local");
      const candidato = /local/.test(nombre) ? "local" : nombre;
      if (Config.get().perfiles.some(x => normalizar(x.nombre).includes(normalizar(candidato)) || x.proveedor === normalizar(candidato)) || ["local", "chatgpt", "gpt", "claude", "google", "gemini", "openai", "groq", "ollama", "openrouter", "deepseek", "mistral"].includes(normalizar(candidato))) {
        return () => cambiarIAPorVoz(candidato);
      }
    }
    if (/^(abre la burbuja|burbuja|burbuja flotante|ventana flotante|modo burbuja)$/.test(n)) return () => abrirBurbuja();

    // Ayuda
    if (/^(ayuda|que puedo decir|comandos|que puedes hacer)$/.test(n)) return () => abrirHoja("panelAyuda");
    return null;
  }

  /* ============ Punto de entrada de cualquier comando ============ */

  async function manejarComando(texto, origen) {
    texto = (texto || "").trim();
    if (!texto) return;
    let n = normalizar(texto);

    // Eco: el micrófono oyó a Romus por los parlantes (p. ej. «He añadido un párrafo…»). No es una orden.
    if ((origen === "voz" || origen === "voz-directa") && Voz.esEco(texto)) {
      $("transcripcion").textContent = ""; $("transcripcion").classList.remove("viva");
      return;
    }

    // Simulacro de sustentación: todo lo que dices es tu respuesta al jurado (sin «Ok Romus»).
    if (window.Jurado && Jurado.activo() && origen !== "boton") {
      agregarMensaje("usuario", texto);
      try { await Jurado.recibir(texto); } catch (e) { mostrarError(e); }
      return;
    }

    // Si al pulsar el micrófono igual dijo «Ok Romus, …», se quita el saludo.
    if (origen === "voz-directa" || origen === "texto") {
      const w = quitarPalabraActivacion(texto);
      if (w.desperto && w.resto) { texto = w.resto; n = normalizar(texto); }
    }

    // Palabra de activación: en escucha continua, Romus solo obedece después de «Ok Romus».
    if (origen === "voz" && Config.get().palabraActivacion && !estado.dictado) {
      const w = quitarPalabraActivacion(texto);
      const sonando = Voz.hablando || Voz.pausado || estado.lectura.activa;
      if (w.desperto) {
        despertar();
        if (!w.resto) return;              // solo dijo «Ok Romus»: queda escuchando
        texto = w.resto; n = normalizar(texto);
      } else if (!estado.conversacion && !(sonando && comandoControl(n))) {
        return;                            // no iba dirigido a Romus
      }
      if (/^(gracias|muchas gracias|adios|chao|hasta luego|eso es todo|a dormir|descansa|nada|nada mas)( romus)?$/.test(n)) {
        agregarMensaje("usuario", texto); dormir(true); return;
      }
      estado.despiertoHasta = Date.now() + 20000;
    }

    const control = comandoControl(n);
    if (control) { agregarMensaje("usuario", texto); control(); return; }

    // En manos libres, mientras se lee o se habla, solo se aceptan comandos de control (evita que el micrófono se oiga a sí mismo).
    if (origen === "voz" && (Config.get().manosLibres || estado.modoVoz || estado.burbuja) && (Voz.hablando || estado.lectura.activa)) return;

    // Modo dictado: lo que se diga se escribe en el documento.
    if (estado.dictado) { agregarMensaje("usuario", texto); await manejarDictado(texto, n); return; }

    if (estado.ocupado) { agregarMensaje("sistema", "Espera a que termine la tarea actual, o di «cancelar»."); return; }
    if (!estado.enWord) { agregarMensaje("error", "Abre este panel dentro de Word para trabajar con documentos."); return; }

    agregarMensaje("usuario", texto);
    textoOriginalActual = texto;
    const inv = window.Inv && Inv.comando(n, texto);
    if (inv) { await inv(); return; }
    const local = comandoLocal(n);
    try {
      if (local) { await local(); return; }
      await ejecutarConIA(texto);
    } catch (e) {
      mostrarError(e);
    } finally {
      if (estado.ocupado) ocupar(false);
    }
  }

  /* ============ Comandos con IA ============ */

  function describirSeleccion(sel, parrafos) {
    if (!sel) return "No hay información de selección.";
    if (sel.hay) {
      const corto = sel.texto.length > 1500 ? sel.texto.slice(0, 1500) + "…" : sel.texto;
      return `Selección actual: párrafos ${sel.ini} a ${sel.fin}. Texto seleccionado: «${corto}»`;
    }
    const p = parrafos[sel.ini];
    return `No hay texto seleccionado. El cursor está en el párrafo ${sel.ini}${p && p.texto.trim() ? "" : " (vacío)"}.`;
  }

  async function ejecutarConIA(comando) {
    ocupar(true, "Pensando…");
    detenerLectura(false);
    estado.abort = new AbortController();
    const burbuja = mostrarEscribiendo();
    let llamadas, mensajeUsuario;
    let parrafos, sel;
    try {
      [parrafos, sel] = await Promise.all([Doc.leerParrafos(), Doc.leerSeleccion()]);
      const documento = Doc.construirContexto(parrafos, sel);
      const estadoSeleccion = describirSeleccion(sel, parrafos);
      llamadas = await IA.interpretar({
        documento, estadoSeleccion, historial: estado.historial, comando, signal: estado.abort.signal
      });
      burbuja.remove();
      mensajeUsuario = `${estadoSeleccion}\n\nComando del usuario: «${comando}»`;
    } catch (e) {
      burbuja.remove();
      throw e;
    }

    const resumenes = [];
    let lecturaPendiente = null;
    for (const { nombre, datos } of llamadas) {
      const r = await ejecutarHerramienta(nombre, datos, sel);
      if (r && r.resumen) resumenes.push(r.resumen);
      if (window.Inv && nombre !== "investigacion" && nombre !== "leer_parrafos") Inv.registrar({ responder: "Consulta a la IA", corregir: "Corrección", aplicar_correcciones: "Corrección puntual", buscar_y_reemplazar: "Reemplazo", reescribir_parrafos: "Reescritura", insertar_texto: "Redacción de texto", comentar: "Comentarios", dar_formato: "Formato" }[nombre] || nombre, comando, "modelo");
      if (r && r.leer) lecturaPendiente = r.leer;
    }
    estado.historial.push({ role: "user", content: mensajeUsuario });
    estado.historial.push({ role: "assistant", content: resumenes.join("\n") || "Hecho." });
    if (estado.historial.length > 16) estado.historial = estado.historial.slice(-16);
    ocupar(false);
    if (lecturaPendiente) await leerRango(lecturaPendiente[0], lecturaPendiente[1]);
  }

  async function ejecutarHerramienta(nombre, d, sel) {
    switch (nombre) {
      case "investigacion": {
        const a = d.accion;
        if (a === "literatura") await Inv.literatura(d.tema || "");
        else if (a === "coherencia") await Inv.coherencia(estado.abort && estado.abort.signal);
        else if (a === "rubrica") await Inv.evaluarRubrica(estado.abort && estado.abort.signal);
        else if (a === "estructura") await Inv.insertarEstructura();
        else if (a === "idear") await Inv.idear(d.tema || "", estado.abort && estado.abort.signal);
        else if (a === "declaracion") await Inv.declaracion();
        else if (a === "guia") await Inv.preguntar(d.tema || comandoActual(), estado.abort && estado.abort.signal);
        else if (a === "spss" && window.Datos) await Datos.sintaxis(estado.abort && estado.abort.signal);
        else if (a === "resultados_apa" && window.Datos) Datos.resultadosAPA();
        else if (a === "atlas" && window.Datos) await Datos.libroCodigos(estado.abort && estado.abort.signal);
        else if (a === "resultados_cualitativos" && window.Datos) Datos.resultadosCualitativos();
        return { resumen: "Modo investigación: " + a + (d.tema ? " (" + d.tema + ")" : "") };
      }
      case "responder": {
        const m = agregarMensaje("ia", d.texto || "");
        if (window.Inv) m.appendChild(Inv.etiqueta("modelo"));
        hablar(d.texto);
        return { resumen: d.texto };
      }
      case "corregir": {
        const alcance = d.alcance === "seleccion" ? "seleccion" : "documento";
        const r = await corregirPorLotes({ alcance, modo: d.modo || "cambios", nivel: d.nivel || "ortografia", yaOcupado: true });
        return { resumen: r };
      }
      case "aplicar_correcciones": {
        const lista = d.correcciones || [];
        const { aplicadas, fallidas } = await Doc.aplicarCorrecciones(lista, "cambios");
        const msg = d.resumen && aplicadas ? d.resumen : `Apliqué ${aplicadas} ${aplicadas === 1 ? "cambio" : "cambios"}.`;
        confirmar(msg + (fallidas.length ? ` No pude ubicar ${fallidas.length}.` : ""));
        return { resumen: msg };
      }
      case "buscar_y_reemplazar": {
        const n = await Doc.buscarYReemplazar(d);
        const msg = n ? `Reemplacé ${n} ${n === 1 ? "aparición" : "apariciones"} de «${d.buscar}» por «${d.reemplazar}».` : `No encontré «${d.buscar}» en el documento.`;
        confirmar(msg);
        return { resumen: msg };
      }
      case "reescribir_parrafos": {
        await Doc.reescribirParrafos(d.parrafo_inicio, d.parrafo_fin, d.texto_nuevo || "");
        const msg = d.resumen || "Listo, reescribí el texto.";
        confirmar(msg + (Config.get().controlCambios ? " Puedes revisar el cambio en el documento." : ""));
        return { resumen: msg };
      }
      case "insertar_texto": {
        await Doc.insertarTexto(d);
        const msg = d.resumen || "Listo, agregué el texto.";
        confirmar(msg);
        return { resumen: msg };
      }
      case "comentar": {
        const { hechos, conComentarios } = await Doc.comentar(d.comentarios || []);
        const msg = d.resumen || (conComentarios ? `Agregué ${hechos} ${hechos === 1 ? "comentario" : "comentarios"}.` : `Resalté ${hechos} fragmentos (tu Word no permite comentarios desde complementos).`);
        confirmar(msg);
        return { resumen: msg };
      }
      case "dar_formato": {
        await Doc.darFormato(d);
        confirmar("Formato aplicado.");
        return { resumen: "Apliqué el formato pedido." };
      }
      case "leer_parrafos": {
        const fin = d.parrafo_fin == null ? d.parrafo_inicio : d.parrafo_fin;
        return { resumen: `Leí los párrafos ${d.parrafo_inicio} a ${fin}.`, leer: [d.parrafo_inicio, fin] };
      }
      default:
        return null;
    }
  }

  /* ============ Corrección por lotes ============ */

  async function corregirPorLotes({ alcance, modo, nivel, yaOcupado }) {
    if (!yaOcupado) ocupar(true, "Corrigiendo…");
    detenerLectura(false);
    if (!estado.abort) estado.abort = new AbortController();
    const signal = estado.abort.signal;

    const [parrafos, sel] = await Promise.all([Doc.leerParrafos(), Doc.leerSeleccion()]);
    let ini = 0, fin = parrafos.length - 1, etiqueta = "el documento";
    if (alcance === "seleccion" || (alcance === "auto" && sel.hay)) {
      if (sel.hay) { ini = sel.ini; fin = sel.fin; etiqueta = "la selección"; }
      else if (alcance === "seleccion") { ini = fin = sel.ini; etiqueta = "el párrafo actual"; }
    } else if (alcance === "parrafo") {
      ini = sel.ini; fin = sel.hay ? sel.fin : sel.ini; etiqueta = "el párrafo";
    }

    const objetivo = parrafos.slice(ini, fin + 1).filter(p => p.texto.trim());
    if (!objetivo.length) { confirmar("No hay texto para revisar ahí."); return "Sin texto."; }

    // Lotes de ~6.000 caracteres
    const lotes = [];
    let actual = [], tam = 0;
    for (const p of objetivo) {
      const l = p.texto.length + 8;
      if (tam + l > 6000 && actual.length) { lotes.push(actual); actual = []; tam = 0; }
      actual.push(p); tam += l;
    }
    if (actual.length) lotes.push(actual);

    const accion = modo === "comentarios" ? "Revisando" : "Corrigiendo";
    agregarMensaje("sistema", `${accion} ${etiqueta} (${objetivo.length} párrafos${lotes.length > 1 ? ", " + lotes.length + " partes" : ""})…`);

    let total = 0;
    const noUbicadas = [];
    const detalle = [];
    for (let k = 0; k < lotes.length; k++) {
      if (signal.aborted) break;
      mostrarProgreso(`${accion} ${etiqueta}… parte ${k + 1} de ${lotes.length}`, lotes.length > 1 ? k / lotes.length : null);
      const texto = lotes[k].map(p => `[${p.i}] ${p.texto}`).join("\n");
      const indices = new Set(lotes[k].map(p => p.i));
      const correcciones = (await IA.revisarLote({ textoLote: texto, nivel, signal })).filter(c => indices.has(c.parrafo));
      if (correcciones.length) {
        const r = await Doc.aplicarCorrecciones(correcciones, modo);
        total += r.aplicadas;
        noUbicadas.push(...r.fallidas);
        correcciones.filter(c => !r.fallidas.includes(c)).forEach(c => detalle.push(`«${c.original}» → «${c.correccion}» (${c.motivo})`));
      }
    }
    mostrarProgreso("Terminado", 1);

    let msg;
    if (total === 0) msg = `No encontré errores en ${etiqueta}.`;
    else if (modo === "comentarios") msg = `Dejé ${total} ${total === 1 ? "comentario" : "comentarios"} en ${etiqueta}.`;
    else msg = `Hice ${total} ${total === 1 ? "corrección" : "correcciones"} en ${etiqueta}` + (Config.get().controlCambios && Doc.soporta("1.4") ? ", marcadas con control de cambios." : ".");
    if (noUbicadas.length) msg += ` ${noUbicadas.length} no las pude ubicar en el texto.`;
    if (signal.aborted) msg = "Revisión cancelada. " + msg;

    let extra = null;
    if (detalle.length || noUbicadas.length) {
      extra = document.createElement("details");
      const s = document.createElement("summary");
      s.textContent = "Ver detalle";
      extra.appendChild(s);
      const cuerpo = document.createElement("div");
      cuerpo.textContent = detalle.concat(noUbicadas.map(c => `Sin ubicar: «${c.original}» → «${c.correccion}»`)).join("\n");
      extra.appendChild(cuerpo);
    }
    agregarMensaje("accion", msg, extra);
    hablar(msg);
    if (!yaOcupado) ocupar(false);
    return msg;
  }

  /* ============ Subtítulos con resaltado de palabra ============ */

  function mostrarSubtitulo(texto, quien) {
    const destinos = [$("lectorTexto"), $("mvSubtitulo")];
    const partes = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(texto))) partes.push({ ini: m.index, fin: m.index + m[0].length, t: m[0] });
    estado.subtitulo = partes;
    destinos.forEach(d => {
      if (!d) return;
      d.innerHTML = "";
      d.classList.toggle("de-usuario", quien === "usuario");
      partes.forEach((p, k) => {
        const sp = document.createElement("span");
        sp.textContent = p.t;
        sp.dataset.k = k;
        d.appendChild(sp);
        d.appendChild(document.createTextNode(" "));
      });
    });
    if (estado.burbuja) enviarBurbuja({ tipo: "subtitulo", texto, quien: quien || "ia" });
  }

  function resaltarPalabra(charIndex) {
    const partes = estado.subtitulo || [];
    const k = partes.findIndex(p => charIndex >= p.ini && charIndex < p.fin + 1);
    if (k < 0) return;
    [$("lectorTexto"), $("mvSubtitulo")].forEach(d => {
      if (!d) return;
      d.querySelectorAll("span").forEach(sp => {
        const i = +sp.dataset.k;
        sp.className = i < k ? "leida" : i === k ? "actual" : "";
      });
    });
    if (estado.burbuja) enviarBurbuja({ tipo: "palabra", k });
  }

  function ganchosSubtitulo() {
    return { trozo: (t) => mostrarSubtitulo(t), palabra: (ci) => resaltarPalabra(ci) };
  }

  /* ============ Estado visual del orbe (panel y burbuja) ============ */

  function estadoActualOrbe() {
    if (estado.ocupado) return ["pensando", "Pensando…"];
    if (Voz.hablando && !Voz.pausado) {
      if (estado.lectura.activa) {
        const L = estado.lectura;
        const conTexto = L.parrafos.filter((p, k) => k <= L.fin && p.texto.trim());
        const pos = conTexto.findIndex(p => p.i === L.indice) + 1;
        return ["hablando", `Leyendo párrafo ${pos} de ${conTexto.length}`];
      }
      return ["hablando", "Hablando…"];
    }
    if (Voz.pausado) return ["reposo", "En pausa · di «continúa»"];
    if (estado.dictado) return ["escuchando", "Dictando · di «termina dictado»"];
    if (esperandoPalabra()) return ["reposo", "Di «Ok Romus»"];
    if (Voz.escuchando || estado.burbujaEscuchando) return ["escuchando", "Te escucho…"];
    return ["reposo", Voz.soportaReconocimiento() ? "Micrófono en pausa" : "Escribe tu orden o usa Windows + H"];
  }

  function sincronizarOrbe() {
    const [e, etiqueta] = estadoActualOrbe();
    if (estado.orbe) estado.orbe.estado(e);
    if (estado.orbePanel) estado.orbePanel.estado(e);
    const nuc = document.querySelector(".nucleo"); if (nuc) nuc.dataset.estado = e;
    if ($("modoVoz")) $("modoVoz").dataset.estado = e;
    if ($("mvEstado")) $("mvEstado").textContent = etiqueta;
    if ($("mvPausa")) $("mvPausa").classList.toggle("oculto", !(Voz.hablando || Voz.pausado));
    const clave = e + "|" + etiqueta;
    if (estado.burbuja && clave !== estado.ultimoEstadoOrbe) enviarBurbuja({ tipo: "estado", estado: e, etiqueta });
    estado.ultimoEstadoOrbe = clave;
  }

  /* ============ Modo voz (pantalla completa con el orbe) ============ */

  async function abrirModoVoz() {
    if (estado.modoVoz) return;
    estado.modoVoz = true;
    $("modoVoz").classList.remove("oculto");
    if (estado.orbePanel) { estado.orbePanel.detener(); estado.orbePanel = null; } // una sola animación a la vez
    aplicarApariencia(Config.get().apariencia, true);
    mostrarSubtitulo(Config.get().palabraActivacion && (Config.get().manosLibres || true) ? "Hola, soy Romus. Di «Ok Romus» y lo que necesitas: «Ok Romus, lee el documento»." : "Hola, soy Romus. ¿Qué necesitas?");
    sincronizarOrbe();
    // Nivel del micrófono para animar la esfera (si el navegador lo permite).
    estado.detenerMedidor = await Orbe.medirMicrofono((v) => {
      if (estado.orbe && !Voz.hablando) estado.orbe.nivel(Math.max(v, estado.nivelSintetico));
    });
    if (!estado.burbuja && Voz.soportaReconocimiento() && !Voz.escuchando) empezarEscucha();
    estado.relojOrbe = setInterval(() => {
      estado.nivelSintetico *= 0.8;
      if (estado.orbe && !Voz.hablando) estado.orbe.nivel(estado.nivelSintetico);
      sincronizarOrbe();
    }, 200);
  }

  function crearOrbePanel() {
    if (estado.orbePanel) estado.orbePanel.detener();
    estado.orbePanel = crearOrbe($("orbePanel"));
    estado.ultimoEstadoOrbe = "";
    sincronizarOrbe();
  }

  function aplicarApariencia(ap, forzar) {
    $("modoVoz").classList.add("noche");
    $("mvMarca").textContent = "Romus";
    if (estado.modoVoz && (forzar || !estado.orbe)) {
      if (estado.orbe) estado.orbe.detener();
      estado.orbe = crearOrbe($("orbe"));
      sincronizarOrbe();
    }
    return "romus";
  }

  function cerrarModoVoz() {
    if (!estado.modoVoz) return;
    estado.modoVoz = false;
    $("modoVoz").classList.add("oculto");
    crearOrbePanel();
    clearInterval(estado.relojOrbe);
    if (estado.detenerMedidor) { estado.detenerMedidor(); estado.detenerMedidor = null; }
    if (estado.orbe) { estado.orbe.detener(); estado.orbe = null; } // no gastar batería con el modo voz cerrado
    if (Voz.escuchando && !Config.get().manosLibres) Voz.detenerEscucha(false);
  }

  function tocarOrbe() {
    // Clic en la esfera: si está hablando, lo interrumpe; si no, equivale a decir «Ok Romus».
    if (Voz.hablando || Voz.pausado) { detenerLectura(false); Voz.callar(); }
    if (!Voz.escuchando && !estado.burbuja) empezarEscucha();
    despertar();
  }

  /* ============ Burbuja flotante (ventana de diálogo de Office) ============ */

  function enviarBurbuja(obj) {
    const d = estado.burbuja;
    if (!d || typeof d.messageChild !== "function") return;
    try { d.messageChild(JSON.stringify(obj)); } catch (e) { /* la burbuja se cerró */ }
  }

  function abrirBurbuja() {
    if (!estado.enWord || !Office.context.ui || !Office.context.ui.displayDialogAsync) {
      agregarMensaje("sistema", "Tu versión de Word no permite ventanas flotantes. Usa el modo voz del panel.");
      return;
    }
    if (estado.burbuja) { agregarMensaje("sistema", "La burbuja ya está abierta."); return; }
    const url = location.href.replace(/taskpane\.html.*$/, "burbuja.html");
    Office.context.ui.displayDialogAsync(url, { height: 50, width: 18, displayInIframe: false, promptBeforeOpen: false }, (res) => {
      if (res.status !== Office.AsyncResultStatus.Succeeded) {
        agregarMensaje("error", "No pude abrir la burbuja: " + (res.error && res.error.message));
        return;
      }
      const d = res.value;
      estado.burbuja = d;
      if (Voz.escuchando) Voz.detenerEscucha(false); // la burbuja se encarga de escuchar
      d.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        let m;
        try { m = JSON.parse(arg.message); } catch (e) { return; }
        if (m.tipo === "lista") {
          enviarBurbuja({ tipo: "config", idioma: Config.get().idioma, tema: temaEfectivo(), bidireccional: true });
          estado.ultimoEstadoOrbe = "";
          sincronizarOrbe();
        } else if (m.tipo === "comando") {
          if (Voz.pausado && !comandoControl(normalizar(m.texto))) detenerLectura(false);
          manejarComando(m.texto, m.origen || "voz");
        } else if (m.tipo === "despertar") {
          if (Voz.hablando || Voz.pausado) { detenerLectura(false); Voz.callar(); }
          despertar();
        } else if (m.tipo === "tema") {
          cambiarTema(temaEfectivo() === "oscuro" ? "claro" : "oscuro");
        } else if (m.tipo === "interrumpir") {
          detenerLectura(false); Voz.callar(); sincronizarOrbe();
        } else if (m.tipo === "escuchando") {
          estado.burbujaEscuchando = !!m.valor; sincronizarOrbe();
        } else if (m.tipo === "cerrar") {
          try { d.close(); } catch (e) { /* ya cerrada */ }
          alCerrarBurbuja();
        }
      });
      d.addEventHandler(Office.EventType.DialogEventReceived, alCerrarBurbuja);
      agregarMensaje("sistema", "Burbuja abierta. Puedes moverla a cualquier parte de la pantalla; este panel debe seguir abierto.");
    });
  }

  function alCerrarBurbuja() {
    estado.burbuja = null;
    estado.burbujaEscuchando = false;
    sincronizarOrbe();
  }

  /* ============ Modo dictado ============ */

  function activarDictado(si) {
    estado.dictado = si;
    $("avisoModoDictado").classList.toggle("oculto", !si);
    if (si) {
      agregarMensaje("sistema", "Modo dictado activo: lo que digas se escribirá donde está el cursor. Di «punto», «coma», «nuevo párrafo»… y «termina dictado» para salir.");
      if (!Voz.escuchando && !estado.burbuja && Voz.soportaReconocimiento()) {
        const previo = Config.get().manosLibres;
        Config.set({ manosLibres: true }); $("chkManosLibres").checked = true;
        estado.dictadoActivoManos = !previo;
        empezarEscucha();
      }
    } else {
      agregarMensaje("sistema", "Modo dictado terminado.");
      if (estado.dictadoActivoManos) {
        Config.set({ manosLibres: false }); $("chkManosLibres").checked = false;
        if (Voz.escuchando && !estado.modoVoz) Voz.detenerEscucha(false);
        estado.dictadoActivoManos = false;
      }
    }
    sincronizarOrbe();
  }

  const PUNTUACION = [
    ["punto y aparte|nuevo p[aá]rrafo|nueva l[ií]nea|siguiente p[aá]rrafo", "\n"],
    ["puntos suspensivos", "…"], ["punto y coma", ";"], ["punto y seguido", "."], ["dos puntos", ":"],
    ["punto", "."], ["coma", ","],
    ["abre(?:r)? (?:signo de )?(?:interrogaci[oó]n|pregunta)", "¿"], ["cierra(?:r)? (?:signo de )?(?:interrogaci[oó]n|pregunta)|signo de (?:interrogaci[oó]n|pregunta)", "?"],
    ["abre(?:r)? (?:signo de )?exclamaci[oó]n", "¡"], ["cierra(?:r)? (?:signo de )?exclamaci[oó]n|signo de exclamaci[oó]n", "!"],
    ["abre(?:r)? comillas", "«"], ["cierra(?:r)? comillas", "»"],
    ["abre(?:r)? par[eé]ntesis", "("], ["cierra(?:r)? par[eé]ntesis", ")"],
    ["guion", "-"]
  ];

  function formatearDictado(texto, previo) {
    let t = " " + texto.trim() + " ";
    for (const [pat, sim] of PUNTUACION) {
      t = t.replace(new RegExp(`(\\s)(?:${pat})(?=[\\s.,;:!?]|$)`, "gi"), `$1${sim}`);
    }
    t = t.replace(/[ \t]+/g, " ")
      .replace(/\s+([.,;:!?»)…])/g, "$1")
      .replace(/([¿¡«(])\s+/g, "$1")
      .replace(/ *\n */g, "\n")
      .trim();
    // mayúsculas al comenzar oración
    const inicioOracion = !previo.trim() || /[.!?…]\s*$/.test(previo) || /\n$/.test(previo);
    t = t.replace(/([.!?…]\s+|\n|^)([¿¡«(]?)(\p{Ll})/gu, (m, a, b, c, pos) => (pos === 0 && !inicioOracion) ? m : a + b + c.toUpperCase());
    // espacio con lo anterior
    if (previo && !/\s$/.test(previo) && !/^[.,;:!?»)…\n]/.test(t)) t = " " + t;
    return t;
  }

  async function manejarDictado(texto, n) {
    if (/^(termina|terminar|finaliza|finalizar|desactiva|salir del|sal del|deja de|fin del|para el|detener el) ?(el )?dictado$|^(listo|termine|ya termine)$/.test(n)) { activarDictado(false); return; }
    try {
      if (/^(borra eso|borra lo ultimo|borrar eso|deshaz eso|quita eso)$/.test(n)) {
        const ok = await Doc.borrarUltimo(estado.ultimoDictado.trim());
        agregarMensaje("sistema", ok ? "Borré lo último que dictaste." : "No encontré lo último dictado para borrarlo.");
        estado.ultimoDictado = "";
        return;
      }
      const previo = await Doc.textoAntesDelCursor();
      const f = formatearDictado(texto, previo);
      if (!f.trim()) return;
      await Doc.insertarDictado(f);
      estado.ultimoDictado = f;
      agregarMensaje("accion", "Escrito: " + f.trim());
    } catch (e) { mostrarError(e); }
  }

  /* ============ Micrófono ============ */

  const esMac = /Mac/i.test(navigator.platform || navigator.userAgent);
  const atajoDictado = esMac ? "<kbd>Fn</kbd> <kbd>Fn</kbd>" : "<kbd>Windows</kbd> + <kbd>H</kbd>";

  function pistaSinMicrofono(motivo) {
    $("pistaDictado").innerHTML = `${motivo ? motivo + " " : ""}Haz clic en la caja y usa ${atajoDictado} para dictar.`;
  }

  function actualizarBotonMic(escuchando) {
    $("btnMic").classList.toggle("escuchando", escuchando);
    $("btnMicMini").classList.toggle("escuchando", escuchando);
    $("micEtiqueta").textContent = !escuchando ? "Pulsa para hablar"
      : esperandoPalabra() ? "Di «Ok Romus»"
      : "Te escucho…";
    const txt = $("btnMic").querySelector(".mic-txt");
    if (txt) txt.textContent = !escuchando ? "Hablar" : esperandoPalabra() ? "Atento" : "Escuchando";
    $("btnMic").classList.toggle("en-espera", escuchando && esperandoPalabra());
    if (!escuchando) $("transcripcion").classList.remove("viva");
    sincronizarOrbe();
  }

  async function empezarEscucha() {
    if (!Voz.soportaReconocimiento()) {
      $("txtComando").focus();
      pistaSinMicrofono("El micrófono integrado no está disponible en este Word.");
      if (window.Escucha && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !Escucha.perfilTranscripcion()) { ofrecerOido(); return; }
      agregarMensaje("sistema", `Este Word no permite el micrófono dentro del panel. Haz clic en la caja de texto y pulsa ${esMac ? "Fn dos veces" : "Windows + H"} para dictar.`);
      return;
    }
    // Pulsar el micrófono mientras habla lo pausa; la escucha continua no lo interrumpe.
    if (!(Config.get().manosLibres || estado.modoVoz) && Voz.hablando && !Voz.pausado) Voz.pausar();
    const permitido = await Voz.asegurarMicrofono();
    if (!permitido) {
      manejarErrorMic("not-allowed");
      return;
    }
    const continuoAhora = !!(Config.get().manosLibres || estado.modoVoz);
    if (!continuoAhora) { estado.conversacion = true; estado.despiertoHasta = Date.now() + 20000; } // pulsar el micrófono equivale a llamar a Romus
    try {
      Voz.iniciar({
        idioma: Config.get().idioma,
        continuo: continuoAhora,
        parcial: (t) => {
          if (t === "" ) { $("transcripcion").classList.remove("viva"); return; }
          if (t === "…" || t === "(transcribiendo…)") { // oído propio: aviso de que oyó algo
            $("transcripcion").textContent = t === "…" ? "Te oigo…" : "Entendiendo…"; $("transcripcion").classList.add("viva");
            return;
          }
          const dirigido = !esperandoPalabra() || RE_ACTIVACION.test(t) || (window.Jurado && Jurado.activo());
          if (!dirigido) return; // no se muestra lo que no va dirigido a Romus
          $("transcripcion").textContent = t; $("transcripcion").classList.add("viva");
          estado.nivelSintetico = 0.75;
          if (estado.modoVoz && !Voz.hablando) mostrarSubtitulo(t.replace(RE_ACTIVACION, ""), "usuario");
        },
        final: (t) => {
          $("transcripcion").textContent = "«" + t + "»";
          $("transcripcion").classList.remove("viva");
          const n = normalizar(t);
          // Si la lectura estaba pausada por pulsar el micrófono y el comando no es de control, se detiene.
          if (Voz.pausado && !comandoControl(n) && !esperandoPalabra()) detenerLectura(false);
          manejarComando(t, continuoAhora ? "voz" : "voz-directa");
        },
        error: manejarErrorMic,
        estado: actualizarBotonMic,
        nivel: (v) => { if (v > estado.nivelSintetico) estado.nivelSintetico = v; }
      });
    } catch (e) {
      manejarErrorMic("no-soportado");
    }
  }

  /* Tarjeta «Darle oído a Romus»: conecta una IA que entienda audio sin cambiar la que escribe. */
  function ofrecerOido() {
    const viejo = document.querySelector("#conversacion .tarjeta-oido");
    if (viejo) { viejo.scrollIntoView({ block: "center", behavior: "smooth" }); viejo.classList.remove("destello"); void viejo.offsetWidth; viejo.classList.add("destello"); return; }
    const c = Config.get();
    const activo = c.perfiles.find(x => x.id === c.perfilActivo && (x.apiKey || "").trim());
    const t = document.createElement("div");
    t.className = "tarjeta-oido";
    const quien = activo && !["gemini", "openai", "groq"].includes(activo.proveedor)
      ? `<p>${escaparHTML(activo.nombre)} escribe muy bien, pero no entiende audio. Agrega un oído gratis con Google Gemini: ${escaparHTML(activo.nombre)} seguirá escribiendo y Gemini solo transcribirá lo que dices.</p>`
      : activo ? `<p>Conecta un oído gratis con Google Gemini (también sirve una clave de OpenAI o Groq).</p>`
      : `<p>Aún no hay ninguna IA conectada. Con una clave gratis de Google Gemini, Romus te oye y además escribe, corrige y te asesora.</p>`;
    t.innerHTML = `<b>Para que Romus te oiga en Word de escritorio</b>${quien}
      <ol><li><button type="button" class="enlace oido-abrir">Abre aistudio.google.com ↗</button>, entra con tu cuenta de Google y pulsa «Create API key».</li><li>Copia la clave y pégala aquí:</li></ol>
      <div class="bv-fila"><input class="ajuste oido-clave" placeholder="AIza… o AQ.…" spellcheck="false" autocomplete="off"><button type="button" class="boton primario oido-conectar">Conectar oído</button></div>
      <small class="oido-nota"></small>
      <small class="oido-alt">Mientras tanto puedes dictar: haz clic en la caja de abajo y pulsa ${esMac ? "Fn dos veces" : "Windows + H"}.</small>`;
    const inp = t.querySelector(".oido-clave"), nota = t.querySelector(".oido-nota");
    t.querySelector(".oido-abrir").addEventListener("click", () => Conexion.abrirEnlace("https://aistudio.google.com/apikey"));
    const conectar = async () => {
      const v = inp.value.trim();
      if (!v) { nota.textContent = "Pega primero la clave."; return; }
      nota.textContent = "Probando la clave…"; nota.className = "oido-nota";
      const r = await Conexion.conectarOido(v);
      nota.textContent = r.mensaje; nota.className = "oido-nota " + (r.ok ? "ok-nota" : "error-nota");
      if (!r.ok) return;
      inp.value = ""; t.classList.add("lista");
      pintarNotaMotor(); pintarPerfiles();
      hablar("Listo, ya te oigo.");
      setTimeout(() => { if (!Voz.escuchando) empezarEscucha(); }, 1200);
    };
    t.querySelector(".oido-conectar").addEventListener("click", conectar);
    inp.addEventListener("paste", () => setTimeout(() => { if (Conexion.reconocer(inp.value)) conectar(); }, 30));
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") conectar(); });
    agregarMensaje("sistema", "Todavía no te puedo oír.", t);
    (async () => { const r = await Conexion.claveEnPortapapeles(); if (r && ["gemini", "openai", "groq"].includes(r.proveedor) && !inp.value) { inp.value = r.clave; nota.textContent = `Encontré una clave de ${r.nombre} que copiaste. Pulsa «Conectar oído».`; } })();
  }

  let ultimoAvisoTranscripcion = 0;
  function manejarErrorMic(codigo) {
    // Errores pasajeros del oído propio: se avisa sin apagar el micrófono.
    if (["transcripcion", "cuota"].includes(codigo) && Voz.escuchando) {
      const m = codigo === "cuota"
        ? "La IA que transcribe tu voz llegó a su límite por minuto. Espera un momento y repite."
        : "No pude transcribir esa frase. Repite, por favor.";
      $("transcripcion").textContent = m; $("transcripcion").classList.remove("viva");
      if (Date.now() - ultimoAvisoTranscripcion > 60000) { ultimoAvisoTranscripcion = Date.now(); agregarMensaje("sistema", m); }
      return;
    }
    actualizarBotonMic(false);
    const mensajes = {
      "not-allowed": "No tengo permiso para usar el micrófono.",
      "service-not-allowed": "El reconocimiento de voz no está disponible dentro de este Word.",
      "network": "El reconocimiento de voz del panel no está disponible aquí (necesita un servicio que Word de escritorio no ofrece).",
      "audio-capture": "No se detectó ningún micrófono.",
      "no-speech": "No te escuché. Vuelve a intentarlo.",
      "no-soportado": "El micrófono integrado no está disponible en este Word.",
      "sin-transcriptor": "Este Word no trae reconocimiento de voz. Para que Romus te oiga, conecta en Ajustes una IA que entienda audio: Google Gemini (gratis), OpenAI o Groq.",
      "clave": "La clave de la IA que transcribe tu voz no es válida. Revísala en Ajustes.",
      "transcripcion": "No pude transcribir tu voz con la IA.",
      "cuota": "La IA que transcribe tu voz llegó a su límite de uso."
    };
    const m = mensajes[codigo] || ("Error del micrófono: " + codigo);
    if (codigo === "no-speech") { $("transcripcion").textContent = m; return; }
    if (codigo === "sin-transcriptor" || codigo === "network" || codigo === "service-not-allowed") {
      if (window.Escucha && navigator.mediaDevices && !Escucha.perfilTranscripcion()) {
        ofrecerOido(); pistaSinMicrofono("");
        if (Config.get().manosLibres) { $("chkManosLibres").checked = false; Config.set({ manosLibres: false }); }
        return;
      }
    }
    agregarMensaje("sistema", `${m} Alternativa: haz clic en la caja de texto y pulsa ${esMac ? "Fn dos veces" : "Windows + H"} para dictar con el sistema.`);
    pistaSinMicrofono("");
    if (codigo === "sin-transcriptor") { pistaSinMicrofono(""); return; }
    if (Config.get().manosLibres) { $("chkManosLibres").checked = false; Config.set({ manosLibres: false }); }
  }

  function alternarMic() {
    if (Voz.escuchando) Voz.detenerEscucha(false);
    else empezarEscucha();
  }

  /* ============ Caja de texto (incluye dictado del sistema) ============ */

  function ajustarAltura() {
    const t = $("txtComando");
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 120) + "px";
    $("btnEnviar").disabled = !t.value.trim();
  }

  function enviarCaja() {
    clearTimeout(estado.temporizadorDictado);
    $("avisoDictado").classList.add("oculto");
    const t = $("txtComando");
    const v = t.value;
    t.value = "";
    ajustarAltura();
    manejarComando(v, "texto");
  }

  function alEscribir() {
    ajustarAltura();
    clearTimeout(estado.temporizadorDictado);
    $("avisoDictado").classList.add("oculto");
    // Texto que llega sin pulsar teclas = dictado del sistema (Windows + H / Fn Fn): se envía solo tras una pausa.
    const sinTeclado = Date.now() - estado.ultimaTecla > 1200;
    if (Config.get().autoenviarDictado && sinTeclado && $("txtComando").value.trim()) {
      $("avisoDictado").textContent = "Dictado detectado: se enviará al terminar de hablar…";
      $("avisoDictado").classList.remove("oculto");
      estado.temporizadorDictado = setTimeout(enviarCaja, 2800);
    }
  }

  /* ============ Hojas: ajustes y ayuda ============ */

  function abrirHoja(id) { $(id).classList.remove("oculto"); if (id === "panelAjustes") { pintarNotaMotor(); pintarNotaCinta(); } }
  /** Diagnóstico de la cinta: qué motor usa Word y qué pasó con el último botón. */
  function pintarNotaCinta() {
    const n = $("notaCinta"); if (!n) return;
    const hace = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? `hace ${s} s` : s < 3600 ? `hace ${Math.round(s / 60)} min` : "hace más de una hora"; };
    let u = null, rec = 0;
    try { u = JSON.parse(localStorage.getItem("romus.cinta.ultimo") || "null"); rec = +localStorage.getItem("romus.cinta.recogido") || 0; } catch (e) { /* sin almacenamiento */ }
    const modo = u && u.clasica ? "la cinta clásica: cada botón abre este panel directamente en su función"
      : runtimeCompartido() ? "motor compartido (Microsoft 365): los botones actúan directo en este panel"
      : "motor separado (Office 2016/2019): cada botón deja la orden y este panel la ejecuta";
    let t = `Tu Word usa ${modo}.`;
    const nom = (k) => NOMBRE_CINTA[k] || ((window.Herramientas && Herramientas.porId(k.charAt(0).toLowerCase() + k.slice(1))) || {}).nombre || k.replace(/^(Nivel|Enfoque|Etapa)/, "$1 ");
    if (u && u.clasica) t += ` Último botón: «${escaparHTML(nom(u.clave))}» ${hace(u.t)}.`;
    else if (!runtimeCompartido()) t += u ? ` Último botón recibido: «${escaparHTML(NOMBRE_CINTA[u.clave] || ((window.Herramientas && Herramientas.porId(u.clave.charAt(0).toLowerCase() + u.clave.slice(1))) || {}).nombre || u.clave)}» ${hace(u.t)}${rec >= u.t ? ", y el panel lo ejecutó." : ", pero el panel no lo recogió. Instala la cinta clásica: ejecuta de nuevo el instalador y deja marcada «Cinta para Office 2016, 2019 o 2021»."}` : " Aún no ha llegado ningún clic de la cinta a este equipo: si pulsas un botón y no aparece aquí, Word no está cargando la versión nueva de Romus (vuelve a ejecutar el instalador y marca «Limpiar la caché»).";
    n.innerHTML = t;
  }
  function cerrarHoja(id) { $(id).classList.add("oculto"); }

  function pintarNotaMotor() {
    const nota = $("notaMotorVoz");
    if (!nota) return;
    const p = window.Escucha && Escucha.perfilTranscripcion();
    const motor = Voz.motor;
    let t;
    if (motor === "ia") t = `Ahora te oye el oído de Romus: cada frase se transcribe con <b>${p ? p.nombre : "tu IA"}</b> (usa un poco de su cuota).`;
    else if (motor === "navegador") t = "Ahora usa el reconocimiento integrado. Si en Word de escritorio no funciona, Romus cambia solo a su propio oído.";
    else t = "No hay reconocimiento disponible. Conecta Gemini (gratis), OpenAI o Groq para que Romus te oiga en Word de escritorio.";
    if (!p) t += " Para el oído de Romus hace falta una IA que entienda audio: Gemini, OpenAI o Groq.";
    nota.innerHTML = t;
  }

  function llenarAjustes() {
    const c = Config.get();
    $("selProveedor").innerHTML = Config.PROVEEDORES.map(p => `<option value="${p.id}">${p.nombre}</option>`).join("");
    pintarPerfiles();
    $("selIdioma").innerHTML = Config.IDIOMAS.map(i => `<option value="${i.id}">${i.nombre}</option>`).join("");
    $("selIdioma").value = c.idioma;
    $("chkLeerRespuestas").checked = c.leerRespuestas;
    $("chkControlCambios").checked = c.controlCambios;
    $("chkAutoenviar").checked = c.autoenviarDictado;
    $("chkManosLibres").checked = c.manosLibres;
    $("chkPalabraActivacion").checked = c.palabraActivacion;
    $("selMotorVoz").value = c.motorVoz || "auto";
    $("selTema").value = c.tema || "auto";
    $("selModoAyuda").value = c.modoAyuda || "tutor";
    $("inpCodigoPro").value = c.codigoPro || "";
    if (window.Asesor && Asesor.esPro()) $("notaPro").textContent = "✓ Romus Pro activado: proyectos ilimitados.";
    $("selEstiloRespuesta").value = c.estiloRespuesta || "natural";
    $("txtInstrucciones").value = c.instrucciones || "";
    pintarNotaMotor();
    Voz.setPausa(c.pausa == null ? 250 : c.pausa);
    cambiarVelocidad(c.velocidad || 1, true);
    cambiarTono(c.tono || 1, true);
    pintarEstilos();
    $("modoVoz").classList.add("noche");
    $("mvMarca").textContent = "Romus";
    llenarVoces();
  }

  function llenarVoces() {
    const c = Config.get();
    const base = c.idioma.slice(0, 2);
    const sel = $("selVoz");
    const orden = (a, b) => {
      const na = /natural|neural|online/i.test(a.name) ? 0 : 1, nb = /natural|neural|online/i.test(b.name) ? 0 : 1;
      const la = a.lang === c.idioma ? 0 : 1, lb = b.lang === c.idioma ? 0 : 1;
      return la - lb || na - nb || a.name.localeCompare(b.name);
    };
    const propias = vocesDelIdioma().sort(orden);
    const otras = Voz.voces.filter(v => !propias.includes(v)).sort(orden);
    if (!Voz.voces.length) {
      sel.innerHTML = '<option value="">Voz predeterminada del sistema</option>';
    } else {
      const op = v => `<option value="${v.voiceURI.replace(/"/g, "&quot;")}">${Voz.etiquetaVoz(v)}</option>`;
      sel.innerHTML = `<option value="">Automática (mejor voz en ${base.toUpperCase()})</option>` +
        (propias.length ? `<optgroup label="Voces en tu idioma (${propias.length})">${propias.map(op).join("")}</optgroup>` : "") +
        (otras.length ? `<optgroup label="Otros idiomas">${otras.map(op).join("")}</optgroup>` : "");
    }
    sel.value = c.vozURI || "";
    if (sel.value !== (c.vozURI || "")) sel.value = "";
    Voz.elegirVoz(c.vozURI, c.idioma);
    $("notaVoz").textContent = propias.length > 1
      ? `Tienes ${propias.length} voces en tu idioma. Las marcadas con ✦ son voces naturales. Los cambios se aplican al instante, incluso mientras lee.`
      : "Tu equipo tiene pocas voces en este idioma. En Windows puedes instalar más en Configuración › Hora e idioma › Voz. Los cambios se aplican al instante.";
    actualizarResumenVoz();
  }

  /* ============ Perfiles de IA ============ */

  function escaparHTML(t) { return String(t).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])); }

  function pintarPerfiles() {
    const c = Config.get();
    $("selPerfil").innerHTML = c.perfiles.map(p => `<option value="${p.id}">${escaparHTML(p.nombre)} · ${escaparHTML(p.modelo || "sin modelo")}</option>`).join("");
    $("selPerfil").value = c.perfilActivo;
    const p = Config.perfil();
    const prov = Config.proveedorDe(p);
    $("selProveedor").value = prov.id;
    $("inpNombrePerfil").value = p.nombre;
    $("inpUrl").value = p.url;
    $("inpClave").value = p.apiKey || "";
    $("inpModelo").value = p.modelo || "";
    $("chkModoBasico").checked = !!p.modoBasico;
    $("campoClave").classList.toggle("oculto", !prov.clave);
    $("enlaceClave").href = prov.enlaceClave || "#";
    $("enlaceClave").classList.toggle("oculto", !prov.enlaceClave);
    $("enlaceClave").textContent = prov.clave ? "Obtener una clave" : "Descargar";
    $("notaProveedor").textContent = prov.nota || "";
    $("listaModelos").innerHTML = (p.modelosCargados || prov.modelos).map(m => `<option value="${escaparHTML(m)}"></option>`).join("");
    if (p.modelosCargados) pintarSelectorModelos(p.modelosCargados); else $("selModelosCargados").classList.add("oculto");
    $("notaModelos").textContent = p.modelosCargados ? `${p.modelosCargados.length} modelos disponibles.` : "Los nombres de modelo cambian con el tiempo: usa «Cargar modelos» para ver los actuales.";
    $("btnEliminarPerfil").disabled = c.perfiles.length < 2;
    $("resultadoPrueba").textContent = "";
    actualizarChipIA();
  }

  // Lista desplegable con los modelos que devolvió el proveedor (más fiable que el autocompletado dentro de Word).
  function pintarSelectorModelos(lista) {
    const sel = $("selModelosCargados");
    if (!lista || !lista.length) { sel.classList.add("oculto"); return; }
    const utiles = lista.filter(m => !/embed|tts|image|imagen|audio|live|vision|whisper|moderation|dall|veo|aqa|learnlm/i.test(m));
    sel.innerHTML = '<option value="">— Elige un modelo de la lista —</option>' + utiles.map(m => `<option value="${escaparHTML(m)}">${escaparHTML(m)}</option>`).join("");
    sel.value = utiles.includes(Config.perfil().modelo) ? Config.perfil().modelo : "";
    sel.classList.remove("oculto");
  }

  function editarPerfil(cambios) {
    Object.assign(Config.perfil(), cambios);
    Config.guardar();
    const p = Config.perfil();
    const op = $("selPerfil").querySelector(`option[value="${p.id}"]`);
    if (op) op.textContent = `${p.nombre} · ${p.modelo || "sin modelo"}`;
    actualizarChipIA();
    actualizarAvisoClave();
  }

  function actualizarChipIA() {
    const p = Config.perfil();
    const chip = $("chipIA");
    chip.textContent = `${p.nombre} · ${p.modelo || "?"}`;
    $("roIA").textContent = Config.faltaClave(p) ? "sin conectar" : p.nombre;
    chip.classList.toggle("sin-clave", Config.faltaClave(p));
    chip.title = Config.faltaClave(p) ? "Falta la clave de esta IA" : "IA en uso — clic para cambiar";
  }

  function activarPerfil(id) {
    Config.set({ perfilActivo: id });
    estado.historial = []; // cada IA empieza su propia conversación
    pintarPerfiles();
    if (typeof pintarModelosGratis === "function") pintarModelosGratis();
    actualizarAvisoClave();
  }

  function cambiarIAPorVoz(nombre) {
    const n = normalizar(nombre);
    const perfiles = Config.get().perfiles;
    const alias = { local: ["ollama", "lmstudio"], chatgpt: ["openai"], gpt: ["openai"], claude: ["anthropic"], google: ["gemini"] };
    const buscados = [n].concat(alias[n] || []);
    const p = perfiles.find(x => buscados.some(b => normalizar(x.nombre).includes(b) || x.proveedor === b || normalizar(x.modelo || "").includes(b)));
    if (!p) {
      const disponibles = perfiles.map(x => x.nombre).join(", ");
      agregarMensaje("sistema", `No tengo una IA llamada «${nombre}». Tienes: ${disponibles}. Agrega otras en Ajustes.`);
      return;
    }
    activarPerfil(p.id);
    confirmar(`Listo, ahora uso ${p.nombre}.`);
  }

  function actualizarAvisoClave() {
    const falta = Config.faltaClave();
    $("avisoClave").classList.toggle("oculto", !falta);

  }

  /* ---------- Conexión fácil de la IA (un clic, Gemini guiado y respaldo) ---------- */
  function iniciarConexion(conectarRapido) {
    if (!window.Conexion) return;
    Conexion.alConectar = (perfil, res) => {
      pintarPerfiles(); activarPerfil(Config.get().perfilActivo); actualizarChipIA(); pintarModelosGratis();
      if (res && res.mensaje) { $("notaConexion").textContent = res.mensaje; }
    };
    // Pestañas de la bienvenida
    document.querySelectorAll(".bv-op").forEach(b => b.addEventListener("click", () => {
      document.querySelectorAll(".bv-op").forEach(x => x.classList.toggle("activa", x === b));
      document.querySelectorAll(".bv-panel").forEach(x => x.classList.toggle("oculto", x.dataset.op !== b.dataset.op));
      if (b.dataset.op === "gemini") ofrecerPegar();
    }));
    // 1. Un clic con OpenRouter
    const unClic = async (nota) => {
      const escribir = (t, cls) => { nota.textContent = t; nota.className = cls || "nota"; };
      try {
        const res = await Conexion.openRouter((t) => escribir(t));
        escribir(res.mensaje, res.ok ? (res.aviso ? "aviso-nota" : "ok-nota") : "error-nota");
        if (res.ok) { agregarMensaje("sistema", `OpenRouter conectado con el modelo ${res.perfil.modelo}. Puedes cambiarlo en Ajustes.`); hablar("Listo, ya estoy conectado."); }
      } catch (e) { escribir(e.message, "error-nota"); }
    };
    $("btnUnClic").addEventListener("click", () => unClic($("bvNota")));
    $("btnUnClicAj").addEventListener("click", () => unClic($("notaConexion")));
    // 2. Gemini guiado: guía animada, portapapeles y validación al pegar
    $("btnVerGuia").addEventListener("click", () => {
      const g = $("guiaGemini");
      if (g.firstChild) { g.innerHTML = ""; $("btnVerGuia").textContent = "Ver cómo se hace (animación)"; return; }
      Conexion.guiaGemini(g); $("btnVerGuia").textContent = "Ocultar la animación";
    });
    async function ofrecerPegar() {
      if ($("avisoClave").classList.contains("oculto") || $("inpClaveRapida").value) return;
      const r = await Conexion.claveEnPortapapeles();
      const chip = $("btnPegarCopiada");
      if (!r) { chip.classList.add("oculto"); return; }
      chip.textContent = `Pegar la clave de ${r.nombre} que copiaste (…${r.clave.slice(-4)})`;
      $("bvNota").textContent = ""; $("bvNota").className = "";
      chip.classList.remove("oculto");
      chip.onclick = () => { $("inpClaveRapida").value = r.clave; chip.classList.add("oculto"); conectarRapido(); };
    }
    window.addEventListener("focus", ofrecerPegar);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) ofrecerPegar(); });
    $("inpClaveRapida").addEventListener("paste", () => setTimeout(() => { if (Conexion.reconocer($("inpClaveRapida").value)) conectarRapido(); else $("bvNota").textContent = Conexion.diagnostico($("inpClaveRapida").value); }, 30));
    // Ajustes: pegar cualquier clave
    const auto = async () => {
      const v = $("inpClaveAuto").value.trim(), r = Conexion.reconocer(v);
      if (!r) { $("notaConexion").textContent = Conexion.diagnostico(v); return; }
      $("notaConexion").textContent = `Probando la clave de ${r.nombre}…`;
      const res = await Conexion.conectarClave(v);
      $("notaConexion").textContent = res.mensaje; if (res.ok) $("inpClaveAuto").value = "";
    };
    $("btnClaveAuto").addEventListener("click", auto);
    // Ajustes → Voz: conectar solo el oído
    const oidoAj = async () => {
      const v = $("inpOidoAj").value.trim(); if (!v) return;
      $("notaOidoAj").textContent = "Probando la clave…";
      const r = await Conexion.conectarOido(v);
      $("notaOidoAj").textContent = r.mensaje;
      if (r.ok) { $("inpOidoAj").value = ""; pintarNotaMotor(); pintarPerfiles(); }
    };
    $("btnOidoAj").addEventListener("click", oidoAj);
    $("inpOidoAj").addEventListener("paste", () => setTimeout(() => { if (Conexion.reconocer($("inpOidoAj").value)) oidoAj(); }, 30));
    $("inpClaveAuto").addEventListener("paste", () => setTimeout(auto, 30));
    // Modelos gratuitos de OpenRouter
    $("selModeloGratis").addEventListener("change", () => {
      const p = Config.perfil(); if (p.proveedor !== "openrouter") return;
      p.modelo = $("selModeloGratis").value; Config.guardar(); pintarPerfiles();
      $("notaConexion").textContent = `Modelo: ${p.modelo}.`;
    });
    // 3. Respaldo
    const nota = (t) => { $("notaRespaldo").textContent = t; };
    $("btnCopiarRespaldo").addEventListener("click", async () => {
      const cod = Conexion.exportar();
      try { await navigator.clipboard.writeText(cod); nota("Copié el código de respaldo. Pégalo en un lugar privado (por ejemplo, una nota personal)."); }
      catch (e) { $("inpRespaldo").value = cod; $("inpRespaldo").select(); nota("Selecciona y copia el código que puse en la casilla (Ctrl + C)."); }
    });
    $("btnDescargarRespaldo").addEventListener("click", () => { Conexion.descargarRespaldo(); nota("Descargué el archivo de respaldo. Guárdalo en un lugar privado."); });
    const restaurar = (codigo, donde) => { try { const r = Conexion.importar(codigo); donde(`Listo: restauré ${r.ias} ${r.ias === 1 ? "IA" : "IA guardadas"} y tus datos.`); } catch (e) { donde(e.message); } };
    $("btnImportarRespaldo").addEventListener("click", () => restaurar($("inpRespaldo").value, nota));
    $("btnImportarBv").addEventListener("click", () => restaurar($("inpRespaldoBv").value, (t) => { $("bvNota").textContent = t; }));
    const archivo = (inp, donde) => inp.addEventListener("change", () => { const f = inp.files[0]; if (!f) return; Conexion.leerArchivo(f).then(r => donde(`Listo: restauré ${r.ias} ${r.ias === 1 ? "IA" : "IA guardadas"} y tus datos.`)).catch(e => donde(e.message)); inp.value = ""; });
    archivo($("filRespaldo"), nota); archivo($("filRespaldoBv"), (t) => { $("bvNota").textContent = t; });
    pintarModelosGratis();
    setTimeout(ofrecerPegar, 800);
  }
  async function pintarModelosGratis() {
    const caja = $("modelosGratis"); if (!caja || !window.Conexion) return;
    const p = Config.perfil();
    if (p.proveedor !== "openrouter") { caja.classList.add("oculto"); return; }
    caja.classList.remove("oculto");
    try {
      const l = await Conexion.modelosGratis();
      $("selModeloGratis").innerHTML = (l.some(m => m.id === p.modelo) ? "" : `<option value="${escaparHTML(p.modelo)}">${escaparHTML(p.modelo)} (actual)</option>`) + l.map(m => `<option value="${escaparHTML(m.id)}">${escaparHTML(m.nombre)}</option>`).join("");
      $("selModeloGratis").value = p.modelo;
    } catch (e) { caja.classList.add("oculto"); }
  }

  /* ---------- Pestaña «Romus» de la cinta de Word ---------- */
  const CINTA = {
    Hablar: () => alternarMic(),
    ModoVoz: () => abrirModoVoz(),
    Burbuja: () => abrirBurbuja(),
    Leer: "lee el documento", LeerSel: "lee la selección", Corregir: "corrige la ortografía", Revisar: "revisa con comentarios",
    Resumir: "resume el documento en pocas frases", Explicar: "explícame lo que tengo seleccionado con palabras sencillas",
    Simplificar: "reescribe la selección con un lenguaje más sencillo", Formal: "reescribe la selección con un tono más formal y académico",
    Dictar: "modo dictado", Ayuda: () => abrirHoja("panelAyuda"),
    ConectarIA: () => { abrirHoja("panelAjustes"); setTimeout(() => { const c = document.querySelector(".conexion-rapida"); if (c) { c.scrollIntoView({ block: "start" }); $("inpClaveAuto").focus(); } }, 150); },
    NivelPregrado: () => fijarDesdeCinta("nivel", "pregrado"), NivelEspecializacion: () => fijarDesdeCinta("nivel", "especializacion"),
    NivelMaestria: () => fijarDesdeCinta("nivel", "maestria"), NivelDoctorado: () => fijarDesdeCinta("nivel", "doctorado"), NivelPosdoctorado: () => fijarDesdeCinta("nivel", "posdoctorado"),
    EnfoqueCuantitativo: () => fijarDesdeCinta("enfoque", "cuantitativo"), EnfoqueCualitativo: () => fijarDesdeCinta("enfoque", "cualitativo"),
    EnfoqueMixto: () => fijarDesdeCinta("enfoque", "mixto"), EnfoqueTeorico: () => fijarDesdeCinta("enfoque", "teorico"),
    EtapaTema: () => Asesor.etapa("tema"), EtapaPlanteamiento: () => Asesor.etapa("planteamiento"), EtapaFundamentacion: () => Asesor.etapa("fundamentacion"),
    EtapaMetodologia: () => Asesor.etapa("metodologia"), EtapaCampo: () => Asesor.etapa("campo"), EtapaResultados: () => Asesor.etapa("resultados"),
    EtapaDiscusion: () => Asesor.etapa("discusion"), EtapaSustentacion: () => Asesor.etapa("sustentacion"),
    Asesor: () => Inv.asesor(), MiProyecto: () => { if (window.Asesor) Asesor.miProyecto(); }, Crear: () => { if (window.Asesor) Asesor.nuevoProyecto(); }
  };
  /** Nivel o enfoque elegido en la cinta: se guarda y se muestra la ruta de la tesis ajustada. */
  function fijarDesdeCinta(que, id) {
    if (que === "nivel") Inv.fijarNivel(id); else Inv.fijarEnfoque(id);
    irPestana("investigar");
    const v = que === "nivel" ? Inv.nivel() : Inv.enfoque();
    confirmar(`${que === "nivel" ? "Nivel" : "Enfoque"}: ${v.nombre}.`);
    if (window.Asesor) Asesor.rutaTesis();
  }
  const SIN_PANEL = new Set(["Burbuja"]); // funciona sin abrir el panel (la burbuja es su propia ventana)
  function accionCinta(clave) {
    if (CINTA[clave]) return CINTA[clave];
    const id = clave.charAt(0).toLowerCase() + clave.slice(1);
    if (window.Herramientas && Herramientas.porId(id)) return () => Herramientas.ejecutar(id);
    return null;
  }
  const NOMBRE_CINTA = { ConectarIA: "Conectar IA", Hablar: "Hablar", ModoVoz: "Modo voz", Burbuja: "Burbuja", Leer: "Leer", LeerSel: "Leer selección", Corregir: "Corregir", Revisar: "Revisar", Resumir: "Resumir", Explicar: "Explicar", Simplificar: "Simplificar", Formal: "Más formal", Dictar: "Dictar", Ayuda: "Comandos", Asesor: "Asesor", MiProyecto: "Mi proyecto", Crear: "Crear proyecto" };
  function correrCinta(clave) {
    const a = accionCinta(clave); if (!a) return;
    // Lo que se abre desde la cinta debe verse: se cierran las hojas abiertas (Ajustes, Ayuda) que taparían el resultado.
    if (!["ConectarIA", "Ayuda"].includes(clave)) document.querySelectorAll(".hoja:not(.oculto)").forEach(h => h.classList.add("oculto"));
    const id = clave.charAt(0).toLowerCase() + clave.slice(1);
    const t = window.Herramientas && Herramientas.porId(id);
    const nombre = NOMBRE_CINTA[clave] || (t && t.nombre) || clave.replace(/^(Nivel|Enfoque|Etapa)/, "$1 ");
    if (/^(Leer|LeerSel|Corregir|Revisar|Resumir|Explicar|Simplificar|Formal|Dictar)$/.test(clave)) irPestana("inicio", { sinScroll: true });
    try { confirmar("▶ " + nombre); } catch (e) { /* aviso opcional */ }
    Promise.resolve().then(() => typeof a === "string" ? manejarComando(a, "boton") : a()).catch(mostrarError);
  }
  /** ¿Word comparte el mismo motor entre la cinta y el panel? (Microsoft 365 reciente: sí; Office 2016/2019: no). */
  function runtimeCompartido() {
    try { return !!(Office.context.requirements.isSetSupported("SharedRuntime", "1.1") && Office.addin && Office.addin.showAsTaskpane); } catch (e) { return false; }
  }
  /** Una instancia oculta (la que Word abre solo para ejecutar el botón) no tiene tamaño en pantalla. */
  const soyPanelVisible = () => !window.__soyFuncion && window.innerWidth > 60 && window.innerHeight > 120;
  function accionDeCinta(clave) {
    return (ev) => {
      const terminar = () => { try { ev && ev.completed && ev.completed(); } catch (e) { /* ya terminado */ } };
      if (runtimeCompartido()) {
        // Se termina el evento de inmediato (si no, Word deja el botón «trabajando» y no atiende los siguientes clics).
        terminar();
        if (!(SIN_PANEL.has(clave) || (clave === "Hablar" && estado.burbuja))) { try { const pr = Office.addin.showAsTaskpane(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* ya visible */ } }
        correrCinta(clave);
        return;
      }
      // Word sin motor compartido (Office 2016/2019): el botón SIEMPRE corre en una instancia aparte,
      // nunca en el panel que ves. Esta instancia solo deja la acción pendiente y el panel visible la recoge.
      window.__soyFuncion = true;
      try { if (Voz.escuchando) Voz.detenerEscucha(false); } catch (e) { /* sin micrófono */ }
      try {
        localStorage.setItem("romus.cinta.pendiente", JSON.stringify({ clave, t: Date.now() }));
        localStorage.setItem("romus.cinta.ultimo", JSON.stringify({ clave, t: Date.now(), w: window.innerWidth, h: window.innerHeight }));
      } catch (e) { /* sin almacenamiento */ }
      terminar();
    };
  }
  function registrarCinta() {
    if (!window.Office) return;
    const claves = Object.keys(CINTA).concat(window.Herramientas ? Herramientas.TODAS.map(t => t.id.charAt(0).toUpperCase() + t.id.slice(1)) : []);
    claves.forEach(clave => {
      const fn = accionDeCinta(clave);
      window["romus" + clave] = fn; // Office antiguo: las funciones de la cinta se buscan como funciones globales
      try { if (Office.actions && Office.actions.associate) Office.actions.associate("romus" + clave, fn); } catch (e) { /* función ya registrada */ }
    });
    // Con el panel oculto, Romus deja de escuchar (salvo que la burbuja esté abierta): privacidad del micrófono.
    try {
      Office.addin.onVisibilityModeChanged((a) => {
        estado.panelVisible = a.visibilityMode !== "Hidden";
        if (!estado.panelVisible && !estado.burbuja && Voz.escuchando) { estado.escuchaPausadaPorCinta = true; Voz.detenerEscucha(false); }
        else if (estado.panelVisible && estado.escuchaPausadaPorCinta) { estado.escuchaPausadaPorCinta = false; if (Config.get().manosLibres) empezarEscucha(); }
      });
    } catch (e) { /* sin runtime compartido */ }
  }
  function ejecutarPendienteCinta() {
    if (!soyPanelVisible()) return;
    try {
      const p = JSON.parse(localStorage.getItem("romus.cinta.pendiente") || "null");
      if (!p) return;
      localStorage.removeItem("romus.cinta.pendiente");
      try { localStorage.setItem("romus.cinta.recogido", String(Date.now())); } catch (e) { /* sin almacenamiento */ }
      if (Date.now() - p.t < 5 * 60000) setTimeout(() => correrCinta(p.clave), 300);
    } catch (e) { /* nada pendiente */ }
  }

  function conectarEventos() {
    document.querySelectorAll(".pestana").forEach(b => b.addEventListener("click", () => irPestana(b.dataset.ir)));
    if ($("btnLimpiarChat")) $("btnLimpiarChat").addEventListener("click", () => {
      estado.historial = [];
      $("conversacion").querySelectorAll(".mensaje:not(:first-child)").forEach(m => m.remove());
      try { localStorage.removeItem(CHAT); } catch (e) { /* sin almacenamiento */ }
    });
    $("btnMic").addEventListener("click", alternarMic);
    $("btnModoVoz").addEventListener("click", abrirModoVoz);
    $("btnAbrirBurbuja").addEventListener("click", abrirBurbuja);
    $("mvBurbuja").addEventListener("click", () => { cerrarModoVoz(); abrirBurbuja(); });
    $("mvCerrar").addEventListener("click", cerrarModoVoz);
    $("orbe").addEventListener("click", tocarOrbe);
    $("orbePanel").addEventListener("click", tocarOrbe);
    $("mvMic").addEventListener("click", () => { if (Voz.escuchando) Voz.detenerEscucha(false); else empezarEscucha(); });
    $("mvPausa").addEventListener("click", () => { if (estado.lectura.activa) alternarPausa(); else Voz.callar(); sincronizarOrbe(); });
    $("btnSalirDictado").addEventListener("click", () => activarDictado(false));
    $("btnMicMini").addEventListener("click", alternarMic);
    $("chkManosLibres").addEventListener("change", (e) => {
      Config.set({ manosLibres: e.target.checked });
      if (Voz.escuchando) Voz.detenerEscucha(false);
      if (e.target.checked) empezarEscucha();
    });

    document.querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.prefijo) { const t = $("txtComando"); t.value = b.dataset.prefijo; t.focus(); t.setSelectionRange(t.value.length, t.value.length); ajustarAltura(); return; }
      manejarComando(b.dataset.cmd, "boton");
    }));
    $("btnAsesor").addEventListener("click", () => Inv.asesor());
    $("btnCrearProyecto").addEventListener("click", () => Asesor.nuevoProyecto());
    $("btnMiProyecto").addEventListener("click", () => Inv._h.ejecutar(Asesor.miProyecto));
    $("selModoAyuda").addEventListener("change", (e) => Config.set({ modoAyuda: e.target.value }));
    $("inpCodigoPro").addEventListener("input", (e) => {
      const v = e.target.value.trim().toUpperCase();
      Config.set({ codigoPro: v });
      const ok = Asesor.codigoValido(v);
      $("notaPro").textContent = ok ? "✓ Romus Pro activado: proyectos ilimitados." : (v ? "Código no válido. Revísalo." : "Incluye 1 proyecto de prueba gratis. Con un código Pro puedes crear proyectos ilimitados.");
      $("notaPro").className = ok ? "ok" : "";
    });
    $("selNivel").addEventListener("change", (e) => Inv.fijarNivel(e.target.value));
    $("selEnfoque").addEventListener("change", (e) => Inv.fijarEnfoque(e.target.value));

    $("btnPausa").addEventListener("click", alternarPausa);
    $("btnDetener").addEventListener("click", () => detenerLectura(true));
    $("btnSiguiente").addEventListener("click", () => saltar(1));
    $("btnAnterior").addEventListener("click", () => saltar(-1));
    $("rngVelocidadLector").addEventListener("input", (e) => cambiarVelocidad(parseFloat(e.target.value)));
    $("rngVelocidad").addEventListener("input", (e) => cambiarVelocidad(parseFloat(e.target.value)));
    $("btnCancelar").addEventListener("click", () => { if (estado.abort) estado.abort.abort(); mostrarProgreso("Cancelando…", null); });

    const t = $("txtComando");
    t.addEventListener("keydown", (e) => {
      estado.ultimaTecla = Date.now();
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarCaja(); }
    });
    t.addEventListener("input", alEscribir);
    $("btnEnviar").addEventListener("click", enviarCaja);

    $("btnAjustes").addEventListener("click", () => abrirHoja("panelAjustes"));
    $("btnIrAjustes").addEventListener("click", () => { abrirHoja("panelAjustes"); $("inpClave").focus(); });
    $("btnClaveGemini").addEventListener("click", () => {
      const url = "https://aistudio.google.com/apikey";
      try { if (window.Office && Office.context.ui.openBrowserWindow) { Office.context.ui.openBrowserWindow(url); return; } } catch (e) { /* sin API */ }
      window.open(url, "_blank", "noopener");
    });
    const conectarRapido = async () => {
      const clave = $("inpClaveRapida").value.trim();
      if (clave.length < 20) { $("bvNota").textContent = "Pega la clave completa (empieza por AIza…)."; $("inpClaveRapida").focus(); return; }
      // Si es una clave de otra IA (Claude, OpenAI, Groq…), Romus la reconoce y la conecta; luego verifica que funcione.
      if (window.Conexion) {
        const r = Conexion.reconocer(clave);
        if (!r) { $("bvNota").textContent = Conexion.diagnostico(clave); $("inpClaveRapida").focus(); return; }
        $("bvNota").textContent = `Probando la clave de ${r.nombre}…`;
        const res = await Conexion.conectarClave(clave);
        $("bvNota").textContent = res.mensaje;
        $("bvNota").className = res.ok ? (res.aviso ? "aviso-nota" : "ok-nota") : "error-nota";
        if (!res.ok) return;
        $("inpClaveRapida").value = "";
        agregarMensaje("sistema", `${res.perfil.nombre} conectado. Activa «Siempre atento» y di «Ok Romus, lee el documento».`);
        hablar("Listo, ya estoy conectado. Dime Ok Romus y lo que necesitas.");
        if (!estado.escuchandoInicial && Config.get().manosLibres && !Voz.escuchando) empezarEscucha();
        return;
      }
      const c = Config.get();
      let p = c.perfiles.find(x => x.proveedor === "gemini");
      if (!p) { p = Config.nuevoPerfil("gemini"); c.perfiles.push(p); }
      p.apiKey = clave; if (!p.modelo) p.modelo = "gemini-flash-latest";
      Config.guardar(); activarPerfil(p.id);
      if (typeof actualizarChipIA === "function") actualizarChipIA();
      agregarMensaje("sistema", "Gemini conectado. Activa «Siempre atento» y di «Ok Romus, lee el documento».");
      hablar("Listo, ya estoy conectado. Dime Ok Romus y lo que necesitas.");
      if (!estado.escuchandoInicial && Config.get().manosLibres && !Voz.escuchando) empezarEscucha();
    };
    $("btnConectarRapido").addEventListener("click", conectarRapido);
    iniciarConexion(conectarRapido);
    $("inpClaveRapida").addEventListener("keydown", (e) => { if (e.key === "Enter") conectarRapido(); });
    $("btnCerrarAjustes").addEventListener("click", () => { cerrarHoja("panelAjustes"); actualizarAvisoClave(); });
    $("btnAyuda").addEventListener("click", () => abrirHoja("panelAyuda"));
    $("btnCerrarAyuda").addEventListener("click", () => cerrarHoja("panelAyuda"));

    $("selPerfil").addEventListener("change", (e) => activarPerfil(e.target.value));
    $("btnNuevoPerfil").addEventListener("click", () => {
      const p = Config.nuevoPerfil("gemini");
      const c = Config.get();
      c.perfiles.push(p);
      activarPerfil(p.id);
      Config.guardar();
      $("selProveedor").focus();
    });
    $("btnEliminarPerfil").addEventListener("click", () => {
      const c = Config.get();
      if (c.perfiles.length < 2) return;
      const p = Config.perfil();
      if (!confirm(`¿Eliminar «${p.nombre}»?`)) return;
      c.perfiles = c.perfiles.filter(x => x.id !== p.id);
      activarPerfil(c.perfiles[0].id);
      Config.guardar();
    });
    $("selProveedor").addEventListener("change", (e) => {
      const prov = Config.PROVEEDORES.find(x => x.id === e.target.value);
      editarPerfil({ proveedor: prov.id, nombre: prov.nombre.replace(/\s*\(.*\)$/, ""), url: prov.url, modelo: prov.modelos[0] || "", modelosCargados: null, modoBasico: false });
      pintarPerfiles();
    });
    $("inpNombrePerfil").addEventListener("change", (e) => editarPerfil({ nombre: e.target.value.trim() || "Mi IA" }));
    $("inpUrl").addEventListener("change", (e) => editarPerfil({ url: e.target.value.trim() }));
    $("inpClave").addEventListener("change", (e) => editarPerfil({ apiKey: e.target.value.trim() }));
    $("inpModelo").addEventListener("change", (e) => editarPerfil({ modelo: e.target.value.trim() }));
    $("inpModelo").addEventListener("input", (e) => editarPerfil({ modelo: e.target.value.trim() }));
    $("selModelosCargados").addEventListener("change", (e) => {
      if (!e.target.value) return;
      $("inpModelo").value = e.target.value;
      editarPerfil({ modelo: e.target.value });
      $("resultadoPrueba").textContent = "Modelo elegido: " + e.target.value + ". Pulsa «Probar conexión y corrección».";
    });
    $("chkModoBasico").addEventListener("change", (e) => editarPerfil({ modoBasico: e.target.checked }));
    $("btnVerClave").addEventListener("click", () => {
      const i = $("inpClave");
      i.type = i.type === "password" ? "text" : "password";
      $("btnVerClave").textContent = i.type === "password" ? "Ver" : "Ocultar";
    });
    $("btnCargarModelos").addEventListener("click", async () => {
      editarPerfil({ url: $("inpUrl").value.trim(), apiKey: $("inpClave").value.trim() });
      const n = $("notaModelos");
      n.textContent = "Cargando…";
      try {
        const lista = await IA.listarModelos(Config.perfil());
        editarPerfil({ modelosCargados: lista });
        $("listaModelos").innerHTML = lista.map(m => `<option value="${escaparHTML(m)}"></option>`).join("");
        pintarSelectorModelos(lista);
        n.textContent = lista.length ? `${lista.length} modelos disponibles: elígelo en la lista de abajo.` : "El proveedor no devolvió modelos; escribe el nombre a mano.";
      } catch (err) { n.textContent = err.message; }
    });
    $("btnProbarClave").addEventListener("click", async () => {
      editarPerfil({ url: $("inpUrl").value.trim(), apiKey: $("inpClave").value.trim(), modelo: $("inpModelo").value.trim() });
      const r = $("resultadoPrueba");
      r.className = "nota"; r.textContent = "Probando con una frase de ejemplo…";
      try {
        const x = await IA.probarConexion(Config.perfil());
        const t = x.segundos.toFixed(1).replace(".", ",");
        if (x.validas > 0) {
          r.className = "nota ok";
          r.textContent = `Conexión correcta (${t} s). Encontró ${x.validas} ${x.validas === 1 ? "error" : "errores"} de prueba y los ubicó bien: sirve para corregir.` + (x.herramientas ? "" : " (Funciona en modo básico.)");
        } else if (x.total > 0) {
          r.className = "nota mal";
          r.textContent = `Conecta (${t} s), pero sus correcciones no coinciden con el texto. Sirve para conversar; para corregir usa otro modelo.`;
        } else {
          r.className = "nota mal";
          r.textContent = `Conecta (${t} s), pero no devolvió correcciones. Prueba activar el modo básico o elige un modelo más capaz.`;
        }
        actualizarAvisoClave();
      } catch (err) { r.className = "nota mal"; r.textContent = err.message; }
    });
    $("chipIA").addEventListener("click", () => abrirHoja("panelAjustes"));
    $("selIdioma").addEventListener("change", (e) => { Config.set({ idioma: e.target.value }); llenarVoces(); });
    $("selVoz").addEventListener("change", (e) => { elegirVozPorURI(e.target.value); if (!Voz.hablando) probarVoz(); });
    $("btnProbarVoz").addEventListener("click", probarVoz);
    $("rngTono").addEventListener("input", (e) => cambiarTono(parseFloat(e.target.value)));
    $("chkLeerRespuestas").addEventListener("change", (e) => Config.set({ leerRespuestas: e.target.checked }));
    $("btnTema").addEventListener("click", () => cambiarTema(temaEfectivo() === "oscuro" ? "claro" : "oscuro"));
    $("selTema").addEventListener("change", (e) => cambiarTema(e.target.value));
    $("selEstiloRespuesta").addEventListener("change", (e) => Config.set({ estiloRespuesta: e.target.value }));
    $("txtInstrucciones").addEventListener("input", (e) => Config.set({ instrucciones: e.target.value }));
    $("selMotorVoz").addEventListener("change", (e) => {
      Config.set({ motorVoz: e.target.value, falloNavegador: false });
      pintarNotaMotor();
      if (Voz.escuchando) { Voz.detenerEscucha(true); empezarEscucha(); }
    });
    $("chkPalabraActivacion").addEventListener("change", (e) => { Config.set({ palabraActivacion: e.target.checked }); sincronizarOrbe(); actualizarBotonMic(Voz.escuchando); });
    $("chkAutoenviar").addEventListener("change", (e) => Config.set({ autoenviarDictado: e.target.checked }));
    $("chkControlCambios").addEventListener("change", async (e) => {
      Config.set({ controlCambios: e.target.checked });
      if (!estado.enWord) return;
      try { await Doc.fijarControlCambios(e.target.checked); } catch (err) { /* versión sin soporte: se ignora */ }
    });
    $("btnAceptarTodo").addEventListener("click", () => { cerrarHoja("panelAjustes"); manejarComando("acepta todos los cambios", "boton"); });
    $("btnRechazarTodo").addEventListener("click", () => { cerrarHoja("panelAjustes"); manejarComando("rechaza todos los cambios", "boton"); });
    $("btnBorrarHistorial").addEventListener("click", () => {
      estado.historial = [];
      $("conversacion").querySelectorAll(".mensaje:not(:first-child)").forEach(m => m.remove());
      cerrarHoja("panelAjustes");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!$("panelAjustes").classList.contains("oculto")) { cerrarHoja("panelAjustes"); actualizarAvisoClave(); }
        else if (!$("panelAyuda").classList.contains("oculto")) cerrarHoja("panelAyuda");
        else if (estado.modoVoz) cerrarModoVoz();
        else detenerLectura(true);
      }
      if (e.ctrlKey && e.code === "Space") { e.preventDefault(); alternarMic(); }
    });
  }

  function temaEfectivo() { return document.documentElement.dataset.tema === "oscuro" ? "oscuro" : "claro"; }

  function cambiarTema(tema) {
    Config.set({ tema });
    aplicarTema();
    if ($("selTema")) $("selTema").value = tema;
    return temaEfectivo();
  }

  function aplicarTema() {
    const elegido = Config.get().tema || "auto";
    if (elegido === "claro" || elegido === "oscuro") {
      document.documentElement.dataset.tema = elegido;
      avisarTema();
      return;
    }
    let oscuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    try {
      const tema = Office.context.officeTheme;
      if (tema && tema.bodyBackgroundColor) {
        const hex = tema.bodyBackgroundColor.replace("#", "");
        const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
        oscuro = (r * 299 + g * 587 + b * 114) / 1000 < 110;
      }
    } catch (e) { /* sin tema de Office */ }
    document.documentElement.dataset.tema = oscuro ? "oscuro" : "claro";
    avisarTema();
  }

  function avisarTema() {
    const t = temaEfectivo();
    if ($("btnTema")) $("btnTema").title = t === "oscuro" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
    if (estado.burbuja) enviarBurbuja({ tipo: "tema", tema: t });
  }

  async function iniciar(info) {
    // Lo primero: registrar los botones de la cinta, para que Word los encuentre aunque algo más falle al arrancar.
    try { registrarCinta(); } catch (e) { console.warn("Romus: cinta", e); }
    estado.enWord = !!(info && info.host === Office.HostType.Word);
    aplicarTema();
    $("avisoFueraWord").classList.toggle("oculto", estado.enWord);
    Voz.setManejadorHablando((h) => { if (estado.lectura.activa) actualizarLector(); if (!h) extenderConversacion(); sincronizarOrbe(); });
    setInterval(revisarSueno, 1000);
    Voz.setManejadorPalabra(() => { if (estado.orbe) estado.orbe.pulso(); if (estado.orbePanel) estado.orbePanel.pulso(); if (estado.burbuja) enviarBurbuja({ tipo: "pulso" }); });
    crearOrbePanel();
    setInterval(() => {
      estado.nivelSintetico *= 0.82;
      if (estado.orbePanel && !Voz.hablando) estado.orbePanel.nivel(estado.nivelSintetico);
    }, 150);
    if (window.Panel) Panel.iniciar(estado.enWord);
    if (window.Inv) {
      Inv.conectar({ agregarMensaje, hablar, confirmar, ocupar, mostrarError, prefijar });
      $("selNivel").value = Inv.nivel().id;
      $("selEnfoque").value = Inv.enfoque().id;
    }
    llenarAjustes();
    actualizarAvisoClave();
    conectarEventos();
    irPestana(Config.get().pestana || "inicio", { sinScroll: true });
    if (window.Herramientas) Herramientas.pintar($("invHerramientas"));
    // Word sin runtime compartido: el panel visible recoge las acciones de la cinta. Se espera un momento al
    // arrancar: si esta instancia es la que Word abrió solo para un botón, no debe quedarse con la acción.
    const compartido = runtimeCompartido();
    restaurarChat();
    // Cinta clásica (Office 2016/2019/2021): el botón abre el panel en taskpane.html?cinta=<Botón>.
    const deCinta = new URLSearchParams(location.search).get("cinta");
    if (deCinta) {
      try { history.replaceState(null, "", location.pathname + location.search.replace(/[?&]cinta=[^&]*/, "").replace(/^&/, "?")); } catch (e) { /* sin historial */ }
      try { localStorage.setItem("romus.cinta.ultimo", JSON.stringify({ clave: deCinta, t: Date.now(), clasica: true })); localStorage.setItem("romus.cinta.recogido", String(Date.now() + 1)); } catch (e) { /* sin almacenamiento */ }
      setTimeout(() => correrCinta(deCinta), 500);
    }
    setTimeout(ejecutarPendienteCinta, compartido ? 0 : 1500);
    if (!compartido) {
      window.addEventListener("storage", (e) => { if (e.key === "romus.cinta.pendiente" && e.newValue) ejecutarPendienteCinta(); });
      window.addEventListener("focus", () => ejecutarPendienteCinta());
      setInterval(() => { try { if (localStorage.getItem("romus.cinta.pendiente")) ejecutarPendienteCinta(); } catch (e) { /* sin almacenamiento */ } }, 500);
    }
    Voz.cargarVoces().then(llenarVoces);
    ajustarAltura();
    if (!Voz.soportaReconocimiento()) {
      $("btnMic").classList.add("no-disponible");
      pistaSinMicrofono("");
    } else {
      $("pistaDictado").innerHTML = `<kbd>Ctrl</kbd> + <kbd>Espacio</kbd> para hablar`; $("pistaDictado").title = "Si el micrófono falla, usa el dictado del sistema en la caja";
    }
    // La escucha continua arranca solo en el panel visible (no en la instancia oculta de un botón de la cinta).
    setTimeout(() => { if (!window.__soyFuncion && estado.enWord && Config.get().manosLibres && document.visibilityState !== "hidden" && !Voz.escuchando) empezarEscucha(); }, compartido ? 0 : 1500);
  }

  if (window.Office && Office.onReady) {
    Office.onReady(iniciar);
  } else {
    document.addEventListener("DOMContentLoaded", () => iniciar(null));
  }

  // Exponer para pruebas
  window.__VozDoc = { manejarComando, estado, normalizar, comandoLocal, comandoControl, formatearDictado, abrirModoVoz, cerrarModoVoz, mostrarSubtitulo, resaltarPalabra };
})();
