/*
 * grunt-sencha-dependencies
 * https://github.com/mattgoldspink/grunt-sencha-dependencies
 *
 * Copyright (c) 2013 Matt Goldspink
 * Licensed under the MIT license.
 */

"use strict";

module.exports = function (grunt) {

    var DynamicHeadlessBrowserEmulator = require("./lib/DynamicHeadlessBrowserEmulator.js"),
        DynamicAnalyserMockingExtSystem = require("./lib/DynamicAnalyserMockingExtSystem.js"),
        PhantomJsHeadlessAnalyzer = require("./lib/PhantomJsHeadlessAnalyzer.js"),
        modes = {
            "dynHeadless" :  DynamicHeadlessBrowserEmulator,
            "phantom" :  PhantomJsHeadlessAnalyzer,
            "dynMock" : DynamicAnalyserMockingExtSystem
        };

    // Please see the grunt documentation for more information regarding task
    // creation: https://github.com/gruntjs/grunt/blob/devel/docs/toc.md

    grunt.registerMultiTask("sencha_dependencies", "Task to generate the ordered array of sencha depdendencies", function () {
        var options,
            dependencyChecker,
            doneFn,
            me = this;
        options = this.options({
            isTouch: false,
            printDepGraph: false,
            mode: "phantom"
        });
        doneFn = function (filesLoadedSoFar, target) {
            grunt.log.ok("Success! " + filesLoadedSoFar.length + " files added to property " + "sencha_dependencies_" + target);
            grunt.verbose.writeln("Files are:\n    " + filesLoadedSoFar.join("\n    "));
            grunt.config.set("sencha_dependencies_" + target, filesLoadedSoFar);
        };
        if (options.appFile && !options.appJs) {
            options.appJs = options.appFile;
        }
        grunt.log.writeln("Processing Sencha app file " + options.appJs + " in mode " + options.mode + "...");
        dependencyChecker = new modes[options.mode](
            options.appJs, options.senchaDir, options.pageRoot,
            !!options.isTouch, !!options.printDepGraph
        );
        if (dependencyChecker.isAsync) {
            var done = this.async();
            dependencyChecker.getDependencies(function (files) {
                doneFn(files, me.target);
                done();
            }, this);
        } else {
            doneFn(dependencyChecker.getDependencies(this), this.target);
        }
    });

};
