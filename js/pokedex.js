// pokedex.js · pantalla "Mi Pokédex": tarjetas, filtros y estados
import { TOTAL, TIPOS, spriteChico } from './config.js';
import { obtenerColeccion } from './storage.js';
import { $, $$, esc, pad3, formatearNombre, normalizarTexto, estiloTipo, pastillasTipos } from './ui.js';

export const filtros = { modo: 'capturados', busqueda: '', nuevoId: null };

const BOLA_VACIA = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#13301c" stroke-width="6" stroke-dasharray="10 7"/><path d="M6 50h88" stroke="#13301c" stroke-width="6"/><circle cx="50" cy="50" r="14" fill="#b9d3a0" stroke="#13301c" stroke-width="6"/></svg>`;

function tarjetaCapturada(p) {
  const nombre = formatearNombre(p.name);
  const tipos = p.types.map((t) => TIPOS[t]?.es || t).join(' y ');
  const img = p.shiny ? p.spriteShiny || p.sprite : p.sprite;
  return `<button class="card ${p.shiny ? 'card--shiny' : ''} ${filtros.nuevoId === p.id ? 'card--nueva' : ''}" type="button"
      data-id="${p.id}" style="${estiloTipo(p.types)}" aria-label="${esc(nombre)}, número ${p.id}, tipo ${esc(tipos)}${p.shiny ? ', shiny' : ''}">
    <span class="card__num">#${pad3(p.id)}</span>
    ${p.shiny ? '<span class="card__shiny" aria-hidden="true">★</span>' : ''}
    <img class="card__img" src="${esc(img || spriteChico(p.id))}" alt="" loading="lazy" decoding="async" crossorigin="anonymous">
    <span class="card__nombre">${esc(nombre)}</span>
    <span class="pills">${pastillasTipos(p.types)}</span>
  </button>`;
}

// Tarjeta bloqueada: solo silueta y número, nada de información.
function tarjetaBloqueada(id) {
  return `<button class="card card--bloq" type="button" data-bloq="${id}" aria-label="Número ${id}, Pokémon no descubierto">
    <span class="card__num">#${pad3(id)}</span>
    <img class="card__img" src="${spriteChico(id)}" alt="" loading="lazy" decoding="async" crossorigin="anonymous">
    <span class="card__interrogante" aria-hidden="true">?</span>
    <span class="card__nombre">Pokémon no descubierto</span>
  </button>`;
}

function estadoVacio(titulo, texto, boton = '') {
  return `<div class="estado">
    <div class="estado__bola">${BOLA_VACIA}</div>
    <p class="estado__titulo">${esc(titulo)}</p>
    <p class="estado__texto">${esc(texto)}</p>
    ${boton}
  </div>`;
}

// Dibuja la colección según el filtro y la búsqueda actuales.
export function renderizarPokedex() {
  const coleccion = obtenerColeccion();
  const porId = new Map(coleccion.map((p) => [p.id, p]));
  const contenedor = $('#pokedex-contenido');
  $('#contador').textContent = pad3(coleccion.length);

  $$('.chip').forEach((c) => {
    const activo = c.dataset.filtro === filtros.modo;
    c.classList.toggle('is-on', activo);
    c.setAttribute('aria-pressed', String(activo));
  });

  const q = normalizarTexto(filtros.busqueda).replace(/^#/, '');
  let ids = Array.from({ length: TOTAL }, (_, i) => i + 1);
  if (filtros.modo === 'capturados') ids = ids.filter((id) => porId.has(id));
  if (filtros.modo === 'faltan') ids = ids.filter((id) => !porId.has(id));
  if (q) {
    // Los nombres solo se pueden buscar si el Pokémon ya fue capturado.
    ids = ids.filter((id) => {
      const p = porId.get(id);
      return String(id) === q || pad3(id) === q || String(id).startsWith(q) && /^\d+$/.test(q) || (p && normalizarTexto(p.name).includes(q));
    });
  }

  if (!ids.length) {
    if (!coleccion.length && filtros.modo === 'capturados' && !q) {
      contenedor.innerHTML = estadoVacio(
        'Tu Pokédex está vacía',
        'Escanea tu primer código QR para comenzar tu aventura.',
        '<button class="btn btn--lcd mt-4" type="button" data-accion="ver-todos">Ver los 151 pendientes</button>',
      );
    } else if (filtros.modo === 'faltan' && !q) {
      contenedor.innerHTML = estadoVacio('¡Pokédex completa!', 'Capturaste a los 151 Pokémon de Kanto. ¡Eres un Maestro Pokémon!');
    } else {
      contenedor.innerHTML = estadoVacio('Sin resultados', 'Prueba con otro nombre o número. Los nombres solo se buscan entre los Pokémon capturados.');
    }
    return;
  }

  contenedor.innerHTML = `<div class="grid-poke">${ids
    .map((id) => (porId.has(id) ? tarjetaCapturada(porId.get(id)) : tarjetaBloqueada(id)))
    .join('')}</div>`;
}
