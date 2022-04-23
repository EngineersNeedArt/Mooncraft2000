// ==============================================================================================================
// MoonBaseMonitor.js
// ==============================================================================================================

/// This is the larger computer monitor that is displayed when a player lands on a base.
/// Features a 40 character by 21 character display (40 columns, 21 rows).

var MoonBaseMonitor = (function () {
	'use strict';
	
	const kCanvasWidth = 512;
	const kCanvasHeight = 400;
	const kBufferCanvasWidth = 480;		// 40 character columns
	const kBufferCanvasHeight = 336;	// 21 character rows
	const kRowHeight = 16;
	const kColumnWidth = 12;
	const kCanvasOffsetX = 16;
	const kCanvasOffsetY = 44;
	
	var _canvas = null;
	var _fontCanvas = null;
	var _splitBufferCanvas = null;
	var _split = 0;
	var _messageBuffer = new Array ();
	
	// ---------------------------------------------------------------------------------------- Private Functions
	
	/// Display row of text (monitor is a 40 x 21 char display).
	/// Special BELL character (ASCII = 7) is not be displayed but a beep sound is played.
	
	function _drawBitmapText (context, message, y_pos) {
		var i;
		var hAdvance = 0;
		for (i = 0; i < message.length; i++) {
			var char = message.charCodeAt (i);
			if (char === 7) {
				MoonSounds.playBeep ();
			} else {
				if ((char >= 32) && (char < 128)) {
					context.drawImage (_fontCanvas, kColumnWidth * (char - 32), 0, kColumnWidth, kRowHeight, 
							hAdvance, y_pos, kColumnWidth, kRowHeight);
				}
				hAdvance = hAdvance + kColumnWidth;
			}
		}
	}
	
	/// Reset '_split' and clear display buffer.
	
	function _reset () {
		var context = _splitBufferCanvas.getContext ('2d');
		context.fillRect (0, 0, kBufferCanvasWidth, kBufferCanvasHeight);
		_split = 0;
		
		context = _canvas.getContext ('2d');
		context.drawImage (_splitBufferCanvas, kCanvasOffsetX, kCanvasOffsetY);
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	///  Call once.
	
	function init () {
		_canvas = document.createElement ('canvas');
		_canvas.width = kCanvasWidth;
		_canvas.height = kCanvasHeight;
		var context = _canvas.getContext ('2d');
		_canvas.ctx = context;
		
		_splitBufferCanvas = document.createElement ('canvas');
		_splitBufferCanvas.width = kBufferCanvasWidth;
		_splitBufferCanvas.height = kBufferCanvasHeight;
		var splitContext = _splitBufferCanvas.getContext ('2d');
		_splitBufferCanvas.ctx = splitContext;
		
		_reset ();
		
		var overlayImage = new Image ();
		overlayImage.src = 'artwork/base_monitor_overlay.png';
		overlayImage.onload = function () {
			var overlayContext = _canvas.getContext ('2d');
			overlayContext.drawImage (overlayImage, 0, 0);
		};
		
		var fontImage = new Image ();
		fontImage.src = 'artwork/bitmap_font_large.png';
		fontImage.onload = function () {
			_fontCanvas = document.createElement ('canvas');
			_fontCanvas.width = fontImage.width;
			_fontCanvas.height = fontImage.height;
			var fontContext = _fontCanvas.getContext ('2d');
			fontContext.drawImage (fontImage, 0, 0);
		};
	}
	
	/// Clears the display.
	
	function clear () {
		_reset ();
	}
	
	/// Push 'message' to the text buffer. Will be processed with call to 'update()' below.
	
	function pushText (message) {
		_messageBuffer.push (message);
	}
	
	/// Pop the next string off message buffer, scroll existing text up and display new message at bottom.
	/// If the first char is a backspace char (ASCII = 8) then the display is not scrolled up and the text 
	/// message is rendered in the same row as the previous message.
	/// Scrolling is done in an unusual way: the offscreen text buffer is split horizontally into a top 
	/// and bottom section. The row of text just below the split is erased and new text drawn in its 
	/// place. The split is then moved down a row, when it is at the bottom of the monitor it is reset 
	/// to the top again. The final offscreen buffer is composited from the top and bottom sections of 
	/// the offscreen text buffer, except that top and bottom are swapped when rendered: top is rendered ]
	///  beneath the bottom in final offscreen buffer.
	
	function update () {
		if ((_messageBuffer.length > 0) && (_fontCanvas)) {
			var context = _splitBufferCanvas.getContext ('2d');
			var message = _messageBuffer.shift ();
			context.fillRect (0, _split, kBufferCanvasWidth, kRowHeight);
			var isBackspace = message.charCodeAt (0) === 8;
			if (isBackspace) {
				message = message.substring (1);
			}
			_drawBitmapText (context, message, _split - (isBackspace?kRowHeight:0));
			
			// Advance split.
			if (!isBackspace) {
				_split = _split + kRowHeight;
				if (_split >= kBufferCanvasHeight) {
					_split = 0;
				}
			}
			
			// Copy two parts of split canvas to our main canvas.
			context = _canvas.getContext ('2d');
			var splitComplement = kBufferCanvasHeight - _split;
			if (_split > 0) {
				context.drawImage (_splitBufferCanvas, 0, 0, kBufferCanvasWidth, _split, 
						kCanvasOffsetX, splitComplement + kCanvasOffsetY, kBufferCanvasWidth, _split);
			}
			context.drawImage (_splitBufferCanvas, 0, _split, kBufferCanvasWidth, splitComplement, 
					kCanvasOffsetX, kCanvasOffsetY, kBufferCanvasWidth, splitComplement);
		}
	}
	
	function getCanvas () {
		return _canvas;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonBaseMonitor.init ();
	
	return {
		init: init, 
		clear: clear, 
		pushText: pushText, 
		update: update, 
		getCanvas: getCanvas
	};
})();
