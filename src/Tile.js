//
//
//
import { TileId } from './TileId.js'

export class Tile {
  constructor(id, hits) {
    this.id = id;
    this.hits = (undefined !== hits) ? hits : 0;
    this.x = TileId.getX(id);
    this.y = TileId.getY(id);
    this.z = TileId.getZ(id);
    this.loaded = false;
    this.image = undefined;
  }
};
