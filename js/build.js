import { build } from "bun";

// Build JavaScript files
await build({
entrypoints: [
"./js/countdown.js",
"./js/portfolio.js",
"./js/nav.js",
"./js/dark-mode.js",
  "./js/financials.js",
  "./js/news.js",
  "./js/media.js",
"./js/journal-feed.js",
"./js/post-feed.js",
"./js/posts-loader.js",
  "./js/socials.js",
  "./js/animations.js",
  "./js/markdown-parser.js",
  "./js/news-preview.js"
],
outdir: "./dist/js",
  minify: {
    whitespace: true,
    identifiers: true,
    syntax: true
  },
  naming: "[name].[hash].[ext]",
  sourcemap: "external",
  target: "browser",
  splitting: true,
  plugins: []
});

// Build CSS files (no minification)
await build({
  entrypoints: [
    "./css/body.css",
    "./css/dark-mode.css",
    "./css/page-titles.css",
    "./css/index.css",
    "./css/news.css",
    "./css/journal-tweets.css",
    "./css/media.css",
    "./css/financials.css",
    "./css/read.css",
    "./css/chart-modal.css",
    "./css/newspaper-titles.css"
  ],
  outdir: "./dist/css",
  naming: "[name].[hash].[ext]",
  target: "browser"
});

console.log("Build completed! Files output to ./dist");