/* Romus — medidor del micrófono para animar la esfera (la antigua apariencia «cielo» se retiró). */
window.Orbe = (function () {
  const Orbe = {};

  /* ---- Nivel del micrófono (opcional; si no hay permiso, la esfera anima igual) ---- */
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
