# Romus: asistente de voz con IA para Microsoft Word



**Romus** es un complemento (add-in) para Word. Se activa diciendo **«Ok Romus»** y abre un panel lateral con el que puedes:

- **Escuchar** el documento o la selección en voz alta. Mientras lee, va marcando cada párrafo. Puedes pausar, saltar y cambiar la velocidad.
- **Corregir** la ortografía y la gramática del documento completo o de una parte. Las correcciones quedan con **control de cambios**, así que puedes aceptarlas o rechazarlas una por una.
- **Revisar con comentarios**: deja observaciones en el margen sin tocar el texto.
- **Dar órdenes en lenguaje natural**, con la voz o escribiendo. Por ejemplo: «resume la introducción», «hazlo más formal», «cambia "alumnos" por "estudiantes" en todo el documento», «pon el título en negrita y centrado», «escribe una conclusión al final» o «ve a la conclusión y léela».

La lectura en voz alta funciona sin IA. Para corregir, responder y editar puedes conectar la IA que prefieras: Claude, ChatGPT, Gemini, Groq, OpenRouter, DeepSeek, Mistral o una IA local (Ollama, LM Studio).

---

## Instalación

Sigue **[GUIA-INSTALACION.md](GUIA-INSTALACION.md)**, que va paso a paso: publicar en GitHub Pages, descargar el manifiesto ya configurado desde la página de Romus, agregarlo a Word (web, Windows o Mac) y conectar la IA.

## Estructura del proyecto

```
romus/
├── manifest.xml          ← manifiesto del complemento (Word lo carga)
├── index.html            ← página de inicio: descarga tu manifiesto configurado
├── taskpane.html         ← panel de Romus
├── burbuja.html          ← ventana flotante
├── commands.html         ← archivo técnico que exige Word
├── css/
│   └── taskpane.css      ← diseño del panel (claro y oscuro)
├── js/
│   ├── app.js            ← lógica principal, comandos y «Ok Romus»
│   ├── voz.js            ← micrófono y lectura en voz alta
│   ├── ia.js             ← conexión con cualquier IA
│   ├── documento.js      ← lectura y edición del documento (Word API)
│   ├── panel.js          ← estadísticas y estructura del documento
│   ├── romus.js          ← la esfera de Romus
│   ├── escucha.js        ← oído propio en Word de escritorio
│   ├── orbe.js           ← medidor del micrófono
│   └── config.js         ← ajustes guardados en tu equipo
├── assets/
│   ├── iconos/           ← icon-16 … icon-512.png (cinta de Word)
│   └── logo/             ← logo en SVG (app, claro, oscuro)
├── GUIA-INSTALACION.md   ← paso a paso
└── LEEME.md              ← este archivo
```

## Conectar una IA (la que prefieras)

Romus funciona con **cualquier IA que tenga API**. En el panel pulsa el **engranaje → IA en uso → + Agregar**, elige el proveedor, pega la clave y pulsa **Probar conexión y corrección**. La prueba le pide al modelo que corrija una frase con errores y te dice si sirve para corregir o solo para conversar.

| Proveedor | Dónde se consigue la clave | Nota |
|---|---|---|
| **Claude (Anthropic)** | console.anthropic.com → API Keys | Recomendado para corregir: sigue las instrucciones con mucha precisión. |
| **OpenAI (ChatGPT)** | platform.openai.com/api-keys | La API se paga aparte de la suscripción de ChatGPT. |
| **Google Gemini** | aistudio.google.com/apikey | Tiene un plan gratuito con límites. |
| **Groq** | console.groq.com/keys | Muy rápido, con plan gratuito limitado. |
| **OpenRouter** | openrouter.ai/keys | Una sola clave para cientos de modelos de distintas empresas. |
| **DeepSeek / Mistral** | en sus consolas | Económicos. |
| **Ollama / LM Studio** | no necesitan clave | La IA corre **en tu computador**, sin internet: tus documentos no salen de tu equipo. |
| **Otra** | — | Cualquier API compatible con OpenAI: pegas la dirección (termina en `/v1`) y el modelo. |

- **Modelos:** los nombres cambian con el tiempo. Pulsa **Cargar modelos** para ver los que ofrece tu cuenta hoy.
- **Varias IA a la vez:** puedes guardar varias y cambiar entre ellas desde el chip de abajo del panel o con la voz: «usa Gemini», «usa Claude», «usa la IA local».
- **Modo básico:** algunos modelos (sobre todo los locales y pequeños) no manejan «herramientas». Romus lo detecta y cambia solo a un modo básico en el que les pide la respuesta en JSON. Funciona, pero corrige con menos precisión.
- **IA local con Ollama:** instala Ollama, descarga un modelo (`ollama pull qwen2.5`) y, para que Word pueda conectarse, inícialo con la variable de entorno `OLLAMA_ORIGINS=*`. En Windows: Configuración del sistema → Variables de entorno → nueva variable `OLLAMA_ORIGINS` con valor `*`, y reinicia Ollama.
- **LM Studio:** pestaña Developer → Start Server y activa **Enable CORS**.
- **Si un proveedor no conecta desde Word:** algunos bloquean las llamadas directas desde el navegador (CORS). En ese caso usa ese mismo modelo a través de OpenRouter.

