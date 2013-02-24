/*global window, require, module*/
var grunt = require("grunt");

module.exports = function (pageRoot) {
    global.emptyFn = function () { return {}; };
    global.navigator = { "userAgent" : "node" };
    global.location = window.location;
    global.ActiveXObject = global.emptyFn;
    global.window.localStorage = {
        getItem: function (sKey) {
            if (!sKey || !this[sKey]) { return null; }
            return this[sKey];
        },
        key: function (nKeyId) {
            return nKeyId;
        },
        setItem: function (sKey, sValue) {
            if (!sKey) { return; }
            this[sKey] = typeof sValue === "string" ? sValue : JSON.stringify(sValue);
            this.length++;
        },
        length: 0,
        removeItem: function (sKey) {
            if (!sKey || !this[sKey]) { return; }
            delete this[sKey];
            this.length--;
        }
    };
    global.XMLHttpRequest = function () {
        var contents = "";
        return {
            send: global.emptyFn,
            open: function (type, url) {
                url = url.replace(/\?.*/, "");
                url = pageRoot  + "/" + url;
                if (!grunt.file.exists(url)) {
                    grunt.log.error("WARNING: Source file '" + url + "' not found.");
                    this.status = 404;
                } else {
                    this.responseText = grunt.file.read(url);
                    this.status = 200;
                }
            }
        };
    };
    return global;
};
