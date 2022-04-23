# Mooncraft 2000

A voxelish game &mdash; set on the Moon &mdash; in Javascript.

The game is being hosted here: https://mooncraft2000.com

I experimented with a few tricks to try to keep this classic pseudo-voxel algorithm fast (but it still falls down on older or slower hardware). I'm also learning Javascript.

<p align="center">
<img src="https://github.com/EngineersNeedArt/Mooncraft2000/blob/07a643031af5796f521418073956f04901b00056/documentation/Screenshot.jpg" alt="Mooncraft 2000 screenshot.">
</p>

The game renders the Moon from actual data pulled from NASA and other space-agencies. As an Apprentice moon trucker, you fly your mooncraft from lunar base to lunar base moving cargo to where it's needed. Truck enough cargo to earn your Journeyman certification and you'll be on your way to achieving Master.

### How to Play

If your browser is running on a desktop machine there are just five keyboard controls:
+ 'Space Bar' or 'Return' — Thrust (lift)
+ 'A' or 'Left Arrow' — Turn left (left yaw)
+ 'D' or 'Right Arrow' — Turn right (right yaw)
+ 'W' or 'Up Arrow' — Forward acceleration (forward thrust)
+ 'S' or 'Down Arrow' — Reverse acceleration (reverse thrust)

You begin as an Apprentice, Level 0 mooncraft operator (trucker) delivering 1/2 ton cargo from lunar base to lunar base. You advance in rank by successfully moving the requisite amount of cargo. Advancing levels does however get progressively harder &mdash; that is at higher rank more cargo is required to be moved to advance further.

After Apprentice, Level 4, you advance to Journeyman, Level 0. At this point you are able to select larger cargo sizes if you wish.

Master is the final rank (if you persist).

<p align="center">
<img src="https://github.com/EngineersNeedArt/Mooncraft2000/blob/1f47ae74034e8a8545c63c5ffd7da961c884bff6/documentation/Map.jpg" alt="Mooncraft 2000 map.">
</p>

Try to land as gently as you can in the center of a base (use your landing camera to assist alignment, vertical-velocity nixie to watch your rate of descent). Horizontal movement when you touchdown will almost certainly result in a crash. If successful landing on the base, you will be lowered down for debriefing, refueling, cargo loading/unloading.

Back on the surface, the base platform allows you to change heading before lift-off (to conserve fuel). Fly to whichever base you wish with your cargo.

Long cargo runs (distances of 2000 or more) count for double-cargo and will advance you in rank more quickly. Distances of 3000 or greater count as a triple-cargo bonus.

If you become stranded, unable to make it to a base, you are penalized.

Crash your mooncraft, you are heavily penalized.

<p align="center">
<img width="463" src="https://github.com/EngineersNeedArt/Mooncraft2000/blob/cb4c04f64b6d6faaa45571505d6b1122b15eae59/documentation/Console.jpg" alt="Mooncraft 2000 console overview.">
</p>

#### Compass

At the top is a standard compass (inertial, not magnetic). Markings N, S, E & W as well as intermediate NE, SE, SW, and NW. Pilot is expected to be able to estimate unmarked headings such as N/NW (north by northwest — halfway between N and NW).

#### Map

Lower left CRT map displays major lunar features, heading overlay. Top of the display is always north, mooncraft is at center. Base locations displayed as brighter crosses with base identifier.

#### Instruments

Lower-center instrument cluster with downward radar and camera. Top scope displays downward-facing radar of terrain (mooncraft graphic not to scale). Lower CRT is downward-facing (landing) camera. Nixies on either side of CRT give digital values for vertical velocity, altitude, fuel and forward velocity. "Idiot lights" above nixies indicate dangerous vertical velocity, low altitude warning, low fuel, and when on surface (touchdown).

#### Monitor

Lower right computer monitor (8-bit). Displays messages from various sources. Includes status messages, local lunar features, digital messages sent from bases.

### FPS

The "1" key toggles a little debug display in the lower right corner of the Map. The time to execute one entire frame in milliseconds is displayed in the top-right. Frames-per-second (FPS) is displayed below. I have never seen FPS exceed 60 &mdash; perhaps the HTML5 Canvas only renders during "screen refreshes" and is gaited to 60 FPS (I know, screen refreshes seem a bit archaic these days).

The letters to the left of FPS indicate the state of various game settings.

<img width="200" align="right" src="https://github.com/EngineersNeedArt/Mooncraft2000/blob/de8990a88e45be50eca53e2ec22988e2c3c979b4/documentation/DebugDisplay.jpg" alt="Mooncraft 2000 debug display.">

