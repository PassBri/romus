/* VozDoc IA — configuración guardada en este equipo (localStorage del panel). */
window.Config = (function () {
  const CLAVE = "vozdoc.config.v1";

  /* Proveedores de IA. "anthropic" usa la API de Claude; "openai" es el formato compatible con OpenAI,
     que usan casi todos los demás (incluida la IA local con Ollama o LM Studio).
     Los nombres de modelo cambian con el tiempo: el botón «Cargar modelos» trae la lista actual. */
  const PROVEEDORES = [
    { id: "anthropic", nombre: "Claude (Anthropic)", tipo: "anthropic", url: "https://api.anthropic.com/v1",
      modelos: ["claude-sonnet-5", "claude-haiku-4-5-20251001", "claude-opus-5-5"], clave: true,
      enlaceClave: "https://console.anthropic.com/settings/keys", nota: "Recomendado para corregir: sigue las instrucciones con mucha precisión." },
    { id: "openai", nombre: "OpenAI (ChatGPT)", tipo: "openai", url: "https://api.openai.com/v1",
      modelos: ["gpt-5-mini", "gpt-5", "gpt-4.1-mini"], clave: true,
      enlaceClave: "https://platform.openai.com/api-keys", nota: "" },
    { id: "gemini", nombre: "Google Gemini", tipo: "openai", url: "https://generativelanguage.googleapis.com/v1beta/openai",
      modelos: ["gemini-flash-latest", "gemini-2.5-flash", "gemini-pro-latest"], clave: true,
      enlaceClave: "https://aistudio.google.com/apikey", nota: "Tiene un plan gratuito con límites de uso." },
    { id: "groq", nombre: "Groq", tipo: "openai", url: "https://api.groq.com/openai/v1",
      modelos: ["llama-3.3-70b-versatile"], clave: true,
      enlaceClave: "https://console.groq.com/keys", nota: "Muy rápido; tiene un plan gratuito con límites." },
    { id: "openrouter", nombre: "OpenRouter (cientos de modelos)", tipo: "openai", url: "https://openrouter.ai/api/v1",
      modelos: ["openrouter/auto"], clave: true,
      enlaceClave: "https://openrouter.ai/keys", nota: "Una sola clave para modelos de muchas empresas. Usa «Cargar modelos» para elegir." },
    { id: "deepseek", nombre: "DeepSeek", tipo: "openai", url: "https://api.deepseek.com/v1",
      modelos: ["deepseek-chat"], clave: true, enlaceClave: "https://platform.deepseek.com/api_keys", nota: "" },
    { id: "mistral", nombre: "Mistral", tipo: "openai", url: "https://api.mistral.ai/v1",
      modelos: ["mistral-small-latest", "mistral-large-latest"], clave: true, enlaceClave: "https://console.mistral.ai/api-keys", nota: "" },
    { id: "ollama", nombre: "Ollama (IA local, sin internet)", tipo: "openai", url: "http://localhost:11434/v1",
      modelos: ["llama3.1", "qwen2.5", "gemma3"], clave: false, enlaceClave: "https://ollama.com/download",
      nota: "Instala Ollama y un modelo (ej.: «ollama pull qwen2.5»). Para que Word pueda conectarse, inicia Ollama con la variable OLLAMA_ORIGINS=* . Los modelos pequeños corrigen peor: si fallan, activa el modo básico." },
    { id: "lmstudio", nombre: "LM Studio (IA local)", tipo: "openai", url: "http://localhost:1234/v1",
      modelos: [], clave: false, enlaceClave: "https://lmstudio.ai",
      nota: "En LM Studio abre la pestaña Developer, inicia el servidor y activa «Enable CORS». Usa «Cargar modelos»." },
    { id: "personalizado", nombre: "Otra (compatible con OpenAI)", tipo: "openai", url: "",
      modelos: [], clave: true, enlaceClave: "",
      nota: "Pega la dirección base de la API (termina normalmente en /v1) y el nombre del modelo." }
  ];

  const IDIOMAS = [
    { id: "es-CO", nombre: "Español (Colombia)" },
    { id: "es-ES", nombre: "Español (España)" },
    { id: "es-MX", nombre: "Español (México)" },
    { id: "es-US", nombre: "Español (EE. UU.)" },
    { id: "en-US", nombre: "Inglés (EE. UU.)" }
  ];

  /* Estilos de lectura: cada uno ajusta tono, velocidad y pausas entre frases. */
  const ESTILOS = [
    { id: "natural",  nombre: "Natural",        tono: 1.0,  velocidad: 1.0,  pausa: 250 },
    { id: "narrador", nombre: "Narrador",       tono: 0.9,  velocidad: 0.9,  pausa: 450 },
    { id: "clase",    nombre: "Clase pausada",  tono: 1.0,  velocidad: 0.8,  pausa: 650 },
    { id: "calmado",  nombre: "Calmado",        tono: 0.85, velocidad: 0.85, pausa: 500 },
    { id: "energico", nombre: "Enérgico",       tono: 1.2,  velocidad: 1.2,  pausa: 150 },
    { id: "grave",    nombre: "Grave",          tono: 0.6,  velocidad: 0.95, pausa: 300 },
    { id: "agudo",    nombre: "Agudo",          tono: 1.5,  velocidad: 1.05, pausa: 250 },
    { id: "rapida",   nombre: "Lectura rápida", tono: 1.0,  velocidad: 1.6,  pausa: 80 }
  ];

  const PREDETERMINADA = {
    perfiles: [],
    perfilActivo: "",
    idioma: "es-CO",
    vozURI: "",
    velocidad: 1,
    tono: 1,
    estilo: "natural",
    apariencia: "romus",
    leerRespuestas: true,
    controlCambios: true,
    manosLibres: true,
    palabraActivacion: true,
    autoenviarDictado: true
  };

  let cfg = Object.assign({}, PREDETERMINADA);
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE) || "{}");
    cfg = Object.assign(cfg, guardada);
  } catch (e) { /* sin almacenamiento: se usa la configuración en memoria */ }

  // Migración desde la v1.2 (una sola clave de Claude) y perfil inicial.
  if (!Array.isArray(cfg.perfiles) || !cfg.perfiles.length) {
    cfg.perfiles = [nuevoPerfil("anthropic", { apiKey: cfg.apiKey || "", modelo: cfg.modelo || "claude-sonnet-5" })];
    cfg.perfilActivo = cfg.perfiles[0].id;
  }
  delete cfg.apiKey; delete cfg.modelo;
  // v1.5: Romus queda siempre atento a «Ok Romus» (una sola vez, luego respeta lo que elija el usuario).
  if ((cfg.versionConfig || 0) < 5) { cfg.manosLibres = true; cfg.palabraActivacion = true; cfg.versionConfig = 5; }
  // v2.2: Romus tiene oído propio; se vuelve a encender «Siempre atento» (antes se apagaba al fallar el micrófono en Word de escritorio).
  if (cfg.versionConfig < 6) { cfg.manosLibres = true; cfg.falloNavegador = false; cfg.versionConfig = 6; }
  if (!cfg.perfiles.some(p => p.id === cfg.perfilActivo)) cfg.perfilActivo = cfg.perfiles[0].id;

  function nuevoPerfil(proveedorId, extra) {
    const pr = PROVEEDORES.find(p => p.id === proveedorId) || PROVEEDORES[0];
    return Object.assign({
      id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      proveedor: pr.id,
      nombre: pr.nombre.replace(/\s*\(.*\)$/, ""),
      url: pr.url,
      apiKey: "",
      modelo: pr.modelos[0] || "",
      modoBasico: false
    }, extra || {});
  }

  function perfil() { return cfg.perfiles.find(p => p.id === cfg.perfilActivo) || cfg.perfiles[0]; }
  function proveedorDe(p) { return PROVEEDORES.find(x => x.id === (p || perfil()).proveedor) || PROVEEDORES[PROVEEDORES.length - 1]; }
  function faltaClave(p) { p = p || perfil(); return proveedorDe(p).clave && !p.apiKey; }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(cfg)); } catch (e) { /* ignorar */ }
  }

  return {
    PROVEEDORES, IDIOMAS, ESTILOS,
    perfil, proveedorDe, faltaClave, nuevoPerfil,
    guardar,
    get: () => cfg,
    set(cambios) { Object.assign(cfg, cambios); guardar(); return cfg; }
  };
})();
