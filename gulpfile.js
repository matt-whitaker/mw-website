"use strict";

// =========== DEPENDENCIES

// System
const path        = require('path');

// Utils
const es          = require('event-stream');
const prettyJson  = require('prettyjson');
const through2    = require('through2');
const del         = require('del');
const _           = require('lodash');
const bowerFiles  = require('main-bower-files');
const argv        = require('yargs').argv;
const sequence    = require('run-sequence');
const babelify    = require('babelify');


// Gulp
const gulp        = require('gulp');
const flatten     = require('gulp-flatten');
const browserify  = require('gulp-browserify');
const less        = require('gulp-less');
const template    = require('gulp-template');
const symlink     = require('gulp-sym');
const uglify      = require('gulp-uglify');
const gif         = require('gulp-if');
const rename      = require('gulp-rename');
const minifyCss   = require('gulp-minify-css');
const zip         = require('gulp-zip');
const webpack     = require('gulp-webpack');
const babel       = require('gulp-babel');

// Custom
const angularify  = require('./tasks/angularify.js');
const bindOutput  = require('./tasks/bindOutput.js');

// =========== END DEPENDENCIES



// =========== ENVIRONMENT

const pkg           = require('./package.json');

// =========== END ENVIRONMENT



// =========== PATHS

const BUILD_NAME = 'disjointedthinking';
const WORKING_DIRECTORY = process.cwd() + '/';

const DIST_PATH_ROOT = 'dist/' + BUILD_NAME + '/';
const DEPLOY_PATH_ROOT = 'dist/';

const IMAGE_SRC_PATH = 'assets/images/';
const SCRIPTS_SRC_PATH = 'scripts/';

const COMPONENTS_SRC_PATH = 'src/components/';
const VIEWS_SRC_PATH = 'src/views/';
const TEMPLATES_SRC_PATH = 'src/templates/';
const LESS_SRC_PATH = 'src/less/';
const JS_SRC_PATH = 'src/js/';

const IMAGE_DIST_PATH = DIST_PATH_ROOT + 'images/';
const SCRIPTS_DIST_PATH = DIST_PATH_ROOT;

const TEMPLATES_DIST_PATH = DIST_PATH_ROOT + 'templates/';
const CSS_DIST_PATH = DIST_PATH_ROOT;
const JS_DIST_PATH = DIST_PATH_ROOT + 'js/';

const WP_THEME_PATH  = 'wordpress/wp-content/themes/' + BUILD_NAME + '/';

// =========== END PATHS


let TEMPLATE_VM = { JS: {}, CSS: {} };

// =========== INDEX TASKS

gulp.task('clean-index', () => {
  return del([
    DIST_PATH_ROOT + 'index.php'
  ])
});

gulp.task('build-index', () => {
  return gulp.src(WORKING_DIRECTORY + 'index.php')
    .pipe(template(TEMPLATE_VM))
    .pipe(gulp.dest(DIST_PATH_ROOT));
});

// =========== END INDEX TASKS



// =========== TEMPLATE TASKS

gulp.task('clean-templates', () => {
  return del([
    TEMPLATES_DIST_PATH + '**/*.html',
    TEMPLATES_DIST_PATH
  ]);
});

gulp.task('build-templates', ['clean-templates'], () => {
  return gulp.src([
    WORKING_DIRECTORY + TEMPLATES_SRC_PATH + '**/*.html',
    WORKING_DIRECTORY + COMPONENTS_SRC_PATH + '**/*.html',
    WORKING_DIRECTORY + VIEWS_SRC_PATH + '**/*.html'
  ])
  .pipe(flatten())
  .pipe(gulp.dest(TEMPLATES_DIST_PATH))
});

// =========== END TEMPLATES TASKS



// =========== IMAGE TASKS

gulp.task('clean-images', () => {
  return del([
    IMAGE_DIST_PATH + '**/*',
    IMAGE_DIST_PATH
  ]);
});

gulp.task('build-images', ['clean-images'], () => {
  return gulp.src(WORKING_DIRECTORY + IMAGE_SRC_PATH + '**/*')
    .pipe(gulp.dest(IMAGE_DIST_PATH));
});

// =========== END IMAGE TASKS



// =========== SCRIPT TASKS

gulp.task('clean-scripts', () => {
  return del([
    SCRIPTS_DIST_PATH + '**/*.php',
    '!' + SCRIPTS_DIST_PATH + 'index.php'
  ]);
});

gulp.task('build-scripts', ['clean-scripts'], () => {
  return gulp.src(WORKING_DIRECTORY + SCRIPTS_SRC_PATH + '**/*')
    .pipe(gulp.dest(SCRIPTS_DIST_PATH));
});

// =========== END SCRIPT TASKS



// =========== JS TASKS

gulp.task('clean-js', () => {
  return del([
    JS_DIST_PATH + '**/*.js',
    JS_DIST_PATH + '**'
  ])
});

