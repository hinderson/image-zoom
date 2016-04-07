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

    };

	// Expose to interface
	if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = utils;
	} else if (typeof define === 'function' && define.amd) {
        define('utils', function ( ) { return utils; } );
	}

})(window, document);
