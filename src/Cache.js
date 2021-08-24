import { Page } from './Page.js';
import { PageId } from './PageId.js';
import { Tile } from './Tile.js';
import { DataTexture, RGBAFormat, UnsignedByteType, UVMapping, ClampToEdgeWrapping, LinearMipMapLinearFilter, LinearFilter, Vector2 }
from '../examples/jsm/three.module.js';

export const StatusNotAvailable = 0;
export const StatusAvailable = 1;
export const StatusPendingDelete = 2;

function createAnnotatedImageData(imageBitmap, x, y, z, l) {
  //return imageBitmap;
	const canvas = document.createElement( "canvas" );
	const context = canvas.getContext( "2d" );
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  context.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  const scale = canvas.width / 64;
  context.scale(scale, scale);
  context.fillText(x+','+y, 32, 27);
  context.fillText(z+'-'+l, 32, 37);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function resizeHalf( image ) {
	const canvas = document.createElement( "canvas" );
	const context = canvas.getContext( "2d" );
  context.imageSmoothingEnabled = true;
	canvas.width = Math.ceil(image.width / 2);
  canvas.height = Math.ceil(image.height / 2);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return createImageBitmap(canvas);
}


export class Cache {

  constructor(tileSize, padding, width, height) {
    this.realTileSize = {
      x: tileSize[0] + (2 * padding),
      y: tileSize[1] + (2 * padding)
    };

    this.tileCountPerSide = {
      x: Math.floor(width / this.realTileSize.x),
      y: Math.floor(height / this.realTileSize.y)
    };

    this.width = this.tileCountPerSide.x * this.realTileSize.x;
    this.height = this.tileCountPerSide.y * this.realTileSize.y;

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
      LinearMipMapLinearFilter
    );
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
    let width = this.width;
    let height = this.height;
    while ( width > 0 || height > 0 ) {
      this.texture.mipmaps.push({
        data: null,
        width: width || 1,
        height: height || 1
      });
      width >>= 1;
      height >>= 1;
    }
    this.maxTileLevels = Math.ceil(Math.log2(this.realTileSize.x));
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
      let slot = undefined, lastHits = Number.MAX_VALUE, hits = Number.MAX_VALUE;
      for (let i = 0; i < this.pages.length; ++i) {
        const page = this.pages[i];
        if (page.forced) continue;
        if (page.lastHits < lastHits || (page.lastHits == lastHits && page.hits < hits) ) {
          lastHits = page.lastHits;
          hits = page.hits;
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

  getSlot (id) {
    // try to restore
    let slot = this.restorePage(id);
    if (slot >= 0) {
      return slot;
    }

    // get the next free page
    slot = this.getNextFreeSlot();

    // if valid, remove it now, (otherwise handles leak)
    const page = this.pages[slot];
    if (page.valid) {
      this.onPageDropped(page.pageId);
      delete this.cachedSlots[page.pageId];
    }

    // update slot
    this.freeSlots[slot] = false;
    this.cachedSlots[id] = slot;
    page.z = PageId.getPageZ(id);
    page.pageId = id;
    page.valid = true;

    return slot;
  }

  update(renderer, usageTable) {
    this.updateTiles(renderer);
    this.updateUsage(usageTable, renderer.renderCount);
  }

  updateTiles(renderer) {
    const scope = this;
    const pos = new Vector2();
    for(const slot in this.newTiles) {
      const tile = this.newTiles[slot];
      if (!tile.loaded) continue;
      let x = this.realTileSize.x * this.getPageX(slot);
      let y = this.realTileSize.y * this.getPageY(slot);
      let level = 0;
      function buildMipMaps(bitmap) {
        tile.image = createAnnotatedImageData(bitmap, tile.pageX, tile.pageY, tile.pageZ, level);
        pos.set(x, y);
        renderer.copyTextureToTexture(pos, tile, scope.texture, level);
        x >>= 1;
        y >>= 1;
        ++level;
        if (level <= scope.maxTileLevels)
          resizeHalf(bitmap).then(buildMipMaps);
      }
      createImageBitmap(tile.image).then(buildMipMaps);
      delete this.newTiles[slot];
    }
  }

  updateUsage(usageTable, renderCount) {
    for (let pageId in usageTable.table) {
      if (usageTable.table.hasOwnProperty(pageId)) {
        const slot = this.cachedSlots[pageId];
        if (slot !== undefined) {
          this.pages[slot].lastHits = renderCount;
          this.pages[slot].hits = usageTable.table[pageId];
        }
      }
    }
  }

  cacheTile (tile, forced) {
    try {
      const slot = this.getSlot(tile.id);
      this.newTiles[slot] = tile;
      this.pages[slot].forced = forced;
      return slot;
    } catch (e) {
      console.log(e.stack);
    }
  }
};
