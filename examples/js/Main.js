/**
 * @author Francico Avila - http://franciscoavila.mx
 */

import { RenderWithVtShader } from './RenderWithVtShader.js';
import * as VT from '../../src/VirtualTexture.js';

export class APP {
  constructor(canvas) {
    this.domContainer = document.getElementById(canvas || "canvas_container");
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.controls = null;
    this.mesh = null;
    this.clock = new THREE.Clock();

    this.virtualTexture = null;

  }


  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.virtualTexture.setSize(w, h);
  }

  onKeyDown(e) {
    //1
    var uniforms = this.mesh.material.uniforms;

    switch ( e.keyCode ) {
    case 49: // 1
      uniforms.bVirtualTextureDebugUvs.value = 0;
      uniforms.bVirtualTextureDebugDiscontinuities.value = 0;
      uniforms.bVirtualTextureDebugMipMapLevel.value = 0;

      uniforms.bVirtualTextureDebugUvs.needsUpdate = true;
      uniforms.bVirtualTextureDebugDiscontinuities.needsUpdate = true;
      uniforms.bVirtualTextureDebugMipMapLevel.needsUpdate = true;
      break;
    case 50: // 2
      console.log(e.keyCode);
      uniforms.bVirtualTextureDebugUvs.value = 0;
      uniforms.bVirtualTextureDebugDiscontinuities.value = 0;
      uniforms.bVirtualTextureDebugMipMapLevel.value = 1;

      uniforms.bVirtualTextureDebugUvs.needsUpdate = true;
      uniforms.bVirtualTextureDebugDiscontinuities.needsUpdate = true;
      uniforms.bVirtualTextureDebugMipMapLevel.needsUpdate = true;
      break;
    case 51: // 3
      console.log(e.keyCode);
      uniforms.bVirtualTextureDebugUvs.value = 1;
      uniforms.bVirtualTextureDebugDiscontinuities.value = 0;
      uniforms.bVirtualTextureDebugMipMapLevel.value = 0;

      uniforms.bVirtualTextureDebugUvs.needsUpdate = true;
      uniforms.bVirtualTextureDebugDiscontinuities.needsUpdate = true;
      uniforms.bVirtualTextureDebugMipMapLevel.needsUpdate = true;
      break;
    case 52: // 4
      console.log(e.keyCode);
      uniforms.bVirtualTextureDebugUvs.value = 0;
      uniforms.bVirtualTextureDebugDiscontinuities.value = 1;
      uniforms.bVirtualTextureDebugMipMapLevel.value = 0;

      uniforms.bVirtualTextureDebugUvs.needsUpdate = true;
      uniforms.bVirtualTextureDebugDiscontinuities.needsUpdate = true;
      uniforms.bVirtualTextureDebugMipMapLevel.needsUpdate = true;
      break;
    default: //
      break;
    }
  }

  render() {
    if (this.virtualTexture && this.renderer.renderCount > 0) {
      this.virtualTexture.render(this.renderer, this.camera);
    }

    ++this.renderer.renderCount;
    this.renderer.render(this.scene, this.camera);
  }

  run() {
    var delta = this.clock.getDelta();

    this.controls.update(delta);
    requestAnimationFrame(this.run.bind(this));

    this.render();
  }

  start() {

  /*********************************************************************************/
    // if browsers supports webgl
    if (Detector.webgl) {

      var width = window.innerWidth;
      var height = window.innerHeight;
      console.log("width:" + width + " height:" + height);

      this.renderer = new THREE.WebGLRenderer();
      this.renderer.gammaInput = true;
      this.renderer.gammaOutput = true;
      this.renderer.physicallyBasedShading = true;
      this.renderer.renderCount = 0;
      this.renderer.setSize(width, height);

      // OES_standard_derivaties used to compute mip level on virtual texturing
      this.renderer.context.getExtension("OES_standard_derivatives");
      this.renderer.context.getExtension("OES_texture_float");
      this.renderer.context.getExtension("OES_texture_float_linear");

      this.domContainer.appendChild(this.renderer.domElement);

      // create a scene
      this.scene = new THREE.Scene();

    /**********************************************************************************/

      // create lights and add them to the scene
      var lightFront = new THREE.PointLight(0xffffff, 1.5, 200); // light in front of model
      lightFront.position.set(-25, -25, 100);
      this.scene.add(lightFront);

      var lightBack = new THREE.PointLight(0xffffff, 1.5, 200); // light behind of model
      lightBack.position.set(-25, -25, -100);
      this.scene.add(lightBack);

    /**********************************************************************************/

      // put a camera in the scene
      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);
      this.camera.position.set(0.0, 0.0, 80.0);

      this.scene.add(this.camera);

    /**********************************************************************************/

      this.controls = new THREE.FlyControls(this.camera, this.renderer.domElement);
      this.controls.movementSpeed = 50;
      this.controls.domElement = this.renderer.domElement;
      this.controls.rollSpeed = Math.PI / 12;
      this.controls.autoForward = false;
      this.controls.dragToLook = true;

      /*this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.rotateSpeed = 1.0;
      this.controls.zoomSpeed = 5.0;
      this.controls.noZoom = false;
      this.controls.panSpeed = 0.8;
      this.controls.noPan = false;
      this.controls.staticMoving = false;
      this.controls.dynamicDampingFactor = 0.3;
      this.controls.keys = [65, 83, 68];*/

      window.addEventListener('keydown', this.onKeyDown.bind(this), false);
      window.addEventListener('resize', this.resize.bind(this), false);

      /**********************************************************************************/

      // start animation frame and rendering
      return true;
    }

    // if browser doesn't support webgl, load this instead
    console.error('There was a problem loading WebGL');
    return false;
  }

  load(geometry, config) {

    this.virtualTexture = new VT.VirtualTexture(config);

    var material = VT.createVirtualTextureMaterial(this.virtualTexture, RenderWithVtShader);
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    VT.duplicateGeometryForVirtualTexturing(geometry, this.virtualTexture);

    // init debug helpers
    this.virtualTexture.tileDetermination.debug();
    this.virtualTexture.indirectionTable.debug();
  }
};
