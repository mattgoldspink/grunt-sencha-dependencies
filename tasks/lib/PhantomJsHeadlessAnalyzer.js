/*global Ext*/
/**
 * This version runs the index.html page in phantomjs and waits for just a timeout.
 *
 * Pro's - this will basically run the app, no need to override anything in Ext, will work
 *         with app.json
 * Con's - Due to the way phantomjs works all I can do is wait for the browser to timeout,
 *         ideally I'd like to be able to override Ext.application - launch event,
 *         but the techniques I've tried so far have been unsuccessful. A good solution
 *         would be to introduce a proxy server.
 */
var grunt        = require("grunt"),
    phantomjs    = require("grunt-lib-phantomjs").init(grunt),
    reorderFiles = require("./reorderFiles.js"),
    // Nodejs libs.
    path         = require("path"),
    fs           = require("fs"),
    // Get an asset file, local to the root of the project.
    asset        = path.join.bind(null, __dirname, ".."),
    sendMessageString = ["<script>",
        "function sendMessage() {",
          "var args = [].slice.call(arguments);",
          "alert(JSON.stringify(args));",
        "}",
        "</script>"
    ].join("");

/**
 *
 * @param {string} appJsFilePath The path to the JS file which contains the Ext.application call - This path MUST be relative to th pageRoot
 * @param {string/Object} senchaDirOrAppJson The path to the Sencha framework directory OR the JSON from the app.json file for this project
 * @param {string} pageRoot The path to the directory which contains the main html page (usually index.html) relative to where this
 *                 task/grunt will be started
 * @param {boolean/string} isTouchOrPageToProcess If you set the Sencha framework dir then this should be true if you're using Sencha Touch.
 *                                 If you're using an app.json this will be the html page that should be used to process in phantomjs
 *                                 relative to the pageRoot
 * @param {boolean} printDepGraph if you want the dependency graph printed as it's generated - this doesn't work correctly atm
 */
function PhantomJsHeadlessAnalyzer(appJsFilePath, senchaDirOrAppJson, pageRoot, printDepGraph) {
    this.isAsync              = true;
    this.appJsFilePath        = appJsFilePath;
    this.setPageRoot(pageRoot);
    if (typeof senchaDirOrAppJson === "object") {
        // we're in mode where we use appJson
        this.appJson          = senchaDirOrAppJson;
        this.pageToProcess    = this.appJson.indexHtmlPath || "index.html";
    } else {
        this.printDepGraph    = !!printDepGraph;
        if (senchaDirOrAppJson) {
            this.setSenchaDir(senchaDirOrAppJson);
        }
    }
}

function removeTrailingSlash(path) {
    return path[path.length - 1] === "/" ? path.substring(0, path.length - 1) : path;
}

PhantomJsHeadlessAnalyzer.prototype.setPageRoot = function (pageRoot) {
    this.pageRoot = pageRoot ? removeTrailingSlash(pageRoot) : ".";
};

function oneOfExistsInDir(dir, options) {
    for (var i = 0, len = options.length; i < len; i++) {
        if (fs.existsSync(dir + "/" + options[i])) {
            return true;
        }
    }
    return false;
}

PhantomJsHeadlessAnalyzer.prototype.setSenchaDir = function (_senchaDir) {
    this.senchaDir = _senchaDir;
    var resolvedDir = this.getSenchaFrameworkDir();
    var stats = fs.statSync(resolvedDir);

    if (stats.isDirectory()) {
        // if is dir - check for app.json
        if (oneOfExistsInDir(resolvedDir, ["sencha-touch.js", "sencha-touch-debug.js", "sencha-touch-all.js", "sencha-touch-all-debug.js"])) {
            this.isTouch = true;
        } else if (oneOfExistsInDir(resolvedDir, ["ext.js", "ext-debug.js", "ext-all.js", "ext-all-debug.js"])) {
            this.isTouch = false;
        } else {
            grunt.log.error("Could not find any of the expected Sencha Touch or Ext.js files in senchaDir " + resolvedDir);
        }
    } else {
        grunt.log.error("senchaDir property is not a directory " + resolvedDir);
    }
};

PhantomJsHeadlessAnalyzer.prototype.getSenchaFrameworkDir = function () {
    return path.normalize(this.pageRoot + "/" + this.senchaDir);
};

