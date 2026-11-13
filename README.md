# Pokédex QR

Proyecto final de Desarrollo de aplicaciones móviles.

Autora: Maria Isabel Ceballos Girón

Pokédex de la primera generación (#001 Bulbasaur a #151 Mew) hecha como PWA. Para capturar un Pokémon hay que escanear su código QR, que tiene el formato `pokemon:{id}`. La app consulta PokéAPI y guarda la colección en `localStorage`, es decir, solo en el navegador del dispositivo. No tiene backend, base de datos ni inicio de sesión, y no reproduce sonidos.

## Cómo ejecutar la aplicación

La cámara y el Service Worker solo funcionan con HTTPS o en `localhost`. Para probar en la computadora basta con levantar un servidor local; para probar en el celular, lo más fácil es publicar el proyecto en GitHub Pages (ver más abajo).

### Windows

1. Instala Python desde https://www.python.org/downloads/ (marca la opción "Add python.exe to PATH" durante la instalación).
2. Descomprime el proyecto, abre la carpeta `pokedex-qr` en el Explorador, haz clic derecho en un espacio vacío y elige "Abrir en Terminal". También puedes abrir PowerShell y usar `cd`:

```powershell
cd C:\ruta\a\pokedex-qr
py -m http.server 8000
```

3. Abre http://localhost:8000 en Chrome o Edge.
4. Para detener el servidor, presiona `Ctrl + C` en la terminal.

### macOS

macOS ya trae Python 3 (si no está, el sistema ofrece instalar las herramientas de línea de comandos la primera vez que lo uses).

1. Abre la app Terminal.
2. Entra a la carpeta del proyecto y levanta el servidor:

```bash
cd ~/Downloads/pokedex-qr
python3 -m http.server 8000
```

3. Abre http://localhost:8000 en Chrome, Edge o Safari.
4. Para detener el servidor, presiona `Control + C` en la terminal.

### Con Node.js (Windows o macOS)

Si ya tienes Node.js instalado, también sirve:

```bash
npx serve
```

### Modo de prueba sin cámara

Abre http://localhost:8000/?test=1, presiona Escanear y escribe un texto como `pokemon:25` en el campo que aparece. También puedes usar el botón "Subir imagen de QR" con alguna imagen de la carpeta `qr/`.

### En línea con GitHub Pages

1. Sube el proyecto a un repositorio de GitHub.
2. En el repositorio entra a Settings → Pages.
3. En "Build and deployment" elige "Deploy from a branch", rama `main` y carpeta `/ (root)`, y guarda.
4. Después de uno o dos minutos la app queda en `https://usuario.github.io/repositorio/`, que ya usa HTTPS y permite usar la cámara y instalar la PWA.

## Librería utilizada para QR

html5-qrcode v2.3.8 (https://github.com/mebjas/html5-qrcode). Está incluida en `lib/html5-qrcode.min.js`, por lo que no depende de un CDN. Lee la cámara o una imagen subida.

## Cómo instalar la PWA

- Android (Chrome): al abrir la app aparece un aviso para instalarla. También está el botón "Instalar Pokédex" en la pestaña Acerca de, o el menú ⋮ → "Instalar aplicación".
- iPhone y iPad (Safari): botón Compartir → "Añadir a pantalla de inicio".
- Windows y macOS (Chrome o Edge): ícono de instalar en la barra de direcciones.

Una vez instalada se abre como app independiente y la interfaz funciona sin conexión. Para capturar un Pokémon nuevo sí se necesita internet, porque los datos vienen de PokéAPI; si no hay conexión, la app lo avisa.

## Códigos QR

La carpeta `qr/` tiene los 151 códigos, de `001-bulbasaur.png` a `151-mew.png`. Cada uno contiene el texto `pokemon:{id}`, por ejemplo `pokemon:25` para Pikachu. El archivo `qr/hoja-151.pdf` los reúne para imprimirlos.

Para regenerarlos:

```bash
pip install "qrcode[pil]"
python crear_qr.py
```

## Funciones

- Lector QR con validación del formato (`pokemon:` más un número entre 1 y 151), con manejo de QR inválido, ilegible, cámara rechazada y dispositivo sin cámara.
- Consulta a PokéAPI con estados de carga y error, y opción de reintentar.
- Animación de captura con Pokéball y vibración en dispositivos compatibles.
- Pokémon Shiny, con una probabilidad de 1 entre 20.
- Colección en `localStorage` sin duplicados, que se conserva al cerrar y volver a abrir la app.
- Pantallas: Mi Pokédex (con buscador y filtros), detalle en Bottom Sheet, Progreso con medallas de Kanto, y Acerca de.
- Bottom Navigation, Floating Action Button y avisos tipo Toast.
- PWA instalable con manifest, Service Worker y funcionamiento offline de la interfaz.

## Estructura

```
pokedex-qr/
├── index.html
├── manifest.json
├── service-worker.js
├── js/        código de la app
├── css/       styles.css (Tailwind compilado)
├── src/       input.css (fuente de los estilos)
├── fonts/ icons/ lib/ qr/
└── crear_qr.py · crear_iconos.py
```

Si cambias los estilos, recompila con `npm install` y `npm run build:css`.

Datos e imágenes de los Pokémon: PokéAPI.
