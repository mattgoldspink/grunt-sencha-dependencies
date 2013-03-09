/*global require, module*/
var grunt = require("grunt"),
    path  = require("path");

module.exports = function (history, senchaCoreFile, pageRoot, appJsFilePath, printDepGraph, conversionFn) {
    var files = [senchaCoreFile];
    for (var i = 0, len = history.length; i < len; i++) {
        var filePath = conversionFn ? conversionFn(history[i]) : history[i];
        files.push(path.normalize(pageRoot + "/" + filePath));
        if (printDepGraph) {
            grunt.log.writeln(path.normalize(pageRoot + "/" + filePath));
        }
    }
    files.push(path.normalize(pageRoot + "/" + appJsFilePath));
    return files;
};
