Description
------------
Virtual texturing implementation for [three.js](https://github.com/mrdoob/three.js) (r129 up to now).

Usage
------------
See code in [index.html](../blob/master/index.html) and [examples/](../blob/master/examples)

Demo
------------
http://mbredif.github.io/virtual-texturing

Issues
------------
* ~~Resizing window breaks the app.~~ fixed
* ~~Inconsistent tiles when zooming out (after zooming in).~~ fixed
* ~~Tries to fetch non-existent tiles.~~ fixed
* tile eviction strategy is suboptimal.
* TODO: trilinear filtered sampling of the virtual texture (shows linear 2D filtering of best loaded level for now).

Released with MIT License.
