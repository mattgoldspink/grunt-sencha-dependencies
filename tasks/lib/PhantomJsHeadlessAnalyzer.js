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
    reorderFiles = require("reorderFiles"),
    // Nodejs libs.
    path         = require("path"),
    // Get an asset file, local to the root of the project.
    asset        = path.join.bind(null, __dirname, "..");

function PhantomJsHeadlessAnalyzer(appJsFilePath, senchaDir, pageRoot, isTouch, printDepGraph) {
    this.appJsFilePath    = appJsFilePath;
    this.lookupPaths      = {};
    this.filesLoadedSoFar = [];
    this.usesList         = [];
    this.beingLoaded      = [];
    this.pageRoot         = pageRoot ? removeTrailingSlash(pageRoot) : ".";
    this.printDepGraph    = !!printDepGraph;
    this.isTouch          = !!isTouch;
    this.appName          = null;
    this.isAsync          = true;
    this.classesSeenSoFar = {
        asArray: []
    };
    if (senchaDir) {
        this.setSenchaDir(senchaDir);
    }
}

function removeTrailingSlash(path) {
    return path[path.length - 1] === "/" ? path.substring(0, path.length - 1) : path;
}

PhantomJsHeadlessAnalyzer.prototype.setSenchaDir = function (_senchaDir) {
    this.senchaDir = _senchaDir;
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

PhantomJsHeadlessAnalyzer.prototype.getDependencies = function (doneFn, task) {
    var me = this,
        errorCount = 0,
        files = null;

    phantomjs.on("onResourceRequested", function (response) {
        if (/ext(-all|-all-debug|-debug){1}.js/.test(response.url)) {
            me.setSenchaDir(response.url);
        } else if (/sencha-touch(-all|-all-debug|-debug){1}.js/.test(response.url)) {
            me.setSenchaDir(response.url);
            me.isTouch = true;
        }
        grunt.verbose.writeln(response.url);
    });

    phantomjs.on("error.onError", function (msg) {
        errorCount++;
        grunt.log.error(msg);
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

    var senchaCoreFile = this.getSenchaCoreFile();
    var sendMessageString = ["<script>",
        "function sendMessage() {",
          "var args = [].slice.call(arguments);",
          "alert(JSON.stringify(args));",
        "}",
        "</script>"
    ].join("");
    // create the html page
    grunt.file.copy(this.pageRoot + "/index.html", this.pageRoot + "/test.html", {
        process: function (inputString) {
            // we need to inject
            return inputString.replace("<head>", "<head>" + sendMessageString);
        }
    });

    // Spawn phantomjs
    phantomjs.spawn(this.pageRoot + "/test.html", {
        // Additional PhantomJS options.
        options: {
            phantomScript: asset("phantomjs/main.js")
        },
        // Complete the task when done.
        done: function (err) {
            doneFn(reorderFiles(
                files,
                this.getSenchaCoreFile(),
                this.pageRoot,
                this.appJsFilePath,
                this.printDepGraph
            ));
            //grunt.file["delete"](this.pageRoot + "/test.html");
        }
    });

};

module.exports = PhantomJsHeadlessAnalyzer;
