/********************************************************
 * Required (Declaration)
 *********************************************************/
var gulp        = require('gulp'),
    uglify      = require('gulp-uglify'),
    rename      = require('gulp-rename'),
    plumber     = require('gulp-plumber'),
    autoprefix  = require('gulp-autoprefixer'),             //?
    browserSync = require('browser-sync');
    reload      = browserSync.reload;

/********************************************************
 * Scripts Task
 *********************************************************/
gulp.task('scripts', function(){
  gulp.src(['./javascript/*.js',
    '!./javascript/**/*min.js',
    '!./javascript/app_old.js'])
    .pipe(plumber())
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest('./javascript/dist'))
    .pipe(reload({stream: true}))
});

/********************************************************
 * HTML / CSS Tasks
 *********************************************************/
gulp.task('html', function(){
  gulp.src('./**/*.html')
});

/********************************************************
 * Browser-Sync Tasks
 *********************************************************/
gulp.task('browser-sync', function(){
  browserSync({
    //server: {
    //  baseDir: './'
    //},
    proxy: '127.0.0.1:3000'
  })
});

/********************************************************
 * Watch Tasks
 *********************************************************/
gulp.task('watch', function(){
  //gulp.watch(['./css/*.css', './javascript/*.js', './*.html']).on('change', browserSync.reload);
  gulp.watch(['./javascript/*.js',
    '!./javascript/**/*min.js',
    '!./javascript/app_old.js'], ['scripts'])
});

/********************************************************
 * Default Task
 *********************************************************/
gulp.task('default', ['scripts', 'browser-sync', 'watch']);