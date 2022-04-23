// ==============================================================================================================
// MoonCamera.js
// ==============================================================================================================

/// Downward facing "camera" that helps when landing.
/// TODO: I average the elevation in order to arrive at a fairly stable distance from the ground. 
/// The distance is used to determine how many voxels to display in the camera. It is a hack, for sure.

var MoonCamera = (function () {
	'use strict';

	const kCanvasWidth = 63;
	const kCanvasHeight = 63;
	
	const kCameraScale = 0.002;
	
	var _canvas = null;
	var _pixelBuffer = null;
	var _overlayCanvas = null;
	var _lastAverageElevation = 0;
	
	// ----------------------------------------------------------------------------------------- Public Functions
	// ----------------------------------------------------------------------------------------------------- init
	
	function init () {
		_canvas = document.createElement ('canvas');
		_canvas.width = kCanvasWidth;
		_canvas.height = kCanvasHeight;
		var context = _canvas.getContext ('2d');
		_canvas.ctx = context;
		_pixelBuffer = context.getImageData (0, 0, kCanvasWidth, kCanvasHeight);
		
		var overlayImage = new Image ();
		overlayImage.src = 'artwork/camera_overlay.png';
		overlayImage.onload = function () {
			_overlayCanvas = document.createElement ('canvas');
			_overlayCanvas.width = overlayImage.width;
			_overlayCanvas.height = overlayImage.height;
			var context = _overlayCanvas.getContext ('2d');
			context.drawImage (overlayImage, 0, 0);
		};	
	}
	
	// --------------------------------------------------------------------------------------------------- update
	
	function update (x_pos, y_pos, z_pos, yaw_sin, yaw_cos) {
		var context = _canvas.getContext ('2d');
		var pixels = _pixelBuffer.data;
		var voxel;
		
		if (_lastAverageElevation <= 0) {
			voxel = VoxelProvider.voxelForPosition (x_pos, y_pos);
			_lastAverageElevation = z_pos - voxel[0];
		}
		var scale = _lastAverageElevation * kCameraScale;
		
		var scaled_sin = yaw_sin * scale;
		var scaled_cos = yaw_cos * scale;
		var a_y = y_pos - scaled_cos - scaled_sin;
		var a_x = x_pos + scaled_sin - scaled_cos;
		var b_x = a_x + (scaled_cos * 2);
		var b_y = a_y + (scaled_sin * 2);
		var x_delta = (scaled_sin * -2) / 63.0;
		var y_delta = (scaled_cos * 2) / 63.0;
		
		// Get the elevation for two of the corners of the display.
		voxel = VoxelProvider.voxelForPosition (a_x, a_y);
		var tempElevation = voxel[0]
		voxel = VoxelProvider.voxelForPosition (b_x, b_y);
		tempElevation += voxel[0];
		
		var row;
		for (row = 0; row < 63; row++) {
			var destinationAddress = row * (63 * 4);
			var rowArray = VoxelProvider.voxelColorArray (a_x, a_y, b_x, b_y, 63);
			var count = rowArray.length;
			var col;
			for (col = 0; col < count; col++) {
				pixels[destinationAddress + col] = rowArray[col];
			}
			a_x = a_x + x_delta;
			b_x = b_x + x_delta;
			a_y = a_y + y_delta;
			b_y = b_y + y_delta;
		}
		
		// Get the elevation for the other two of the corners of the display.
		// We will average all four corner elevations, average with the previous last average elevation.
		// This is all to try to mitigate the wild zooming that comes from flying over uneven terrain.
		voxel = VoxelProvider.voxelForPosition (a_x, a_y);
		tempElevation += voxel[0]
		voxel = VoxelProvider.voxelForPosition (b_x, b_y);
		tempElevation += voxel[0];
		_lastAverageElevation = (_lastAverageElevation + (z_pos - (tempElevation / 4))) / 2.0;
		
		context.putImageData (_pixelBuffer, 0, 0);
		
		if (_overlayCanvas) {
			context.drawImage (_overlayCanvas, 0, 0);
		}
	}
	
	// ------------------------------------------------------------------------------------------------ getCanvas
	
	function getCanvas () {
		return _canvas;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonCamera.init ();
	
	return {
		init: init, 
		update: update, 
		getCanvas: getCanvas
	};
})();
