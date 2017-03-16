'use strict';

var utils = require('lazy-cache')(require);
var fn = require;
require = utils;

/**
 * Lazily required module dependencies
 */

require('delete', 'del');
require('extend-shallow', 'extend');
require('fs-exists-sync', 'exists');
require('is-valid-app', 'isValid');
require('js-yaml', 'yaml');
require('semver', 'semver');
require('through2', 'through');
require('array-unique', 'unique');
require = fn;

utils.updateEngine = function(engines, arr) {
  engines = utils.toSemver(engines);
  arr = arr.map(function(version) {
    if (utils.isNumericVersion(version)) {
      var v = utils.toSemver(version);
      if (utils.semver.gt(v, engines)) {
        return utils.semver.clean(v);
      }
      return false;
    } else {
      return true;
    }
  }).filter(Boolean);

  var list = utils.engines(engines);
  for (var i = 0; i < list.length; i++) {
    var engine = utils.semver.clean(list[i]);
    if (arr.indexOf(engine) === -1) {
      arr.push(engine);
    }
  }

  arr = utils.unique(arr.map(utils.compressVersion));
  arr.sort();
  arr.reverse();
  return arr;
};

utils.engines = function(str) {
  var re = /(\D*)([\d.]+)\s*/;
  var engines = String(str).trim().split(' ');
  var res = [];
  for (var i = 0; i < engines.length; i++) {
    var m = re.exec(engines[i]);
    if (!m) continue;
    res.push(utils.toSemver(m[2]));
  }
  return res;
};

utils.isNumericVersion = function(str) {
  return /^[\s.\d]+$/.test(str);
};

utils.toSemver = function(version) {
  version = version.replace(/^\D*|\D*$/g, '');
  let increments = String(version).trim().split('.');
  while (increments.length < 3) increments.push('0');
  return increments.join('.');
};

utils.compressVersion = function(str) {
  str = String(str);
  var segs = str.trim().split('.');
  var len = segs.length;
  while (len--) {
    var v = segs[len];
    if (v >= 1) {
      return segs.join('.');
    }
    segs.pop();
  }
  return segs.join('.');
};

utils.contains = function(arr, version) {
  return arr.some(function(item) {
    return utils.toSemver(item.nodejs_version) === utils.toSemver(version);
  });
};

/**
 * Expose `utils` modules
 */

module.exports = utils;
