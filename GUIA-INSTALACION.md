# Guía de instalación de Romus en Microsoft Word

Tiempo aproximado: 15 minutos. Solo necesitas una cuenta gratuita de GitHub y, para las funciones de IA, una clave de API.

---

## Parte 1. Publicar Romus en internet (GitHub Pages, gratis)

Word exige que los complementos estén publicados en una dirección **https**. GitHub Pages la da gratis.

1. Descomprime `romus.zip` en tu computador. Verás la carpeta **`romus`**.
2. Entra a <https://github.com> e inicia sesión (o crea una cuenta gratuita).
3. Arriba a la derecha pulsa **+ → New repository**.
   - **Repository name:** `romus`
   - Marca **Public**.
   - Pulsa **Create repository**.
4. En la página del repositorio vacío pulsa el enlace **uploading an existing file**.
5. Abre la carpeta `romus` en tu computador, **selecciona todo su contenido** (Ctrl + A) y arrástralo a la página de GitHub.
   - Arrastra el **contenido**, no la carpeta `romus` en sí. Deben verse `manifest.xml`, `index.html`, `taskpane.html` y las carpetas `css`, `js` y `assets`.
   - Si Windows oculta el archivo `.nojekyll`, no pasa nada; es opcional.
6. Abajo pulsa **Commit changes** y espera a que termine de subir.
7. Ve a **Settings** (arriba en el repositorio) → **Pages** (menú de la izquierda).
   - En **Branch** elige **main** y la carpeta **/ (root)**.
   - Pulsa **Save**.
8. Espera 1 o 2 minutos y recarga la página. Arriba aparecerá: *«Your site is live at `https://TU-USUARIO.github.io/romus/`»*.
9. Abre esa dirección. Debe verse la página de Romus con su logo.

---

## Parte 2. Descargar tu manifiesto

El manifiesto (`manifest.xml`) es el archivo que le dice a Word dónde está Romus.

1. En la página de Romus que acabas de abrir (`https://TU-USUARIO.github.io/romus/`) pulsa **Descargar mi manifest.xml**.
2. Se descarga un `manifest.xml` **ya configurado con tu dirección**. Guárdalo en un lugar fácil, por ejemplo en Documentos.

> **Si prefieres hacerlo a mano:** abre `manifest.xml` en el Bloc de notas y reemplaza todas las apariciones de `https://TU-USUARIO.github.io/romus` por tu dirección real, sin la barra final.

---

## Parte 3. Agregar Romus a Word

Elige la opción según el Word que uses.

### Opción A. Word para la web (la más fácil)

Funciona con una cuenta gratuita de Microsoft y es donde mejor funciona el micrófono.

1. Entra a <https://www.office.com>, abre **Word** y abre o crea un documento.
2. En la pestaña **Inicio**, pulsa **Complementos** (en algunas versiones está en **Insertar → Complementos**).
3. Pulsa **Más complementos**.
4. Ve a la pestaña **Mis complementos** y pulsa **Cargar mi complemento** (*Upload My Add-in*).
5. Pulsa **Examinar**, elige tu `manifest.xml` y pulsa **Cargar**.
6. Aparece el botón **Romus** a la derecha de la pestaña **Inicio**. Púlsalo para abrir el panel.

### Opción B. Word de escritorio en Windows

**Primero prueba el camino rápido:** en **Inicio → Complementos → Más complementos**, busca **Mis complementos → Cargar mi complemento**. Si aparece, sigue los pasos 4 a 6 de la Opción A.

**Si no aparece, usa una carpeta compartida:**

1. Crea la carpeta `C:\RomusWord` y copia allí tu `manifest.xml`.
2. Clic derecho sobre la carpeta → **Propiedades** → pestaña **Compartir** → **Compartir…** → elige tu usuario → **Compartir** → **Listo**.
3. En esa misma ventana copia la **Ruta de acceso de red**, que se ve así: `\\NOMBRE-PC\RomusWord`.
4. Abre Word → **Archivo → Opciones → Centro de confianza → Configuración del Centro de confianza… → Catálogos de complementos de confianza**.
5. En **Dirección URL del catálogo** pega la ruta de red y pulsa **Agregar catálogo**.
6. Marca la casilla **Mostrar en el menú** y pulsa **Aceptar** dos veces.
7. **Cierra Word por completo** y vuelve a abrirlo.
8. Ve a **Inicio → Complementos → Más complementos → CARPETA COMPARTIDA**, elige **Romus** y pulsa **Agregar**.

