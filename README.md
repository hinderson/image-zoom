# Image-Zoom
Medium style lightbox image zoomer

# Usage

## CSS
```
.zoom-overlay-active {
	position: relative;
    overflow: hidden;
}

[data-zoomable] {
	cursor: zoom-in;

	&.is-active {
		img,
		video {
			position: relative;
			z-index: 100;
		}

		&::before {
			content: "";
			position: absolute;
			top: -100vh;
			left: -100vw;
			width: 100%;
			height: 100%;
			padding: 100vh 100vw;
			background-color: rgba(255, 255, 255, 0.85);
			z-index: 99;
			visibility: hidden;
			opacity: 0;
			transition: visibility 0s linear 0.22s, opacity 0.22s 0s;
			will-change: visibility, opacity;
			transform: translateZ(0);
		}
	}

	img,
	video {
		transition: transform 0.18s;
	    will-change: transform;
	}

	&.is-zoomed,
	&.is-zooming {
		cursor: zoom-out;

		&::before {
			visibility: visible;
			opacity: 1;
			transition: visibility 0s linear 0s, opacity 0.4s 0s;
		}
	}
}
```

## HTML
```
<a href="{{ imageUrl }}" data-zoomable data-width="{{ imageWidth }}" data-height="{{ imageHeight }}">
    <img src="{{ thumbUrl }}" alt="">
</a>
```
