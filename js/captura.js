// captura.js · escáner QR → consulta → encuentro → ¡captura!
import { PROB_SHINY, BOLAS, TIPOS } from './config.js';
import { validarQR, iniciarEscaner, detenerEscaner, leerArchivo } from './qr.js';
import { buscarPokemon, mensajeDeError } from './api.js';
import { estaCapturado, obtenerPokemon, guardarPokemon } from './storage.js';
import { bolaSVG } from './bolas.js';
import { renderizarPokedex, filtros } from './pokedex.js';
import { actualizarProgreso, revisarMedallasNuevas } from './progreso.js';
import { abrirDetalle } from './detalle.js';
import {
  $, esc, pad3, dormir, formatearNombre, estiloTipo, pastillasTipos, mostrarToast, mostrarCapa, ocultarCapa,
  vibrar, lente, escribir, reducirMovimiento,
} from './ui.js';

const AYUDA_BASE = 'Apunta la cámara al código QR de un Pokémon';

let irA = () => {};
let escanerAbierto = false;
let consultaAbierta = false;
let capturaAbierta = false;
let capturaBloqueada = false; // mientras la bola vuela no se puede cerrar
let tokenConsulta = 0;
let idConsulta = null;
let temporizadorAyuda = null;

function refrescarLente() {
  lente(escanerAbierto || consultaAbierta ? 'escaneando' : 'reposo');
}

// Escáner QR
export function abrirEscaner() {
  if (escanerAbierto) return;
  escanerAbierto = true;
  $('#escaner-ayuda').textContent = AYUDA_BASE;
  ponerEstadoVisor(null);
  mostrarCapa($('#escaner'), cerrarEscaner);
  refrescarLente();
  arrancarCamara();
}

export function cerrarEscaner() {
  if (!escanerAbierto) return;
  escanerAbierto = false;
  clearTimeout(temporizadorAyuda);
  ocultarCapa($('#escaner'), cerrarEscaner);
  detenerEscaner();
  refrescarLente();
}

async function arrancarCamara() {
  ponerEstadoVisor(null);
  clearTimeout(temporizadorAyuda);
  try {
    await iniciarEscaner('qr-lector', alLeerTexto);
    if (!escanerAbierto) { await detenerEscaner(); return; }
    // Si pasa un buen rato sin leer nada, damos una pista (código ilegible).
    temporizadorAyuda = setTimeout(() => {
      $('#escaner-ayuda').textContent = '¿No lo lee? Acércalo un poco, evita reflejos y busca más luz.';
    }, 12000);
  } catch (e) {
    if (escanerAbierto) mostrarErrorCamara(e);
  }
}

const ERRORES_CAMARA = {
  permiso: ['🚫', 'Permiso de cámara rechazado', 'Activa la cámara para esta página desde el candado de la barra de direcciones y toca Reintentar. También puedes subir una imagen del QR.', 'Necesitamos la cámara para escanear.'],
  sin_camara: ['📵', 'No encontramos una cámara', 'Tu dispositivo no tiene cámara disponible. Puedes subir una imagen del código QR.', 'No se encontró ninguna cámara.'],
  ocupada: ['📷', 'La cámara está en uso', 'Cierra otras apps que estén usando la cámara y toca Reintentar.', 'La cámara está ocupada por otra app.'],
  insegura: ['🔒', 'La cámara necesita HTTPS', 'Abre la Pokédex desde su dirección segura (https://) para poder usar la cámara.', 'La cámara solo funciona en una conexión segura.'],
  libreria: ['⚠️', 'No se cargó el lector QR', 'Recarga la página. Si sigue igual, sube una imagen del código QR.', 'No se pudo cargar el lector de QR.'],
  desconocido: ['⚠️', 'No se pudo abrir la cámara', 'Toca Reintentar o sube una imagen del código QR.', 'No se pudo abrir la cámara.'],
};

function mostrarErrorCamara(error) {
  const [icono, titulo, texto, aviso] = ERRORES_CAMARA[error?.tipo] || ERRORES_CAMARA.desconocido;
  ponerEstadoVisor({ icono, titulo, texto });
  mostrarToast(aviso, { tipo: 'error' });
}

