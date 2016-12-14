'use strict';

var path = require('path');
var defaults = require('./templates/defaults');
var utils = require('./utils');

module.exports = function(app) {
  if (!utils.isValid(app, 'updater-appveyor')) return;
  var ctx = {paths: {}, tasks: []};
  var calculated;

  /**
   * Register a Generate generator, for creating a new `appveyor.yml` file
   * when specified by the user.
   */

  app.register('generate-appveyor', require('generate-appveyor'));

  /**
   * Delete the `appveyor.yml` file in the current working directory. This task is also aliased
   * as `appveyor:appveyor-del` to free up the `new` task name in case you use this updater as
   * a [plugin](#api).
   *
   * ```sh
   * $ update appveyor:del
   * ```
   * @name appveyor:del
   * @api public
   */

  app.task('del', ['appveyor-del']);
  app.task('appveyor-del', function(cb) {
    utils.del(['appveyor.yml'], {cwd: app.cwd}, cb);
  });

  /**
   * Add a new `appveyor.yml` file using [templates/appveyor.yml](template/appveyor.yml) as a template.
   * This task is also aliased as `appveyor:appveyor-new` to free up the `new` task name in case you use this
   * updater as a [plugin](#api).
   *
   * ```sh
   * $ update appveyor:new
   * ```
   * @name appveyor:new
   * @api public
   */

  app.task('new', ['appveyor-new']);
  app.task('appveyor-new', ['paths'], function(cb) {
    app.generate('generate-appveyor:appveyor', cb);
  });

  /**
   * Update an existing `appveyor.yml` file with the defaults in [templates/defaults.js](template/defaults.js).
   * Aliased as `appveyor:appveyor-update` to free up the `update` task name in case you use this
   * updater as a [plugin](#api).
   *
   * ```sh
   * $ update appveyor:update
   * ```
   * @name appveyor:update
   * @api public
   */

  app.task('update', ['appveyor-update']);
  app.task('appveyor-update', ['paths'], function() {
    var srcBase = app.options.srcBase || app.cwd;
    return app.src('appveyor.yml', {cwd: srcBase, dot: true})
      .pipe(appveyorUpdate(app))
      .pipe(app.dest(app.cwd));
  });

  /**
   * The default task calls the other tasks to either update an existing `appveyor.yml` file or
   * add a new `appveyor.yml` file if one doesn't already exist. Aliased as `appveyor:appveyor` so you
   * can use this updater as a [plugin](#api) and safely overwrite the `default` task.
   *
   * ```sh
   * $ update appveyor
   * ```
   * @name appveyor
   * @api public
   */

  app.task('default', ['appveyor']);
  app.task('appveyor', ['paths'], function(cb) {
    app.build(ctx.tasks, cb);
  });

  /**
   * Calculate build paths
   */

  app.task('paths', {silent: true}, function(cb) {
    calculatePaths();
    cb();
  });

  function calculatePaths() {
    if (calculated) return ctx.tasks;
    calculated = true;

    var cwd = path.resolve.bind(path, app.options.dest || app.cwd);
    var hasAppveyor = utils.exists(cwd('appveyor.yml'));
    var hasTests = utils.exists(cwd('test')) || utils.exists(cwd('test.js'));
    ctx.tasks = hasTests && hasAppveyor ? ['appveyor-update'] : [hasTests ? 'appveyor-new' : 'appveyor-del'];
    return ctx.tasks;
  }
};

/**
 * Update `appveyor.yml`
 */

function appveyorUpdate(app) {
  var opts = utils.extend({}, app.options);

  return utils.through.obj(function(file, enc, next) {
    var engines = app.pkg.get('engines.node');
    var obj = utils.extend({}, defaults);
    // only pass in actual versions
    var arr = obj.environment.matrix.map(function(item) {
      return item.nodejs_version;
    });

    // convert versions to objects for appveyor
    obj.environment.matrix = utils.updateEngine(engines, arr).map(function(v) {
      return {nodejs_version: v};
    });

    if (opts.merge) {
      // keep existing and merge in missing versions
      var existing = utils.yaml.safeLoad(file.contents.toString());
      if (existing.environment && existing.environment.matrix) {
        var from = obj.environment.matrix;
        var to = existing.environment.matrix;
        from.forEach(function(item) {
          if (!utils.contains(to, item.nodejs_version)) {
            to.push(item);
          }
        });

        to.sort(function(a, b) {
          if (a.nodejs_version > b.nodejs_version) return -1;
          if (a.nodejs_version < b.nodejs_version) return 1;
          return 0;
        });
      }
      obj = utils.extend({}, obj, existing);
    }

    file.contents = new Buffer(utils.yaml.dump(obj));
    if (opts.delete === false) {
      next(null, file);
      return;
    }

    utils.del(file.path, function(err) {
      if (err) return next(err);
      next(null, file);
    });
  });
}
