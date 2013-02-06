/*
 * grunt-sencha-dependencies
 * https://github.com/mattgoldspink/grunt-sencha-dependencies
 *
 * Copyright (c) 2013 Matt Goldspink
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var Ext = {
    Loader: {
    }
  };

  // Please see the grunt documentation for more information regarding task
  // creation: https://github.com/gruntjs/grunt/blob/devel/docs/toc.md

  grunt.registerMultiTask('sencha_dependencies', 'Your task description goes here.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      punctuation: '.',
      separator: ', '
    });

    grunt.log.writeln('Processing Sencha app file "' + options.appFile + '" created.');
    var src = [options.appFile].map(function(filepath) {
        // Warn if a source file/pattern was invalid.
        if (!grunt.file.exists(filepath)) {
          grunt.log.error('Source file "' + filepath + '" not found.');
          return '';
        }
        // Read file source.
        return grunt.file.read(filepath);
    }).join(options.separator);

    var lookupPaths = {
          "Ext": options.senchaDir + '/src'
        },
        filesLoadedSoFar = [],
        beingLoaded = [],
        classesSeenSoFar = {};

    var mapClassToFile = function(className) {
      var parts = className.split('.'),
          filepath;
      if (lookupPaths[parts[0]]) {
        filepath = lookupPaths[parts[0]] + '/' + parts.slice(1).join('/') + '.js';
      } else {
        filepath = parts.join('/') + '.js';
      }
      if (!grunt.file.exists(filepath)) {
        grunt.log.warn('Source file "' + filepath + '" not found.');
        return '';
      }
      return filepath;
    };

    var loadClassFileAndEval = function(className, onDone) {
      if (className) {
        var loadPath = mapClassToFile(className);
        if (loadPath != '' && !grunt.util._.contains(filesLoadedSoFar, loadPath) && !grunt.util._.contains(beingLoaded, loadPath)) {
          beingLoaded.push(loadPath);
          var contents = grunt.file.read(loadPath);
          eval(contents);
          filesLoadedSoFar.push(loadPath);
        }
      }
      if (onDone) {
        onDone();
      }
    };

    var defineClassNameSpace = function(className, aliasClassDef) {
      var parts = className.split('.'),
          previousPart = global;
      if (!classesSeenSoFar[className]) {
      }
      for (var i = 0, len = parts.length; i < len; i++) {
        var part = parts[i];
        if (previousPart[part] === undefined) {
          previousPart[part] = (i === (len - 1) && aliasClassDef ? aliasClassDef : {});
        }
        previousPart = previousPart[part] ;
      }
      classesSeenSoFar[className] = true;
      return previousPart;
    };

    var processClassConf = function(name, classConf) {
      var singletonConf = {}
      if (classConf.singleton) {
        for (var prop in classConf) {
            singletonConf[prop] = function(){
            };
        }
      }
      var classDef = defineClassNameSpace(name, singletonConf);
      if (classConf.alternateClassName) {
        if (typeof classConf.alternateClassName === "string") {
          classConf.alternateClassName  = [classConf.alternateClassName]
        }
        for (var i = 0, len = classConf.alternateClassName.length; i < len; i++) {
          var alternate = defineClassNameSpace(classConf.alternateClassName[i], classDef);
        }
      }
      if (classConf.extend) {
        loadClassFileAndEval(classConf.extend);
      }
      if (classConf.requires) {
        if (typeof classConf.requires === "string") {
          classConf.requires  = [classConf.requires]
        }
        for (var i = 0, len = classConf.requires.length; i < len; i++) {
          loadClassFileAndEval(classConf.requires[i]);
        }
      }
      if (classConf.uses) {
        if (typeof classConf.uses === "string") {
          classConf.uses  = [classConf.uses]
        }
        for (var i = 0, len = classConf.uses.length; i < len; i++) {
          loadClassFileAndEval(classConf.uses[i]);
        }
      }
      if (classConf.controllers) {
        for (var i = 0, len = classConf.controllers.length; i < len; i++) {
          var cName = classConf.controllers[i].split('.').length > 1 ? classConf.controllers[i] : classConf.name + '.controller.' + classConf.controllers[i];
          loadClassFileAndEval(cName);
        }
      }
    };

    global.emptyFn = function() {return false;}
    global.window = {
      navigator : 'Linux',
      attachEvent: emptyFn
    };
    global.navigator = {'userAgent' : 'node'};
    global.document = {
      documentElement:{style: {boxShadow: undefined}},
      getElementsByTagName : emptyFn,
      attachEvent: emptyFn,
      createElement: emptyFn
    };
    global.top = {};
    var contents = grunt.file.read(options.senchaDir + '/ext-debug.js');
    try {
       eval(contents);
    } catch (e) {}
    var Ext = {
      Loader: {
        setConfig: function(obj) {
          if (obj.paths) {
            lookupPaths = grunt.util._.defaults(obj.paths, lookupPaths);
          }
        }
      },
      syncRequire: loadClassFileAndEval,
      require: loadClassFileAndEval,
      application: function(config) {
        lookupPaths[config.name] = './app';
        processClassConf(config.name, config);
      },
      define: function(name, conf) {
        processClassConf(name, conf);
      },
      String: {
        splitWords: emptyFn,
        format: emptyFn
      },
      Array: {
        toMap: emptyFn
      }
    };
    eval(src);

    // finally push in our app.js
    filesLoadedSoFar.push(options.appFile);

    grunt.log.writeln('Files matching were: \n    ' + filesLoadedSoFar.join('\n    ') + '');
  });

};
