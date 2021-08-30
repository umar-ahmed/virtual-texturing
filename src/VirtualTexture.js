/**
 * @author elfrank - http://franciscoavila.mx
 */

 import { Cache, StatusNotAvailable, StatusAvailable, StatusPendingDelete } from './Cache.js';
 import { TileDetermination } from './TileDetermination.js';
 import { IndirectionTable } from './IndirectionTable.js';
 import { TileQueue } from './TileQueue.js';
 import { UsageTable } from './UsageTable.js';
 import { TileId } from './TileId.js';
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
    this.pageCount = params.pageCount;
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
      this.tileSize,
      this.tilePadding,
      this.pageCount,
      this.maxMipMapLevel
    );

    const scope = this;
    this.cache.pageDroppedCallback = function (tileId, PageId) {
      scope.indirectionTable.sub(tileId, PageId);
    };

    // init usage table
    this.usageTable = new UsageTable(this.maxMipMapLevel);

    this.tileQueue.callback = function (tile) {
      var status = scope.cache.getPageStatus(tile.id); // was parentId... not sure why
      if (status !== StatusAvailable) {
        var pageId = scope.cache.cacheTile(tile, tile.id == 0);
        scope.indirectionTable.add(tile.id, pageId);
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
          const id = TileId.create(x, y, z);
          const tile = new Tile(id, Number.MAX_VALUE);
          this.tileQueue.push(tile);
        }
      }
    }

    restoreOrEnqueueVisibleUncachedTiles() {
      for (let tileId in this.usageTable.table) {
        if (this.usageTable.table.hasOwnProperty(tileId)) {
          let pageX = TileId.getX(tileId);
          let pageY = TileId.getY(tileId);
          let pageZ = TileId.getZ(tileId);
          let size = 1 << pageZ;

          if (pageX >= size || pageY >= size || pageX < 0 || pageY < 0) {
            // FIXME: Pending bug
            console.error('Out of bounds error:\npageX: ' + pageX + '\npageY: ' + pageY + '\npageZ: ' + pageZ);
            continue;
          }

          const status = this.cache.getPageStatus(tileId);

          // if page is pending delete, try to restore it
          let wasRestored = false;
          if (StatusPendingDelete === status) {
            pageId = this.cache.restorePage(tileId);
            if (pageId != -1) {
              this.indirectionTable.setPage(pageX, pageY, pageZ, pageId);
              wasRestored = true;
            }
          }

          if ((StatusAvailable !== status) && !wasRestored) {

            const minParentZ = this.useProgressiveLoading ? 0 : (pageZ - 1);

            // request the page and all parents
            while (pageZ > minParentZ) {

              const newTileId = TileId.create(pageX, pageY, pageZ);
              const newPageStatus = this.cache.getPageStatus(newTileId);

              // FIXME: should try to restore page?
              //pageId = this.cache.restorePage(newTileId);
              //if ((StatusAvailable !== newPageStatus) && pageId == -1) {
              if ((StatusAvailable !== newPageStatus)) {
                if (!this.tileQueue.contains(newTileId)) {
                  const hits = this.usageTable.table[tileId];
                  const tile = new Tile(newTileId, hits);
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
      vt.numPages = [ this.cache.pageCount.x , this.cache.pageCount.y ];
      vt.maxMipMapLevel = this.maxMipMapLevel;
      uniforms.bDebugCache.value = this.debugCache;
      uniforms.bDebugLevel.value = this.debugLevel;
      uniforms.bDebugLastHits.value = this.debugLastHits;
      uniforms.iTextureMode.value = this.textureMode;

    };
};
