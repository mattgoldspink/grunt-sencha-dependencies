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

    var options = this.options({});
    if (options.appFile && !options.appJs) {
      options.appJs = options.appFile;
    }
    grunt.log.writeln('Processing Sencha app file "' + options.appJs + '"...');
    var filesLoadedSoFar = new SenchaDependencyChecker(options.appJs, options.senchaDir).getDependencies();
    // finally push in our app.js
    grunt.log.writeln('    File array (' + filesLoadedSoFar.length + ') written to ' + 'sencha_dependencies_' + this.target);
    grunt.config.set('sencha_dependencies_' + this.target, filesLoadedSoFar);
  });

};
