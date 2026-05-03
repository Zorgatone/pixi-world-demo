import {
  CHUNK_SIZE,
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

export class ChunkedSpatialGrid {
  private readonly _columns: number;
  private readonly _rows: number;
  private readonly _chunks: ShapeObj[][];
  private readonly _seen: Set<ShapeObj>;

  public constructor(objects: readonly ShapeObj[]) {
    this._columns = Math.ceil(WORLD_WIDTH / CHUNK_SIZE);
    this._rows = Math.ceil(WORLD_HEIGHT / CHUNK_SIZE);
    this._chunks = Array.from({ length: this._columns * this._rows }, () => []);
    this._seen = new Set();

    for (let i = 0, len = objects.length; i < len; i += 1) {
      this._insert(objects[i]);
    }
  }

  public query(bounds: SpatialBounds, out: ShapeObj[]): ShapeObj[] {
    out.length = 0;
    this._seen.clear();

    const minChunkX = this._chunkX(bounds.minX);
    const minChunkY = this._chunkY(bounds.minY);
    const maxChunkX = this._chunkX(bounds.maxX);
    const maxChunkY = this._chunkY(bounds.maxY);

    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY += 1) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX += 1) {
        const chunk = this._chunks[this._index(chunkX, chunkY)];

        for (let i = 0, len = chunk.length; i < len; i += 1) {
          const object = chunk[i];

          if (this._seen.has(object) || !this._intersects(object, bounds)) {
            continue;
          }

          this._seen.add(object);
          out.push(object);
        }
      }
    }

    return out;
  }

  private _insert(object: ShapeObj): void {
    const bounds = this._objectBounds(object);
    const minChunkX = this._chunkX(bounds.minX);
    const minChunkY = this._chunkY(bounds.minY);
    const maxChunkX = this._chunkX(bounds.maxX);
    const maxChunkY = this._chunkY(bounds.maxY);

    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY += 1) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX += 1) {
        this._chunks[this._index(chunkX, chunkY)].push(object);
      }
    }
  }

  private _intersects(object: ShapeObj, bounds: SpatialBounds): boolean {
    const objectBounds = this._objectBounds(object);

    return (
      objectBounds.maxX >= bounds.minX &&
      objectBounds.minX <= bounds.maxX &&
      objectBounds.maxY >= bounds.minY &&
      objectBounds.minY <= bounds.maxY
    );
  }

  private _objectBounds(object: ShapeObj): SpatialBounds {
    const halfSize =
      Math.max(object.width, object.height) * ROTATED_AABB_PADDING * 0.5;

    return {
      minX: object.x - halfSize,
      minY: object.y - halfSize,
      maxX: object.x + halfSize,
      maxY: object.y + halfSize,
    };
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
