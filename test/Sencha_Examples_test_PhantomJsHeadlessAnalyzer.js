"use strict";

var grunt = require("grunt");
var PhantomJsHeadlessAnalyzer;
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

function makeAppJsonAnalyzer(appJsFilePath, appJson, pageRoot, htmlPagePath) {
    return new PhantomJsHeadlessAnalyzer(
        appJsFilePath,
        appJson,
        pageRoot,
        htmlPagePath
    );
}

function makeRegularAnalyzer(appJsPath, frameworkDir, pageRoot) {
    return new PhantomJsHeadlessAnalyzer(
        appJsPath,
        frameworkDir,
        pageRoot,
        "index.html"
    );
}

function makeFileCountAssertion(test, expectedCount) {
    return function (found) {
        test.equal(found.length, expectedCount, "Expected " + expectedCount + " files to be found");
        test.done();
    };
}

function makeFileCountTest(expectedCount, appJsPath, frameworkDir, pageRoot) {
    return function (test) {
        test.expect(1);
        var depChecker = makeRegularAnalyzer(appJsPath, frameworkDir, pageRoot);
        depChecker.getDependencies(makeFileCountAssertion(test, expectedCount));
    };
}

function makeAppJsonFileCountTest(expectedCount, appJsPath, appJson, pageRoot, htmlPagePath) {
    return function (test) {
        test.expect(1);
        var depChecker = makeAppJsonAnalyzer(appJsPath, appJson, pageRoot, htmlPagePath);
        depChecker.getDependencies(makeFileCountAssertion(test, expectedCount));
    };
}

function makeHasFrameworkFirstAssertion(test, expectedPath) {
    return function (found) {
        test.equal(found[0], expectedPath, "Looking for " + expectedPath + " in first location");
        test.done();
    };
}

function hasFrameWorkFirst(expectedPath, appJsPath, frameworkDir, pageRoot) {
    return function (test) {
        test.expect(1);
        var depChecker = makeRegularAnalyzer(appJsPath, frameworkDir, pageRoot);
        depChecker.getDependencies(makeHasFrameworkFirstAssertion(test, expectedPath));
    };
}

function xmakeDefaultTestsForExample() {}

function makeDefaultTestsForExample(prefix,
        testsJson, expectedCount,
        expectedFrameworkPath,
        appJsPath, frameworkDir,
        pageRoot,
        appJson) {
    tests[prefix + " detects " + expectedCount + " files"] = makeFileCountTest(
        expectedCount,
        appJsPath,
        frameworkDir,
        pageRoot
    );
    tests[prefix + " detects " + expectedCount + " files using appJson"] = makeAppJsonFileCountTest(
        expectedCount,
        appJsPath,
        appJson,
        pageRoot,
        "index.html"
    );
}

var tests = {
    setUp: function (done) {
        PhantomJsHeadlessAnalyzer = require("../tasks/lib/PhantomJsHeadlessAnalyzer.js");
        done();
    }
};

makeDefaultTestsForExample("Pandora-ext-4",
    tests, 230,
    "test/integration/pandora-ext-4.1.1a/app/app.js",
    "app/app.js", "../libs/ext-4.1.1a",
    "test/integration/pandora-ext-4.1.1a/",
    {
        "js" : [
            {
                "path": "../libs/ext-4.1.1a/ext-debug.js"
            },
            {
                "path": "app/app.js",
                "update": "delta"
            }
        ]
    }
);

makeDefaultTestsForExample("stockapp-senchatouch-2.1.1",
    tests, 278,
    "test/integration/stockapp-senchatouch-2.1.1/app.js",
    "app.js", "../libs/touch-2.1.1",
    "test/integration/stockapp-senchatouch-2.1.1/",
    {
        "js" : [
            {
                "path": "../libs/touch-2.1.1/sencha-touch-debug.js"
            },
            {
                "path": "app.js",
                "update": "delta"
            }
        ]
    }
);

makeDefaultTestsForExample("touchtweets-2.0.1",
    tests, 198,
    "test/integration/touchtweets-2.0.1/app.js",
    "app.js", "../libs/touch-2.0.1",
    "test/integration/touchtweets-2.0.1/",
    {
        "js" : [
            {
                "path": "../libs/touch-2.0.1/sencha-touch-debug.js"
            },
            {
                "path": "app.js",
                "update": "delta"
            }
        ]
    }
);

makeDefaultTestsForExample("touchtweets-2.1.1",
    tests, 224,
    "test/integration/touchtweets-2.1.1/app.js",
    "app.js", "../libs/touch-2.1.1",
    "test/integration/touchtweets-2.1.1/",
    {
        "js" : [
            {
                "path": "../libs/touch-2.1.1/sencha-touch-debug.js"
            },
            {
                "path": "app.js",
                "update": "delta"
            }
        ]
    }
);

exports.sencha_dependencies = tests;

/* {


    "Pandora-ext-4.1.1a has ext-debug.js first": hasFrameWorkFirst(
        "test/integration/libs/ext-4.1.1a/ext-debug.js",
        "app/app.js",
        "../libs/ext-4.1.1a",
        "test/integration/pandora-ext-4.1.1a/"
    ),


    "Pandora-ext-4.1.1a has app.js last": function (test) {
        test.expect(1);
        var depChecker = new PhantomJsHeadlessAnalyzer(
            "app/app.js",
            "../libs/ext-4.1.1a",
            "./test/integration/pandora-ext-4.1.1a/"
        );
        depChecker.getDependencies(function (found) {
            test.equal(found[229], "test/integration/pandora-ext-4.1.1a/app/app.js", "Expected last file to be app.js");
            test.done();
        });
    }
};*/
