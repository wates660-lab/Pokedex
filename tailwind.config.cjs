/** Tailwind CSS: configuración de la Pokédex QR */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'ui-monospace', 'monospace'],
        lcd: ['VT323', 'ui-monospace', 'monospace'],
      },
      colors: {
        dex: {
          rojo: '#d4252b',
          'rojo-claro': '#ee4a50',
          'rojo-osc': '#8f1217',
          azul: '#35a2ff',
          amarillo: '#ffd23f',
          verde: '#43e08a',
          negro: '#17181d',
        },
        lcd: {
          DEFAULT: '#b9d3a0',
          2: '#a6c58b',
          3: '#8fb176',
          tinta: '#13301c',
        },
      },
    },
  },
  plugins: [],
};
