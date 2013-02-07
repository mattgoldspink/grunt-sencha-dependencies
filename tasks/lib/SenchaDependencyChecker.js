'use strict';

var grunt = require('grunt');

function SenchaDependencyChecker(appJsFilePath, senchaDir){
	this.appJsFilePath = appJsFilePath;
	this.senchaDir = senchaDir;
	this.lookupPaths = {};
    this.filesLoadedSoFar = [];
    this.beingLoaded = [];
    this.classesSeenSoFar = {};
}

SenchaDependencyChecker.prototype.mapClassToFile = function (className) {
  var parts = className.split('.'),
      filepath;
  if (this.lookupPaths[parts[0]]) {
    filepath = this.lookupPaths[parts[0]] + '/' + parts.slice(1).join('/') + '.js';
  } else {
    filepath = parts.join('/') + '.js';
  }
  if (!grunt.file.exists(filepath)) {
    grunt.log.warn('Source file "' + filepath + '" not found.');
    return '';
  }
  return filepath;
};

SenchaDependencyChecker.prototype.loadClassFileAndEval = function(className, onDone) {
  if (className) {
    var loadPath = this.mapClassToFile(className);
    if (loadPath !== '' &&
		!grunt.util._.contains(this.filesLoadedSoFar, loadPath) &&
		!grunt.util._.contains(this.beingLoaded, loadPath)) {
      this.beingLoaded.push(loadPath);
      eval(grunt.file.read(loadPath));
      this.filesLoadedSoFar.push(loadPath);
    }
  }
  if (onDone) {
    onDone();
  }
};

SenchaDependencyChecker.prototype.defineClassNameSpace = function(className, aliasClassDef) {
  var parts = className.split('.'),
      previousPart = global;
  if (!this.classesSeenSoFar[className]) {
  }
  for (var i = 0, len = parts.length; i < len; i++) {
    var part = parts[i];
    if (previousPart[part] === undefined) {
      previousPart[part] = (i === (len - 1) && aliasClassDef ? aliasClassDef : {});
    }
    previousPart = previousPart[part] ;
  }
  this.classesSeenSoFar[className] = true;
  return previousPart;
};

SenchaDependencyChecker.prototype.processClassConf = function (name, classConf) {
  var singletonConf = {}, i, len;
  if (classConf.singleton) {
    for (var prop in classConf) {
        singletonConf[prop] = global.emptyFn;
    }
  }
  var classDef = this.defineClassNameSpace(name, singletonConf);
  if (classConf.alternateClassName) {
    if (typeof classConf.alternateClassName === "string") {
      classConf.alternateClassName  = [classConf.alternateClassName];
    }
    for (i = 0, len = classConf.alternateClassName.length; i < len; i++) {
      this.defineClassNameSpace(classConf.alternateClassName[i], classDef);
    }
  }
  if (classConf.extend) {
    this.loadClassFileAndEval(classConf.extend);
  }
  if (classConf.requires) {
    if (typeof classConf.requires === "string") {
      classConf.requires  = [classConf.requires];
    }
    for (i = 0, len = classConf.requires.length; i < len; i++) {
      this.loadClassFileAndEval(classConf.requires[i]);
    }
  }
  if (classConf.uses) {
    if (typeof classConf.uses === "string") {
      classConf.uses  = [classConf.uses];
    }
    for (i = 0, len = classConf.uses.length; i < len; i++) {
      this.loadClassFileAndEval(classConf.uses[i]);
    }
  }
  if (classConf.controllers) {
    for (i = 0, len = classConf.controllers.length; i < len; i++) {
      var cName = classConf.controllers[i].split('.').length > 1 ? classConf.controllers[i] : classConf.name + '.controller.' + classConf.controllers[i];
      this.loadClassFileAndEval(cName);
    }
  }
};

SenchaDependencyChecker.prototype.defineGlobals = function() {
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
};

SenchaDependencyChecker.prototype.defineExtGlobals = function () {
	var me = this;
	global.Ext = {
      Loader: {
        setConfig: function(obj) {
          if (obj.paths) {
            me.lookupPaths = grunt.util._.defaults(obj.paths, me.lookupPaths);
          }
        }
      },
      syncRequire: function() {
          me.loadClassFileAndEval.apply(me, arguments);
      },
      require: function() {
          me.loadClassFileAndEval.apply(me, arguments);
      },
      application: function(config) {
        me.lookupPaths[config.name] = './app';
        me.processClassConf(config.name, config);
      },
      define: function(name, conf) {
        me.processClassConf(name, conf);
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
};

SenchaDependencyChecker.prototype.getDependencies = function () {
    var src = [this.appJsFilePath].map(function(filepath) {
        // Warn if a source file/pattern was invalid.
        if (!grunt.file.exists(filepath)) {
          grunt.log.error('Source file "' + filepath + '" not found.');
          return '';
        }
        // Read file source.
        return grunt.file.read(filepath);
    }).join(',');

    this.lookupPaths.Ext = this.senchaDir + '/src';

    this.defineGlobals();
    this.defineExtGlobals();

    var contents = grunt.file.read(this.senchaDir + '/ext-debug.js');
    this.filesLoadedSoFar.push(this.senchaDir + '/ext-debug.js');	
    try {
       eval(contents);
    } catch (e) {}
    eval(src);
    this.filesLoadedSoFar.push(this.appJsFilePath);
    return this.filesLoadedSoFar;
};

module.exports = SenchaDependencyChecker;
