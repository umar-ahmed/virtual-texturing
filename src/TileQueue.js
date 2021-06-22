//
//
//

export class TileQueue {
  constructor(maxLoading, locations) {
    this.maxLoading = maxLoading;
    this.onLoading = 0;
    this.loadCount = 0;

    this.locations = locations;
    this.callback = null;

    this.tiles = [];
    this.sorted = false;
  }

  push(tile) {

    this.tiles.push(tile);
    this.sorted = false;
    this.process();

  }

  process() {

    if ((this.onLoading < this.maxLoading) && !this.empty()) {
      const scope = this;
      const tile = this.pop();
      const filePath = this.getTilePath(tile);

      const image = new Image();
      image.crossOrigin = 'Anonymous';

      this.onLoading++;

      image.onload = function() {

        --scope.onLoading;
        ++scope.loadCount;

        tile.image = this;
        tile.loaded = true;

        console.log('Tile ' + tile.pageNumber + ' at level ' + tile.mipMapLevel + ' loaded | Count: ' + scope.loadCount );

        scope.process();
        if (scope.callback) scope.callback(tile);
      };

      image.src = filePath;
    }
  }

  pop() {

    this.sort();
    return this.tiles.pop();

  }

  empty() {
    return 0 === this.tiles.length;
  }

  contains(id) {
    for (let i = this.tiles.length - 1; i >= 0; --i) {
      if (id === this.tiles[i].id) {
        return true;
      }
    }
    return false;
  }

  size() {
    return this.tiles.length;
  }

  top() {

    this.sort();
    return this.tiles[this.tiles.length - 1];

  }

  sort() {
    if ( this.sorted ) return;
    this.tiles.sort((a, b) => a.hits - b.hits);
    this.sorted = true;
  }
};
