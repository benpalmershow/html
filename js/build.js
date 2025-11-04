import { build } from "bun";

await build({
  entrypoints: [
    "./js/countdown.js",
    "./js/portfolio.js",
    "./js/nav.js",
    "./js/dark-mode.js",
    "./js/financials.js"
  ],
  outdir: "./dist",
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