+ An uppercase "P" indicates pixel-doubling is on, lower-case pixel-doubling is off (toggle with the "2" key).
+ An uppercase "F" indicates "fog" is on, lower-case fog is off (toggle with the "3" key).
+ An uppercase "I" indicates interpolation is on, lower-case interpolation is off (toggle with the "4" key).
+ An uppercase "R" indicates roll is enabled, lower-case roll is disabled (there is no key to toggle).
+ An uppercase "L" indicates "long-distance" is on, lower-case near-distance (toggle with the "5" key).

### How it was Written

#### Brick Moon

The voxel algorithm has been around since the 1990's so here I will give only a brief description. It's a kind of "ray casting" (like a poor man's ray-tracer). The view of the landscape (what the player sees) is, to the algorithm, a series of vertical slits, or pixel columns. The algorithm works on one column at a time. It computes the slope of an imaginary line leaving the player's eye and passing through the bottom-most pixel of the particular pixel-column in question. The ray is advanced, step-wise (slope-wise), until it is determined that it has intercepted a Moon voxel.

My Javascript implementation took inspiration from this code from eight years ago: https://github.com/pmhicks/voxeljs

The Moon is a vast mosaic of tiles, each tile 512 x 512 "voxels". Because it is a simple terrain map, you can think of each tile as a 512 x 512 grid where, for each square in the grid, there is a color and an elevation. This being the Moon, the color is of course some shade of gray. The elevation is what gives rise to the craters, mountains, mare of the moon.

When a ray is "cast", walked step-wise, the algorithm determines which grid-square of the moon the ray is over and tests the ray's height against the elevation for that square (voxel) of the moon. When the ray intersects, the color for that voxel is assigned to the pixel on the screen. The ray then continues, representing the next pixel above, until it has either painted the entire vertical column of pixels on the display or until some fixed distance where the algorithm just "gives up". In the latter case we assume the ray has headed off into space (literally) and so instead we color the pixel in question with a color from our starry background.

There is nothing terribly complex about this algorithm — an understanding of basic trig is all that is required. It suffers however from being inefficient. To make it render faster your best bet is to either reduce the number of columns you are rendering (making the world narrower, lower in resolution) or pull in the distance at which the algorithm gives up (making the world shallower).

Some tricks that were successful: pixel doubling, width-wise, about doubled the performance with very little image degradation. Move the ray in larger increments as it heads out toward the horizon — I had to do a kind of (reverse?) mip-mapping so that the stride of the cast ray would not skip and then hit arbitrary voxels. (Unfortunately, I slowed the algorithm a bit by also implementing the reverse — moving the ray in smaller increments when close to the player so that finer detail is captured.) 

#### Not to Scale

The tile data for the moon in **Mooncraft 2000** came from 64ppd data sets — that's 64 pixels-per-degree. Therefore, each "voxel" in the game is 1/64th of a degree (of longitude around the equator let's say). But with an equatorial circumference of 10,921 kilometers, that means each voxel is just under 1/2 kilometer on a side (0.474 km). That's a voxel length of a little over five U.S. football fields.

To put it even more in perspective, those little lunar bases in the game that you land on that are maybe 7 x 7 or 9 x 9 voxels in area are in fact over two miles on a side, maybe 40 city blocks.

Data sets exist at 128ppd, 256ppd, even 512ppd. The largest (512ppd) would bring a voxel down to slightly less than a football field in size. That would bring the scale of the moon a little closer to what it should be in the game but at a cost of 64 tiles/voxels for each of the one tiles/voxels in the game. Throw out the data from the "dark" (far) side of the moon and you could cut the number in half. Trim the playable area of the game down further still and maybe you cut it in half again? Still leaves you juggling/storing a lot of tile data.

Additionally, working with very large data sets (moon images) gets to be difficult. It's unlikely you will be able to stitch the tiles together into a large mosaic image and find a paint program that can handle a file of that size.

For the 64ppd data set, I did start with a mosaic (map) of the entire moon. It was difficult to work with (some image editing programs crapped out altogether). Blender (a 3-D modeling application) running on my laptop was only barely able to render the topographical shadows that I required (and took 12 hours or so). If I even went the next step up to the 128ppd image data set, I will likely have to quarter the moon (and leave a row/column overlap between quarters) in order to render shadows.

Finally, the Moon is also not to scale vertically. There is a vertical scale factor I apply to the terrain — a bigger value makes the craters deeper, the mountains more peaked. A friend who's something of an avid hobbyist astronomer tried the game and suggested that I take the vertical scale down a bit to make it more true to the actual Moon. I did try dialing it back but I'm afraid I had already fallen in love with the more exaggerated Moon terrain I had begun with and so rolled it back up again.

