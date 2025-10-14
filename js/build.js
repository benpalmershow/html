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
  minify: true,
  naming: "[dir]/[name].[hash].[ext]",
  sourcemap: "external"
});

console.log("Build completed! Files output to ./html/dist");