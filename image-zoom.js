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

    // Performance helpers
    var hintBrowser = function ( ) {
        this.style.willChange = 'transform';
    };

    var removeHint = function ( ) {
        this.removeEventListener(transitionEvent, removeHint);
	    this.style.willChange = 'auto';
    };

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

    function zoomOut (e) {
        var container = (e && e.delegateTarget) ? e.delegateTarget : document.querySelector('[data-zoomable].is-zoomed');
        if (!container) { return; }

        pubsub.publish('zoomOutStart', container);

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
        });

        container.addEventListener(transitionEvent, removeHint);
    }

    function zoomIn (e) {
        var container = e.delegateTarget;
        var image = e.target;
        var thumbRect = image.getBoundingClientRect();
        var imageRect = {
            width: container.getAttribute('data-width'),
            height: container.getAttribute('data-height'),
        };

        pubsub.publish('zoomInStart', container);

        container.classList.add('is-active');

        // Force repaint
        var repaint = image.offsetWidth;

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

            // Set explicit dimensions to avoid max-width issues
            image.setAttribute('width', imageRect.width);
            image.setAttribute('height', imageRect.height);

            container.style.msTransform = translate + ' ' + scale;
            container.style.webkitTransform = translate + ' ' + scale;
            container.style.transform = translate + ' ' + scale;
        });

        // Events
        window.addEventListener('keydown', function keysPressed (e) {
            e = e || window.event;

            if (e.which === 27 || e.keyCode === 27) {
                zoomOut();
                window.removeEventListener('keydown', keysPressed);
            }
        });

        // Wait for transition to end
        container.addEventListener(transitionEvent, function activateImage ( ) {
            container.removeEventListener(transitionEvent, activateImage);

            container.classList.remove('is-zooming');
            container.classList.add('is-zoomed');
            container.isAnimating = false;

            pubsub.publish('zoomInEnd', container);

            // Load high-res image
            image.src = container.getAttribute('href');

            // Remove redundant attributes
            if (image.hasAttribute('srcset')) {
                image.removeAttribute('srcset');
            }
            if (image.hasAttribute('sizes')) {
                image.removeAttribute('sizes');
            }

            pubsub.publish('imageLoaded', image);
        });
    }

    var toggleZoom = function (e) {
        e.preventDefault();

        if (e.delegateTarget.isAnimating) {
            return;
        }

        if (e.delegateTarget.classList.contains('is-zoomed')) {
            zoomOut(e);
        } else {
            zoomIn(e);
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

        // Attach click event listeners to all provided elems
        var bindLink = function (elem) {
            elem.addEventListener('click', utils.delegate(utils.criteria.hasAttribute('data-zoomable'), toggleZoom));
            elem.addEventListener('mouseenter', hintBrowser);
        };

        // Accepts both a single node and a NodeList
        if (utils.isNodeList(elems)) {
            utils.forEach(elems, function (index, elem) {
                bindLink(elem);
            });
        } else if (elems) {
            bindLink(elems);
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
