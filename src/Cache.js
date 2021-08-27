import { Page } from './Page.js';
import { TileId } from './TileId.js';
import { Tile } from './Tile.js';
import { DataTexture, RGBAFormat, UnsignedByteType, UVMapping, ClampToEdgeWrapping, LinearMipMapLinearFilter, LinearFilter, Vector2 }
from '../examples/jsm/three.module.js';

export const StatusNotAvailable = 0;
export const StatusAvailable = 1;
export const StatusPendingDelete = 2;

function createAnnotatedImageData(imageBitmap, x, y, z, l, lmax, x0, y0, pad, realTileSize) {
  //return imageBitmap;
	const canvas = document.createElement( "canvas" );
	const context = canvas.getContext( "2d" );
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  context.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
  context.translate((pad-x0) >> l, (pad-y0) >> l);
  const t = Math.floor((z-l)*255/lmax);
  const color = "rgb("+t+',0,'+(255-t)+')';
  context.strokeStyle = color;
  context.fillStyle  = color;
  const w = (realTileSize.x-2*pad) >> l;
  const h = (realTileSize.y-2*pad) >> l;
  context.strokeRect(0, 0, w, h);
  context.translate(w >> 1, h >> 1);
  context.textAlign = "center";
  context.scale(canvas.width / 64, canvas.height / 64);
  context.fillText(x+','+y, 0,-5);
  context.fillText(z+'-'+l, 0, 5);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function resizeHalf( image ) {
	const canvas = document.createElement( "canvas" );
	const context = canvas.getContext( "2d" );
  context.imageSmoothingEnabled = true;
	canvas.width = (image.width >> 1) || 1;
  canvas.height = (image.height >> 1) || 1;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return createImageBitmap(canvas);
}


export class Cache {

  constructor(tileSize, padding, pageCount, maxLevel) {
    this.realTileSize = {
      x: tileSize[0] + (2 * padding),
      y: tileSize[1] + (2 * padding)
    };

    this.maxLevel = maxLevel;
    this.pageCount = {
      x: pageCount[0],
      y: pageCount[1]
    };

    this.width = this.pageCount.x * this.realTileSize.x;
    this.height = this.pageCount.y * this.realTileSize.y;

    this.padding = padding;

    this.texture = null;

    this.cachedPages = {}; // tileId -> pageId
    this.newTiles = {}; // pageId -> Tile
    this.freePages = []; // pageId -> bool
    this.pages = []; // pageId -> Page

    const numPages = this.pageCount.x * this.pageCount.y;
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
    this.maxTileLevels = Math.floor(Math.log2(Math.max(this.realTileSize.x, this.realTileSize.y)));
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
  }

  // if possible, move page to the free list
  releasePage (id) {
    var pageId = this.cachedPages[id];
    if (undefined !== pageId) this.freePages[pageId] = true;
  }

  getPageX (pageId) {
    return pageId % this.pageCount.x;
  }

  getPageY (pageId) {
    return Math.floor(pageId / this.pageCount.x);
  }

  getPageZ (pageId) {
    if (this.pages[pageId] === undefined) {
      console.error("page on pageId " + pageId + " is undefined");
      return -1;
    }
    return this.pages[pageId].z;
  }

  getPageId (x, y, z) {
    const id = TileId.create(x, y, z);
    return this.cachedPages[id];
  }

  onPageDropped (id) {
    if (this.pageDroppedCallback) {
      this.pageDroppedCallback(id, this.cachedPages[id]);
    }
  }

  getPageStatus (id) {
    const pageId = this.cachedPages[id];
    if (pageId === undefined) {
      return StatusNotAvailable;
    }

    const page = this.pages[pageId];

    if (undefined === page) {
      console.error(pageId, id, 'undefined page');
      return StatusNotAvailable;
    }

    if (!page.valid) {
      return StatusNotAvailable;
    }

    if (this.freePages[pageId]) {
      return StatusPendingDelete;
    }

    return StatusAvailable;
  }

  restorePage (id) {
    const pageId = this.cachedPages[id];
    if (pageId === undefined)  return -1;
    this.freePages[pageId] = false;
    return pageId;
  }

  getStatus () {
    let usedPages = this.pages.reduce((count, page) => count + page.valid , 0);
    let freePages = this.freePages.reduce((count, freePage) => count + freePage , 0);

    return {
      used: usedPages,
      markedFree: this.pages.length - usedPages,
      free: freePages
    }
  }

  clear () {
    this.cachedPages = {};
    this.freePages = [];

    for (let i = 0; i < this.pages.length; ++i) {
      this.pages[i].valid = false;
      this.freePages[i] = true;
    }
  }

  getNextFreePage () {
      let pageId = this.freePages.findIndex(value => value);
      return (pageId < 0) ? this.freePage() : pageId;
  }

  // find one pageId and free it
  // this function gets called when no pageIds are free
  freePage () {
    try {
      let pageId = undefined, lastHits = Number.MAX_VALUE, hits = Number.MAX_VALUE;
      for (let i = 0; i < this.pages.length; ++i) {
        const page = this.pages[i];
        if (page.forced) continue;
        if (page.lastHits < lastHits || (page.lastHits == lastHits && page.hits < hits) ) {
          lastHits = page.lastHits;
          hits = page.hits;
          pageId = i;
        }
      }

      if (undefined === pageId) {
        console.error("FreePageNotFound");
      }

      this.freePages[pageId] = true;
      return pageId;
    } catch (e) {
      console.log(e.stack);
    }
  }

  hasFreePage () {
    return this.freePages.includes(true);
  }

  reservePage (id) {
    // try to restore
    let pageId = this.restorePage(id);
    if (pageId >= 0) {
      return pageId;
    }

    // get the next free page
    pageId = this.getNextFreePage();

    // if valid, remove it now, (otherwise handles leak)
    const page = this.pages[pageId];
    if (page.valid) {
      this.onPageDropped(page.tileId);
      delete this.cachedPages[page.tileId];
    }

    // update pageId
    this.freePages[pageId] = false;
    this.cachedPages[id] = pageId;
    page.z = TileId.getZ(id);
    page.tileId = id;
    page.valid = true;

    return pageId;
  }

  update(renderer, usageTable) {
    this.updateTiles(renderer);
    this.updateUsage(usageTable, renderer.renderCount);
  }

  updateTiles(renderer) {
    const scope = this;
    const pos = new Vector2();
    for(const pageId in this.newTiles) {
      const tile = this.newTiles[pageId];
      if (!tile.loaded) continue;
      let x = this.realTileSize.x * this.getPageX(pageId)+tile.x0;
      let y = this.realTileSize.y * this.getPageY(pageId)+tile.y0;
      let level = 0;
      function buildMipMaps(bitmap) {
        tile.image = createAnnotatedImageData(bitmap, tile.x, tile.y, tile.z, level, scope.maxLevel, tile.x0, tile.y0, scope.padding, scope.realTileSize);
        pos.set(x, y);
        renderer.copyTextureToTexture(pos, tile, scope.texture, level);
        x >>= 1;
        y >>= 1;
        ++level;
        if (level <= scope.maxTileLevels)
          resizeHalf(bitmap).then(buildMipMaps);
      }
      createImageBitmap(tile.image).then(buildMipMaps);
      delete this.newTiles[pageId];
    }
  }

  updateUsage(usageTable, renderCount) {
    for (let tileId in usageTable.table) {
      if (usageTable.table.hasOwnProperty(tileId)) {
        const pageId = this.cachedPages[tileId];
        if (pageId !== undefined) {
          this.pages[pageId].lastHits = renderCount;
          this.pages[pageId].hits = usageTable.table[tileId];
        }
      }
    }
  }

  cacheTile (tile, forced) {
    try {
      const pageId = this.reservePage(tile.id);
      this.newTiles[pageId] = tile;
      this.pages[pageId].forced = forced;
      return pageId;
    } catch (e) {
      console.log(e.stack);
    }
  }
};