function ponerEstadoVisor(estado) {
  const caja = $('#visor-estado');
  caja.hidden = !estado;
  if (!estado) return;
  $('#visor-icono').textContent = estado.icono;
  $('#visor-titulo').textContent = estado.titulo;
  $('#visor-texto').textContent = estado.texto;
}

// Se llama en cuanto se detecta un QR (cámara, imagen o modo prueba).
async function alLeerTexto(texto) {
  vibrar(40);
  clearTimeout(temporizadorAyuda);
  await detenerEscaner();
  await procesarQR(texto);
}

// Validar y decidir
export async function procesarQR(texto) {
  const lectura = validarQR(texto);

  if (!lectura.ok) {
    vibrar([80, 50, 80]);
    mostrarToast(
      lectura.motivo === 'rango'
        ? 'Ese QR no es de Kanto: solo existen Pokémon del #001 al #151.'
        : 'Este código QR no pertenece a la Pokédex.',
      { tipo: 'error' },
    );
    if (escanerAbierto) {
      $('#escaner-ayuda').textContent = 'Código no válido. Prueba con otro QR.';
      await dormir(1600);
      if (escanerAbierto) { $('#escaner-ayuda').textContent = AYUDA_BASE; arrancarCamara(); }
    }
    return;
  }

  const { id } = lectura;
  if (estaCapturado(id)) {
    cerrarEscaner();
    const p = obtenerPokemon(id);
    vibrar([60, 40, 60]);
    mostrarToast(`${formatearNombre(p.name)} ya se encuentra registrado en tu Pokédex.`, {
      tipo: 'warn',
      accion: { texto: 'VER', alPulsar: () => abrirDetalle(id) },
    });
    return;
  }

  abrirConsulta(id);
  cerrarEscaner();
  await ejecutarConsulta(id, tokenConsulta);
}

// Consulta a PokéAPI (carga y error)
function abrirConsulta(id) {
  idConsulta = id;
  tokenConsulta += 1;
  consultaAbierta = true;
  mostrarCapa($('#consulta'), cerrarConsulta);
  refrescarLente();
}

function cerrarConsulta() {
  if (!consultaAbierta) return;
  consultaAbierta = false;
  tokenConsulta += 1; // cancela cualquier consulta pendiente
  ocultarCapa($('#consulta'), cerrarConsulta);
  refrescarLente();
}

function panelConsulta(modo, error) {
  $('#consulta-carga').hidden = modo !== 'carga';
  $('#consulta-error').hidden = modo !== 'error';
  if (modo === 'carga') {
    $('#consulta-sub').textContent = `Buscando al Pokémon #${pad3(idConsulta)}`;
  } else {
    const m = mensajeDeError(error);
    $('#error-titulo').textContent = m.titulo;
    $('#error-texto').textContent = m.texto;
    $('#error-reintentar').focus();
  }
}

async function ejecutarConsulta(id, token) {
  panelConsulta('carga');
  let datos;
  try {
    datos = await buscarPokemon(id);
  } catch (e) {
    if (token !== tokenConsulta) return;
    panelConsulta('error', e);
    vibrar([80, 50, 80]);
    mostrarToast('No fue posible consultar la información del Pokémon.', { tipo: 'error' });
    return;
  }
  if (token !== tokenConsulta) return;
  const contexto = await prepararEncuentro(datos);
  cerrarConsulta();
  await jugarEncuentro(contexto);
}

