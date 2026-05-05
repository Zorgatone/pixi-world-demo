import {
  CHUNK_SIZE,
  MAX_ROTATED_OBJECT_SIZE,
  ROTATED_AABB_PADDING,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../constants";
import { ShapeObj } from "../types/ShapeObj";

export interface SpatialBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const MIN_WORLD_COORDINATE = 0;
const MAX_OBJECT_HALF_SIZE = MAX_ROTATED_OBJECT_SIZE / 2;

export class ChunkedSpatialGrid {
  private readonly _columns: number;
  private readonly _rows: number;
  private readonly _chunks: ShapeObj[][];
  private _lastQueryResultCount: number;
  private _lastChunkCountTouched: number;

  public constructor(objects: readonly ShapeObj[]) {
    this._columns = Math.ceil(WORLD_WIDTH / CHUNK_SIZE);
    this._rows = Math.ceil(WORLD_HEIGHT / CHUNK_SIZE);
    this._chunks = Array.from({ length: this._columns * this._rows }, () => []);
    this._lastQueryResultCount = 0;
    this._lastChunkCountTouched = 0;

    for (let i = 0, len = objects.length; i < len; i += 1) {
      this._insert(objects[i]);
    }
  }

  public get lastQueryResultCount(): number {
    return this._lastQueryResultCount;
  }

  public get lastChunkCountTouched(): number {
    return this._lastChunkCountTouched;
  }

  public query(bounds: SpatialBounds, out: ShapeObj[]): ShapeObj[] {
    out.length = 0;
    this._lastChunkCountTouched = 0;

    const minChunkX = this._chunkX(bounds.minX - MAX_OBJECT_HALF_SIZE);
    const minChunkY = this._chunkY(bounds.minY - MAX_OBJECT_HALF_SIZE);
    const maxChunkX = this._chunkX(bounds.maxX + MAX_OBJECT_HALF_SIZE);
    const maxChunkY = this._chunkY(bounds.maxY + MAX_OBJECT_HALF_SIZE);

    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY += 1) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX += 1) {
        const chunk = this._chunks[this._index(chunkX, chunkY)];
        this._lastChunkCountTouched += 1;

        for (let i = 0, len = chunk.length; i < len; i += 1) {
          const object = chunk[i];

          if (!this._intersects(object, bounds)) {
            continue;
          }

          out.push(object);
        }
      }
    }

    this._lastQueryResultCount = out.length;

    return out;
  }

  private _insert(object: ShapeObj): void {
    const chunkX = this._chunkX(object.x);
    const chunkY = this._chunkY(object.y);

    this._chunks[this._index(chunkX, chunkY)].push(object);
  }

  private _intersects(object: ShapeObj, bounds: SpatialBounds): boolean {
    const halfSize =
      Math.max(object.width, object.height) * ROTATED_AABB_PADDING * 0.5;

    return (
      object.x + halfSize >= bounds.minX &&
      object.x - halfSize <= bounds.maxX &&
      object.y + halfSize >= bounds.minY &&
      object.y - halfSize <= bounds.maxY
    );
  }

  private _chunkX(x: number): number {
    return this._clampChunk(Math.floor(x / CHUNK_SIZE), this._columns);
  }

  private _chunkY(y: number): number {
    return this._clampChunk(Math.floor(y / CHUNK_SIZE), this._rows);
  }

  private _clampChunk(chunk: number, chunkCount: number): number {
    return Math.min(chunkCount - 1, Math.max(MIN_WORLD_COORDINATE, chunk));
  }

  private _index(chunkX: number, chunkY: number): number {
    return chunkY * this._columns + chunkX;
  }
}
