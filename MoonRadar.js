// ==============================================================================================================
// MoonRadar.js
// ==============================================================================================================

/// Grabs and displays an array of voxel data representing a line of terrain beneath the moon-craft.
/// Like the MoonMap.js, it can be damaged (functionality disabled) and depicts being powered on/off.

var MoonRadar = (function () {
	'use strict';
	
	const kCanvasWidth = 88;
	const kCanvasHeight = 88;
	const kSampleCount = 23;
	const kVerticalOffset = 18;
	const kScale = 320;
	const kPrimaryStrokeColor = "rgb(0,255,0)";
	const kSecondaryStrokeColor = "rgb(0,64,0)";
	const kPowerOnDuration = 120;
	
	var _canvas = null;
	var _overlayCanvas = null;
	
	var _jitterX = 0;
	var _jitterY = 0;
	var _enableRadar = true;
	
	var _powerOn = true;
	var _powerOnValue = 0;
	var _powerOnAlphaArray = null;
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init () {
		_canvas = document.createElement ('canvas');
		_canvas.width = kCanvasWidth;
		_canvas.height = kCanvasHeight;
		var context = _canvas.getContext ('2d');
		_canvas.ctx = context;
		
		var overlayImage = new Image ();
		overlayImage.src = 'artwork/radar_overlay.png';
		overlayImage.onload = function () {
			_overlayCanvas = document.createElement ('canvas');
			_overlayCanvas.width = overlayImage.width;
			_overlayCanvas.height = overlayImage.height;
			var context = _overlayCanvas.getContext ('2d');
			context.drawImage (overlayImage, 0, 0);
		};
		
		_powerOnAlphaArray = new Array (kPowerOnDuration);
		var i;
		for (i = 0; i < kPowerOnDuration; i++) {
			_powerOnAlphaArray[i] = Math.sin ((i * Math.PI / 2) / kPowerOnDuration);
		}
	}
	
	function update (x_pos, y_pos, z_pos, yaw_sin, yaw_cos) {
		var heightArray;
		if (_enableRadar) {
			// Fetch elevation samples in front of and behind us.
			var deltaX = yaw_sin * (kCanvasWidth / 2.0);
			var deltaY = yaw_cos * (kCanvasWidth / 2.0);
			heightArray = VoxelProvider.voxelElevationArray (x_pos - deltaX, y_pos + deltaY, x_pos + deltaX, y_pos - deltaY, kSampleCount);
		} else {
			heightArray = new Array (kSampleCount).fill (0);
			z_pos = 0;
		}
		
		// Paint canvas black.
		var context = _canvas.getContext ('2d');
		context.fillRect (0, 0, kCanvasWidth, kCanvasHeight);
		context.save ();
		
		context.translate (_jitterX, _jitterY + kVerticalOffset);
		
		// Fade in/out display based on power on/off state.
		if (_powerOn) {
			if (_powerOnValue < kPowerOnDuration) {
				context.globalAlpha = _powerOnAlphaArray [_powerOnValue];
				_powerOnValue = _powerOnValue + 1;
			}				
		} else {
			if (_powerOnValue > 0) {
				context.globalAlpha = _powerOnAlphaArray [_powerOnValue];
				_powerOnValue = _powerOnValue - 1;
			}							
		}
		
		// Trying to achieve that oscilliscope-look.
		// Draw terrain with a fat (but faint) line.
		var step = kCanvasWidth / (kSampleCount - 1);
		context.beginPath ();
		context.moveTo (0, (z_pos - heightArray[0]) / kScale);
		var i;
		for (i = 1; i < kSampleCount; i++) {
			context.lineTo (i * step,  (z_pos - heightArray[i]) / kScale);
		}
		context.strokeStyle = kSecondaryStrokeColor;	
		context.lineWidth = 2;
		context.stroke ();
		
		// Draw terrain with a thin (brighter) line.
		context.strokeStyle = kPrimaryStrokeColor;
		context.translate (0.0, 0.5);
		context.lineWidth = 1;
		context.stroke ();
		context.restore ();
		
		if (_overlayCanvas) {
			context.drawImage (_overlayCanvas, 0, 0);
		}
	}
	
	function getCanvas () {
		return _canvas;
	}
	
	function setOnState (isOn) {
		_powerOn = isOn;
	}
	
	function setEnableRadar (enable) {
		_enableRadar = enable;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonRadar.init ();
	
	return {
		init: init, 
		update: update, 
		getCanvas: getCanvas, 
		setOnState: setOnState, 
		setEnableRadar: setEnableRadar
	};
})();
