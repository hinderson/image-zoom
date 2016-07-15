# Image-Zoom
Medium.com-style lightbox image zoomer.

# Usage

## JavaScript
```
var imgZoom = new ImageZoom('[data-zoomable]', {
    offset: 60
});

imgZoom.on('zoomInStart', function ( ) {
    document.body.classList.add('overlay-open');
});

imgZoom.on('zoomOutStart', function ( ) {
    document.body.classList.remove('overlay-open');
});
```

## Example CSS
```
[data-zoomable] {
    display: block;
	cursor: zoom-in;
}

[data-zoomable].is-active {
    display: block;
    position: relative;
    z-index: 100;
    transition: transform 0.16s;
}

[data-zoomable].is-zoomed,
[data-zoomable].is-zooming {
    cursor: zoom-out;
}

```

## HTML
```
<a href="{{ imageUrl }}" data-zoomable data-width="{{ imageWidth }}" data-height="{{ imageHeight }}">
    <img src="{{ thumbUrl }}" width="{{ thumbWidth }}" height="{{ thumbHeight }}" alt="">
</a>
```
