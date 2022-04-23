// ==============================================================================================================
// LunarFeatures.js
// ==============================================================================================================

// Lunar features such as the lunar bases and named craters are stored in a JSON file.
// For each feature there are values to indicate its location in the Moon tile coordinates.
// The top-left voxel has coordinates (0, 0). For the 64ppd Moon tile set, the lower-right 
// voxel has coordinates (23040, 11264).
// For many features, 'display_name' is optional. Some of the longer feature names would be 
// too large to display in the map display: 'display_name' will be abbreviated or null.

var LunarFeatures = (function () {
	'use strict';
	
	
	var _baseArray = null;
	var _craterArray = null;
	
	
	// ---------------------------------------------------------------------------------------- Private Functions
	
	function _compareBaseDistance (a, b) {
		if (((a.loc_x * a.loc_x) + (a.loc_y * a.loc_y)) < ((b.loc_x * b.loc_x) + (b.loc_y * b.loc_y))) {
			return -1;
		}
		return 1;
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	///  Loads the JSON file containing serialized '_baseArray' and '_craterArray'.
	
	function init (filePath) {
		fetch (filePath)
		.then (function (response) {
			return response.json ();
		})
		.then (function (data) {
			_craterArray = data.crater_array;
			_baseArray = data.base_array;
		})
		.catch (function (err) {
			console.log (err);
		});
	}
	
	/// BOGUS: we should not expose this outside LunarFeatures. Replace with basesInRect() -> [].
	
	function baseArray () {
		return _baseArray;
	}
	
	/// BOGUS: we should not expose this outside LunarFeatures. Replace with cratersInRect() -> [].
	
	function craterArray () {
		return _craterArray;
	}
	
	/// Returns an array of bases, sorted closest base to 'x' and 'y' first.
	
	function closestBasesForLocation (x, y) {
		var closestBases = JSON.parse (JSON.stringify (_baseArray));
		for (let oneBase of closestBases) {
			oneBase.loc_x -= x;
			oneBase.loc_y -= y;
		}
		closestBases.sort (_compareBaseDistance)
		for (let oneBase of closestBases) {
			oneBase.loc_x += x;
			oneBase.loc_y += y;
		}
		
		return closestBases;
	}
	
	/// Returns base (if any) where base 'x' and 'y' are within rectangle 'x1, y1, x2, y2'.
	/// BOGUS: return array instead, rename basesInRectangle(), may return empty array or 'null'.
	
	function baseInRectangle (x1, y1, x2, y2) {
		for (let oneBase of _baseArray) {
			if (!(oneBase.loc_x < x1 || oneBase.loc_x >= x2 || oneBase.loc_y < y1 || oneBase.loc_y >= y2)) {
				return oneBase;
			}
		}
		return null;
	}
	
	/// Accessor returns array containing [base.loc_x, base.loc_y].
	/// BOGUS: not consistently used within app. Either remove it or be consistent with accessors.
	
	function locationForBase (display_name) {
		for (let oneBase of _baseArray) {
			if (oneBase.display_name === display_name) {
				var x = oneBase.loc_x;
				var y = oneBase.loc_y; 
				return [x, y];
			}
		}
		
		return null;
	}
	
	/// Given a base's 'display_name' and a point in Moon coordinates, 'relativeX, relativeY', returns one of 
	/// sixteen approximate headings from 'relativeX, relativeY' to the base: "N", "N/NE", "NE", "E/NE", "E", etc. 
	/// May return 'null' if no base matching 'display_name' is found.
	
	function headingForBase (display_name, relativeX, relativeY) {
		var baseLocation = locationForBase (display_name);
		if (baseLocation === null) {
			return null;
		}
		var baseX = baseLocation[0] - relativeX;
		var baseY = baseLocation[1] - relativeY;
		var theta = Math.atan2 (baseX, -baseY);
		if ((theta < 0.1963) && (theta > -0.1963)) {
			return "N";
		} else if ((theta < 0.5890) && (theta > 0)) {
			return "N/NE";
		} else if ((theta > -0.5890) && (theta < 0)) {
			return "N/NW";
		} else if ((theta < 0.9817) && (theta > 0)) {
			return "NE";
		} else if ((theta > -0.9817) && (theta < 0)) {
			return "NW";
		} else if ((theta < 1.374) && (theta > 0)) {
			return "E/NE";
		} else if ((theta > -1.374) && (theta < 0)) {
			return "W/NW";
		} else if ((theta < 1.767) && (theta > 0)) {
			return "E";
		} else if ((theta > -1.767) && (theta < 0)) {
			return "W";
		} else if ((theta < 2.160) && (theta > 0)) {
			return "E/SE";
		} else if ((theta > -2.160) && (theta < 0)) {
			return "W/SW";
		} else if ((theta < 2.552) && (theta > 0)) {
			return "SE";
		} else if ((theta > -2.552) && (theta < 0)) {
			return "SW";
		} else if ((theta < 2.945) && (theta > 0)) {
			return "S/SE";
		} else if ((theta > -2.945) && (theta < 0)) {
			return "S/SW";
		} else {
			return "S";
		}
	}
	
	/// A bounds-test for each crater against point 'x, y' in Moon coordinates.
	/// BOGUS: craters tested as though rectangular with bounds: 'loc_l, loc_t, loc_r, loc_b'.
	
	function craterForLocation (x, y) {
		for (let oneCrater of _craterArray) {
			if (!(oneCrater.loc_l > x || oneCrater.loc_r < x || oneCrater.loc_t > y || oneCrater.loc_b < y)) {
				return oneCrater;
			}
		}
		
		return null;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: LunarFeatures.init ();
	
	return {
		init: init, 
		baseArray: baseArray, 
		craterArray: craterArray, 
		closestBasesForLocation: closestBasesForLocation, 
		baseInRectangle: baseInRectangle, 
		locationForBase: locationForBase, 
		headingForBase: headingForBase, 
		craterForLocation: craterForLocation
	};
})();
