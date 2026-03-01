/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './src/utils/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#FFFFFF',
        steel: '#A0ACC0',
        sea: '#00A3FF',
        sand: '#050B1C',
        ember: '#FF8A00'
      },
      boxShadow: {
        card: '0 16px 36px -22px rgba(0, 163, 255, 0.45)'
      }
    }
  },
  plugins: []
};
