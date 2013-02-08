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

function assertPathIsCorrect(className, expected, test) {
  var actual = subject.mapClassToFile(className, true);
  test.equal(actual, expected, className + ": " + actual + " != " + expected);
}

exports.sencha_dependencies = {
  setUp: function(done) {
    SenchaDependencyChecker = require('../tasks/lib/SenchaDependencyChecker.js');
    subject = new SenchaDependencyChecker();
    // setup here if necessary
    done();
  },
  Ext_is_given_right_file_path: function(test) {
    test.expect(1);
    subject.setSenchaDir('./vendor/ext-4.1.2');
    assertPathIsCorrect('Ext', './vendor/ext-4.1.2/ext-debug.js', test);
    test.done();
  },
  Ext_is_given_right_file_path_ends_in_slash: function(test) {
    test.expect(1);
    subject.setSenchaDir('./vendor/ext-4.1.2/');
    assertPathIsCorrect('Ext', './vendor/ext-4.1.2/ext-debug.js', test);
    test.done();
  },
  Ext_is_given_right_file_path_when_url: function(test) {
    test.expect(1);
    subject.setSenchaDir('http://cdn.sencha.io/ext/4.1.2');
    assertPathIsCorrect('Ext', 'http://cdn.sencha.io/ext/4.1.2/ext-debug.js', test);
    test.done();
  },
  Ext_is_given_right_file_path_when_url_ends_in_slash: function(test) {
    test.expect(1);
    subject.setSenchaDir('http://cdn.sencha.io/ext/4.1.2/');
    assertPathIsCorrect('Ext', 'http://cdn.sencha.io/ext/4.1.2/ext-debug.js', test);
    test.done();
  },
  Ext_panel_Panel_is_given_src_dir_under_senchaDir: function(test) {
    test.expect(1);
    subject.setSenchaDir('./vendor/ext-4.1.2/');
    assertPathIsCorrect('Ext.panel.Panel', './vendor/ext-4.1.2/src/panel/Panel.js', test);
    test.done();
  },
  when_two_package_levels_set_the_most_specific_is_picked: function(test) {
    test.expect(1);
    subject.setSenchaDir('./vendor/ext-4.1.2/');
    subject.addLookupPath('Ext.ux', './vendor/ux');
    assertPathIsCorrect('Ext.ux.Custom', './vendor/ux/Custom.js', test);
    test.done();
  },
  when_full_class_set_the_most_specific_is_picked: function(test) {
    test.expect(2);
    subject.setSenchaDir('./vendor/ext-4.1.2/');
    subject.addLookupPath('Ext.ux', './vendor/ux');
    subject.addLookupPath('Ext.ux.FullPath', './vendor/ux2/path/FullPath.js');
    assertPathIsCorrect('Ext.ux.Custom', './vendor/ux/Custom.js', test);
    assertPathIsCorrect('Ext.ux.FullPath', './vendor/ux2/path/FullPath.js', test);
    test.done();
  }
};
