var grunt = require('grunt'),
    domino = require('domino'),
    select = require('../../node_modules/domino/lib/select.js'),
    DocumentFragment = require('../../node_modules/domino/lib/DocumentFragment.js'),
    NodeList = require('../../node_modules/domino/lib/NodeList.js');

function SenchaDependencyChecker(appJsFilePath, senchaDir, pageRoot, isTouch, printDepGraph){
    this.appJsFilePath = appJsFilePath;
    this.pageRoot = pageRoot ? removeTrailingSlash(pageRoot) : '.';
    this.printDepGraph = !!printDepGraph;
    this.isTouch = !!isTouch;
    this.appName = null;
    if (senchaDir) {
        this.setSenchaDir(senchaDir);
    }
}

function removeTrailingSlash(path) {
    return path[path.length - 1] === '/' ? path.substring(0, path.length - 1) : path;
}

SenchaDependencyChecker.prototype.setSenchaDir = function(_senchaDir){
    this.senchaDir = _senchaDir;
};

SenchaDependencyChecker.prototype.getSenchaCoreFile = function(){
    return this.senchaDir  + "/" + (this.isTouch ? 'sencha-touch-debug.js' : 'ext-debug.js');
};

SenchaDependencyChecker.prototype.defineGlobals = function() {
    var me = this;
    global.emptyFn = function() {return {};};
    global.navigator = {'userAgent' : 'node'};
    global.location = window.location;
    global.ActiveXObject = global.emptyFn;
    global.window.localStorage = {
      get: global.emptyFn,
      set: global.emptyFn,
      clear: global.emptyFn,
      length: 0
    };
    global.XMLHttpRequest = function() {
      var contents = '';
      return {
        send: global.emptyFn,
        open: function(type, url) {
          url = url.replace(/\?.*/, '');
          //console.log(url);
          url = me.pageRoot  + '/' + url;
          if (!grunt.file.exists(url)) {
            grunt.log.error('WARNING: Source file "' + url + '" not found.');
            this.status = 404;
          } else {
            this.responseText = grunt.file.read(url);
            this.status = 200;
          }
        }
      }
    };
    return global;
};

SenchaDependencyChecker.prototype.fixMissingDomApis = function() {
  DocumentFragment.prototype.querySelector = function(selector) {
      return select(selector, this)[0];
  };
  DocumentFragment.prototype.querySelectorAll = function(selector) {
      var self = this;
      if (!this.parentNode) {
        self = this.ownerDocument.createElement("div");
        self.appendChild(this);
      }
      var nodes = select(selector, self);
      return nodes.item ? nodes : new NodeList(nodes);
  };
};

SenchaDependencyChecker.prototype.defineExtGlobals = function (Ext) {
  var me = this;
  global.Ext = Ext;
  Ext.Loader._loadScriptFile = Ext.Loader.loadScriptFile;
  Ext.Loader.loadScriptFile = function(url, onLoad, onError, scope, synchronous) {
      //convert all to sync
      Ext.Loader._loadScriptFile.apply(Ext.Loader, [url, onLoad, onError, scope, true]);
      me.addPatchesToExtToRun(Ext);
  };
  Ext._application = Ext.application;
  Ext.application = function(conf) {
      conf._launch = conf.launch;
      conf.launch = function() {};
      Ext._application.apply(Ext, arguments);
  };
  if (this.isTouch) {
      Ext.browser.engineVersion =  new Ext.Version('1.0');
  }
  Ext.Loader.setPath('Ext', removeTrailingSlash(this.senchaDir) + '/src');
  return global.Ext;
};

var id = 0;

SenchaDependencyChecker.prototype.addPatchesToExtToRun = function(Ext) {
  if (!this.isTouch) {
    // fix getStyle and undefined for background-position - util/Renderable.js
    var _getStyle = Ext.Element.prototype.getStyle;
    Ext.Element.prototype.getStyle = function(prop) {
      var result = _getStyle.apply(this, arguments);
      if (prop === 'background-position' && result === undefined) {
        return '0 0';
      }
      return result;
    }
    // fix getViewportHeight not having reference to 'self' - ext-debug.js
    global.self = global.document;
    // prevent Layout's being run
    if (Ext.layout && Ext.layout.Context) {
      Ext.layout.Context.prototype.invalidate = Ext.emptyFn;
    }
  } else {
    if (Ext.AbstractComponent) {
      /*Ext.AbstractComponent.prototype.initElement = function() {
        var el = document.createDocumentFragment();
        el.id = id++;
        this.element = new Ext.Element(el);
        return this;
      };*/
    }
  }
};

SenchaDependencyChecker.prototype.reOrderFiles = function() {
  var history = Ext.Loader.history,
      files = [this.getSenchaCoreFile()];
  for (var i = 0, len = history.length; i < len; i++) {
    files.push(Ext.Loader.getPath(history[i]));
  }
  files.push(this.appJsFilePath);
  return files;
};

SenchaDependencyChecker.prototype.safelyEvalFile = function(fileUrl) {
  if (!grunt.file.exists(fileUrl)) {
    grunt.log.error('Source file "' + fileUrl + '" not found.');
  }
  try {
      eval(grunt.file.read(fileUrl));
  } catch (e) {
      grunt.log.error("An unexpected error occured while processing " + fileUrl + ", please report a bug here if problems occur in your app " +
                  "https://github.com/mattgoldspink/grunt-sencha-dependencies/issues?state=open - " + e);
      if (e.stack) {
          grunt.log.error("Stack for debugging: \n" + e.stack);
      }
      throw e;
  }
  return Ext;
};

SenchaDependencyChecker.prototype.getDependencies = function () {
    debugger
    try {
      var senchaCoreFile = this.getSenchaCoreFile();
      // use domino to mock out our DOM api's
      global.window = domino.createWindow('<html><head><script src="' + senchaCoreFile + '"></script></head><body></body></html>');
      global.document = window.document;
      this.defineGlobals();
      this.fixMissingDomApis();
      var Ext = this.safelyEvalFile(senchaCoreFile);
      this.defineExtGlobals(Ext);
      this.addPatchesToExtToRun(Ext);
      window.document.close();
      this.safelyEvalFile(this.appJsFilePath);
      if (!Ext.isTouch) {
        Ext.EventManager.deferReadyEvent = null;
        Ext.EventManager.fireReadyEvent()
      }
      return this.reOrderFiles();
    } catch (e) {
      grunt.log.error("An error occured which could cause problems " + e);
      if (e.stack) {
          grunt.log.error("Stack for debugging: \n" + e.stack);
      }
      throw e;
    }
};

module.exports = SenchaDependencyChecker;
