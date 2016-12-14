'use strict';

require('mocha');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var update = require('update');
var npm = require('npm-install-global');
var copy = require('copy');
var del = require('delete');
var updater = require('..');
var pkg = require('../package');
var app;

var dir = __dirname;
var fixtures = path.resolve.bind(path, __dirname, 'fixtures');
var actual = path.resolve.bind(path, __dirname, 'actual');

function exists(name, re, cb) {
  if (typeof re === 'function') {
    cb = re;
    re = new RegExp(/./);
  }

  return function(err) {
    if (err) return cb(err);
    var filepath = actual(name);

    fs.stat(filepath, function(err, stat) {
      if (err) return cb(err);
      assert(stat);
      var str = fs.readFileSync(filepath, 'utf8');
      assert(re.test(str));
      del(path.dirname(filepath), cb);
    });
  };
}

describe('updater-appveyor', function() {
  if (!process.env.CI && !process.env.TRAVIS) {
    before(function(cb) {
      npm.maybeInstall('update', cb);
    });
  }

  beforeEach(function(cb) {
    app = update({silent: true});
    app.cwd = actual();
    app.disable('delete');
    app.option('srcBase', fixtures());
    app.option('dest', actual());
    copy('fixtures/test/*', 'actual/test', {cwd: dir, dot: true}, cb);
  });

  describe('tasks', function() {
    beforeEach(function() {
      app.use(updater)
        .disable('delete')
        .option('srcBase', fixtures())
        .option('dest', actual());
    });

    it('should run the `default` task with .build', function(cb) {
      app.build('default', exists('appveyor.yml', cb));
    });

    it('should run the `default` task with .update', function(cb) {
      app.update('default', exists('appveyor.yml', cb));
    });
  });

  if (!process.env.CI && !process.env.TRAVIS) {
    describe('updater (CLI)', function() {
      beforeEach(function() {
        app.use(updater);
      });

      it('should run the default task using the `updater-appveyor` name', function(cb) {
        app.update('updater-appveyor', exists('appveyor.yml', cb));
      });

      it('should run the default task using the `updater` updater alias', function(cb) {
        app.update('appveyor', exists('appveyor.yml', cb));
      });
    });
  }

  describe('updater (API)', function() {
    it('should run the default task on the updater', function(cb) {
      app.register('appveyor', updater);
      app.update('appveyor', exists('appveyor.yml', cb));
    });

    it('should run the `appveyor` task', function(cb) {
      app.register('appveyor', updater);
      app.update('appveyor:appveyor', exists('appveyor.yml', cb));
    });

    it('should run the `default` task when defined explicitly', function(cb) {
      app.register('appveyor', updater);
      app.update('appveyor:default', exists('appveyor.yml', cb));
    });
  });

  describe('sub-updater', function() {
    it('should work as a sub-updater', function(cb) {
      app.register('foo', function(foo) {
        foo.register('appveyor', updater);
      });
      app.update('foo.appveyor', exists('appveyor.yml', cb));
    });

    it('should run the `default` task by default', function(cb) {
      app.register('foo', function(foo) {
        foo.register('appveyor', updater);
      });
      app.update('foo.appveyor', exists('appveyor.yml', cb));
    });

    it('should run the `appveyor:default` task when defined explicitly', function(cb) {
      app.register('foo', function(foo) {
        foo.register('appveyor', updater);
      });
      app.update('foo.appveyor:default', exists('appveyor.yml', cb));
    });

    it('should run the `appveyor:appveyor` task', function(cb) {
      app.register('foo', function(foo) {
        foo.register('appveyor', updater);
      });
      app.update('foo.appveyor:appveyor', exists('appveyor.yml', cb));
    });

    it('should work with nested sub-updaters', function(cb) {
      app
        .register('foo', updater)
        .register('bar', updater)
        .register('baz', updater);
      app.update('foo.bar.baz', exists('appveyor.yml', cb));
    });
  });
});
