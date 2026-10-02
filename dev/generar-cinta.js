/* Genera la pestaña «Romus» de la cinta de Word: íconos (16, 32 y 80 px) y manifiestos.
   Uso (desde una carpeta con Playwright instalado):
     node generar-cinta.js <carpeta-romus> <usuario-github-o-TU-USUARIO> <salida-manifest.xml> [version]
   La información de cada botón sale del catálogo único js/herramientas.js. */
const fs = require("fs"), path = require("path");
const [, , ROOT, USUARIO, SALIDA, VERSION = "3.0.0.0"] = process.argv;
global.window = global; global.Inv = { _h: {} };
require(path.join(ROOT, "js/herramientas.js"));
const HT = global.Herramientas;
const BASE = `https://${USUARIO}.github.io/romus`;
const x = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Botones que no son herramientas del catálogo
const EXTRA = {
  Hablar: ["Hablar", "Activa el micrófono: di lo que necesitas sin escribir «Ok Romus».", "hablar"],
  ModoVoz: ["Modo voz", "Romus a pantalla completa para conversar por voz.", "modovoz"],
  Burbuja: ["Burbuja", "Romus en una ventanita flotante, sin el panel lateral.", "burbuja"],
  Leer: ["Leer", "Lee el documento en voz alta.", "leer"], LeerSel: ["Leer selección", "Lee en voz alta lo que tienes seleccionado.", "leersel"],
  Corregir: ["Corregir", "Corrige ortografía y gramática con control de cambios.", "corregir"], Revisar: ["Revisar", "Revisa el documento y deja comentarios.", "revisar"],
  Resumir: ["Resumir", "Resume el documento en pocas frases.", "resumir"], Explicar: ["Explicar", "Explica con palabras sencillas lo seleccionado.", "explicar"],
  Simplificar: ["Simplificar", "Reescribe la selección con un lenguaje más sencillo.", "simplificar"], Formal: ["Más formal", "Reescribe la selección con tono académico.", "formal"],
  Dictar: ["Dictar", "Lo que digas se escribe en el documento.", "dictar"], Ayuda: ["Qué puedo decir", "Comandos de voz y colores de Romus.", "ayuda"],
  Asesor: ["Asesor", "Tu asesor de investigación: te guía según dónde estés.", "asesor"], MiProyecto: ["Mi proyecto", "Avance, etapa, cronograma y sesiones de asesoría.", "proyecto"],
  ConectarIA: ["Conectar IA", "Conecta tu IA con un clic (OpenRouter), pegando cualquier clave (Gemini gratis, Claude, OpenAI…) o restaurando un respaldo.", "conectar"],
  NivelPregrado: ["Pregrado", "Trabajo de grado de pregrado.", "nivel"], NivelEspecializacion: ["Especialización", "Trabajo aplicado o de intervención.", "nivel"],
  NivelMaestria: ["Maestría", "Tesis de investigación o de profundización.", "nivel"], NivelDoctorado: ["Doctorado", "Proyecto de tesis doctoral.", "nivel"],
  NivelPosdoctorado: ["Posdoctorado", "Proyecto posdoctoral financiable.", "nivel"],
  EnfoqueCuantitativo: ["Cuantitativo", "Hipótesis, variables, muestra estadística, SPSS o R.", "enfoque"], EnfoqueCualitativo: ["Cualitativo", "Categorías, participantes, saturación, ATLAS.ti.", "enfoque"],
  EnfoqueMixto: ["Mixto", "Combina e integra datos cuantitativos y cualitativos.", "enfoque"], EnfoqueTeorico: ["Teórico-documental", "Filosofía o teoría: corpus de textos, fichas de análisis y tesis a defender.", "enfoque"],
  EtapaTema: ["1. Idea y tema", "Define un tema acotado.", "bombillo"], EtapaPlanteamiento: ["2. Planteamiento", "Problema, pregunta, objetivos y justificación.", "coherencia"],
  EtapaFundamentacion: ["3. Fundamentación", "Antecedentes, estado del arte y marco teórico.", "libro"], EtapaMetodologia: ["4. Metodología", "Enfoque, diseño, participantes o corpus, instrumentos y análisis.", "instrumento"],
  EtapaCampo: ["5. Trabajo de campo", "Validación, piloto y recolección (o corpus y fichaje en tesis teóricas).", "validacion"], EtapaResultados: ["6. Resultados", "Análisis y resultados o hallazgos.", "spss"],
  EtapaDiscusion: ["7. Discusión", "Discusión, conclusiones y limitaciones.", "discusion"], EtapaSustentacion: ["8. Sustentación", "Presentación y simulacro de jurado.", "sustentacion"],
  Crear: ["Crear proyecto ★", "Crea tu proyecto completo desde cero con el método Kuetz (Pro).", "crear"]
};
const info = (clave) => {
  if (EXTRA[clave]) return { fn: "romus" + clave, nombre: EXTRA[clave][0], desc: EXTRA[clave][1], ico: EXTRA[clave][2] };
  const t = HT.porId(clave); if (!t) throw new Error("No existe la herramienta " + clave);
  return { fn: HT.nombreFuncion(t.id), nombre: t.nombre, desc: t.desc, ico: t.ico };
};
// Etiquetas cortas, como las de Word (el nombre completo queda en la información sobre herramientas).
const CORTOS = {
  apaasesor: "Asesor APA", aparevisor: "Revisor", apaformato: "Formato", apareferencia: "Referencia",
  literatura: "Literatura", biblioteca: "Biblioteca", matriz: "Matriz", sincita: "Sin cita", fidelidad: "Fidelidad",
  pendientes: "Por confirmar", existen: "Verificar", muestra: "Muestra", validacion: "Validación", spss: "SPSS o R",
  resumen: "Resumen", articulo: "Artículo", usoia: "Uso de IA", diapositivas: "Presentación", sustentacion: "Simulacro",
  director: "Modo director", Ayuda: "Comandos", LeerSel: "Leer selección", Crear: "Crear ★", ruta: "Ruta de mi tesis"
};
/* Estructura de la pestaña, al estilo de Word: cada grupo es una función y sus botones son las subfunciones.
   La primera es la acción principal; Word muestra las demás como botones pequeños apilados cuando el grupo
   tiene más de tres (lo decide Office según el espacio). Máximo 7 por grupo, como recomienda Microsoft. */
