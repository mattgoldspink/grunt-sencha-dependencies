'use strict';

var grunt = require('grunt');

var lookupPaths = {},
    filesLoadedSoFar = [],
    beingLoaded = [],
    classesSeenSoFar = {};

function mapClassToFile(className) {
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
}

function loadClassFileAndEval(className, onDone) {
  if (className) {
    var loadPath = mapClassToFile(className);
    if (loadPath !== '' && !grunt.util._.contains(filesLoadedSoFar, loadPath) && !grunt.util._.contains(beingLoaded, loadPath)) {
      beingLoaded.push(loadPath);
      var contents = grunt.file.read(loadPath);
      eval(contents);
      filesLoadedSoFar.push(loadPath);
    }
  }
  if (onDone) {
    onDone();
  }
}

function defineClassNameSpace(className, aliasClassDef) {
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
}

function processClassConf(name, classConf) {
  var singletonConf = {}, i, len;
  if (classConf.singleton) {
    for (var prop in classConf) {
        singletonConf[prop] = global.emptyFn;
    }
  }
  var classDef = defineClassNameSpace(name, singletonConf);
  if (classConf.alternateClassName) {
    if (typeof classConf.alternateClassName === "string") {
      classConf.alternateClassName  = [classConf.alternateClassName];
    }
    for (i = 0, len = classConf.alternateClassName.length; i < len; i++) {
      defineClassNameSpace(classConf.alternateClassName[i], classDef);
    }
  }
  if (classConf.extend) {
    loadClassFileAndEval(classConf.extend);
  }
  if (classConf.requires) {
    if (typeof classConf.requires === "string") {
      classConf.requires  = [classConf.requires];
    }
    for (i = 0, len = classConf.requires.length; i < len; i++) {
      loadClassFileAndEval(classConf.requires[i]);
    }
  }
  if (classConf.uses) {
    if (typeof classConf.uses === "string") {
      classConf.uses  = [classConf.uses];
    }
    for (i = 0, len = classConf.uses.length; i < len; i++) {
      loadClassFileAndEval(classConf.uses[i]);
    }
  }
  if (classConf.controllers) {
    for (i = 0, len = classConf.controllers.length; i < len; i++) {
      var cName = classConf.controllers[i].split('.').length > 1 ? classConf.controllers[i] : classConf.name + '.controller.' + classConf.controllers[i];
      loadClassFileAndEval(cName);
    }
  }
}

function defineGlobals() {
    global.emptyFn = function() {return false;};
    global.window = {
      navigator : 'Linux',
      attachEvent: global.emptyFn
    };
    global.navigator = {'userAgent' : 'node'};
    global.document = {
      documentElement:{style: {boxShadow: undefined}},
      getElementsByTagName : global.emptyFn,
      attachEvent: global.emptyFn,
      createElement: global.emptyFn
    };
    global.top = {};
    return global;
}

function defineExtGlobals() {
	global.Ext = {
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
        splitWords: global.emptyFn,
        format: global.emptyFn
      },
      Array: {
        toMap: global.emptyFn
      }
    };
    return global.Ext;
}

function getDependenciesForAppJs(appJsFilePath, senchaDir) {
    var src = [appJsFilePath].map(function(filepath) {
        // Warn if a source file/pattern was invalid.
        if (!grunt.file.exists(filepath)) {
          grunt.log.error('Source file "' + filepath + '" not found.');
          return '';
        }
        // Read file source.
        return grunt.file.read(filepath);
    }).join(',');

    lookupPaths.Ext = senchaDir + '/src';

    defineGlobals();
    defineExtGlobals();

    var contents = grunt.file.read(senchaDir + '/ext-debug.js');
    filesLoadedSoFar.push(senchaDir + '/ext-debug.js');
    try {
       eval(contents);
    } catch (e) {}
    eval(src);
    filesLoadedSoFar.push(appJsFilePath);
    return filesLoadedSoFar;
}

module.exports = {
	getDependenciesForAppJs: getDependenciesForAppJs,
	defineGlobals: defineGlobals,
	mapClassToFile: mapClassToFile
};
