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
 * @param {boolean} pageToProcess The page that will be processed when looking for tags
 */
function PhantomJsHeadlessAnalyzer(appJsFilePath, senchaDirOrAppJson, pageRoot, pageToProcess) {
    this.appJsFilePath        = appJsFilePath;
    this.setPageRoot(pageRoot);
    this.pageToProcess        = pageToProcess;
    if (typeof senchaDirOrAppJson === "object") {
        // we're in mode where we use appJson
        this.appJson          = senchaDirOrAppJson;
    } else {
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

PhantomJsHeadlessAnalyzer.prototype.normaliseFilePaths = function (filePaths) {
    var output = [];
    for (var i = 0, len = filePaths.length; i < len; i++) {
        output.push(this.normaliseFilePath(filePaths[i]));
    }
    return output;
};

PhantomJsHeadlessAnalyzer.prototype.normaliseFilePath = function (filePath) {
    filePath = filePath.replace(/^file:(\/)*/, "/");
    if (!/^\//.test(filePath)) {
        filePath = this.pageRoot + "/" + filePath;
    }
    return path.normalize(this.pageRoot + "/" + path.relative(this.pageRoot, filePath));
};

PhantomJsHeadlessAnalyzer.prototype.reorderFiles = function (history) {
    var files = [],
        coreFile = this.getSenchaCoreFile(),
        appFile = path.normalize(this.pageRoot + "/" + this.appJsFilePath);
    files.push(coreFile);
    for (var i = 0, len = history.length; i < len; i++) {
        var filePath = this.normaliseFilePath(history[i]);
        if (filePath !== appFile &&
                !/\/ext(-all|-all-debug|-debug){0,1}.js/.test(filePath) &&
                !/\/sencha-touch(-all|-all-debug|-debug){0,1}.js/.test(filePath)) {
            var stats   = fs.statSync(filePath);
            if (!stats.isDirectory()) {
                files.push(filePath);
            }
        }
    }
    files.push(appFile);
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

PhantomJsHeadlessAnalyzer.prototype.resolveTheTwoFileSetsToBeInTheRightOrder = function(allScripts, history) {
    // fix all paths to be normalised
    allScripts = this.normaliseFilePaths(allScripts);
    history = this.normaliseFilePaths(history);
    var startReplaceAfterThisItem = null;
    // 1) start iterating through allScripts and find the first file in the history list
    for (var i = 0, len = allScripts.length; i < len; i++) {
        if (history.indexOf(allScripts[i]) > -1) {
            startReplaceAfterThisItem = allScripts[i - 1];
            break;
        }
    }
    // 2) now remove all the history files from allScripts
    for (var i = 0, len = history.length; i < len; i++) {
        var indexToRemove = allScripts.indexOf(history[i]);
        if (indexToRemove > -1) {
            allScripts.splice(indexToRemove, 1);
        }
    }

    // 3) insert all the correctly ordered history files at the start point we found
    var notFound = true, i = 0;
    while (notFound && i < allScripts.length) {
        if (allScripts[i] === startReplaceAfterThisItem) {
            history.unshift(i, 0);
            allScripts.splice.apply(allScripts, history);
            notFound = false;
        }
        i++;
    }
    if (notFound) {
        grunt.log.error("An error occured whilst trying to calculate the dependencies");
    }
    return allScripts;
};

PhantomJsHeadlessAnalyzer.prototype.getDependencies = function (doneFn, task) {
    var me = this,
        errorCount = [],
        files = null,
        hasSeenSenchaLib = false;

    phantomjs.on("onResourceRequested", function (response) {
        if (!hasSeenSenchaLib) {
            if (/\/ext(-all|-all-debug|-debug){0,1}.js/.test(response.url)) {
                me.setSenchaDir(turnUrlIntoRelativeDirectory(me.pageRoot, response.url));
                hasSeenSenchaLib = true;
            } else if (/\/sencha-touch(-all|-all-debug|-debug){0,1}.js/.test(response.url)) {
                me.setSenchaDir(turnUrlIntoRelativeDirectory(me.pageRoot, response.url));
                me.isTouch = true;
                hasSeenSenchaLib = true;
            }
        }
        grunt.verbose.writeln(response.url);
    });

    phantomjs.on("error.onError", function (msg) {
        errorCount.push(msg);
        if (errorCount.length === 1) {
            grunt.log.warn("A JavaScript error occured whilst loading your page - this could cause problems with the generated file list. Run with -v to see all errors");
        }
        grunt.log.warn(msg);
    });

    // Create some kind of "all done" event.
    phantomjs.on("mytask.done", function (foundFiles) {
        files = me.resolveTheTwoFileSetsToBeInTheRightOrder(foundFiles.scriptTags, foundFiles.history);
        phantomjs.halt();
    });

    // Built-in error handlers.
    phantomjs.on("fail.load", function (url) {
        phantomjs.halt();
        grunt.warn("PhantomJS unable to load URL " + url);
        grunt.file["delete"](tempPage);

    });

    phantomjs.on("fail.timeout", function () {
        phantomjs.halt();
        grunt.warn("PhantomJS timed out.");
        grunt.file["delete"](tempPage);

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
            doneFn(me.reorderFiles(
                files
            ));
            grunt.file["delete"](tempPage);
        }
    });

};

module.exports = PhantomJsHeadlessAnalyzer;
