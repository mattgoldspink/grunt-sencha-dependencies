
var grunt = require('grunt'),
    domino = require('domino');

function SenchaDependencyChecker(appJsFilePath, senchaDir, isTouch){
	this.appJsFilePath = appJsFilePath;
	this.lookupPaths = {};
    this.filesLoadedSoFar = [];
    this.beingLoaded = [];
    this.classesSeenSoFar = {};
    this.isTouch = isTouch;
    this.appName = null;
    if (senchaDir) {
        this.setSenchaDir(senchaDir);
    }
}

function removeTrailingSlash(path) {
    return path[path.length - 1] === '/' ? path.substring(0, path.length - 1) : path;
}

SenchaDependencyChecker.prototype.addLookupPath = function(key, value) {
    this.lookupPaths[key] = removeTrailingSlash(value);
};

SenchaDependencyChecker.prototype.setSenchaDir = function(_senchaDir){
    this.senchaDir = _senchaDir;
    this.addLookupPath('Ext', removeTrailingSlash(_senchaDir) + '/src');
};

SenchaDependencyChecker.prototype.mapClassToFile = function (className, dontTestExistance) {
  var parts = className.split('.'),
      filepath,
      currentIndex = parts.length + 1,
      currentPackage;
  // let's special case for Ext core stuff
  if (parts[0] === 'Ext' && parts.length === 1) {
      filepath = this.isTouch ? '/sencha-touch-debug.js' : '/ext-debug.js';
      filepath = this.lookupPaths[parts[0]].substring(0, this.lookupPaths[parts[0]].length - 4) + filepath;
  } else {
      // loop through from the longest package name to find it
      while (currentIndex-- >= 0) {
        currentPackage = parts.slice(0, currentIndex).join('.');
        if (this.lookupPaths[currentPackage]) {
            filepath = this.lookupPaths[currentPackage] + (currentIndex === parts.length ? '' : '/' + parts.slice(currentIndex, parts.length).join('/') + '.js');
            break;
        }
      }
  }
  if (filepath === undefined) {
    filepath = parts.join('/') + '.js';
  }
  if (!grunt.file.exists(filepath) && !dontTestExistance) {
    grunt.log.warn('Source file "' + filepath + '" not found.');
    return '';
  }
  return filepath;
};

SenchaDependencyChecker.prototype.loadClassFileAndEval = function(className, onDone) {
  if (className && !this.doesClassExistInGlobalSpace(className)) {
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

SenchaDependencyChecker.prototype.doesClassExistInGlobalSpace = function(className) {
    var parts = className.split('.'),
        previousPart = global;
    for (var i = 0, len = parts.length; i < len; i++) {
      var part = parts[i];
      if (previousPart[part] === undefined) {
          return false;
      }
      previousPart = previousPart[part] ;
    }
    return true;
}

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
  this.loadAllFilesForProperty('controller', classConf);
  this.loadAllFilesForProperty('store', classConf);
  this.loadAllFilesForProperty('model', classConf);
  if (classConf.autoCreateViewport === true) {
    var cName = classConf.name + '.view.Viewport';
    this.loadClassFileAndEval(cName);
  }
};

SenchaDependencyChecker.prototype.loadAllFilesForProperty = function(propertyname, classConf) {
    var plurallizedName = propertyname + 's';
    if (classConf[plurallizedName]) {
       if (typeof classConf[plurallizedName] === "string") {
          classConf[plurallizedName]  = [classConf[plurallizedName]];
      }
      for (i = 0, len = classConf[plurallizedName].length; i < len; i++) {
        var cName = classConf[plurallizedName][i].split('.').length > 1 ? classConf[plurallizedName][i] : this.appName + '.' + propertyname + '.' + classConf[plurallizedName][i];
        this.loadClassFileAndEval(cName);
      }
    }
};

SenchaDependencyChecker.prototype.defineGlobals = function() {
    var me = this;
    global.emptyFn = function() {return {};};
    global.navigator = {'userAgent' : 'node'};
    global.ActiveXObject = global.emptyFn;
    return global;
};

SenchaDependencyChecker.prototype.defineExtGlobals = function () {
	var me = this;
	global.Ext.apply(global.Ext, {
      Loader: {
        setConfig: function(obj) {
          if (obj.paths) {
            global.Ext.Loader.setPaths(obj.paths);
          }
        },
        setPaths: function(key, value) {
            if (global.Ext.isString(key)) {
                me.addLookupPath(key, value);
            } else {
                for (var prop in key) {
                    me.addLookupPath(prop, key[prop]);
                }
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
        me.appName = config.name;
        me.processClassConf(config.name, config);
      },
      define: function(name, conf) {
        me.processClassConf(name, conf);
      }
    });
    return global.Ext;
};

SenchaDependencyChecker.prototype.getDependencies = function () {
    var senchaCoreFile, contents, src;
    this.defineGlobals();
    senchaCoreFile = this.mapClassToFile('Ext');
    this.filesLoadedSoFar.push(senchaCoreFile);
    contents = grunt.file.read(senchaCoreFile);
    // use domino to mock out our DOM api's
    global.window = domino.createWindow('<head><script src="' + senchaCoreFile + '"></script></head><body></body>');
    global.document = window.document;
    try {
        eval(contents);
    } catch (e) {
        grunt.log.error("An unexpected error occured, please report a bug here https://github.com/mattgoldspink/grunt-sencha-dependencies/issues?state=open - " + e);
    }
    global.Ext = Ext;
    this.defineExtGlobals();
    if (!grunt.file.exists(this.appJsFilePath)) {
      grunt.log.error('Source file "' + filepath + '" not found.');
      return [];
    }
    eval(grunt.file.read(this.appJsFilePath));
    this.filesLoadedSoFar.push(this.appJsFilePath);
    return this.filesLoadedSoFar;
};

module.exports = SenchaDependencyChecker;
