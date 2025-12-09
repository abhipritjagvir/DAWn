// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // base dark palette that your components use
        bg0: "#090b11",
        bg1: "#0e121a",
        textHi: "#e9eef6",
        textLo: "#9aa6b2",
        accent: {
          DEFAULT: "#22d3ee", // used by focus rings in components
          60: "rgba(34,211,238,0.60)",
          10: "rgba(34,211,238,0.10)",
        },
      },
    },
  },
  plugins: [],
};
