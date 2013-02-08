'use strict';

var SenchaDependencyChecker, subject;
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
    SenchaDependencyChecker = require('../tasks/lib/SenchaDependencyChecker.js');
    subject = new SenchaDependencyChecker();
    // setup here if necessary
    done();
  },
  defines_new_global_for_one_package_level: function(test) {
    test.expect(2);
    var newGlobal = subject.defineClassNameSpace('Matt');
    test.ok(global['Matt'] !== undefined, "Matt got defined");
    test.equal(global['Matt'], newGlobal, "Matt is same as returned value");
    test.done();
  },
  defines_new_global_for_two_package_level: function(test) {
    test.expect(2);
    var newGlobal = subject.defineClassNameSpace('Matt1.package1');
    test.ok(global['Matt1'].package1 !== undefined, "Matt1.package1 got defined");
    test.equal(global['Matt1'].package1, newGlobal, "Matt1.package1 is same as returned value");
    test.done();
  },
  defines_new_global_for_three_package_level: function(test) {
    test.expect(2);
    var newGlobal = subject.defineClassNameSpace('Matt2.package2.three');
    test.ok(global['Matt2'].package2.three !== undefined, "Matt2.package2.three got defined");
    test.equal(global['Matt2'].package2.three, newGlobal, "Matt2.package2.three is same as returned value");
    test.done();
  },
  does_not_clobber_existing_global: function(test) {
    test.expect(2);
    global['ExistingGlobal'] = {foo:'A'};
    var cacheExisting = global['ExistingGlobal'];
    var newGlobal = subject.defineClassNameSpace('ExistingGlobal');
    test.equal(global['ExistingGlobal'], newGlobal, "ExistingGlobal is same as returned value");
    test.equal(global['ExistingGlobal'], cacheExisting, "ExistingGlobal is same as cacheExisting");
    test.done();
  }
};
