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
    var DEFAULTS = {
        offset: 60
    };

    // Cached values
    var cache = {};
    var cancelZoom = false;

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

    function calculateZoom (imageRect, thumbRect, offset) {
        var highResImageWidth = imageRect.width;
        var highResImageHeight = imageRect.height;

        var viewportWidth  = cache.viewportWidth - offset;
        var viewportHeight = cache.viewportHeight - offset;

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
    }

    function positionImage (container, offset) {
        // Get rectangle dimensions
        var thumbRect = container.getBoundingClientRect();
        var imageRect = {
            width: container.getAttribute('data-width'),
            height: container.getAttribute('data-height'),
        };

        // Calculate offset
        var viewportY = cache.viewportHeight / 2;
        var viewportX = cache.viewportWidth / 2;
        var imageCenterY = thumbRect.top + (thumbRect.height / 2);
        var imageCenterX = thumbRect.left + (thumbRect.width / 2);
        var translate = 'translate3d(' + (viewportX - imageCenterX) + 'px, ' + (viewportY - imageCenterY) + 'px, 0)';

        // Calculate scale ratio
        var scale = 'scale(' + calculateZoom(imageRect, thumbRect, offset || DEFAULTS.offset) + ')';

        // Apply transforms
        container.style.msTransform = translate + ' ' + scale;
        container.style.webkitTransform = translate + ' ' + scale;
        container.style.transform = translate + ' ' + scale;
    }

    // Constructor
    function ImageZoom (query, options) {
        if (!query) return;

        // Element states
        var activeElems = [];
        var currentlyZoomedIn = [];
        var loadedImages = [];

        // Extend options
        var config = utils.extend(DEFAULTS, options);

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

        // Private events
        function keysPressed (e) {
            e = e || window.event;

            if (e.which === 27 || e.keyCode === 27) {
                var currentItem = currentlyZoomedIn[currentlyZoomedIn.length - 1];
                zoomOut(currentItem);
            }
        }

        function scrollBounds ( ) {
            var deltaY = cache.initialScrollY - cache.lastScrollY;
            if (Math.abs(deltaY) >= config.offset) {
                var currentItem = currentlyZoomedIn[currentlyZoomedIn.length - 1];
                zoomOut(currentItem);
            }
        }

        function resizeBounds ( ) {
            var deltaY = cache.initialViewport.width - cache.viewportWidth;
            var deltaX = cache.initialViewport.height - cache.viewportHeight;
            if (Math.abs(deltaY) >= config.offset || Math.abs(deltaX) >= config.offset) {
                var currentItem = currentlyZoomedIn[currentlyZoomedIn.length - 1];
                zoomOut(currentItem);
            }
        }

        // Private functions
        function zoomIn (container, callback) {
            publish('zoomInStart', container);

            // Intercept a cancel
            if (cancelZoom) {
                cancelZoom = false;
                return;
            }

            container.classList.add('is-active');

            // Force repaint
            var repaint = container.offsetWidth;

            // Set initial scroll and viewport dimensions
            cache.initialScrollY = cache.lastScrollY;
            cache.initialViewport = {
                width: cache.viewportWidth,
                height: cache.viewportHeight
            };

            var transitionDone = function ( ) {
                container.classList.remove('is-zooming');
                container.classList.add('is-zoomed');
                container.isAnimating = false;
                currentlyZoomedIn.push(container);
                publish('zoomInEnd', container);

                loadHighResImage(container, container.getAttribute('href'));

                // Events
                window.addEventListener('keydown', keysPressed);
                window.addEventListener('scroll', scrollBounds);
                window.addEventListener('resize', resizeBounds);

                if (callback) { callback(); }
            };

            // Apply transforms
            utils.requestAnimFrame.call(window, function ( ) {
                container.classList.add('is-zooming');
                container.isAnimating = true;
                positionImage(container, config.offset);

                // Wait for transition to end
                utils.once(container, transitionEvent, transitionDone);
            });
        }

        function zoomOut (container, callback) {
            if (!container || container.isAnimating) {
                return;
            }

            // Remove events
            window.removeEventListener('keydown', keysPressed);
            window.removeEventListener('scroll', scrollBounds);
            window.removeEventListener('resize', resizeBounds);

            publish('zoomOutStart', container);

            var transitionDone = function ( ) {
                container.classList.remove('is-active');
                container.isAnimating = false;
                publish('zoomOutEnd', container);

                var i = currentlyZoomedIn.indexOf(container);
                if (i != -1) { currentlyZoomedIn.splice(i, 1); }
                if (callback) { callback(); }
            };

            // Reset transforms
            utils.requestAnimFrame.call(window, function ( ) {
                container.classList.remove('is-zoomed');
                container.isAnimating = true;
                container.style.msTransform = '';
                container.style.webkitTransform = '';
                container.style.transform = '';

                // Wait for transition to end
                utils.once(container, transitionEvent, transitionDone);
            });
        }

        function loadHighResImage (container, src) {
            if (!(/\.(gif|jpg|jpeg|tiff|png)$/i).test(src)) {
                return;
            }

            var image = container.querySelector('img:last-of-type');

            if (loadedImages.indexOf(image) !== -1) {
                return;
            }

            // Load high-res image
            var highResImage = new Image();
            highResImage.onload = function ( ) {
                loadedImages.push(image);
                publish('imageLoaded', image);
            };

            highResImage.src = src; // Triger an onload event on an invisible <img> tag
            image.src = src; // Concurrently load the correct image tag

            // Remove redundant attributes
            if (image.hasAttribute('srcset')) {
                image.removeAttribute('srcset');
            }
            if (image.hasAttribute('sizes')) {
                image.removeAttribute('sizes');
            }
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
        var elems = (typeof query === 'string' ? document.querySelectorAll(query) : query);
        utils.forEach(elems, function (index, elem) {
            activeElems.push(elem);
            elem.eventListener = utils.delegate(utils.criteria.hasAttribute('data-zoomable'), toggleZoom);
            elem.addEventListener('click', elem.eventListener);
        });

        // Exposed methods
        return {
            on: subscribe,
            prev: togglePrevImage,
            next: toggleNextImage,
            destroy: destroy,
            zoomIn: zoomIn,
            zoomOut: zoomOut,
            cancelCurrentZoom: function ( ) {
                cancelZoom = true;
            }
        };
    }

    // Expose to interface
	if (typeof module === 'object' && typeof module.exports === 'object') {
		module.exports = ImageZoom;
	} else if (typeof define === 'function' && define.amd) {
		define('ImageZoom', function ( ) { return ImageZoom; } );
	}
}));
