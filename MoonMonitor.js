// ==============================================================================================================
// MoonMonitor.js
// ==============================================================================================================

var MoonMonitor = (function () {
	'use strict';
	
	// Handles displaying the small monitor (computer terminal) in the ship cockpit (console).
	
	const kCanvasWidth = 112;
	const kCanvasHeight = 117;
	const kBufferCanvasWidth = 112;		// 7 x 16 columns
	const kBufferCanvasHeight = 117;	// 9 x 13 rows
	const kRowHeight = 9;
	const kNumberOfColumns = 16;
	
	var _canvas = null;
	var _overlayCanvas = null;
	var _fontCanvas = null;
	var _splitBufferCanvas = null;
	var _split = 0;
	var _messageBuffer = new Array ();
	
	// ---------------------------------------------------------------------------------------- Private Functions
	
	// 16 x 13 char display.
	function _drawBitmapText (context, message, y_pos) {
		var i;
		var hAdvance = 0;
		for (i = 0; i < message.length; i++) {
			var char = message.charCodeAt (i);
			if (char == 7) {
				MoonSounds.playBeep ();
			} else {
				if ((char >= 32) && (char < 128)) {
					context.drawImage (_fontCanvas, 7 * (char - 32), 0, 7, 9, hAdvance, y_pos, 7, 9);
				}
				hAdvance = hAdvance + 7;
			}
		}
	}
	
	function _reset () {
		var context = _canvas.getContext ('2d');
		context.fillRect (0, 0, kCanvasWidth, kCanvasHeight);
		
		context = _splitBufferCanvas.getContext ('2d');
		context.fillRect (0, 0, kBufferCanvasWidth, kBufferCanvasHeight);
		_split = 0;			
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init () {
		_canvas = document.createElement ('canvas');
		_canvas.width = kCanvasWidth;
		_canvas.height = kCanvasHeight;
		var context = _canvas.getContext ('2d');
		_canvas.ctx = context;
		
		_splitBufferCanvas = document.createElement ('canvas');
		_splitBufferCanvas.width = kBufferCanvasWidth;
		_splitBufferCanvas.height = kBufferCanvasHeight;
		var context = _splitBufferCanvas.getContext ('2d');
		_splitBufferCanvas.ctx = context;
		_reset ();
		
		var overlayImage = new Image ();
		overlayImage.src = 'artwork/monitor_overlay.png';
		overlayImage.onload = function () {
			_overlayCanvas = document.createElement ('canvas');
			_overlayCanvas.width = overlayImage.width;
			_overlayCanvas.height = overlayImage.height;
			var context = _overlayCanvas.getContext ('2d');
			context.drawImage (overlayImage, 0, 0);
		};
		
		var fontImage = new Image ();
		fontImage.src = 'artwork/bitmap_font.png';
		fontImage.onload = function () {
			_fontCanvas = document.createElement ('canvas');
			_fontCanvas.width = fontImage.width;
			_fontCanvas.height = fontImage.height;
			var context = _fontCanvas.getContext ('2d');
			context.drawImage (fontImage, 0, 0);
		};
	}
	
	function update () {
		if ((_messageBuffer.length > 0) && (_fontCanvas)) {
			var context = _splitBufferCanvas.getContext ('2d');
			var message = _messageBuffer.shift ();
			context.fillRect (0, _split, kBufferCanvasWidth, kRowHeight);
			_drawBitmapText (context, message, _split);
			
			// Advance split.
			_split = _split + kRowHeight;
			if (_split >= kBufferCanvasHeight) {
				_split = 0;
			}
			
			// Copy two parts of split canvas to our main canvas.
			// This is how "scrolling" is optimized. Above split is copied to bottom of the main 
			// canvas while the region below the plit is copied to the top of the main canvas.
			context = _canvas.getContext ('2d');
			var splitComplement = kBufferCanvasHeight - _split;
			if (_split > 0) {
				context.drawImage (_splitBufferCanvas, 0, 0, kBufferCanvasWidth, _split, 0, splitComplement, kBufferCanvasWidth, _split);
			}
			context.drawImage (_splitBufferCanvas, 0, _split, kBufferCanvasWidth, splitComplement, 0, 0, kBufferCanvasWidth, splitComplement);
			
			if (_overlayCanvas) {
				context.drawImage (_overlayCanvas, 0, 0);
			}
		}
	}
	
	function pushText (message, breakMessageIfLarge = false) {
		if ((breakMessageIfLarge) && (message.length > kNumberOfColumns)) {
			var partialMessage = message;
			var index = Math.min (partialMessage.length - 1, 15);
			while (index > 0) {
				if (partialMessage[index] === " ") {
					var oneLine = partialMessage.slice (0, index);
					_messageBuffer.push (oneLine);
					partialMessage = partialMessage.slice (index + 1, partialMessage.length);
					index = Math.min (partialMessage.length - 1, 15);
				} else {
					index = index - 1;
				}
			}
			if (partialMessage.length <= kNumberOfColumns) {
				_messageBuffer.push (partialMessage);
			} else {
				_messageBuffer.push (partialMessage.slice(0, kNumberOfColumns - 3).concat('...'));
			}
		} else {			
			_messageBuffer.push (message);
		}
	}
	
	function getCanvas () {
		return _canvas;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonMonitor.init ();
	
	return {
		init: init, 
		update: update, 
		pushText: pushText, 
		getCanvas: getCanvas
	};
})();
