import { build } from "bun";

await build({
  entrypoints: [
    "./html/js/countdown.js", 
    "./html/js/portfolio.js", 
    "./html/js/nav.js",
    "./html/js/dark-mode.js",
    "./html/js/financials-chart.js"
  ],
  outdir: "./html/dist",
  minify: {
    whitespace: true,
    identifiers: true,
    syntax: true
  },
  naming: "[dir]/[name].[hash].[ext]",
  sourcemap: "external",
  target: "browser",
  splitting: true,
  plugins: []
});

console.log("Build completed! Files output to ./html/dist");