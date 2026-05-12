/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface:       '#F7F7F7',
        'surface-2':   '#EFEFEF',
        border:        '#E0E0E0',
        'border-dark': '#C0C0C0',
        text1:         '#0A0A0A',
        text2:         '#404040',
        text3:         '#888888',
        action:        '#000000',
        'action-text': '#FFFFFF',
        danger:        '#CC0000',
        success:       '#1A7A4A',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
