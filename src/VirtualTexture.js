/**
 * @author elfrank - http://franciscoavila.mx
 */

 import { Cache, StatusNotAvailable, StatusAvailable, StatusPendingDelete } from './Cache.js';
 import { TileDetermination } from './TileDetermination.js';
 import { IndirectionTable } from './IndirectionTable.js';
 import { TileQueue } from './TileQueue.js';
 import { UsageTable } from './UsageTable.js';
 import { PageId } from './PageId.js';
 import { Tile } from './Tile.js';
 import { VisibleTileShader } from './VisibleTileShader.js';
 import { VirtualTextureShader } from './VirtualTextureShader.js';
 import { UniformsUtils, DoubleSide, ShaderMaterial, Mesh } from '../examples/jsm/three.module.js';

export class VirtualTexture {
  constructor( params ) {
    if (!params) {
      console.error('\'params\' is not defined. Virtual Texturing cannot start.');
      return;
    }

    this.minMipMapLevel = params.minMipMapLevel;
    this.maxMipMapLevel = params.maxMipMapLevel;
    this.tileSize = params.tileSize;
    this.tilePadding = params.tilePadding;
    this.cacheSize = params.cacheSize;
    this.tileDeterminationRatio = params.tileDeterminationRatio;
    this.useProgressiveLoading = true;

    // init tile queue
    this.tileQueue = new TileQueue(2);
    this.tileQueue.getTilePath = params.getTilePath;

    this.tileCount = 1 << this.maxMipMapLevel;
    this.size = [ this.tileSize[0] * this.tileCount, this.tileSize[1] * this.tileCount];

    console.log('Virtual Texture: width: ' + this.size[0] + ' height: ' + this.size[1]);


    // init tile determination program
    this.tileDetermination = new TileDetermination();

    // init page table
    this.indirectionTable = new IndirectionTable(this.minMipMapLevel, this.maxMipMapLevel);
    console.log("Indirection table size: " + this.tileCount);

    // init page cache
    this.cache = new Cache(
      this.tileSize,           // pageSizeRoot,
      this.tilePadding,          // padding,
      this.cacheSize,
      this.cacheSize  // cacheSizeRoot
    );

    const scope = this;
    this.cache.pageDroppedCallback = function (pageX, pageY, pageZ) {
      scope.indirectionTable.dropPage(pageX, pageY, pageZ);
    };

    // init usage table
    this.usageTable = new UsageTable(this.indirectionTable.size);

    this.tileQueue.callback = function (tile) {
      var status = scope.cache.getPageStatus(tile.id); // was parentId... not sure why
      if (status !== StatusAvailable) {
        var slot = scope.cache.cacheTile(tile, tile.id == 0);
        scope.indirectionTable.setSlot(tile.pageX, tile.pageY, tile.pageZ, slot);
      }
      scope.needsUpdate = true;
    };

    this.needsUpdate = false;
    this.debugCache = false;
    this.debugLevel = false;
    this.debugLastHits = false;
    this.textureMode = 0;
    this.init();
    this.setSize(window.innerWidth, window.innerHeight);
  }

  setSize( width, height ) {

    this.tileDetermination.setSize(
      Math.floor( width * this.tileDeterminationRatio ),
      Math.floor( height * this.tileDeterminationRatio )
    );

  }

    init() {
      this.resetCache();
      this.needsUpdate = true;
    }

    resetCache () {
      this.cache.clear();
      this.indirectionTable.clear();

      const z = this.minMipMapLevel;
      const size = 1 << z;
      for (let y = 0; y < size; ++y) {
        for (let x = 0; x < size; ++x) {
          const id = PageId.create(x, y, z);
          const tile = new Tile(id, Number.MAX_VALUE);
          this.tileQueue.push(tile);
        }
      }
    }

