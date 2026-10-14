import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        zeus: '#1F1F23',
        rayo: '#F4B400',
        buganvilla: '#C2185B',
        fondo: '#FAF8F3',
        superficie: '#FFFFFF',
        libre: '#E7E5E0',
        'libre-texto': '#5F5F5F',
        pagada: '#2E8B57',
        debe: '#E8590C',
        peligro: '#C62828',
        borde: '#E2DED6',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
