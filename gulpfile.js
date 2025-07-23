const gulp = require('gulp');
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');
const del = require('del');

// Paths
const paths = {
  js: ['js/**/*.js'],
  css: ['css/**/*.css'],
  html: ['*.html'],
  dist: 'dist/',
  manifest: 'dist/rev-manifest.json'
};

// Clean dist folder
function clean() {
  return del(['dist/**/*']);
}

// Process JavaScript files - add hash to filename
function processJS() {
  return gulp.src(paths.js)
    .pipe(rev())
    .pipe(gulp.dest('dist/js'))
    .pipe(rev.manifest('js-manifest.json'))
    .pipe(gulp.dest('dist'));
}

// Process CSS files - add hash to filename
function processCSS() {
  return gulp.src(paths.css)
    .pipe(rev())
    .pipe(gulp.dest('dist/css'))
    .pipe(rev.manifest('css-manifest.json'))
    .pipe(gulp.dest('dist'));
}

// Update HTML files with new hashed filenames
function updateHTML() {
  const jsManifest = gulp.src('dist/js-manifest.json');
  const cssManifest = gulp.src('dist/css-manifest.json');
  
  return gulp.src(paths.html)
    .pipe(revReplace({ manifest: jsManifest }))
    .pipe(revReplace({ manifest: cssManifest }))
    .pipe(gulp.dest('dist'));
}

// Copy other assets (images, etc.)
function copyAssets() {
  return gulp.src(['images/**/*', 'site.webmanifest', 'favicon.ico'], { allowEmpty: true })
    .pipe(gulp.dest('dist'));
}

// Copy JSON data files
function copyJSON() {
  return gulp.src(['json/**/*.json'], { allowEmpty: true })
    .pipe(gulp.dest('dist/json'));
}

// Watch for changes
function watchFiles() {
  gulp.watch(paths.js, gulp.series(processJS, updateHTML));
  gulp.watch(paths.css, gulp.series(processCSS, updateHTML));
  gulp.watch(paths.html, updateHTML);
}

// Build task
const build = gulp.series(
  clean,
  gulp.parallel(processJS, processCSS),
  updateHTML,
  gulp.parallel(copyAssets, copyJSON)
);

// Development task
const dev = gulp.series(build, watchFiles);

// Export tasks
exports.clean = clean;
exports.build = build;
exports.watch = watchFiles;
exports.dev = dev;
exports.default = build;