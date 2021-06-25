//
//
//
import { PageId } from './PageId.js'

export class Tile {
  constructor(id, hits) {
    this.id = id;
    this.hits = (undefined !== hits) ? hits : 0;
    this.pageX = PageId.getPageX(id);
    this.pageY = PageId.getPageY(id);
    this.pageZ = PageId.getPageZ(id);
    this.loaded = false;
    this.image = undefined;
  }
};
