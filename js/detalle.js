// detalle.js · Bottom Sheet con la carta holográfica del Pokémon
import { TIPOS, STATS, BOLAS } from './config.js';
import { obtenerPokemon, actualizarPokemon } from './storage.js';
import { buscarPokemon, mensajeDeError } from './api.js';
import {
  $, esc, pad3, formatearNombre, estiloTipo, pastillasTipos, reducirMovimiento,
  empujarCapa, sacarCapa, escribir, mostrarToast,
} from './ui.js';

let abierto = false;
let abiertoId = null;
let cancelarTexto = { activo: false };
let limpiarCarta = () => {};
let quienAbrio = null;

const colorStat = (v) => (v >= 100 ? '#43e08a' : v >= 70 ? '#c8e04a' : v >= 50 ? '#ffd23f' : '#ff7a59');

// ¿El registro guardado ya trae todo lo necesario para la ficha?
const estaCompleto = (p) => Array.isArray(p.stats) && p.stats.length && p.height != null && Array.isArray(p.abilities) && typeof p.entry === 'string';

function fechaBonita(iso) {
  const f = new Date(iso);
  return Number.isNaN(f.getTime()) ? '—' : f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function plantillaCarta(p) {
  const nombre = formatearNombre(p.name);
  const ps = p.stats?.find((s) => s.clave === 'hp')?.valor ?? '—';
  const arte = p.shiny ? p.imageShiny || p.image : p.image;
  const icono = TIPOS[p.types[0]]?.icono || '';
  return `<div class="holo ${p.shiny ? 'holo--shiny' : ''}" id="holo" style="${estiloTipo(p.types)}">
    <div class="holo__inner">
      <div class="holo__marco">
        <div class="holo__cab">
          <span class="holo__nombre">${esc(nombre)}</span>
          <span class="holo__ps"><small>PS</small>${esc(ps)} ${icono}</span>
        </div>
        <div class="holo__arte">
          <span class="holo__no">No. ${pad3(p.id)}${p.shiny ? ' ★' : ''}</span>
          <img src="${esc(arte)}" alt="Ilustración de ${esc(nombre)}" crossorigin="anonymous" decoding="async">
        </div>
        <div class="holo__tira">${esc(p.genus || 'Pokémon')} · ${p.height} m · ${p.weight} kg</div>
        <div class="holo__texto" id="holo-texto" aria-label="Entrada de la Pokédex"></div>
        <div class="pills">${pastillasTipos(p.types)}</div>
      </div>
      <div class="holo__brillo"></div><div class="holo__chispas"></div><div class="holo__reflejo"></div>
    </div>
  </div>
  <button id="btn-inclinar" class="btn btn--claro btn-inclinar" type="button" hidden>Activar inclinación</button>`;
}

function plantillaFicha(p) {
  const nombreBola = BOLAS[p.ball]?.nombre;
  const stats = (p.stats || []).map((s, i) => `<div class="stat">
      <span>${esc(STATS[s.clave] || s.clave)}</span><span class="stat__valor">${s.valor}</span>
      <span class="stat__barra"><i data-w="${Math.min(100, (s.valor / 160) * 100)}" style="--col:${colorStat(s.valor)};--d:${i * 0.08}s"></i></span></div>`).join('');
  const habilidades = (p.abilities || []).map((h) => `<span class="det-chip ${h.oculta ? 'det-chip--oculta' : ''}">${esc(h.nombre)}${h.oculta ? ' (oculta)' : ''}</span>`).join('');
  return `${plantillaCarta(p)}
    <div class="det-seccion">
      <h3 class="det-titulo">DATOS</h3>
      <div class="det-datos">
        <div class="det-dato"><small>Altura</small><b>${p.height} m</b></div>
        <div class="det-dato"><small>Peso</small><b>${p.weight} kg</b></div>
        <div class="det-dato"><small>Capturado el</small><b>${esc(fechaBonita(p.capturedAt))}</b></div>
        <div class="det-dato"><small>Atrapado con</small><b>${esc(nombreBola || 'Poké Ball')}</b></div>
      </div>
    </div>
    <div class="det-seccion"><h3 class="det-titulo">HABILIDADES</h3><div class="det-chips">${habilidades || '<span class="det-chip">—</span>'}</div></div>
    <div class="det-seccion"><h3 class="det-titulo">ESTADÍSTICAS BASE</h3>${stats}</div>`;
}

// Efecto holográfico: dedo / ratón / giroscopio
function activarInclinacion(carta) {
  const poner = (x, y) => {
    carta.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    carta.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    carta.style.setProperty('--ry', `${((x - 0.5) * 26).toFixed(1)}deg`);
    carta.style.setProperty('--rx', `${(-(y - 0.5) * 26).toFixed(1)}deg`);
  };
  const reposo = () => { carta.classList.add('is-quieto'); poner(0.5, 0.5); };

  const alMover = (e) => {
    carta.classList.remove('is-quieto');
    const r = carta.getBoundingClientRect();
    poner(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  carta.addEventListener('pointermove', alMover);
  carta.addEventListener('pointerleave', reposo);
  carta.addEventListener('pointercancel', reposo);

  let base = null;
  const alOrientar = (e) => {
    if (e.gamma == null || e.beta == null) return;
    if (!base) base = { b: e.beta, g: e.gamma };
    carta.classList.remove('is-quieto');
    const x = Math.min(1, Math.max(0, 0.5 + (e.gamma - base.g) / 60));
    const y = Math.min(1, Math.max(0, 0.5 + (e.beta - base.b) / 60));
    poner(x, y);
  };
  const requiereOk = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
  const boton = $('#btn-inclinar');
  if (requiereOk) {
    // iPhone: hace falta un toque del usuario para dar permiso.
    boton.hidden = false;
    boton.addEventListener('click', async () => {
      try {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r === 'granted') { window.addEventListener('deviceorientation', alOrientar); boton.hidden = true; }
        else mostrarToast('No se concedió el permiso de movimiento.', { tipo: 'warn' });
      } catch {
        mostrarToast('Tu navegador no permitió activar la inclinación.', { tipo: 'warn' });
      }
    });
  } else if ('DeviceOrientationEvent' in window) {
    window.addEventListener('deviceorientation', alOrientar);
  }

  // Barrido de brillo al abrir, para que se note el efecto sin tocar nada.
  let cancelado = false;
  if (!reducirMovimiento()) {
    const inicio = performance.now();
    const barrer = (t) => {
      const k = (t - inicio) / 1500;
      if (cancelado || k >= 1) { if (!cancelado) reposo(); return; }
      poner(0.5 + 0.38 * Math.sin(k * Math.PI * 2), 0.5 + 0.28 * Math.cos(k * Math.PI * 1.5));
      requestAnimationFrame(barrer);
    };
    carta.classList.remove('is-quieto');
    requestAnimationFrame(barrer);
    carta.addEventListener('pointerdown', () => { cancelado = true; }, { once: true });
  }

  return () => {
    cancelado = true;
    window.removeEventListener('deviceorientation', alOrientar);
  };
}

function animarBarras() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('#sheet-cuerpo .stat__barra i').forEach((i) => { i.style.width = `${i.dataset.w}%`; });
  }));
}

