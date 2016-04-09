(function (window, document, undefined) {
    'use strict';

    var utils = {
        requestAnimFrame: (
    		window.requestAnimationFrame        ||
    		window.webkitRequestAnimationFrame  ||
    		window.mozRequestAnimationFrame     ||
    		window.oRequestAnimationFrame       ||
    		window.msRequestAnimationFrame      ||
    		function (callback) {
    			window.setTimeout(callback, 1000 / 60);
    		}
    	),

        forEach: function (array, callback, scope) {
            for (var i = 0, len = array.length; i < len; i++) {
                callback.call(scope, i, array[i]);
            }
        },

        debounce: function (func, wait, immediate) {
    		var timeout;
    		return function() {
    			var context = this, args = arguments;
    			var later = function() {
    				timeout = null;
    				if (!immediate) func.apply(context, args);
    			};
    			var callNow = immediate && !timeout;
    			clearTimeout(timeout);
    			timeout = window.setTimeout(later, wait);
    			if (callNow) func.apply(context, args);
    		};
    	},

        whichTransitionEvent: function ( ) {
            var t, el = document.createElement('fakeelement');

            var transitions = {
                'transition'      : 'transitionend',
                'OTransition'     : 'oTransitionEnd',
                'MozTransition'   : 'transitionend',
                'WebkitTransition': 'webkitTransitionEnd'
            };

            for (t in transitions){
                if (el.style[t] !== undefined){
                  return transitions[t];
                }
            }
        },

        extend: function (a, b) {
            for (var prop in b) {
                a[prop] = b[prop];
            }
            return a;
        },

        delegate: function (criteria, listener) {
    		return function (e) {
    			var el = e.target;
    			do {
    				if (!criteria(el)) continue;
    				e.delegateTarget = el;
    				listener.apply(this, arguments);
    				return;
    			} while( (el = el.parentNode) );
    		};
    	},

    	partialDelegate: function (criteria) {
    		return function (handler) {
    			return utils.delegate(criteria, handler);
    		};
    	},

    	criteria: {
    		isAnElement: function (e) {
    			return e instanceof HTMLElement;
    		},
    		hasClass: function (cls) {
    			return function (e) {
    				return utils.criteria.isAnElement(e) && e.classList.contains(cls);
    			};
    		},
            hasAttribute: function (attribute) {
                return function (e) {
                    return utils.criteria.isAnElement(e) && e.hasAttribute(attribute);
                };
            },
    		hasTagName: function (tag) {
    			return function (e) {
    				return utils.criteria.isAnElement(e) && e.nodeName === tag.toUpperCase();
    			};
    		},
    		hasTagNames: function (tags) {
    			if (tags.length > 0) {
    				return function (e) {
    					for (var i = 0, len = tags.length; i < len; i++) {
    						if (utils.criteria.isAnElement(e) && e.nodeName === tags[i].toUpperCase()) {
    							return utils.criteria.isAnElement(e) && e.nodeName === tags[i].toUpperCase();
    						}
    					}
    				};
    			}
    		}
    	},

        isNodeList: function (nodes) {
            var stringRepr = Object.prototype.toString.call(nodes);

            return typeof nodes === 'object' &&
                /^\[object (HTMLCollection|NodeList|Object)\]$/.test(stringRepr) &&
                (typeof nodes.length === 'number') &&
                (nodes.length === 0 || (typeof nodes[0] === 'object' && nodes[0].nodeType > 0));
        },

    };

	// Expose to interface
	if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = utils;
	} else if (typeof define === 'function' && define.amd) {
        define('utils', function ( ) { return utils; } );
	}

})(window, document);
