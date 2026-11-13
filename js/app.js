// app.js · Pokédex QR · Autora: Maria Isabel Ceballos Girón
import { TOTAL } from './config.js';
import {
  cargarColeccion, cargarPrefs, guardarPrefs, prefs, estadoAlmacen, borrarColeccion, obtenerColeccion,
} from './storage.js';
import { renderizarPokedex, filtros } from './pokedex.js';
import { actualizarProgreso, sincronizarMedallas } from './progreso.js';
import { montarDetalle, abrirDetalle } from './detalle.js';
import { montarCaptura, abrirEscaner } from './captura.js';
import { $, $$, dormir, mostrarToast, confirmar, vibrar, reducirMovimiento } from './ui.js';

// Navegación (Bottom Navigation Bar)
const VISTAS = ['pokedex', 'progreso', 'acerca'];

function irA(vista) {
  if (!VISTAS.includes(vista)) return;
  VISTAS.forEach((v) => { $(`#vista-${v}`).hidden = v !== vista; });
  $$('.dock__btn').forEach((b) => {
    const activo = b.dataset.ir === vista;
    b.classList.toggle('is-activo', activo);
    if (activo) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  $(`#vista-${vista}`).scrollTop = 0;
  if (vista === 'progreso') actualizarProgreso();
}

function montarNavegacion() {
  $$('.dock__btn').forEach((b) => b.addEventListener('click', () => irA(b.dataset.ir)));
  $('#fab').addEventListener('click', abrirEscaner);
}

// Pokédex: tarjetas, filtros y búsqueda
function montarPokedex() {
  const contenido = $('#pokedex-contenido');

  contenido.addEventListener('click', (e) => {
    const tarjeta = e.target.closest('[data-id]');
    if (tarjeta) { abrirDetalle(Number(tarjeta.dataset.id)); return; }
    const bloqueada = e.target.closest('[data-bloq]');
    if (bloqueada) {
      vibrar(30);
      mostrarToast(`Escanea el QR del #${String(bloqueada.dataset.bloq).padStart(3, '0')} para descubrirlo.`, { tipo: 'info' });
      return;
    }
    if (e.target.closest('[data-accion="ver-todos"]')) {
      filtros.modo = 'todos';
      renderizarPokedex();
    }
  });

  // Si una imagen remota falla (sin conexión y sin caché), la tarjeta no se rompe.
  contenido.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') e.target.style.visibility = 'hidden';
  }, true);

  $$('.chip').forEach((c) => c.addEventListener('click', () => {
    filtros.modo = c.dataset.filtro;
    filtros.nuevoId = null;
    renderizarPokedex();
    $('#vista-pokedex').scrollTop = 0;
  }));

  let espera;
  $('#buscar').addEventListener('input', (e) => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      filtros.busqueda = e.target.value;
      filtros.nuevoId = null;
      renderizarPokedex();
    }, 160);
  });
}

// Acerca de: vibración, instalación y borrado
let eventoInstalar = null;

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const estaInstalada = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function pintarInstalacion() {
  const boton = $('#btn-instalar');
  const nota = $('#nota-instalar');
  if (estaInstalada()) {
    boton.hidden = true;
    nota.textContent = '✔ Ya estás usando la app instalada.';
  } else if (eventoInstalar) {
    boton.hidden = false;
    nota.textContent = 'Instálala para abrirla como una app independiente, incluso sin conexión.';
  } else if (esIOS()) {
    boton.hidden = true;
    nota.textContent = 'En iPhone/iPad: toca el botón Compartir y elige “Añadir a pantalla de inicio”.';
  } else {
    boton.hidden = true;
    nota.textContent = 'Instálala desde el menú del navegador: “Instalar app” o “Añadir a pantalla de inicio”.';
  }
}

function montarAjustes() {
  const interruptor = $('#sw-vibracion');
  const pintar = () => interruptor.setAttribute('aria-checked', String(prefs.vibracion));
  pintar();
  interruptor.addEventListener('click', () => {
    prefs.vibracion = !prefs.vibracion;
    guardarPrefs();
    pintar();
    if (prefs.vibracion) vibrar(60);
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalar = e;
    pintarInstalacion();
    ofrecerInstalacion();
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalar = null;
    pintarInstalacion();
    mostrarToast('¡Pokédex instalada!', { tipo: 'success' });
  });
  $('#btn-instalar').addEventListener('click', async () => {
    if (!eventoInstalar) return;
    eventoInstalar.prompt();
    await eventoInstalar.userChoice.catch(() => {});
    eventoInstalar = null;
    pintarInstalacion();
  });
  pintarInstalacion();

  $('#btn-borrar').addEventListener('click', async () => {
    const seguro = await confirmar({
      titulo: '¿Borrar tu colección?',
      texto: 'Se eliminarán todos tus Pokémon capturados de este dispositivo. No se puede deshacer.',
      si: 'Sí, borrar',
      no: 'Cancelar',
      peligro: true,
    });
    if (!seguro) return;
    borrarColeccion();
    filtros.modo = 'capturados';
    filtros.busqueda = '';
    filtros.nuevoId = null;
    $('#buscar').value = '';
    renderizarPokedex();
    actualizarProgreso();
    irA('pokedex');
    mostrarToast('Tu Pokédex quedó vacía. ¡A cazar de nuevo!', { tipo: 'info' });
  });
}

