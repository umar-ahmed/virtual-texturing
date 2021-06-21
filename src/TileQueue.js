//
//
//

export class TileQueue {
  constructor(size, locations) {
    this.maxLoading = size;
    this.onLoading = 0;
    this.loadCount = 0;

    this.locations = locations;
    this.callback = null;

    this.content = [];
    this.sorted = false;
  }

  push(item) {
    this.content.push({object: item, priority: item.hits});
    this.sorted = false;

    this.process();
  }

  process() {

    if ((this.onLoading < this.maxLoading) && !this.empty()) {
      var scope = this;
      var item = this.pop();
      var filePath = this.getTilePath(item);

      var image = new Image();
      image.crossOrigin = 'Anonymous';

      this.onLoading++;

      image.onload = function() {

        --scope.onLoading;
        ++scope.loadCount;

        item.image = this;
        item.loaded = true;

        console.log('Tile ' + item.pageNumber + ' at level ' + item.mipMapLevel + ' loaded | Count: ' + scope.loadCount );

        scope.process();
        scope.callback(item);
      };

      image.src = filePath;
    }
  }

  pop() {

    this.sort();
    var element = this.content.pop();
    return element ? element.object : undefined;

  }

  empty() {
    return 0 === this.content.length;
  }

  contains(id) {
    for (let i = this.content.length - 1; i >= 0; --i) {
      if (id === this.content[i].object.id) {
        return true;
      }
    }
    return false;
  }

  size() {
    return this.content.length;
  }

  top() {

    this.sort();
    const element = this.content[this.content.length - 1];
    return element ? element.object : undefined;

  }

  sort() {
    if ( this.sorted ) return;
    this.content.sort((a, b) => a.priority - b.priority);
    this.sorted = true;
  }
};
