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

        isObject: function (value) {
            var type = typeof value;
            return !!value && (type == 'object' || type == 'function');
        },

        debounce: function (func, wait, options) {
            var now = Date.now;

            var args,
                maxTimeoutId,
                result,
                stamp,
                thisArg,
                timeoutId,
                trailingCall,
                lastCalled = 0,
                leading = false,
                maxWait = false,
                trailing = true;

            wait = wait || 0;

            if (utils.isObject(options)) {
                leading = !!options.leading;
                maxWait = 'maxWait' in options && (options.maxWait || 0, wait);
                trailing = 'trailing' in options ? !!options.trailing : trailing;
            }

            function cancel ( ) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                if (maxTimeoutId) {
                    clearTimeout(maxTimeoutId);
                }
                lastCalled = 0;
                args = maxTimeoutId = thisArg = timeoutId = trailingCall = undefined;
            }

            function complete (isCalled, id) {
                if (id) {
                    clearTimeout(id);
                }
                maxTimeoutId = timeoutId = trailingCall = undefined;
                if (isCalled) {
                    lastCalled = now();
                    result = func.apply(thisArg, args);

                    if (!timeoutId && !maxTimeoutId) {
                        args = thisArg = undefined;
                    }
                }
            }

            function delayed ( ) {
                var remaining = wait - (now() - stamp);
                if (remaining <= 0 || remaining > wait) {
                    complete(trailingCall, maxTimeoutId);
                } else {
                    timeoutId = setTimeout(delayed, remaining);
                }
            }

            function flush ( ) {
                if ((timeoutId && trailingCall) || (maxTimeoutId && trailing)) {
                    result = func.apply(thisArg, args);
                }
                cancel();
                return result;
            }

            function maxDelayed ( ) {
                complete(trailing, timeoutId);
            }

            function debounced ( ) {
                args = arguments;
                stamp = now();
                thisArg = this; // jshint ignore:line
                trailingCall = trailing && (timeoutId || !leading);

                if (maxWait === false) {
                    var leadingCall = leading && !timeoutId;
                } else {
                    if (!maxTimeoutId && !leading) {
                        lastCalled = stamp;
                    }
                    var remaining = maxWait - (stamp - lastCalled),
                    isCalled = remaining <= 0 || remaining > maxWait;

                    if (isCalled) {
                        if (maxTimeoutId) {
                            maxTimeoutId = clearTimeout(maxTimeoutId);
                        }
                        lastCalled = stamp;
                        result = func.apply(thisArg, args);
                    } else if (!maxTimeoutId) {
                        maxTimeoutId = setTimeout(maxDelayed, remaining);
                    }
                }

                if (isCalled && timeoutId) { // jshint ignore:line
                    timeoutId = clearTimeout(timeoutId);
                } else if (!timeoutId && wait !== maxWait) {
                    timeoutId = setTimeout(delayed, wait);
                }

                if (leadingCall) { // jshint ignore:line
                    isCalled = true; // jshint ignore:line
                    result = func.apply(thisArg, args);
                }
                if (isCalled && !timeoutId && !maxTimeoutId) { // jshint ignore:line
                    args = thisArg = undefined;
                }
                return result;
            }

            debounced.cancel = cancel;
            debounced.flush = flush;

            return debounced;
    	},

        throttle: function (func, wait, options) {
            var leading = true;
            var trailing = true;

            if (utils.isObject(options)) {
                leading = 'leading' in options ? !!options.leading : leading;
                trailing = 'trailing' in options ? !!options.trailing : trailing;
            }

            return utils.debounce(func, wait, {
                'leading': leading,
                'maxWait': wait,
                'trailing': trailing
            });
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
