import { Page } from './Page.js';
import { PageId } from './PageId.js';
import { Tile } from './Tile.js';

export const StatusNotAvailable = 0;
export const StatusAvailable = 1;
export const StatusPendingDelete = 2;

export class Cache {

  constructor(tileSize, padding, width, height) {
    this.width = width;
    this.height = height;

    this.realTileSize = {
      x: tileSize + (2 * padding),
      y: tileSize + (2 * padding)
    };

    this.tileCountPerSide = {
      x: parseInt(this.width / this.realTileSize.x, 10),
      y: parseInt(this.height / this.realTileSize.y, 10)
    };

    this.tileCount = this.tileCountPerSide.x * this.tileCountPerSide.y;

    this.usablePageSize = tileSize;
    this.padding = padding;
    this.size = {
      x: width,
      y: height
    };

    this.relativePadding = {
      x: padding / this.width,
      y : padding / this.height
    };

    this.textures = {
      tDiffuse : null
    };

    this.cachedPages = {};
    this.freeSlots = [];
    this.slots = [];
    this.loadingQueue = [];
    this.newPages = {};

    this.init();
    this.clear();
  }

  init () {
    var i, type, texture;

    for (i = 0; i < this.tileCount; ++i) {
      this.slots.push(new Page());
    }

    for (type in this.textures) {
      if (this.textures.hasOwnProperty(type)) {
        texture = new THREE.DataTexture(
          null,
          this.width,
          this.height,
          THREE.RGBAFormat,
          THREE.UnsignedByteType,
          new THREE.UVMapping(),
          THREE.ClampToEdgeWrapping,
          THREE.ClampToEdgeWrapping,
          THREE.LinearFilter,
          THREE.LinearFilter
        );

        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        this.textures[type] = texture;
      }
    }
  }

  getNextFreeSlot () {
    try {
      if (!this.hasFreeSlot()) {
        this.freeSlot();
      }

      // get the first slot
      var id, slot;
      //for (var slot in this.freeSlots) {
      for (slot = 0; slot < this.freeSlots.length; ++slot) {
        if (true === this.freeSlots[slot]) {
          this.freeSlots[slot] = false;
          id = slot;

          // end iteration, we just want one item
          break;
        }
      }

      if (undefined === id) {
        console.error("FreeSlotNotFound");
      }

      return parseInt(id, 10);

    } catch (e) {
      console.log(e.stack);
    }
  }

  getPageCoordinates (id) {
    var topLeftCorner = [
      ((id % this.tileCountPerSide.x) * this.realTileSize.x) / this.size.x,
      (Math.floor(id / this.tileCountPerSide.y) * this.realTileSize.y) / this.size.y];

    // add offset
    topLeftCorner[0] += this.relativePadding.x;
    topLeftCorner[1] += this.relativePadding.y;

    return topLeftCorner;
  }

  getPageSizeInTextureSpace () {
    var space = [
      this.usablePageSize / this.size.x,
      this.usablePageSize / this.size.y];

    return space;
  }

  releasePage (id) {
    // if possible, move page to the free list
    if (undefined !== this.cachedPages[id]) {
      var slot = this.cachedPages[id];
      this.freeSlots[slot] = true;
    }
  }

  getPageMipLevel (id) {
    if (this.slots[id] === undefined) {
      console.error("page on slot " + id + " is undefined");
      return -1;
    }

    return this.slots[id].mipLevel;
  }

  onPageDropped (id) {
    if (this.pageDroppedCallback) {
      this.pageDroppedCallback(
        PageId.getPageNumber(id),
        PageId.getMipMapLevel(id)
      );
    }
  }

  getPageStatus (id) {
    if (!this.cachedPages[id]) {
      return StatusNotAvailable;
    }

    if (!this.slots[this.cachedPages[id]].valid) {
      return StatusNotAvailable;
    }

    if (true === this.freeSlots[this.cachedPages[id]]) {
      return StatusPendingDelete;
    }

    return StatusAvailable;
  }