gulp.task('build-js', ['clean-js'], () => {
  return es.merge(
    gulp.src(_.filter(bowerFiles(), function (file) {
        return _.endsWith(path.basename(file), '.js');
      }))
      .pipe(flatten())
      .pipe(bindOutput(TEMPLATE_VM.JS, 'LIBS'))
      .pipe(gulp.dest(JS_DIST_PATH)),

    gulp.src([
      WORKING_DIRECTORY + JS_SRC_PATH + '**/*.js',
      WORKING_DIRECTORY + COMPONENTS_SRC_PATH + '**/*.js',
      WORKING_DIRECTORY + VIEWS_SRC_PATH + '**/*.js'
    ])
      .pipe(angularify({
        root: 'app.js',
        module: 'mw.app',
        dependencies: [
          'ui.router',
          'ngAnimate',
          'ngScrollSpy'
        ]
      }))
      .pipe(browserify({
        insertGlobals : true,
        debug : !argv.prod,
        transform: [babelify.configure({
          presets: ["es2015"]
        })]
      }))
      .on('error', function (error) {
        console.log(error.toString());
        this.emit('end');
      })

      // Prod
      //.pipe(gif(argv.prod, rename({ suffix: '.min' })))
      .pipe(gif(argv.prod, uglify()))
      // End Prod

      .pipe(gulp.dest(JS_DIST_PATH))
  )
});

// =========== END JS TASKS



// =========== CSS TASKS

gulp.task('clean-css', () => {
  return del([
    CSS_DIST_PATH + '**/*.css'
  ])
});

gulp.task('build-css', ['clean-css'], () => {
  return es.merge(
    gulp.src(_.filter(bowerFiles(), function (file) {
        return _.endsWith(path.basename(file), '.css');
      }))
      .pipe(flatten())
      .pipe(bindOutput(TEMPLATE_VM.CSS, 'LIBS'))
      .pipe(gulp.dest(CSS_DIST_PATH + "css/")),

    gulp.src(WORKING_DIRECTORY + LESS_SRC_PATH + 'app.less')
      .pipe(less({
        paths: [
          WORKING_DIRECTORY + LESS_SRC_PATH,
          WORKING_DIRECTORY + COMPONENTS_SRC_PATH,
          WORKING_DIRECTORY + VIEWS_SRC_PATH
        ]
      }))
      .on('error', function (error) {
        console.log(error.toString());
        this.emit('end');
      })
      .pipe(rename('style.css'))

      // Prod
      .pipe(gif(argv.prod, minifyCss()))
      // End Prod

      .pipe(gulp.dest(CSS_DIST_PATH))
  )
});

// =========== END CSS TASKS

gulp.task('clean-deploy', () => {
  return del([
    DEPLOY_PATH_ROOT + BUILD_NAME + '.zip'
  ]);
});

gulp.task('build-deploy', ['clean-deploy'], () => {
  return gulp.src(DIST_PATH_ROOT + '*/**')
    .pipe(zip(BUILD_NAME + '.zip'))
    .pipe(gulp.dest(DEPLOY_PATH_ROOT));
});

gulp.task('clean-link', () => {
  return del([
    WP_THEME_PATH
  ]);
});

gulp.task('build-link', ['clean-link'], () => {
  return gulp.src(DIST_PATH_ROOT)
    .pipe(symlink(WP_THEME_PATH));
});

gulp.task('clean-all', [
  'clean-js',
  'clean-css',
  'clean-images',
  'clean-scripts',
  'clean-templates'
], () => {
  return del([DIST_PATH_ROOT]);
});

gulp.task('build-all', () => {
  return sequence(
    [
      'build-js',
      'build-css',
      'build-images',
      'build-scripts',
      'build-templates'
    ],
    'build-index'
  );
});

gulp.task('build-app', ['build-all']);

gulp.task('watch-all', ['build-all'], () => {
  gulp.watch([
    WORKING_DIRECTORY + JS_SRC_PATH + '**/*.js',
    WORKING_DIRECTORY + COMPONENTS_SRC_PATH + '**/*.js',
    WORKING_DIRECTORY + VIEWS_SRC_PATH + '**/*.js'
  ], ['build-js']);

  gulp.watch([
    WORKING_DIRECTORY + LESS_SRC_PATH + '**/*.less',
    WORKING_DIRECTORY + COMPONENTS_SRC_PATH + '**/*.less',
    WORKING_DIRECTORY + VIEWS_SRC_PATH + '**/*.less'
  ], ['build-css']);

  gulp.watch([
    WORKING_DIRECTORY + TEMPLATES_SRC_PATH + '**/*.html',
    WORKING_DIRECTORY + COMPONENTS_SRC_PATH + '**/*.html',
    WORKING_DIRECTORY + VIEWS_SRC_PATH + '**/*.html'
  ], ['build-templates']);

  gulp.watch(WORKING_DIRECTORY + IMAGE_SRC_PATH + '**/*', ['build-images']);
  gulp.watch(WORKING_DIRECTORY + SCRIPTS_SRC_PATH + '**/*.php', ['build-scripts']);

  gulp.watch(WORKING_DIRECTORY + 'index.php', ['build-index']);
});

gulp.task('default', ['build-app', 'build-link', 'watch-all']);
gulp.task('build', ['build-app', 'build-link']);
