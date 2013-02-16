var grunt = require('grunt'),
    domino = require('domino'),
    select = require('../../node_modules/domino/lib/select.js'),
    DocumentFragment = require('../../node_modules/domino/lib/DocumentFragment.js'),
    Node = require('../../node_modules/domino/lib/Node.js'),
    Element = require('../../node_modules/domino/lib/Element.js'),
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
        getItem: function (sKey) {
          if (!sKey || !this[sKey]) { return null; }
          return this[sKey];
        },
        key: function (nKeyId) {
          return nKeyId;
        },
        setItem: function (sKey, sValue) {
          if(!sKey) { return; }
          this[sKey] = typeof sValue === "string" ? sValue : JSON.stringify(sValue);
          this.length++;
        },
        length: 0,
        removeItem: function (sKey) {
          if (!sKey || !this[sKey]) { return; }
          delete this[sKey];
          this.length--;
        }
      };
    global.XMLHttpRequest = function() {
      var contents = '';
      return {
        send: global.emptyFn,
        open: function(type, url) {
          url = url.replace(/\?.*/, '');
          url = me.pageRoot  + '/' + url;
          if (!grunt.file.exists(url)) {
            grunt.log.error('WARNING: Source file "' + url + '" not found.');
            this.status = 404;
          } else {
            this.responseText = grunt.file.read(url);
            this.status = 200;
          }
        }
      };
    };
    return global;
};

SenchaDependencyChecker.prototype.fixMissingDomApis = function() {
  DocumentFragment.prototype.querySelector = function(selector) {
      return select(selector, this)[0];
  };
  DocumentFragment.prototype.querySelectorAll = function(selector) {
      var self = this;
      if (!this.parentNode && this.nodeType !== 11) {
        self = this.ownerDocument.createElement("div");
        self.appendChild(this);
      }
      var nodes = select(selector, self);
      var result = nodes.item ? nodes : new NodeList(nodes);
      return result;
  };
  DocumentFragment.prototype.getElementsByTagName = function(tagName) {
    return Element.prototype.getElementsByTagName.apply(this, arguments);
  };
  DocumentFragment.prototype.getElementsByClassName = function(tagName) {
    return Element.prototype.getElementsByClassName.apply(this, arguments);
  };
  DocumentFragment.prototype.firstElementChild = function() {
    var kids = this.childNodes;
    for(var i = 0, n = kids.length; i < n; i++) {
      if (kids[i].nodeType === Node.ELEMENT_NODE) return kids[i];
    }
    return null;
  };
  DocumentFragment.prototype.nextElementSibling = function() {
      if (this.parentNode) {
        var sibs = this.parentNode.childNodes;
        for(var i = this.index+1, n = sibs.length; i < n; i++) {
          if (sibs[i].nodeType === Node.ELEMENT_NODE) return sibs[i];
        }
      }
      return null;
  };
  DocumentFragment.prototype.nextElement = function(tagName) {
    var next = this.firstElementChild() || this.nextElementSibling();
    if (next) return next;

    if (!root) root = this.ownerDocument.documentElement;

    // If we can't go down or across, then we have to go up
    // and across to the parent sibling or another ancestor's
    // sibling.  Be careful, though: if we reach the root
    // element, or if we reach the documentElement, then
    // the traversal ends.
    for(var parent = this.parentElement;
      parent && parent !== root;
      parent = parent.parentElement) {

      next = parent.nextElementSibling;
      if (next) return next;
    }

    return null;
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
    };
    // fix getViewportHeight not having reference to 'self' - ext-debug.js
    global.self = global.document;
    // prevent Layout's being run
    if (Ext.layout && Ext.layout.Context) {
      Ext.layout.Context.prototype.invalidate = Ext.emptyFn;
    }

  } else {
    if (Ext.draw && Ext.draw.engine && Ext.draw.engine.Canvas) {
      Ext.draw.engine.Canvas.prototype.createCanvas = Ext.emptyFn;
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

SenchaDependencyChecker.prototype.resetGlobals = function() {
  global.Ext = global.window = global.document =  undefined;
};

SenchaDependencyChecker.prototype.getDependencies = function () {
    try {
      //this.resetGlobals();
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
      if (!this.isTouch) {
        Ext.EventManager.deferReadyEvent = null;
        Ext.EventManager.fireReadyEvent();
      }
      var files = this.reOrderFiles();
      //this.resetGlobals();
      return files;
    } catch (e) {
      grunt.log.error("An error occured which could cause problems " + e);
      if (e.stack) {
          grunt.log.error("Stack for debugging: \n" + e.stack);
      }
      throw e;
    }
};

module.exports = SenchaDependencyChecker;
