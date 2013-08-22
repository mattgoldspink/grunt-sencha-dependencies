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
    connect      = require("connect"),
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
function PhantomJsHeadlessAnalyzer(appJsFilePath, senchaDirOrAppJson, pageRoot, pageToProcess, includeAllScriptTags) {
    this.appJsFilePath              = appJsFilePath;
    this.setPageRoot(pageRoot);
    this.pageToProcess              = pageToProcess;
    this.includeAllScriptTags = includeAllScriptTags;
    if (typeof senchaDirOrAppJson === "object") {
        // we're in mode where we use appJson
        this.appJson          = senchaDirOrAppJson;
    } else {
        if (senchaDirOrAppJson) {
            this.setSenchaDir(senchaDirOrAppJson);
        }
    }
}

PhantomJsHeadlessAnalyzer.prototype.setGrunt = function (gruntLive) {
    grunt = gruntLive;
};

function removeTrailingSlash(filePath) {
    return filePath[filePath.length - 1] === path.sep ? filePath.substring(0, filePath.length - 1) : filePath;
}

PhantomJsHeadlessAnalyzer.prototype.setPageRoot = function (pageRoot) {
    this.pageRoot = pageRoot ? removeTrailingSlash(pageRoot) : ".";
};

function oneOfExistsInDir(dir, options) {
    for (var i = 0, len = options.length; i < len; i++) {
        if (fs.existsSync(dir + path.sep + options[i])) {
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
    return path.normalize(this.pageRoot + path.sep + this.senchaDir);
};

PhantomJsHeadlessAnalyzer.prototype.getSenchaCoreFile = function () {
    return path.normalize(this.pageRoot + path.sep + this.senchaDir  + path.sep + (this.isTouch ? "sencha-touch-debug.js" : "ext-debug.js"));
};

PhantomJsHeadlessAnalyzer.prototype.normaliseFilePaths = function (filePaths) {
    var output = [];
    for (var i = 0, len = filePaths.length; i < len; i++) {
        output.push(this.normaliseFilePath(filePaths[i]));
    }
    return output;
};

PhantomJsHeadlessAnalyzer.prototype.normaliseFilePath = function (filePath) {
    if (/^http:/.test(filePath)) {
        filePath = filePath.replace(/^http:\/\/localhost:3000\/*/, "");
    } else {
        filePath = this.pageRoot + path.sep + filePath;
    }
    return path.normalize(filePath);
};

PhantomJsHeadlessAnalyzer.prototype.reorderFiles = function (history) {
    var files = [],
        coreFile = this.getSenchaCoreFile(),
        appFile = path.normalize(this.pageRoot + path.sep + this.appJsFilePath);
    files.push(coreFile);
    for (var i = 0, len = history.length; i < len; i++) {
        var filePath = history[i];
        if (filePath !== appFile &&
                !/\/ext(-all|-all-debug|-debug){0,1}.js/.test(filePath) &&
                !/\/sencha-touch(-all|-all-debug|-debug){0,1}.js/.test(filePath) &&
                !/\/microloader\/development.js/.test(filePath)) {

            if (fs.existsSync(filePath)) {
                var stats = fs.statSync(filePath);
                if (!stats.isDirectory()) {
                    files.push(filePath);
                }
            } else {
                grunt.log.warn("Excluding non filesystem based file " + filePath);
            }
        }
    }
    if (!!this.appJsFilePath) {
        files.push(appFile);
    }
    return files;
};

PhantomJsHeadlessAnalyzer.prototype.setHtmlPageToProcess = function (tempPage) {
    if (this.pageToProcess) {
        // create the html page
        grunt.file.copy(this.pageRoot + path.sep + this.pageToProcess, tempPage, {
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
    if (/^http:/.test(url)) {
        url = url.substring("http://localhost:3000/".length);
    }
    return path.relative(relativeTo, url.substring(0, url.lastIndexOf("/")));
}

PhantomJsHeadlessAnalyzer.prototype.startWebServerToHostPage = function (tempPage) {
    this.app = connect()
              //.use(connect.logger('dev'))
              .use(connect["static"](process.cwd()))
              .listen(3000);
    var pathSepReplacement = new RegExp("\\"+path.sep, "g")
    grunt.log.debug("Connect started: " + "http://localhost:3000/" + tempPage.replace(pathSepReplacement, "/") + "  -  " + process.cwd());
    return "http://localhost:3000/" + tempPage.replace(pathSepReplacement, "/");
};

PhantomJsHeadlessAnalyzer.prototype.resolveTheTwoFileSetsToBeInTheRightOrder = function (allScripts, history) {
    var i, len;
    // fix all paths to be normalised
    allScripts = this.normaliseFilePaths(allScripts);
    history = this.normaliseFilePaths(history);
    var startReplaceAfterThisItem = null;

    // 1) start iterating through allScripts and find the first file in the history list
    for (i = 0, len = allScripts.length; i < len; i++) {
        if (history.indexOf(allScripts[i]) > -1) {
            startReplaceAfterThisItem = allScripts[i - 1];
            break;
        }
    }
    // 2) now remove all the history files from allScripts
    for (i = 0, len = history.length; i < len; i++) {
        var indexToRemove = allScripts.indexOf(history[i]);
        if (indexToRemove > -1) {
            allScripts.splice(indexToRemove, 1);
        }
    }

    // 3) insert all the correctly ordered history files at the start point we found
    var notFound = true;
    i = 0;
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
        hasSeenSenchaLib = false,
        tempPage = this.pageRoot + path.sep + Math.floor(Math.random() * 1000000) + ".html";

    function safeDeleteTempFile() {
        try {
            grunt.file["delete"](tempPage);
        } catch (e) {
            grunt.log.warn("An error occured whilst trying to delete the temporary file " + tempPage);
        }
        try {
            me.app.close();
        } catch (e) {
            grunt.log.warn("Could not stop connect server: " + e);
        }
    }

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
        if (/\.js/.test(response.url)) {
            grunt.log.debug(response.url);
        }
    });

    phantomjs.on("error.onError", function (msg, trace) {
        errorCount.push(msg);
        if (errorCount.length === 1) {
            grunt.log.warn("A JavaScript error occured whilst loading your page - this could" +
                            " cause problems with the generated file list. Run with -v to see all errors");
        }
        var msgStack = ["ERROR: " + msg];
        msgStack.push("TRACE:");
        trace.forEach(function (t) {
            msgStack.push(" -> " + t.file + ": " + t.line + (t["function"] ? " (in function \"" + t["function"] + "\")" : ""));
        });
        grunt.verbose.error(msgStack.join("\n"));
    });

    // Create some kind of "all done" event.
    phantomjs.on("mytask.done", function (foundFiles) {
        if (me.includeAllScriptTags === true) {
            files = me.resolveTheTwoFileSetsToBeInTheRightOrder(foundFiles.scriptTags, foundFiles.history);
        } else {
            files = me.normaliseFilePaths(foundFiles.history);
        }
        phantomjs.halt();
    });

    // Built-in error handlers.
    phantomjs.on("fail.load", function (url) {
        safeDeleteTempFile();
        phantomjs.halt();
        grunt.warn("PhantomJS unable to load URL " + url);
    });

    phantomjs.on("fail.timeout", function () {
        safeDeleteTempFile();
        phantomjs.halt();
        grunt.warn("PhantomJS timed out.");
    });

    this.setHtmlPageToProcess(tempPage);

    // Spawn phantomjs
    phantomjs.spawn(this.startWebServerToHostPage(tempPage), {
        // Additional PhantomJS options.
        options: {
            phantomScript: asset("phantomjs" + path.sep + "main.js"),
            loadImages: false
        },
        // Complete the task when done.
        done: function (err) {
            try {
                safeDeleteTempFile();
                doneFn(me.reorderFiles(
                    files
                ));
            } catch (e) {
                grunt.log.error(e);
                safeDeleteTempFile();
            }
        }
    });

};

module.exports = PhantomJsHeadlessAnalyzer;
