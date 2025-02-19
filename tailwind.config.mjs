/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      minHeight: {
        screen: "100dvh",
      },
      height: {
        screen: "100dvh",
      },
      minWidth: {
        screen: "100dvw",
      },
      width: {
        screen: "100dvw",
      },
    },
  },
  plugins: [],
};
