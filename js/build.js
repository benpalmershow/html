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

console.log("Build completed! JS files output to ./dist/js");