More about creating the game here: https://www.engineersneedart.com/mooncraft2000/mooncraft2000.html

### Shortcomings

Poor performance on less-than-high-end hardware is my sorest regret. I tried all manner of things to eke out more FPS. The surest way I found to improve the speed was to either make the canvas smaller (thus lower resolution) or to set the "yon" distance to be considerably shorter (the horizon would end abruptly). I did not wish to shrink the canvas any more than the already small size of 512 pixels wide &mdash; it became much too chunky.

I did find that I could run out the horizon further by increasing the "stride" of the *marching ray* as it moved away from the viewer. When the stride was greater than the period of the voxels in the terrain however, a kind of "shimmering" would become very apparent (it already is a bit of a problem). One voxel might be "cast upon" by the marching ray but then a slight movement of the player would cause that voxel to be passed over and a neighboring voxel cast upon instead. I mitigated this to a large degree with a sort of "mip mapping" of the voxel data. When the stride is increased I instead cast rays upon voxels that represent instead the *average* height and color of a group of neighboring voxels.

I pursued but ultimately aborted an attempt at using Web Workers to handle (in parallel) the inner loop of the ray casting code. The "columnar nature" of the ray-casting algorithm lends itself wonderfully to parallelism and so I had hoped Web Workers would be an ideal fit. I found no way that each Web Worker could share the global tile cache and I had no interest in replicating that memory-intensive data structure for each Web Worker. If there is a means to share read-only data among Web Workers then this approach may still be workable. My knowledge of Web Workers though is poor.

I suspect the last, best chance of performance improvement is through Web Assembly. At this point I think Web Assembly is beyond my abilities. I have written the voxel algorithm in C before but how to compile for Web, expose an API, call into this API &hellip; I have no idea.

For reasons I don't understand, the frame-rate seems to slow down as you play when on Chrome (I'm testing on Mac OS). This does not happen on Safari. I have found though that if I refresh the page on Chrome, the frame-rate comes back up to what I expect. That *feels* to me like perhaps the garbage is not being taken out and we are resource starved, but I'm only guessing.

Mobile, I confess, was an after-thought. I tried somewhat to make the game playable on mobile by providing on-screen buttons for controlling the craft. It didn't make a lot of sense though when I tried it on my phone &mdash; it was so small. I have not tried it on an iPad but I am not sure there is much of an audience on that configuration.

### Looking Forward

From things detailed above, it's clear the game would benefit from any performance improvements.

Also it would be nice to move to a more detailed Moon tile set. I created an experimental 128ppd Moon tile data set (twice the longitudinal and twice the latitudinal resolution as the 64ppd tiles in the game) and it really made the Moon feel much, much larger. The data-set itself had a good deal more flaws than the 64ppd data which is unfortunate. Also, doubling the scale of the data also doubled the dynamic range of the elevation. It was looking like limiting elevation to 256 discreet values (one byte) would fall down as you moved to 128ppd and higher resolutions. One solution would be to go to two-bytes for elevation (that will increase the tile size). Another solution would be to stick with one-byte-per-voxel but make it relative to some two-byte value for the tile itself (we can assume that both the Mount Everest and Death Valley of the Moon are not on the same tile).

Apart from the technical improvements, I wonder if there's not a better game hiding within this one. To get the game out &mdash; give it a chance to breath &mdash; I did not invest in a complicated lunar ecosystem where, perhaps, lunar bases nearer the poles mine water in the shadows while equatorial bases harvest solar energy. Maybe one or two bases near the equator have rail launchers and serve as the cargo destination for other moon resources mined like rare minerals or metals. With such an ecosystem simulated, certain goods would be needed in some areas of the Moon, be in surplus in others. The player therefore could engage in mercantilism much like the early classic 8-bit game, *Elite*.

Occasional medical emergencies might emerge and take high priority &mdash; moving medical supplies taking priority over profit.

What if cargo could be jettisoned anywhere over the surface of the moon, picked up later?

A huge move forward would be to add the ability to render 3D into the scene (or psuedo-3D like the classic *Wing Commander* series of games). Other mooncraft could be seen taking off, landing at bases, flying between bases (the bases themselves could be made more interesting looking). Suddenly mercantilism combined with multi-player could then transform the game. In addition to the rendering technical challenges however, a server back-end and something like Web Sockets would be required&hellip;

<p align="center">
<i>"Good enough for 1.0…"</i>
</p>
