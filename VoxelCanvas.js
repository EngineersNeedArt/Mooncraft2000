// ==============================================================================================================
// VoxelCanvas.js
// ==============================================================================================================


/// The main render loops are here to display the voxels to an HTML5 Canvas.

var VoxelCanvas = (function () {
	'use strict';
	
	const kFOV = 1.396; 				// 80 degrees (I think 90 was too distorted, 45 too narrow?).
	const kShearTableSize = 51;	    	// Should be an odd number (so zero is in the center).
	
	var _canvasWidth;
	var _canvasHeight;
	var _canvas = null;
	var _canvasBuffer = null;
	var _maximumRoll;
	var _screenDistance;
	var _near;
	var _mid;
	var _far;
	
	var _defaultViewPitch = 0;
	var _viewPitch = 0;
	var _viewRoll = 0;
	var _rollIndex;
	var _shearTables = null;
	
	var _fogBegins;	// Fog.
	var _fogLength;
	
	var _enableFog = true;
	var _pixelDouble = true;
	var _enableInterpolation = false;
	var _abCompare = true;
	
	// ---------------------------------------------------------------------------------------- Private Functions
	
	function _computeRollIndex (roll) {
		var halfRange = Math.floor (kShearTableSize / 2);
		var index = ((roll / _maximumRoll) * halfRange) + halfRange;
		return index|0;
	}
	
	function _initShearTable () {
		_shearTables = new Array ();
		
		var i;
		for (i = 0; i < kShearTableSize; i++) {
			var angleMultiplier = i - Math.floor (kShearTableSize / 2);						// e.g: -50 .. 0 .. 50
			var angle = angleMultiplier * _maximumRoll / Math.floor (kShearTableSize / 2);	// e.g: -0.087 .. 0 .. 0.087
			var shearArray = new Array ();
			var h;
			for (h = 0; h < _canvasWidth; h++) {
				var hDelta = h - (_canvasWidth / 2) + 0.5;
				var shear = Math.tan (angle) * hDelta;
				shearArray.push (shear);
			}
			
			_shearTables.push (shearArray);
		}
	}
	
	/// All inputs expected to be in the range of (0 to 255).
	function _blendBytes (baseByte, blendedByte, blendedWeight) {
		return ((baseByte * (0xFF - blendedWeight) + (blendedByte * blendedWeight)) >>> 8);
	}
	
	function _drawColumn (pixels, columnIndex, posX, posY, posZ, stepX, stepY, stepZ, offsetV) {
		var p;
		var pixelTop = 0;
		var pixelBottom = 0;
		var distZ = 0.0;
		var distance = 0.0;
		var pixelAddress;
		var red, green, blue, alpha;
		var fogFactor = 0;
		var topOfDisplay = false;
		var voxel;
		
		// Near-distance ray-casting loop.
		while (distance < _near) {
			posX += stepX / 4;
			posY += stepY / 4;
			distZ += stepZ / 4;
			distance += 0.25;	// 1/4
			
			if (_enableInterpolation) {
				voxel = VoxelProvider.interpolatedVoxelForPositionA (posX, posY);
			} else {
				voxel = VoxelProvider.voxelForPosition (posX, posY);
			}
			
			// Project/scale top of voxel column to screen.
			pixelTop = ((voxel[0] - posZ) / distZ) + offsetV + _viewPitch;
			
			// Test to see if we will fill the canvas vertically. We are done casting if that is the case.
			if (pixelTop > _canvasHeight) {
				pixelTop = _canvasHeight;
				topOfDisplay = true;
				distance = _far;
			}
			
			if (pixelTop < pixelBottom) {
				continue;
			}
			
			// Get the texture color.
			red = voxel[1];
			green = voxel[2];
			blue = voxel[3];
			
			// Set pixels.
			for (p = pixelBottom; p < pixelTop; p++) {
				pixelAddress = (columnIndex + ((_canvasHeight - 1 - p) * _canvasWidth)) * 4;
				pixels[pixelAddress] = red;
				pixels[pixelAddress + 1] = green;
				pixels[pixelAddress + 2] = blue;
				pixels[pixelAddress + 3] = 0xFF;	// alpha
			}
			
			if (_pixelDouble) {
				for (p = pixelBottom; p < pixelTop; p++) {
					pixelAddress = (columnIndex + 1 + ((_canvasHeight - 1 - p) * _canvasWidth)) * 4;
					pixels[pixelAddress] = red;
					pixels[pixelAddress + 1] = green;
					pixels[pixelAddress + 2] = blue;
					pixels[pixelAddress + 3] = 0xFF;	// alpha
				}
			}
			
			// Keep track of last pixel.
			if (pixelTop > pixelBottom) {
				pixelBottom = pixelTop|0;
			}
		}
		
		// Some debugging code — when commented in shows the demarcation line between near/mid/far.
		// var enteredLoop = true;
		
		// Mid-distance ray-casting loop.
		while (distance < _mid) {
			posX += stepX;
			posY += stepY;
			distZ += stepZ;
			distance += 1.0;
			
			voxel = VoxelProvider.voxelForPosition (posX, posY);
			
			// Project/scale top of voxel column to screen.
			pixelTop = ((voxel[0] - posZ) / distZ) + offsetV + _viewPitch;
			
			// Test to see if we will fill the canvas vertically. We are done casting if that is the case.
			if (pixelTop > _canvasHeight) {
				pixelTop = _canvasHeight;
				topOfDisplay = true;
				distance = _far;
			}
			
			if (pixelTop < pixelBottom) {
				continue;
			}
			
			// Get the texture color.
			red = voxel[1];
			green = voxel[2];
			blue = voxel[3];
			
			// Some debugging code — when commented in shows the demarcation line between near/mid/far.
			// if (enteredLoop) {
			// 	enteredLoop = false;
			// 	red = 0;
			// 	green = 0xFF;
			// 	blue = 0;
			// }
			
			// Set pixels.
			for (p = pixelBottom; p < pixelTop; p++) {
				pixelAddress = (columnIndex + ((_canvasHeight - 1 - p) * _canvasWidth)) * 4;
				pixels[pixelAddress] = red;
				pixels[pixelAddress + 1] = green;
				pixels[pixelAddress + 2] = blue;
				pixels[pixelAddress + 3] = 0xFF;	// alpha
			}
			
			if (_pixelDouble) {
				for (p = pixelBottom; p < pixelTop; p++) {
					pixelAddress = (columnIndex + 1 + ((_canvasHeight - 1 - p) * _canvasWidth)) * 4;
					pixels[pixelAddress] = red;
					pixels[pixelAddress + 1] = green;
					pixels[pixelAddress + 2] = blue;
					pixels[pixelAddress + 3] = 0xFF;	// alpha
				}
			}
			
			// Keep track of last pixel.
			if (pixelTop > pixelBottom) {
				pixelBottom = pixelTop|0;
			}
		}
		
		// enteredLoop = true;
		
		// Far-distance ray-casting loop.
		while (distance < _far) {
			posX += stepX * 4;
			posY += stepY * 4;
			distZ += stepZ * 4;
			distance += 4.0;
			
			voxel = VoxelProvider.voxel4By4ForPosition (posX, posY);
			
			// Project/scale top of voxel column to screen.
			pixelTop = ((voxel[0] - posZ) / distZ) + offsetV + _viewPitch;
			
			// Test to see if we will fill the canvas vertically. We are done casting if that is the case.
			if (pixelTop > _canvasHeight) {
				pixelTop = _canvasHeight;
				topOfDisplay = true;
				distance = _far;
			}
			
			if (pixelTop < pixelBottom) {
				continue;
			}
			
			// Get the texture color.
			red = voxel[1];
			green = voxel[2];
			blue = voxel[3];
			alpha = 0xFF;
			
			// Some debugging code — when commented in shows the demarcation line between near/mid/far.
			// if (enteredLoop) {
			// 	enteredLoop = false;
			// 	red = 0xFF;
			// 	green = 0;
			// 	blue = 0;
			// }
			
			if ((_enableFog) && (distance > _fogBegins)) {
				fogFactor = (((distance - _fogBegins) * _fogLength) / 255)|0;
				if (fogFactor > 255) {
					break;
				} else {
					alpha = _blendBytes (0xFF, 0, fogFactor);
				}
			}
			
			// Set pixels.
			for (p = pixelBottom; p < pixelTop; p++) {
				pixelAddress = (columnIndex + ((_canvasHeight - 1 - p) * _canvasWidth)) * 4;
				pixels[pixelAddress] = red;
				pixels[pixelAddress + 1] = green;
				pixels[pixelAddress + 2] = blue;
				pixels[pixelAddress + 3] = alpha;
			}
			
			if (_pixelDouble) {
				for (p = pixelBottom; p < pixelTop; p++) {
					pixelAddress = (columnIndex + 1 + ((_canvasHeight - 1 - p) * _canvasWidth)) * 4;
					pixels[pixelAddress] = red;
					pixels[pixelAddress + 1] = green;
					pixels[pixelAddress + 2] = blue;
					pixels[pixelAddress + 3] = alpha;
				}
			}
			
			// Keep track of last pixel.
			if (pixelTop > pixelBottom) {
				pixelBottom = pixelTop|0;
			}
		}
		
		if (!topOfDisplay) {
			// Set pixels.
			for (p = pixelBottom; p < _canvasHeight; p++) {
				pixelAddress = (columnIndex + ((_canvasHeight - 1 - p) * _canvasWidth)) * 4;
				pixels[pixelAddress] = 0;
				pixels[pixelAddress + 1] = 0;
				pixels[pixelAddress + 2] = 0;
				pixels[pixelAddress + 3] = 0;
			}
			
			if (_pixelDouble) {
				for (p = pixelBottom; p < _canvasHeight; p++) {
					pixelAddress = (columnIndex + 1 + ((_canvasHeight - 1 - p) * _canvasWidth)) * 4;
					pixels[pixelAddress] = 0;
					pixels[pixelAddress + 1] = 0;
					pixels[pixelAddress + 2] = 0;
					pixels[pixelAddress + 3] = 0;
				}
			}
		}
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init (width, height, maximumRoll) {
		_canvasWidth = width;
		_canvasHeight = height;
		_maximumRoll = maximumRoll;
		_viewPitch = (_canvasHeight * 0.625)|0;		// Larger constant (must be less than 1.0) moves horizon closer to top of display (was 0.7).
		_defaultViewPitch = _viewPitch;
		_canvas = document.createElement ('canvas');
		_canvas.width = _canvasWidth;
		_canvas.height = _canvasHeight;
		var context = _canvas.getContext ('2d');
		_canvas.ctx = context;
		_canvasBuffer = context.getImageData (0, 0, _canvasWidth, _canvasHeight);
		
		_screenDistance = (_canvasWidth / 2) / Math.tan (kFOV / 2);
		setNearMidFar ((_screenDistance * 0.2)|0, (_screenDistance * 1.5)|0, (_screenDistance * 4.5)|0);
		console.log ("near: " + _near + ", mid: " + _mid + ", far: " + _far);	// BOGUS: TEMP
		_initShearTable ();
		_rollIndex = _computeRollIndex (_viewRoll);
	}
	
	function setFogColor (fogColor) {
		_fogRed = fogColor[0];
		_fogGreen = fogColor[1];
		_fogBlue = fogColor[2];
	}
	
	function render (x_pos, y_pos, z_pos, yaw) {
		VoxelProvider.bogusUpdateDynamicColors ();
		
		var pixels = _canvasBuffer.data;
		var yaw_sin = Math.sin (yaw);
		var yaw_cos = Math.cos (yaw);
		var hDelta, stepX, stepY, stepZ;
		var magnitude;
		var shearArray = _shearTables[_rollIndex];
		
		var step = 1;
		if (_pixelDouble) {
			step = 2;
		}
		var i;
		for (i = 0; i < _canvasWidth; i += step) {
			hDelta = i - (_canvasWidth / 2) + 0.5;
			stepX = (hDelta * yaw_cos) + (_screenDistance * yaw_sin);
			stepY = (hDelta * yaw_sin) - (_screenDistance * yaw_cos);
			magnitude = Math.sqrt ((stepX * stepX) + (stepY * stepY));
			stepX = stepX / magnitude;
			stepY = stepY / magnitude;
			stepZ = _screenDistance / magnitude;
			_drawColumn (pixels, i, x_pos, y_pos, z_pos, stepX, stepY, stepZ, shearArray[i]);
		}
		
		var context = _canvas.getContext ('2d');
		context.putImageData (_canvasBuffer, 0, 0);
	}
	
	function getCanvas () {
		return _canvas;
	}
	
	function getViewPitch () {
		return _viewPitch - _defaultViewPitch;
	}
	
	function setViewPitch (pitch) {
		_viewPitch = _defaultViewPitch + pitch;
	}
	
	function getViewRoll () {
		return _viewRoll;
	}
	
	function setViewRoll (roll) {
		_viewRoll = roll;
		if (_viewRoll < -_maximumRoll) {
			_viewRoll = -_maximumRoll;
		} else if (_viewRoll > _maximumRoll) {
			_viewRoll = _maximumRoll;
		}
		_rollIndex = _computeRollIndex (_viewRoll);
	}
	
	function setNearMidFar (near, mid, far) {
		_near = near;
		_mid = mid;
		_far = far;
		_fogBegins = _mid + ((_far - _mid) * 0.80)|0;
		_fogLength = _far - _fogBegins;
	}
	
	function fogEnabled () {
		return _enableFog;
	}
	
	function setFogEnabled (enable) {
		_enableFog = enable;
	}
	
	function pixelDouble () {
		return _pixelDouble;
	}
	
	function setPixelDouble (doubleIt) {
		_pixelDouble = doubleIt;
	}
	
	function interpolation () {
		return _enableInterpolation;
	}
	
	function setInterpolation (interpolate) {
		_enableInterpolation = interpolate;
	}
	
	function getABCompare () {
		return _abCompare;
	}
	
	function toggleABCompare () {
		_abCompare = !_abCompare;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: VoxelCanvas.init ();
	
	return {
		init: init, 
		setFogColor: setFogColor, 
		render: render, 
		getCanvas: getCanvas, 
		getViewPitch: getViewPitch, 
		setViewPitch: setViewPitch, 
		getViewRoll: getViewRoll, 
		setViewRoll: setViewRoll, 
		setNearMidFar: setNearMidFar, 
		fogEnabled: fogEnabled, 
		setFogEnabled: setFogEnabled, 
		pixelDouble: pixelDouble, 
		setPixelDouble: setPixelDouble, 
		interpolation: interpolation, 
		setInterpolation: setInterpolation, 
		getABCompare: getABCompare,
		toggleABCompare: toggleABCompare
	};
})();
