/* Dibuja los íconos PNG de la cinta (16, 32 y 80 px) a partir de los trazos SVG del catálogo.
   Uso: node dibujar-iconos.js <lista.iconos.json> <carpeta-salida> */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const [, , LISTA, SALIDA] = process.argv;
(async () => {
  const iconos = JSON.parse(fs.readFileSync(LISTA, "utf8"));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  for (const size of [16, 32, 80]) {
    const grosor = size === 16 ? 2.1 : size === 32 ? 1.8 : 1.6;
    await page.setContent(`<html><body style="margin:0;background:transparent">${iconos.map(i => `<svg id="i-${i.k}" width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;fill:none;stroke:#1f6fd1;stroke-width:${grosor};stroke-linecap:round;stroke-linejoin:round">${i.svg}</svg>`).join("")}</body></html>`);
    for (const i of iconos) await page.locator("#i-" + i.k).screenshot({ path: path.join(SALIDA, `${i.k}-${size}.png`), omitBackground: true });
  }
  await browser.close();
  console.log("Íconos:", iconos.length * 3);
})();
