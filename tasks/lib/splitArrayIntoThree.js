/*global module*/
module.exports = function (array, senchaDir, grunt, prop_prefix) {
    var ext_core_files = [],
        app_files = [],
        regX = new RegExp("^" + senchaDir);

    for (var i = 0, len = array.length; i < len; i++) {
        var file = array[i];
        if (regX.test(file) && !/(src|examples)\/ux/.test(file)) {
            ext_core_files.push(file);
        } else {
            app_files.push(file);
        }
    }

    grunt.config.set(prop_prefix, array);
    grunt.config.set(prop_prefix + "_ext_core", ext_core_files);
    grunt.config.set(prop_prefix + "_app", app_files);

    grunt.log.ok("Success! " + array.length + " files added to property " + prop_prefix);
    grunt.verbose.writeln("Files are:\n    " + array.join("\n    "));

    grunt.verbose.ok(ext_core_files.length + " files added to property " + prop_prefix + "_ext_core");
    grunt.verbose.ok(app_files.length + " files added to property " + prop_prefix + "_app");
};
