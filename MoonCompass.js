// ==============================================================================================================
// MoonCompass.js
// ==============================================================================================================

/// One of the earlier controls I created. The compass is an image — a long strip running from N/W to N/W 
/// again and on to N/E. A moving "window" (cropping the strip) displays the compass heading.

var MoonCompass = (function () {
	'use strict';
	
	const kCanvasWidth = 145;
	const kCanvasHeight = 18;
	const kDisplayOffsetX = 7;
	
	var _canvas = null;
	var _sourceCanvas = null;
	var _overlayCanvas = null;
	var _heading = -1;
	var _dirty = false;
	
	// ----------------------------------------------------------------------------------------- Public Functions
	// ----------------------------------------------------------------------------------------------------- init
	
	function init () {
		_canvas = document.createElement ('canvas');
		_canvas.width = kCanvasWidth;
		_canvas.height = kCanvasHeight;
		var context = _canvas.getContext ('2d');
		_canvas.ctx = context;
		
		var sourceImage = new Image ();
		sourceImage.src = 'artwork/compass.png';
		sourceImage.onload = function () {
			_sourceCanvas = document.createElement ('canvas');
			_sourceCanvas.width = sourceImage.width;
			_sourceCanvas.height = sourceImage.height;
			var context = _sourceCanvas.getContext ('2d');
			context.drawImage (sourceImage, 0, 0);
		};
		
		var overlayImage = new Image ();
		overlayImage.src = 'artwork/compass_overlay.png';
		overlayImage.onload = function () {
			_overlayCanvas = document.createElement ('canvas');
			_overlayCanvas.width = overlayImage.width;
			_overlayCanvas.height = overlayImage.height;
			var context = _overlayCanvas.getContext ('2d');
			context.drawImage (overlayImage, 0, 0);
		};
		_dirty = true;
	}
	
	// --------------------------------------------------------------------------------------------------- update
	
	function update (newHeading) {
		if (_heading == newHeading) {
			_dirty = false;
			return;
		}
		
		_heading = newHeading;
		_dirty = true;
		
		if (_sourceCanvas) {
			var context = _canvas.getContext ('2d');
			
			// Math determines how far from the left to offset the "window" (clip) such that the correct 
			// heading is displayed in the center of the compass control.
			var offset = ((_heading * 504) / (Math.PI * 2)) + kDisplayOffsetX;
			context.drawImage (_sourceCanvas, offset|0, 0, kCanvasWidth, kCanvasHeight, 0, 0, kCanvasWidth, kCanvasHeight);
		}
		
		if (_overlayCanvas) {
			_canvas.ctx.drawImage (_overlayCanvas, 0, 0);
		}
	}
	
	// ------------------------------------------------------------------------------------------------ getCanvas
	
	function getCanvas () {
		return _canvas;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonCompass.init ();
	
	return {
		init: init, 
		update: update, 
		getCanvas: getCanvas
	};
})();
