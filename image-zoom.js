/*! Image Zoom - v1
 *  Copyright (c) 2016 Mattias Hinderson
 *  License: MIT
 */

(function (window, factory) {
    'use strict';

    if (typeof define == 'function' && define.amd) {
        define([
            './utils',
        ], function(utils) {
            return factory(window, utils);
        });
    } else if (typeof exports == 'object') {
        module.exports = factory(
            window,
            require('./utils')
        );
    }

}(window, function factory (window, utils) {
    'use strict';

    // Constants
    var OFFSET = 60;

    // Cached values
    var cache = {};

    // Window events
    var resizeEvent = utils.debounce(function ( ) {
    	cache.viewportWidth = window.innerWidth;
    	cache.viewportHeight = window.innerHeight;
        cache.lastScrollY = window.pageYOffset;
    }, 250);

    var scrollEvent = function ( ) {
    	var requestTick = function ( ) {
            cache.lastScrollY = window.pageYOffset;

    		// Stop ticking
    		cache.ticking = false;
    	};

    	if (!cache.ticking) {
    		utils.requestAnimFrame.call(window, requestTick);
    		cache.ticking = true;
    	}
    };

    // Transition event helper
    var transitionEvent = utils.whichTransitionEvent();

    var calculateZoom = function (imageRect, thumbRect) {
        var highResImageWidth = imageRect.width;
        var highResImageHeight = imageRect.height;

        var viewportHeight = cache.viewportHeight - OFFSET;
        var viewportWidth  = cache.viewportWidth - OFFSET;

        var maxScaleFactor = highResImageWidth / thumbRect.width;

        var imageAspectRatio = thumbRect.width / thumbRect.height;
        var viewPortAspectRatio = viewportWidth / viewportHeight;

        var imgScaleFactor;
        if (highResImageWidth < viewportWidth && highResImageHeight < viewportHeight) {
            imgScaleFactor = maxScaleFactor;
        } else if (imageAspectRatio < viewPortAspectRatio) {
            imgScaleFactor = (viewportHeight / highResImageHeight) * maxScaleFactor;
        } else {
            imgScaleFactor = (viewportWidth / highResImageWidth) * maxScaleFactor;
        }

        return imgScaleFactor;
    };

    // Constructor
    function ImageZoom (elems, options) {
        if (!elems) return;

        // Element states
        var activeElems = [];
        var currentlyZoomedIn = [];
        var loadedImages = [];

        // Update default options
        if (options) {
            OFFSET = options.offset;
        }

        // Set some cache defaults
        cache = {
            ticking: false,
            lastScrollY: window.pageYOffset,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
        };

        window.addEventListener('resize', resizeEvent);
        window.addEventListener('scroll', scrollEvent);

        // Event emitter
        var topic = {};

        var subscribe = function (name, listener) {
        	if (!topic[name]) {
        		topic[name] = { queue: [] };
        	}
        	var index = topic[name].queue.push(listener) - 1;

        	return {
        		remove: function() {
        			delete topic[name].queue[index];
        		}
        	};
        };

        var publish = function (name, data) {
        	if (!topic[name] || topic[name].queue.length === 0) {
        		return;
        	}

        	topic[name].queue.forEach(function (callback) {
        		callback(data || null);
        	});
        };

        // Private functions
        function zoomIn (container, callback) {
            var thumbRect = container.getBoundingClientRect();
            var imageRect = {
                width: container.getAttribute('data-width'),
                height: container.getAttribute('data-height'),
            };

            publish('zoomInStart', container);

            container.classList.add('is-active');

            // Force repaint
            var repaint = container.offsetWidth;

            // Calculate offset
            var viewportY = cache.viewportHeight / 2;
            var viewportX = cache.viewportWidth / 2;
            var imageCenterY = thumbRect.top + (thumbRect.height / 2);
            var imageCenterX = thumbRect.left + (thumbRect.width / 2);
            var translate = 'translate3d(' + (viewportX - imageCenterX) + 'px, ' + (viewportY - imageCenterY) + 'px, 0)';

            // Calculate scale ratio
            var scale = 'scale(' + calculateZoom(imageRect, thumbRect) + ')';

            // Set initial scroll
            cache.initialScrollY = cache.lastScrollY;

            // Apply transforms
            utils.requestAnimFrame.call(window, function ( ) {
                container.classList.add('is-zooming');
                container.isAnimating = true;

                container.style.msTransform = translate + ' ' + scale;
                container.style.webkitTransform = translate + ' ' + scale;
                container.style.transform = translate + ' ' + scale;
            });

            // Events
            window.addEventListener('keydown', keysPressed);
            window.addEventListener('scroll', scrollBounds);

            // Wait for transition to end
            container.addEventListener(transitionEvent, function activateImage ( ) {
                container.removeEventListener(transitionEvent, activateImage);

                container.classList.remove('is-zooming');
                container.classList.add('is-zoomed');
                container.isAnimating = false;
                currentlyZoomedIn.push(container);
                publish('zoomInEnd', container);

                loadHighResImage(container, container.getAttribute('href'));

                if (callback) { callback(); }
            });
        }

        function zoomOut (container, callback) {
            if (!container || container.isAnimating) {
                return;
            }

            // Remove events
            window.removeEventListener('keydown', keysPressed);
            window.removeEventListener('scroll', scrollBounds);

            publish('zoomOutStart', container);

            // Reset transforms
            utils.requestAnimFrame.call(window, function ( ) {
                container.classList.remove('is-zoomed');
                container.isAnimating = true;
                container.style.msTransform = '';
                container.style.webkitTransform = '';
                container.style.transform = '';
            });

            // Wait for transition to end
            container.addEventListener(transitionEvent, function resetImage ( ) {
                container.removeEventListener(transitionEvent, resetImage);
                container.classList.remove('is-active');
                container.isAnimating = false;
                publish('zoomOutEnd', container);

                var i = currentlyZoomedIn.indexOf(container);
                if (i != -1) { currentlyZoomedIn.splice(i, 1); }
                if (callback) { callback(); }
            });
        }

        function loadHighResImage (container, src, callback) {
            if (!(/\.(gif|jpg|jpeg|tiff|png)$/i).test(src)) {
                return;
            }

            var image = container.querySelector('img:last-of-type');

            if (loadedImages.indexOf(image) !== -1) {
                return;
            }

            // Load high-res image
            var highResImage = new Image();
            highResImage.src = src;

            // Remove redundant attributes
            if (image.hasAttribute('srcset')) {
                image.removeAttribute('srcset');
            }
            if (image.hasAttribute('sizes')) {
                image.removeAttribute('sizes');
            }

            highResImage.onload = function ( ) {
                loadedImages.push(image);
                image.src = src;
                publish('imageLoaded', image);
            };
        }

        function togglePrevImage ( ) {
            var currentItem = currentlyZoomedIn[currentlyZoomedIn.length - 1];
            var currentIndex = activeElems.indexOf(currentItem);

            if (currentIndex <= 0) {
                return;
            }

            var prevItem = activeElems[currentIndex - 1];
            zoomOut(currentItem, zoomIn.bind(null, prevItem));
            publish('togglePrevImage', prevItem);
        }

        function toggleNextImage ( ) {
            var currentItem = currentlyZoomedIn[currentlyZoomedIn.length - 1];
            var currentIndex = activeElems.indexOf(currentItem);

            if ((currentIndex + 1) >= activeElems.length) {
                return;
            }

            var nextItem = activeElems[currentIndex + 1];
            zoomOut(currentItem, zoomIn.bind(null, nextItem));
            publish('toggleNextImage', nextItem);
        }

        function keysPressed (e) {
            e = e || window.event;

            if (e.which === 27 || e.keyCode === 27) {
                var currentItem = currentlyZoomedIn[currentlyZoomedIn.length - 1];
                zoomOut(currentItem);
            }
        }

        var scrollBounds = utils.throttle(function ( ) {
            var deltaY = cache.initialScrollY - cache.lastScrollY;
            if (Math.abs(deltaY) >= OFFSET) {
                var currentItem = currentlyZoomedIn[currentlyZoomedIn.length - 1];
                zoomOut(currentItem);
            }
        }, 250);

        function destroy ( ) {
            window.removeEventListener('resize', resizeEvent);
            window.removeEventListener('scroll', scrollEvent);

            utils.forEach(activeElems, function (index, elem) {
                elem.removeEventListener('click', elem.eventListener);
            });
            activeElems.length = 0;
        }

        function toggleZoom (event) {
            event.preventDefault();

            var container = event.delegateTarget;

            if (container.isAnimating) {
                return;
            }

            if (container.classList.contains('is-zoomed')) {
                zoomOut(container);
            } else {
                zoomIn(container);
            }
        }

        // Attach click event listeners to all provided elems
        var bindElem = function (elem) {
            activeElems.push(elem);
            elem.eventListener = utils.delegate(utils.criteria.hasAttribute('data-zoomable'), toggleZoom);
            elem.addEventListener('click', elem.eventListener);
        };

        // Accepts both a single node and a NodeList
        if (utils.isNodeList(elems)) {
            utils.forEach(elems, function (index, elem) {
                bindElem(elem);
            });
        } else if (elems) {
            bindElem(elems);
        }

        // Exposed methods
        return {
            on: subscribe,
            prev: togglePrevImage,
            next: toggleNextImage,
            destroy: destroy,
            zoomIn: zoomIn,
            zoomOut: zoomOut,
        };
    }

    // Expose to interface
	if (typeof module === 'object' && typeof module.exports === 'object') {
		module.exports = ImageZoom;
	} else if (typeof define === 'function' && define.amd) {
		define('ImageZoom', function ( ) { return ImageZoom; } );
	}
}));