// Encuentro y captura
function precargar(url, espera = 7000) {
  return new Promise((resolver) => {
    if (!url) return resolver(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const reloj = setTimeout(() => resolver(false), espera);
    img.onload = () => { clearTimeout(reloj); resolver(true); };
    img.onerror = () => { clearTimeout(reloj); resolver(false); };
    img.src = url;
  });
}

async function prepararEncuentro(datos) {
  const shiny = Math.random() < PROB_SHINY;
  let imagen = shiny ? datos.imageShiny : datos.image;
  if (!(await precargar(imagen))) {
    imagen = datos.sprite; // plan B: el sprite pequeño
    await precargar(imagen, 4000);
  }
  const contexto = { datos, shiny, imagen, nombre: formatearNombre(datos.name) };

  const escena = $('#escena');
  escena.style.cssText = estiloTipo(datos.types);
  const img = $('#captura-img');
  img.removeAttribute('style');
  img.className = 'escena__pokemon is-silueta';
  img.removeAttribute('src');
  img.src = imagen;
  img.alt = '';
  $('#captura-info').className = 'info-poke is-oculto';
  $('#captura-info').innerHTML = '';
  $('#captura-fx').innerHTML = '';
  $('#captura-banner').hidden = true;
  const bola = $('#captura-bola');
  bola.hidden = true;
  bola.removeAttribute('style');
  bola.className = 'escena__bola';
  $('#captura-texto').textContent = '';
  $('#captura-acciones').innerHTML = '';
  try { await img.decode(); } catch { /* si falla, igual se muestra */ }

  capturaAbierta = true;
  capturaBloqueada = false;
  mostrarCapa($('#captura'), cerrarCaptura);
  return contexto;
}

export function cerrarCaptura() {
  if (!capturaAbierta || capturaBloqueada) return;
  capturaAbierta = false;
  ocultarCapa($('#captura'), cerrarCaptura);
}

function ponerTexto(texto) { return escribir($('#captura-texto'), texto, 26); }

function mostrarAcciones(botones) {
  const caja = $('#captura-acciones');
  caja.innerHTML = botones
    .map((b) => `<button type="button" class="btn ${b.clase}" data-acc="${b.id}">${b.html}</button>`)
    .join('');
  return new Promise((resolver) => {
    caja.onclick = (e) => {
      const id = e.target.closest('[data-acc]')?.dataset.acc;
      if (id) { caja.onclick = null; resolver(id); }
    };
  });
}

async function jugarEncuentro(ctx) {
  const { datos, shiny, nombre } = ctx;
  const img = $('#captura-img');
  const icono = TIPOS[datos.types[0]]?.icono || '';

  // Revelación: de silueta a Pokémon, con flash
  await dormir(450);
  vibrar([50, 40, 50]);
  img.classList.remove('is-silueta');
  $('#captura-flash').animate([{ opacity: 0 }, { opacity: 0.7, offset: 0.2 }, { opacity: 0 }], { duration: 600 });
  $('#captura-info').innerHTML = `<p class="info-poke__nombre">#${pad3(datos.id)} ${esc(nombre)}${shiny ? ' ★' : ''}</p>
    <div class="pills" style="margin-top:6px">${pastillasTipos(datos.types)}</div>
    <p class="info-poke__datos">${esc(datos.genus || 'Pokémon')} · ${datos.height} m · ${datos.weight} kg</p>`;
  $('#captura-info').classList.remove('is-oculto');
  if (shiny) mostrarBannerShiny();
  await ponerTexto(shiny ? `¡Apareció ${nombre}! ¡Y tiene un color distinto!` : `¡Apareció ${nombre}!`);

  const bola = BOLAS[datos.bola];
  const eleccion = await mostrarAcciones([
    { id: 'lanzar', clase: 'btn--primario', html: `<span class="btn__bola">${bolaSVG(datos.bola)}</span>Lanzar ${esc(bola.nombre)}` },
    { id: 'soltar', clase: 'btn--claro', html: 'Dejarlo ir' },
  ]);

  if (eleccion === 'soltar') {
    cerrarCaptura();
    mostrarToast(`Dejaste ir a ${nombre}. Escanea su QR cuando quieras.`, { tipo: 'info' });
    return;
  }

  // ¡A capturar!
  capturaBloqueada = true;
  $('#captura-acciones').innerHTML = '';
  $('#captura-info').classList.add('is-oculto');
  await ponerTexto(`¡Lanzaste una ${bola.nombre}!`);
  await secuenciaCaptura(ctx);

  // Guardar en localStorage y actualizar toda la interfaz al instante
  const registro = {
    id: datos.id,
    name: datos.name,
    image: shiny ? datos.imageShiny : datos.image,
    sprite: shiny ? datos.spriteShiny : datos.sprite,
    types: datos.types,
    capturedAt: new Date().toISOString(),
    shiny,
    ball: datos.bola,
    height: datos.height,
    weight: datos.weight,
    abilities: datos.abilities,
    stats: datos.stats,
    entry: datos.entry,
    genus: datos.genus,
    imageShiny: datos.imageShiny,
    spriteShiny: datos.spriteShiny,
  };
  const resultado = guardarPokemon(registro);
  capturaBloqueada = false;

  if (resultado.repetido) {
    mostrarToast('Este Pokémon ya había sido capturado.', { tipo: 'warn' });
  } else {
    filtros.nuevoId = datos.id;
    const nuevas = revisarMedallasNuevas();
    renderizarPokedex();
    actualizarProgreso({ medallasNuevas: nuevas });
    mostrarToast(`¡${nombre} fue agregado a tu Pokédex! ${icono}`, { tipo: 'success', duracion: 4200 });
    if (!resultado.persistido) {
      setTimeout(() => mostrarToast('No se pudo guardar en este navegador: la captura se perderá al cerrar la app.', { tipo: 'warn', duracion: 6000 }), 1200);
    }
    if (nuevas.length) {
      setTimeout(() => mostrarToast(`¡Ganaste la ${nuevas[0].nombre}!`, {
        tipo: 'info',
        duracion: 4500,
        accion: { texto: 'VER', alPulsar: () => { cerrarCaptura(); irA('progreso'); } },
      }), 2300);
    }
  }

  await ponerTexto(`¡${nombre} capturado! ${icono}`);
  const siguiente = await mostrarAcciones([
    { id: 'ver', clase: 'btn--primario', html: 'Ver ficha' },
    { id: 'seguir', clase: 'btn--claro', html: 'Seguir escaneando' },
    { id: 'cerrar', clase: 'btn--lcd', html: 'Cerrar' },
  ]);
  if (siguiente === 'seguir') { abrirEscaner(); cerrarCaptura(); }
  else if (siguiente === 'ver') { cerrarCaptura(); setTimeout(() => abrirDetalle(datos.id), 250); }
  else cerrarCaptura();
}

// Animación de captura: lanzamiento, rebote, 3 sacudidas y clic
async function animar(el, fotogramas, opciones) {
  const a = el.animate(fotogramas, { fill: 'forwards', ...opciones });
  await a.finished;
  try { a.commitStyles(); } catch { /* el elemento ya no está visible */ }
  a.cancel();
}

function particula(clase, estilos, vida) {
  const el = document.createElement('i');
  el.className = clase;
  Object.entries(estilos).forEach(([k, v]) => el.style.setProperty(k, v));
  $('#captura-fx').appendChild(el);
  setTimeout(() => el.remove(), vida);
}

function estrellas(x, y, cantidad = 14, colores = ['#ffe27a', '#ffffff', '#ff9ec4', '#9be7ff']) {
  for (let i = 0; i < cantidad; i += 1) {
    const ang = (i / cantidad) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 70 + Math.random() * 90;
    particula('fx-estrella', {
      '--x': `${x}px`, '--y': `${y}px`,
      '--dx': `${Math.cos(ang) * dist}px`, '--dy': `${Math.sin(ang) * dist}px`,
      '--t': `${14 + Math.random() * 14}px`, '--col': colores[i % colores.length],
      '--dur': `${0.8 + Math.random() * 0.4}s`,
    }, 1400);
  }
}

function anillo(x, y) {
  particula('fx-anillo', { '--x': `${x}px`, '--y': `${y}px` }, 900);
}

function confeti(cantidad = 70, dorado = false) {
  const paleta = dorado
    ? ['#ffd23f', '#fff3a8', '#ffb300', '#ffffff']
    : ['#ff5a5f', '#ffd23f', '#43e08a', '#35a2ff', '#b18cff', '#ffffff'];
  const ancho = $('#escena').clientWidth;
  for (let i = 0; i < cantidad; i += 1) {
    const dur = 2.2 + Math.random() * 2;
    particula('fx-confeti', {
      '--x': `${Math.random() * ancho}px`, '--col': paleta[i % paleta.length],
      '--dur': `${dur}s`, '--del': `${Math.random() * 0.6}s`,
      '--drift': `${(Math.random() - 0.5) * 160}px`, '--rot': `${(Math.random() - 0.5) * 1080}deg`,
    }, (dur + 0.8) * 1000 + 600);
  }
}

function mostrarBannerShiny() {
  const b = $('#captura-banner');
  b.hidden = false;
  b.style.animation = 'none';
  void b.offsetWidth; // reinicia la animación
  b.style.animation = '';
  vibrar([100, 60, 100, 60, 220]);
  const ancho = $('#escena').clientWidth;
  [0, 450, 900].forEach((t) => setTimeout(() => estrellas(ancho * (0.25 + Math.random() * 0.5), $('#escena').clientHeight * 0.4, 12, ['#ffd23f', '#fff3a8', '#ffffff']), t));
  setTimeout(() => { b.hidden = true; }, 2600);
}

async function secuenciaCaptura(ctx) {
  const k = reducirMovimiento() ? 0.35 : 1; // factor de duración
  const master = ctx.datos.bola === 'master';
  const escena = $('#escena');
  const img = $('#captura-img');
  const bola = $('#captura-bola');
  const giro = $('.bola__giro', bola);
  const B = 78;
  const ESC = 0.9; // escala de la bola ya lanzada

  const rEsc = escena.getBoundingClientRect();
  const rImg = img.getBoundingClientRect();
  const rSuelo = $('#captura-suelo').getBoundingClientRect();
  const cx = rImg.left + rImg.width / 2 - rEsc.left;
  const cy = rImg.top + rImg.height / 2 - rEsc.top;
  const sx = rEsc.width / 2 - B / 2;
  const sy = rEsc.height + 20;
  const tx = cx - B / 2;
  const ty = cy - B / 2;
  const sueloY = rSuelo.top + rSuelo.height / 2 - rEsc.top;
  const reposoY = sueloY - B / 2 - 6;
  const pos = (x, y, r = 0, s = 1) => `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`;

  giro.innerHTML = bolaSVG(ctx.datos.bola);
  bola.className = `escena__bola ${master ? 'aura-master' : ''}`;
  bola.style.transform = pos(sx, sy);
  bola.hidden = false;

  // 1) Lanzamiento en arco
  await animar(bola, [
    { transform: pos(sx, sy, 0, 1), easing: 'cubic-bezier(.2,.7,.4,1)' },
    { transform: pos((sx + tx) / 2, Math.min(sy, ty) - 120, 360, 0.95), offset: 0.55, easing: 'cubic-bezier(.5,0,.8,.5)' },
    { transform: pos(tx, ty, 720, ESC) },
  ], { duration: 900 * k });

  // 2) Impacto: destello rojo, anillo y el Pokémon se vuelve luz y entra
  vibrar(40);
  const flash = $('#captura-flash');
  flash.style.setProperty('--fx', `${cx}px`);
  flash.style.setProperty('--fy', `${cy}px`);
  flash.animate([{ opacity: 0 }, { opacity: 0.95, offset: 0.25 }, { opacity: 0 }], { duration: 620 * k });
  anillo(cx, cy);
  const base = 'brightness(1) invert(0) drop-shadow(0 10px 14px rgba(0,0,0,.5))';
  await animar(img, [
    { filter: base, transform: 'scale(1)', opacity: 1 },
    { filter: 'brightness(0) invert(1) drop-shadow(0 0 22px #ff3b3b)', transform: 'scale(.95)', opacity: 1, offset: 0.35 },
    { filter: 'brightness(0) invert(1) drop-shadow(0 0 30px #ff3b3b)', transform: 'scale(.03)', opacity: 0.9 },
  ], { duration: 800 * k, easing: 'ease-in' });
  img.style.opacity = '0';
  vibrar([30, 30, 90]);

  // 3) La bola cae y rebota
  await animar(bola, [
    { transform: pos(tx, ty, 0, ESC), easing: 'ease-in' },
    { transform: pos(tx, reposoY, 0, ESC), offset: 0.5, easing: 'ease-out' },
    { transform: pos(tx, reposoY - 52, 0, ESC), offset: 0.7, easing: 'ease-in' },
    { transform: pos(tx, reposoY, 0, ESC), offset: 0.88, easing: 'ease-out' },
    { transform: pos(tx, reposoY - 12, 0, ESC), offset: 0.95, easing: 'ease-in' },
    { transform: pos(tx, reposoY, 0, ESC) },
  ], { duration: 1050 * k });
  vibrar(50);

  // 4) Tres sacudidas con luz y suspenso
  const pausa = (master ? 1100 : 750) * k;
  for (let i = 1; i <= 3; i += 1) {
    await dormir(pausa);
    $('#captura-texto').textContent = '.'.repeat(i);
    bola.classList.add('is-brillo');
    vibrar(80);
    await animar(giro, [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-28deg)', offset: 0.22 },
      { transform: 'rotate(0deg)', offset: 0.42 },
      { transform: 'rotate(28deg)', offset: 0.68 },
      { transform: 'rotate(0deg)' },
    ], { duration: (master ? 900 : 760) * k, easing: 'ease-in-out' });
    bola.classList.remove('is-brillo');
  }
  await dormir((master ? 1300 : 900) * k); // el silencio antes del clic

  // 5) ¡Clic! Estrellas, destello y confeti
  const bx = tx + B / 2;
  const by = reposoY + B / 2;
  vibrar([40, 50, 160]);
  lente('flash');
  $('.b-boton', bola).style.fill = '#3a3a44';
  anillo(bx, by);
  estrellas(bx, by, 16);
  bola.animate([{ transform: pos(tx, reposoY, 0, ESC) }, { transform: pos(tx, reposoY, 0, ESC * 1.18), offset: 0.4 }, { transform: pos(tx, reposoY, 0, ESC) }], { duration: 420 * k });
  flash.style.setProperty('--fx', `${bx}px`);
  flash.style.setProperty('--fy', `${by}px`);
  flash.animate([{ opacity: 0 }, { opacity: 0.8, offset: 0.2 }, { opacity: 0 }], { duration: 500 * k });
  if (!reducirMovimiento()) confeti(ctx.shiny ? 90 : 60, ctx.shiny);
  if (ctx.shiny) estrellas(bx, by - 40, 18, ['#ffd23f', '#fff3a8', '#ffffff']);
  await dormir(450 * k);
}

