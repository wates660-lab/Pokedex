// progreso.js · pantalla de progreso, medallas y estadísticas
import { TOTAL, TIPOS, MEDALLAS } from './config.js';
import { obtenerColeccion, medallasVistas, guardarMedallasVistas } from './storage.js';
import { $, esc, pad3, formatearNombre } from './ui.js';

// Dibujo de cada medalla (cada una tiene su propia forma).
function medallaSVG(m) {
  const borde = '#17181d';
  const claro = 'rgba(255,255,255,.55)';
  const formas = {
    roca: `<polygon points="32,5 55,18 55,46 32,59 9,46 9,18" fill="${m.color}" stroke="${borde}" stroke-width="3"/><polygon points="32,15 46,23 46,41 32,49 18,41 18,23" fill="${claro}"/>`,
    cascada: `<path d="M32 5 C32 5 12 28 12 41 a20 20 0 0 0 40 0 C52 28 32 5 32 5Z" fill="${m.color}" stroke="${borde}" stroke-width="3"/><path d="M24 40 a8 8 0 0 0 7 8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    trueno: `<polygon points="32,3 40,22 60,20 44,34 54,56 32,44 10,56 20,34 4,20 24,22" fill="${m.color}" stroke="${borde}" stroke-width="3" stroke-linejoin="round"/><polygon points="34,17 24,34 32,34 29,47 41,28 33,28" fill="#fff8d0"/>`,
    arcoiris: [0, 1, 2, 3, 4, 5].map((k) => `<circle cx="${32 + 17 * Math.cos((k * Math.PI) / 3)}" cy="${32 + 17 * Math.sin((k * Math.PI) / 3)}" r="11" fill="${m.color}" stroke="${borde}" stroke-width="3"/>`).join('') + `<circle cx="32" cy="32" r="10" fill="#fff" stroke="${borde}" stroke-width="3"/>`,
    alma: `<path d="M32 57 C8 40 6 20 19 13 C27 9 32 15 32 19 C32 15 37 9 45 13 C58 20 56 40 32 57Z" fill="${m.color}" stroke="${borde}" stroke-width="3" stroke-linejoin="round"/><circle cx="23" cy="24" r="4" fill="${claro}"/>`,
    pantano: `<circle cx="32" cy="32" r="27" fill="${m.color}" stroke="${borde}" stroke-width="3"/><circle cx="32" cy="32" r="18" fill="none" stroke="${claro}" stroke-width="4"/><circle cx="32" cy="32" r="8" fill="${claro}"/>`,
    volcan: `<polygon points="32,3 61,32 32,61 3,32" fill="${m.color}" stroke="${borde}" stroke-width="3" stroke-linejoin="round"/><path d="M32 16 C38 26 44 28 40 38 C38 44 26 44 24 38 C22 32 28 30 28 24 C30 26 32 24 32 16Z" fill="#ffd37a"/>`,
    tierra: `<circle cx="32" cy="32" r="27" fill="${m.color}" stroke="${borde}" stroke-width="3"/><path d="M8 28 Q32 18 56 28 M8 38 Q32 48 56 38" fill="none" stroke="${claro}" stroke-width="4"/><circle cx="32" cy="32" r="6" fill="#fff" stroke="${borde}" stroke-width="3"/>`,
  };
  return `<svg viewBox="0 0 64 64" role="img" aria-label="${esc(m.nombre)}">${formas[m.id]}</svg>`;
}

export const medallasGanadas = (cantidad) => MEDALLAS.filter((m) => cantidad >= m.req);

// Compara con las medallas ya vistas y devuelve las recién desbloqueadas.
export function revisarMedallasNuevas() {
  const vistas = medallasVistas();
  const nuevas = medallasGanadas(obtenerColeccion().length).filter((m) => !vistas.includes(m.id));
  if (nuevas.length) guardarMedallasVistas([...vistas, ...nuevas.map((m) => m.id)]);
  return nuevas;
}

// Marca las medallas ya ganadas como vistas (al abrir la app no se anima nada).
export function sincronizarMedallas() {
  guardarMedallasVistas(medallasGanadas(obtenerColeccion().length).map((m) => m.id));
}

export function actualizarProgreso({ medallasNuevas = [] } = {}) {
  const coleccion = obtenerColeccion();
  const total = coleccion.length;
  const pct = (total / TOTAL) * 100;

  $('#prog-cap').textContent = String(total);
  $('#prog-pct').textContent = `${pct.toFixed(1)} %`;
  const barra = $('#prog-barra');
  barra.setAttribute('aria-valuenow', String(total));
  barra.setAttribute('aria-valuetext', `${total} de ${TOTAL} Pokémon, ${Math.round(pct)} por ciento`);
  // requestAnimationFrame para que la barra se anime al cambiar
  requestAnimationFrame(() => { $('#prog-relleno').style.width = `${pct}%`; });

  $('#prog-texto').textContent = total === 0
    ? 'Aún no has capturado ninguno. ¡Escanea tu primer QR!'
    : total >= TOTAL
      ? '¡Completaste la Pokédex de Kanto!'
      : `Te faltan ${TOTAL - total} Pokémon por descubrir.`;

  // Medallas
  const ids = new Set(medallasNuevas.map((m) => m.id));
  $('#medallas').innerHTML = MEDALLAS.map((m) => {
    const ganada = total >= m.req;
    return `<div class="medalla ${ganada ? '' : 'medalla--bloq'} ${ids.has(m.id) ? 'medalla--nueva' : ''}" title="${esc(m.nombre)} · líder ${esc(m.lider)}">
      ${medallaSVG(m)}<small>${ganada ? esc(m.nombre.replace('Medalla ', '')) : `${m.req} 🔒`}</small></div>`;
  }).join('');

  // Por tipo
  const conteo = {};
  coleccion.forEach((p) => p.types.forEach((t) => { conteo[t] = (conteo[t] || 0) + 1; }));
  const filas = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  const maximo = filas[0]?.[1] || 1;
  $('#por-tipo').innerHTML = filas.length
    ? filas.map(([t, n]) => `<div class="tipo-fila" style="--c1:${TIPOS[t]?.c1 || '#888'}">
        <span>${TIPOS[t]?.icono || '●'} ${esc(TIPOS[t]?.es || t)}</span>
        <span class="tipo-fila__barra"><i data-w="${(n / maximo) * 100}"></i></span><b style="font-weight:400;text-align:right">${n}</b></div>`).join('')
    : '<p class="texto-lcd">Captura Pokémon para ver tus tipos favoritos.</p>';
  requestAnimationFrame(() => {
    document.querySelectorAll('#por-tipo i[data-w]').forEach((i) => { i.style.width = `${i.dataset.w}%`; });
  });

  // Resumen
  const shinies = coleccion.filter((p) => p.shiny).length;
  const ultimo = [...coleccion].sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))[0];
  const filasResumen = [
    ['Capturados', `${total} / ${TOTAL}`],
    ['Por descubrir', String(TOTAL - total)],
    ['Shiny ★', String(shinies)],
    ['Medallas', `${medallasGanadas(total).length} / ${MEDALLAS.length}`],
    ['Último capturado', ultimo ? `#${pad3(ultimo.id)} ${formatearNombre(ultimo.name)}` : '—'],
  ];
  $('#resumen').innerHTML = filasResumen.map(([a, b]) => `<div class="resumen-fila"><span>${esc(a)}</span><b style="font-weight:400">${esc(b)}</b></div>`).join('');
}