function pintarContenido(p) {
  const cuerpo = $('#sheet-cuerpo');
  cuerpo.innerHTML = plantillaFicha(p);
  cuerpo.scrollTop = 0;
  limpiarCarta = activarInclinacion($('#holo'));
  animarBarras();
  const caja = $('#holo-texto');
  cancelarTexto = { activo: false };
  const texto = p.entry || 'Sin entrada de Pokédex disponible por ahora.';
  escribir(caja, texto, 20, cancelarTexto);
  caja.addEventListener('click', () => { cancelarTexto.activo = true; caja.textContent = texto; });
}

function pintarCargando(p) {
  $('#sheet-cuerpo').innerHTML = `<div class="det-estado">
    <div class="consulta__bola" style="margin:0 auto 14px" aria-hidden="true">${document.querySelector('#consulta-bola')?.innerHTML || ''}</div>
    <p class="font-pixel" style="font-size:12px;line-height:1.7">Consultando Pokédex...</p>
    <p class="texto-claro">Cargando la ficha de ${esc(formatearNombre(p.name))}</p></div>`;
}

function pintarError(p, error) {
  const m = mensajeDeError(error);
  $('#sheet-cuerpo').innerHTML = `<div class="det-estado">
    <p style="font-size:44px" aria-hidden="true">⚠️</p>
    <p class="font-pixel" style="font-size:12px;line-height:1.7;margin-top:10px">${esc(m.titulo)}</p>
    <p class="texto-claro" style="margin-top:8px">${esc(m.texto)}</p>
    <button id="det-reintentar" class="btn btn--primario" style="margin-top:16px" type="button">Reintentar</button></div>`;
  $('#det-reintentar').addEventListener('click', () => cargarFaltantes(p.id));
}

