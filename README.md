# Image-Zoom
Medium.com-style lightbox image zoomer.

# Usage

## HTML
The zoomable image/element (could be anything really) needs to be wrapped with a container; preferably a link so that the user still can access the higher-resolution image if JavaScript fails. The URL that's in the `href` attribute will automatically be loaded once the zoom has completed.
```
<a href="{{ imageUrl }}" data-zoomable data-width="{{ imageWidth }}" data-height="{{ imageHeight }}">
    <img src="{{ thumbUrl }}" width="{{ thumbWidth }}" height="{{ thumbHeight }}" alt="">
</a>
```

## JavaScript
The offset argument is the space between the edges of your browser and the zoomed-in element.

The speed argument is a CSS transition duration specified in milliseconds, for example 180ms.
```
var imgZoom = new ImageZoom('[data-zoomable]', {
    offset: 60,
    speed: 180
});
```

## Example CSS
This is optional but some of it improves performance.
```
[data-zoomable] {
    display: block;
	cursor: zoom-in;
}

[data-zoomable] img {
    backface-visibility: hidden;
    transform: translateZ(0);
}

// The actual image to be zoomed (not always an image)
[data-zoomable].is-active > * {
    position: relative;
    z-index: 1000;
}

// Background overlay
[data-zoomable].is-active::before {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(255, 255, 255, 0.85);
    z-index: 999;
    visibility: hidden;
    opacity: 0;
    transition: visibility 0s linear 0.14s, opacity 0.14s 0s;
    transform: translateZ(0);
}

[data-zoomable].is-zoomed,
[data-zoomable].is-zooming {
    cursor: zoom-out;
}

[data-zoomable].is-zoomed::before,
[data-zoomable].is-zooming::before {
    visibility: visible;
    opacity: 1;
    transition: visibility 0s linear 0s, opacity 0.4s 0s;
}
```
