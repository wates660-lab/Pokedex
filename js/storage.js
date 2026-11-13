// storage.js · colección y preferencias en localStorage
import { STORAGE_KEY, MEDALLAS_KEY, PREFS_KEY, TOTAL } from './config.js';

let coleccion = [];

// Estado del almacenamiento, para avisar al usuario si algo falla.
export const estadoAlmacen = { disponible: true, datosCorruptos: false };

export const prefs = { vibracion: true };

function leer(clave) {
  try {
    return localStorage.getItem(clave);
  } catch {
    estadoAlmacen.disponible = false;
    return null;
  }
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
    return true;
  } catch {
    estadoAlmacen.disponible = false;
    return false;
  }
}

// Revisa que un registro tenga lo mínimo y lo deja en formato estándar.
function normalizar(p) {
  if (!p || typeof p !== 'object') return null;
  const id = Number(p.id);
  if (!Number.isInteger(id) || id < 1 || id > TOTAL) return null;
  return {
    ...p,
    id,
    name: String(p.name || `pokemon-${id}`),
    image: p.image || '',
    types: Array.isArray(p.types) ? p.types.map(String) : [],
    capturedAt: p.capturedAt || new Date().toISOString(),
  };
}

// Lee la colección guardada. Si está vacía o dañada, empieza en cero sin romperse.
export function cargarColeccion() {
  const crudo = leer(STORAGE_KEY);
  let lista = [];
  if (crudo) {
    try {
      const datos = JSON.parse(crudo);
      if (Array.isArray(datos)) lista = datos;
      else estadoAlmacen.datosCorruptos = true;
    } catch {
      estadoAlmacen.datosCorruptos = true;
    }
  }
  const vistos = new Set();
  coleccion = lista
    .map(normalizar)
    .filter((p) => p && !vistos.has(p.id) && vistos.add(p.id));
  if (coleccion.length !== lista.length || estadoAlmacen.datosCorruptos) persistir();
  return coleccion;
}

function persistir() {
  return escribir(STORAGE_KEY, JSON.stringify(coleccion));
}

export const obtenerColeccion = () => coleccion;
export const obtenerPokemon = (id) => coleccion.find((p) => p.id === Number(id)) || null;
export const estaCapturado = (id) => coleccion.some((p) => p.id === Number(id));

// Guarda un Pokémon nuevo. Nunca duplica: si ya existe, no hace nada.
export function guardarPokemon(pokemon) {
  const nuevo = normalizar(pokemon);
  if (!nuevo) return { guardado: false, repetido: false, persistido: false };
  if (estaCapturado(nuevo.id)) return { guardado: false, repetido: true, persistido: true };
  coleccion.push(nuevo);
  return { guardado: true, repetido: false, persistido: persistir() };
}

// Completa datos que le falten a un Pokémon ya guardado.
export function actualizarPokemon(id, parcial) {
  const p = obtenerPokemon(id);
  if (!p) return null;
  Object.assign(p, parcial);
  persistir();
  return p;
}

export function borrarColeccion() {
  coleccion = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MEDALLAS_KEY);
  } catch {
    estadoAlmacen.disponible = false;
  }
}

// Medallas ya mostradas (para animar solo la primera vez)
export function medallasVistas() {
  try {
    const datos = JSON.parse(leer(MEDALLAS_KEY) || '[]');
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}
export function guardarMedallasVistas(ids) {
  escribir(MEDALLAS_KEY, JSON.stringify(ids));
}

// Preferencias
export function cargarPrefs() {
  try {
    const datos = JSON.parse(leer(PREFS_KEY) || '{}');
    if (typeof datos.vibracion === 'boolean') prefs.vibracion = datos.vibracion;
  } catch {
    // se usan los valores por defecto
  }
}
export function guardarPrefs() {
  escribir(PREFS_KEY, JSON.stringify(prefs));
}
