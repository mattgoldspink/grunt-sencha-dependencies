  /*
 * grunt-sencha-dependencies
 * https://github.com/mattgoldspink/grunt-sencha-dependencies
 *
 * Copyright (c) 2013 Matt Goldspink
 * Licensed under the MIT license.
 */

"use strict";

var testinfra = require("grunt-sencha-dependencies-testinfra").path,
    ncp = require("ncp").ncp;

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: [
                "Gruntfile.js",
                "tasks/**/*.js",
                "<%= nodeunit.tests %>"
            ],
            options: {
                node: true,
                evil: true,
                strict: false,
                indent: 4,
                quotmark: "double",
                undef: true
            }
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            tests: ["tmp"]
        },

        // Unit tests.
        nodeunit: {
            tests: ["test/*_test.js", "test/Sencha_Examples_test_*.js"]
        }

    });

    // Actually load this plugin"s task(s).
    grunt.loadTasks("tasks");

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-nodeunit");

    grunt.registerTask("copy_testinfra", function () {
        // move the directory ./node_modules/grunt-sencha-dependencies-testinfra/libs
        //                 to ./test/integration
        var done = this.async();
        ncp(testinfra, "./test/integration/libs", function (err) {
            if (err) {
                grunt.log.error("Could not install test dependencies: " + err);
            }
            done();
        });

    });

    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    grunt.registerTask("test", ["clean", "copy_testinfra", "nodeunit"]);

    // By default, lint and run all tests.
    grunt.registerTask("default", ["jshint", "test"]);

};