    restoreOrEnqueueVisibleUncachedTiles() {
      for (let pageId in this.usageTable.table) {
        if (this.usageTable.table.hasOwnProperty(pageId)) {
          let pageX = PageId.getPageX(pageId);
          let pageY = PageId.getPageY(pageId);
          let pageZ = PageId.getPageZ(pageId);
          let size = 1 << pageZ;

          if (pageX >= size || pageY >= size || pageX < 0 || pageY < 0) {
            // FIXME: Pending bug
            console.error('Out of bounds error:\npageX: ' + pageX + '\npageY: ' + pageY + '\npageZ: ' + pageZ);
            continue;
          }

          const status = this.cache.getPageStatus(pageId);

          // if page is pending delete, try to restore it
          let wasRestored = false;
          if (StatusPendingDelete === status) {
            slot = this.cache.restorePage(pageId);
            if (slot != -1) {
              this.indirectionTable.setSlot(pageX, pageY, pageZ, slot);
              wasRestored = true;
            }
          }

          if ((StatusAvailable !== status) && !wasRestored) {

            const minParentZ = this.useProgressiveLoading ? 0 : (pageZ - 1);

            // request the page and all parents
            while (pageZ > minParentZ) {

              const newPageId = PageId.create(pageX, pageY, pageZ);
              const newPageStatus = this.cache.getPageStatus(newPageId);

              // FIXME: should try to restore page?
              //slot = this.cache.restorePage(newPageId);
              //if ((StatusAvailable !== newPageStatus) && slot == -1) {
              if ((StatusAvailable !== newPageStatus)) {
                if (!this.tileQueue.contains(newPageId)) {
                  const hits = this.usageTable.table[pageId];
                  const tile = new Tile(newPageId, hits);
                  this.tileQueue.push(tile);
                }
              }
              pageX >>= 1;
              pageY >>= 1;
              --pageZ;
            }
          }
        }
      }
    }

    update (renderer, camera) {
      //if(!this.needsUpdate) return;
      this.tileDetermination.update( renderer, camera );
      this.usageTable.update( this.tileDetermination.data );
      this.restoreOrEnqueueVisibleUncachedTiles();
      this.cache.update( renderer, this.usageTable );
      this.indirectionTable.update( this.cache, renderer.renderCount );

    }

    addGeometry ( geometry ) {

      const uniforms = UniformsUtils.clone( VisibleTileShader.uniforms );

      uniforms.vt_size.value = this.size;
      uniforms.vt_minMipMapLevel.value = this.minMipMapLevel;
      uniforms.vt_maxMipMapLevel.value = this.maxMipMapLevel;
      uniforms.vt_tileCount.value = this.tileCount;

      const parameters = {
        uniforms: uniforms,
        fragmentShader: VisibleTileShader.fragmentShader,
        vertexShader: VisibleTileShader.vertexShader,
        side: DoubleSide
      };

      const materialVT = new ShaderMaterial(parameters);
      const meshVT = new Mesh(geometry, materialVT);

      this.tileDetermination.scene.add(meshVT);
    };

    createMaterial ( parameters, textureName ) {

      const material = new ShaderMaterial( parameters );
      const uniforms = VirtualTextureShader.uniforms;
      material.uniforms = UniformsUtils.merge( [ uniforms, material.uniforms ] ),
      material.virtualTextureName = textureName;
      this.updateUniforms( material );
      return material;

    };

    updateUniforms ( material ) {

      const uniforms = material.uniforms;
      const vt = uniforms[material.virtualTextureName].value;
      vt.texture = this.cache.texture;
      vt.cacheIndirection = this.indirectionTable.texture;
      vt.padding = [ this.cache.padding/this.cache.realTileSize.x , this.cache.padding/this.cache.realTileSize.y ];
      vt.tileSize = [ this.cache.realTileSize.x , this.cache.realTileSize.y ];
      vt.numTiles = [ this.cache.tileCountPerSide.x , this.cache.tileCountPerSide.y ];
      vt.maxMipMapLevel = this.maxMipMapLevel;
      uniforms.bDebugCache.value = this.debugCache;
      uniforms.bDebugLevel.value = this.debugLevel;
      uniforms.bDebugLastHits.value = this.debugLastHits;
      uniforms.iTextureMode.value = this.textureMode;

    };
};
