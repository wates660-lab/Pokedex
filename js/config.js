// config.js · constantes de la Pokédex

export const TOTAL = 151;
export const STORAGE_KEY = 'pokemonCapturados';
export const MEDALLAS_KEY = 'pokedexMedallasVistas';
export const PREFS_KEY = 'pokedexPrefs';
export const PROB_SHINY = 1 / 20;

export const API = 'https://pokeapi.co/api/v2';
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
export const spriteChico = (id) => `${SPRITES}/${id}.png`;
export const spriteChicoShiny = (id) => `${SPRITES}/shiny/${id}.png`;
export const arteOficial = (id) => `${SPRITES}/other/official-artwork/${id}.png`;
export const arteShiny = (id) => `${SPRITES}/other/official-artwork/shiny/${id}.png`;

// Tipos: nombre en español, icono y colores (c1 = claro, c2 = oscuro).
export const TIPOS = {
  normal:   { es: 'Normal',     icono: '⚪', c1: '#A8A77A', c2: '#6D6D4E' },
  fire:     { es: 'Fuego',      icono: '🔥', c1: '#EE8130', c2: '#9C531F' },
  water:    { es: 'Agua',       icono: '💧', c1: '#6390F0', c2: '#445E9C' },
  electric: { es: 'Eléctrico',  icono: '⚡', c1: '#F7D02C', c2: '#A1871F' },
  grass:    { es: 'Planta',     icono: '🍃', c1: '#7AC74C', c2: '#4E8234' },
  ice:      { es: 'Hielo',      icono: '❄️', c1: '#96D9D6', c2: '#638D8B' },
  fighting: { es: 'Lucha',      icono: '🥊', c1: '#C22E28', c2: '#7D1F1A' },
  poison:   { es: 'Veneno',     icono: '☠️', c1: '#A33EA1', c2: '#682A67' },
  ground:   { es: 'Tierra',     icono: '🏜️', c1: '#E2BF65', c2: '#927D44' },
  flying:   { es: 'Volador',    icono: '🕊️', c1: '#A98FF3', c2: '#6D5E9C' },
  psychic:  { es: 'Psíquico',   icono: '🔮', c1: '#F95587', c2: '#A13959' },
  bug:      { es: 'Bicho',      icono: '🐛', c1: '#A6B91A', c2: '#6B7712' },
  rock:     { es: 'Roca',       icono: '🪨', c1: '#B6A136', c2: '#786824' },
  ghost:    { es: 'Fantasma',   icono: '👻', c1: '#735797', c2: '#493963' },
  dragon:   { es: 'Dragón',     icono: '🐉', c1: '#6F35FC', c2: '#4924A1' },
  steel:    { es: 'Acero',      icono: '⚙️', c1: '#B7B7CE', c2: '#787887' },
  dark:     { es: 'Siniestro',  icono: '🌙', c1: '#705746', c2: '#49392F' },
  fairy:    { es: 'Hada',       icono: '✨', c1: '#D685AD', c2: '#9B6470' },
};

// Pokébolas: la que se necesita depende de lo difícil que sea el Pokémon.
export const BOLAS = {
  poke:   { nombre: 'Poké Ball',   top: '#e53935', acento: '#ffffff' },
  great:  { nombre: 'Super Ball',  top: '#1e6fe0', acento: '#e53935' },
  ultra:  { nombre: 'Ultra Ball',  top: '#2b2b33', acento: '#ffd43b' },
  master: { nombre: 'Master Ball', top: '#7b3fe4', acento: '#ff7ac8' },
};

// Estadísticas base en español.
export const STATS = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'At. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidad',
};

// Medallas de Kanto: se ganan al capturar cierta cantidad de Pokémon.
export const MEDALLAS = [
  { id: 'roca',     nombre: 'Medalla Roca',     lider: 'Brock',    req: 5,   color: '#a79373' },
  { id: 'cascada',  nombre: 'Medalla Cascada',  lider: 'Misty',    req: 15,  color: '#3aa0ff' },
  { id: 'trueno',   nombre: 'Medalla Trueno',   lider: 'Lt. Surge', req: 30, color: '#ffd43b' },
  { id: 'arcoiris', nombre: 'Medalla Arcoíris', lider: 'Erika',    req: 50,  color: '#4cc36a' },
  { id: 'alma',     nombre: 'Medalla Alma',     lider: 'Koga',     req: 75,  color: '#ff5fa2' },
  { id: 'pantano',  nombre: 'Medalla Pantano',  lider: 'Sabrina',  req: 100, color: '#b05cff' },
  { id: 'volcan',   nombre: 'Medalla Volcán',   lider: 'Blaine',   req: 125, color: '#ff5a36' },
  { id: 'tierra',   nombre: 'Medalla Tierra',   lider: 'Giovanni', req: 151, color: '#2f9e44' },
];
