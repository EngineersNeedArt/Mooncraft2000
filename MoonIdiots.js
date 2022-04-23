// ==============================================================================================================
// MoonIdiots.js
// ==============================================================================================================

/// "Idiot" lights. Display simple information in the game: "Fuel Low", etc.

var MoonIdiots = (function () {
	'use strict';
	
	const kCanvasWidth = 48;
	const kCanvasHeight = 20;
	
	const velocity_state = {
		nominal : 0, 
		warn : 1
	}
	
	const alt_state = {
		nominal : 0, 
		warn : 1
	}
	
	const fuel_state = {
		nominal : 0, 
		warn : 1, 
		critical : 2
	}
	
	var _velocityCanvas = null;
	var _velocityOnCanvas = null;
	var _velocityOffCanvas = null;
	var _velocityWarnLevel = 100;
	var _velocityState = velocity_state.nominal;
	var _velocityDirty = false;
	
	var _altCanvas = null;
	var _altOnCanvas = null;
	var _altOffCanvas = null;
	var _altWarnLevel = 100;
	var _altState = alt_state.nominal;
	var _altDirty = false;
	
	var _fuelCanvas = null;
	var _fuelOnCanvas = null;
	var _fuelOffCanvas = null;
	var _fuelWarnLevel = 150;
	var _fuelCriticalLevel = 50;
	var _fuelState = fuel_state.nominal;
	var _fuelDirty = false;
	
	var _downCanvas = null;
	var _downOnCanvas = null;
	var _downOffCanvas = null;
	var _downState = true;
	var _downDirty = false;
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init (warnVelocity, warnAltitude, warnFuel, criticalFuel) {
		_velocityWarnLevel = warnVelocity;
		_altWarnLevel = warnAltitude;
		_fuelWarnLevel = warnFuel;
		_fuelCriticalLevel = criticalFuel;
		
		_velocityCanvas = document.createElement ('canvas');
		_velocityCanvas.width = kCanvasWidth;
		_velocityCanvas.height = kCanvasHeight;
		var context = _velocityCanvas.getContext ('2d');
		context.fillRect (0, 0, kCanvasWidth, kCanvasHeight);
		_velocityCanvas.ctx = context;
		
		var velocityOnImage = new Image ();
		velocityOnImage.src = 'artwork/vert_idiot.png';
		velocityOnImage.onload = function () {
			_velocityOnCanvas = document.createElement ('canvas');
			_velocityOnCanvas.width = velocityOnImage.width;
			_velocityOnCanvas.height = velocityOnImage.height;
			var context = _velocityOnCanvas.getContext ('2d');
			context.drawImage (velocityOnImage, 0, 0);
		};

		var velocityOffImage = new Image ();
		velocityOffImage.src = 'artwork/vert_idiot_off.png';
		velocityOffImage.onload = function () {
			_velocityOffCanvas = document.createElement ('canvas');
			_velocityOffCanvas.width = velocityOffImage.width;
			_velocityOffCanvas.height = velocityOffImage.height;
			var context = _velocityOffCanvas.getContext ('2d');
			context.drawImage (velocityOffImage, 0, 0);
			context = _velocityCanvas.getContext ('2d');
			context.drawImage (_velocityOffCanvas, 0, 0);
		};
		
		_altCanvas = document.createElement ('canvas');
		_altCanvas.width = kCanvasWidth;
		_altCanvas.height = kCanvasHeight;
		var context = _altCanvas.getContext ('2d');
		context.fillRect (0, 0, kCanvasWidth, kCanvasHeight);
		_altCanvas.ctx = context;
		
		var altOnImage = new Image ();
		altOnImage.src = 'artwork/alt_idiot.png';
		altOnImage.onload = function () {
			_altOnCanvas = document.createElement ('canvas');
			_altOnCanvas.width = altOnImage.width;
			_altOnCanvas.height = altOnImage.height;
			var context = _altOnCanvas.getContext ('2d');
			context.drawImage (altOnImage, 0, 0);
		};

		var altOffImage = new Image ();
		altOffImage.src = 'artwork/alt_idiot_off.png';
		altOffImage.onload = function () {
			_altOffCanvas = document.createElement ('canvas');
			_altOffCanvas.width = altOffImage.width;
			_altOffCanvas.height = altOffImage.height;
			var context = _altOffCanvas.getContext ('2d');
			context.drawImage (altOffImage, 0, 0);
			context = _altCanvas.getContext ('2d');
			context.drawImage (_altOffCanvas, 0, 0);
		};
		
		_fuelCanvas = document.createElement ('canvas');
		_fuelCanvas.width = kCanvasWidth;
		_fuelCanvas.height = kCanvasHeight;
		var context = _fuelCanvas.getContext ('2d');
		context.fillRect (0, 0, kCanvasWidth, kCanvasHeight);
		_fuelCanvas.ctx = context;
		
		var fuelOnImage = new Image ();
		fuelOnImage.src = 'artwork/fuel_idiot.png';
		fuelOnImage.onload = function () {
			_fuelOnCanvas = document.createElement ('canvas');
			_fuelOnCanvas.width = fuelOnImage.width;
			_fuelOnCanvas.height = fuelOnImage.height;
			var context = _fuelOnCanvas.getContext ('2d');
			context.drawImage (fuelOnImage, 0, 0);
		};

		var fuelOffImage = new Image ();
		fuelOffImage.src = 'artwork/fuel_idiot_off.png';
		fuelOffImage.onload = function () {
			_fuelOffCanvas = document.createElement ('canvas');
			_fuelOffCanvas.width = fuelOffImage.width;
			_fuelOffCanvas.height = fuelOffImage.height;
			var context = _fuelOffCanvas.getContext ('2d');
			context.drawImage (fuelOffImage, 0, 0);
			context = _fuelCanvas.getContext ('2d');
			context.drawImage (_fuelOffCanvas, 0, 0);
		};
		
		_downCanvas = document.createElement ('canvas');
		_downCanvas.width = kCanvasWidth;
		_downCanvas.height = kCanvasHeight;
		var context = _downCanvas.getContext ('2d');
		context.fillRect (0, 0, kCanvasWidth, kCanvasHeight);
		_downCanvas.ctx = context;
		
		var downOnImage = new Image ();
		downOnImage.src = 'artwork/down_idiot.png';
		downOnImage.onload = function () {
			_downOnCanvas = document.createElement ('canvas');
			_downOnCanvas.width = downOnImage.width;
			_downOnCanvas.height = downOnImage.height;
			var context = _downOnCanvas.getContext ('2d');
			context.drawImage (downOnImage, 0, 0);
		};

		var downOffImage = new Image ();
		downOffImage.src = 'artwork/down_idiot_off.png';
		downOffImage.onload = function () {
			_downOffCanvas = document.createElement ('canvas');
			_downOffCanvas.width = downOffImage.width;
			_downOffCanvas.height = downOffImage.height;
			var context = _downOffCanvas.getContext ('2d');
			context.drawImage (downOffImage, 0, 0);
			context = _downCanvas.getContext ('2d');
			context.drawImage (_downOffCanvas, 0, 0);
		};
		
		markAllDirty ()
	}
	
	function updateVelocity (velocity) {
		var newVelocityState = velocity_state.nominal;
		if (velocity <= _velocityWarnLevel) {
			newVelocityState = velocity_state.warn;
		}
		
		if (newVelocityState != _velocityState) {
			if ((newVelocityState === velocity_state.warn) && (_velocityState === velocity_state.nominal)) {
				MoonSounds.playWarn1 ();
			}
			
			_velocityState = newVelocityState;
			
			var context = _velocityCanvas.getContext ('2d');
			if (_velocityState === velocity_state.nominal) {
				context.drawImage (_velocityOffCanvas, 0, 0);
			} else {
				context.drawImage (_velocityOnCanvas, 0, 0);
			}
			
			_velocityDirty = true;
		}
	}
	
	function updateAltitude (altitude) {
		var newAltState = alt_state.nominal;
		if (altitude <= _altWarnLevel) {
			newAltState = alt_state.warn;
		}
		
		if (newAltState != _altState) {
			if ((newAltState === alt_state.warn) && (_altState === alt_state.nominal)) {
				MoonSounds.playWarn1 ();
			}
			
			_altState = newAltState;
			
			var context = _altCanvas.getContext ('2d');
			if (_altState === alt_state.nominal) {
				context.drawImage (_altOffCanvas, 0, 0);
			} else {
				context.drawImage (_altOnCanvas, 0, 0);
			}
			
			_altDirty = true;
		}
	}
	
	function updateFuel (fuelLevel) {
		var newFuelState = fuel_state.nominal;
		if (fuelLevel <= _fuelCriticalLevel) {
			newFuelState = fuel_state.critical;
		} else if (fuelLevel <= _fuelWarnLevel) {
			newFuelState = fuel_state.warn;			
		}

		if (newFuelState != _fuelState) {
			if ((newFuelState === fuel_state.critical) && (_fuelState != fuel_state.critical)) {
				MoonSounds.playWarn0 ();
			} else if ((newFuelState === fuel_state.warn) && (_fuelState === fuel_state.nominal)) {
				MoonSounds.playWarn0 ();
			}
			
			_fuelState = newFuelState;

			var context = _fuelCanvas.getContext ('2d');
			if (_fuelState === fuel_state.nominal) {
				context.drawImage (_fuelOffCanvas, 0, 0);
			} else {
				context.drawImage (_fuelOnCanvas, 0, 0);
			}
			
			_fuelDirty = true;
		}
	}
	
	function updateDown (isDown) {
		if (isDown != _downState) {
			if (isDown) {
				MoonSounds.playBeep ();
			}
			
			_downState = isDown;
			
			var context = _downCanvas.getContext ('2d');
			if (_downState) {
				context.drawImage (_downOnCanvas, 0, 0);
			} else {
				context.drawImage (_downOffCanvas, 0, 0);
			}
			
			_downDirty = true;
		}
	}
	
	function markAllDirty () {
		_velocityDirty = true;
		_altDirty = true;
		_fuelDirty = true;
		_downDirty = true;
	}
	
	function drawVelocity (destContext, xPos, yPos) {
		if (_velocityDirty) {
			destContext.drawImage (_velocityCanvas, xPos, yPos);
			_velocityDirty = false;
		}
	}
	
	function drawAltitude (destContext, xPos, yPos) {
		if (_altDirty) {
			destContext.drawImage (_altCanvas, xPos, yPos);
			_altDirty = false;
		}
	}
	
	function drawFuel (destContext, xPos, yPos) {
		if (_fuelDirty) {
			destContext.drawImage (_fuelCanvas, xPos, yPos);
			_fuelDirty = false;
		}
	}
	
	function drawDown (destContext, xPos, yPos) {
		if (_downDirty) {
			destContext.drawImage (_downCanvas, xPos, yPos);
			_downDirty = false;
		}
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonIdiots.init ();
	
	return {
		init: init, 
		updateVelocity: updateVelocity, 
		updateAltitude: updateAltitude, 
		updateFuel: updateFuel, 
		updateDown: updateDown, 
		markAllDirty: markAllDirty, 
		drawVelocity: drawVelocity, 
		drawAltitude: drawAltitude, 
		drawFuel: drawFuel, 
		drawDown: drawDown
	};
})();
