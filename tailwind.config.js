/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/index.html',
    './src/**/*.{html,js}',
  ],
  safelist: [
   
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 
    'duration-300', 'duration-500', 
   
    {
      pattern: /bg-(red|green|blue)-(100|200|300|400|500)/,
      variants: ['hover', 'focus', 'active'],
    },
    {
      pattern: /duration-(300|500|700|1000)/,
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