**Sobre los costos:** cada proveedor cobra por uso. Corregir un documento largo completo es lo que más consume. En casi todas las consolas puedes fijar un **límite de gasto mensual**, y te recomiendo hacerlo.

**Sobre la seguridad:** la clave queda guardada solo en el equipo donde la escribes y viaja directamente al proveedor que elegiste. No la compartas. Si vas a distribuir el complemento a otras personas (por ejemplo, docentes del colegio), no pongas tu clave en el código: cada persona debe poner la suya, o se monta un pequeño servidor intermedio que la guarde (ver «Siguientes pasos»).

---

## Logo

El logo es minimalista: una **esfera** de línea fina cruzada por una **órbita inclinada** (azul a magenta, la voz), con el **punto dorado** de Romus viajando por ella. Tiene una versión reforzada para 16 y 32 px, para que se vea nítido en la cinta de Word.

Archivos en `assets/logo/` y `assets/iconos/`: `logo-romus-app.svg` y `logo-romus-app-claro.svg` (ícono de la app, oscuro y claro), `logo-romus-claro.svg` y `logo-romus-oscuro.svg` (marca sin fondo) y los PNG `icon-16` a `icon-512`.

## El panel

Diseño limpio, en la línea de Microsoft 365. La esfera de Romus es el centro y todo lo demás es sobrio:

- **Romus:** la esfera animada, su estado («Di «Ok Romus»», «Te escucho…», «Pensando…»), la IA y la voz en uso, y el botón para hablar.
- **Documento:** palabras, minutos de escucha, párrafos, cambios pendientes y legibilidad (índice de Fernández-Huerta para el español).
- **Estructura:** una barra por párrafo. Tocas una y Word salta a ese párrafo; se marcan los títulos, tu selección y lo que se está leyendo.
- **Acciones:** los comandos más usados. Al pasar el puntero se ve la frase de voz equivalente.
- **Voz de lectura:** voz, estilo, velocidad y tono.
- **Actividad:** lo que dijiste, lo que respondió Romus y lo que hizo, con la hora.

El panel sigue el tema de Office (claro u oscuro).

## Uso

- **Micrófono grande o `Ctrl + Espacio`:** habla un comando. Mientras escucha, el botón se pone rojo.
- **Siempre atento a «Ok Romus»:** el micrófono queda escuchando todo el tiempo y Romus obedece cuando lo llamas por su nombre (ver abajo). Mientras lee o responde, solo acepta «para», «pausa», «continúa», «siguiente», «anterior», «más rápido» y «más lento», para no oírse a sí mismo.
- **Caja de texto:** escribe cualquier comando y pulsa Enter.
- **Botón `?`:** muestra la lista de cosas que puedes decir.
- **Tarjeta «Voz de lectura»:** para elegir la **voz** (las del sistema, con país y si es de hombre o de mujer; las marcadas con ✦ son voces naturales) y un **estilo**: Natural, Narrador, Clase pausada, Calmado, Enérgico, Grave, Agudo o Lectura rápida. Tiene dos **barras**: **velocidad** (de 0,5× a 2×) y **tono**. Los cambios se aplican al instante, incluso mientras lee. Si mueves una barra, el estilo pasa a «Personalizado» y queda guardado.
- **Voz por comandos:** «estilo narrador», «modo calmado», «voz de mujer», «voz de hombre», «cambia la voz», «más grave», «más aguda», «más rápido», «más lento», «velocidad normal».

### Activar a Romus con la voz: «Ok Romus»

- Con **«Siempre atento a «Ok Romus»»** activado (viene así por defecto), Romus escucha en segundo plano pero **solo obedece cuando lo llamas**. Di **«Ok Romus»**, «Oye Romus» o «Hola Romus», seguido de tu orden en la misma frase: *«Ok Romus, léeme la conclusión»*.
- Si solo dices «Ok Romus», suena un aviso de dos tonos, la esfera se ilumina y Romus queda escuchando.
- Después de cada respuesta sigue atento unos 15 segundos, para que puedas continuar sin repetir su nombre.
- **«Gracias, Romus»** o **«eso es todo»** lo vuelve a poner en espera.
- Mientras lee, «para», «pausa», «continúa» y «siguiente» funcionan sin decir su nombre, para poder detenerlo rápido.
- Pulsar el micrófono o hacer clic en la esfera equivale a decir «Ok Romus».
- Lo que dices sin llamarlo **no se muestra ni se envía a la IA**. Si prefieres que obedezca todo lo que oye, desactiva en Ajustes la opción «esperar «Ok Romus» antes de cada orden».

### Modo voz, burbuja flotante y dictado

