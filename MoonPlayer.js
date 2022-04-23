// ==============================================================================================================
// MoonPlayer.js
// ==============================================================================================================

var MoonPlayer = (function () {
	'use strict';
	
	const player_state = {
		landed : 0,
		flying : 1, 
		crashed : 2
	}
	
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
	var _fuelCapacity = 300;
	var _fuel = 300;
	var _cargoMass = 0;	// Mass of 0 == no cargo, 2 == heavy!.
	
	// Keyboard (control) state.
	var _verticalThrustOn = false;
	var _forwardThrustOn = false;
	var _reverseThrustOn = false;
	var _yawLeftOn = false;
	var _yawRightOn = false;
	
	var _forwardStoppedOnZero = false;
	var _reverseStoppedOnZero = false;
	var _yawRightStoppedOnZero = false;
	var _yawLeftStoppedOnZero = false;
	
	// ---------------------------------------------------------------------------------------- Private Functions
	
	function _resetPlayer () {
		_state = player_state.landed;
		
		var location = LunarFeatures.locationForBase ("PRB");	// Purbach Base
		_xPos = location[0];
		_yPos = location[1];
		var voxel = VoxelProvider.voxelForPosition (_xPos, _yPos);
		_zPos = voxel[0] + kCraftGroundOffset;
		
		_yaw = 0;
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
		var quality = 0;
		
		if (_verticalVelocity > -3) {
			quality = 3;
		} else if (_verticalVelocity > -6) {
			quality = 2;
		} else if (_verticalVelocity > -10) {
			quality = 1;
		}
		
		return quality;
	}
	
	function _effective_impulse (rawImpulse) {
		return rawImpulse / (_shipMass + _cargoMass + (_fuel / 1000));
	}
	
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
				// console.log ("Yaw Fuel Expended: " + (_forwardVelocity * 0.1) / fps);
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
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init () {
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
		}
	}
	
	function setYawRightOn (isOn) {
		if (_state === player_state.flying) {
			_yawRightOn = isOn;
		}
	}
	
	function handleFlying (fps) {
		// Move player.
		_updatePosition (fps);
		
		// See if player has collided with the ground.
		var voxel = VoxelProvider.voxelForPosition (_xPos, _yPos);
		var terrain_height = voxel[0];
		if (_zPos < (terrain_height + kCraftGroundOffset)) {
			_landingQuality = _evaluateLanding ();
			if ((_verticalVelocity < -15) || (_forwardVelocity > 1) || (_forwardVelocity < -1)) {
				_state = player_state.crashed;
			} else {
				_state = player_state.landed;
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
	
	function handleTouchdown () {
		// jitter = landingVelocity * 3;
		MoonSounds.playWindDown ();
		
		MoonMonitor.pushText (' ');
		MoonMonitor.pushText ('TOUCHDOWN');
		var base = LunarFeatures.baseForLocation (_xPos, _yPos);
		if (base) {
			MoonMonitor.pushText (' ');
			MoonMonitor.pushText ('Welcome to:');
			MoonMonitor.pushText (base.name);
			MoonSounds.playQuindar ();
		} else {
			var crater = LunarFeatures.craterForLocation (_xPos, _yPos);
			if (crater) {
				MoonMonitor.pushText (' ');
				MoonMonitor.pushText ('Welcome to:');
				MoonMonitor.pushText (crater.name);
			}
		}
		
		// May be null (indicating player did not touchdown on a base).
		return base;
	}
	
	function raiseLower (fraction) {
		var voxel = VoxelProvider.voxelForPosition (_xPos, _yPos);
		_zPos = voxel[0] + (kCraftGroundOffset * fraction);
	}
	
	function updateNavigationalInstruments (fps) {
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
		MoonIdiots.updateDown (MoonPlayer.isLanded ());
	}
	
	function updateTerrain () {
		VoxelCanvas.setViewPitch (_jitter);
		VoxelCanvas.render (_xPos, _yPos, _zPos, _yaw);
	}
	
	function isLanded () {
		return (_state === player_state.landed);
	}
	
	function isFlying () {
		return (_state === player_state.flying);
	}
	
	function isCrashed () {
		return (_state === player_state.crashed);
	}
	
	function landingQuality () {
		// On a scale from 0..3 (where zero is terrible or crashed).
		return _landingQuality;
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
	
	function getJitter () {
		return _jitter;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonPlayer.init ();
	
	return {
		init: init, 
		setVerticalThrustOn: setVerticalThrustOn, 
		setForwardThrustOn: setForwardThrustOn, 
		setReverseThrustOn: setReverseThrustOn, 
		setYawLeftOn: setYawLeftOn, 
		setYawRightOn: setYawRightOn, 
		handleFlying: handleFlying, 
		handleTouchdown: handleTouchdown, 
		raiseLower: raiseLower, 
		updateNavigationalInstruments: updateNavigationalInstruments, 
		updateTerrain: updateTerrain, 
		isLanded: isLanded, 
		isFlying: isFlying, 
		isCrashed: isCrashed, 
		landingQuality: landingQuality, 
		yaw: yaw, 
		roll: roll, 
		fuelPercentage: fuelPercentage, 
		setFuelPercentage: setFuelPercentage, 
		getJitter: getJitter
	};
})();
