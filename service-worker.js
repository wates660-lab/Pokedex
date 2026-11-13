// service-worker.js · Pokédex QR
const VERSION = 'v2';
const CACHE_SHELL = `pokedex-shell-${VERSION}`;
const CACHE_DATOS = `pokedex-datos-${VERSION}`;
const CACHE_IMAGENES = `pokedex-imagenes-${VERSION}`;
const CACHES_ACTUALES = [CACHE_SHELL, CACHE_DATOS, CACHE_IMAGENES];

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/storage.js',
  './js/api.js',
  './js/qr.js',
  './js/ui.js',
  './js/bolas.js',
  './js/pokedex.js',
  './js/progreso.js',
  './js/detalle.js',
  './js/captura.js',
  './lib/html5-qrcode.min.js',
  './fonts/press-start-2p-latin-400-normal.woff2',
  './fonts/vt323-latin-400-normal.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => !CACHES_ACTUALES.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// Sirve lo guardado y, en segundo plano, actualiza la copia.
async function cacheConActualizacion(peticion, nombreCache, ignorarBusqueda = false) {
  const cache = await caches.open(nombreCache);
  const guardado = await cache.match(peticion, { ignoreSearch: ignorarBusqueda });
  const red = fetch(peticion)
    .then((respuesta) => {
      if (respuesta && respuesta.ok) cache.put(peticion, respuesta.clone());
      return respuesta;
    })
    .catch(() => null);
  if (guardado) return guardado;
  const respuesta = await red;
  if (respuesta) return respuesta;
  if (peticion.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
  return Response.error();
}

async function redPrimero(peticion, nombreCache) {
  const cache = await caches.open(nombreCache);
  try {
    const respuesta = await fetch(peticion);
    if (respuesta && respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  } catch {
    return (await cache.match(peticion)) || Response.error();
  }
}

async function cachePrimero(peticion, nombreCache) {
  const cache = await caches.open(nombreCache);
  const guardado = await cache.match(peticion);
  if (guardado) return guardado;
  try {
    const respuesta = await fetch(peticion);
    // Solo se guardan respuestas CORS normales (las opacas pesan mucho en la cuota).
    if (respuesta && respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);

  if (url.origin === self.location.origin) {
    evento.respondWith(cacheConActualizacion(peticion, CACHE_SHELL, peticion.mode === 'navigate'));
  } else if (url.hostname === 'pokeapi.co') {
    evento.respondWith(redPrimero(peticion, CACHE_DATOS));
  } else if (url.hostname === 'raw.githubusercontent.com') {
    evento.respondWith(cachePrimero(peticion, CACHE_IMAGENES));
  }
});
