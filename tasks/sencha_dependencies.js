/*
 * grunt-sencha-dependencies
 * https://github.com/mattgoldspink/grunt-sencha-dependencies
 *
 * Copyright (c) 2013 Matt Goldspink
 * Licensed under the MIT license.
 */

"use strict";

var fs                              = require("fs"),
    path                            = require("path"),
    splitArrayIntoThree             = require("./lib/splitArrayIntoThree.js"),
    PhantomJsHeadlessAnalyzer       = require("./lib/PhantomJsHeadlessAnalyzer.js");

module.exports = function (grunt) {

    function doneFn(filesLoadedSoFar, target, senchaDir) {
        splitArrayIntoThree(filesLoadedSoFar, senchaDir, grunt, "sencha_dependencies_" + target);
        grunt.config.set("sencha_dependencies_" + target, filesLoadedSoFar);
    }

    function initialiseAppJsonProcessing(instance, file, options) {
        var pageToProcess = "index.html",
            rootDir       = options.pageRoot || file,
            appJson       = grunt.file.readJSON(file + "/app.json");
        if (appJson.indexHtmlPath) {
            pageToProcess = appJson.indexHtmlPath;
        }
        if (appJson.js.length === 2) {
            file = appJson.js[1].path;
        } else if (options.appJs) {
            file = options.appJs;
        } else {
            grunt.log.error("Could not detect which file contains your Ext.application - Please set the appJs property");
        }
        return new PhantomJsHeadlessAnalyzer(
            file, appJson, rootDir, pageToProcess
        );
    }

    function getOptions(instance) {
        var options = instance.options({
            pageRoot: ""
        });
        if (options.appFile && !options.appJs) {
            options.appJs = options.appFile;
        }
        return options;
    }

    function getAndConfigureDependencyTracker(instance, options) {
        var file = shouldUseAppJson(instance);
        if (file) {
            grunt.log.writeln("Processing Sencha app.json file " + file);
            return initialiseAppJsonProcessing(instance, file, options);
        } else {
            grunt.log.writeln("Processing Sencha app file " + (options.pageToProcess ?  options.pageToProcess : options.appJs) + "...");
            return new PhantomJsHeadlessAnalyzer(
                options.appJs, options.senchaDir, options.pageRoot, options.pageToProcess
            );
        }
    }

    function shouldUseAppJson(instance) {
        var fileObj, file, stats;
        if (instance.files.length === 1) {
            fileObj = instance.files[0];
            file    = fileObj.src ? fileObj.src[0] : fileObj.orig.src[0];
            stats   = fs.statSync(file);
            if (stats.isDirectory()) {
                // if is dir - check for app.json
                if (fs.existsSync(file + "/app.json")) {
                    return file;
                }
            }
        } else if (instance.files.length > 1) {
            grunt.log.error("grunt-sencha-dependencies currently only supports working with one src file. You have supplied " + instance.files.length);
        }
        return false;
    }

    grunt.registerMultiTask("sencha_dependencies", "Task to generate the ordered array of sencha depdendencies", function () {
        var me                = this,
            options           = getOptions(me),
            dependencyChecker = getAndConfigureDependencyTracker(me, options),
            done;
        done = me.async();
        dependencyChecker.getDependencies(function (files) {
            doneFn(files, me.target, dependencyChecker.getSenchaFrameworkDir());
            done();
        }, me);
    });

};