const GRUPOS = [
  { id: "Voz", nombre: "Romus", ico: "logo", controles: ["ABRIR", "Hablar", "ModoVoz", "Burbuja", "Dictar", "Leer", "ConectarIA"] },
  { id: "Tesis", nombre: "Mi tesis", ico: "nivel", controles: ["ruta",
    { menu: "Nivel", nombre: "Nivel", ico: "nivel", items: ["NivelPregrado", "NivelEspecializacion", "NivelMaestria", "NivelDoctorado", "NivelPosdoctorado"] },
    { menu: "Enfoque", nombre: "Enfoque", ico: "enfoque", items: ["EnfoqueCuantitativo", "EnfoqueCualitativo", "EnfoqueMixto", "EnfoqueTeorico"] },
    { menu: "Etapas", nombre: "Etapas", ico: "etapas", items: ["EtapaTema", "EtapaPlanteamiento", "EtapaFundamentacion", "EtapaMetodologia", "EtapaCampo", "EtapaResultados", "EtapaDiscusion", "EtapaSustentacion"] },
    "MiProyecto", "estructura"] },
  { id: "Texto", nombre: "Texto", ico: "corregir", controles: ["Corregir", "Revisar", "Resumir", "Explicar", "Simplificar", "Formal", "LeerSel"] },
  { id: "Proy", nombre: "Proyecto", ico: "asesor", controles: ["Asesor", "Crear", "idear", "coherencia", "rubrica"] },
  { id: "Fuentes", nombre: "Fuentes y citas", ico: "libro", controles: ["literatura", "biblioteca", "matriz", "existen", "fidelidad", "sincita", "pendientes"] },
  { id: "Metodo", nombre: "Método y datos", ico: "instrumento", controles: ["instrumento", "muestra", "validacion", "etica", "spss", "atlas"] },
  { id: "Escribir", nombre: "Escribir", ico: "discusion", controles: ["discusion", "conclusiones", "resumen", "articulo", "usoia"] },
  { id: "Apa", nombre: "APA 7", ico: "apa", controles: ["aparevisor", "apaformato", "apareferencia", "apaasesor"] },
  { id: "Entregar", nombre: "Entregar", ico: "sustentacion", controles: ["diapositivas", "sustentacion", "observaciones", "acta", "director"] },
  { id: "Ayuda", nombre: "Aprender", ico: "guia", controles: ["guia", "tutorial", "teoria", "Ayuda"] }
];

