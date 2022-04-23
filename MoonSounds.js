// ==============================================================================================================
// MoonSounds.js
// ==============================================================================================================

/// TODO: a lot of redundant code here for loading sounds. This could be refactored into a single function.

/// Handles play-back of .WAV sounds on Safari and Chrome. The trick with Safari is that you need the user 
/// to have initiated the sound for the audio contexts to be valid. If MoonSounds.init() is called as the 
/// result of user interaction with the web document (touch, keyDown, etc.) then sound playback will be 
/// enabled. Thrust and motor sounds are loops – playback of these sounds toggles the gain on the audio 
/// context. Other sounds are more straight-forward, they play only once when requested.

var MoonSounds = (function () {
	'use strict';
	
	var _initialized = false;
	var _audioContext = null;
	var _thrustGain = null;
	var _attitudeGain = null;
	var _beepBuffer = null;
	var _quindarBuffer = null;
	var _windDownBuffer = null;
	var _hydraulicLowerBuffer = null;
	var _warn0Buffer = null;
	var _warn1Buffer = null;
	var _crashBuffer = null;
	var _hydraulicsBuffer = null;
	var _motorGain = null;
	var _landNormalBuffer = null;
	var _landHardBuffer = null;
	
	// ---------------------------------------------------------------------------------------- Private Functions
	
	function _loadThrustSound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/thruster.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				var source = _audioContext.createBufferSource ();
				source.buffer = buffer;
				source.loop = true;
				_thrustGain = _audioContext.createGain ();
				source.connect (_thrustGain);
				_thrustGain.connect (_audioContext.destination);
				_thrustGain.gain.value = 0.0;
				source.start (0);
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadAttitudeSound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/attitude.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				var source = _audioContext.createBufferSource ();
				source.buffer = buffer;
				source.loop = true;
				_attitudeGain = _audioContext.createGain ();
				source.connect (_attitudeGain);
				_attitudeGain.connect (_audioContext.destination);
				_attitudeGain.gain.value = 0.0;
				source.start (0);
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadBeepSound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/beep0.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				_beepBuffer = buffer;
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadQuindarSound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/quindar.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				_quindarBuffer = buffer;
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadWindDownSound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/windDown.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				_windDownBuffer = buffer;
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadHydraulicLowerSound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/hydraulicLower.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				_hydraulicLowerBuffer = buffer;
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadWarn0Sound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/warn0.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				_warn0Buffer = buffer;
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadWarn1Sound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/warn1.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				_warn1Buffer = buffer;
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadCrashSound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/crash.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				_crashBuffer = buffer;
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadHydraulicsSound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/hydraulics.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				_hydraulicsBuffer = buffer;
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadMotorSound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/motorLoop.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				var source = _audioContext.createBufferSource ();
				source.buffer = buffer;
				source.loop = true;
				_motorGain = _audioContext.createGain ();
				source.connect (_motorGain);
				_motorGain.connect (_audioContext.destination);
				_motorGain.gain.value = 0.0;
				source.start (0);
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadLandNormalSound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/land_normal.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				_landNormalBuffer = buffer;
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _loadLandHardSound () {
		var request = new XMLHttpRequest ();
		request.open ('GET', './sounds/land_hard.wav', true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			let audioData = request.response;
			_audioContext.decodeAudioData (audioData, function (buffer) {
				_landHardBuffer = buffer;
			},
			function (e){
				"Error with decoding audio data" + e.error
			});
		}
		
		request.send ();
	}
	
	function _playSoundBuffer (buffer) {
		if (!_audioContext) {
			return;
		}
		var source = _audioContext.createBufferSource ();
		if (_audioContext.state === 'suspended') {
			_audioContext.resume ()
		}
		source.buffer = buffer;
		source.connect (_audioContext.destination);
		source.start (0);
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	// NOTE: init() must be called from a click, touch or keyDown event or Safari will block audio from playing.
	
	function init () {
		if (_initialized) {
			return;
		}
		
		if (window.webkitAudioContext) {
			_audioContext = new window.webkitAudioContext ();
		} else {
			_audioContext = new window.AudioContext ();
		}
		
		_loadQuindarSound ();
		_loadHydraulicLowerSound ();
		_loadBeepSound ();
		_loadThrustSound ();
		_loadAttitudeSound ();
		_loadWindDownSound ();
		_loadWarn0Sound ();
		_loadWarn1Sound ();
		_loadCrashSound ();
		_loadHydraulicsSound ();
		_loadMotorSound ();
		_loadLandNormalSound ();
		_loadLandHardSound ();
		
		// BOGUS: play one sound from click, touch or keyDown event so Safari allows audio for this web page.
		playQuindar ();
		_initialized = true;
	}
	
	function playThrust () {
		if (_thrustGain) {
			_thrustGain.gain.value = 1.0;
		}
	}
	
	function stopThrust () {
		if (_thrustGain) {
			_thrustGain.gain.value = 0.0;
		}
	}
	
	function playAttitude () {
		if (_attitudeGain) {
			_attitudeGain.gain.value = 1.0;
		}
	}
	
	function stopAttitude () {
		if (_attitudeGain) {
			_attitudeGain.gain.value = 0.0;
		}
	}
	
	function playBeep () {
		_playSoundBuffer (_beepBuffer);
	}
	
	function playQuindar () {
		_playSoundBuffer (_quindarBuffer);
	}
	
	function playWindDown () {
		_playSoundBuffer (_windDownBuffer);
	}
	
	function playHydraulicLower () {
		_playSoundBuffer (_hydraulicLowerBuffer);
	}
	
	function playHydraulicRaise () {
		_playSoundBuffer (_hydraulicLowerBuffer);
	}
	
	function playWarn0 () {
		_playSoundBuffer (_warn0Buffer);
	}
	
	function playWarn1 () {
		_playSoundBuffer (_warn1Buffer);
	}
	
	function playCrash () {
		_playSoundBuffer (_crashBuffer);
	}
	
	function playHydraulics () {
		_playSoundBuffer (_hydraulicsBuffer);
	}
	
	function playMotor () {
		if (_motorGain) {
			_motorGain.gain.value = 1.0;
		}
	}
	
	function stopMotor () {
		if (_motorGain) {
			_motorGain.gain.value = 0.0;
		}
	}
	
	function playLandNormal () {
		_playSoundBuffer (_landNormalBuffer);
	}
	
	function playLandHard () {
		_playSoundBuffer (_landHardBuffer);
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonSounds.init ();
	
	return {
		init: init, 
		playThrust: playThrust, 
		stopThrust: stopThrust, 
		playAttitude: playAttitude, 
		stopAttitude: stopAttitude, 
		playBeep: playBeep, 
		playQuindar: playQuindar, 
		playWindDown: playWindDown, 
		playHydraulicLower: playHydraulicLower, 
		playHydraulicRaise: playHydraulicRaise, 
		playWarn0: playWarn0, 
		playWarn1: playWarn1, 
		playCrash: playCrash, 
		playHydraulics: playHydraulics, 
		playMotor: playMotor, 
		stopMotor: stopMotor, 
		playLandNormal: playLandNormal, 
		playLandHard: playLandHard
	};
})();
