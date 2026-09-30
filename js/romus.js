/* Romus — apariencia holográfica (estilo HUD minimalista, acorde a Microsoft Word).
   Mantiene el ADN del concepto original de Brian Suárez:
   - esfera de puntos de luz; puntos «humanos» (magenta) que responden a tu voz y puntos de la IA (azul) que laten al hablar;
   - respira en reposo, se acerca al escuchar, se ordena en anillos al trabajar;
   - núcleo dorado que late (cada latido envía una onda) y se vuelve átomo en modo trabajo;
   - se inclina siguiendo el puntero.
   Estilo: líneas finas, puntos nítidos, anillos de interfaz con marcas, ecualizador circular y línea de escaneo.
   Tema claro (azul Word sobre blanco) u oscuro (neón sobre azul noche), según el tema de Office.
   Interfaz: estado(), nivel(), pulso(), detener(). */
window.OrbeRomus = (function () {
  const TAU = Math.PI * 2;

  const PALETAS = {
    claro: { ia: [24, 90, 189], cian: [0, 120, 212], humano: [194, 57, 179], verde: [14, 159, 110], oro: [197, 139, 0], linea: [24, 90, 189], nucleo: [255, 196, 60] },
    oscuro: { ia: [58, 160, 255], cian: [0, 229, 255], humano: [255, 61, 203], verde: [46, 230, 168], oro: [255, 200, 61], linea: [95, 179, 255], nucleo: [255, 214, 110] }
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function temaActual(canvas) {
    const d = document.documentElement.dataset.tema;
    if (d === "oscuro") return "oscuro";
    if (d === "claro") return "claro";
    const fondo = canvas.closest && canvas.closest("[data-fondo]");
    if (fondo) return fondo.dataset.fondo;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
  }

  class OrbeRomus {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext("2d");
      this.est = "reposo";
      this.nivelObj = 0; this.nivelAct = 0;
      this.pulsoAct = 0;
      this.t = 0;
      this.escala = 0.92;
      this.orden = 0;
      this.rotY = 0; this.rotX = -0.35;
      this.inclinX = 0; this.inclinY = 0; this.objX = 0; this.objY = 0;
      this.ondas = [];
      this.faseLatido = 0;
      this.cuadros = 0;
      this.tema = temaActual(canvas);
      this.ultimo = performance.now();
      this.activo = true;
      this._crearPuntos();
      this._cuadro = this._cuadro.bind(this);
      this._mover = (e) => {
        const r = this.c.getBoundingClientRect();
        this.objY = Math.max(-0.5, Math.min(0.5, ((e.clientX - r.left) / r.width - 0.5) * 0.8));
        this.objX = Math.max(-0.4, Math.min(0.4, ((e.clientY - r.top) / r.height - 0.5) * 0.6));
      };
      window.addEventListener("pointermove", this._mover);
      this._ajustar();
      this._obs = window.ResizeObserver ? new ResizeObserver(() => this._ajustar()) : null;
      if (this._obs) this._obs.observe(canvas);
      requestAnimationFrame(this._cuadro);
    }

    /* Esfera de Fibonacci: reparto uniforme y ordenado de los puntos (aspecto limpio) */
    _crearPuntos() {
      const N = 640, oro = Math.PI * (3 - Math.sqrt(5));
      this.p = [];
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;
        const lat = Math.acos(y);
        const lon = (i * oro) % TAU;
        const u = Math.random();
        const tipo = u < 0.3 ? "humano" : u < 0.36 ? "verde" : u < 0.5 ? "cian" : "ia";
        this.p.push({
          lat, lon, tipo,
          anillo: (Math.round((lat / Math.PI) * 10) + 0.5) / 11 * Math.PI,
          fase: Math.random() * TAU,
          brillo: Math.random() < 0.06 ? 1 : 0
        });
      }
    }

    estado(e) { if (["reposo", "escuchando", "pensando", "hablando"].includes(e)) this.est = e; }
    nivel(v) { this.nivelObj = Math.max(0, Math.min(1, v)); }
    pulso(f) { this.pulsoAct = Math.min(1, this.pulsoAct + (f || 0.5)); }
    detener() { this.activo = false; window.removeEventListener("pointermove", this._mover); if (this._obs) this._obs.disconnect(); }

    _ajustar() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.dpr = dpr;
      this.c.width = Math.round((this.c.clientWidth || 200) * dpr);
      this.c.height = Math.round((this.c.clientHeight || 200) * dpr);
    }

    _cuadro(ahora) {
      if (!this.activo) return;
      const dt = Math.min(0.05, (ahora - this.ultimo) / 1000);
      this.ultimo = ahora;
      if (++this.cuadros % 60 === 0) this.tema = temaActual(this.c);
      if (!document.hidden) this._dibujar(dt);
      requestAnimationFrame(this._cuadro);
    }

    /* Proyección 3D → pantalla */
    _proyectar(x, y, z) {
      const x1 = x * this.cY - z * this.sY, z1 = x * this.sY + z * this.cY;
      const y1 = y * this.cX - z1 * this.sX, z2 = y * this.sX + z1 * this.cX;
      const x2 = x1 * this.cI - z2 * this.sI, z3 = x1 * this.sI + z2 * this.cI;
      const persp = 3 / (3 - z3);
      return [this.cx + x2 * this.R * persp, this.cy + y1 * this.R * persp, z3];
    }

    _dibujar(dt) {
      const ctx = this.ctx, W = this.c.width, H = this.c.height, dpr = this.dpr;
      const e = this.est, P = PALETAS[this.tema];
      this.t += dt;
      const t = this.t;
      this.nivelAct += (this.nivelObj - this.nivelAct) * Math.min(1, dt * 10);
      this.pulsoAct = Math.max(0, this.pulsoAct - dt * 2.4);

      let escalaObj = 0.9 + Math.sin(t * 1.0) * 0.022;
      if (e === "escuchando") escalaObj = 0.98 + this.nivelAct * 0.07;
      if (e === "pensando") escalaObj = 0.8;
      if (e === "hablando") escalaObj = 0.93 + this.pulsoAct * 0.04;
      this.escala += (escalaObj - this.escala) * Math.min(1, dt * 3.5);
      this.orden += ((e === "pensando" ? 1 : 0) - this.orden) * Math.min(1, dt * 2.4);
      this.rotY += dt * (0.18 + this.orden * 0.6);
      this.inclinX += (this.objX - this.inclinX) * Math.min(1, dt * 2.5);
      this.inclinY += (this.objY - this.inclinY) * Math.min(1, dt * 2.5);

      this.cx = W / 2; this.cy = H / 2;
      this.R = Math.min(W, H) * 0.3 * this.escala;
      this.cY = Math.cos(this.rotY); this.sY = Math.sin(this.rotY);
      const ax = this.rotX + this.inclinX;
      this.cX = Math.cos(ax); this.sX = Math.sin(ax);
      this.cI = Math.cos(this.inclinY); this.sI = Math.sin(this.inclinY);
      const { cx, cy, R } = this;

      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";

      this._hud(ctx, P, t);
      this._malla(ctx, P);
      this._puntos(ctx, P, t);
      this._escaneo(ctx, P, t);
      this._nucleo(ctx, P, t, dt);
    }

    /* Anillos de interfaz: arcos segmentados, marcas y ecualizador de voz */
    _hud(ctx, P, t) {
      const { cx, cy, R, dpr } = this, e = this.est;
      const acento = e === "escuchando" ? P.humano : e === "pensando" ? P.oro : e === "hablando" ? P.cian : P.linea;
      const oscuro = this.tema === "oscuro";

      // Ecualizador circular (72 barras): tu voz en magenta, la de Romus en cian
      const n = 72, base = R * 1.2;
      let amp = e === "escuchando" ? 0.02 + this.nivelAct * 0.16 : e === "hablando" ? 0.015 + this.pulsoAct * 0.12 : 0.008;
      ctx.lineWidth = 1.6 * dpr;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU - Math.PI / 2;
        const ruido = 0.5 + 0.5 * Math.sin(k * 0.9 + t * 7) * Math.sin(k * 0.37 - t * 3.1);
        const largo = R * (0.02 + amp * ruido);
        const r1 = base, r2 = base + largo;
        ctx.strokeStyle = rgba(acento, (oscuro ? 0.55 : 0.5) * (0.35 + ruido * 0.65));
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }

      // Arcos segmentados que giran (sentidos opuestos)
      const arcos = (radio, segs, hueco, giro, grosor, alfa, color) => {
        ctx.lineWidth = grosor * dpr;
        ctx.strokeStyle = rgba(color, alfa);
        const paso = TAU / segs;
        for (let k = 0; k < segs; k++) {
          const a0 = giro + k * paso + hueco / 2, a1 = giro + (k + 1) * paso - hueco / 2;
          ctx.beginPath(); ctx.arc(cx, cy, radio, a0, a1); ctx.stroke();
        }
      };
      const vel = e === "pensando" ? 1.6 : 1;
      arcos(R * 1.42, 3, 0.9, t * 0.35 * vel, 1.4, oscuro ? 0.55 : 0.45, acento);
      arcos(R * 1.5, 12, 0.22, -t * 0.12 * vel, 1, oscuro ? 0.22 : 0.18, P.linea);

      // Marcas finas tipo mira (cada 6°, más largas cada 30°)
      ctx.lineWidth = 1 * dpr;
      const rm = R * 1.58, giro = t * 0.05;
      for (let k = 0; k < 60; k++) {
        const a = giro + (k / 60) * TAU;
        const larga = k % 5 === 0;
        const l = R * (larga ? 0.05 : 0.022);
        ctx.strokeStyle = rgba(P.linea, larga ? (oscuro ? 0.4 : 0.32) : (oscuro ? 0.16 : 0.13));
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * rm, cy + Math.sin(a) * rm);
        ctx.lineTo(cx + Math.cos(a) * (rm + l), cy + Math.sin(a) * (rm + l));
        ctx.stroke();
      }
      // Cuatro indicadores cardinales
      ctx.fillStyle = rgba(acento, 0.85);
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + t * 0.05;
        const x = cx + Math.cos(a) * (rm + R * 0.1), y = cy + Math.sin(a) * (rm + R * 0.1);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 4);
        const s = 2.4 * dpr; ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.restore();
      }
    }

    /* Malla holográfica: meridianos y paralelos muy tenues */
    _malla(ctx, P) {
      const alfa = (this.tema === "oscuro" ? 0.1 : 0.08) * (1 - this.orden * 0.5);
      ctx.lineWidth = 0.8 * this.dpr;
      ctx.strokeStyle = rgba(P.linea, alfa);
      const trazo = (f) => {
        ctx.beginPath();
        for (let k = 0; k <= 48; k++) {
          const [x, y] = f(k / 48);
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      for (let m = 0; m < 6; m++) {
        const lon = (m / 6) * Math.PI;
        trazo((u) => { const lat = u * TAU; return this._proyectar(Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon)); });
      }
      for (let p = 1; p < 6; p++) {
        const lat = (p / 6) * Math.PI;
        trazo((u) => { const lon = u * TAU; return this._proyectar(Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon)); });
      }
    }

    /* Puntos nítidos, agrupados por color y profundidad (se dibujan en pocos trazos) */
    _puntos(ctx, P, t) {
      const e = this.est, dpr = this.dpr;
      const grupos = {};
      for (const q of this.p) {
        let r = 1 + Math.sin(q.lat * 5 - t * 1.8) * 0.018; // onda que recorre la esfera
        if (q.tipo === "humano" && e === "escuchando") r += this.nivelAct * 0.1 * (0.5 + 0.5 * Math.sin(t * 8 + q.fase));
        if ((q.tipo === "ia" || q.tipo === "cian") && e === "hablando") r += this.pulsoAct * 0.07;
        const lat = q.lat + (q.anillo - q.lat) * this.orden;
        const sl = Math.sin(lat);
        const [x, y, z] = this._proyectar(r * sl * Math.cos(q.lon), r * Math.cos(lat), r * sl * Math.sin(q.lon));
        const capa = z > 0.35 ? 2 : z > -0.35 ? 1 : 0;
        const clave = q.tipo + capa + (q.brillo ? "b" : "");
        (grupos[clave] = grupos[clave] || []).push(x, y);
      }
      const oscuro = this.tema === "oscuro";
      const alfas = oscuro ? [0.22, 0.55, 0.95] : [0.18, 0.45, 0.9];
      const tamanos = [0.8, 1.1, 1.5];
      for (const clave in grupos) {
        const tipo = clave.replace(/\d.*$/, "");
        const capa = +clave.match(/\d/)[0];
        const brillo = clave.endsWith("b");
        const color = P[tipo];
        let a = alfas[capa];
        if (tipo === "humano" && e === "escuchando") a = Math.min(1, a + this.nivelAct * 0.4);
        if ((tipo === "ia" || tipo === "cian") && e === "hablando") a = Math.min(1, a + this.pulsoAct * 0.3);
        const s = tamanos[capa] * dpr * (brillo ? 1.7 : 1);
        ctx.fillStyle = rgba(color, a);
        ctx.beginPath();
        const v = grupos[clave];
        for (let i = 0; i < v.length; i += 2) { ctx.moveTo(v[i] + s, v[i + 1]); ctx.arc(v[i], v[i + 1], s, 0, TAU); }
        ctx.fill();
      }
    }

    /* Línea de escaneo que recorre la esfera */
    _escaneo(ctx, P, t) {
      const { cx, cy, R } = this;
      const ciclo = this.est === "pensando" ? 1.4 : 3.6;
      const f = (t % ciclo) / ciclo;
      if (f > 0.6) return;
      const y = cy - R * 1.05 + (f / 0.6) * R * 2.1;
      const semi = Math.sqrt(Math.max(0, (R * 1.05) ** 2 - (y - cy) ** 2));
      const g = ctx.createLinearGradient(cx - semi, y, cx + semi, y);
      const c = this.est === "escuchando" ? P.humano : P.cian;
      g.addColorStop(0, rgba(c, 0));
      g.addColorStop(0.5, rgba(c, this.tema === "oscuro" ? 0.5 : 0.35));
      g.addColorStop(1, rgba(c, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = 1 * this.dpr;
      ctx.beginPath(); ctx.moveTo(cx - semi, y); ctx.lineTo(cx + semi, y); ctx.stroke();
    }

    /* Núcleo dorado: punto nítido, anillo y ondas del latido; átomo en modo trabajo */
    _nucleo(ctx, P, t, dt) {
      const { cx, cy, R, dpr } = this, e = this.est;
      const periodo = e === "hablando" ? 0.72 : e === "escuchando" ? 0.92 : 1.25;
      const previa = this.faseLatido;
      this.faseLatido = (this.faseLatido + dt / periodo) % 1;
      const f = this.faseLatido;
      if ((previa < 0.08 && f >= 0.08) || (previa > f && f >= 0.08)) this.ondas.push({ r: 0.08, a: 1 });
      const latido = Math.exp(-Math.pow((f - 0.08) / 0.045, 2)) + 0.55 * Math.exp(-Math.pow((f - 0.28) / 0.055, 2));

      // ondas del latido (líneas finas)
      ctx.lineWidth = 1 * dpr;
      this.ondas = this.ondas.filter(o => {
        o.r += dt * 0.5; o.a -= dt * 0.9;
        if (o.a <= 0) return false;
        ctx.strokeStyle = rgba(P.oro, o.a * 0.6);
        ctx.beginPath(); ctx.arc(cx, cy, o.r * R, 0, TAU); ctx.stroke();
        return true;
      });

      const trabajo = this.orden;
      const rc = R * (0.05 + latido * 0.015 + this.pulsoAct * 0.012) * (1 - trabajo * 0.3);
      // brillo suave
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rc * 4);
      g.addColorStop(0, rgba(P.nucleo, this.tema === "oscuro" ? 0.55 : 0.35));
      g.addColorStop(1, rgba(P.nucleo, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, rc * 4, 0, TAU); ctx.fill();
      // punto y anillo
      ctx.fillStyle = this.tema === "oscuro" ? "rgba(255,248,225,1)" : rgba(P.oro, 1);
      ctx.beginPath(); ctx.arc(cx, cy, rc, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(P.oro, 0.9);
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath(); ctx.arc(cx, cy, rc * 2.1, -t * 2, -t * 2 + TAU * 0.75); ctx.stroke();

      // Modo trabajo: átomo en líneas finas
      if (trabajo > 0.02) {
        const a = trabajo;
        const giro = t * 3, d = rc * 1.3;
        ctx.fillStyle = rgba(P.oro, a);
        ctx.beginPath(); ctx.arc(cx + Math.cos(giro) * d, cy + Math.sin(giro) * d * 0.6, rc * 0.75, 0, TAU); ctx.fill();          // protón
        ctx.fillStyle = rgba(P.linea, a);
        ctx.beginPath(); ctx.arc(cx - Math.cos(giro) * d, cy - Math.sin(giro) * d * 0.6, rc * 0.75, 0, TAU); ctx.fill();          // neutrón
        for (let k = 0; k < 3; k++) {
          const ang = k * Math.PI / 3 + t * 0.4;
          const rx = R * 0.5, ry = R * 0.16;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
          ctx.lineWidth = 1 * dpr;
          ctx.strokeStyle = rgba(P.cian, 0.45 * a);
          ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.stroke();
          const te = t * (2.4 + k * 0.6) + k * 2;
          ctx.fillStyle = rgba(P.cian, a);
          ctx.beginPath(); ctx.arc(Math.cos(te) * rx, Math.sin(te) * ry, 2.2 * dpr, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  return OrbeRomus;
})();

/* Fábrica común: Romus tiene una sola apariencia (la esfera holográfica). */
window.crearOrbe = function (canvas) {
  return new OrbeRomus(canvas);
};