### Opción C. Word para Mac

1. En Finder pulsa **Ir → Ir a la carpeta…** (Mayús + Cmd + G) y escribe:
   `~/Library/Containers/com.microsoft.Word/Data/Documents/wef`
   Si la carpeta `wef` no existe, créala.
2. Copia allí tu `manifest.xml`.
3. Cierra Word por completo y ábrelo de nuevo.
4. Ve a **Inicio → Complementos** y elige **Romus**.

---

## Parte 4. Conectar la inteligencia artificial

La lectura en voz alta funciona sin IA. Para corregir, resumir y responder necesitas una clave de API.

1. En el panel de Romus pulsa **Ajustes** (ícono de controles, arriba a la derecha).
2. En **IA en uso** pulsa **+ Agregar** y elige el proveedor:

| Proveedor | Dónde se consigue la clave | Nota |
|---|---|---|
| Claude (Anthropic) | console.anthropic.com → API Keys | Recomendado para corregir |
| Google Gemini | aistudio.google.com/apikey | Tiene plan gratuito con límites |
| OpenAI (ChatGPT) | platform.openai.com/api-keys | Se paga aparte de ChatGPT Plus |
| Groq · OpenRouter · DeepSeek · Mistral | en sus consolas | Económicos |
| Ollama · LM Studio | no necesitan clave | IA en tu propio computador, sin internet |

3. Pega la clave y pulsa **Cargar modelos** para ver los modelos disponibles.
4. Pulsa **Probar conexión y corrección**. Debe decir: *«Conexión correcta… sirve para corregir»*.
5. Cierra **Ajustes**. Abajo del panel verás la IA conectada, con un punto verde.

> **Consejo:** en la consola de tu proveedor fija un **límite de gasto mensual**. La clave se guarda solo en tu computador; no la compartas.

---

## Parte 5. Primer uso

1. Si el navegador lo pregunta, **permite el uso del micrófono**.
2. Activa **Siempre atento** en el panel.
3. Di: **«Ok Romus, lee el documento»**.
4. Prueba también:
   - «Ok Romus, corrige la ortografía»
   - «Ok Romus, resume el documento»
   - «Ok Romus, modo dictado»
   - «Gracias, Romus», para que quede en espera.
5. El botón **?** del panel muestra todos los comandos.

**Si el micrófono no funciona en Word de escritorio:** haz clic en la caja de texto del panel y pulsa **Windows + H** (en Mac, **Fn** dos veces). Dicta tu orden y se enviará sola cuando termines de hablar.

---

## Actualizar Romus a una versión nueva

1. En GitHub, dentro del repositorio `romus`, pulsa **Add file → Upload files**.
2. Arrastra el contenido de la carpeta nueva y pulsa **Commit changes**. Los archivos con el mismo nombre se reemplazan.
3. Cierra Word y ábrelo de nuevo.
   - Si cambió el ícono o el nombre, vuelve a cargar el `manifest.xml` (Parte 3).
   - En Windows, si sigue viéndose la versión anterior, borra la caché de complementos en `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\` con Word cerrado.

---

## Problemas frecuentes

| Problema | Solución |
|---|---|
| Word no carga el complemento | Abre `https://TU-USUARIO.github.io/romus/taskpane.html` en el navegador. Si no carga, revisa que GitHub Pages esté activado y que subiste el **contenido** de la carpeta. |
| No aparece «Cargar mi complemento» | Tu organización puede tenerlo bloqueado. Usa Word para la web con una cuenta personal, o la carpeta compartida (Opción B). |
| El panel dice «Falta conectar la IA» | Agrega una IA en Ajustes (Parte 4). |
| «La clave no es válida» o «sin saldo» | Copia de nuevo la clave desde la consola del proveedor, o recarga créditos. |
| Romus no responde a «Ok Romus» | Activa **Siempre atento** y permite el micrófono. En Word de escritorio usa **Windows + H**. |
| No aparecen el control de cambios ni los comentarios | Necesitas Microsoft 365, Word 2021 o Word para la web. |
