// ui.js · utilidades de interfaz: Toast/Snackbar, capas, modal, vibración
import { TIPOS } from './config.js';
import { prefs } from './storage.js';

export const $ = (selector, raiz = document) => raiz.querySelector(selector);
export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];
export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
export const pad3 = (n) => String(n).padStart(3, '0');
export const reducirMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Escapa texto para meterlo de forma segura en HTML.
export const esc = (t) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const NOMBRES_ESPECIALES = {
  'mr-mime': 'Mr. Mime',
  'nidoran-f': 'Nidoran ♀',
  'nidoran-m': 'Nidoran ♂',
  farfetchd: "Farfetch'd",
};
export function formatearNombre(nombre = '') {
  if (NOMBRES_ESPECIALES[nombre]) return NOMBRES_ESPECIALES[nombre];
  return nombre.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

// Quita acentos y mayúsculas para comparar textos al buscar.
export const normalizarTexto = (t = '') =>
  t.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function vibrar(patron) {
  try {
    if (prefs.vibracion && navigator.vibrate) navigator.vibrate(patron);
  } catch {
    // el dispositivo no vibra
  }
}

// Colores por tipo
function textoSobre(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42 ? '#10201a' : '#ffffff';
}

// Variables CSS (--c1, --c2, --tx) para colorear tarjetas según el tipo.
export function estiloTipo(tipos = []) {
  const a = TIPOS[tipos[0]] || TIPOS.normal;
  const b = tipos[1] ? TIPOS[tipos[1]] || a : null;
  const c1 = a.c1;
  const c2 = b ? b.c1 : a.c2;
  return `--c1:${c1};--c2:${c2};--tx:${textoSobre(c1)}`;
}

export function pastillasTipos(tipos = []) {
  return tipos
    .map((t) => {
      const info = TIPOS[t] || { es: t, icono: '●' };
      return `<span class="pill">${info.icono} ${esc(info.es)}</span>`;
    })
    .join('');
}

// Lente y LED: la Pokédex "piensa"
export function lente(estado) {
  const lentes = $$('.top .lens');
  lentes.forEach((l) => {
    l.classList.toggle('lens--escaneando', estado === 'escaneando');
    l.classList.toggle('lens--on', estado !== 'escaneando');
  });
  if (estado === 'flash') {
    lentes.forEach((l) => {
      l.classList.add('lens--flash');
      setTimeout(() => l.classList.remove('lens--flash'), 1000);
    });
  }
  $('#app').dataset.ocupado = estado === 'escaneando' ? '1' : '0';
}

// Toast / Snackbar
const ICONOS_TOAST = { success: '✔', warn: '!', error: '✖', info: 'i' };

export function mostrarToast(mensaje, { tipo = 'success', accion = null, duracion = 3600 } = {}) {
  const contenedor = $('#toasts');
  while (contenedor.children.length >= 2) contenedor.firstElementChild.remove();

  const el = document.createElement('div');
  el.className = `toast toast--${tipo}`;
  el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  el.innerHTML = `<span class="toast__ico" aria-hidden="true">${ICONOS_TOAST[tipo] || 'i'}</span>
    <span class="toast__msg">${esc(mensaje)}</span>
    ${accion ? `<button class="toast__btn" type="button">${esc(accion.texto)}</button>` : ''}`;
  contenedor.appendChild(el);

  const quitar = () => {
    if (!el.isConnected) return;
    el.classList.add('is-saliendo');
    setTimeout(() => el.remove(), 260);
  };
  if (accion) {
    $('.toast__btn', el).addEventListener('click', () => {
      quitar();
      accion.alPulsar();
    });
  }
  setTimeout(quitar, accion ? duracion + 1800 : duracion);
  return quitar;
}

// Capas (escáner, captura, detalle...) y botón Atrás
const capas = [];
let guardia = false;
let ignorarPop = false;

function actualizarEstadoCapas() {
  const app = $('#app');
  app.dataset.capa = String(capas.length);
  const fondo = $('#fondo');
  if (capas.length) fondo.setAttribute('inert', '');
  else fondo.removeAttribute('inert');
}

// Registra una capa abierta; el botón Atrás del celular la cerrará.
export function empujarCapa(cerrar) {
  capas.push(cerrar);
  if (!guardia) {
    history.pushState({ pokedex: 'capa' }, '');
    guardia = true;
  }
  actualizarEstadoCapas();
}

export function sacarCapa(cerrar) {
  const i = capas.lastIndexOf(cerrar);
  if (i > -1) capas.splice(i, 1);
  actualizarEstadoCapas();
  if (!capas.length) {
    // Se espera un instante por si otra capa se abre enseguida (escáner → consulta).
    setTimeout(() => {
      if (!capas.length && guardia) {
        guardia = false;
        ignorarPop = true;
        history.back();
      }
    }, 0);
  }
}

window.addEventListener('popstate', () => {
  if (ignorarPop) {
    ignorarPop = false;
    return;
  }
  if (!guardia) return;
  guardia = false;
  const cerrarUltima = capas[capas.length - 1];
  if (cerrarUltima) cerrarUltima();
  if (capas.length) {
    history.pushState({ pokedex: 'capa' }, '');
    guardia = true;
  }
});

// Muestra una capa con transición.
export function mostrarCapa(el, cerrar) {
  clearTimeout(el._t);
  el.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-open')));
  empujarCapa(cerrar);
}

export function ocultarCapa(el, cerrar) {
  el.classList.remove('is-open');
  el._t = setTimeout(() => { el.hidden = true; }, 320);
  sacarCapa(cerrar);
}

// Modal de confirmación
export function confirmar({ titulo, texto, si = 'Aceptar', no = 'Cancelar', peligro = false }) {
  return new Promise((resolver) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-titulo');
    modal.innerHTML = `<div class="modal__panel">
        <h3 id="modal-titulo" class="modal__titulo">${esc(titulo)}</h3>
        <p class="modal__texto">${esc(texto)}</p>
        <div class="modal__acciones">
          <button class="btn btn--claro" data-r="no" type="button">${esc(no)}</button>
          <button class="btn ${peligro ? 'btn--peligro' : 'btn--primario'}" data-r="si" type="button">${esc(si)}</button>
        </div></div>`;
    const cerrar = (respuesta) => {
      document.removeEventListener('keydown', alTeclear);
      sacarCapa(alCerrarAtras);
      modal.remove();
      resolver(respuesta);
    };
    const alCerrarAtras = () => cerrar(false);
    const alTeclear = (e) => { if (e.key === 'Escape') cerrar(false); };
    modal.addEventListener('click', (e) => {
      const r = e.target.closest('[data-r]')?.dataset.r;
      if (r) cerrar(r === 'si');
      else if (e.target === modal) cerrar(false);
    });
    document.addEventListener('keydown', alTeclear);
    $('#app').appendChild(modal);
    empujarCapa(alCerrarAtras);
    $('[data-r="no"]', modal).focus();
  });
}

// Máquina de escribir
export function escribir(el, texto, ms = 22, cancelar = { activo: false }) {
  return new Promise((resolver) => {
    el.textContent = '';
    if (reducirMovimiento() || !texto) {
      el.textContent = texto;
      resolver();
      return;
    }
    let i = 0;
    el.classList.add('is-escribiendo');
    const paso = () => {
      if (cancelar.activo || !el.isConnected) { el.classList.remove('is-escribiendo'); resolver(); return; }
      i += 1;
      el.textContent = texto.slice(0, i);
      if (i >= texto.length) { el.classList.remove('is-escribiendo'); resolver(); return; }
      setTimeout(paso, ms);
    };
    paso();
  });
}
