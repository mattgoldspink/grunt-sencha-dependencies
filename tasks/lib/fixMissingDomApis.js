var select = require("../../node_modules/domino/lib/select.js"),
    DocumentFragment = require("../../node_modules/domino/lib/DocumentFragment.js"),
    Node = require("../../node_modules/domino/lib/Node.js"),
    Element = require("../../node_modules/domino/lib/Element.js"),
    NodeList = require("../../node_modules/domino/lib/NodeList.js");


var fixMissingDomApis = function () {
    DocumentFragment.prototype.querySelector = function (selector) {
        return select(selector, this)[0];
    };
    DocumentFragment.prototype.querySelectorAll = function (selector) {
        var self = this;
        if (!this.parentNode && this.nodeType !== 11) {
            self = this.ownerDocument.createElement("div");
            self.appendChild(this);
        }
        var nodes = select(selector, self);
        var result = nodes.item ? nodes : new NodeList(nodes);
        return result;
    };
    DocumentFragment.prototype.getElementsByTagName = function (tagName) {
        return Element.prototype.getElementsByTagName.apply(this, arguments);
    };
    DocumentFragment.prototype.getElementsByClassName = function (tagName) {
        return Element.prototype.getElementsByClassName.apply(this, arguments);
    };
    DocumentFragment.prototype.firstElementChild = function () {
        var kids = this.childNodes;
        for (var i = 0, n = kids.length; i < n; i++) {
            if (kids[i].nodeType === Node.ELEMENT_NODE) return kids[i];
        }
        return null;
    };
    DocumentFragment.prototype.nextElementSibling = function () {
        if (this.parentNode) {
            var sibs = this.parentNode.childNodes;
            for (var i = this.index + 1, n = sibs.length; i < n; i++) {
                if (sibs[i].nodeType === Node.ELEMENT_NODE) return sibs[i];
            }
        }
        return null;
    };
    DocumentFragment.prototype.nextElement = function (tagName) {
        var root,
            next = this.firstElementChild() || this.nextElementSibling();
        if (next) return next;

        if (!root) root = this.ownerDocument.documentElement;

        // If we can't go down or across, then we have to go up
        // and across to the parent sibling or another ancestor's
        // sibling.  Be careful, though: if we reach the root
        // element, or if we reach the documentElement, then
        // the traversal ends.
        for (var parent = this.parentElement;
            parent && parent !== root;
            parent = parent.parentElement) {

            next = parent.nextElementSibling;
            if (next) return next;
        }

        return null;
    };
};

module.exports = fixMissingDomApis;
