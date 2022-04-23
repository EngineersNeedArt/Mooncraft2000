// ==============================================================================================================
// LocalStorage.js
// ==============================================================================================================


var LocalStorage = (function () {
	'use strict';	
	
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	///  Returns 'true' is 'key' exists.
	
	function valueForKeyExists (key) {
		return (localStorage.getItem (key) != null)
	}
	
	/// Returns value for 'key' - optional 'defaultValue'. 
	/// Cast the return value to a number with +(valueForKey(k, d))
	
	function valueForKey (key, defaultValue) {
		var storedValue = localStorage.getItem (key);
		if (storedValue === null) {
			if (defaultValue !== null) {
				localStorage.setItem (key, defaultValue);
			}
			return defaultValue;
		}
		
		return storedValue;
	}
	
	///  Assigns 'key' for 'storedValue'.
	
	function setValueForKey (storedValue, key) {
		localStorage.setItem (key, storedValue);
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: LocalStorage.valueForKeyExists ();
	
	return {
		valueForKeyExists: valueForKeyExists, 
		valueForKey: valueForKey, 
		setValueForKey: setValueForKey
	};
})();