- **Modo voz** (ícono del círculo con onda, arriba en el panel, o di «modo voz»): la pantalla muestra la **esfera de Romus**, que cambia según lo que pasa. Debajo aparece el texto con la **palabra que se está leyendo resaltada**. Si tocas la esfera mientras habla, lo interrumpes.
- **La esfera de Romus:** un holograma limpio, de estilo futurista y minimalista, que combina con Word. Es una esfera de puntos nítidos sobre una malla fina, rodeada de anillos de interfaz con marcas y de un **ecualizador circular** que dibuja tu voz en magenta y la de Romus en cian. En el centro, un **núcleo dorado** late y envía una onda fina con cada latido. En reposo respira; cuando escucha se acerca; cuando trabaja, los puntos se ordenan en anillos, pasa una línea de escaneo y el núcleo se vuelve un **átomo**. Se adapta al tema de Office: azul Word sobre blanco en el tema claro y neón sobre azul noche en el oscuro. El modo claro u oscuro se cambia con el botón de luna/sol, en Ajustes → Apariencia o diciendo «modo oscuro» / «modo claro».
- **Burbuja flotante** (ícono del cuadro con círculo, o di «abre la burbuja»): abre una ventana pequeña con el orbe que puedes **mover a cualquier parte de la pantalla** mientras trabajas en el documento. Escucha tus comandos y muestra lo que está leyendo. El panel debe seguir abierto, porque es el que trabaja con el documento.
- **Modo dictado** (di «modo dictado»): lo que digas se escribe donde está el cursor. Reconoce la puntuación hablada: «punto», «coma», «dos puntos», «punto y coma», «nuevo párrafo», «abre/cierra interrogación», «abre/cierra exclamación», «abre/cierra comillas» y «abre/cierra paréntesis». Pone mayúscula al comenzar cada oración. «Borra eso» quita lo último dictado y «termina dictado» sale del modo.
- **Lectura con seguimiento:** al leer, Word selecciona la **frase** que se está leyendo, no el párrafo entero.

### Si el micrófono del panel no funciona

El micrófono del panel usa el reconocimiento de voz del navegador. Ese servicio funciona bien en **Word para la web con Chrome o Edge**. En **Word de escritorio** el panel corre en un navegador interno que muchas veces **no trae** ese servicio. Por eso Romus usa su propio oído (transcribe con Gemini, OpenAI o Groq) y además tiene un plan B que siempre funciona:

1. Haz clic en la caja de texto del panel.
2. Pulsa **Windows + H** (en Mac, **Fn** dos veces) y habla.
3. Cuando dejas de hablar, el comando se envía solo (se puede desactivar en Ajustes).

La lectura en voz alta usa las voces instaladas en tu sistema. En Windows, las voces «Natural» en español (por ejemplo, *Salome* para Colombia) suenan mucho mejor. Las eliges en Ajustes → Voz de lectura.

---

## Solución de problemas

| Problema | Solución |
|---|---|
| Word dice que no puede cargar el complemento | Revisa que reemplazaste todos los `TU-USUARIO` y que `https://TU-USUARIO.github.io/romus/taskpane.html` abre en el navegador. |
| Hice cambios en GitHub y no se ven | Word guarda una copia en caché. Cierra Word por completo y vuelve a abrirlo. En Windows también puedes borrar `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`. |
| «La clave de … no es válida» | Vuelve a copiarla de la consola de ese proveedor, sin espacios. |
| «Tu cuenta no tiene saldo o cuota» | Recarga créditos en la consola del proveedor, o cambia a otra IA (por ejemplo, Gemini con plan gratuito o una IA local). |
| «No pude conectar con Ollama / LM Studio» | Verifica que esté abierto y que permita conexiones desde Word: `OLLAMA_ORIGINS=*` en Ollama, o «Enable CORS» en LM Studio. |
| Algunas correcciones «no se pudieron ubicar» | Pasa cuando el fragmento está partido por formatos especiales o campos. Esas aparecen en «Ver detalle» y se corrigen a mano. |
| La burbuja no se abre | Word para la web puede pedir permiso para abrir una ventana emergente: acéptalo. La burbuja necesita Word 2021, Microsoft 365 o Word para la web. |
| Al dictar, la palabra «punto» o «coma» se convierte en signo | Es el comportamiento del modo dictado. Para escribir la palabra misma, escríbela a mano o sal del dictado. |
| No aparecen comentarios o el control de cambios | Necesitas Word 2021, Microsoft 365 o Word para la web. En Word 2016 y 2019 las correcciones se aplican sin control de cambios y las observaciones se resaltan en amarillo. |

---

## Siguientes pasos (ideas para versiones futuras)

- **Servidor intermedio** (por ejemplo, una función en Vercel o Cloudflare) que guarde la clave, para distribuir el complemento a un grupo sin que cada persona necesite la suya, y que permita llevar un control de uso.
- **Publicarlo en la tienda de Microsoft (AppSource)**, para que cualquiera lo instale con un clic. Requiere política de privacidad, soporte y pasar la validación de Microsoft.
- **Transcripción de voz propia** (por ejemplo, con Whisper) para que el micrófono funcione igual en todas las versiones de Word.
- Perfiles de corrección: normas APA, informes académicos, estilo institucional del colegio.

---

Autor: Brian Gonzalo Suárez Acevedo · Hecho con HTML, CSS y JavaScript (Office.js + API de Claude o compatible con OpenAI).
