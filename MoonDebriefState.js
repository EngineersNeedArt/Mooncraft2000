// ==============================================================================================================
// MoonDebriefState.js
// ==============================================================================================================

/// There are two primary states: flying and debriefing. The player is doing one or the other.
/// When "debriefed" the player is in one of several substates (see below). After the player has 
/// been debriefed, they return to the surface of the Moon and flip to a "flying" state.

var MoonDebriefState = (function () {
	'use strict';
	
	const debriefing_state = {
		idle : 0, 
		lowering : 1, 
		landingStatus : 2, 
		cargoUnload : 3, 
		rank : 4, 
		fuelStatus : 5, 
		cargoSelect: 6, 
		acknowledgeCargo: 7, 
		cargoLoad : 8, 
		acknowledgeBase : 9,
		goodbye : 10, 
		raising : 11, 
		complete : 12
	}
	
	const input_key = {
		none : 0, 
		enter : 1, 
		left : 2, 
		right : 3
	}
	
	const kCargoSelectedText = [
		"[0.5 ton] 1.0 ton  1.5 tons  2.0 tons ", 
		" 0.5 ton [1.0 ton] 1.5 tons  2.0 tons ", 
		" 0.5 ton  1.0 ton [1.5 tons] 2.0 tons ", 
		" 0.5 ton  1.0 ton  1.5 tons [2.0 tons]"
	]
	
	var _firstTimeCalled;
	var _base;
	var _debriefingState;
	var _referenceTime;
	var _referenceDuration;
	var _interStatialTime;
	var _textScratch;
	var _distanceTraveled = 0;
	var _wasRank;
	var _waitingForInput;
	var _input = input_key.none;
	var _cargoSelected = 0;
	var _consoleOverlayBottomCanvas = null;
	var _baseVisits = null;
	
	// ---------------------------------------------------------------------------------------- Private Functions
	
	function _visitCountForBase (base) {
		var count = 0;
		if ((_baseVisits !== null) && (_baseVisits.hasOwnProperty (base.display_name))) {
			count = _baseVisits[base.display_name];
		}
		
		return count;
	}
	
	function _incrementVisitCountForBase (base) {
		if (_baseVisits === null) {
			_baseVisits = {};
		}
		
		var count = _visitCountForBase (base);
		count = count + 1;
		_baseVisits[base.display_name] = count;
		
		LocalStorage.setValueForKey (JSON.stringify (_baseVisits), "MOONCRAFT0_BASEVISITS")
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init () {
		var overlayBottomImage = new Image ();
		overlayBottomImage.src = 'artwork/console_overlay_bottom.png';
		overlayBottomImage.onload = function () {
			_consoleOverlayBottomCanvas = document.createElement ('canvas');
			_consoleOverlayBottomCanvas.width = overlayBottomImage.width;
			_consoleOverlayBottomCanvas.height = overlayBottomImage.height;
			var context = _consoleOverlayBottomCanvas.getContext ('2d');
			context.drawImage (overlayBottomImage, 0, 0);
		};
		
		_baseVisits = JSON.parse (LocalStorage.valueForKey ("MOONCRAFT0_BASEVISITS", null));
	}
	
	function beginDebriefState (currentTime, firstTimeCalled, base) {
		_firstTimeCalled = firstTimeCalled;
		_base = base;
		_debriefingState = debriefing_state.idle;
		
		MoonBaseMonitor.clear ();
		MoonBaseMonitor.pushText (base.name);
		
		var visitCount = _visitCountForBase (_base);
		_incrementVisitCountForBase (_base);
		
		if (visitCount === 0) {
			MoonBaseMonitor.pushText ("We have not seen you here before.");
			MoonBaseMonitor.pushText ('');	
		} else {
			MoonBaseMonitor.pushText ("Welcome back!");
			MoonBaseMonitor.pushText ('');	
		}
		
		if (_firstTimeCalled) {
			_referenceDuration = 500;
		} else {
			_referenceDuration = 3000;
		}
		_referenceTime = currentTime + _referenceDuration;
	}
	
	/// This is the big, ugly state machine that moves the player from one sub-state to the next 
	/// until they depart the base (are raised to the surface and begin "flying").
	
	function handleGameState (currentTime, fps) {
		var handled = true;
		
		switch (_debriefingState) {
			case debriefing_state.idle:
			if (currentTime > _referenceTime) {
				MoonSounds.playHydraulicLower ();
				_debriefingState = debriefing_state.lowering;				// --> lowering
				_referenceDuration = 4000;
				_referenceTime = currentTime + _referenceDuration;
			}
			MoonFlyingState.updateTerrain ();
			MoonMonitor.update ();
			break;
			
			case debriefing_state.lowering:
			if (currentTime < _referenceTime) {
				MoonFlyingState.raiseLower ((_referenceTime - currentTime) / _referenceDuration);
			} else {
				if (_firstTimeCalled) {
					_referenceDuration = 50;
				} else {
					MoonBaseMonitor.pushText (MoonFlyingState.landingDescription () + "\u0007");
					MoonBaseMonitor.pushText (" ");
					_referenceDuration = 1000;
				}
				_debriefingState = debriefing_state.landingStatus;			// --> landingStatus
				_referenceTime = currentTime + _referenceDuration;
			}
			MoonFlyingState.updateTerrain ();
			break;
			
			case debriefing_state.landingStatus:
			if (currentTime > _referenceTime) {
				_distanceTraveled = 0;
				_wasRank = Mooncraft.playerRank ();
				var cargo = MoonFlyingState.cargo ();
				if (cargo > 0) {
					var baseDeparted = LocalStorage.valueForKey ("MOONCRAFT0_BASEDEPARTED", "PRB");
					if (baseDeparted == _base.display_name) {
						MoonBaseMonitor.pushText ("This is our cargo. You need to move it.");
						_debriefingState = debriefing_state.rank;			// --> rank
					} else {
						var departedLocation = LunarFeatures.locationForBase (baseDeparted);
						var deltaX = departedLocation[0] - _base.loc_x;
						var deltaY = departedLocation[1] - _base.loc_y;
						_distanceTraveled = Math.floor (Math.sqrt ((deltaX * deltaX) + (deltaY * deltaY)));
						MoonBaseMonitor.pushText ("Unloading cargo...");
						_textScratch = "Unloading cargo...";
						_referenceDuration = (cargo * 3) + 1000;
						var totalCargoMoved = +(LocalStorage.valueForKey ("MOONCRAFT0_CARGOMOVED", 0));
						if (_distanceTraveled >= 3000) {
							cargo = cargo * 3;
						} else if (_distanceTraveled >= 2000) {							
							cargo = cargo * 2;
						}
						totalCargoMoved += cargo;
						LocalStorage.setValueForKey (totalCargoMoved, "MOONCRAFT0_CARGOMOVED");
						LocalStorage.setValueForKey (_base.display_name, "MOONCRAFT0_BASEDEPARTED");
						_debriefingState = debriefing_state.cargoUnload;	// --> cargoUnload
					}
				} else {
					_debriefingState = debriefing_state.rank;				// --> rank
				}
				_interStatialTime = _referenceTime + 1000;
				_referenceTime = currentTime + _referenceDuration;
			}
			break
			
			case debriefing_state.cargoUnload:
			if (currentTime > _referenceTime) {
				var cargo = Math.floor (MoonFlyingState.cargo () / 100) / 10;
				if (cargo > 0) {
					if (cargo === 1) {
						MoonBaseMonitor.pushText ("You delivered " + cargo + " ton of cargo.");
					} else {
						MoonBaseMonitor.pushText ("You delivered " + cargo + " tons of cargo.");						
					}
					if (_distanceTraveled >= 3000) {
						MoonBaseMonitor.pushText ("3X bonus for long delivery!");
					} else if (_distanceTraveled >= 2000) {
						MoonBaseMonitor.pushText ("2X bonus for long delivery!");
					}
					MoonBaseMonitor.pushText (" ");
				}
				MoonBaseMonitor.pushText ("Your rank is: " + Mooncraft.playerTitle () + ".");
				if (Mooncraft.playerRank () > _wasRank) {
					MoonBaseMonitor.pushText ("Congratulations on the advancement!")
				}
				_referenceDuration = 2000;
				_referenceTime = currentTime + _referenceDuration;
				_debriefingState = debriefing_state.rank;					// --> rank
			} else if (currentTime > _interStatialTime) {
				if (_textScratch) {
					_textScratch = _textScratch + ".";
					MoonBaseMonitor.pushText ("\u0008" + _textScratch);
				}
				_interStatialTime = _interStatialTime + 1000;
			}
			break
			
			case debriefing_state.rank:
			if (currentTime > _referenceTime) {
				var fuelLevel = Math.floor (MoonFlyingState.fuelPercentage ());
				if (fuelLevel < 100) {
					MoonBaseMonitor.pushText (" ");
					MoonBaseMonitor.pushText ("Fuel status:");
					MoonBaseMonitor.pushText ("Remaining fuel: " + fuelLevel + "%");
					_textScratch = "Refueling...";
					MoonBaseMonitor.pushText (_textScratch);
					_referenceDuration = ((100 - fuelLevel) * 50) + 1000;
					MoonFlyingState.setFuelPercentage (100);
				} else {
					_textScratch = null;
					_referenceDuration = 50;
				}
				_debriefingState = debriefing_state.fuelStatus;				// --> fuelStatus
				_interStatialTime = _referenceTime + 1000;
				_referenceTime = currentTime + _referenceDuration;
			}
			break
			
			case debriefing_state.fuelStatus:
			if (currentTime > _referenceTime) {
				if (Mooncraft.isApprentice ()) {
					MoonBaseMonitor.pushText (" ");
					MoonBaseMonitor.pushText ("As you are an Apprentice, we're loading");
					MoonBaseMonitor.pushText ("your craft with only 0.5 T of cargo.");
					MoonFlyingState.setCargo (500);
					_debriefingState = debriefing_state.cargoSelect;		// --> cargoSelect
					_referenceDuration = 3000;
					_referenceTime = currentTime + _referenceDuration;
				} else {
					_cargoSelected = 0;
					MoonBaseMonitor.pushText (" ");
					MoonBaseMonitor.pushText ("Use LEFT/RIGHT to change cargo size.");
					MoonBaseMonitor.pushText ("Hit ENTER (THRUST) to confirm cargo:");
					MoonBaseMonitor.pushText (kCargoSelectedText[_cargoSelected]);
					_waitingForInput = true;
					_debriefingState = debriefing_state.acknowledgeCargo;	// --> acknowledgeCargo
				}
			} else if (currentTime > _interStatialTime) {
				if (_textScratch) {
					_textScratch = _textScratch + ".";
					MoonBaseMonitor.pushText ("\u0008" + _textScratch);
				}
				_interStatialTime = _interStatialTime + 1000;
			}
			break
			
			case debriefing_state.acknowledgeCargo:
			if (!_waitingForInput) {
				if (_input === input_key.enter) {
					switch (_cargoSelected) {
						case 1:
						MoonFlyingState.setCargo (1000);
						break;
						case 2:
						MoonFlyingState.setCargo (1500);
						break;
						case 3:
						MoonFlyingState.setCargo (2000);
						break;
						default:
						MoonFlyingState.setCargo (500);
						break;
					}
					_debriefingState = debriefing_state.cargoSelect;		// --> cargoSelect
					_referenceDuration = 0;
					_referenceTime = currentTime + _referenceDuration;
					MoonSounds.playBeep ();
				} else if (_input === input_key.left) {
					_cargoSelected = _cargoSelected - 1;
					if (_cargoSelected < 0) {
						_cargoSelected = 3;
					}
					MoonBaseMonitor.pushText ("\u0008" + kCargoSelectedText[_cargoSelected] + "\u0007");
					_waitingForInput = true;
				} else if (_input === input_key.right) {
					_cargoSelected = _cargoSelected + 1;
					if (_cargoSelected > 3) {
						_cargoSelected = 0;
					}
					MoonBaseMonitor.pushText ("\u0008" + kCargoSelectedText[_cargoSelected] + "\u0007");
					_waitingForInput = true;
				}
			}
			break
			
			case debriefing_state.cargoSelect:
			if (currentTime > _referenceTime) {
				var cargo = 500;
				MoonBaseMonitor.pushText ("Loading...");
				_textScratch = "Loading...";
				_debriefingState = debriefing_state.cargoLoad;				// --> cargoLoad
				_referenceDuration = (cargo * 3) + 1000;
				_interStatialTime = currentTime + 1000;
				_referenceTime = currentTime + _referenceDuration;
			}
			break
			
			case debriefing_state.cargoLoad:
			if (currentTime > _referenceTime) {
				MoonBaseMonitor.pushText ("Cargo loaded.");
				MoonBaseMonitor.pushText (" ");
				MoonBaseMonitor.pushText ("Nearby bases:");
				var nearBases = LunarFeatures.closestBasesForLocation (_base.loc_x, _base.loc_y);
				var index = 0;
				for (let oneBase of nearBases) {
					if (oneBase.display_name == _base.display_name) {
						continue;
					}
					index = index + 1;
					var heading = LunarFeatures.headingForBase (oneBase.display_name, _base.loc_x, _base.loc_y);
					var deltaX = oneBase.loc_x - _base.loc_x;
					var deltaY = oneBase.loc_y - _base.loc_y;
					var distance = Math.floor (Math.sqrt ((deltaX * deltaX) + (deltaY * deltaY)));
					if ((distance > 2500) && (index > 3)) {
						break;
					}
					MoonBaseMonitor.pushText (oneBase.display_name + ":" + oneBase.name + " [" + heading + ":" + distance + "]");
				}
				MoonBaseMonitor.pushText (" ");
				MoonBaseMonitor.pushText ("Hit ENTER (THRUST) to continue...");
				_waitingForInput = true;
				_debriefingState = debriefing_state.acknowledgeBase;		// --> acknowledgeBase
			} else if (currentTime > _interStatialTime) {
				if (_textScratch) {
					_textScratch = _textScratch + ".";
					MoonBaseMonitor.pushText ("\u0008" + _textScratch);
				}
				_interStatialTime = _interStatialTime + 1000;
			}
			break
			
			case debriefing_state.acknowledgeBase:
			if (!_waitingForInput) {
				if (_input === input_key.enter) {
					MoonBaseMonitor.pushText (" ");
					MoonBaseMonitor.pushText ("Good luck up there!\u0007");
					_debriefingState = debriefing_state.goodbye;			// --> goodbye
					_referenceDuration = 2000;
					_referenceTime = currentTime + _referenceDuration;
				} else {
					MoonSounds.playBeep ();
					_waitingForInput = true;
				}
			}
			break
			
			case debriefing_state.goodbye:
			if (currentTime > _referenceTime) {
				MoonSounds.playHydraulicRaise ();
				_debriefingState = debriefing_state.raising;				// --> raising
				_referenceDuration = 3000;
				_referenceTime = currentTime + _referenceDuration;
			}
			break
			
			case debriefing_state.raising:
			if (currentTime < _referenceTime) {
				MoonFlyingState.raiseLower (1.0 - ((_referenceTime - currentTime) / _referenceDuration));
			} else {
				_debriefingState = debriefing_state.complete;				// --> complete
				_referenceDuration = 1000;
				_referenceTime = currentTime + _referenceDuration;
			}
			MoonFlyingState.updateTerrain ();
			break
			
			case debriefing_state.complete:
			if (currentTime > _referenceTime) {
				handled = false;
			}
			break
			
			default:
			break;
		}
		MoonBaseMonitor.update ();
		
		return handled;
	}
	
	function render (destContext, currentTime) {	
		switch (_debriefingState) {
			case debriefing_state.idle:
			case debriefing_state.complete:
			// No additional drawing for these states.
			break;
			
			case debriefing_state.lowering:
			var progress = 1.0 - ((_referenceTime - currentTime) / _referenceDuration);
			var yOffset = 400 - Math.floor (progress * 399);
			destContext.drawImage (MoonBaseMonitor.getCanvas (), 0, yOffset);
			break;
			
			case debriefing_state.raising:
			var progress = (_referenceTime - currentTime) / _referenceDuration;
			if (_consoleOverlayBottomCanvas) {
				destContext.drawImage (_consoleOverlayBottomCanvas, 0, 266);
			}
			var yOffset = 400 - Math.floor (progress * 399);
			destContext.drawImage (MoonBaseMonitor.getCanvas (), 0, yOffset);
			break;
			
			default:
			destContext.drawImage (MoonBaseMonitor.getCanvas (), 0, 1);
			break;
		}
	}
	
	function enterKeyInput (isOn) {
		if (isOn) {
			if (_input !== input_key.enter) {
				_waitingForInput = false;
				_input = input_key.enter;					
			}
		} else {
			_input = input_key.none;
		}
	}
	
	function leftKeyInput (isOn) {
		if (isOn) {
			if (_input !== input_key.left) {
				_waitingForInput = false;
				_input = input_key.left;
			}
		} else {
			_input = input_key.none;
		}
	}
	
	function rightKeyInput (isOn) {
		if (isOn) {
			if (_input !== input_key.right) {
				_waitingForInput = false;
				_input = input_key.right;
			}
		} else {
			_input = input_key.none;
		}
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonDebriefState.init ();
	
	return {
		init : init, 
		beginDebriefState: beginDebriefState, 
		handleGameState: handleGameState, 
		render: render,
		enterKeyInput: enterKeyInput, 
		leftKeyInput: leftKeyInput, 
		rightKeyInput: rightKeyInput
	};
})();
