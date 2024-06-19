/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/index.html", "./src/**/*.{html,js}"],
  safelist: [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "duration-300",
    "duration-500",
    "flex",
    "flex-row",
    "items-center",
    "gap-1",
    "gap-2",
    "inline-flex",
    "px-4",
    "py-1",
    "bg-green-500",
    "rounded",
    "text-white",
    "font-bold",
    "hover:bg-green-600",
    "h-6",
    "w-6",
    "brightness-0",
    "invert",
    "hidden",
    "lg:block",
    "text-blue-800",
    "hover:underline",
    "w-fit",
    "overflow-text",
    "px-0",
    "grid",
    "grid-cols-4",
    "w-fit",
    "self-end",
    "grid-cols-[auto,1fr,auto,auto]",
    {
      pattern: /bg-(red|green|blue|gray)-(100|200|300|400|500)/,
      variants: ["hover", "focus", "active"],
    },
    {
      pattern: /duration-(300|500|700|1000)/,
    },
  ],
  theme: {
    extend: {
      keyframes:{
        gradient:{
          "0%":{backgroundPosition: "0% 50%"},
          "100%":{backgroundPosition: "100% 50%"}
        }
      },
      animation:{
        gradient:"gradient 2s linear infinite"
      }
    },
  },
  plugins: [],
};
