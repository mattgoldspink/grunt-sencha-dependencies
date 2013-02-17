'use strict';

var DynamicAnalyserMockingExtSystem;
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
    DynamicAnalyserMockingExtSystem = require('../tasks/lib/DynamicAnalyserMockingExtSystem.js');
    // setup here if necessary
    done();
  },
  can_load_DynamicAnalyserMockingExtSystem: function(test) {
    test.expect(1);
    test.ok(DynamicAnalyserMockingExtSystem, "loaded DynamicAnalyserMockingExtSystem");
    test.done();
  }/* ,
  global_navigator_created: function(test) {
    test.expect(2);
    new DynamicAnalyserMockingExtSystem().defineGlobals();
    test.ok(global.navigator, "navigator created");
    test.equal(global.navigator.userAgent, "node", "navigator.userAgent created");
    test.done();
  }*/

};
