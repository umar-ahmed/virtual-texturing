//
//
//

export class TileDetermination {
  constructor() {
    this.scene = new THREE.Scene();
    this.canvas = null;
    this.renderTarget = null;
    this.data = null;
    this.imgData = null;
  }

  init (_width, _height) {
    var renderTargetParameters = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      stencilBufer: false
    };

    // TODO: resize rt on window resize
    this.renderTarget = new THREE.WebGLRenderTarget(
      Math.floor(_width * 0.125),
      Math.floor(_height * 0.125),
      renderTargetParameters
    );

    var width = this.renderTarget.width;
    var height = this.renderTarget.height;

    this.data = new Uint8Array(width * height * 4);
  }

  debug () {
    if ( this.canvas ) return;

    var verticalPosition = 0;
    var horizontalPosition = 10;
    var position = "absolute";
    var zIndex = "100";
    var borderColor = "red";
    var borderStyle = "solid";
    var borderWidth = 1;

    var fontSize = 13; // in pixels
    var fontFamily = "Arial";
    var lineHeight = 20; // in pixels

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

    divTitle.innerHTML = "Visible Tiles (Feedback Buffer)";
    document.body.appendChild(divTitle);

    const width = this.renderTarget.width;
    const height = this.renderTarget.height;

    this.canvas = document.createElement('canvas');
    this.canvas.width =  width;
    this.canvas.height = height;
    this.canvas.style.top = verticalPosition + lineHeight + "px";
    this.canvas.style.left = horizontalPosition + "px";
    this.canvas.style.position = position;
    this.canvas.style.zIndex = zIndex;
    this.canvas.style.borderColor = borderColor;
    this.canvas.style.borderStyle = borderStyle;
    this.canvas.style.borderWidth = borderWidth + "px";
    this.imgData = this.canvas.getContext('2d').createImageData(width, height);

    document.body.appendChild(this.canvas);
  }

  parse(sparseTable) {
    let i, r, g, b;
    const numPixels = 4 * this.renderTarget.width * this.renderTarget.height;

    for (i = 0; i < numPixels; i += 4) {

      if (0 !== this.data[i + 3]) {
        r = this.data[i];
        g = this.data[i + 1];
        b = this.data[i + 2];

        sparseTable.set(r, g, b);
      }
    }
  }

  parseImage (renderer, sparseTable) {
    // copy render buffer to this.data
    var gl = renderer.context;
    gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
    gl.readPixels(0, 0, this.renderTarget.width, this.renderTarget.height, gl.RGBA, gl.UNSIGNED_BYTE, this.data);

    // parse uv and page id from render target
    this.parse(sparseTable);

    if (this.canvas) {
      // copy the flipped texture to data
      this.imgData.data.set(this.data);
      this.canvas.getContext('2d').putImageData(this.imgData, 0, 0);
    }
  }

};
