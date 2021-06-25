import { Page } from './Page.js';
import { PageId } from './PageId.js';
import { Tile } from './Tile.js';
import { DataTexture, RGBAFormat, UnsignedByteType, UVMapping, ClampToEdgeWrapping, LinearFilter, Vector2 }
from '../examples/jsm/three.module.js';

export const StatusNotAvailable = 0;
export const StatusAvailable = 1;
export const StatusPendingDelete = 2;

export class Cache {

  constructor(tileSize, padding, width, height) {
    this.realTileSize = {
      x: tileSize + (2 * padding),
      y: tileSize + (2 * padding)
    };

    this.tileCountPerSide = {
      x: Math.floor(width / this.realTileSize.x),
      y: Math.floor(height / this.realTileSize.y)
    };

    this.width = this.tileCountPerSide.x * this.realTileSize.x;
    this.height = this.tileCountPerSide.y * this.realTileSize.y;

    this.usablePageSize = tileSize;
    this.padding = padding;

    this.texture = null;

    this.cachedSlots = {}; // id -> slot
    this.newTiles = {}; // slot -> Tile
    this.freeSlots = []; // slot -> bool
    this.pages = []; // slot -> Page

    const numPages = this.tileCountPerSide.x * this.tileCountPerSide.y;
    for (let i = 0; i < numPages; ++i) {
      this.pages.push(new Page());
    }

    this.initTexture();
    this.clear();
  }

  initTexture() {
    this.texture = new DataTexture(
      null,
      this.width,
      this.height,
      RGBAFormat,
      UnsignedByteType,
      UVMapping,
      ClampToEdgeWrapping,
      ClampToEdgeWrapping,
      LinearFilter,
      LinearFilter
    );
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  // if possible, move page to the free list
  releasePage (id) {
    var slot = this.cachedSlots[id];
    if (undefined !== slot) this.freeSlots[slot] = true;
  }

  getPageX (slot) {
    return slot % this.tileCountPerSide.x;
  }

  getPageY (slot) {
    return Math.floor(slot / this.tileCountPerSide.x);
  }

  getPageZ (slot) {
    if (this.pages[slot] === undefined) {
      console.error("page on slot " + slot + " is undefined");
      return -1;
    }
    return this.pages[slot].z;
  }

  onPageDropped (id) {
    if (this.pageDroppedCallback) {
      this.pageDroppedCallback(
        PageId.getPageX(id),
        PageId.getPageY(id),
        PageId.getPageZ(id)
      );
    }
  }

  getPageStatus (id) {
    const slot = this.cachedSlots[id];
    if (slot === undefined) {
      return StatusNotAvailable;
    }

    const page = this.pages[slot];

    if (undefined === page) {
      console.error(slot, id, 'undefined page');
      return StatusNotAvailable;
    }

    if (!page.valid) {
      return StatusNotAvailable;
    }

    if (this.freeSlots[slot]) {
      return StatusPendingDelete;
    }

    return StatusAvailable;
  }

  restorePage (id) {
    const slot = this.cachedSlots[id];
    if (slot === undefined)  return -1;
    // if (this.pages[slot].pageId !== id) console.error("ErrorOnId");
    this.freeSlots[slot] = false;
    return slot;
  }

  getStatus () {
    let usedSlots = this.pages.reduce((count, page) => count + page.valid , 0);
    let freeSlots = this.freeSlots.reduce((count, freeSlot) => count + freeSlot , 0);

    return {
      used: usedSlots,
      markedFree: this.pages.length - usedSlots,
      free: freeSlots
    }
  }

  clear () {
    this.cachedSlots = {};
    this.freeSlots = [];

    for (let i = 0; i < this.pages.length; ++i) {
      this.pages[i].valid = false;
      this.freeSlots[i] = true;
    }
  }

  getNextFreeSlot () {
      let slot = this.freeSlots.findIndex(value => value);
      return (slot < 0) ? this.freeSlot() : slot;
  }

  // find one slot and free it
  // this function gets called when no slots are free
  freeSlot () {
    try {
      let slot = undefined, zmax = -1;
      for (let i = 0; i < this.pages.length; ++i) {
        const page = this.pages[i];
        if ((!page.forced) && (page.z > zmax)) {
          zmax = page.z;
          slot = i;
        }
      }

      if (undefined === slot) {
        console.error("FreeSlotNotFound");
      }

      this.freeSlots[slot] = true;
      return slot;
    } catch (e) {
      console.log(e.stack);
    }
  }

  hasFreeSlot () {
    return this.freeSlots.includes(true);
  }

  writeToCache (id, forced) {
    // try to restore
    let slot = this.restorePage(id);
    if (slot >= 0) {
      return slot;
    }

    // get the next free page
    slot = this.getNextFreeSlot();
    this.freeSlots[slot] = false;
    this.cachedSlots[id] = slot;
    const page = this.pages[slot];

    // if valid, remove it now, (otherwise handles leak)
    if (page.valid) {
      this.onPageDropped(page.pageId);
      delete this.cachedSlots[page.pageId];
    }

    // update slot
    page.forced = forced;
    page.z = PageId.getPageZ(id);
    page.pageId = id;
    page.valid = true;

    return slot;
  }

  update(renderer) {
    const pos = new Vector2();
    for(const slot in this.newTiles) {
      const tile = this.newTiles[slot];
      if (!tile.loaded) continue;
      const x = this.realTileSize.x * this.getPageX(slot);
      const y = this.realTileSize.y * this.getPageY(slot);
      pos.set(x, y);
      renderer.copyTextureToTexture(pos, tile, this.texture);
      delete this.newTiles[slot];
    }
  }

  cacheTile (tile, forced) {
    try {
      const slot = this.writeToCache(tile.id, forced);
      this.newTiles[slot] = tile;
      return slot;
    } catch (e) {
      console.log(e.stack);
    }
  }
};
