// ==============================================================================================================
// Mooncraft.js
// ==============================================================================================================

// TODO: dynamic (dis/en)abling of render controls to target 60 FPS.
// TODO: display (and control to toggle) Latitude vs. Longitude in MoonMap?

var Mooncraft = (function () {
	'use strict';
	
	const kFOV = 1.396; 				// 80 degrees (I think 90 was too distorted, 45 too narrow?).
	const kMaximumPitch = 5;
	const kMaximumRoll = 0.087;			// 5 degrees.
	
	const game_state = {
		loading: 0, 
		flying : 1, 
		debriefing : 2, 
		chillin: 3
	}
	
	const kRankDescriptionText = [
		"Apprentice, Level 0", 
		"Apprentice, Level 1", 
		"Apprentice, Level 2", 
		"Apprentice, Level 3", 
		"Apprentice, Level 4", 
		"Journeyman, Level 0", 
		"Journeyman, Level 1", 
		"Journeyman, Level 2", 
		"Journeyman, Level 3", 
		"Journeyman, Level 4", 
		"Master"
	];
	
	var _loadAttempts = 0;
	
	var _alertCallback = null;
	
	var _gameState;
	
	var _destinationCanvas = null;
	var _destinationWidth;
	var _destinationHeight;
	var _voxelCanvasWidth;
	var _voxelCanvasHeight;
	var _rollHorizontalPadding = 0;
	var _rollVerticalPadding = 0;
	var _consoleOverlayMiddleCanvas = null;
	
	var _overCrater = null;
	
	var _enableRoll = true;
	var _longRange = true;
	var _displayFPS = true;
	
	var _initialPlayerX = 0;
	var _initialPlayerY = 0;
	var _initialBaseLoaded = false;

	// ---------------------------------------------------------------------------------------- Private Functions
	
	function _calculatePaddingForRoll (roll) {
		var diagonalLength = Math.sqrt (((_destinationWidth / 2) * (_destinationWidth / 2)) + ((_destinationHeight / 2) * (_destinationHeight / 2)));
		
		var existingAngle1 = Math.atan (_destinationHeight / _destinationWidth);
		var newAngle1 = existingAngle1 + roll;
		var newHeight1 = Math.abs ((Math.sin (newAngle1) * diagonalLength * 2));
		var newWidth1 = Math.abs ((Math.cos (newAngle1) * diagonalLength * 2));
		
		var existingAngle2 = -existingAngle1;
		var newAngle2 = existingAngle2 + roll;
		var newHeight2 = Math.abs ((Math.sin (newAngle2) * diagonalLength * 2));
		var newWidth2 = Math.abs ((Math.cos (newAngle2) * diagonalLength * 2));
		
		var widest = Math.max (newWidth1, newWidth2);
		var tallest = Math.max (newHeight1, newHeight2);
		
		_rollHorizontalPadding = Math.ceil ((widest - _destinationWidth) / 2);
		_rollVerticalPadding = Math.ceil ((tallest - _destinationHeight) / 2);
	}
	
	function _updateLongRange () {
		if (_longRange) {
			VoxelCanvas.setNearMidFar (60, 450, 1350);
		} else {
			VoxelCanvas.setNearMidFar (0, 225, 800);
		}
	}
	
	function _createVoxelCanvasAndSky () {
		_voxelCanvasWidth = _destinationWidth;
		_voxelCanvasHeight = _destinationHeight;
		
		var maxRoll = 0;
		if (_enableRoll) {
			maxRoll = kMaximumRoll;
		}
		
		VoxelCanvas.init (_voxelCanvasWidth, _voxelCanvasHeight, maxRoll);
		_updateLongRange ();
		
		// Compute extra pixels needed as padding to allow for rolling.
		if (_enableRoll) {
			_calculatePaddingForRoll (kMaximumRoll);
		} else {
			_rollHorizontalPadding = 0;
			_rollVerticalPadding = 0;
		}
		
		VoxelSky.init ('artwork/starbox.png', _destinationWidth, kFOV, _rollHorizontalPadding, _rollVerticalPadding);
	}
	
	function _renderCockpit (destContext) {
		// Get pitch, keep within limits.
		var pitch = VoxelCanvas.getViewPitch ();	// BOGUS: MESSY, GET PITCH FROM A VIEW?
		if (pitch > kMaximumPitch) {
			pitch = kMaximumPitch;
		} else if (pitch < -kMaximumPitch) {
			pitch = -kMaximumPitch;			
		}
		
		var roll = 0;
		if (_enableRoll) {
			// Get roll, keep within limits.
			var roll = MoonFlyingState.roll ();
			if (roll > kMaximumRoll) {
				roll = kMaximumRoll;
			} else if (roll < -kMaximumRoll) {
				roll = -kMaximumRoll;			
			}
			VoxelCanvas.setViewRoll (roll);		// BOGUS: MESSY, SET ROLL TO VIEW, BUT PITCH AND YAW ARE PASSED IN TO THE DRAW METHOD?
		}
		
		// Draw sky.
		destContext.save ();
		destContext.rect (0, 24, _destinationWidth, _destinationHeight);
		destContext.clip ();
		destContext.translate (0, 24 - _rollVerticalPadding);
		destContext.translate (_destinationWidth / 2, _destinationHeight / 2);
		destContext.rotate (-roll);
		destContext.translate (_destinationWidth / -2, _destinationHeight / -2);
		var skyCanvas = VoxelSky.getCanvas ();
		var sourceX = VoxelSky.getHorizontalOffsetForYaw (MoonFlyingState.yaw ()) - _rollHorizontalPadding;
		var sourceY = kMaximumPitch + pitch;
		var width = _destinationWidth + (_rollHorizontalPadding * 2);
		var height = _destinationHeight + (_rollVerticalPadding * 2);
		if ((height + sourceY) > skyCanvas.height) {
			height = skyCanvas.height - sourceY;
		}
		destContext.drawImage (skyCanvas, sourceX, sourceY, width, height, -_rollHorizontalPadding, -_rollVerticalPadding, width, height);
		destContext.rect (0, 0, destContext.width, destContext.height);
		destContext.clip ();
		destContext.restore ();
		
		// Draw terrain.
		destContext.drawImage (VoxelCanvas.getCanvas(), 0, 24);			
		
		destContext.drawImage (_consoleOverlayMiddleCanvas, 0, 220);
		destContext.drawImage (MoonCompass.getCanvas (), 183, 3);
		destContext.drawImage (MoonMap.getCanvas (), 0, 255);
		destContext.drawImage (MoonRadar.getCanvas (), 212, 234);
		destContext.drawImage (MoonCamera.getCanvas (), 224, 330);
		destContext.drawImage (MoonNixies.getVerticalVelocityCanvas (), 162, 330);
		destContext.drawImage (MoonNixies.getAltitudeCanvas (), 162, 366);
		destContext.drawImage (MoonNixies.getFuelCanvas (), 311, 330);
		destContext.drawImage (MoonNixies.getForwardVelocityCanvas (), 311, 366);
		destContext.drawImage (MoonMonitor.getCanvas (), 382, 269);
		MoonIdiots.drawVelocity (destContext, 157, 282);
		MoonIdiots.drawAltitude (destContext, 157, 302);
		MoonIdiots.drawFuel (destContext, 307, 282);
		MoonIdiots.drawDown (destContext, 307, 302);
	}
	
	function _drawFPS (context, frameTime, fps) {
		context.font = "9px Arial";
		context.fillStyle = "#00BB00";
		context.textAlign = "right";
		context.fillText (frameTime|0 + 'ms', 126, 376);
		var settings = "";
		if (VoxelCanvas.pixelDouble ()) {
			settings += "P";
		} else {
			settings += "p";
		}
		if (VoxelCanvas.fogEnabled ()) {
			settings += "F";
		} else {
			settings += "f";
		}
		if (VoxelCanvas.interpolation ()) {
			settings += "I";
		} else {
			settings += "i";
		}
		if (_enableRoll) {
			settings += "R";
		} else {
			settings += "r";
		}
		if (_longRange) {
			settings += "L";
		} else {
			settings += "l";
		}
		context.fillText (settings + " " + fps, 126, 386);
	}
	
	function _okayRescueNearestBaseHandler () {
		MoonFlyingState.setFuelPercentage (100);
		MoonFlyingState.sendToNearestBase ();
		_gameState = game_state.flying;
	}
	
	function _okayRescuePreviousBaseHandler () {
		MoonFlyingState.setFuelPercentage (100);
		MoonFlyingState.returnToPreviousBase ();
		_gameState = game_state.flying;
	}
	
	function _cancelRescueHandler () {
		_gameState = game_state.flying;
	}
	
	function _gameLoop () {
		var fps = FPS.fps ();
		var startTime = FPS.startFrame ();
		
		switch (_gameState) {
			case game_state.loading:
			MoonFlyingState.handleGameState (startTime, fps);
			break;
			
			case game_state.flying:
			if (MoonFlyingState.handleGameState (startTime, fps)) {
				if (MoonFlyingState.isLanded ()) {
					MoonSounds.stopThrust ();
					MoonSounds.stopAttitude ();
					var baseLanded = MoonFlyingState.baseLandedOn ()
					if (baseLanded) {
						_gameState = game_state.debriefing;
						MoonDebriefState.beginDebriefState (startTime, false, baseLanded);
						MoonIdiots.markAllDirty ();
					} else {
						// There's an off-chance that the tile for the nearest base has not loaded and therefore we do not know the elevation 
						// (therefore the z-position) of the player to be sent there. Fall back to returning them to the previous base.
						var basePlusDistance = MoonFlyingState.nearestBaseAndDistance ();
						var voxel = VoxelProvider.voxelForPosition (basePlusDistance[0]._xPos, basePlusDistance[0]._yPos);
						var tileLoadedForNearestBase = voxel[0] !== 0;
						if (MoonFlyingState.fuelLevel () === 0) {
							if (tileLoadedForNearestBase) {
								var message = "A rescue craft will retrieve your craft and cargo. You are rewarded no rank points. You will be returned to the nearest base.";
								_alertCallback ("Out of Fuel", message, _okayRescueNearestBaseHandler, null, "Okay", null);
							} else {
								var message = "A rescue craft will retrieve your craft and cargo. You are rewarded no rank points. You will be returned to the previous base.";
								_alertCallback ("Out of Fuel", message, _okayRescuePreviousBaseHandler, null, "Okay", null);
							}
							_gameState = game_state.chillin;
						}
						else if (MoonFlyingState.fuelLevel () < MoonFlyingState.fuelWarnLevel ()) {
							if (tileLoadedForNearestBase) {
								var message = "The nearest base (" + basePlusDistance[0].name + ") is a distance of " + Math.floor (basePlusDistance[1]) +". A rescue craft can retrieve your craft and cargo at a cost of rank points (you will be taken to the nearest base). Or you can try to make it yourself.";
								_alertCallback ("Low Fuel Warning", message, _okayRescueNearestBaseHandler, _cancelRescueHandler, "Rescue Me", "I Got This");
							} else {
								var message = "The nearest base (" + basePlusDistance[0].name + ") is a distance of " + Math.floor (basePlusDistance[1]) +". A rescue craft can retrieve your craft and cargo at a cost of rank points (you will be taken to the previous base). Or you can try to make it yourself.";
								_alertCallback ("Low Fuel Warning", message, _okayRescuePreviousBaseHandler, _cancelRescueHandler, "Rescue Me", "I Got This");
							}
							_gameState = game_state.chillin;
						}
					}
				} else if (MoonFlyingState.isCrashed ()) {
					MoonSounds.stopThrust ();
					MoonSounds.stopAttitude ();
					
					var minimumCargo = _minimumPointsForRank (playerRank ());
					var cargoDemerit = _cargoMoved () -  minimumCargo;
					LocalStorage.setValueForKey (minimumCargo, "MOONCRAFT0_CARGOMOVED");
					// Crashing always sends player to the previous base they left from.					
					var message = "You have destroyed your mooncraft. You will be returned to the base you just left. You forfeit " + cargoDemerit + " cargo points.";
					_alertCallback ("Crash!", message, _okayRescuePreviousBaseHandler, null, "Okay", null);
					_gameState = game_state.chillin;
				}
			}
			break;
			
			case game_state.debriefing:
			var handled = MoonDebriefState.handleGameState (startTime, fps);
			if (!handled) {
				_gameState = game_state.flying;
				MoonIdiots.updateDown (true);
				MoonIdiots.markAllDirty ();
			}
			break;
			
			case game_state.chillin:
			break;
			
			default:
			
			break;
		}
		
		// Render to the window.
		var destContext = _destinationCanvas.getContext ('2d');
		destContext.save ();
		var scaleFactor = _destinationCanvas.width / _destinationWidth;
		destContext.scale (scaleFactor, scaleFactor);
		_renderCockpit (destContext);
		
		// Display FPS.
		if (_displayFPS) {	// BOGUS, CLEAN THIS UP AND PUT IN SEPARATE FUNCTION
			var frameTime = FPS.endFrame ();
			_drawFPS (destContext, frameTime, fps);
		}
		
		if (_gameState == game_state.debriefing) {
			MoonDebriefState.render (destContext, startTime);
		}
		
		destContext.restore ();
		
		// Kick off another game loop.
		window.requestAnimationFrame (_gameLoop);
	}
	
	function _cargoMoved () {
		return +(LocalStorage.valueForKey ("MOONCRAFT0_CARGOMOVED", 0));
	}
	
	function _minimumPointsForRank (rank) {
		var points = 0;
		var threshold = 1000;
		while (rank > 0) {
			points += threshold;
			rank = rank - 1;
			threshold = threshold + 1000;
		}
		
		return points;
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init (destinationCanvas, destinationWidth) {
		_destinationCanvas = destinationCanvas;
		_destinationWidth = destinationWidth;
		_destinationHeight = 240;
		
		// Set up the voxel canvas, the sky.
		_createVoxelCanvasAndSky ();
		
		// Initialize input and player values.
		MoonInput.init ();
		LunarFeatures.init ('moon64/lunar_features.json');
		
		var overlayMiddleImage = new Image ();
		overlayMiddleImage.src = 'artwork/console_overlay_middle.png';
		overlayMiddleImage.onload = function () {
			_consoleOverlayMiddleCanvas = document.createElement ('canvas');
			_consoleOverlayMiddleCanvas.width = overlayMiddleImage.width;
			_consoleOverlayMiddleCanvas.height = overlayMiddleImage.height;
			var context = _consoleOverlayMiddleCanvas.getContext ('2d');
			context.drawImage (overlayMiddleImage, 0, 0);
		};
		
		VoxelProvider.init ('moon64/Moon64.json');
		VoxelProvider.setTileLoadCallback (Mooncraft.tileLoadedCallback);
		
		// Initialize instruments.
		MoonCompass.init ();
		MoonMap.init ();
		MoonRadar.init ();
		MoonCamera.init ();
		MoonMonitor.init ();
		MoonNixies.init ();
		MoonIdiots.init (-40, 5, MoonFlyingState.fuelWarnLevel (), MoonFlyingState.fuelCriticalLevel ());
		
		// _gameState = game_state.flying;
		_gameState = game_state.loading;
		
		MoonMonitor.pushText ('    ___   ___');
		MoonMonitor.pushText ('   /   | /   |\\');
		MoonMonitor.pushText ('  /    |/    ||');
		MoonMonitor.pushText (' /   /|  /|  ||');
		MoonMonitor.pushText ('/___/ |_/ |__||');
		MoonMonitor.pushText ('\\___\\/\\_\\/\\__\\|');
		MoonMonitor.pushText (' '); 
		MoonMonitor.pushText (' MOONCRAFT 2000');
		MoonMonitor.pushText (' ');
		MoonMonitor.pushText ('SPACEBAR = lift.');
		MoonMonitor.pushText ('CURSOR KEYS turn');
		MoonMonitor.pushText ('& move lateral.\u0007');
		MoonMonitor.pushText (' ');

		// Init debrief-related.
		MoonDebriefState.init ();
		MoonBaseMonitor.init ();
	}
	
	function setAlertCallback (callback) {
		_alertCallback = callback;
	}
	
	function playerRank () {
		var rank = 0;
		var cargoMoved = _cargoMoved ();
		var threshold = 1000;
		while (cargoMoved > 0) {
			cargoMoved -= threshold;
			if (cargoMoved >= 0) {
				rank = rank + 1;
				threshold = threshold + 1000;
			}
		}
		
		// Sanity check.
		if (rank >= kRankDescriptionText.length) {
			rank = kRankDescriptionText.length - 1;
		}
		
		return rank;
	}
	
	function playerTitle () {
		return kRankDescriptionText[playerRank ()];
	}
	
	function isApprentice () {
		var rank = playerRank ();
		return (rank < 5);
	}
	
	function load () {
		_displayFPS = LocalStorage.valueForKey ("MOONCRAFT0_DISPLAYFPS", "FALSE") === "TRUE";
		
		// Keep trying for 60s before giving up.
		if (_loadAttempts < 120) {
			if ((_consoleOverlayMiddleCanvas) && (LunarFeatures.baseArray ())) {
				if (_initialPlayerX == 0) {
					var initialPlayerLocation = MoonFlyingState.previousPlayerLocation ()
					_initialPlayerX = initialPlayerLocation[0];
					_initialPlayerY = initialPlayerLocation[1];
					
					// Call to "fault in" the tile we need.
					VoxelProvider.voxelForPosition (_initialPlayerX, _initialPlayerY);
				}
				
				if (_initialBaseLoaded) {
					MoonMap.setScale (6.4 / VoxelProvider.ppd ());
					MoonFlyingState.init ();
					
					// Start the engine.
					_gameLoop ();						
				} else {
					_loadAttempts++;
					setTimeout (load, 500);						
				}
			} else {
				_loadAttempts++;
				setTimeout (load, 500);
			}
		} else {
			console.log ('Timed out loading maps after 2 min. Try reloading page...');
		}
	}
	
	function start () {
		_gameState = game_state.debriefing;
		var base = MoonFlyingState.baseLandedOn ();
		MoonDebriefState.beginDebriefState (FPS.startFrame (), true, base);
	}
	
	function primaryAction (isOn) {
		if (_gameState === game_state.flying) {
			MoonFlyingState.setVerticalThrustOn (isOn);
		} else if (_gameState === game_state.debriefing) {
			MoonDebriefState.enterKeyInput (isOn)
		}
	}
	
	function upAction (isOn) {
		if (_gameState === game_state.flying) {
			MoonFlyingState.setForwardThrustOn (isOn);
		}
	}
	
	function downAction (isOn) {
		if (_gameState === game_state.flying) {
			MoonFlyingState.setReverseThrustOn (isOn);
		}
	}
	
	function leftAction (isOn) {
		if (_gameState === game_state.flying) {
			MoonFlyingState.setYawLeftOn (isOn);
		} else if (_gameState === game_state.debriefing) {
			MoonDebriefState.leftKeyInput (isOn)
		}
	}
	
	function rightAction (isOn) {
		if (_gameState === game_state.flying) {
			MoonFlyingState.setYawRightOn (isOn);
		} else if (_gameState === game_state.debriefing) {
			MoonDebriefState.rightKeyInput (isOn)
		}
	}
	
	function rollEnabled () {
		return _enableRoll;
	}
	
	function setRollEnabled (enable) {
		if (enable != _enableRoll) {
			_enableRoll = enable;
			_createVoxelCanvasAndSky ();
		}
	}
	
	function toggleLongRange () {
		_longRange = _longRange == false;
		_updateLongRange ();
	}
	
	function toggleDisplayFPS () {
		_displayFPS = !_displayFPS;
		if (_displayFPS) {
			LocalStorage.setValueForKey ("TRUE", "MOONCRAFT0_DISPLAYFPS");
		} else {
			LocalStorage.setValueForKey ("FALSE", "MOONCRAFT0_DISPLAYFPS");
		}
	}
	
	function setOverCrater (crater) {
		if ((MoonFlyingState.forwardVelocity () > 3) && ((_overCrater === null) || (_overCrater.name !== crater.name))) {
			_overCrater = crater;
			MoonMonitor.pushText ("Over crater:");
			MoonMonitor.pushText (_overCrater.name);
			MoonMonitor.pushText (' ');
		}
	}
	
	function tileLoadedCallback (row, column) {
		var tile = VoxelProvider.tileForRowColumn (row, column);
		var x0 = column * tile.width;
		var y0 = row * tile.height;
		var x1 = (column + 1) * tile.width;
		var y1 = (row + 1) * tile.height;
		var base = LunarFeatures.baseInRectangle (x0, y0, x1, y1);
		if (base) {
			switch (base.type) {
				case 1:
				MoonBaseUtils.addBaseToTile (base.loc_x, base.loc_y, "bases/Base_1_", [0xFE, 0xFE, 0xFE]);
				break;
				
				case 2:
				MoonBaseUtils.addBaseToTile (base.loc_x, base.loc_y, "bases/Base_2_", [0xFF, 0xFF, 0xFF]);
				break;
				
				case 3:
				MoonBaseUtils.addBaseToTile (base.loc_x, base.loc_y, "bases/Base_3_", [0xFF, 0xFF, 0xFF]);
				break;
				
				case 4:
				MoonBaseUtils.addBaseToTile (base.loc_x, base.loc_y, "bases/Base_4_", [0xFE, 0xFE, 0xFE]);
				break;
				
				case 5:
				MoonBaseUtils.addBaseToTile (base.loc_x, base.loc_y, "bases/Base_5_", [0xFF, 0xFF, 0xFF]);
				break;
				
				case 6:
				MoonBaseUtils.addBaseToTile (base.loc_x, base.loc_y, "bases/Base_6_", [0xFF, 0xFF, 0xFF]);
				break;
				
				case 7:		// Cop-out, using Base_1 but with different light color.
				MoonBaseUtils.addBaseToTile (base.loc_x, base.loc_y, "bases/Base_1_", [0xFF, 0xFF, 0xFF]);
				break;
				
				case 8:		// Cop-out, using Base_3 but with different light color.
				MoonBaseUtils.addBaseToTile (base.loc_x, base.loc_y, "bases/Base_3_", [0xFE, 0xFE, 0xFE]);
				break;
				
				default:
				console.log ("Mooncraft.tileLoadedCallback(); error, unknown base style, ignoring.")
				break;
			}
		}
		
		if (!(_initialPlayerX > x1 || _initialPlayerX < x0 || _initialPlayerY > y1 || _initialPlayerY < y0)) {
			_initialBaseLoaded = true;
		}
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: Mooncraft.init ();
	
	return {
		init: init, 
		setAlertCallback: setAlertCallback, 
		playerRank: playerRank, 
		playerTitle: playerTitle, 
		isApprentice: isApprentice, 
		load: load, 
		start: start, 
		primaryAction: primaryAction, 
		upAction: upAction, 
		downAction: downAction, 
		leftAction: leftAction, 
		rightAction: rightAction, 
		rollEnabled: rollEnabled, 
		setRollEnabled: setRollEnabled, 
		toggleLongRange: toggleLongRange, 
		toggleDisplayFPS: toggleDisplayFPS, 
		setOverCrater: setOverCrater, 
		tileLoadedCallback: tileLoadedCallback
	};
})();
