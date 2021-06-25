//
//
//

/**
 * Mipmap table
 * level 0 has size*size entries
 * level 1 has (size>>1) * (size>>1)
 * level n-th has only 1 entry
*/
import { NodeTree } from './NodeTree.js';
import { DataTexture, RGBAIntegerFormat, UnsignedByteType, UVMapping, ClampToEdgeWrapping, NearestFilter }
from '../examples/jsm/three.module.js';

export class IndirectionTable {
  constructor(size) {

    // quad-tree representation
    this.nodes = null;
    this.maxLevel = 0;
    this.size = size;
    this.offsets = null;

    // graphics and webgl stuff
    this.texture = null;
    this.dataArrays = null;

    // debug
    this.canvas = null;
    this.imageData = null;

    this.init(size);
  }

  init (size) {
    this.maxLevel = Math.floor(Math.log(size) / Math.log(2));
    this.offsets = new Array(this.maxLevel + 1);
    this.dataArrays = new Array(this.maxLevel + 1);

    let i, j, offset;
    let accumulator = 0;
    let numElements = size * size;
    for (i = this.maxLevel; i >= 0; --i) {

      this.offsets[i] = accumulator;
      this.dataArrays[i] = new Uint8Array(numElements * 4);
      accumulator += numElements;
      numElements >>= 2;
    }

    this.nodes = [];
    for (i = 0; i < accumulator; ++i) {
      this.nodes[i] = undefined;
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
      this.dataArrays[this.maxLevel],
      size, //width
      size, //height
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

  setChildren (x, y, z, newValue, oldValue) {
    if (z == this.maxLevel) return;
    let size = 1;
    for (let iz = z + 1; iz <= this.maxLevel; ++iz) {
      x <<= 1;
      y <<= 1;
      size <<= 1;

      for (let iy = y; iy < y+size; ++iy)
        for (let ix = x; ix < x+size; ++ix)
          if (this.getValueAt(ix, iy, iz) === oldValue)
            this.setValueAt(ix, iy, iz, newValue);
    }
  }

  writeToCanvas(cache) {
    const data = this.dataArrays[this.maxLevel];
    for (let j = 0; j < data.length; j += 4) {
      this.imageData.data[j    ] = data[j    ] * 255 / cache.tileCountPerSide.x;
      this.imageData.data[j + 1] = data[j + 1] * 255 / cache.tileCountPerSide.y;
      this.imageData.data[j + 2] = data[j + 2] * 255 / this.maxLevel;
      this.imageData.data[j + 3] = data[j + 3];
    }
    this.canvas.getContext('2d').putImageData(this.imageData, 0, 0);
  }

  writeToTexture() {
    this.texture.needsUpdate = true;
  }

  setData(z, cache, renderCount) {
    const width = this.getWidth(z);
    const height = this.getHeight(z);

    for (let x = 0; x < width; ++x) {
      for (let y = 0; y < height; ++y) {
        const id = this.getValueAt(x, y, z);
        const offset = (width*y + x) * 4 ;
        this.dataArrays[z][offset    ] = cache.getPageX(id);
        this.dataArrays[z][offset + 1] = cache.getPageY(id);
        this.dataArrays[z][offset + 2] = cache.getPageZ(id);
        this.dataArrays[z][offset + 3] = Math.min(255, renderCount - cache.pages[id].lastHits);
      }
    }
  }


  update (cache, renderCount) {
    const  root = this.nodes[this.nodes.length - 1];
    root.needsUpdate = true;
    root.visited = false;
    for (let z = 0; z < this.maxLevel; ++z) {
      const height = this.getHeight(z);

      for (let y = 0; y < height; ++y) {
        const width = this.getWidth(z);

        for (let x = 0; x < width; ++x) {

          // update corresponding elements
          const lowerX = x << 1;
          const lowerY = y << 1;
          const lowerZ = z + 1;

          const node = this.getElementAt(x, y, z);

          if (-1 === node.value) {
            console.error("Not Found");
            continue;
          }

          const pageZ = cache.getPageZ(node.value);
          this.setUpdate(lowerX, lowerY, lowerZ, node.value, pageZ, cache);
          this.setUpdate(lowerX + 1, lowerY, lowerZ, node.value, pageZ, cache);
          this.setUpdate(lowerX, lowerY + 1, lowerZ, node.value, pageZ, cache);
          this.setUpdate(lowerX + 1, lowerY + 1, lowerZ, node.value, pageZ, cache);

          node.children[0].visited = false;
          node.children[1].visited = false;
          node.children[2].visited = false;
          node.children[3].visited = false;

          // merge cells
          node.canMergeChildren();
        }
      }
    }

    for( let l = 0; l <= this.maxLevel; ++l) this.setData(l, cache, renderCount);
    this.writeToTexture();
    if (this.canvas) this.writeToCanvas(cache);

  }

  getEntryIndex (x, y, z) {
    return this.offsets[z] + y * this.getWidth(z) + x;
  }

  getElementAt (x, y, z) {
    return this.nodes[this.getEntryIndex(x, y, z)];
  }

  getValueAt (x, y, z) {
    return this.getElementAt(x, y, z).value;
  }

  setValueAt (x, y, z, value) {
    this.getElementAt(x, y, z).value = value;
  }

  setUpdateClear(x, y, z, newValue) {
    const child = new NodeTree(newValue);
    this.nodes[this.getEntryIndex(x, y, z)] = child;
    return child;
  }

  setUpdate(x, y, z, newValue, pageZ, cache) {
    const value = this.getValueAt(x, y, z);
    const isEmpty = ((-1) === value);
    if (isEmpty || (cache.getPageZ(value) < pageZ)) {
      this.setValueAt(x, y, z, newValue);
    }
  }

  clear (id) {
    this.nodes[this.nodes.length - 1] = new NodeTree(id);
    for (let z = 0; z < this.maxLevel; ++z) {
      for (let y = 0; y < this.getHeight(z); ++y) {
        for (let x = 0; x < this.getWidth(z); ++x) {

          // update corresponding elements
          let X = x << 1;
          let Y = y << 1;
          let Z = z+1;

          let node = this.getElementAt(x, y, z);
          let a = this.setUpdateClear(X    , Y    , Z, node.value);
          let b = this.setUpdateClear(X + 1, Y    , Z, node.value);
          let c = this.setUpdateClear(X    , Y + 1, Z, node.value);
          let d = this.setUpdateClear(X + 1, Y + 1, Z, node.value);
          node.setChildren(a, b, c, d);
        }
      }
    }
  }

  getWidth (z) {
    return 1 << z;
  }

  getHeight (z) {
    return 1 << z;
  }
};
