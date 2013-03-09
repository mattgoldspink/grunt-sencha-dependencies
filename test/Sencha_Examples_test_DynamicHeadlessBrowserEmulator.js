"use strict";

var grunt = require("grunt");
var DynamicHeadlessBrowserEmulator;
/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports.sencha_dependencies = {
    setUp: function (done) {
        DynamicHeadlessBrowserEmulator = require("../tasks/lib/DynamicHeadlessBrowserEmulator.js");
        done();
    }/*,
  "Pandora-ext-4.1.1a": function(test) {
    test.expect(1);
    debugger
    var depChecker = new DynamicHeadlessBrowserEmulator(
      "./test/integration/pandora-ext-4.1.1a/app/app.js",
      "./test/integration/libs/ext-4.1.1a",
      "./test/integration/pandora-ext-4.1.1a/"
    );
    var found = depChecker.getDependencies();
    test.equal(found.length, 225, "Expected 225 files to be found");
    test.done();
  },
  /*"stockapp-senchatouch-2.1.1": function(test) {
    test.expect(1);
    var depChecker = new DynamicHeadlessBrowserEmulator(
      "./test/integration/stockapp-senchatouch-2.1.1/app.js",
      "./test/integration/libs/touch-2.1.1",
      "./test/integration/stockapp-senchatouch-2.1.1/",
      true
    );
    var found = depChecker.getDependencies();
    test.equal(found.length, 278, "Expected 278 files to be found");
    test.done();
  },
    "touchtweets-2.1.1": function (test) {
        test.expect(1);
        var depChecker = new DynamicHeadlessBrowserEmulator(
            "app.js",
            "../libs/touch-2.1.1",
            "./test/integration/touchtweets-2.1.1/",
            true
        );
        var found = depChecker.getDependencies();
        test.equal(found.length, 224, "Expected 224 files to be found");
        test.done();
    }*/
};
