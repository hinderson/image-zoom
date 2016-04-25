/*! Image Zoom - v1
 *  Copyright (c) 2016 Mattias Hinderson
 *  License: MIT
 */

(function (window, factory) {
    'use strict';

    if (typeof define == 'function' && define.amd) {
        // AMD
        define([
            './utils',
            './pubsub'
        ], function(utils, pubsub) {
            return factory(window, utils, pubsub);
        });
    } else if (typeof exports == 'object') {
        // CommonJS
        module.exports = factory(
            window,
            require('./utils'),
            require('./pubsub')
        );
    }

}(window, function factory (window, utils, pubsub) {
    'use strict';

    // Constants
    var OFFSET = 60;

    // Cached values
    var cache = {
        ticking: false,
        lastScrollY: window.pageYOffset,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
    };

    // Element states
    var activeElems = [];
    var currentlyZoomedIn = [];
    var loadedImages = [];

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

    window.addEventListener('resize', resizeEvent);
    window.addEventListener('scroll', scrollEvent);

    function keysPressed (e) {
        e = e || window.event;

        switch(e.which || e.keyCode) {
            // Esc
            case 27:
                var currentItem = currentlyZoomedIn[currentlyZoomedIn.length - 1];
                zoomOut(currentItem);
                break;

            // Left arrow
            case 37:
                e.preventDefault();
                togglePrevImage();
                break;

            // Right arrow
            case 39:
                e.preventDefault();
                toggleNextImage();
                break;

            default: return;
        }
    }

    // Transition event helper
    var transitionEvent = utils.whichTransitionEvent();

    function calculateZoom (imageRect, thumbRect) {
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
            pubsub.publish('imageLoaded', image);
        };
    }

    function zoomOut (container, callback) {
        pubsub.publish('zoomOutStart', container);

        // Remove keyboard commands
        window.removeEventListener('keydown', keysPressed);

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
            pubsub.publish('zoomOutEnd', container);

            var i = currentlyZoomedIn.indexOf(container);
            if (i != -1) { currentlyZoomedIn.splice(i, 1); }
            if (callback) { callback(); }
        });
    }

    function zoomIn (container, callback) {
        var thumbRect = container.getBoundingClientRect();
        var imageRect = {
            width: container.getAttribute('data-width'),
            height: container.getAttribute('data-height'),
        };

        pubsub.publish('zoomInStart', container);

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

        // Wait for transition to end
        container.addEventListener(transitionEvent, function activateImage ( ) {
            container.removeEventListener(transitionEvent, activateImage);

            container.classList.remove('is-zooming');
            container.classList.add('is-zoomed');
            container.isAnimating = false;
            currentlyZoomedIn.push(container);
            pubsub.publish('zoomInEnd', container);

            loadHighResImage(container, container.getAttribute('href'));

            if (callback) { callback(); }
        });
    }

    var toggleNextImage = function ( ) {
        var currentItem = currentlyZoomedIn[currentlyZoomedIn.length - 1];
        var currentIndex = activeElems.indexOf(currentItem);

        if ((currentIndex + 1) >= activeElems.length) {
            return;
        }

        zoomOut(currentItem, function ( ) {
            var nextItem = activeElems[currentIndex + 1];
            zoomIn(nextItem);
        });
    };

    var togglePrevImage = function ( ) {
        var currentItem = currentlyZoomedIn[currentlyZoomedIn.length - 1];
        var currentIndex = activeElems.indexOf(currentItem);

        if (currentIndex <= 0) {
            return;
        }

        zoomOut(currentItem, function ( ) {
            var prevItem = activeElems[currentIndex - 1];
            zoomIn(prevItem);
        });
    };

    var toggleZoom = function (event) {
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
    };

    function ImageZoom (elems, options) {
        if (!elems) return;

        // Update default options
        if (options) {
            OFFSET = options.offset;
        }

        // Export event emitter
        this.on = pubsub.subscribe;

        // Export functions
        this.prev = togglePrevImage;
        this.next = toggleNextImage;

        // Attach click event listeners to all provided elems
        var bindElem = function (elem) {
            activeElems.push(elem);
            elem.addEventListener('click', utils.delegate(utils.criteria.hasAttribute('data-zoomable'), toggleZoom));
        };

        // Accepts both a single node and a NodeList
        if (utils.isNodeList(elems)) {
            utils.forEach(elems, function (index, elem) {
                bindElem(elem);
            });
        } else if (elems) {
            bindElem(elems);
        }
    }

	// Expose to interface
	if (typeof module === 'object' && typeof module.exports === 'object') {
		// CommonJS, just export
		module.exports = ImageZoom;
	} else if (typeof define === 'function' && define.amd) {
		// AMD support
		define('ImageZoom', function ( ) { return ImageZoom; } );
	}

}));
