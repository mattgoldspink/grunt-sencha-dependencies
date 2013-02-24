/*global module, require, Ext*/
var grunt = require("grunt");

var safelyEvalFile = function (fileUrl) {
    if (!grunt.file.exists(fileUrl)) {
        grunt.log.error("Source file '" + fileUrl + "' not found.");
    }
    try {
        eval(grunt.file.read(fileUrl));
    } catch (e) {
        grunt.log.error("An unexpected error occured while processing " + fileUrl + ", please report a bug here if problems occur in your app " +
                          "https://github.com/mattgoldspink/grunt-sencha-dependencies/issues?state=open - " + e);
        if (e.stack) {
            grunt.log.error("Stack for debugging: \n" + e.stack);
        }
        throw e;
    }
    return Ext;
};

module.exports = safelyEvalFile;
