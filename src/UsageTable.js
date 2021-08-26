/**
* UsageTable
*/

import { TileId } from './TileId.js'

export class UsageTable {
  constructor (size) {
    this.maxMipMapLevel = Math.floor(Math.log(size) / Math.log(2));
    this.clear();
  }

  clear () {
    this.table = {}; // tileId => number of hits
  }

  isUsed (id) {
    return this.table[id] !== undefined;
  }

  add (tileX, tileY, tileLevel) {
    const tileZ = this.maxMipMapLevel-tileLevel;
    var id = TileId.create(tileX, tileY, tileZ);
    if (this.isUsed(id)) {
      ++this.table[id];
    } else {
      this.table[id] = 1;
    }
  }

  update ( data ) {
    this.clear();
    let i, r, g, b;
    const numPixels = data.length;
    for (i = 0; i < numPixels; i += 4) {

      if (0 !== data[i + 3]) {
        r = data[i];
        g = data[i + 1];
        b = data[i + 2];
        this.add(r, g, b);
      }
    }
  }

};
