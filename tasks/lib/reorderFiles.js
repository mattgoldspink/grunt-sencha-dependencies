/*global require, module*/
var grunt = require("grunt"),
    path  = require("path");

module.exports = function (history, senchaCoreFile, pageRoot, appJsFilePath, printDepGraph, conversionFn) {
    var files = [senchaCoreFile];
    for (var i = 0, len = history.length; i < len; i++) {
        var filePath = conversionFn ? conversionFn(history[i]) : history[i];
        filePath = filePath.replace(/^file:(\/)*/, "/");
        filePath = path.relative(pageRoot, filePath);
        files.push(filePath);
        if (printDepGraph) {
            grunt.log.writeln(filePath);
        }
    }
    files.push(path.normalize(pageRoot + "/" + appJsFilePath));
    return files;
};