// Conexión
function pintarRed() {
  const en = navigator.onLine;
  const el = $('#estado-red');
  el.textContent = en ? '● EN LÍNEA' : '● SIN CONEXIÓN';
  el.className = `net ${en ? 'net--on' : 'net--off'}`;
}

function montarRed() {
  pintarRed();
  window.addEventListener('offline', () => {
    pintarRed();
    mostrarToast('Sin conexión. Tu colección sigue disponible.', { tipo: 'warn' });
  });
  window.addEventListener('online', () => {
    pintarRed();
    mostrarToast('Conexión recuperada.', { tipo: 'success' });
  });
}

// Service Worker (PWA y modo sin conexión)
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((err) => {
      console.warn('No se pudo registrar el Service Worker:', err);
    });
  });
}

// Modal de instalación (al abrir la app en el navegador)
const CLAVE_INSTALAR = 'pokedexInstalarOculto';
const DIAS_SIN_INSISTIR = 7;
let arranqueListo = false;
let modalInstalarVisto = false;

function instalarYaDescartado() {
  try {
    const t = Number(localStorage.getItem(CLAVE_INSTALAR));
    return !!t && Date.now() - t < DIAS_SIN_INSISTIR * 864e5;
  } catch {
    return false;
  }
}

function cerrarModalInstalar() {
  const modal = $('#instalar');
  modal.classList.remove('is-abierto');
  setTimeout(() => { modal.hidden = true; }, 250);
  if ($('#app').dataset.capa === '0') $('#fondo').removeAttribute('inert');
  try { localStorage.setItem(CLAVE_INSTALAR, String(Date.now())); } catch { /* sin almacenamiento */ }
  document.removeEventListener('keydown', teclaModalInstalar);
}

function teclaModalInstalar(e) {
  if (e.key === 'Escape') cerrarModalInstalar();
}

// Muestra el modal solo si hay forma de instalar y el usuario no lo descartó hace poco.
function ofrecerInstalacion() {
  if (modalInstalarVisto || !arranqueListo) return;
  if (estaInstalada() || instalarYaDescartado()) return;
  const ios = esIOS();
  if (!eventoInstalar && !ios) return; // este navegador no permite instalar

  modalInstalarVisto = true;
  const modal = $('#instalar');
  const botonSi = $('#instalar-si');
  $('#instalar-pasos').hidden = !(ios && !eventoInstalar);
  botonSi.textContent = eventoInstalar ? 'Instalar Pokédex' : 'Entendido';

  modal.hidden = false;
  $('#fondo').setAttribute('inert', '');
  requestAnimationFrame(() => modal.classList.add('is-abierto'));
  botonSi.focus();
  document.addEventListener('keydown', teclaModalInstalar);
}

function montarModalInstalar() {
  $('#instalar-no').addEventListener('click', cerrarModalInstalar);
  $('#instalar-si').addEventListener('click', async () => {
    if (eventoInstalar) {
      eventoInstalar.prompt();
      await eventoInstalar.userChoice.catch(() => {});
      eventoInstalar = null;
      pintarInstalacion();
    }
    cerrarModalInstalar();
  });
}

// Arranque: la Pokébola se abre y aparece la Pokédex
async function animarArranque() {
  const splash = $('#splash');
  const terminar = () => {
    splash.classList.add('is-abierto');
    setTimeout(() => splash.classList.add('is-quitado'), 1100);
  };
  if (reducirMovimiento()) { terminar(); return; }

  let saltado = false;
  splash.addEventListener('click', () => { saltado = true; }, { once: true });
  const esperar = async (ms) => { if (!saltado) await dormir(ms); };

  await dormir(120);
  $('#splash-barra').style.width = '100%';
  await esperar(650);
  $('#splash-texto').textContent = 'CARGANDO DATOS DE KANTO…';
  await esperar(700);
  $('#splash-texto').textContent = '¡LISTO!';
  $('#splash-lente').classList.add('lens--flash');
  await esperar(450);
  terminar();
}

function iniciar() {
  cargarPrefs();
  cargarColeccion();
  sincronizarMedallas();

  montarNavegacion();
  montarPokedex();
  montarDetalle();
  montarCaptura({ irA });
  montarAjustes();
  montarModalInstalar();
  montarRed();

  renderizarPokedex();
  actualizarProgreso();
  registrarServiceWorker();

  if (estadoAlmacen.datosCorruptos) {
    setTimeout(() => mostrarToast('Se detectaron datos dañados y se limpiaron. Tu Pokédex se reinició.', { tipo: 'warn', duracion: 5500 }), 2800);
  } else if (!estadoAlmacen.disponible) {
    setTimeout(() => mostrarToast('Tu navegador bloquea el almacenamiento: la colección no se podrá guardar.', { tipo: 'warn', duracion: 6000 }), 2800);
  }

  animarArranque().then(() => {
    arranqueListo = true;
    if (new URLSearchParams(location.search).get('accion') === 'escanear') setTimeout(abrirEscaner, 1200);
    else setTimeout(ofrecerInstalacion, 900);
  });
}

iniciar();

// Útil para el profe: window.pokedex.total, etc. desde la consola.
window.pokedex = { TOTAL, capturados: () => obtenerColeccion().length, irA };
