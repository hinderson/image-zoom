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
        offset: 60,
        speed: 180,
        easing: 'ease'
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

    function calculateZoom (fullImageRect, thumbRect, offset) {
        var highResImageWidth = fullImageRect.width;
        var highResImageHeight = fullImageRect.height;

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

    function positionImage ($container, offset) {
        // Get rectangle dimensions
        var $image = $container.firstElementChild;
        var thumbRect = $image.getBoundingClientRect();
        var fullImageRect = {
            width: $container.getAttribute('data-width'),
            height: $container.getAttribute('data-height'),
        };

        // Calculate offset
        var viewportY = cache.viewportHeight / 2;
        var viewportX = cache.viewportWidth / 2;
        var imageCenterY = thumbRect.top + (thumbRect.height / 2);
        var imageCenterX = thumbRect.left + (thumbRect.width / 2);
        var translate = 'translate3d(' + (viewportX - imageCenterX) + 'px, ' + (viewportY - imageCenterY) + 'px, 0)';

        // Calculate scale ratio
        var scale = 'scale(' + calculateZoom(fullImageRect, thumbRect, offset || DEFAULTS.offset) + ')';

        utils.requestAnimFrame.call(window, function ( ) {
            // Apply transitions
            $image.style.msTransition = '-ms-transform ' + DEFAULTS.speed + 'ms ' + DEFAULTS.easing;
            $image.style.webkitTransition = '-webkit-transform ' + DEFAULTS.speed + 'ms ' + DEFAULTS.easing;
            $image.style.transition = 'transform ' + DEFAULTS.speed + 'ms ' + DEFAULTS.easing;

            // Apply transforms
            $image.style.msTransform = translate + ' ' + scale;
            $image.style.webkitTransform = translate + ' ' + scale;
            $image.style.transform = translate + ' ' + scale;
        });

        return $image;
    }

    function EventEmitter() {
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

        return { publish: publish, subscribe: subscribe };
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

        var event = new EventEmitter();

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
        function zoomIn ($container, callback) {
            event.publish('zoomInStart', $container);

            // Intercept a cancel
            if (cancelZoom) {
                cancelZoom = false;
                return;
            }

            $container.classList.add('is-active');

            // Force repaint
            var repaint = $container.offsetWidth;

            // Set initial scroll and viewport dimensions
            cache.initialScrollY = cache.lastScrollY;
            cache.initialViewport = {
                width: cache.viewportWidth,
                height: cache.viewportHeight
            };

            var transitionDone = function ( ) {
                $container.classList.remove('is-zooming');
                $container.classList.add('is-zoomed');
                $container.isAnimating = false;
                currentlyZoomedIn.push($container);
                event.publish('zoomInEnd', $container);

                // Give it some time to rest before loading high-res image
                setTimeout(function ( ) {
                    loadHighResImage($container, $container.getAttribute('href'));
                }, 100);

                // Events
                window.addEventListener('keydown', keysPressed);
                window.addEventListener('scroll', scrollBounds);
                window.addEventListener('resize', resizeBounds);

                if (callback) { callback(); }
            };

            // Apply transforms
            utils.requestAnimFrame.call(window, function ( ) {
                $container.classList.add('is-zooming');
                $container.isAnimating = true;

                // Wait for transition to end
                var $image = positionImage($container, config.offset);
                utils.once($image, transitionEvent, transitionDone);
            });
        }

        function zoomOut ($container, callback) {
            if (!$container || $container.isAnimating) {
                return;
            }

            // Remove events
            window.removeEventListener('keydown', keysPressed);
            window.removeEventListener('scroll', scrollBounds);
            window.removeEventListener('resize', resizeBounds);

            event.publish('zoomOutStart', $container);

            var transitionDone = function (e) {
                $container.classList.remove('is-active');
                $container.isAnimating = false;
                event.publish('zoomOutEnd', $container);

                var $image = e.target;
                $image.style.msTransition = '';
                $image.style.webkitTransition = '';
                $image.style.transition = '';

                var i = currentlyZoomedIn.indexOf($container);
                if (i != -1) { currentlyZoomedIn.splice(i, 1); }
                if (callback) { callback(); }
            };

            // Reset transforms
            utils.requestAnimFrame.call(window, function ( ) {
                $container.classList.remove('is-zoomed');
                $container.isAnimating = true;

                var $image = $container.firstElementChild;
                $image.style.msTransform = '';
                $image.style.webkitTransform = '';
                $image.style.transform = '';

                // Wait for transition to end
                utils.once($image, transitionEvent, transitionDone);
            });
        }

        function loadHighResImage ($container, src) {
            var fileExtension = src.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/);
            if (!fileExtension) return;
            if (!fileExtension[0] !== '.jpeg' &&
                fileExtension[0] !== '.jpg' &&
                fileExtension[0] !== '.png' &&
                fileExtension[0] !== '.gif' &&
                fileExtension[0] !== '.tiff') {
                    return;
            }

            var $image = $container.querySelector('img:last-of-type');

            if (loadedImages.indexOf($image) !== -1) {
                return;
            }

            // Load high-res image
            var $highResImage = new Image();
            $highResImage.onload = function ( ) {
                loadedImages.push($image);
                event.publish('imageLoaded', $image);
            };

            $highResImage.src = src; // Triger an onload event on an invisible <img> tag
            $image.src = src; // Concurrently load the correct image tag

            // Remove redundant attributes
            if ($image.hasAttribute('srcset')) {
                $image.removeAttribute('srcset');
            }
            if ($image.hasAttribute('sizes')) {
                $image.removeAttribute('sizes');
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
            event.publish('togglePrevImage', prevItem);
        }

        function toggleNextImage ( ) {
            var currentItem = currentlyZoomedIn[currentlyZoomedIn.length - 1];
            var currentIndex = activeElems.indexOf(currentItem);

            if ((currentIndex + 1) >= activeElems.length) {
                return;
            }

            var nextItem = activeElems[currentIndex + 1];
            zoomOut(currentItem, zoomIn.bind(null, nextItem));
            event.publish('toggleNextImage', nextItem);
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
            var $container = event.delegateTarget;
            if ($container.isAnimating) {
                return;
            }

            if ($container.classList.contains('is-zoomed')) {
                zoomOut($container);
            } else {
                zoomIn($container);
            }

            event.preventDefault();
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
            on: event.subscribe,
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
