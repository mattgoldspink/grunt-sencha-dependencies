'use strict';

var sencha_utils;
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
  setUp: function(done) {
    sencha_utils = require('../tasks/lib/sencha_utils.js');
    // setup here if necessary
    done();
  },
  can_load_sencha_utils: function(test) {
    test.expect(1);
    test.ok(sencha_utils, "loaded sencha_utils");
    test.done();
  },
  global_window_created: function(test) {
    test.expect(3);
    sencha_utils.defineGlobals();
    test.ok(global.window, "window created");
    test.ok(global.window.navigator, "window.navigator created");
    test.ok(global.window.attachEvent, "window.attachEvent created");
    test.done();
  },
  global_navigator_created: function(test) {
    test.expect(2);
    sencha_utils.defineGlobals();
    test.ok(global.navigator, "navigator created");
    test.equal(global.navigator.userAgent, "node", "navigator.userAgent created");
    test.done();
  }

};
