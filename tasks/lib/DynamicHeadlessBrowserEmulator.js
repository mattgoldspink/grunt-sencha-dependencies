/*global Ext, module, require, window*/
/**
 * This version tries to run the app.js and Ext.js in a mock headless browser using domino.
 *
 * This means any dynamic code will be executed and the class system resolution is done using 100% of
 * Ext.js"s code - all we do is define some of missing globals that Ext & Sencha need to run with.
 * In addition we also fix up some missing functionality in domino"s DOM api"s
 * Some of these fixes should be contributed back (especially the ones around selectors over DocumentFragments).
 *
 * In general this mode is best when it works because it will run exactly the same as the application
 * and won"t be as susceptible to changes in the Ext.Loader and Class mechanism"s in future releases.
 * However it can break because of the incomplete DOM api"s
 */

var grunt             = require("grunt"),
    domino            = require("domino"),
    reorderFiles      = require("./reorderFiles.js"),
    defineGlobals     = require("./defineGlobals.js"),
    safelyEvalFile    = require("./safelyEvalFile.js"),
    fixMissingDomApis = require("./fixMissingDomApis.js");

function DynamicHeadlessBrowserEmulator(appJsFilePath, senchaDir, pageRoot, isTouch, printDepGraph) {
    this.appJsFilePath = appJsFilePath;
    this.pageRoot      = pageRoot ? removeTrailingSlash(pageRoot) : ".";
    this.printDepGraph = !!printDepGraph;
    this.isTouch       = !!isTouch;
    this.appName       = null;
    if (senchaDir) {
        this.setSenchaDir(senchaDir);
    }
}

function removeTrailingSlash(path) {
    return path[path.length - 1] === "/" ? path.substring(0, path.length - 1) : path;
}

DynamicHeadlessBrowserEmulator.prototype.setSenchaDir = function (_senchaDir) {
    this.senchaDir = _senchaDir;
};

DynamicHeadlessBrowserEmulator.prototype.getSenchaCoreFile = function () {
    return this.pageRoot + "/" + this.senchaDir  + "/" + (this.isTouch ? "sencha-touch-debug.js" : "ext-debug.js");
};

DynamicHeadlessBrowserEmulator.prototype.defineExtGlobals = function (Ext) {
    var me = this;
    global.Ext = Ext;
    Ext.Loader._loadScriptFile = Ext.Loader.loadScriptFile;
    Ext.Loader.loadScriptFile = function (url, onLoad, onError, scope, synchronous) {
        //convert all to sync
        Ext.Loader._loadScriptFile.apply(Ext.Loader, [url, onLoad, onError, scope, true]);
        me.addPatchesToExtToRun(Ext);
    };
    Ext._application = Ext.application;
    Ext.application = function (conf) {
        conf._launch = conf.launch;
        conf.launch = function () {};
        Ext._application.apply(Ext, arguments);
    };
    if (this.isTouch) {
        Ext.browser.engineVersion =  new Ext.Version("1.0");
    }
    Ext.Loader.setPath("Ext", removeTrailingSlash(this.pageRoot + "/" + this.senchaDir) + "/src");
    return global.Ext;
};

var id = 0;

DynamicHeadlessBrowserEmulator.prototype.addPatchesToExtToRun = function (Ext) {
    if (!this.isTouch) {
        // fix getStyle and undefined for background-position - util/Renderable.js
        var _getStyle = Ext.Element.prototype.getStyle;
        Ext.Element.prototype.getStyle = function (prop) {
            var result = _getStyle.apply(this, arguments);
            if (prop === "background-position" && result === undefined) {
                return "0 0";
            }
            return result;
        };
        // fix getViewportHeight not having reference to "self" - ext-debug.js
        global.self = global.document;
        // prevent Layout"s being run
        if (Ext.layout && Ext.layout.Context) {
            Ext.layout.Context.prototype.invalidate = Ext.emptyFn;
        }

    } else {
        if (Ext.draw && Ext.draw.engine && Ext.draw.engine.Canvas) {
            Ext.draw.engine.Canvas.prototype.createCanvas = Ext.emptyFn;
        }
    }
};

DynamicHeadlessBrowserEmulator.prototype.getDependencies = function () {
    try {
        var senchaCoreFile = this.getSenchaCoreFile();
        // use domino to mock out our DOM api"s
        global.window = domino.createWindow("<html><head><script src='" + senchaCoreFile + "'></script></head><body></body></html>");
        global.document = window.document;
        defineGlobals(this.pageRoot);
        fixMissingDomApis();
        var Ext = safelyEvalFile(senchaCoreFile);
        this.defineExtGlobals(Ext);
        this.addPatchesToExtToRun(Ext);
        window.document.close();
        safelyEvalFile(this.pageRoot + "/" + this.appJsFilePath);
        if (!this.isTouch) {
            Ext.EventManager.deferReadyEvent = null;
            Ext.EventManager.fireReadyEvent();
        }
        return reorderFiles(
            Ext.Loader.history,
            this.getSenchaCoreFile(),
            this.pageRoot,
            this.appJsFilePath,
            this.printDepGraph,
            Ext.Loader.getPath
        );
    } catch (e) {
        grunt.log.error("An error occured which could cause problems " + e);
        if (e.stack) {
            grunt.log.error("Stack for debugging: \n" + e.stack);
        }
        throw e;
    }
};

module.exports = DynamicHeadlessBrowserEmulator;
