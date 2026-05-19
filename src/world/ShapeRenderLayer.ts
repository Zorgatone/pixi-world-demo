import { Container, Sprite } from "pixi.js";

import { Camera } from "../camera/Camera";
import { CHUNK_SIZE } from "../constants";
import { ShapeTextureCache } from "../textures";
import { ShapeData } from "../types/ShapeData";

import { ChunkedSpatialGrid, type SpatialBounds } from "./ChunkedSpatialGrid";

const VISIBILITY_MARGIN = CHUNK_SIZE;
const QUERY_REFRESH_MARGIN = VISIBILITY_MARGIN * 0.5;
const BOUNDS_EPSILON = 0.001;

export interface ShapeRenderStats {
  totalObjects: number;
  activeSprites: number;
  culledObjects: number;
  poolSize: number;
  queryResultCount: number;
  chunkCountTouched: number;
}

export class ShapeRenderLayer {
  public readonly view: Container;

  private readonly _textures: ShapeTextureCache;
  private readonly _spatialGrid: ChunkedSpatialGrid;
  private readonly _queryResults: ShapeData[];
  private readonly _queryResultSet: Set<ShapeData>;
  private readonly _activeSprites: Map<ShapeData, Sprite>;
  private readonly _spritePool: Sprite[];
  private readonly _stats: ShapeRenderStats;
  private _lastBounds?: SpatialBounds;

  public constructor(
    textures: ShapeTextureCache,
    objects: readonly ShapeData[],
  ) {
    this.view = new Container();
    this._textures = textures;
    this._spatialGrid = new ChunkedSpatialGrid(objects);
    this._queryResults = [];
    this._queryResultSet = new Set<ShapeData>();
    this._activeSprites = new Map<ShapeData, Sprite>();
    this._spritePool = [];
    this._stats = {
      totalObjects: objects.length,
      activeSprites: 0,
      culledObjects: objects.length,
      poolSize: 0,
      queryResultCount: 0,
      chunkCountTouched: 0,
    };
  }

  public get stats(): Readonly<ShapeRenderStats> {
    return this._stats;
  }

  public tick(camera: Camera): void {
    const refreshBounds = camera.getVisibleBounds(QUERY_REFRESH_MARGIN);

    if (
      this._lastBounds &&
      this._containsBounds(this._lastBounds, refreshBounds)
    ) {
      return;
    }

    const queryBounds = camera.getVisibleBounds(VISIBILITY_MARGIN);

    this._lastBounds = { ...queryBounds };
    this._spatialGrid.query(queryBounds, this._queryResults);
    this._syncQueryResultSet();
    this._releaseOutOfQuerySprites();
    this._activateQueryResultSprites();
    this._updateStats();
  }

  public destroy(): void {
    this.view.removeChildren();

    for (const sprite of this._activeSprites.values()) {
      sprite.destroy();
    }

    for (let i = 0, len = this._spritePool.length; i < len; i += 1) {
      this._spritePool[i].destroy();
    }

    this._queryResults.length = 0;
    this._queryResultSet.clear();
    this._activeSprites.clear();
    this._spritePool.length = 0;
    this._updateStats();
    this.view.destroy();
  }

  private _syncQueryResultSet(): void {
    this._queryResultSet.clear();

    for (let i = 0, len = this._queryResults.length; i < len; i += 1) {
      this._queryResultSet.add(this._queryResults[i]);
    }
  }

  private _releaseOutOfQuerySprites(): void {
    for (const [object, sprite] of this._activeSprites) {
      if (this._queryResultSet.has(object)) {
        continue;
      }

      this._activeSprites.delete(object);
      this.view.removeChild(sprite);
      this._spritePool.push(sprite);
    }
  }

  private _activateQueryResultSprites(): void {
    for (let i = 0, len = this._queryResults.length; i < len; i += 1) {
      const object = this._queryResults[i];

      if (this._activeSprites.has(object)) {
        continue;
      }

      const sprite = this._getSprite();

      this._applyObjectToSprite(object, sprite);
      this._activeSprites.set(object, sprite);
      this.view.addChild(sprite);
    }
  }

  private _getSprite(): Sprite {
    return this._spritePool.pop() ?? new Sprite();
  }

  private _applyObjectToSprite(object: ShapeData, sprite: Sprite): void {
    sprite.texture = this._textures.get(object.kind);
    sprite.anchor.set(0.5, 0.5);
    sprite.tint = object.color;
    sprite.scale.set(
      object.width / sprite.texture.width,
      object.height / sprite.texture.height,
    );
    sprite.position.set(object.x, object.y);
    sprite.rotation = object.rotation;
  }

  private _updateStats(): void {
    this._stats.activeSprites = this._activeSprites.size;
    this._stats.culledObjects =
      this._stats.totalObjects - this._stats.activeSprites;
    this._stats.poolSize = this._spritePool.length;
    this._stats.queryResultCount = this._spatialGrid.lastQueryResultCount;
    this._stats.chunkCountTouched = this._spatialGrid.lastChunkCountTouched;
  }

  private _containsBounds(outer: SpatialBounds, inner: SpatialBounds): boolean {
    return (
      outer.minX <= inner.minX + BOUNDS_EPSILON &&
      outer.minY <= inner.minY + BOUNDS_EPSILON &&
      outer.maxX >= inner.maxX - BOUNDS_EPSILON &&
      outer.maxY >= inner.maxY - BOUNDS_EPSILON
    );
  }
}