  restorePage (id) {
    try {
      if (!this.cachedPages[id]) {
        return {
          wasRestored: false,
          id: -1
        };
      }

      if (this.slots[this.cachedPages[id]].pageId !== parseInt(id, 10)) {
        console.error("ErrorOnId");
      }

      this.freeSlots[this.cachedPages[id]] = false;

      return {
        wasRestored: true,
        id: this.cachedPages[id]
      };
    } catch (e) {
      console.log(e.stack);
    }
  }

  getStatus (slotsUsed, slotsMarkedFree, slotsEmpty) {
    var i;
    slotsUsed = slotsMarkedFree = slotsEmpty = 0;

    for (i = 0; i < this.slots.length; ++i) {
      if (true === this.slots[i].valid) {
        ++slotsUsed;
      } else {
        ++slotsMarkedFree;
      }
    }

    for (i = 0; i < this.freeSlots.length; ++i) {
      if (true === this.freeSlots[i]) {
        ++slotsEmpty;
      }
    }

    return {
      used: slotsUsed,
      markedFree: slotsMarkedFree,
      free: slotsEmpty
    }
  }

  clear () {
    this.cachedPages = {};
    this.freeSlots = [];

    var i;

    for (i = 0; i < this.tileCount; ++i) {
      this.slots[i].valid = false;
      this.freeSlots[i] = true;
    }
  }

  freeSlot () {
    // find one slot and free it
    // this function gets called when no slots are free
    try {
      var i, page, minMipLevel = Number.MAX_VALUE;

      for (i = 0; i < this.tileCount; ++i) {
        if ((false === this.slots[i].forced) && (this.slots[i].mipLevel < minMipLevel)) {
          minMipLevel = this.slots[i].mipLevel;
          page = i;
        }
      }

      if ((undefined === page) || (true === this.slots[page].forced)) {
        console.error("FreeSlotNotFound");
      }

      this.freeSlots[page] = true;
    } catch (e) {
      console.log(e.stack);
    }
  }

  hasFreeSlot () {
    var i;
    for (i = 0; i < this.freeSlots.length; ++i) {
      if (true === this.freeSlots[i]) {
        return true;
      }
    }

    return false;
  }

  reset () {
    try {
      var id = PageId.create(0, 4);
      var tile = new Tile(id);

      this.cachePage(tile, true);

    } catch (e) {
      console.log(e.stack);
    }
  }

  drawToTexture (renderer, tile, x, y) {
    // update cache texture
    var i;
    if (tile.loaded) {
      var gl = renderer.context;

      gl.bindTexture(gl.TEXTURE_2D, this.textures.tDiffuse.__webglTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, tile.image);

    } else {

      for (i = 0; i < tile.image.length; ++i) {
        console.error('Tile ' + tile.image.src + ' was not available yet.');
      }
    }
  }

  writeToCache (id, forced) {
    // try to restore
    if (this.restorePage(id).wasRestored) {
      return this.cachedPages[id];
    }

    // get the next free page
    var page = this.getNextFreeSlot();
    this.cachedPages[id] = page;

    if (this.slots[page].valid) {
      this.onPageDropped(this.slots[page].pageId);
      // remove it now, (otherwise handles leak)
      delete this.cachedPages[this.slots[page].pageId];
      //this.cachedPages[this.slots[page].pageId] = undefined;
    }

    // update slot
    this.slots[page].forced = forced;
    this.slots[page].mipLevel = PageId.getMipMapLevel(id);
    this.slots[page].pageId = id;
    this.slots[page].valid = true;

    return page;
  }

  update(renderer) {
    for(const page in this.newPages) {
      // compute x,y coordinate
      var x = parseInt((page % this.tileCountPerSide.x) * this.realTileSize.x, 10);
      var y = parseInt(Math.floor((page / this.tileCountPerSide.y)) * this.realTileSize.y, 10);

      this.drawToTexture(renderer, this.newPages[page], x, y);

    }
    this.newPages = {};
  }



  cachePage (tile, forced) {
    try {
      const page = this.writeToCache(tile.id, forced);
      this.newPages[page] = tile;
      return page;
    } catch (e) {
      console.log(e.stack);
    }
  }
};
