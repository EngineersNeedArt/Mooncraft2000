// ==============================================================================================================
// VoxelSky.js
// ==============================================================================================================

var VoxelSky = (function () {
	'use strict';
	
	var _canvas;
	var _destinationWidth;
	var _hPadding;
	var _vPadding;
	var _fullCircleWidth;
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init (imagePath, destinationWidth, fov, hPadding, vPadding) {
		_destinationWidth = destinationWidth;
		_hPadding = hPadding;
		_vPadding = vPadding;
		_fullCircleWidth = Math.ceil (((Math.PI * 2) / fov) * destinationWidth);
		
		var skyImage = new Image ();
		skyImage.src = imagePath;
		skyImage.onload = function () {
			_canvas = document.createElement ('canvas');
			_canvas.width = _fullCircleWidth + _destinationWidth + (_hPadding * 2);
			_canvas.height = skyImage.height;
			var context = _canvas.getContext ('2d');
			context.drawImage (skyImage, _hPadding - skyImage.width, 0, _fullCircleWidth, skyImage.height);
			context.drawImage (skyImage, _hPadding, 0, _fullCircleWidth, skyImage.height);
			context.drawImage (skyImage, _fullCircleWidth + _hPadding, 0, _fullCircleWidth, skyImage.height);
		};
	}
	
	function drawInContext (destContext, yaw, yOrigin, vOffset) {
		if (!_canvas) {
			return;
		}
		
		var sourceX = yaw / (Math.PI * 2) * _fullCircleWidth;
		var sourceY = vOffset + _vPadding;
		var height = _canvas.height - sourceY|0;
		destContext.drawImage (_canvas, sourceX|0, sourceY, _destinationWidth + (_hPadding * 2), height, 0, yOrigin, _destinationWidth + (_hPadding * 2), height);
	}
	
	function getHorizontalOffsetForYaw (yaw) {
		return Math.floor (yaw / (Math.PI * 2) * _fullCircleWidth) + _hPadding;
	}
	
	function getCanvas () {
		return _canvas;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: VoxelSky.init ();
	
	return {
		init: init, 
		drawInContext: drawInContext, 
		getHorizontalOffsetForYaw: getHorizontalOffsetForYaw, 
		getCanvas: getCanvas
	};
})();
