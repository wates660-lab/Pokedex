// api.js · consulta a PokéAPI
import { API, arteOficial, arteShiny, spriteChico, spriteChicoShiny } from './config.js';

// Error con un "tipo" para mostrar el mensaje correcto al usuario.
export class ErrorApi extends Error {
  constructor(tipo, mensaje) {
    super(mensaje);
    this.tipo = tipo; // 'offline' | 'timeout' | 'red' | 'http' | 'datos'
  }
}

async function pedirJSON(url, esperaMs = 10000) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), esperaMs);
  try {
    const respuesta = await fetch(url, { signal: control.signal });
    if (!respuesta.ok) throw new ErrorApi('http', `PokéAPI respondió ${respuesta.status}`);
    return await respuesta.json();
  } catch (e) {
    if (e instanceof ErrorApi) throw e;
    if (!navigator.onLine) throw new ErrorApi('offline', 'Sin conexión');
    if (e.name === 'AbortError') throw new ErrorApi('timeout', 'La consulta tardó demasiado');
    if (e instanceof SyntaxError) throw new ErrorApi('datos', 'Respuesta ilegible');
    throw new ErrorApi('red', e.message);
  } finally {
    clearTimeout(reloj);
  }
}

// Texto legible: quita saltos de línea raros que trae la API.
const limpiarTexto = (t = '') => t.replace(/[\n\f\r]+/g, ' ').replace(/\s+/g, ' ').trim();

const textoEnIdioma = (lista = [], idioma) =>
  lista.filter((x) => x.language?.name === idioma);

// Nombre de la habilidad en español (si falla, queda el nombre en inglés).
async function traducirHabilidades(habilidades = []) {
  const resultados = await Promise.allSettled(
    habilidades.map((h) => pedirJSON(h.ability.url, 6000)),
  );
  return habilidades.map((h, i) => {
    const r = resultados[i];
    const es = r.status === 'fulfilled' ? textoEnIdioma(r.value.names, 'es')[0]?.name : null;
    const respaldo = h.ability.name.replace(/-/g, ' ');
    return { nombre: es || respaldo.charAt(0).toUpperCase() + respaldo.slice(1), oculta: !!h.is_hidden };
  });
}

// Elige la bola según la dificultad: legendarios con Master Ball, el resto según el ritmo de captura.
export function elegirBola({ legendario, tasaCaptura }) {
  if (legendario) return 'master';
  if (tasaCaptura >= 120) return 'poke';
  if (tasaCaptura >= 45) return 'great';
  return 'ultra';
}

// Consulta un Pokémon y devuelve todo lo necesario, ya ordenado.
export async function buscarPokemon(id) {
  const [poke, especie] = await Promise.all([
    pedirJSON(`${API}/pokemon/${id}`),
    pedirJSON(`${API}/pokemon-species/${id}`).catch(() => null), // la especie es un extra
  ]);
  if (!poke || poke.id !== Number(id) || !Array.isArray(poke.types) || !poke.types.length) {
    throw new ErrorApi('datos', 'Datos incompletos');
  }
  const habilidades = await traducirHabilidades(poke.abilities);
  const arte = poke.sprites?.other?.['official-artwork'];

  const entradas = [...textoEnIdioma(especie?.flavor_text_entries, 'es')];
  const entradasEn = textoEnIdioma(especie?.flavor_text_entries, 'en');
  const entrada = limpiarTexto((entradas.at(-1) || entradasEn.at(-1))?.flavor_text);
  const genero = textoEnIdioma(especie?.genera, 'es')[0]?.genus || textoEnIdioma(especie?.genera, 'en')[0]?.genus || '';

  const datos = {
    id: Number(id),
    name: poke.name,
    image: arte?.front_default || arteOficial(id),
    imageShiny: arte?.front_shiny || arteShiny(id),
    sprite: poke.sprites?.front_default || spriteChico(id),
    spriteShiny: poke.sprites?.front_shiny || spriteChicoShiny(id),
    types: [...poke.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    height: poke.height / 10, // metros
    weight: poke.weight / 10, // kilogramos
    abilities: habilidades,
    stats: poke.stats.map((s) => ({ clave: s.stat.name, valor: s.base_stat })),
    entry: entrada,
    genus: genero,
    tasaCaptura: especie?.capture_rate ?? 255,
    legendario: !!(especie?.is_legendary || especie?.is_mythical),
  };
  datos.bola = elegirBola(datos);
  return datos;
}

// Mensaje claro para cada tipo de error.
export function mensajeDeError(error) {
  switch (error?.tipo) {
    case 'offline':
      return { titulo: 'Sin conexión', texto: 'Para descubrir un Pokémon nuevo necesitas Internet. Tu colección guardada sigue disponible.' };
    case 'timeout':
      return { titulo: 'La consulta tardó demasiado', texto: 'Revisa tu señal e inténtalo otra vez.' };
    case 'http':
      return { titulo: 'PokéAPI no respondió bien', texto: 'El servicio tiene problemas ahora mismo. Intenta de nuevo en un momento.' };
    case 'datos':
      return { titulo: 'Datos inesperados', texto: 'La respuesta de PokéAPI no tenía el formato esperado.' };
    default:
      return { titulo: 'No fue posible consultar', texto: 'No fue posible consultar la información del Pokémon. Revisa tu conexión.' };
  }
}
