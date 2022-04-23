// ==============================================================================================================
// MoonNixies.js
// ==============================================================================================================

var MoonNixies = (function () {
	'use strict';
	
	// Suite of canvases (and artwork depicting "nixie" digits) to display numerical values in the 
	// cockpit (console).
	
	const kCanvasWidth = 39;
	const kCanvasHeight = 20;
	
	var _digitsCanvas = null;
	var _altitudeCanvas = null;
	var _verticalVelocityCanvas = null;
	var _fuelCanvas = null;
	var _forwardVelocityCanvas = null;
	
	// ---------------------------------------------------------------------------------------- Private Functions
	
	function _drawDigit (int_value, x_pos, y_pos, count, destination_context) {
		if (_digitsCanvas) {
			var sliding_digit = int_value|0;
			var digitsDrawn = 0;
			var x_advance = x_pos;
			do {
				let digit = sliding_digit % 10;
				destination_context.drawImage (_digitsCanvas, digit * 13, 0, 13, 20, x_advance, y_pos, 13, 20);
				x_advance = x_advance - 13;
				sliding_digit = (sliding_digit / 10)|0;
				digitsDrawn = digitsDrawn + 1;
			} while (digitsDrawn < count);
		}
	}
	
	function _drawUpArrow (x_pos, y_pos, destination_context) {
		if (_digitsCanvas) {
			destination_context.drawImage (_digitsCanvas, 130, 0, 13, 20, x_pos, y_pos, 13, 20);
		}
	}
	
	function _drawDownArrow (x_pos, y_pos, destination_context) {
		if (_digitsCanvas) {
			destination_context.drawImage (_digitsCanvas, 143, 0, 13, 20, x_pos, y_pos, 13, 20);
		}
	}
	
	function _drawRightArrow (x_pos, y_pos, destination_context) {
		if (_digitsCanvas) {
			destination_context.drawImage (_digitsCanvas, 156, 0, 13, 20, x_pos, y_pos, 13, 20);
		}
	}
	
	function _drawLeftArrow (x_pos, y_pos, destination_context) {
		if (_digitsCanvas) {
			destination_context.drawImage (_digitsCanvas, 169, 0, 13, 20, x_pos, y_pos, 13, 20);
		}
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init () {
		_altitudeCanvas = document.createElement ('canvas');
		_altitudeCanvas.width = kCanvasWidth;
		_altitudeCanvas.height = kCanvasHeight;
		var context = _altitudeCanvas.getContext ('2d');
		context.fillRect (0, 0, kCanvasWidth, kCanvasHeight);
		_altitudeCanvas.ctx = context;
		
		_verticalVelocityCanvas = document.createElement ('canvas');
		_verticalVelocityCanvas.width = kCanvasWidth;
		_verticalVelocityCanvas.height = kCanvasHeight;
		var context = _verticalVelocityCanvas.getContext ('2d');
		context.fillRect (0, 0, kCanvasWidth, kCanvasHeight);
		_verticalVelocityCanvas.ctx = context;
		
		_fuelCanvas = document.createElement ('canvas');
		_fuelCanvas.width = kCanvasWidth;
		_fuelCanvas.height = kCanvasHeight;
		var context = _fuelCanvas.getContext ('2d');
		context.fillRect (0, 0, kCanvasWidth, kCanvasHeight);
		_fuelCanvas.ctx = context;
		
		_forwardVelocityCanvas = document.createElement ('canvas');
		_forwardVelocityCanvas.width = kCanvasWidth;
		_forwardVelocityCanvas.height = kCanvasHeight;
		var context = _forwardVelocityCanvas.getContext ('2d');
		context.fillRect (0, 0, kCanvasWidth, kCanvasHeight);
		_forwardVelocityCanvas.ctx = context;
		
		var digitsImage = new Image ();
		digitsImage.src = 'artwork/digits.png';
		digitsImage.onload = function () {
			_digitsCanvas = document.createElement ('canvas');
			_digitsCanvas.width = digitsImage.width;
			_digitsCanvas.height = digitsImage.height;
			var context = _digitsCanvas.getContext ('2d');
			context.drawImage (digitsImage, 0, 0);
		};
	}
	
	function updateAltitude (altitude) {
		var context = _altitudeCanvas.getContext ('2d');
		_drawDigit (altitude, kCanvasWidth - 13, 0, 3, context);
	}
	
	function updateVerticalVelocity (velocity) {
		var context = _verticalVelocityCanvas.getContext ('2d');
		if (velocity > 0) {
			_drawDigit (velocity|0, kCanvasWidth - 26, 0, 2, context);
			_drawUpArrow (26, 0, context);
		} else if (velocity < 0) {
			_drawDigit (-velocity|0, kCanvasWidth - 26, 0, 2, context);
			_drawDownArrow (26, 0, context);
		} else {
			_drawDigit (0, kCanvasWidth - 26, 0, 3, context);
		}
	}
	
	function updateFuel (fuel) {
		var context = _fuelCanvas.getContext ('2d');
		_drawDigit (fuel, kCanvasWidth - 13, 0, 3, context);
	}
	
	function updateForwardVelocity (velocity) {
		var context = _forwardVelocityCanvas.getContext ('2d');
		if (velocity > 0) {
			_drawDigit (velocity|0, kCanvasWidth - 26, 0, 2, context);
			_drawRightArrow (26, 0, context);
		} else if (velocity < 0) {
			_drawDigit (-velocity|0, kCanvasWidth - 13, 0, 2, context);
			_drawLeftArrow (0, 0, context);
		} else {
			_drawDigit (0, kCanvasWidth - 13, 0, 3, context);
		}
	}
	
	function getAltitudeCanvas () {
		return _altitudeCanvas;
	}
	
	function getVerticalVelocityCanvas () {
		return _verticalVelocityCanvas;
	}
	
	function getFuelCanvas () {
		return _fuelCanvas;
	}
	
	function getForwardVelocityCanvas () {
		return _forwardVelocityCanvas;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonNixies.init ();
	
	return {
		init: init, 
		updateAltitude: updateAltitude, 
		updateVerticalVelocity: updateVerticalVelocity, 
		updateFuel: updateFuel, 
		updateForwardVelocity: updateForwardVelocity, 
		getAltitudeCanvas: getAltitudeCanvas, 
		getVerticalVelocityCanvas: getVerticalVelocityCanvas, 
		getFuelCanvas: getFuelCanvas, 
		getForwardVelocityCanvas: getForwardVelocityCanvas
	};
})();