PhantomJsHeadlessAnalyzer.prototype.getSenchaCoreFile = function () {
    return path.normalize(this.pageRoot + "/" + this.senchaDir  + "/" + (this.isTouch ? "sencha-touch-debug.js" : "ext-debug.js"));
};

PhantomJsHeadlessAnalyzer.prototype.reOrderFiles = function (history) {
    var files = [this.getSenchaCoreFile()];
    for (var i = 0, len = history.length; i < len; i++) {
        var filePath = history[i];
        files.push(path.normalize(this.pageRoot + "/" + filePath));
        if (this.printDepGraph) {
            grunt.log.writeln(path.normalize(this.pageRoot + "/" + filePath));
        }
    }
    files.push(path.normalize(this.pageRoot + "/" + this.appJsFilePath));
    return files;
};

PhantomJsHeadlessAnalyzer.prototype.setHtmlPageToProcess = function () {
    var tempPage = this.pageRoot + "/" + Math.floor(Math.random() * 1000000) + ".html";
    if (this.pageToProcess) {
        // create the html page
        grunt.file.copy(this.pageRoot + "/" + this.pageToProcess, tempPage, {
            process: function (inputString) {
                // we need to inject the bridge
                return inputString.replace("<head>", "<head>" + sendMessageString);
            }
        });
    } else {
        // we'll dynamically create one
        var htmlString = ["<html><head>",
            sendMessageString,
            "<script src='",
            turnUrlIntoRelativeDirectory(this.pageRoot, this.getSenchaCoreFile()),
            "/",
            (this.isTouch ? "sencha-touch-debug.js" : "ext-debug.js"),
            "'></script>",
            "<script src='",
            this.appJsFilePath,
            "'></script>",
            "</head><body></body></html>"].join("");
        grunt.file.write(tempPage, htmlString);
    }
    return tempPage;
};

function turnUrlIntoRelativeDirectory(relativeTo, url) {
    if (/^file:/.test(url)) {
        url = url.substring(5);
    }
    return path.relative(relativeTo, url.substring(0, url.lastIndexOf("/")));
}

PhantomJsHeadlessAnalyzer.prototype.getDependencies = function (doneFn, task) {
    var me = this,
        errorCount = [],
        files = null;

    phantomjs.on("onResourceRequested", function (response) {
        if (/ext(-all|-all-debug|-debug){1}.js/.test(response.url)) {
            me.setSenchaDir(turnUrlIntoRelativeDirectory(me.pageRoot, response.url));
        } else if (/sencha-touch(-all|-all-debug|-debug){1}.js/.test(response.url)) {
            me.setSenchaDir(turnUrlIntoRelativeDirectory(me.pageRoot, response.url));
            me.isTouch = true;
        }
        grunt.verbose.writeln(response.url);
    });

    phantomjs.on("error.onError", function (msg) {
        errorCount.push(msg);
        if (errorCount.length === 1) {
            grunt.log.warn("A JavaScript error occured whilst loading your page - this could cause problems with the generated file list. Run with -v to see all errors");
        }
    });

    // Create some kind of "all done" event.
    phantomjs.on("mytask.done", function (foundFiles) {
        files = foundFiles;
        phantomjs.halt();
    });

    // Built-in error handlers.
    phantomjs.on("fail.load", function (url) {
        phantomjs.halt();
        grunt.warn("PhantomJS unable to load URL " + url);
    });

    phantomjs.on("fail.timeout", function () {
        phantomjs.halt();
        grunt.warn("PhantomJS timed out.");
    });

    var tempPage = this.setHtmlPageToProcess();

    // Spawn phantomjs
    phantomjs.spawn(tempPage, {
        // Additional PhantomJS options.
        options: {
            phantomScript: asset("phantomjs/main.js")
        },
        // Complete the task when done.
        done: function (err) {
            for (var i = 0, len = errorCount.length; i < len; i++) {
                grunt.verbose.error(errorCount[i]);
            }
            doneFn(reorderFiles(
                files,
                me.getSenchaCoreFile(),
                me.pageRoot,
                me.appJsFilePath,
                me.printDepGraph
            ));
            grunt.file["delete"](tempPage);
        }
    });

};

module.exports = PhantomJsHeadlessAnalyzer;
