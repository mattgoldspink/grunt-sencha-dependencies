/*global Ext, window*/
/**
 * This version tries to run the Ext and app.js files in a headless browser, but it completely
 * overrides the Ext.define system to run it"s own loading analysis.
 *
 * This means we can usually avoid having to mock too much of the DOM api"s, but at the cost of reproducing
 * Sencha and Ext.js"s class loading mechanism - i.e. we need to know what keywords they analyse in the
 * class file config and then ensure we resolve those dependencies in the correct order.
 */
var grunt = require("grunt"),
    domino = require("domino"),
    safelyEvalFile = require("./safelyEvalFile.js"),
    defineGlobals = require("./defineGlobals.js"),
    fixMissingDomApis = require("./fixMissingDomApis.js");

function DynamicAnalyserMockingExtSystem(appJsFilePath, senchaDir, pageRoot, isTouch, printDepGraph) {
    this.appJsFilePath = appJsFilePath;
    this.lookupPaths = {};
    this.filesLoadedSoFar = [];
    this.usesList = [];
    this.beingLoaded = [];
    this.pageRoot = pageRoot ? removeTrailingSlash(pageRoot) : ".";
    this.classesSeenSoFar = {
        asArray: []
    };
    this.printDepGraph = !!printDepGraph;
    this.isTouch = !!isTouch;
    this.appName = null;
    if (senchaDir) {
        this.setSenchaDir(senchaDir);
    }
}

function removeTrailingSlash(path) {
    return path[path.length - 1] === "/" ? path.substring(0, path.length - 1) : path;
}

DynamicAnalyserMockingExtSystem.prototype.addLookupPath = function (key, value) {
    this.lookupPaths[key] = removeTrailingSlash(value);
};

DynamicAnalyserMockingExtSystem.prototype.setSenchaDir = function (_senchaDir) {
    this.senchaDir = _senchaDir;
    this.addLookupPath("Ext", removeTrailingSlash(_senchaDir) + "/src");
};

DynamicAnalyserMockingExtSystem.prototype.mapClassToFile = function (className, dontTestExistance) {
    var parts = className.split("."),
        filepath,
        currentIndex = parts.length + 1,
        currentPackage;
    // let"s special case for Ext core stuff
    if (parts[0] === "Ext" && parts.length === 1) {
        filepath = this.isTouch ? "/sencha-touch-debug.js" : "/ext-debug.js";
        filepath = this.pageRoot + "/" + this.lookupPaths[parts[0]].substring(0, this.lookupPaths[parts[0]].length - 4) + filepath;
    } else {
        // loop through from the longest package name to find it
        while (currentIndex-- >= 0) {
            currentPackage = parts.slice(0, currentIndex).join(".");
            if (this.lookupPaths[currentPackage]) {
                filepath = this.pageRoot + "/" + this.lookupPaths[currentPackage] + (currentIndex === parts.length ?
                          "" : "/" + parts.slice(currentIndex, parts.length).join("/") + ".js");
                break;
            }
        }
    }
    if (filepath === undefined) {
        filepath = this.pageRoot + "/" + parts.join("/") + ".js";
    }
    if (!grunt.file.exists(filepath) && !dontTestExistance) {
        grunt.log.warn("Source file '" + filepath + "' not found.");
        return "";
    }
    return filepath;
};

var currentDepth = [" "];

DynamicAnalyserMockingExtSystem.prototype.loadClassFileAndEval = function (className, onDone) {
    if (className && !this.doesClassExistInGlobalSpace(className)) {
        var loadPath = this.mapClassToFile(className);
        if (loadPath !== "" &&
            !grunt.util._.contains(this.filesLoadedSoFar, loadPath) &&
            !grunt.util._.contains(this.beingLoaded, loadPath)) {
            currentDepth.push(" ");
            if (this.printDepGraph) {
                grunt.log.writeln(currentDepth.join("") + className);
            }
            this.beingLoaded.push(loadPath);
            try {
                eval(grunt.file.read(loadPath));
            } catch (e) {
                grunt.log.warn("An error occured whilst loading class " + className + " - " + e);
            }
            this.filesLoadedSoFar.push(loadPath);
            currentDepth.pop();
        }
    }
    if (onDone) {
        onDone();
    }
};

DynamicAnalyserMockingExtSystem.prototype.doesClassExistInGlobalSpace = function (className) {
    var parts = className.split("."),
        previousPart = global;
    for (var i = 0, len = parts.length; i < len; i++) {
        var part = parts[i];
        if (previousPart[part] === undefined) {
            return false;
        }
        previousPart = previousPart[part];
    }
    return true;
};

DynamicAnalyserMockingExtSystem.prototype.defineClassNameSpace = function (className, aliasClassDef) {
    var parts = className.split("."),
        previousPart = global;
    if (!this.classesSeenSoFar[className]) {
    }
    for (var i = 0, len = parts.length; i < len; i++) {
        var part = parts[i];
        if (previousPart[part] === undefined) {
            previousPart[part] = (i === (len - 1) && aliasClassDef ? aliasClassDef : {});
        }
        previousPart = previousPart[part];
    }
    this.classesSeenSoFar[className] = true;
    this.classesSeenSoFar.asArray.push(className);
    return previousPart;
};

