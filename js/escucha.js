/* Romus — oído propio: graba la voz con el micrófono y la transcribe con la IA conectada.
   Se usa cuando el navegador interno de Word no trae reconocimiento de voz (Word de escritorio).
   - Detecta cuándo hablas (detector de voz local, sin enviar nada mientras hay silencio).
   - Cuando terminas una frase, envía solo ese fragmento de audio a Gemini, OpenAI o Groq para transcribirlo.
   Interfaz compatible con Voz.iniciar(): opciones { idioma, continuo, parcial, final, error, estado, nivel }. */
window.Escucha = (function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  const PROVEEDORES_AUDIO = ["gemini", "openai", "groq"];

  let flujo = null, ctx = null, fuente = null, proc = null;
  let activo = false, continuo = false, op = {};
  let grabando = false, trozos = [], previo = [], silencioMs = 0, vozMs = 0, totalMs = 0, esperaMs = 0;
  let pisoRuido = 0.006, enviando = 0, ficha = 0, modeloBueno = "", finHabla = 0;
  const sinPensarOk = {};

  /* ---------- ¿Con qué IA se transcribe? ---------- */
  function perfilTranscripcion() {
    if (!window.Config) return null;
    const c = Config.get();
    const perfiles = c.perfiles || [];
    const util = (p) => p && PROVEEDORES_AUDIO.includes(p.proveedor) && (p.apiKey || "").trim();
    const elegido = perfiles.find(p => p.id === c.perfilVoz);
    if (util(elegido)) return elegido;
    if (util(Config.perfil())) return Config.perfil();
    return perfiles.find(util) || null;
  }

  function disponible() {
    return !!(AC && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && perfilTranscripcion());
  }

  /* ---------- Audio → WAV 16 kHz mono ---------- */
  function aWav(muestras, tasaOrigen) {
    const tasa = 16000;
    const factor = tasaOrigen / tasa;
    const n = Math.floor(muestras.length / factor);
    const pcm = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      const s = Math.max(-1, Math.min(1, muestras[Math.floor(i * factor)]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const buf = new ArrayBuffer(44 + pcm.length * 2);
    const v = new DataView(buf);
    const txt = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    txt(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); txt(8, "WAVE");
    txt(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, tasa, true); v.setUint32(28, tasa * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    txt(36, "data"); v.setUint32(40, pcm.length * 2, true);
    new Int16Array(buf, 44).set(pcm);
    return new Blob([buf], { type: "audio/wav" });
  }

  function aBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  /* ---------- Transcripción ---------- */
  const PISTA = "Transcribe exactamente lo que dice la persona en este audio, en español. " +
    "Es una orden para un asistente llamado Romus (se dice «Ok Romus»). " +
    "Responde solo con la transcripción, sin comillas ni comentarios. Si no hay voz clara, responde con un guion (-).";

  async function transcribirGemini(p, wav) {
    const datos = await aBase64(wav);
    const modelos = [modeloBueno, "gemini-flash-lite-latest", p.modelo, "gemini-flash-latest"].filter((m, i, a) => m && a.indexOf(m) === i);
    let ultimo = null;
    for (const m of modelos) {
      const pedir = (sinPensar) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": p.apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: PISTA }, { inline_data: { mime_type: "audio/wav", data: datos } }] }],
          // Sin «pensar»: transcribir no lo necesita y así responde mucho más rápido.
          generationConfig: Object.assign({ temperature: 0, maxOutputTokens: 200 }, sinPensar ? { thinkingConfig: { thinkingBudget: 0 } } : {})
        })
      });
      let r = await pedir(sinPensarOk[m] !== false);
      if (r.status === 400 && sinPensarOk[m] !== false) { sinPensarOk[m] = false; r = await pedir(false); }
      if (r.ok) {
        modeloBueno = m;
        const j = await r.json();
        const partes = (((j.candidates || [])[0] || {}).content || {}).parts || [];
        return partes.map(x => x.text || "").join("").trim();
      }
      ultimo = r.status;
      if (r.status !== 404 && r.status !== 400) break;
    }
    throw new Error("transcripcion-" + ultimo);
  }

  async function transcribirOpenAI(p, wav) {
    const base = (p.url || "").replace(/\/+$/, "");
    const modelos = p.proveedor === "groq" ? ["whisper-large-v3-turbo", "whisper-large-v3"] : ["gpt-4o-mini-transcribe", "whisper-1"];
    let ultimo = null;
    for (const m of modelos) {
      const fd = new FormData();
      fd.append("file", wav, "voz.wav");
      fd.append("model", m);
      fd.append("language", ((Config.get().idioma || "es").slice(0, 2)));
      fd.append("prompt", "Ok Romus.");
      const r = await fetch(base + "/audio/transcriptions", { method: "POST", headers: { authorization: "Bearer " + p.apiKey }, body: fd });
      if (r.ok) { const j = await r.json(); return (j.text || "").trim(); }
      ultimo = r.status;
      if (r.status !== 404 && r.status !== 400) break;
    }
    throw new Error("transcripcion-" + ultimo);
  }

  async function transcribir(wav) {
    const p = perfilTranscripcion();
    if (!p) throw new Error("sin-transcriptor");
    return p.proveedor === "gemini" ? transcribirGemini(p, wav) : transcribirOpenAI(p, wav);
  }

  /* ---------- Detector de voz ---------- */
  function alFragmento(e) {
    if (!activo) return;
    const datos = e.inputBuffer.getChannelData(0);
    const copia = new Float32Array(datos);
    const ms = (datos.length / ctx.sampleRate) * 1000;
    let s = 0;
    for (let i = 0; i < datos.length; i++) s += datos[i] * datos[i];
    const rms = Math.sqrt(s / datos.length);
    if (op.nivel) op.nivel(Math.min(1, rms * 8));

    // Mientras Romus habla solo se toma en cuenta una voz fuerte y cercana (para decir «Ok Romus, para»),
    // así no se transcribe su propia lectura por los parlantes.
    const hablaAhora = !!((window.Voz && Voz.hablando && !Voz.pausado) || window.romusHablando);
    if (hablaAhora) finHabla = performance.now();
    // La cola de su voz (eco de la sala) sigue sonando un momento después de callar.
    const romusHabla = hablaAhora || performance.now() - finHabla < 700;
    const umbral = romusHabla ? Math.max(0.12, pisoRuido * 12) : Math.max(0.015, pisoRuido * 3.2);
    const hayVoz = rms > umbral;
    if (!grabando) {
      if (!romusHabla) pisoRuido = pisoRuido * 0.97 + rms * 0.03; // se adapta al ruido del ambiente
      previo.push(copia); if (previo.length > 4) previo.shift(); // ~0,3 s antes de empezar a hablar
      if (hayVoz) { grabando = true; trozos = previo.slice(); previo = []; silencioMs = 0; vozMs = ms; totalMs = ms; if (op.parcial) op.parcial("…"); }
      else if (!continuo) { esperaMs += ms; if (esperaMs > 9000) { detener(false); } }
      return;
    }
    trozos.push(copia);
    totalMs += ms;
    if (hayVoz) { vozMs += ms; silencioMs = 0; } else silencioMs += ms;
    if (silencioMs > 650 || totalMs > 14000) terminarFrase();
  }

  function cancelarFrase() { grabando = false; trozos = []; silencioMs = 0; vozMs = 0; totalMs = 0; }

  async function terminarFrase() {
    const partes = trozos, dur = vozMs, tasa = ctx.sampleRate, mia = ficha;
    cancelarFrase();
    if (dur < 380) return; // ruido corto
    const total = partes.reduce((n, a) => n + a.length, 0);
    const todo = new Float32Array(total);
    let o = 0; partes.forEach(a => { todo.set(a, o); o += a.length; });
    const wav = aWav(todo, tasa);
    if (op.parcial) op.parcial("(transcribiendo…)");
    enviando++;
    try {
      const bruto = await transcribir(wav);
      if (mia !== ficha) return; // se apagó el micrófono mientras transcribía
      const texto = bruto.replace(/^["«“']|["»”']$/g, "").trim();
      if (texto && texto !== "-" && op.final) op.final(texto);
      else if (op.parcial) op.parcial("");
    } catch (e) {
      if (mia !== ficha) return;
      const m = String(e.message || "");
      if (op.error) op.error(m === "sin-transcriptor" ? "sin-transcriptor" : /-429$/.test(m) ? "cuota" : /-(401|403)$/.test(m) ? "clave" : "transcripcion");
    } finally {
      enviando--;
      if (!continuo && activo && mia === ficha) detener(false); // pulsar para hablar: una frase por vez
    }
  }

  async function iniciar(opciones) {
    detener(true);
    const mia = ++ficha;
    op = opciones || {};
    continuo = !!op.continuo;
    const fallo = (codigo) => { if (op.error) op.error(codigo); if (op.estado) op.estado(false); };
    if (!perfilTranscripcion()) { fallo("sin-transcriptor"); return; }
    let f;
    try {
      f = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      if (mia !== ficha) return;
      fallo(e && e.name === "NotFoundError" ? "audio-capture" : "not-allowed");
      return;
    }
    if (mia !== ficha) { f.getTracks().forEach(t => t.stop()); return; } // se canceló mientras pedía permiso
    flujo = f;
    ctx = new AC();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
      const reanudar = () => { if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {}); };
      document.addEventListener("pointerdown", reanudar, { once: true });
      document.addEventListener("keydown", reanudar, { once: true });
    }
    fuente = ctx.createMediaStreamSource(flujo);
    proc = ctx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = alFragmento;
    fuente.connect(proc);
    proc.connect(ctx.destination);
    activo = true; esperaMs = 0; previo = []; cancelarFrase();
    if (op.estado) op.estado(true);
  }

  function detener(silencioso) {
    ficha++;
    const estaba = activo;
    activo = false;
    cancelarFrase();
    try { if (proc) { proc.disconnect(); proc.onaudioprocess = null; } } catch (e) { /* nada */ }
    try { if (fuente) fuente.disconnect(); } catch (e) { /* nada */ }
    try { if (ctx) ctx.close(); } catch (e) { /* nada */ }
    try { if (flujo) flujo.getTracks().forEach(t => t.stop()); } catch (e) { /* nada */ }
    flujo = ctx = fuente = proc = null;
    if (estaba && !silencioso && op.estado) op.estado(false);
  }

  return {
    disponible, iniciar, detener, perfilTranscripcion, aWav,
    get escuchando() { return activo; }
  };
})();
