// ==============================================================================================================
// VoxelProvider.js
// ==============================================================================================================

// Tiles are assumed to be square (and a power of 2 for the edge dimension).
// Tiles consist of an array of four 8-bit values per voxel in "ERGB" format: Elevation, Red, Green, Blue.
// The 'manifest' is a JSON file that gives properties for the tile data set. Properties like:
// How many rows, columns, the tile dimension, the tile format, an array of file names for the tiles, etc.

var VoxelProvider = (function () {
	'use strict';
	
	const tile_state = {
		unloaded_tile : 0,
		loading_tile : 1,
		loaded_tile : 2,
	}
	
	class Tile {
		constructor (width, height, index) {
			this.width = width;
			this.height = height;
			this.index = index;
			this.state = tile_state.unloaded_tile;
			this.voxel1Data = null;
			this.voxel4Data = null;
			this.voxel16Data = null;
		}
	}
	
	var _tileFormat;
	var _basePath = null;
	var _ppd = 64;
	var _columnCount = 0;
	var _rowCount = 0;
	var _tileDimension = 2;
	var _bytesPerVoxel = 4;
	var _color0Offset = 1;
	var _color1Offset = 2;
	var _color2Offset = 3;
	var _tilePowerOf2 = 1;
	var _tileBitmask = 1
	var _tileNamePattern = null;
	var _wrapHorizontally = false;
	var _wrapVertically = false;
	var _verticalScalar = 160;
	var _tiles = null;
	var _loadedTileCount = 0;
	
	var _dynamicColor0 = [0x00, 0x00, 0x00];		// Dynamic colors.
	var _dynamicColor0Min = [0x33, 0x00, 0x00];
	var _dynamicColor0Max = [0xFF, 0x00, 0x00];
	var _dynamicColor0Period = 2;
	var _dynamicColor0Phase = 0;
	
	var _dynamicColor1 = [0x00, 0x00, 0x00];
	var _dynamicColor1Min = [0x00, 0x33, 0x00];
	var _dynamicColor1Max = [0x00, 0xFF, 0x00];
	var _dynamicColor1Period = 2;
	var _dynamicColor1Phase = 0;
	
	var _tileLoadCallback = null;
	
	var _abCompare = true;
	
	// ---------------------------------------------------------------------------------------- Private Functions
	
	function _loadManifest (manifestPath) {
		fetch (manifestPath)
		.then (function (response) {
			return response.json ();
		})
		.then (function (data) {
			_ppd = data.ppd;
			_columnCount = data.columnCount;
			_rowCount = data.rowCount;
			_tileDimension = data.tileDimension;
			_tilePowerOf2 = Math.log2 (_tileDimension);	// BOGUS, should param check.
			_tileBitmask = _tileDimension - 1;
			
			_tileFormat = data.format;
			if (_tileFormat == "eRGB8") {
				_bytesPerVoxel = 4;
				_color0Offset = 1;
				_color1Offset = 2;
				_color2Offset = 3;
			} else if  (_tileFormat == "eW8") {
				_bytesPerVoxel = 2;
				_color0Offset = 1;
				_color1Offset = 1;
				_color2Offset = 1;
			} else {
				console.log ("Error, unsupported tile format.")
				return;
			}
			
			_wrapHorizontally = data.wrapHorizontally;
			_wrapVertically = data.wrapVertically;
			_verticalScalar = data.verticalScalar;
			_tileNamePattern = data.tileNamePattern;
			
			// Initialize tile array.
			_tiles = new Array ();
			var row, column;
			var index = 0;
			for (row = 0; row < _rowCount; row++) {
				for (column = 0; column < _columnCount; column++) {
					// All tiles initially state = unloaded_tile (need to fetch).
					var emptyTile = new Tile (_tileDimension, _tileDimension, index);
					_tiles.push (emptyTile);
					index++;
				}
			}
		})
		.catch (function (err) {
			console.log (err);
		});
	}
	
	function _mipmapVoxel4Data (tile) {
		var mipmapDimension = _tileDimension >> 2;
		var mipmapData = new Uint8Array (mipmapDimension * mipmapDimension * _bytesPerVoxel);
		var x, y;
		var index = 0;
		
		for (y = 0; y < mipmapDimension; y++) {
			for (x = 0; x < mipmapDimension; x++) {
				var elevation = 0;
				var color0 = 0;
				var color1 = 0;
				var color2 = 0;
				
				var i, j;
				for (j = 0; j < 4; j++) {
					for (i = 0; i < 4; i++) {
						var tileX = (x * 4) + i;
						var tileY = (y * 4) + j;
						var offset = ((tileY * _tileDimension) + tileX) * _bytesPerVoxel;
						elevation += tile.voxel1Data[offset];
						color0 += tile.voxel1Data[offset + _color0Offset];
						color1 += tile.voxel1Data[offset + _color1Offset];
						color2 += tile.voxel1Data[offset + _color2Offset];
					}
				}
				
				mipmapData[index] = Math.floor (elevation / 16);
				index += 1;
				mipmapData[index] = Math.floor (color0 / 16);
				index += 1;
				if (_bytesPerVoxel == 4) {
					mipmapData[index] = Math.floor (color1 / 16);
					index += 1;
					mipmapData[index] = Math.floor (color2 / 16);
					index += 1;
				}
			}
		}
		
		return mipmapData;
	}
	
	function _mipmapVoxel16Data (tile) {
		var sourceDimension = _tileDimension >> 2;
		var mipmapDimension = _tileDimension >> 4;
		var mipmapData = new Uint8Array (mipmapDimension * mipmapDimension * _bytesPerVoxel);
		var x, y;
		var index = 0;
		
		for (y = 0; y < mipmapDimension; y++) {
			for (x = 0; x < mipmapDimension; x++) {
				var elevation = 0;
				var color0 = 0;
				var color1 = 0;
				var color2 = 0;
				
				var i, j;
				for (j = 0; j < 4; j++) {
					for (i = 0; i < 4; i++) {
						var tileX = (x * 4) + i;
						var tileY = (y * 4) + j;
						var offset = ((tileY * sourceDimension) + tileX) * _bytesPerVoxel;
						elevation += tile.voxel4Data[offset];
						color0 += tile.voxel4Data[offset + _color0Offset];
						color1 += tile.voxel4Data[offset + _color1Offset];
						color2 += tile.voxel4Data[offset + _color2Offset];
					}
				}
				
				mipmapData[index] = Math.floor (elevation / 16);
				index += 1;
				mipmapData[index] = Math.floor (color0 / 16);
				index += 1;
				if (_bytesPerVoxel == 4) {
					mipmapData[index] = Math.floor (color1 / 16);
					index += 1;
					mipmapData[index] = Math.floor (color2 / 16);
					index += 1;
				}
			}
		}
		
		return mipmapData;
	}
	
	function _loadMapTile (row, column) {
		var index = (row * _columnCount) + column;
		_tiles[index].state = tile_state.loading_tile;
		
		// Make an HTTP request to fetch the tile.
		var request = new XMLHttpRequest ();
		var tilename = _basePath + _tileNamePattern.replace ("${column}", column).replace ("${row}", row);
		request.open ('GET', tilename, true);
		request.responseType = 'arraybuffer';
		request.onload = function (e) {
			_tiles[index].voxel1Data = new Uint8Array (this.response);
			_tiles[index].voxel4Data = _mipmapVoxel4Data (_tiles[index]);
			_tiles[index].voxel16Data = _mipmapVoxel16Data (_tiles[index]);
			_tiles[index].state = tile_state.loaded_tile;
			_loadedTileCount = _loadedTileCount + 1;
			console.log ("Loaded tile for (" + row + "," + column + ").");
			console.log ("Loaded " + _loadedTileCount + " tiles.");
			if (_tileLoadCallback) {
				_tileLoadCallback (row, column)
			}
		};
		request.send ();
	}
	
	function _updateDynamicColor0 () {
		var milli = window.performance.now ();
		var milliPeriod = 1000 * _dynamicColor0Period;
		var progress = (Math.sin (((milli % milliPeriod) / milliPeriod) * (Math.PI * 2)) + 1.0) / 2.0;
		_dynamicColor0[0] = _dynamicColor0Min[0] + (progress * (_dynamicColor0Max[0] - _dynamicColor0Min[0]));
		_dynamicColor0[1] = _dynamicColor0Min[1] + (progress * (_dynamicColor0Max[1] - _dynamicColor0Min[1]));
		_dynamicColor0[2] = _dynamicColor0Min[2] + (progress * (_dynamicColor0Max[2] - _dynamicColor0Min[2]));
	}
	
	function _updatedynamicColor1 () {
		var milli = window.performance.now ();
		var milliPeriod = 1000 * _dynamicColor1Period;
		var progress = (Math.sin (((milli % milliPeriod) / milliPeriod) * (Math.PI * 2)) + 1.0) / 2.0;
		_dynamicColor1[0] = _dynamicColor1Min[0] + (progress * (_dynamicColor1Max[0] - _dynamicColor1Min[0]));
		_dynamicColor1[1] = _dynamicColor1Min[1] + (progress * (_dynamicColor1Max[1] - _dynamicColor1Min[1]));
		_dynamicColor1[2] = _dynamicColor1Min[2] + (progress * (_dynamicColor1Max[2] - _dynamicColor1Min[2]));
	}
	
	function _weighValuesByFactor (c1, c2, factor) {
		// Factor in the range of (0...255).
		return ((c1 * factor) + (c2 * (0xFF - factor)) >>> 8);
	}
	
	function _normalizeDegrees (degrees) {
		if (degrees < 0) {
			return (degrees % 360) + 360;
		} else if (degrees > 360) {
			return degrees % 360;
		} else {
			return degrees;
		}
	}
	
	// ----------------------------------------------------------------------------------------- Public Functions
	
	function init (manifestPath) {
		_basePath = manifestPath.substring (0, manifestPath.lastIndexOf('/') + 1);
		_loadManifest (manifestPath);
		
		_updateDynamicColor0 ();
		_updatedynamicColor1 ();
	}
	
	function bogusUpdateDynamicColors () {
		_updateDynamicColor0 ();
		_updatedynamicColor1 ();
	}
	
	function ppd () {
		return _ppd;
	}
	
	function verticalScalar () {
		return _verticalScalar;
	}
	
	function setDynamicColor0 (min, max, period) {
		_dynamicColor0Min[0] = min[0];
		_dynamicColor0Min[1] = min[1];
		_dynamicColor0Min[2] = min[2];

		_dynamicColor0Max[0] = max[0];
		_dynamicColor0Max[1] = max[1];
		_dynamicColor0Max[2] = max[2];
		
		_dynamicColor0Period = period;
	}
	
	function setdynamicColor1 (min, max, period) {
		_dynamicColor1Min[0] = min[0];
		_dynamicColor1Min[1] = min[1];
		_dynamicColor1Min[2] = min[2];

		_dynamicColor1Max[0] = max[0];
		_dynamicColor1Max[1] = max[1];
		_dynamicColor1Max[2] = max[2];
		
		_dynamicColor1Period = period;
	}
	
	function tileForRowColumn (row, column) {
		if ((row < 0) || (row >= _rowCount) || (column < 0) || (column >= _columnCount)) {
			return null;
		}
		
		var tile = _tiles[(row * _columnCount) + column];
		switch (tile.state) {
			// Not loaded, begin loading and return placeholder data.
			case tile_state.unloaded_tile:
			_loadMapTile (row, column);
			return null;
			break;
			
			// Still loading, return placeholder data.
			case tile_state.loading_tile:
			return null;
			break;
			
			// Return (loaded) data.
			default:	// tile_state.loaded_tile
			return tile;
		}
	}
	
	function setColorForLocation (x, y, color) {
		// Determine column and row indicees.
		var column = x >> _tilePowerOf2;
		if (_wrapHorizontally) {
			if (column >= _columnCount) {
				column = column % _columnCount;
			} else if (column < 0) {
				column = _columnCount + (column % _columnCount);
			}				
		}
		var row = y >> _tilePowerOf2;
		if (_wrapVertically) {
			if (row >= _rowCount) {
				row = row % _rowCount;
			} else if (row < 0) {
				row = _rowCount + (row % _rowCount);
			}
		}
		
		var tile = tileForRowColumn (row, column);
		if (tile) {
			var localX = x & _tileBitmask;
			var localY = y & _tileBitmask;
			var offset = ((localY * _tileDimension) + localX) * _bytesPerVoxel;
			var voxelmap = tile.voxel1Data;
			
			var alpha = color[3];
			if (alpha === 0xFF) {
				voxelmap[offset + _color0Offset] = color[0];
				voxelmap[offset + _color2Offset] = color[2];
				voxelmap[offset + _color1Offset] = color[1];
			} else {
				voxelmap[offset + _color0Offset] = _weighValuesByFactor (color[0], voxelmap[offset + _color0Offset], alpha);
				voxelmap[offset + _color2Offset] = _weighValuesByFactor (color[2], voxelmap[offset + _color2Offset], alpha);
				voxelmap[offset + _color1Offset] = _weighValuesByFactor (color[1], voxelmap[offset + _color1Offset], alpha);
			}
		}
	}
	
	function setElevationForLocation (x, y, elevation) {
		// Determine column and row indicees.
		var column = x >> _tilePowerOf2;
		if (_wrapHorizontally) {
			if (column >= _columnCount) {
				column = column % _columnCount;
			} else if (column < 0) {
				column = _columnCount + (column % _columnCount);
			}				
		}
		var row = y >> _tilePowerOf2;
		if (_wrapVertically) {
			if (row >= _rowCount) {
				row = row % _rowCount;
			} else if (row < 0) {
				row = _rowCount + (row % _rowCount);
			}
		}
		
		var tile = tileForRowColumn (row, column);
		if (tile) {
			var localX = x & _tileBitmask;
			var localY = y & _tileBitmask;
			var offset = ((localY * _tileDimension) + localX) * _bytesPerVoxel;
			var voxelmap = tile.voxel1Data;
			
			var alpha = elevation[1];
			if (alpha === 0xFF) {
				voxelmap[offset] = elevation[0];
			} else {
				voxelmap[offset] = _weighValuesByFactor (elevation[0], voxelmap[offset], alpha);
			}
		}
	}
	
	function voxelForPosition (x, y) {
		// Determine column and row indicees.
		var column = x >> _tilePowerOf2;
		if (_wrapHorizontally) {
			if (column >= _columnCount) {
				column = column % _columnCount;
			} else if (column < 0) {
				column = _columnCount + (column % _columnCount);
			}				
		}
		var row = y >> _tilePowerOf2;
		if (_wrapVertically) {
			if (row >= _rowCount) {
				row = row % _rowCount;
			} else if (row < 0) {
				row = _rowCount + (row % _rowCount);
			}
		}
		
		var localX = x & _tileBitmask;
		var localY = y & _tileBitmask;
		var tile = tileForRowColumn (row, column);
		if (tile === null) {
			return [0x00, 0x00, (localX % 16 === 0) || (localY % 16 === 0), 0x00, false];
		}
		var offset = ((localY * _tileDimension) + localX) * _bytesPerVoxel;
		var voxelmap = tile.voxel1Data;
		var elevation = voxelmap[offset] * _verticalScalar;
		var red = voxelmap[offset + _color0Offset];
		var green = voxelmap[offset + _color1Offset];
		var blue = voxelmap[offset + _color2Offset];
		var dynamic = false;
		if (red >= 0xFD) {
			if (_bytesPerVoxel == 2) {
				if (red == 0xFF) {
					red = _dynamicColor0[0];
					green = _dynamicColor0[1];
					blue = _dynamicColor0[2];
				} else {
					red = _dynamicColor1[0];
					green = _dynamicColor1[1];
					blue = _dynamicColor1[2];
				}
				dynamic = true;
			} else if (red == 0xFF) {
				red = _dynamicColor0[0];
				green = _dynamicColor0[1];
				blue = _dynamicColor0[2];
				dynamic = true;
			}
		} else if (green == 0xFF) {
			red = _dynamicColor1[0];
			green = _dynamicColor1[1];
			blue = _dynamicColor1[2];
			dynamic = true;
		}
		
		return [elevation, red, green, blue, dynamic];
	}
	
	function voxel4By4ForPosition (x, y) {
		// Determine column and row indicees.
		var column = x >> _tilePowerOf2;
		if (_wrapHorizontally) {
			if (column >= _columnCount) {
				column = column % _columnCount;
			} else if (column < 0) {
				column = _columnCount + (column % _columnCount);
			}				
		}
		var row = y >> _tilePowerOf2;
		if (_wrapVertically) {
			if (row >= _rowCount) {
				row = row % _rowCount;
			} else if (row < 0) {
				row = _rowCount + (row % _rowCount);
			}
		}
		
		var localX = x & _tileBitmask;
		var localY = y & _tileBitmask;
		var tile = tileForRowColumn (row, column);
		if (tile === null) {
			return [0x00, 0x00, (localX % 16 === 0) || (localY % 16 === 0), 0x00, false];
		}
		localX = localX >> 2;
		localY = localY >> 2;
		var mipmapDimension = _tileDimension >> 2;
		var offset = ((localY * mipmapDimension) + localX) * _bytesPerVoxel;
		var voxelmap = tile.voxel4Data;
		var elevation = voxelmap[offset] * _verticalScalar;
		var red = voxelmap[offset + _color0Offset];
		var green = voxelmap[offset + _color1Offset];
		var blue = voxelmap[offset + _color2Offset];
		var dynamic = false;
		if (red == 0xFF) {
			red = _dynamicColor0[0];
			green = _dynamicColor0[1];
			blue = _dynamicColor0[2];
			dynamic = true;
		} else if (green == 0xFF) {
			red = _dynamicColor1[0];
			green = _dynamicColor1[1];
			blue = _dynamicColor1[2];
			dynamic = true;
		}
		
		return [elevation, red, green, blue, dynamic];
	}
	
	function voxel16By16ForPosition (x, y) {
		// Determine column and row indicees.
		var column = x >> _tilePowerOf2;
		if (_wrapHorizontally) {
			if (column >= _columnCount) {
				column = column % _columnCount;
			} else if (column < 0) {
				column = _columnCount + (column % _columnCount);
			}				
		}
		var row = y >> _tilePowerOf2;
		if (_wrapVertically) {
			if (row >= _rowCount) {
				row = row % _rowCount;
			} else if (row < 0) {
				row = _rowCount + (row % _rowCount);
			}
		}
		
		var localX = x & _tileBitmask;
		var localY = y & _tileBitmask;
		var tile = tileForRowColumn (row, column);
		if (tile === null) {
			return [0x00, 0x00, (localX % 16 === 0) || (localY % 16 === 0), 0x00, false];
		}
		localX = localX >> 4;
		localY = localY >> 4;
		var mipmapDimension = _tileDimension >> 4;
		var offset = ((localY * mipmapDimension) + localX) * _bytesPerVoxel;
		var voxelmap = tile.voxel16Data;
		var elevation = voxelmap[offset] * _verticalScalar;
		var red = voxelmap[offset + _color0Offset];
		var green = voxelmap[offset + _color1Offset];
		var blue = voxelmap[offset + _color2Offset];
		var dynamic = false;
		if (red == 0xFF) {
			red = _dynamicColor0[0];
			green = _dynamicColor0[1];
			blue = _dynamicColor0[2];
			dynamic = true;
		} else if (green == 0xFF) {
			red = _dynamicColor1[0];
			green = _dynamicColor1[1];
			blue = _dynamicColor1[2];
			dynamic = true;
		}
		
		return [elevation, red, green, blue, dynamic];
	}
	
	function interpolatedVoxelForPositionA (x, y) {
		var voxel00 = voxelForPosition (x, y);
		// if (voxel00[4]) {
		// 	return voxel00;
		// }
		var voxel10 = voxelForPosition (x + 1, y);
		// if (voxel10[4]) {
		// 	return voxel00;
		// }
		var voxel01 = voxelForPosition (x, y + 1);
		// if (voxel01[4]) {
		// 	return voxel00;
		// }
		var voxel11 = voxelForPosition (x + 1, y + 1);
		// if (voxel11[4]) {
		// 	return voxel00;
		// }
		var xFraction = x - Math.floor(x);
		var yFraction = y - Math.floor(y);
		var elevation = (yFraction * ((xFraction * voxel11[0]) + ((1 - xFraction) * voxel01[0]))) + ((1 - yFraction) * ((xFraction * voxel10[0]) + ((1 - xFraction) * voxel00[0])));
		var red = (yFraction * ((xFraction * voxel11[1]) + ((1 - xFraction) * voxel01[1]))) + ((1 - yFraction) * ((xFraction * voxel10[1]) + ((1 - xFraction) * voxel00[1])));
		var green = (yFraction * ((xFraction * voxel11[2]) + ((1 - xFraction) * voxel01[2]))) + ((1 - yFraction) * ((xFraction * voxel10[2]) + ((1 - xFraction) * voxel00[2])));
		var blue = (yFraction * ((xFraction * voxel11[3]) + ((1 - xFraction) * voxel01[3]))) + ((1 - yFraction) * ((xFraction * voxel10[3]) + ((1 - xFraction) * voxel00[3])));
		return [elevation, red, green, blue];
	}
	
	function interpolatedVoxelForPositionB (x, y) {
		var voxel00 = voxelForPosition (x, y);
		var voxel10 = voxelForPosition (x + 1, y);
		var voxel01 = voxelForPosition (x, y + 1);
		var voxel11 = voxelForPosition (x + 1, y + 1);
		var xFraction = (x - Math.floor(x)) * 256;
		var yFraction = (y - Math.floor(y)) * 256;
		var elevation = _weighValuesByFactor (_weighValuesByFactor (voxel11[0], voxel01[0], xFraction), _weighValuesByFactor (voxel10[0], voxel00[0], xFraction), yFraction);
		var red = _weighValuesByFactor (_weighValuesByFactor (voxel11[1], voxel01[1], xFraction), _weighValuesByFactor (voxel10[1], voxel00[1], xFraction), yFraction);
		var green = _weighValuesByFactor (_weighValuesByFactor (voxel11[2], voxel01[2], xFraction), _weighValuesByFactor (voxel10[2], voxel00[2], xFraction), yFraction);
		var blue = _weighValuesByFactor (_weighValuesByFactor (voxel11[3], voxel01[3], xFraction), _weighValuesByFactor (voxel10[3], voxel00[3], xFraction), yFraction);
		return [elevation, red, green, blue];
	}
	
	function voxelElevationArray (start_x, start_y, end_x, end_y, count) {
		var heightArray = [];
		var x = start_x;
		var y = start_y;
		var stepX = (end_x - start_x) / (count - 1);
		var stepY = (end_y - start_y) / (count - 1);
		var i;
		
		for (i = 0; i < count; i++) {
			var voxel = voxelForPosition (x, y);
			heightArray.push (voxel[0]);
			x += stepX;
			y += stepY;
		}
		
		return heightArray;
	}
	
	function voxelColorArray (start_x, start_y, end_x, end_y, count) {
		var colorArray = [];
		var x = start_x;
		var y = start_y;
		var stepX = (end_x - start_x) / (count - 1);
		var stepY = (end_y - start_y) / (count - 1);
		var i;
		
		for (i = 0; i < count; i++) {
			var voxel = voxelForPosition (x, y);
			if (voxel[1] == 0xFF) {
				colorArray.push (_dynamicColor0[0]);
				colorArray.push (_dynamicColor0[1]);
				colorArray.push (_dynamicColor0[2]);
			} else if (voxel[2] == 0xFF) {
				colorArray.push (_dynamicColor1[0]);
				colorArray.push (_dynamicColor1[1]);
				colorArray.push (_dynamicColor1[2]);
			} else {
				colorArray.push (voxel[1]);
				colorArray.push (voxel[2]);
				colorArray.push (voxel[3]);
			}
			colorArray.push (0xFF);		// Alpha.
			x += stepX;
			y += stepY;
		}
		
		return colorArray;
	}
	
	/// Assumes tiles cover the entire equatorial circumference of the moon.
	/// Assumes left edge (x_pos == 0) is 180 degrees, halfway across is 0 degrees.
	
	function longitudeForXPosition (x_pos) {
		return _normalizeDegrees ((x_pos / (_columnCount * _tileDimension) * 360) + 180.0);
	}
	
	/// Assumes vertical center of map is zero degrees latitude.
	/// Assumes vertical scale in degrees same as horizontal scale in degrees (Mercator?).
	
	function latitudeForYPosition (y_pos) {
		return ((((_rowCount * _tileDimension) / 2) - y_pos) / (_columnCount * _tileDimension) * 360);
	}
	
	function xPositionForLongitude (longitude) {
		return ((_normalizeDegrees (longitude - 180) / 360) * (_columnCount * _tileDimension));
	}
	
	function yPositionForLatitude (latitude) {
		return (((-latitude / 360) * (_columnCount * _tileDimension)) + ((_rowCount * _tileDimension) / 2));
	}
	
	function normalizedXPosition (x_pos) {	// BOGUS: NEED TO HANDLE MIN/MAX FOR NON-WRAPAROUND CASE
		if (x_pos > (_columnCount * _tileDimension)) {
			return x_pos % (_columnCount * _tileDimension);
		} else if (x_pos < 0) {
			return (_columnCount * _tileDimension) + (x_pos % (_columnCount * _tileDimension));
		} else {
			return x_pos;
		}
	}
	
	function normalizedYPosition (y_pos) {	// BOGUS: NEED TO HANDLE MIN/MAX AND WRAPAROUND CASE
		if (y_pos >= (_rowCount * _tileDimension)) {
			return (_rowCount * _tileDimension) - 1;
		} else if (y_pos < 0) {
			return 0;
		} else {
			return y_pos;
		}
	}
	
	function setTileLoadCallback (callback) {
		_tileLoadCallback = callback;
	}
	
	function setABCompare (value) {
		_abCompare = value;
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: VoxelProvider.init ();
	
	return {
		init: init,
		bogusUpdateDynamicColors: bogusUpdateDynamicColors, 
		ppd: ppd, 
		verticalScalar: verticalScalar, 
		setDynamicColor0: setDynamicColor0, 
		setdynamicColor1: setdynamicColor1, 
		tileForRowColumn: tileForRowColumn, 
		setColorForLocation: setColorForLocation, 
		setElevationForLocation: setElevationForLocation, 
		voxelForPosition: voxelForPosition, 
		voxel4By4ForPosition: voxel4By4ForPosition, 
		voxel16By16ForPosition: voxel16By16ForPosition, 
		interpolatedVoxelForPositionA: interpolatedVoxelForPositionA, 
		interpolatedVoxelForPositionB: interpolatedVoxelForPositionB, 
		voxelElevationArray: voxelElevationArray, 
		voxelColorArray: voxelColorArray, 
		longitudeForXPosition: longitudeForXPosition, 
		latitudeForYPosition: latitudeForYPosition, 
		xPositionForLongitude: xPositionForLongitude, 
		yPositionForLatitude: yPositionForLatitude, 
		normalizedXPosition: normalizedXPosition, 
		normalizedYPosition: normalizedYPosition, 
		setTileLoadCallback: setTileLoadCallback, 
		setABCompare: setABCompare
	};
})();
