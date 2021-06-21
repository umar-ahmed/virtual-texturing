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

export class IndirectionTable {
  constructor(context, size) {

    // quad-tree representation
    this.nodes = null;
    this.offsets = [];
    this.maxLevel = 0;
    this.size = size;
    this.numElementsPerLevel = [];

    // graphics and webgl stuff
    this.dataArray = new Float32Array(size * size * 4);
    this.canvas = null;
    this.imageData = null;
    this.texture = null;
    this.context = context;
    this.dataPerLevel = [];

    this.init(size);
  }

  init (size) {
    this.maxLevel = Math.floor(Math.log(size) / Math.log(2));

    var i, j, offset, numElements;
    var accumulator = 0;
    var sizeOnLevel = size;
    for (i = 0; i <= this.maxLevel; ++i) {

      this.offsets.push(accumulator);

      numElements = sizeOnLevel * sizeOnLevel;
      this.numElementsPerLevel.unshift(numElements);
      this.dataPerLevel.push(new Float32Array(numElements * 4));
      accumulator += numElements;

      sizeOnLevel >>= 1;
    }

    //this.nodes = new Array(accumulator);
    this.nodes = [];
    for (i = 0; i < accumulator; ++i) {
      this.nodes[i] = undefined;
    }

    for (i = 0; i < this.dataPerLevel.length; ++i) {
      numElements = this.numElementsPerLevel[i];
      for (j = 0; j < numElements; j += 4) {
        this.dataPerLevel[i][j] = 0.0;
        this.dataPerLevel[i][j + 1] = 0.0;
        this.dataPerLevel[i][j + 2] = 0.0;
        this.dataPerLevel[i][j + 3] = 255.0;
      }
    }

    // ------------------------------------------------
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    this.imageData = this.canvas.getContext('2d').createImageData(this.canvas.width, this.canvas.height);

    numElements = size * size;
    for (i = 0; i < numElements; ++i) {
      offset = i * 4;
      this.dataArray[offset] = 0.0;
      this.dataArray[offset + 1] = 0.0;
      this.dataArray[offset + 2] = 0.0;
      this.dataArray[offset + 3] = 255.0;
    }

    this.texture = new THREE.DataTexture(
      this.dataArray,
      size, //width
      size, //height
      THREE.RGBAFormat,
      THREE.FloatType,
      new THREE.UVMapping(),
      THREE.ClampToEdgeWrapping,
      THREE.ClampToEdgeWrapping,
      THREE.NearestFilter,
      THREE.NearestFilter
    );

    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  debug (params) {

    var scope = this;

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

    scope.canvas.style.top = verticalPosition + lineHeight + "px";
    scope.canvas.style.left = horizontalPosition + "px";
    scope.canvas.style.position = position;
    scope.canvas.style.zIndex = zIndex;
    scope.canvas.style.borderColor = borderColor;
    scope.canvas.style.borderStyle = borderStyle;
    scope.canvas.style.borderWidth = borderWidth + "px";

    document.body.appendChild(scope.canvas);
  }

  setChildren (entry, level, value, predicate) {
    if (0 === level) {
      return;
    }

    var i, iy, ix, currentEntry, element;
    var x = entry % this.getLevelWidth(level);
    var y = Math.floor(entry / this.getLevelHeight(level));

    var size = 1;
    for (i = level - 1; i >= 0; --i) {
      x <<= 1;
      y <<= 1;
      size <<= 1;

      for (iy = 0; iy < size; ++iy) {
        for (ix = 0; ix < size; ++ix) {
          currentEntry = this.getEntryIndex(x + ix, y + iy, i);
          element = this.getElementAt(currentEntry, i).value;

          if (predicate === element) {
            this.set(currentEntry, i, value);
          }
        }
      }
    }
  }

  update (cache) {

    var i, x, y, root, height, width, scope, lowerX, lowerY, idx, node, mipMapLevel;

    scope = this;

    root = this.nodes[this.nodes.length - 1];
    root.needsUpdate = true;
    root.visited = false;

    function setData(quadTreeLevel) {
      var _idx, _node, _coords, _mipMapLevel, _offset;
      var _length = scope.getElementCountAtLevel(quadTreeLevel);

      for (_idx = 0; _idx < _length; ++_idx) {
        _node = scope.getElementAt(_idx, 0);
        _coords = cache.getPageCoordinates(_node.value);
        _mipMapLevel = scope.maxLevel - cache.getPageMipLevel(_node.value);

        // idx => page
        _offset = _idx * 4;

        scope.dataArray[_offset] = _coords[0];
        scope.dataArray[_offset + 1] = _coords[1];
        scope.dataArray[_offset + 2] = _mipMapLevel;
        scope.dataArray[_offset + 3] = 255.0;

        scope.imageData.data[_offset] = parseInt(255 * _coords[0], 10);
        scope.imageData.data[_offset + 1] = parseInt(255 * _coords[1], 10);
        scope.imageData.data[_offset + 2] = parseInt(255 * _mipMapLevel, 10);
        scope.imageData.data[_offset + 3] = 255;
      }
    }

    function writeToCanvas() {
      var _x = 0;
      var _y = 0;
      scope.canvas.getContext('2d').putImageData(scope.imageData, _x, _y);
    }

    function writeToTexture() {
      // update indirection texture on GPU memory
      if (scope.texture.__webglTexture) {
        var gl = scope.context;
        gl.bindTexture(gl.TEXTURE_2D, scope.texture.__webglTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, scope.size, scope.size, gl.RGBA, gl.FLOAT, scope.dataArray);
      }
    }

    function setUpdate(_x, _y, _level, _handle, _mipMapLevel) {
      var _entry = scope.getEntryIndex(_x, _y, _level);
      var _node = scope.getElementAt(_entry, _level);

      var _isEmpty = ((-1) === _node.value);

      if (_isEmpty || (cache.getPageMipLevel(_node.value) > _mipMapLevel)) {
        scope.set(_entry, _level, _handle);
      }

      return false;
    }

    for (i = this.maxLevel; i >= 1; --i) {
      height = this.getLevelHeight(i);

      for (y = 0; y < height; ++y) {
        width = this.getLevelWidth(i);

        for (x = 0; x < width; ++x) {

          // update corresponding elements
          lowerX = x << 1;
          lowerY = y << 1;

          idx = this.getEntryIndex(x, y, i);
          node = this.getElementAt(idx, i);

          if (-1 === node.value) {
            console.error("Not Found");
            continue;
          }

          mipMapLevel = cache.getPageMipLevel(node.value);

          // update four children     ---------
          //              | a | b |
          //              |---  |---  |
          //              | c | d |
          //              ---------
          // a
          setUpdate(lowerX, lowerY, i - 1, node.value, mipMapLevel);
          // b
          setUpdate(lowerX + 1, lowerY, i - 1, node.value, mipMapLevel);
          // c
          setUpdate(lowerX, lowerY + 1, i - 1, node.value, mipMapLevel);
          // d
          setUpdate(lowerX + 1, lowerY + 1, i - 1, node.value, mipMapLevel);

          node.children[0].visited = false;
          node.children[1].visited = false;
          node.children[2].visited = false;
          node.children[3].visited = false;

          // merge cells
          node.canMergeChildren();
        }
      }
      //console.log('LEVEL');
    }

    setData(0);
    writeToCanvas();
    writeToTexture();

    //console.log(scope.numElementsPerLevel);
    //console.log(scope.dataPerLevel);
    //console.log(scope.dataArray);
  }

  getLevelWidth (level) {
    return 1 << (this.maxLevel - level);
  }

  getLevelHeight (level) {
    return 1 << (this.maxLevel - level);
  }

  getEntryIndex (x, y, level) {
    var countX = this.getLevelWidth(level);
    if (x > countX) {
      console.error('x is > total width of level ' + level + ' (' + countX + ')');
    }

    var offsetY = y * countX;
    var index = offsetY + x;

    return index;
  }

  getElementAt (entry, level) {
    var offset = this.offsets[level];
    var stride = offset + entry;
    var value = parseInt(this.nodes[stride].value, 10);

    if (isNaN(value)) {
      console.error('elemenet is NaN.');
    }

    return this.nodes[stride];
  }

  set (entry, level, newValue) {
    if (isNaN(entry) || isNaN(level) || isNaN(newValue)) {
      console.error('NaN detected on IndirectionTable.set');
      return false;
    }

    var offset = this.offsets[level];
    var stride = offset + entry;

    newValue = parseInt(newValue, 10);
    this.nodes[stride].update(newValue);
  }

  clear (clearValue) {
    var y, x, a, b, c, d, lowerX, lowerY, idx, node, mipMapLevel;

    var scope = this;
    function setUpdate(x, y, level, newValue) {
      var entry = scope.getEntryIndex(x, y, level);

      var offset = scope.offsets[level];
      var stride = offset + entry;
      var child = new NodeTree(entry, newValue, level);
      scope.nodes[stride] = child;

      return child;
    }

    clearValue = parseInt(clearValue, 10);

    this.nodes[this.nodes.length - 1] = new NodeTree(0, clearValue, 0);
    for (mipMapLevel = scope.maxLevel; mipMapLevel >= 1; --mipMapLevel) {
      for (y = 0; y < scope.getLevelHeight(mipMapLevel); ++y) {
        for (x = 0; x < scope.getLevelWidth(mipMapLevel); ++x) {

          // update corresponding elements
          lowerX = x << 1;
          lowerY = y << 1;

          idx = scope.getEntryIndex(x, y, mipMapLevel);
          node = scope.getElementAt(idx, mipMapLevel);

          a = setUpdate(lowerX, lowerY, mipMapLevel - 1, node.value);
          b = setUpdate(lowerX + 1, lowerY, mipMapLevel - 1, node.value);
          c = setUpdate(lowerX, lowerY + 1, mipMapLevel - 1, node.value);
          d = setUpdate(lowerX + 1, lowerY + 1, mipMapLevel - 1, node.value);

          node.setChildren(a, b, c, d);
        }
      }
    }
  }

  getElementCountAtLevel (level) {
    var countX = this.getLevelWidth(level);
    var countY = this.getLevelHeight(level);
    var total = countX * countY;
    return total;
  }
};