const imgs = new Map(), cortas = new Map(), largas = new Map();
const icono = (ico) => { const id = "I." + ico; imgs.set(ico, id); return `<Icon><bt:Image size="16" resid="${id}.16"/><bt:Image size="32" resid="${id}.32"/><bt:Image size="80" resid="${id}.80"/></Icon>`; };
const iconoLogo = `<Icon><bt:Image size="16" resid="Icon.16x16"/><bt:Image size="32" resid="Icon.32x32"/><bt:Image size="80" resid="Icon.80x80"/></Icon>`;
const etiqueta = (clave, texto) => { const id = ("L." + clave).slice(0, 32); cortas.set(id, texto); return id; };
const tip = (clave, texto) => { const id = ("T." + clave).slice(0, 32); largas.set(id, texto); return id; };
function control(c, dentroMenu) {
  if (c === "ABRIR") return `<Control xsi:type="Button" id="Romus.Abrir"><Label resid="${etiqueta("Abrir", "Abrir Romus")}"/><Supertip><Title resid="L.Abrir"/><Description resid="${tip("Abrir", "Abre el panel de Romus: la esfera, la conversación y los resultados.")}"/></Supertip>${iconoLogo}<Action xsi:type="ShowTaskpane"><TaskpaneId>VozDocPanel</TaskpaneId><SourceLocation resid="Taskpane.Url"/></Action></Control>`;
  const i = info(c), nombre = CORTOS[c] || i.nombre;
  const tag = dentroMenu ? "Item" : "Control";
  return `<${tag}${dentroMenu ? "" : ' xsi:type="Button"'} id="Romus.${i.fn}"><Label resid="${etiqueta(c, nombre)}"/><Supertip><Title resid="${etiqueta(c + ".t", i.nombre)}"/><Description resid="${tip(c, i.desc)}"/></Supertip>${icono(i.ico)}<Action xsi:type="ExecuteFunction"><FunctionName>${i.fn}</FunctionName></Action></${tag}>`;
}
function menu(m) {
  return `<Control xsi:type="Menu" id="Romus.Menu.${m.menu}"><Label resid="${etiqueta("M." + m.menu, m.nombre)}"/><Supertip><Title resid="L.M.${m.menu}"/><Description resid="${tip("M." + m.menu, m.nombre + ": " + m.items.map(k => (EXTRA[k] ? EXTRA[k][0] : HT.porId(k).nombre)).join(", ") + ".")}"/></Supertip>${icono(m.ico)}<Items>${m.items.map(k => control(k, true)).join("")}</Items></Control>`;
}
const PPT = [
  ["romusPptEnsayo", "Ensayo", "Ensaya tu sustentación con cronómetro por diapositiva, tiempo total y tus notas del orador.", "cronometro"],
  ["romusPptRevision", "Revisar diapositivas", "Avisa cuando hay demasiado texto, letra pequeña, muchas viñetas o diapositivas sin notas.", "revisor"],
  ["romusPptJurado", "Simulacro de jurado", "Romus te pregunta como un jurado sobre tus diapositivas y evalúa tus respuestas por voz.", "sustentacion"]
];
const grupos = GRUPOS.map(g => `<Group id="Romus.G.${g.id}"><Label resid="${etiqueta("G." + g.id, g.nombre)}"/>${g.ico === "logo" ? iconoLogo : icono(g.ico)}${g.controles.map(c => typeof c === "string" ? control(c) : menu(c)).join("")}</Group>`).join("\n              ");