// Si al registro le faltan datos, los pide a PokéAPI y los guarda.
async function cargarFaltantes(id) {
  const p = obtenerPokemon(id);
  if (!p) return;
  pintarCargando(p);
  try {
    const datos = await buscarPokemon(id);
    if (!abierto || abiertoId !== id) return;
    const completo = actualizarPokemon(id, {
      height: datos.height, weight: datos.weight, abilities: datos.abilities, stats: datos.stats,
      entry: datos.entry, genus: datos.genus, imageShiny: datos.imageShiny, spriteShiny: datos.spriteShiny,
      sprite: p.sprite || datos.sprite, image: p.image || datos.image,
    });
    pintarContenido(completo);
  } catch (e) {
    if (!abierto || abiertoId !== id) return;
    pintarError(p, e);
  }
}

// Abrir / cerrar
function alTeclear(e) { if (e.key === 'Escape') cerrarDetalle(); }

export function cerrarDetalle() {
  if (!abierto) return;
  abierto = false;
  abiertoId = null;
  cancelarTexto.activo = true;
  limpiarCarta();
  limpiarCarta = () => {};
  document.removeEventListener('keydown', alTeclear);
  sacarCapa(cerrarDetalle);

  const hoja = $('#sheet');
  const fondo = $('#sheet-fondo');
  hoja.classList.remove('is-open');
  fondo.classList.remove('is-open');
  hoja.style.transform = '';
  setTimeout(() => {
    if (abierto) return;
    hoja.hidden = true;
    fondo.hidden = true;
  }, 400);
  quienAbrio?.focus?.();
}

export function abrirDetalle(id) {
  const p = obtenerPokemon(id);
  if (!p) return;
  const yaAbierto = abierto;
  if (yaAbierto) { limpiarCarta(); cancelarTexto.activo = true; }
  else quienAbrio = document.activeElement;
  abierto = true;
  abiertoId = p.id;

  const hoja = $('#sheet');
  const fondo = $('#sheet-fondo');
  hoja.style.cssText = estiloTipo(p.types);
  hoja.hidden = false;
  fondo.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    hoja.classList.add('is-open');
    fondo.classList.add('is-open');
  }));
  if (!yaAbierto) {
    empujarCapa(cerrarDetalle);
    document.addEventListener('keydown', alTeclear);
  }

  if (estaCompleto(p)) pintarContenido(p);
  else cargarFaltantes(p.id);
  setTimeout(() => $('#sheet-cerrar')?.focus(), 380);
}

// Inicializa los eventos fijos de la hoja (cerrar, fondo, arrastre).
export function montarDetalle() {
  $('#sheet-cerrar').addEventListener('click', cerrarDetalle);
  $('#sheet-fondo').addEventListener('click', cerrarDetalle);

  // Arrastrar la asa hacia abajo para cerrar.
  const agarre = $('#sheet-agarre');
  const hoja = $('#sheet');
  let y0 = null;
  agarre.addEventListener('pointerdown', (e) => {
    y0 = e.clientY;
    agarre.setPointerCapture(e.pointerId);
    hoja.style.transition = 'none';
  });
  agarre.addEventListener('pointermove', (e) => {
    if (y0 == null) return;
    hoja.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`;
  });
  const soltar = (e) => {
    if (y0 == null) return;
    const dy = e.clientY - y0;
    y0 = null;
    hoja.style.transition = '';
    if (dy > 110) cerrarDetalle();
    else hoja.style.transform = '';
  };
  agarre.addEventListener('pointerup', soltar);
  agarre.addEventListener('pointercancel', soltar);
}
