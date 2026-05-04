import { Container, Sprite } from "pixi.js";

import { Camera } from "../camera/Camera";
import { CHUNK_SIZE } from "../constants";
import { TextureCache } from "../textures";
import { ShapeObj } from "../types/ShapeObj";
import { ChunkedSpatialGrid, type SpatialBounds } from "./ChunkedSpatialGrid";

const VISIBILITY_MARGIN = CHUNK_SIZE;
const BOUNDS_EPSILON = 0.001;

export class ShapeRenderLayer {
  public readonly view: Container;

  private readonly _textures: Readonly<TextureCache>;
  private readonly _spatialGrid: ChunkedSpatialGrid;
  private readonly _visibleObjects: ShapeObj[];
  private readonly _visibleSet: Set<ShapeObj>;
  private readonly _activeSprites: Map<ShapeObj, Sprite>;
  private readonly _spritePool: Sprite[];
  private _lastBounds?: SpatialBounds;

  public constructor(
    textures: Readonly<TextureCache>,
    objects: readonly ShapeObj[],
  ) {
    this.view = new Container();
    this._textures = textures;
    this._spatialGrid = new ChunkedSpatialGrid(objects);
    this._visibleObjects = [];
    this._visibleSet = new Set();
    this._activeSprites = new Map();
    this._spritePool = [];
  }

  public tick(camera: Camera): void {
    const bounds = camera.getVisibleBounds(VISIBILITY_MARGIN);

    if (this._lastBounds && this._isSameBounds(bounds, this._lastBounds)) {
      return;
    }

    this._lastBounds = { ...bounds };
    this._spatialGrid.query(bounds, this._visibleObjects);
    this._syncVisibleSet();
    this._releaseHiddenSprites();
    this._activateVisibleSprites();
  }

  public destroy(): void {
    this.view.removeChildren();

    for (const sprite of this._activeSprites.values()) {
      sprite.destroy();
    }

    for (let i = 0, len = this._spritePool.length; i < len; i += 1) {
      this._spritePool[i].destroy();
    }

    this._visibleObjects.length = 0;
    this._visibleSet.clear();
    this._activeSprites.clear();
    this._spritePool.length = 0;
    this.view.destroy();
  }

  private _syncVisibleSet(): void {
    this._visibleSet.clear();

    for (let i = 0, len = this._visibleObjects.length; i < len; i += 1) {
      this._visibleSet.add(this._visibleObjects[i]);
    }
  }

  private _releaseHiddenSprites(): void {
    for (const [object, sprite] of this._activeSprites) {
      if (this._visibleSet.has(object)) {
        continue;
      }

      this._activeSprites.delete(object);
      this.view.removeChild(sprite);
      this._spritePool.push(sprite);
    }
  }

  private _activateVisibleSprites(): void {
    for (let i = 0, len = this._visibleObjects.length; i < len; i += 1) {
      const object = this._visibleObjects[i];

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

  private _applyObjectToSprite(object: ShapeObj, sprite: Sprite): void {
    sprite.texture = this._textures[object.kind];
    sprite.anchor.set(0.5, 0.5);
    sprite.tint = object.color;
    sprite.scale.set(
      object.width / sprite.texture.width,
      object.height / sprite.texture.height,
    );
    sprite.position.set(object.x, object.y);
    sprite.rotation = object.rotation;
  }

  private _isSameBounds(a: SpatialBounds, b: SpatialBounds): boolean {
    return (
      Math.abs(a.minX - b.minX) < BOUNDS_EPSILON &&
      Math.abs(a.minY - b.minY) < BOUNDS_EPSILON &&
      Math.abs(a.maxX - b.maxX) < BOUNDS_EPSILON &&
      Math.abs(a.maxY - b.maxY) < BOUNDS_EPSILON
    );
  }
}
