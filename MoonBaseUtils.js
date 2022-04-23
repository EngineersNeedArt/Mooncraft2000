// ==============================================================================================================
// MoonBaseUtils.js
// ==============================================================================================================

/// Bases are rendered to the Moon tiles on-the-fly. That is, they are not 'pre-baked in' to the tile.
/// The one function here modifies the elevation and color of the tile voxels covered by the base.
/// Artwork for each of the bases consist of up to four files named 'pad', 'color', 'lift' and 'dynamic'.
/// The pixels of the 'pad' file will be used to map the voxels around 'xLoc, yLoc' to match 'xLoc, yLoc'.
/// Pixels of the 'color' file will blend with the color of voxels around 'xLoc, yLoc'.
/// Pixels of the 'lift' file can raise or lower the elevation of the voxels around 'xLoc, yLoc'.
/// Pixels of the 'dynamic' file indicate where dynamic colors are to be set on voxels around 'xLoc, yLoc'.

var MoonBaseUtils = (function () {
	'use strict';
	
	// --------------------------------------------------------------------------------------------------- Public
	
	/// Center base at 'xLoc, yLoc' (in Moon coordinates), 'baseFilename' is the base (root) filename 
	/// for the base ('pad.png', etc. are appended to 'baseFilename' to locate the base image file). 
	/// If non-null, 'dynamicColor' is an array of dynamic colors to be assigned for 'dynamic' image file.
	
	function addBaseToTile (xLoc, yLoc, baseFilename, dynamicColor) {
		// Get the base "pad" map.
		// Create a 'pad' for the base (level, matching also in color).
		var basePadImage = new Image ();
		basePadImage.src = baseFilename + 'pad.png';
		basePadImage.onload = function () {
			var basePadCanvas = document.createElement ('canvas');
			basePadCanvas.width = basePadImage.width;
			basePadCanvas.height = basePadImage.height;
			var context = basePadCanvas.getContext ('2d');
			context.drawImage (basePadImage, 0, 0);
			var basePadBuffer = context.getImageData (0, 0, basePadCanvas.width, basePadCanvas.height);
			var basePadPixels = basePadBuffer.data;
			var originVoxel = VoxelProvider.voxelForPosition (xLoc, yLoc);
			var originElevation = originVoxel[0] / VoxelProvider.verticalScalar ();
			var originRed = originVoxel[1];
			var originGreen = originVoxel[2];
			var originBlue = originVoxel[3];
			var x, y;
			var deltaX = Math.floor (basePadCanvas.width / 2);
			var deltaY = Math.floor (basePadCanvas.height / 2);
			for (y = 0; y < basePadCanvas.height; y++) {
				for (x = 0; x < basePadCanvas.width; x++) {
					var baseOffset = ((y * basePadCanvas.width) + x) * 4;
					var alpha = basePadPixels[baseOffset + 3];
					if (alpha > 0x01) {
						// Non-clear pixel in base image indicates use same elevation as voxel at base's 'origin'.
						// Non-clear pixel in base image indicates use same color as voxel at base's 'origin'.
						VoxelProvider.setElevationForLocation (xLoc - deltaX + x, yLoc - deltaY + y, [originElevation, alpha]);
						VoxelProvider.setColorForLocation (xLoc - deltaX + x, yLoc - deltaY + y, [originRed, originGreen, originBlue, alpha]);
					}
				}
			}
			
			// Get the base color image.
			// Color the voxels for base.
			var baseColorImage = new Image ();
			baseColorImage.src = baseFilename + 'color.png';
			baseColorImage.onload = function () {
				var baseColorCanvas = document.createElement ('canvas');
				baseColorCanvas.width = baseColorImage.width;
				baseColorCanvas.height = baseColorImage.height;
				var context = baseColorCanvas.getContext ('2d');
				context.drawImage (baseColorImage, 0, 0);
				var baseColorBuffer = context.getImageData (0, 0, baseColorCanvas.width, baseColorCanvas.height);
				var baseColorPixels = baseColorBuffer.data;
				var x, y;
				var deltaX = Math.floor (baseColorCanvas.width / 2);
				var deltaY = Math.floor (baseColorCanvas.height / 2);
				for (y = 0; y < baseColorCanvas.height; y++) {
					for (x = 0; x < baseColorCanvas.width; x++) {
						var baseOffset = ((y * baseColorCanvas.width) + x) * 4;
						var red = baseColorPixels[baseOffset + 0];
						var green = baseColorPixels[baseOffset + 1];
						var blue = baseColorPixels[baseOffset + 2];
						var alpha = baseColorPixels[baseOffset + 3];
						if (alpha > 0x01) {
							// Non-clear pixel in base image indicates blend color from image with color of voxel.
							VoxelProvider.setColorForLocation (xLoc - deltaX + x, yLoc - deltaY + y, [red, green, blue, alpha]);
						}
					}				
				}
				
				// Get the 'lift' image.
				// Lift (or lower) the base voxels corresponding to image.
				var baseLiftImage = new Image ();
				baseLiftImage.src = baseFilename + 'lift.png';
				baseLiftImage.onload = function () {
					var baseLiftCanvas = document.createElement ('canvas');
					baseLiftCanvas.width = baseLiftImage.width;
					baseLiftCanvas.height = baseLiftImage.height;
					var context = baseLiftCanvas.getContext ('2d');
					context.drawImage (baseLiftImage, 0, 0);
					var baseLiftBuffer = context.getImageData (0, 0, baseLiftCanvas.width, baseLiftCanvas.height);
					var baseLiftPixels = baseLiftBuffer.data;
					var x, y;
					var deltaX = Math.floor (baseLiftCanvas.width / 2);
					var deltaY = Math.floor (baseLiftCanvas.height / 2);
					for (y = 0; y < baseLiftCanvas.height; y++) {
						for (x = 0; x < baseLiftCanvas.width; x++) {
							var baseOffset = ((y * baseLiftCanvas.width) + x) * 4;
							var alpha = baseLiftPixels[baseOffset + 3];
							if (alpha == 255) {
							// Opaque pixel in base image indicates voxel elevation should be raised/lowered.
							// Green pixel values in base image pixel > 128 will raise elevation of voxel.
							// Green pixel values in base image pixel < 128 will lower the elevation of voxel.
							var existingElevation = originVoxel[0] / VoxelProvider.verticalScalar ();				
								var lift = existingElevation + baseLiftPixels[baseOffset + 1] - 128;
								VoxelProvider.setElevationForLocation (xLoc - deltaX + x, yLoc - deltaY + y, [lift, alpha]);
							}
						}
					}
					
					// Get the dynamic color image.
					var baseDynamicImage = new Image ();
					baseDynamicImage.src = baseFilename + 'dynamic.png';
					baseDynamicImage.onload = function () {
						var baseDynamicCanvas = document.createElement ('canvas');
						baseDynamicCanvas.width = baseDynamicImage.width;
						baseDynamicCanvas.height = baseDynamicImage.height;
						var context = baseDynamicCanvas.getContext ('2d');
						context.drawImage (baseDynamicImage, 0, 0);
						var baseDynamicBuffer = context.getImageData (0, 0, baseDynamicCanvas.width, baseDynamicCanvas.height);
						var baseDynamicPixels = baseDynamicBuffer.data;
						var x, y;
						var deltaX = Math.floor (baseDynamicCanvas.width / 2);
						var deltaY = Math.floor (baseDynamicCanvas.height / 2);
						for (y = 0; y < baseDynamicCanvas.height; y++) {
							for (x = 0; x < baseDynamicCanvas.width; x++) {
								var baseOffset = ((y * baseDynamicCanvas.width) + x) * 4;
								var red = baseDynamicPixels[baseOffset + 0];
								if (red > 0) {
									VoxelProvider.setColorForLocation (xLoc - deltaX + x, yLoc - deltaY + y, [dynamicColor[0], dynamicColor[1], dynamicColor[2], 0xFF]);
								}
							}
						}
					};
				};
			};
		}
	}
	
	// ------------------------------------------------------------------------------------------------- Revealed
	// Public functions and variables revealed.
	// e.g. call: MoonBaseUtils.addBaseToTile ();
	
	return {
		addBaseToTile: addBaseToTile
	};
})();
