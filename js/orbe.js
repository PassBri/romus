/* VozDoc IA — orbe animado de cielo con nubes (canvas).
   Estados: "reposo", "escuchando", "pensando", "hablando".
   Uso: const o = new Orbe(canvas); o.estado("escuchando"); o.nivel(0..1); o.pulso(); */
window.Orbe = (function () {
  const TAU = Math.PI * 2;

  // Paletas de cielo por estado: [arriba, medio, abajo]
  const CIELOS = {
    reposo:     [[30, 98, 214], [78, 158, 240], [178, 222, 252]],
    escuchando: [[28, 112, 232], [80, 178, 250], [214, 240, 255]],
    pensando:   [[74, 86, 196],  [128, 148, 236], [212, 214, 250]],
    hablando:   [[34, 118, 220], [110, 184, 246], [255, 228, 200]]
  };

  function mezclar(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }
  function rgb(c, a) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a == null ? 1 : a})`; }

  function crearNube(semilla, lejana) {
    const r = (n) => { const x = Math.sin(semilla * 97.13 + n * 13.7) * 43758.5453; return x - Math.floor(x); };
    const bocanadas = [];
    const n = 4 + Math.floor(r(1) * 4);
    for (let k = 0; k < n; k++) {
      bocanadas.push({ dx: (r(k + 2) - 0.5) * 0.55, dy: (r(k + 9) - 0.5) * 0.16, r: 0.12 + r(k + 17) * 0.13 });
    }
    return {
      x: r(3) * 2.6 - 1.3,
      y: (r(4) - 0.5) * 1.5,
      escala: lejana ? 0.55 + r(5) * 0.3 : 0.8 + r(5) * 0.6,
      vel: (lejana ? 0.018 : 0.035) * (0.6 + r(6) * 0.8),
      fase: r(7) * TAU,
      alfa: lejana ? 0.22 : 0.8,
      bocanadas
    };
  }

  class Orbe {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext("2d");
      this.est = "reposo";
      this.cielo = CIELOS.reposo.map(x => x.slice());
      this.nivelObj = 0; this.nivelAct = 0;
      this.pulsoAct = 0;
      this.giro = 0;
      this.t = 0;
      this.ultimo = performance.now();
      this.nubes = [];
      for (let k = 0; k < 6; k++) this.nubes.push(crearNube(k + 1.3, true));
      for (let k = 0; k < 5; k++) this.nubes.push(crearNube(k + 20.7, false));
      this.activo = true;
      this._cuadro = this._cuadro.bind(this);
      this._ajustar();
      this._obs = window.ResizeObserver ? new ResizeObserver(() => this._ajustar()) : null;
      if (this._obs) this._obs.observe(canvas);
      requestAnimationFrame(this._cuadro);
    }

    estado(e) { if (CIELOS[e]) this.est = e; }
    nivel(v) { this.nivelObj = Math.max(0, Math.min(1, v)); }
    pulso(f) { this.pulsoAct = Math.min(1, this.pulsoAct + (f || 0.55)); }
    detener() { this.activo = false; if (this._obs) this._obs.disconnect(); }

    _ajustar() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.c.clientWidth || 200, h = this.c.clientHeight || 200;
      this.c.width = Math.round(w * dpr);
      this.c.height = Math.round(h * dpr);
      this.dpr = dpr;
    }

    _cuadro(ahora) {
      if (!this.activo) return;
      const dt = Math.min(0.05, (ahora - this.ultimo) / 1000);
      this.ultimo = ahora;
      if (!document.hidden) this._dibujar(dt);
      requestAnimationFrame(this._cuadro);
    }

    _dibujar(dt) {
      const ctx = this.ctx, W = this.c.width, H = this.c.height;
      this.t += dt;
      // suavizados
      const objetivo = CIELOS[this.est];
      this.cielo = this.cielo.map((c, i) => mezclar(c, objetivo[i], Math.min(1, dt * 2.5)));
      this.nivelAct += (this.nivelObj - this.nivelAct) * Math.min(1, dt * 12);
      this.pulsoAct = Math.max(0, this.pulsoAct - dt * 2.2);

      let respiro = 0.5 + 0.5 * Math.sin(this.t * 1.2);
      let escala = 1;
      if (this.est === "reposo") escala = 0.96 + respiro * 0.025;
      if (this.est === "escuchando") escala = 0.97 + this.nivelAct * 0.14 + respiro * 0.01;
      if (this.est === "pensando") escala = 0.95 + (0.5 + 0.5 * Math.sin(this.t * 3)) * 0.035;
      if (this.est === "hablando") escala = 0.97 + this.pulsoAct * 0.07 + respiro * 0.01;

      const velViento = this.est === "escuchando" ? 1 + this.nivelAct * 4
        : this.est === "pensando" ? 2.2
        : this.est === "hablando" ? 1.3 + this.pulsoAct * 2 : 1;
      this.giro += dt * (this.est === "pensando" ? 0.9 : 0.05);

      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.40 * escala;

      ctx.clearRect(0, 0, W, H);

      // halo exterior
      const halo = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.25);
      const intensidadHalo = 0.18 + this.nivelAct * 0.35 + this.pulsoAct * 0.25 + (this.est === "pensando" ? 0.12 * respiro : 0);
      halo.addColorStop(0, rgb(this.cielo[1], intensidadHalo));
      halo.addColorStop(1, rgb(this.cielo[1], 0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, TAU); ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();

      // cielo
      const g = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
      g.addColorStop(0, rgb(this.cielo[0]));
      g.addColorStop(0.55, rgb(this.cielo[1]));
      g.addColorStop(1, rgb(this.cielo[2]));
      ctx.fillStyle = g;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      // resplandor de sol
      const sx = cx + R * 0.35 * Math.cos(this.t * 0.07), sy = cy - R * 0.45;
      const sol = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 0.9);
      sol.addColorStop(0, `rgba(255,255,240,${0.35 + this.pulsoAct * 0.2})`);
      sol.addColorStop(1, "rgba(255,255,240,0)");
      ctx.fillStyle = sol;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      // nubes (con giro suave del campo)
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(this.giro) * (this.est === "pensando" ? 0.5 : 0.12));
      for (const n of this.nubes) {
        n.x += n.vel * velViento * dt;
        if (n.x > 1.45) n.x = -1.45;
        const y = n.y + Math.sin(this.t * 0.35 + n.fase) * 0.05;
        for (const b of n.bocanadas) {
          const px = (n.x + b.dx * n.escala) * R, py = (y + b.dy * n.escala) * R;
          const pr = b.r * n.escala * R * (1 + this.pulsoAct * 0.08);
          const gr = ctx.createRadialGradient(px, py - pr * 0.25, pr * 0.1, px, py, pr);
          gr.addColorStop(0, `rgba(255,255,255,${n.alfa})`);
          gr.addColorStop(0.45, `rgba(255,255,255,${n.alfa * 0.9})`);
          gr.addColorStop(0.75, `rgba(255,255,255,${n.alfa * 0.35})`);
          gr.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // brillo de esfera
      const brillo = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.45, R * 0.05, cx - R * 0.2, cy - R * 0.3, R * 1.1);
      brillo.addColorStop(0, "rgba(255,255,255,0.35)");
      brillo.addColorStop(0.35, "rgba(255,255,255,0.06)");
      brillo.addColorStop(1, "rgba(0,30,80,0.12)");
      ctx.fillStyle = brillo;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.restore();

      // borde fino
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1 * this.dpr;
      ctx.stroke();
    }
  }

  /* ---- Nivel del micrófono (opcional; si no hay permiso, el orbe anima igual) ---- */
  Orbe.medirMicrofono = async function (alNivel) {
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      const fuente = ac.createMediaStreamSource(flujo);
      const an = ac.createAnalyser();
      an.fftSize = 512;
      fuente.connect(an);
      const datos = new Uint8Array(an.fftSize);
      let vivo = true;
      (function medir() {
        if (!vivo) return;
        an.getByteTimeDomainData(datos);
        let s = 0;
        for (let i = 0; i < datos.length; i++) { const v = (datos[i] - 128) / 128; s += v * v; }
        alNivel(Math.min(1, Math.sqrt(s / datos.length) * 4));
        requestAnimationFrame(medir);
      })();
      return () => { vivo = false; flujo.getTracks().forEach(t => t.stop()); ac.close(); };
    } catch (e) {
      return () => {};
    }
  };

  return Orbe;
})();