DynamicAnalyserMockingExtSystem.prototype.processClassConf = function (name, classConf) {
    var singletonConf = {}, i, len, prop, classDef;
    if (classConf.singleton) {
        for (prop in classConf) {
            singletonConf[prop] = global.emptyFn;
        }
    }
    if (classConf.statics) {
        for (prop in classConf.statics) {
            //singletonConf[prop] = classConf.statics[prop];
        }
    }
    classDef = this.defineClassNameSpace(name, singletonConf);
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
            if (/\*/.test(classConf.requires[i])) {
                // bulk load all matching files
                this.loadAllClassesThatMatch(classConf.requires[i]);
            } else {
                this.loadClassFileAndEval(classConf.requires[i]);
            }
        }
    }
    this.loadAllFilesForProperty("controller", classConf);
    this.loadAllFilesForProperty("store", classConf);
    this.loadAllFilesForProperty("model", classConf);
    this.loadAllFilesForProperty("view", classConf);
    if (classConf.autoCreateViewport === true) {
        var cName = classConf.name + ".view.Viewport";
        this.loadClassFileAndEval(cName);
    }
    if (classConf.mixins) {
        for (prop in classConf.mixins) {
            this.loadClassFileAndEval(classConf.mixins[prop]);
        }
    }
    // uses should always be done later
    if (classConf.uses) {
        if (typeof classConf.uses === "string") {
            classConf.uses  = [classConf.uses];
        }
        for (i = 0, len = classConf.uses.length; i < len; i++) {
            this.usesList.push(classConf.uses[i]);
        }
    }
};

DynamicAnalyserMockingExtSystem.prototype.handleSenchaTouchClassDef = function (classConf) {
    // it uses factory of factories to load stuff, so lets emulate that
    var prop, value;
    for (prop in classConf) {
        value = classConf[prop];
        if (Ext.isSimpleObject(value)) {
            this.handleSenchaTouchClassDef(value);
        } else if (prop === "xclass") {
            this.loadClassFileAndEval(value);
            classConf[prop] = Ext.create(value);
        }
    }
};

DynamicAnalyserMockingExtSystem.prototype.loadAllClassesThatMatch = function (classPath) {
    if (this.isTouch) {
        var classes = Ext.ClassManager.getNamesByExpression(classPath);
        for (var i = 0, len = classes.length; i < len; i++) {
            this.loadClassFileAndEval(classes[i]);
        }
    }
};

DynamicAnalyserMockingExtSystem.prototype.loadAllFilesForProperty = function (propertyname, classConf) {
    var plurallizedName = propertyname + "s", i, len, cName;
    if (classConf[plurallizedName]) {
        if (typeof classConf[plurallizedName] === "string") {
            classConf[plurallizedName]  = [classConf[plurallizedName]];
        }
        for (i = 0, len = classConf[plurallizedName].length; i < len; i++) {
            cName = classConf[plurallizedName][i].split(".").length > 1 ?
                        classConf[plurallizedName][i] :
                        this.appName + "." + propertyname + "." + classConf[plurallizedName][i];
            this.loadClassFileAndEval(cName);
        }
    }
};

DynamicAnalyserMockingExtSystem.prototype.defineExtGlobals = function () {
    var me = this,
        loader = global.Ext.apply(global.Ext.Loader, {
            setConfig: function (obj) {
                if (obj.paths) {
                    global.Ext.Loader.setPath(obj.paths);
                }
            },
            setPath: function (key, value) {
                if (global.Ext.isString(key)) {
                    me.addLookupPath(key, value);
                } else {
                    for (var prop in key) {
                        me.addLookupPath(prop, key[prop]);
                    }
                }
            }
        });
    global.Ext.apply(global.Ext, {
        Loader: loader,
        syncRequire: function () {
            Ext.require.apply(Ext, arguments);
        },
        require: function (reqs, fn) {
            if (typeof reqs === "string") {
                reqs = [reqs];
            }
            for (var i = 0, len = reqs.length; i < len; i++) {
                me.loadClassFileAndEval(reqs[i]);
            }
        },
        application: function (config) {
            me.lookupPaths[config.name] = "app";
            me.appName = config.name;
            if (me.isTouch) {
                var reqs = config.requires;
                try {
                    Ext.setup(config);
                    Ext.triggerReady();
                } catch (e) {
                    grunt.log.warn("An unexpected error occured, please report a bug here if problems occur in your app" +
                               "https://github.com/mattgoldspink/grunt-sencha-dependencies/issues?state=open - " + e);
                }
                config.requires = reqs;
            }
            me.processClassConf(config.name, config);
            me.loadClassFileAndEval("Ext.app.Application");
            while (me.usesList.length > 0) {
                me.loadClassFileAndEval(me.usesList.pop());
            }
        },
        define: function (name, conf, fn) {
            me.processClassConf(name, conf);
            Ext.ClassManager.create(name, conf, fn);
        },
        factoryConfig: function (config, fn) {
            me.handleSenchaTouchClassDef(config);
            fn(config);
        }
    });
    return global.Ext;
};

DynamicAnalyserMockingExtSystem.prototype.getDependencies = function () {
    var senchaCoreFile, contents, src;
    senchaCoreFile = this.mapClassToFile("Ext");
    this.filesLoadedSoFar.push(senchaCoreFile);
    contents = grunt.file.read(senchaCoreFile);
    // use domino to mock out our DOM api"s
    global.window = domino.createWindow("<head><script src='" + senchaCoreFile + "'></script></head><body></body>");
    global.document = window.document;
    defineGlobals(this.pageRoot);
    fixMissingDomApis();
    var Ext = safelyEvalFile(senchaCoreFile);
    this.defineExtGlobals();
    safelyEvalFile(this.pageRoot + "/" + this.appJsFilePath);
    this.filesLoadedSoFar.push(this.pageRoot + "/" + this.appJsFilePath);
    return this.filesLoadedSoFar;
};

module.exports = DynamicAnalyserMockingExtSystem;
