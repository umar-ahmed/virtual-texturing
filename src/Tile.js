//
//
//
import { PageId } from './PageId.js'

export class Tile {
  constructor(id, hits, parentId) {
    this.parentId = (undefined === parentId) ? PageId.createInvalid() : parentId;
    this.id = id;
    this.hits = (undefined !== hits) ? hits : 0;
    this.pageNumber = PageId.getPageNumber(id);
    this.mipMapLevel = PageId.getMipMapLevel(id);
    this.loaded = false;
    this.image = undefined;
  }

  isLoaded () {
    return this.loaded;
  }

  hasParent () {
    return PageId.isValid(this.parentId);
  }
};
