/*
 * grunt-sencha-dependencies
 * https://github.com/mattgoldspink/grunt-sencha-dependencies
 *
 * Copyright (c) 2013 Matt Goldspink
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var sencha_utils = require('./lib/sencha_utils.js');

  // Please see the grunt documentation for more information regarding task
  // creation: https://github.com/gruntjs/grunt/blob/devel/docs/toc.md

  grunt.registerMultiTask('sencha_dependencies', 'Task to generate the ordered array of sencha depdendencies', function() {

    var options = this.options({});
    if (options.appFile && !options.appJs) {
      options.appJs = options.appFile;
    }
    grunt.log.writeln('Processing Sencha app file "' + options.appJs + '"...');
    var filesLoadedSoFar = sencha_utils.getDependenciesForAppJs(options.appJs, options.senchaDir);
    // finally push in our app.js
    grunt.log.writeln('    File array (' + filesLoadedSoFar.length + ') written to ' + 'sencha_dependencies_' + this.target);
    grunt.config.set('sencha_dependencies_' + this.target, filesLoadedSoFar);
  });

};
