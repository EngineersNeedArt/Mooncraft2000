// ==============================================================================================================
// MoonFlyingState.js
// ==============================================================================================================

/// There are two primary states: flying and debriefing. The player is doing one or the other.
/// When "flying" the player takes off, flies, lands, crashes. By landing on a Moon base, the 
/// player flips to the debriefing state.

var MoonFlyingState = (function () {
	'use strict';
	
	const player_state = {
		landed : 0,
		flying : 1, 
		crashed : 2
	}
	
	const landing_quality = {
		hard : 0,
		medium : 1, 
		normal : 2, 
		gentle : 3
	}
	
	const kLandingStatusText = [
		"Very smooth landing!", 
		"Landing was okay.", 
		"Take it easy landing next time!", 
		"Thanks for crashing in, I guess."
	];
	
	const kMaximumForwardSpeed = 30
	const kMinimumForwardSpeed = -20
	const kMaximumRotationVelocity = 0.4
	const kForwardImpulse = 15
	const kVerticalImpulse = 12
	const kRotationalImpulse = 2
	const kGravity = 1.5
	const kCraftGroundOffset = 300
	const kVerticalCeiling = 38000
	const _shipMass = 1
	
	var _state = player_state.landed;
	
	var _xPos = 0;
	var _yPos = 0;
	var _zPos = 0;
	var _yaw = 0;
	var _yawSin = 0;
	var _yawCos = 0;
	var _forwardVelocity = 0;
	var _verticalVelocity = 0;
	var _landingQuality = 0;
	var _yawVelocity = 0;
	var _roll = 0;
	var _jitter = 0;
	var _fuelCapacity = 500;
	var _fuel = 500;
	var _cargoMass = 0;	// Mass of 0 == no cargo, 2000 == heavy!.
	
	// Keyboard (control) state.
	var _verticalThrustOn = false;
	var _forwardThrustOn = false;
	var _reverseThrustOn = false;
	var _yawLeftOn = false;
	var _yawRightOn = false;
	var _padLeftOn = false;
	var _padRightOn = false;
	var _hydraulicsOn = false;
	
	var _forwardStoppedOnZero = false;
	var _reverseStoppedOnZero = false;
	var _yawRightStoppedOnZero = false;
	var _yawLeftStoppedOnZero = false;
	
	// ---------------------------------------------------------------------------------------- Private Functions
	
	function _resetPlayer () {
		_state = player_state.landed;
		
		var location = previousPlayerLocation ();
		_xPos = location[0];
		_yPos = location[1];
		_zPos = location[2];
		
		// Yaw from previous landing (or default zero).
		_yaw = 0;
		_yaw = +(LocalStorage.valueForKey ("MOONCRAFT0_LASTYAW", _yaw));
		
		_forwardVelocity = 0;
		_verticalVelocity = 0;
		_yawVelocity = 0;
	}
	
	function _normalizeAngle (angle) {
		var twoPi = Math.PI * 2;
		if (angle < 0) {
			return (angle % twoPi) + twoPi;
		} else if (angle > twoPi) {
			return angle % twoPi;
		} else {
			return angle;
		}
	}
	
	function _evaluateLanding () {
		var quality = landing_quality.hard;
		
		if (_verticalVelocity > -3) {
			quality = landing_quality.gentle;
		} else if (_verticalVelocity > -6) {
			quality = landing_quality.normal;
		} else if (_verticalVelocity > -9) {
			quality = landing_quality.medium;
		}
		
		return quality;
	}
	
	function _effective_impulse (rawImpulse) {
		return rawImpulse / (_shipMass + (_cargoMass / 1000) + (_fuel / 1350));
	}
	
	/// Messy function that handles all the dynamics of flying.
	
	function _updatePosition (fps) {
		// var landingVelocity = 0;
		var attitude_control = false;
		var viewPitch = VoxelCanvas.getViewPitch ();
		_jitter = 0;
		
		// Forward movement.
		if ((_forwardThrustOn) && (_fuel > 0)) {
			if (_forwardVelocity < kMaximumForwardSpeed) {
				if (!_forwardStoppedOnZero) {
					var wasNegative = _forwardVelocity < 0;
					_forwardVelocity = _forwardVelocity + (_effective_impulse (kForwardImpulse) / fps);
					if ((wasNegative) && (_forwardVelocity >= 0)) {
						_forwardVelocity = 0;
						_forwardStoppedOnZero = true;
					}
					_fuel -= kForwardImpulse / fps;
					attitude_control = true;
					
					if (viewPitch <  20) {
						viewPitch = 5;
						VoxelCanvas.setViewPitch (viewPitch);
					}
					_jitter = (Math.random () * 4)|0;
				}
			} else {
				MoonSounds.stopAttitude ();
			}
		} else if (_forwardStoppedOnZero) {
			_forwardStoppedOnZero = false;
		}
		
		if ((_reverseThrustOn) && (_fuel > 0)) {
			if (_forwardVelocity > kMinimumForwardSpeed) {
				if (!_reverseStoppedOnZero) {
					var wasPositive = _forwardVelocity > 0;
					_forwardVelocity = _forwardVelocity - (_effective_impulse (kForwardImpulse) / fps);
					if ((wasPositive) && (_forwardVelocity <= 0)) {
						_forwardVelocity = 0;
						_reverseStoppedOnZero = true;
					}
					_fuel -= kForwardImpulse / fps;
					attitude_control = true;
										
					if (viewPitch > - 20) {
						viewPitch = - 5;
						VoxelCanvas.setViewPitch (viewPitch);
					}
					_jitter = (Math.random () * 4)|0;
				}
			} else {
				MoonSounds.stopAttitude ();
			}
		} else if (_reverseStoppedOnZero) {
			_reverseStoppedOnZero = false;
		}
		
		// Move player X, Y.
		_yawSin = Math.sin (_yaw);
		_yawCos = Math.cos (_yaw);
		_xPos = VoxelProvider.normalizedXPosition (_xPos + (_forwardVelocity * _yawSin / fps));
		_yPos = VoxelProvider.normalizedYPosition (_yPos - (_forwardVelocity * _yawCos / fps));
		
		// Handle view pitching.
		if (viewPitch < 0) {
			viewPitch = viewPitch + 0.1;
			if (viewPitch > 0) {
				viewPitch = 0;
			}
			VoxelCanvas.setViewPitch (viewPitch);
		} else if (viewPitch > 0) {
			viewPitch = viewPitch - 0.1;
			if (viewPitch < 0) {
				viewPitch = 0;
			}
			VoxelCanvas.setViewPitch (viewPitch);
		}
		
		// Vertical movement.
		// Thrust.
		var predictedCeiling;
		if (_verticalVelocity > 0) {
			predictedCeiling = _zPos + (((_verticalVelocity) * (_verticalVelocity)) / ((kGravity * 2) / fps));
		} else {
			predictedCeiling = _zPos;
		}
		
		if ((_verticalThrustOn) && (_fuel > 0)) {
			if (_state === player_state.landed) {
				_state = player_state.flying;
			}
			
			if ((predictedCeiling < kVerticalCeiling)) {
				MoonSounds.playThrust ();
				_verticalVelocity = _verticalVelocity + (_effective_impulse (kVerticalImpulse) / fps);
				_fuel -= kVerticalImpulse / fps;
				_jitter = (Math.random () * 4)|0;
			} else {
				MoonSounds.stopThrust ();
			}
		} else {
			MoonSounds.stopThrust ();
		}
		
		// Gravity.
		_verticalVelocity = _verticalVelocity - (kGravity / fps);
		
		// Move player in Z (vertical) axis.
		_zPos += _verticalVelocity;
		
		// Yaw.
		var falseYawRight = false;
		var falseYawLeft = false;
		if ((!_yawRightOn) && (!_yawLeftOn) && (_yawVelocity != 0)) {
			if (_yawVelocity > 0) {
				falseYawLeft = true;
			} else {
				falseYawRight = true;
			}
		}
		
		if (((_yawRightOn) || (falseYawRight)) && (_fuel > 0)) {
			if (_yawVelocity < kMaximumRotationVelocity) {
				if (!_yawRightStoppedOnZero) {
					var wasNegative = _yawVelocity < 0;
					_yawVelocity = _yawVelocity + (_effective_impulse (kRotationalImpulse) / fps);
					if ((wasNegative) && (_yawVelocity >= 0)) {
						_yawVelocity = 0;
						_yawRightStoppedOnZero = true;
					}
					_fuel -= kRotationalImpulse / fps;
					attitude_control = true;
				}
			} else {
				MoonSounds.stopAttitude ();
			}
		} else if (_yawRightStoppedOnZero) {
			_yawRightStoppedOnZero = false;
		}
		
		if (((_yawLeftOn) || (falseYawLeft)) && (_fuel > 0)) {
			if (_yawVelocity > -kMaximumRotationVelocity) {
				if (!_yawLeftStoppedOnZero) {
					var wasPositive = _yawVelocity > 0;
					_yawVelocity = _yawVelocity - (_effective_impulse (kRotationalImpulse) / fps);
					if ((wasPositive) && (_yawVelocity <= 0)) {
						_yawVelocity = 0;
						_yawLeftStoppedOnZero = true;
					}
					_fuel -= kRotationalImpulse / fps;
					attitude_control = true;
				}
			} else {
				MoonSounds.stopAttitude ();
			}
		} else if (_yawLeftStoppedOnZero) {
			_yawLeftStoppedOnZero = false;
		}
		
		if (_yawVelocity == 0) {
			if ((attitude_control) && (_fuel > 0)) {
				MoonSounds.playAttitude ();
			} else {
				MoonSounds.stopAttitude ();
			}
		} else {
			if (((_forwardVelocity != 0) || (attitude_control)) && (_fuel > 0)) {
				_fuel -= (_forwardVelocity * 0.2) / fps;
				MoonSounds.playAttitude ();
			} else {
				if (((!_yawRightOn) && (!_yawLeftOn)) || (_fuel <= 0)) {
					MoonSounds.stopAttitude ();				
				}
			}
		}
		_yaw = _normalizeAngle (_yaw + (_yawVelocity / fps));
		
		var desiredRoll = (_forwardVelocity * _yawVelocity) * 0.007;	// BOGUS, should use constant.
		var actualRoll = _roll;
		var rollDelta = desiredRoll - actualRoll;
		_roll += rollDelta / 32;
		
		if (_fuel < 0) {
			_fuel = 0;
		}
	}
	
	function _updateNavigationalInstruments (fps) {
		MoonMap.update (_xPos, _yPos, _yawSin, _yawCos);
		MoonCamera.update (_xPos, _yPos, _zPos, _yawSin, _yawCos);
		MoonNixies.updateVerticalVelocity (_verticalVelocity * 2);
		MoonRadar.update (_xPos, _yPos, _zPos, _yawSin, _yawCos);
		MoonCompass.update (_yaw);
		var voxel = VoxelProvider.voxelForPosition (_xPos, _yPos);
		MoonNixies.updateAltitude ((_zPos - voxel[0] - kCraftGroundOffset) / 160);
		MoonNixies.updateForwardVelocity (_forwardVelocity);
		MoonNixies.updateFuel (_fuel);
		MoonIdiots.updateVelocity (_verticalVelocity * 2);
		MoonIdiots.updateAltitude ((_zPos - voxel[0] - kCraftGroundOffset) / 160);
		MoonIdiots.updateFuel (_fuel);
		MoonIdiots.updateDown (_state === player_state.landed);
	}
	
	function _handleFlying (fps) {
		// Move player.
		_updatePosition (fps);
		
		var padRotation = (_padLeftOn || _padRightOn) && (_state === player_state.landed) && (baseLandedOn () !== null);
		if (padRotation) {
			if (_padLeftOn) {
				_yaw -= 0.2 / fps;
			} else if (_padRightOn) {
				_yaw += 0.2 / fps;
			}
			if (!_hydraulicsOn) {
				_hydraulicsOn = true;
				MoonSounds.playHydraulics ();
			}
			MoonSounds.playMotor ();
		}
		if (!padRotation) {
			_hydraulicsOn = false;
			MoonSounds.stopMotor ();
		}
		
		// See if player has collided with the ground.
		var voxel = VoxelProvider.voxelForPosition (_xPos, _yPos);
		var terrain_height = voxel[0];
		if (_zPos < (terrain_height + kCraftGroundOffset)) {
			if (_state == player_state.flying) {
				_landingQuality = _evaluateLanding ();
				if ((_verticalVelocity < -12) || (_forwardVelocity > 1) || (_forwardVelocity < -1)) {
					if (_state !== player_state.crashed) {
						MoonSounds.playCrash ();
					}
					_state = player_state.crashed;
				} else {
					_state = player_state.landed;
				}
			}
			_zPos = terrain_height + kCraftGroundOffset;
			_verticalVelocity = 0.0;
			_forwardVelocity = 0.0;
			_yawVelocity = 0.0;
			
			_verticalThrustOn = false;
			_forwardThrustOn = false;
			_reverseThrustOn = false;
			_yawLeftOn = false;
			_yawRightOn = false;
			
			_forwardStoppedOnZero = false;
			_reverseStoppedOnZero = false;
			_yawRightStoppedOnZero = false;
			_yawLeftStoppedOnZero = false;
		}
	}
	
	function _handleTouchdown () {
		// jitter = landingVelocity * 3;
		MoonSounds.playWindDown ();
		MoonMonitor.pushText (' ');
		MoonMonitor.pushText ('TOUCHDOWN');
		
		if (_landingQuality <= landing_quality.medium) {
			MoonSounds.playLandHard ();
		} else {
			MoonSounds.playLandNormal ();	
		}
		
		var base = baseLandedOn ();
		if (base) {
			// Store x, y and z position as well as yaw.
			LocalStorage.setValueForKey (_xPos, "MOONCRAFT0_LASTXPOS");
			LocalStorage.setValueForKey (_yPos, "MOONCRAFT0_LASTYPOS");
			LocalStorage.setValueForKey (_zPos, "MOONCRAFT0_LASTZPOS");
			LocalStorage.setValueForKey (_yaw, "MOONCRAFT0_LASTYAW");
			
			MoonMonitor.pushText (' ');
			MoonMonitor.pushText ('Welcome to:');
			MoonMonitor.pushText (base.name, true);
			MoonSounds.playQuindar ();
		} else {
			var crater = LunarFeatures.craterForLocation (_xPos, _yPos);
			if (crater) {
				MoonMonitor.pushText (' ');
				MoonMonitor.pushText ('Welcome to:');
				MoonMonitor.pushText (crater.name, true);
			}
		}
		
		// May be null (indicating player did not touchdown on a base).
		return base;
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init () {
		_resetPlayer ();
	}
	
	function previousPlayerLocation () {
		// Our fall-back, default location.
		var location = LunarFeatures.locationForBase ("PRB");	// Purbach Base
		_xPos = location[0];
		_yPos = location[1];
		
		// Compute z position from x and y.
		var voxel = VoxelProvider.voxelForPosition (_xPos, _yPos);
		_zPos = voxel[0] + kCraftGroundOffset;
		
		// Check local storage in case player is continuing a game.
		location[0] = +(LocalStorage.valueForKey ("MOONCRAFT0_LASTXPOS", _xPos));
		if (location[0] !== location[0]) {	// NaN
			location[0] = _xPos;
		}
		location[1] = +(LocalStorage.valueForKey ("MOONCRAFT0_LASTYPOS", _yPos));
		if (location[1] !== location[1]) {	// NaN
			location[1] = _yPos;
		}
		if (_zPos !== 0) {
			location[2] = +(LocalStorage.valueForKey ("MOONCRAFT0_LASTZPOS", _zPos));
		}
		if (location[2] !== location[2]) {	// NaN
			location[2] = _zPos;
		}
		
		return location;
	}
	
	function returnToPreviousBase () {
		_resetPlayer ();
	}
	
	function sendToNearestBase () {
		var basePlusDistance = nearestBaseAndDistance ();
		LocalStorage.setValueForKey (basePlusDistance[0].loc_x, "MOONCRAFT0_LASTXPOS");
		LocalStorage.setValueForKey (basePlusDistance[0].loc_y, "MOONCRAFT0_LASTYPOS");
		var voxel = VoxelProvider.voxelForPosition (basePlusDistance[0]._xPos, basePlusDistance[0]._yPos);
		if (voxel[0] === 0) {
			console.log ("MoonFlyingState.sendToNearestBase(); error, tile not yet loaded.")
		} else {
			LocalStorage.setValueForKey (voxel[0] + kCraftGroundOffset, "MOONCRAFT0_LASTZPOS");
		}
		_resetPlayer ();
	}
	
	function setVerticalThrustOn (isOn) {
		_verticalThrustOn = isOn;
	}
	
	function setForwardThrustOn (isOn) {
		if (_state === player_state.flying) {
			_forwardThrustOn = isOn;
		}
	}
	
	function setReverseThrustOn (isOn) {
		if (_state === player_state.flying) {
			_reverseThrustOn = isOn;
		}
	}
	
	function setYawLeftOn (isOn) {
		if (_state === player_state.flying) {
			_yawLeftOn = isOn;
		} else if (_state === player_state.landed) {
			_padLeftOn = isOn;
			if (!isOn) {
				MoonSounds.stopMotor ();
			}
		}
	}
	
	function setYawRightOn (isOn) {
		if (_state === player_state.flying) {
			_yawRightOn = isOn;
		} else if (_state === player_state.landed) {
			_padRightOn = isOn;
			if (!isOn) {
				MoonSounds.stopMotor ();
			}
		}
	}
	
	function handleGameState (currentTime, fps) {
		var wasState = _state;
		_handleFlying (fps);
		
		_updateNavigationalInstruments ();
		updateTerrain ();
		
		if ((wasState === player_state.landed) && (_state != player_state.landed)) {
			LocalStorage.setValueForKey (_yaw, "MOONCRAFT0_LASTYAW");
			MoonMonitor.pushText ('LIFTOFF\u0007');
			MoonMonitor.pushText (' ');
			_yawLeftOn = false;
			_yawRightOn = false;
		}
		
		if ((wasState === player_state.flying) && (_state === player_state.landed)) {
			_handleTouchdown ();
		}
		
		// Update computer display.
		MoonMonitor.update ();
		
		return (wasState != _state);
	}
	
	function raiseLower (fraction) {
		var voxel = VoxelProvider.voxelForPosition (_xPos, _yPos);
		_zPos = voxel[0] + (kCraftGroundOffset * fraction);
	}
	
	function updateTerrain () {
		VoxelCanvas.setViewPitch (_jitter);
		VoxelCanvas.render (_xPos, _yPos, _zPos, _yaw);
	}
	
	function nearestBaseAndDistance () {
		var closestBases =  LunarFeatures.closestBasesForLocation (_xPos, _yPos);
		var closestBase = closestBases[0];
		var deltaX = closestBase.loc_x - _xPos;
		var deltaY = closestBase.loc_y - _yPos;
		var distance = Math.sqrt ((deltaX * deltaX) + (deltaY * deltaY));
		return [closestBase, distance];
	}
	
	function baseLandedOn () {
		var basePlusDistance = nearestBaseAndDistance ();
		if (basePlusDistance[1] < 2) {
			return basePlusDistance[0];
		}
		return null;
	}
	
	function forwardVelocity () {
		return _forwardVelocity;
	}
	
	function isFlying () {
		return (_state === player_state.flying);
	}
	
	function isLanded () {
		return (_state === player_state.landed);
	}
	
	function isCrashed () {
		return (_state === player_state.crashed);
	}
	
	function landingDescription () {
		switch (_landingQuality) {
			case landing_quality.gentle:
			return kLandingStatusText[0];
			break;
			
			case landing_quality.normal:
			return kLandingStatusText[1];
			break;
			
			case landing_quality.medium:
			return kLandingStatusText[2];
			break;
			
			default:	// Hard landing
			return kLandingStatusText[3];
			break;
		}
	}
	
	function yaw () {
		return _yaw;
	}
	
	function roll () {
		return _roll;
	}
	
	function fuelPercentage () {
		return (_fuel / _fuelCapacity) * 100;
	}
	
	function setFuelPercentage (percent) {
		_fuel = (percent * _fuelCapacity) / 100;
	}
	
	function fuelLevel () {
		return _fuel;
	}
	
	function fuelWarnLevel () {
		return 150;
	}
	
	function fuelCriticalLevel () {
		return 50;
	}
	
	function cargo () {
		return _cargoMass;
	}
	
	function setCargo (cargo) {
		_cargoMass = cargo;
	}
	
	function getJitter () {
		return _jitter;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonFlyingState.init ();
	
	return {
		init: init, 
		previousPlayerLocation: previousPlayerLocation, 
		returnToPreviousBase: returnToPreviousBase, 
		sendToNearestBase: sendToNearestBase, 
		setVerticalThrustOn: setVerticalThrustOn, 
		setForwardThrustOn: setForwardThrustOn, 
		setReverseThrustOn: setReverseThrustOn, 
		setYawLeftOn: setYawLeftOn, 
		setYawRightOn: setYawRightOn, 
		handleGameState: handleGameState, 
		raiseLower: raiseLower, 
		updateTerrain: updateTerrain, 
		nearestBaseAndDistance: nearestBaseAndDistance, 
		baseLandedOn: baseLandedOn, 
		forwardVelocity: forwardVelocity, 
		isFlying: isFlying, 
		isLanded: isLanded, 
		isCrashed: isCrashed, 
		landingDescription: landingDescription, 
		yaw: yaw, 
		roll: roll, 
		fuelPercentage: fuelPercentage, 
		setFuelPercentage: setFuelPercentage, 
		fuelLevel: fuelLevel, 
		fuelWarnLevel: fuelWarnLevel, 
		fuelCriticalLevel: fuelCriticalLevel, 
		cargo: cargo, 
		setCargo: setCargo, 
		getJitter: getJitter
	};
})();
