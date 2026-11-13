// bolas.js · dibujo SVG de las 4 pokébolas
import { BOLAS } from './config.js';

export function bolaSVG(tipo = 'poke') {
  const b = BOLAS[tipo] || BOLAS.poke;
  let marcas = '';
  if (tipo === 'great') {
    marcas = `<path d="M10 44 A40 40 0 0 1 30 18 L42 26 A27 27 0 0 0 26 46Z" fill="${b.acento}"/>
              <path d="M90 44 A40 40 0 0 0 70 18 L58 26 A27 27 0 0 1 74 46Z" fill="${b.acento}"/>`;
  } else if (tipo === 'ultra') {
    marcas = `<rect x="20" y="12" width="9" height="32" fill="${b.acento}" transform="rotate(-22 24 28)"/>
              <rect x="71" y="12" width="9" height="32" fill="${b.acento}" transform="rotate(22 76 28)"/>
              <rect x="44" y="6" width="12" height="14" fill="${b.acento}"/>`;
  } else if (tipo === 'master') {
    marcas = `<circle cx="26" cy="34" r="10" fill="${b.acento}"/><circle cx="74" cy="34" r="10" fill="${b.acento}"/>
              <text x="50" y="35" text-anchor="middle" font-size="17" font-weight="900" font-family="Arial,sans-serif" fill="#fff">M</text>`;
  }
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${b.nombre}">
    <circle cx="50" cy="50" r="46" fill="#f4f4f4"/>
    <path d="M4 50 a46 46 0 0 1 92 0 Z" fill="${b.top}"/>
    ${marcas}
    <path d="M10 62 A42 42 0 0 0 90 62 A46 46 0 0 1 10 62Z" fill="rgba(0,0,0,.12)"/>
    <rect x="4" y="45" width="92" height="10" fill="#17181d"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="#17181d" stroke-width="5"/>
    <circle cx="50" cy="50" r="14" fill="#17181d"/>
    <circle class="b-boton" cx="50" cy="50" r="8.5" fill="#f4f4f4"/>
    <path d="M17 36 A36 36 0 0 1 38 15" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
}
