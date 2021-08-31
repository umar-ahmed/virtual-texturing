//
//
//

/**
 * Mipmap table
 * level 0 has size*size entries
 * level 1 has (size>>1) * (size>>1)
 * level n-th has only 1 entry
*/
import { DataTexture, RGBAIntegerFormat, UnsignedByteType, UVMapping, ClampToEdgeWrapping, NearestFilter }
from '../examples/jsm/three.module.js';

import { TileId } from './TileId.js'

export class IndirectionTable {
  constructor(minlevel, maxLevel) {

    // quad-tree representation
    this.pageIds = null;
    this.minLevel = minlevel;
    this.maxLevel = maxLevel;
    this.size = 1 << maxLevel;
    this.offsets = null;

    // graphics and webgl stuff
    this.texture = null;
    this.dataArrays = null;

    // debug
    this.canvas = null;
    this.imageData = null;

    this.init();
  }

  init () {
    this.offsets = new Array(this.maxLevel + 1);
    this.dataArrays = new Array(this.maxLevel + 1);

    let i, j, offset;
    let accumulator = 0;
    let numElements = this.size * this.size;
    for (i = this.maxLevel; i >= 0; --i) {

      this.offsets[i] = accumulator;
      this.dataArrays[i] = new Uint8Array(numElements * 4);
      accumulator += numElements;
      numElements >>= 2;
    }

    this.pageIds = [];
    for (i = 0; i < accumulator; ++i) {
      this.pageIds[i] = -1;
    }

    for (i = 0; i < this.dataArrays.length; ++i) {
      const numData = this.dataArrays[i].length;
      for (j = 0; j < numData; j += 4) {
        this.dataArrays[i][j] = 0.0;
        this.dataArrays[i][j + 1] = 0.0;
        this.dataArrays[i][j + 2] = 0.0;
        this.dataArrays[i][j + 3] = 255.0;
      }
    }
    this.texture = new DataTexture(
      null,
      this.size,
      this.size,
      RGBAIntegerFormat,
      UnsignedByteType,
      UVMapping,
      ClampToEdgeWrapping,
      ClampToEdgeWrapping,
      NearestFilter,
      NearestFilter
    );
    this.texture.internalFormat = 'RGBA8UI';
    this.texture.name = 'indirection_table';
    this.texture.generateMipmaps = false;
    for( let l = 0; l <= this.maxLevel; ++l) {
      this.texture.mipmaps.push({
        data : this.dataArrays[this.maxLevel - l],
        width: 1 << (this.maxLevel - l),
        height: 1 << (this.maxLevel - l)
      });
    }
    this.texture.needsUpdate = true;
  }

  debug (params) {

    if( this.canvas ) return;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.imageData = this.canvas.getContext('2d').createImageData(this.canvas.width, this.canvas.height);

    var verticalPosition = (params && params.verticalPosition) ? params.verticalPosition : 130;
    var horizontalPosition = (params && params.horizontalPosition) ? params.horizontalPosition : 10;
    var position = (params && params.position) ? params.position : "absolute";
    var zIndex = (params && params.zIndex) ? params.zIndex : "100";
    var borderColor = (params && params.borderColor) ? params.borderColor : "blue";
    var borderStyle = (params && params.borderStyle) ? params.borderStyle : "solid";
    var borderWidth = (params && params.borderWidth) ? params.borderWidth : 1;

    var fontSize = (params && params.fontSize) ? params.fontSize : 13; // in pixels
    var fontFamily = (params && params.fontFamily) ? params.fontFamily : "Arial";
    var lineHeight = (params && params.lineHeight) ? params.lineHeight : 20; // in pixels

    // create div title
    var divTitle = document.createElement('div');

    divTitle.style.color = "#000000";
    divTitle.style.fontFamily = fontFamily;
    divTitle.style.fontSize = fontSize + "px";
    divTitle.style.fontWeight = "bold";
    divTitle.style.zIndex = 100;
    divTitle.style.position = "absolute";
    divTitle.style.top = verticalPosition + "px";
    divTitle.style.left = horizontalPosition + "px";

    divTitle.innerHTML = "Indirection Table";
    document.body.appendChild(divTitle);

    this.canvas.style.top = verticalPosition + lineHeight + "px";
    this.canvas.style.left = horizontalPosition + "px";
    this.canvas.style.position = position;
    this.canvas.style.zIndex = zIndex;
    this.canvas.style.borderColor = borderColor;
    this.canvas.style.borderStyle = borderStyle;
    this.canvas.style.borderWidth = borderWidth + "px";

    document.body.appendChild(this.canvas);
  }

  writeToCanvas(cache) {
    const data = this.dataArrays[this.maxLevel];
    for (let j = 0; j < data.length; j += 4) {
      this.imageData.data[j    ] = data[j    ] * 255 / cache.pageCount.x;
      this.imageData.data[j + 1] = data[j + 1] * 255 / cache.pageCount.y;
      this.imageData.data[j + 2] = data[j + 2] * 255 / this.maxLevel;
      this.imageData.data[j + 3] = data[j + 3];
    }
    this.canvas.getContext('2d').putImageData(this.imageData, 0, 0);
  }

  writeToTexture() {
    this.texture.needsUpdate = true;
  }

  setData(z, cache, renderCount) {
    const size = 1 << z;
    const size0 = size >> 1;
    for (let x = 0; x < size; ++x) {
      for (let y = 0; y <size; ++y) {
        const pageId = z == 0 ? 0 : cache.getPageId(x, y, z);
        const offset = (size*y + x) * 4 ;
        if (pageId === undefined) {
          const offset0 = (size0* (y >> 1) + (x >> 1)) * 4 ;
          this.dataArrays[z][offset    ] = this.dataArrays[z-1][offset0     ];
          this.dataArrays[z][offset + 1] = this.dataArrays[z-1][offset0 + 1 ];
          this.dataArrays[z][offset + 2] = this.dataArrays[z-1][offset0 + 2 ];
          this.dataArrays[z][offset + 3] = this.dataArrays[z-1][offset0 + 3 ];;
        } else {
          this.dataArrays[z][offset    ] = cache.getPageX(pageId);
          this.dataArrays[z][offset + 1] = cache.getPageY(pageId);
          this.dataArrays[z][offset + 2] = cache.getPageZ(pageId);
          this.dataArrays[z][offset + 3] = Math.min(255, renderCount - cache.pages[pageId].lastHits);
        }
      }
    }
  }


  update (cache, renderCount) {
    for( let l = 0; l <= this.maxLevel; ++l) this.setData(l, cache, renderCount);
    this.writeToTexture();
    if (this.canvas) this.writeToCanvas(cache);
  }

  add (tileId, pageId) {
  //  console.log("add",tileId,pageId);
  }

  sub (tileId, pageId) {
  //  console.log("sub",tileId,pageId);
  }

  clear () {
  }
};
