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

    this.maxMipMapLevel = params.maxMipMapLevel;
    this.tileSize = params.tileSize;
    this.tilePadding = params.tilePadding;
    this.cacheSize = params.cacheSize;
    this.ratio = params.ratio;

    // init tile queue
    this.tileQueue = new TileQueue(2);
    this.tileQueue.getTilePath = params.getTilePath;

    var lengthPerSide = 1 << Math.log(this.tileSize) / Math.log(2) + this.maxMipMapLevel;
    this.size = lengthPerSide;

    console.log('Virtual Texture: width: ' + this.size + ' height: ' + this.size);

    this.tileCount = this.size / this.tileSize;

    // init tile determination program
    this.tileDetermination = new TileDetermination();

    // init page table
    var cacheSize = this.size / this.tileSize;
    this.indirectionTable = new IndirectionTable(cacheSize);
    console.log("Indirection table size: " + cacheSize);

    // init page cache
    this.cache = new Cache(
      this.tileSize,           // pageSizeRoot,
      this.tilePadding,          // padding,
      this.cacheSize,
      this.cacheSize  // cacheSizeRoot
    );

    var scope = this;
    this.cache.pageDroppedCallback = function (page, mipLevel) {
      var handle = scope.indirectionTable.getElementAt(page, mipLevel).value;
      scope.indirectionTable.set(page, mipLevel, -1);
      scope.indirectionTable.setChildren(page, mipLevel, -1, handle);
    };

    // init usage table
    this.usageTable = new UsageTable(this.indirectionTable.size);

    this.tileQueue.callback = function (tile) {

      var status = scope.cache.getPageStatus(tile.parentId);
      var tileAlreadyOnCache = (StatusAvailable === status);

      if (!tileAlreadyOnCache) {

        var handle = scope.cache.cachePage(tile, false);
        var pageNumber = PageId.getPageNumber(tile.id);
        var mipMapLevel = PageId.getMipMapLevel(tile.id);

        scope.indirectionTable.set(pageNumber, mipMapLevel, handle);
        //++boundPages;
      }

      scope.needsUpdate = true;
      //++erasedCount;
    };

    this.needsUpdate = false;

    this.init();

    this.setSize(window.innerWidth, window.innerHeight);
  }

  setSize( width, height ) {

    this.tileDetermination.setSize(
      Math.floor( width * this.ratio ),
      Math.floor( height * this.ratio )
    );

  }

    init() {
      this.resetCache();

      this.needsUpdate = true;
    }

    resetCache () {
      // delete all entries in cache and set all slots as free
      this.cache.clear();
      // set all slots in page table as -1 (invalid)
      this.indirectionTable.clear(-1);
      var pageId = PageId.create(0, this.indirectionTable.maxLevel);
      var tile = new Tile(pageId, Number.MAX_VALUE);
      this.tileQueue.push(tile);
    }

    update (renderer, camera) {
      //if(!this.needsUpdate) return;
      this.tileDetermination.update(renderer, camera, this.usageTable);

      var element, level, isUsed;
      var releasedPagesCount = 0;
      var restoredPagesCount = 0;
      var alreadyCachedPagesCount = 0;
      var tilesRequestedCount = 0;

/*      for (element in this.cache.cachedPages) {
        if (this.cache.cachedPages.hasOwnProperty(element)) {
          element = parseInt(element, 10);

          level = PageId.getMipMapLevel(element);
          isUsed = this.usageTable.isUsed(element);

          if ((!isUsed) && (level < this.maxMipMapLevel)) {
            this.cache.releasePage(element);
            ++releasedPagesCount;
          }
        }
      }
*/
      var i, x, y, restored, wasRestored, pageId, pageNumber, mipMapLevel, elementCountAtLevel, status,
        useProgressiveLoading, maxParentMipMapLevel, newNumber, newPageId, newPageStatus, tmpId, hits, tile;

      // find the items which are not cached yet
      for (pageId in this.usageTable.table) {
        if (this.usageTable.table.hasOwnProperty(pageId)) {
          wasRestored = false;

          pageId = parseInt(pageId, 10);
          pageNumber = PageId.getPageNumber(pageId);
          mipMapLevel = PageId.getMipMapLevel(pageId);
          elementCountAtLevel = this.indirectionTable.getElementCountAtLevel(mipMapLevel);

          if (pageNumber >= elementCountAtLevel) {
            // FIXME: Pending bug
            console.error('Out of bounds error:\npageNumber: ' + pageNumber + "\nmipMapLevel: " + mipMapLevel);
            continue;
          }

          status = this.cache.getPageStatus(pageId);

          // if page is already cached, continue
          if (StatusAvailable === status) {
            ++alreadyCachedPagesCount;

          } else if (StatusPendingDelete === status) {

            // if page is pending delete, try to restore it
            restored = this.cache.restorePage(pageId);
            if (restored.wasRestored) {
              this.indirectionTable.set(pageNumber, mipMapLevel, restored.id);

              wasRestored = true;
              ++restoredPagesCount;
            }
          }

          if ((StatusAvailable !== status) && !wasRestored) {

            useProgressiveLoading = true;
            maxParentMipMapLevel = useProgressiveLoading ? this.indirectionTable.maxLevel : (mipMapLevel + 1);

            // request the page and all parents
            for (i = mipMapLevel; i < maxParentMipMapLevel; ++i) {
              x = pageNumber % this.indirectionTable.getLevelWidth(mipMapLevel);
              y = Math.floor(pageNumber / this.indirectionTable.getLevelHeight(mipMapLevel));

              x >>= (i - mipMapLevel);
              y >>= (i - mipMapLevel);

              newNumber = y * this.indirectionTable.getLevelWidth(i) + x;
              newPageId = PageId.create(newNumber, i);

              newPageStatus = this.cache.getPageStatus(newPageId);

              // FIXME: should try to restore page?
              //restored = this.cache.restorePage(newPageId);
              //if ((StatusAvailable !== newPageStatus) && !restored.wasRestored) {
              if ((StatusAvailable !== newPageStatus)) {
                if (!this.tileQueue.contains(newPageId)) {
                  tmpId = ((newPageId !== pageId) ? pageId : PageId.createInvalid());
                  hits = this.usageTable.table[pageId].hits;
                  tile = new Tile(newPageId, hits, tmpId);

                  this.tileQueue.push(tile);
                  ++tilesRequestedCount;
                }
              }
            } // for (var i = mipMapLevel; i < maxParentMipMapLevel; ++i) {
          }
        }
      } // for (var pageId in this.sparseTable.table) {

      var cacheStatusData = this.cache.getStatus(0, 0, 0);

      /*console.log('# Released Pages: ' + releasedPagesCount + '\n' +
        '# Restored Pages: ' + restoredPagesCount + '\n' +
        '# Already Cached Pages: ' + alreadyCachedPagesCount + '\n' +
        '# Tiles Requested: ' + tilesRequestedCount);

      console.log("EntryCount:\t"   + this.usageTable.entryCount +
            "\nUsed:\t\t"   + cacheStatusData.used +
            "\nFree:\t\t"   + cacheStatusData.free +
            "\nMarkedFree:\t"   + cacheStatusData.markedFree);*/

      this.cache.update( renderer );
      this.indirectionTable.update( this.cache );
      this.usageTable.clear();
    }

    addGeometry ( geometry ) {

      const uniforms = UniformsUtils.clone( VisibleTileShader.uniforms );

      uniforms.fVirtualTextureSize.value = [ this.size, this.size ];
      uniforms.fMaximumMipMapLevel.value = this.maxMipMapLevel;
      uniforms.fTileCount.value = this.tileCount;

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

    createMaterial ( parameters ) {

      const material = new ShaderMaterial( parameters );
      const uniforms = VirtualTextureShader.uniforms;
      material.uniforms = UniformsUtils.merge( [ uniforms, material.uniforms ] ),
      this.updateUniforms( material );
      return material;

    };

    updateUniforms ( material ) {

      const uniforms = material.uniforms;
      const pageSizeInTextureSpaceXY = [
        this.cache.usablePageSize / this.cache.size.x,
        this.cache.usablePageSize / this.cache.size.y
      ];
      uniforms.tCacheIndirection.value = this.indirectionTable.texture;
      uniforms.vCachePageSize.value = pageSizeInTextureSpaceXY;
      uniforms.vCacheSize.value = [ this.cache.width, this.cache.height ];
      uniforms.vTextureSize.value = this.size;
      uniforms.fMaxMipMapLevel.value = this.maxMipMapLevel;
      uniforms.tDiffuse.value = this.cache.textures.tDiffuse;

    };
};
