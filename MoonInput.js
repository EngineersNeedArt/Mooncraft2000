// ==============================================================================================================
// MoonInput.js
// ==============================================================================================================

/// Handle keyboard input.
/// For the most part this simply defines what keyboard codes map to the basic game controls: that is, 
/// which keys map to thrust, left yaw, right yaw, etc.
/// A handful of numeric keys though control the toggling of some rendering parameters as well as 
/// turning on and off the FPS display.

var MoonInput = (function () {
	'use strict';
	
	// ---------------------------------------------------------------------------------------- Private Functions
	
	function _initKeys () {
		document.addEventListener ("keydown", (e) =>{
			if ((e.code == "Space") || (e.code == "Enter")) {
				e.preventDefault ();
				Mooncraft.primaryAction (true);
			} else if ((e.code == "ArrowUp") || (e.code == "KeyW")) {
				e.preventDefault ();
				Mooncraft.upAction (true);
			} else if ((e.code == "ArrowDown") || (e.code == "KeyS")) {
				e.preventDefault ();
				Mooncraft.downAction (true);
			} else if ((e.code == "ArrowLeft") || (e.code == "KeyA")) {
				Mooncraft.leftAction (true);
			} else if ((e.code == "ArrowRight") || (e.code == "KeyD")) {
				Mooncraft.rightAction (true);
			}
		});
		
		document.addEventListener ("keyup", (e) =>{
			if ((e.code == "Space") || (e.code == "Enter")) {
				Mooncraft.primaryAction (false);
			} else if ((e.code == "ArrowUp") || (e.code == "KeyW")) {
				Mooncraft.upAction (false);
			} else if ((e.code == "ArrowDown") || (e.code == "KeyS")) {
				Mooncraft.downAction (false);
			} else if ((e.code == "ArrowLeft") || (e.code == "KeyA")) {
				Mooncraft.leftAction (false);
			} else if ((e.code == "ArrowRight") || (e.code == "KeyD")) {
				Mooncraft.rightAction (false);
			} else if (e.code == "Digit1") {
				Mooncraft.toggleDisplayFPS ();					// Toggles display of FPS (and more) in game map.
			} else if (e.code == "Digit2") {
				VoxelCanvas.setPixelDouble (VoxelCanvas.pixelDouble () == false);
			} else if (e.code == "Digit3") {
				VoxelCanvas.setFogEnabled (VoxelCanvas.fogEnabled () == false);
			} else if (e.code == "Digit4") {					// Default off, slow but gives interesting results.
				VoxelCanvas.setInterpolation (VoxelCanvas.interpolation () == false);
			} else if (e.code == "Digit5") {
				Mooncraft.toggleLongRange ();
			} else if (e.code == "Digit0") {
				VoxelCanvas.toggleABCompare ();					// For testing: dev can toggle (A vs. B) code-paths in real time.
				var abCompare = VoxelCanvas.getABCompare ();	// Currently there is no A-B code paths to compare/toggle.
				VoxelProvider.setABCompare (abCompare);
			}
		});
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init () {
		_initKeys ();
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonInput.init ();
	
	return {
		init: init
	};
})();