// Conexión de eventos
export function montarCaptura({ irA: ir }) {
  irA = ir;
  $('#consulta-bola').innerHTML = bolaSVG('poke');

  $('#escaner-cerrar').addEventListener('click', cerrarEscaner);
  $('#visor-reintentar').addEventListener('click', arrancarCamara);
  $('#error-reintentar').addEventListener('click', () => ejecutarConsulta(idConsulta, tokenConsulta));
  $('#error-cerrar').addEventListener('click', cerrarConsulta);

  // Leer un QR desde una imagen (Código QR ilegible → aviso claro)
  $('#qr-archivo-input').addEventListener('change', async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    try {
      const texto = await leerArchivo(archivo);
      await alLeerTexto(texto);
    } catch (err) {
      vibrar([80, 50, 80]);
      mostrarToast(
        err?.tipo === 'libreria'
          ? 'No se pudo cargar el lector de QR. Recarga la página.'
          : 'No se pudo leer el código QR de esa imagen. Usa una foto nítida y bien iluminada.',
        { tipo: 'error' },
      );
    }
  });

  // Modo de prueba para escritorio: abre la app con ?test=1
  if (new URLSearchParams(location.search).has('test')) {
    const form = $('#form-prueba');
    form.hidden = false;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const valor = $('#prueba-texto').value.trim() || 'pokemon:25';
      alLeerTexto(valor);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (capturaAbierta) cerrarCaptura();
    else if (consultaAbierta) cerrarConsulta();
    else if (escanerAbierto) cerrarEscaner();
  });
}