const manifiesto = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Romus para Word — Manifiesto del complemento.
  ${USUARIO === "TU-USUARIO" ? "No lo edites a mano: abre la página de Romus publicada (index.html) y pulsa «Descargar mi manifest.xml»." : "Generado para " + BASE}
  Generado por dev/generar-cinta.js a partir de js/herramientas.js.
-->
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0"
           xmlns:ov="http://schemas.microsoft.com/office/taskpaneappversionoverrides"
           xsi:type="TaskPaneApp">
  <Id>5f564e3f-5a46-472e-8454-27f2c1cdfc22</Id>
  <Version>${VERSION}</Version>
  <ProviderName>Brian Suárez</ProviderName>
  <DefaultLocale>es-ES</DefaultLocale>
  <DisplayName DefaultValue="Romus"/>
  <Description DefaultValue="Romus: asistente de voz con IA y asesor de investigación para Word y PowerPoint. Lee, corrige, aplica normas APA 7, te acompaña desde la idea hasta la sustentación y te ayuda a ensayarla."/>
  <IconUrl DefaultValue="${BASE}/assets/iconos/icon-32.png"/>
  <HighResolutionIconUrl DefaultValue="${BASE}/assets/iconos/icon-64.png"/>
  <SupportUrl DefaultValue="${BASE}/"/>
  <AppDomains>
    <AppDomain>https://api.anthropic.com</AppDomain>
  </AppDomains>
  <Hosts>
    <Host Name="Document"/>
    <Host Name="Presentation"/>
  </Hosts>
  <DefaultSettings>
    <SourceLocation DefaultValue="${BASE}/taskpane.html"/>
  </DefaultSettings>
  <Permissions>ReadWriteDocument</Permissions>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="Document">
        <Runtimes>
          <Runtime resid="Taskpane.Url" lifetime="long"/>
        </Runtimes>
        <DesktopFormFactor>
          <GetStarted>
            <Title resid="GetStarted.Title"/>
            <Description resid="GetStarted.Description"/>
            <LearnMoreUrl resid="GetStarted.LearnMoreUrl"/>
          </GetStarted>
          <FunctionFile resid="Taskpane.Url"/>
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <OfficeTab id="TabHome">
              <Group id="VozDoc.Group">
                <Label resid="Group.Label"/>
                ${iconoLogo}
                <Control xsi:type="Button" id="VozDoc.AbrirPanel">
                  <Label resid="Button.Label"/>
                  <Supertip><Title resid="Button.Label"/><Description resid="Button.Tooltip"/></Supertip>
                  ${iconoLogo}
                  <Action xsi:type="ShowTaskpane"><TaskpaneId>VozDocPanel</TaskpaneId><SourceLocation resid="Taskpane.Url"/></Action>
                </Control>
              </Group>
            </OfficeTab>
            <CustomTab id="Romus.Tab">
              ${grupos}
              <Label resid="Tab.Label"/>
            </CustomTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
      <Host xsi:type="Presentation">
        <Runtimes>
          <Runtime resid="Ppt.Url" lifetime="long"/>
        </Runtimes>
        <DesktopFormFactor>
          <GetStarted>
            <Title resid="GetStarted.Title"/>
            <Description resid="GetStarted.DescPpt"/>
            <LearnMoreUrl resid="GetStarted.LearnMoreUrl"/>
          </GetStarted>
          <FunctionFile resid="Ppt.Url"/>
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <CustomTab id="Romus.TabPpt">
              <Group id="Romus.G.Sustentacion">
                <Label resid="L.G.Sust"/>
                ${iconoLogo}
                <Control xsi:type="Button" id="Romus.Ppt.Abrir">
                  <Label resid="L.Abrir"/>
                  <Supertip><Title resid="L.Abrir"/><Description resid="T.PptAbrir"/></Supertip>
                  ${iconoLogo}
                  <Action xsi:type="ShowTaskpane"><TaskpaneId>RomusPpt</TaskpaneId><SourceLocation resid="Ppt.Url"/></Action>
                </Control>
                ${PPT.map(([fn, et, tipo, ico]) => `<Control xsi:type="Button" id="Romus.${fn}"><Label resid="${etiqueta(fn, et)}"/><Supertip><Title resid="L.${fn}"/><Description resid="${tip(fn, tipo)}"/></Supertip>${icono(ico)}<Action xsi:type="ExecuteFunction"><FunctionName>${fn}</FunctionName></Action></Control>`).join("\n                ")}
              </Group>
              <Label resid="Tab.Label"/>
            </CustomTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>
    <Resources>
      <bt:Images>
        <bt:Image id="Icon.16x16" DefaultValue="${BASE}/assets/iconos/icon-16.png"/>
        <bt:Image id="Icon.32x32" DefaultValue="${BASE}/assets/iconos/icon-32.png"/>
        <bt:Image id="Icon.80x80" DefaultValue="${BASE}/assets/iconos/icon-80.png"/>
