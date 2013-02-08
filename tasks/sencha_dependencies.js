/*
 * grunt-sencha-dependencies
 * https://github.com/mattgoldspink/grunt-sencha-dependencies
 *
 * Copyright (c) 2013 Matt Goldspink
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var SenchaDependencyChecker = require('./lib/SenchaDependencyChecker.js');

  // Please see the grunt documentation for more information regarding task
  // creation: https://github.com/gruntjs/grunt/blob/devel/docs/toc.md

  grunt.registerMultiTask('sencha_dependencies', 'Task to generate the ordered array of sencha depdendencies', function() {
    var options, dependencyChecker, filesLoadedSoFar;
    options = this.options({});
    if (options.appFile && !options.appJs) {
      options.appJs = options.appFile;
    }
    grunt.log.writeln('Processing Sencha app file "' + options.appJs + '"...');
    dependencyChecker = new SenchaDependencyChecker(options.appJs, options.senchaDir, !!options.isTouch);
    filesLoadedSoFar = dependencyChecker.getDependencies();

    grunt.log.ok('Success! ' + filesLoadedSoFar.length + ' files added to property ' + 'sencha_dependencies_' + this.target);
    grunt.verbose.writeln("Files are:\n    " + filesLoadedSoFar.join('\n    '));
    grunt.config.set('sencha_dependencies_' + this.target, filesLoadedSoFar);
  });

};
