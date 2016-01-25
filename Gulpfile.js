var gulp = require('gulp');
var webpack = require('webpack-stream');
var shell = require('gulp-shell');
var gulpsync = require('gulp-sync')(gulp);

gulp.task('build-orderbook', function() {
  return gulp.src('orderbook/dist/npm/index.js')
  .pipe(webpack({
    output: {
      library: 'rippleOrderbook',
      filename: 'ripple-orderbook.js'
    },
    module: {
      loaders: [{
        test: /\.json/,
        loader: 'json-loader'
      }]
    }
  }))
  .pipe(gulp.dest('dist/'));
});

gulp.task('build-transactionparser', function() {
  return gulp.src('transactionparser/src/index.js')
  .pipe(webpack({
    output: {
      library: 'rippleTransactionParser',
      filename: 'ripple-transaction-parser.js'
    }
  }))
  .pipe(gulp.dest('dist/'));
});

gulp.task('build-messagesigner', function() {
  return gulp.src('messagesigner/src/message.js')
  .pipe(webpack({
    output: {
      library: 'rippleMessage',
      filename: 'ripple-message.js'
    }
  }))
  .pipe(gulp.dest('dist/'));
});

gulp.task('install-orderbook', shell.task('npm install', {cwd:'./orderbook'}));
gulp.task('install-transactionparser', shell.task('npm install', {cwd:'./transactionparser'}));
gulp.task('install-messagesigner', shell.task('npm install', {cwd:'./messagesigner'}));

gulp.task('default', gulpsync.sync([
  [
    'install-orderbook',
    'install-transactionparser',
    'install-messagesigner'
  ],
  [
    'build-orderbook',
    'build-transactionparser',
    'build-messagesigner'
  ]
]));
