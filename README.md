# Image-Zoom
Medium style lightbox image zoomer

# Usage

## JavaScript
```
// Initiate zoomable images
var imgZoom = new ImageZoom(document.querySelectorAll('[data-zoomable]'), {
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
/* Zoom-in */
[data-zoomable] {
    display: block;
	cursor: zoom-in;

	&.is-active {
        display: block;
		position: relative;
		z-index: 100;
        transition: transform 0.16s;
	}

	&.is-zoomed,
	&.is-zooming {
		cursor: zoom-out;
	}
}
```

## HTML
```
<a href="{{ imageUrl }}" data-zoomable data-width="{{ imageWidth }}" data-height="{{ imageHeight }}">
    <img src="{{ thumbUrl }}" alt="">
</a>
```
