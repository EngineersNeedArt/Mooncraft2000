// ==============================================================================================================
// FPS.js
// ==============================================================================================================

// TODO: Maybe a running-average FPS so I can decide whether to enable/disable some graphical features and 
// make the appearance/performance trade-off.

var FPS = (function () {
	'use strict';
	
	var _ticks = 0;
	var _fps = 60;
	var _startTime;
	var _nextSecond = window.performance.now () + 1000;
	var _frameCount = 0;
	
	// --------------------------------------------------------------------------------------------------- Public
	
	/// Should be called only once.
	
	function init () {
		_nextSecond = window.performance.now () + 1000;
	}
	
	/// Called when the code that executes one game-loop is begun.
	
	function startFrame () {
		_startTime = window.performance.now ();
		return _startTime;
	}
	
	/// Called when the code that executes one game-loop is complete. Returns the time in milliseconds 
	/// required for the one frame. This is not the same as FPS since the actual canvas rendering is 
	/// likely clamped to 1/60 second. This does allow you to observe the effect of changes to your code 
	/// on the time to *prepare* one frame.
	/// Note, endFrame() must be called once per game loop for FPS to be correct.
	
	function endFrame () {
		var endTime = window.performance.now ();
		
		// Get time for one game loop, compute FPS.
		_frameCount++;
		if (endTime > _nextSecond) {
			_nextSecond += 1000;
			_fps = _frameCount;
			_frameCount = 0;
		}
		
		_ticks = _ticks + 1;
		
		return endTime - _startTime;
	}
	
	/// Returns current frames-per-second.
	/// Note, endFrame() must be called once per game loop for FPS to be correct.
	
	function fps () {
		return _fps;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: FPS.startFrame ();
	
	return {
		init: init, 
		startFrame: startFrame, 
		endFrame: endFrame, 
		fps: fps
	};
})();
