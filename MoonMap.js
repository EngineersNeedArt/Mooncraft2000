// ==============================================================================================================
// MoonMap.js
// ==============================================================================================================

/// Handles display of the moon map on the user dashboard/console.

var MoonMap = (function () {
	'use strict';
	
	const kCanvasWidth = 145;
	const kCanvasHeight = 145;
	const kDisplayWidth = 117;
	const kDisplayHeight = 117;
	const kDisplayOffsetX = 14;
	const kDisplayOffsetY = 14;
	const kCraterStrokeColor = "rgb(0,136,0)";
	const kCraterLabelColor = "rgb(0,187,0)";
	const kBaseStrokeColor = "rgb(0,187,0)";
	const kBaseLabelColor = "rgb(0,255,0)";
	const kHeadingStrokeColor = "rgb(0,153,0)";
	const kDisabledHeadingStrokeColor = "rgb(0,51,0)";
	const kLocationLabelColor = "rgb(0,255,0)";
	const kDisabledLocationLabelColor = "rgb(0,153,0)";
	const kPowerOnDuration = 120;
	
	var _canvas = null;
	var _overlayCanvas = null;
	var _scale = 0.1;
		
	var _jitterX = 0;
	var _jitterY = 0;
	
	var _powerOn = true;
	var _powerOnValue = 0;
	var _powerOnAlphaArray = null;
	
	var _enableCraters = true;			// These parameters allow some functionality of the map to be  
	var _enableBases = true;			// turned off/on to reflect damage/repair of display.
	var _enableHeading = true;
	var _enableLocation = true;
	
	// ---------------------------------------------------------------------------------------- Private Functions
	// ---------------------------------------------------------------------------------------------- _strokeOval
	
	function _strokeOval (context, x, y, rw, rh) {
		context.save ();
		let scale_v = rh / rw;
		context.scale (1, scale_v);
		context.beginPath ();
		try {
			context.arc (x, y / scale_v, rw, 0, 2 * Math.PI);
		} catch (e) {
			console.log (e);
		}
		context.restore ();
		context.stroke ();
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init () {
		_canvas = document.createElement ('canvas');
		_canvas.width = kCanvasWidth;
		_canvas.height = kCanvasHeight;
		var context = _canvas.getContext ('2d');
		_canvas.ctx = context;
		
		var bezelImage = new Image ();
		bezelImage.src = 'artwork/map_bezel.png';
		bezelImage.onload = function () {
			var context = _canvas.getContext ('2d');
			context.drawImage (bezelImage, 0, 0);
		};
		
		var overlayImage = new Image ();
		overlayImage.src = 'artwork/map_overlay.png';
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
	
	function setScale (scale) {
		_scale = scale;
	}
	
	// --------------------------------------------------------------------------------------------------- update
	
	function update (x_pos, y_pos, yaw_sin, yaw_cos) {
		// Get 2D context, clear.
		var context = _canvas.getContext ('2d');
		
		// Save context state, fill black, clip to rect, translate so center of map is origin.
		context.save ();	
		context.rect (kDisplayOffsetX, kDisplayOffsetY, kDisplayWidth, kDisplayHeight);
		context.fill ();
		context.clip ();
		context.translate (_jitterX + (kCanvasWidth / 2.0), _jitterY + (kCanvasHeight / 2.0));
		context.font = "9px Arial";
		
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
		
		// Compute the bounds of the map.
		var padding = 10 / _scale;
		var halfScaledWidth = (kDisplayWidth / _scale) / 2.0;
		var halfScaledHeight = (kDisplayHeight / _scale) / 2.0;
		var map_l = x_pos - halfScaledWidth - padding;
		var map_r = x_pos + halfScaledWidth + padding;
		var map_t = y_pos - halfScaledHeight - padding;
		var map_b = y_pos + halfScaledHeight + padding;
		
		// Draw craters.
		var craterArray = LunarFeatures.craterArray ();	// BOGUS: maybe we need: LunarFeatures.cratersInRect()
		if ((_enableCraters) && (craterArray)) {
			context.strokeStyle = kCraterStrokeColor;
			context.fillStyle = kCraterLabelColor;
			context.textAlign = "center";
			
			var reportedCrater = false;
			var i;
			var count = craterArray.length;
			for (i = 0; i < count; i++) {
				var one_crater = craterArray[i];
				if (!(one_crater.loc_l > map_r || one_crater.loc_r < map_l || one_crater.loc_t > map_b || one_crater.loc_b < map_t)) {
					// Stroke crater oval.
					var crater_x = (one_crater.loc_r + one_crater.loc_l) / 2.0;
					var crater_y = kDisplayOffsetY + ((one_crater.loc_t + one_crater.loc_b) / 2.0);
					var crater_rw = (one_crater.loc_r - one_crater.loc_l) / 2.0;
					var crater_rh = (one_crater.loc_b - one_crater.loc_t) / 2.0;
					_strokeOval (context, ((crater_x - x_pos) * _scale), ((crater_y - y_pos) * _scale), 
							crater_rw * _scale, crater_rh * _scale);
					
					// Label crater.
					if (one_crater.display_name) {
						context.fillText (one_crater.display_name, ((crater_x - x_pos) * _scale), ((crater_y - y_pos) * _scale + 2));
					}
					
					// Is the crater directly below the player?
					if ((!reportedCrater) && (one_crater.loc_l < x_pos) && (one_crater.loc_r > x_pos) && (one_crater.loc_t < y_pos) && (one_crater.loc_b > y_pos)) {
						reportedCrater = true;
						Mooncraft.setOverCrater (one_crater);
					}
				}
			}
		}
		
		// Draw bases.
		var baseArray = LunarFeatures.baseArray ();	// BOGUS: maybe we need: LunarFeatures.basesInRect()
		if ((_enableBases) && (baseArray)) {
			context.strokeStyle = kBaseStrokeColor;
			context.fillStyle = kBaseLabelColor;
			context.textAlign = "left";
			
			var i;
			var count = baseArray.length;
			for (i = 0; i < count; i++) {
				var one_base = baseArray[i];
				if (!(one_base.loc_x > map_r || one_base.loc_x < map_l || one_base.loc_y > map_b || one_base.loc_y < map_t)) {
					var localX = (one_base.loc_x - x_pos) * _scale;
					var localY = (one_base.loc_y - y_pos) * _scale;
					context.beginPath ();
					context.moveTo (localX, localY - 8);
					context.lineTo (localX, localY + 8);
					context.stroke ();
					context.beginPath ();
					context.moveTo (localX - 8, localY);
					context.lineTo (localX + 8, localY);
					context.stroke ();
					
					// Label base.
					if (one_base.display_name) {
						// BOGUS: text renders to pixel boundaries independent of the context transform. This causes 
						// the text to advance out of sync with the crater ovals and base crosses. One could instead 
						// render the text to an offscreen canvas and drawImage() from that offscreen to the main 
						// canvas to get around this feature.
						context.fillText (one_base.display_name, localX + 2, localY - 3);
					}
				}
			}
		}
		
		// Draw heading line.
		context.lineWidth = 2;
		context.beginPath ();
		if (_enableHeading) {
			context.strokeStyle = kHeadingStrokeColor;
			context.moveTo (yaw_sin * 20, yaw_cos * -20);
			context.lineTo (yaw_sin * 60, yaw_cos * -60);
		} else {
			context.strokeStyle = kDisabledHeadingStrokeColor;
			context.moveTo (0, -20);
			context.lineTo (0, -60);
		}
		context.stroke ();
		
		// Draw x/y location.
		context.textAlign = "left";
		if (_enableLocation) {
			context.fillStyle = kLocationLabelColor;
			context.fillText (Math.floor (x_pos), -59, kDisplayOffsetY + 34);
			context.fillText (Math.floor (y_pos), -59, kDisplayOffsetY + 44);
		} else {
			context.fillStyle = kDisabledLocationLabelColor;
			context.fillText ("err", -59, kDisplayOffsetY + 36);
			context.fillText ("err", -59, kDisplayOffsetY + 46);
		}
		
		context.restore ();
		
		if (_overlayCanvas) {
			context.drawImage (_overlayCanvas, kDisplayOffsetX, kDisplayOffsetY);
		}
	}
	
	function getCanvas () {
		return _canvas;
	}
	
	function setOnState (isOn) {
		_powerOn = isOn;
	}
	
	function setEnableCraters (enable) {
		_enableCraters = enable;
	}
	
	function setEnableBases (enable) {
		_enableBases = enable;
	}
	
	function setEnableHeading (enable) {
		_enableHeading = enable;
	}
	
	function setEnableLocation (enable) {
		_enableLocation = enable;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonMap.init ();
	
	return {
		init: init, 
		setScale: setScale, 
		update: update, 
		getCanvas: getCanvas, 
		setOnState: setOnState, 
		setEnableCraters: setEnableCraters, 
		setEnableBases: setEnableBases, 
		setEnableHeading: setEnableHeading, 
		setEnableLocation: setEnableLocation
	};
})();