${[...imgs.entries()].map(([ico, id]) => [16, 32, 80].map(s => `        <bt:Image id="${id}.${s}" DefaultValue="${BASE}/assets/iconos/cinta/${ico}-${s}.png"/>`).join("\n")).join("\n")}
      </bt:Images>
      <bt:Urls>
        <bt:Url id="Taskpane.Url" DefaultValue="${BASE}/taskpane.html"/>
        <bt:Url id="Ppt.Url" DefaultValue="${BASE}/ppt.html"/>
        <bt:Url id="GetStarted.LearnMoreUrl" DefaultValue="${BASE}/tutorial.html"/>
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="GetStarted.Title" DefaultValue="Romus está listo"/>
        <bt:String id="Group.Label" DefaultValue="Romus"/>
        <bt:String id="Button.Label" DefaultValue="Romus"/>
        <bt:String id="Tab.Label" DefaultValue="Romus"/>
        <bt:String id="L.G.Sust" DefaultValue="Sustentación"/>
${[...cortas.entries()].map(([id, t]) => `        <bt:String id="${id}" DefaultValue="${x(t)}"/>`).join("\n")}
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="GetStarted.Description" DefaultValue="Usa la pestaña «Romus» de la cinta o di «Ok Romus» seguido de tu orden."/>
        <bt:String id="GetStarted.DescPpt" DefaultValue="Abre la pestaña «Romus» para ensayar tu sustentación, revisar tus diapositivas y hacer el simulacro de jurado."/>
        <bt:String id="T.PptAbrir" DefaultValue="Abre Romus en PowerPoint: ensayo con cronómetro, revisión de diapositivas y simulacro de jurado."/>
        <bt:String id="Button.Tooltip" DefaultValue="Abre Romus: voz, corrección con IA, asesor de investigación y normas APA 7."/>
${[...largas.entries()].map(([id, t]) => `        <bt:String id="${id}" DefaultValue="${x(t)}"/>`).join("\n")}
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>
`;
fs.writeFileSync(SALIDA, manifiesto);
// Lista de íconos que hay que dibujar
fs.writeFileSync(SALIDA + ".iconos.json", JSON.stringify([...imgs.keys()].map(k => ({ k, svg: HT.ICO[k] }))));
console.log("Manifiesto:", SALIDA, "· íconos:", imgs.size, "· cadenas:", cortas.size + largas.size);
