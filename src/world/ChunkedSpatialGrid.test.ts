import { describe, expect, it } from "vitest";

import { CHUNK_SIZE, MAX_OBJECT_SIZE } from "../constants";
import { ShapeObj } from "../types/ShapeObj";
import { TextureName } from "../types/TextureName";
import { ChunkedSpatialGrid, type SpatialBounds } from "./ChunkedSpatialGrid";

function createShape(x: number, y: number, size: number): ShapeObj {
  return {
    x: x,
    y: y,
    kind: TextureName.SQUARE,
    color: 0xffffff,
    width: size,
    height: size,
    rotation: 0,
  };
}

describe("ChunkedSpatialGrid", () => {
  it("returns only objects whose conservative bounds intersect the query", () => {
    const inside = createShape(100, 100, 20);
    const outside = createShape(300, 300, 20);
    const grid = new ChunkedSpatialGrid([inside, outside]);
    const result = grid.query({ minX: 90, minY: 90, maxX: 110, maxY: 110 }, []);

    expect(result).toEqual([inside]);
    expect(grid.lastQueryResultCount).toBe(1);
    expect(grid.lastChunkCountTouched).toBeGreaterThan(0);
  });

  it("does not miss an intersecting object whose center is in an adjacent chunk", () => {
    const boundaryObject = createShape(CHUNK_SIZE + 20, 100, MAX_OBJECT_SIZE);
    const nonIntersectingNeighbor = createShape(
      CHUNK_SIZE + 160,
      100,
      MAX_OBJECT_SIZE,
    );
    const grid = new ChunkedSpatialGrid([
      boundaryObject,
      nonIntersectingNeighbor,
    ]);
    const query: SpatialBounds = {
      minX: CHUNK_SIZE - 10,
      minY: 90,
      maxX: CHUNK_SIZE - 5,
      maxY: 110,
    };
    const result = grid.query(query, []);

    expect(result).toEqual([boundaryObject]);
    expect(grid.lastQueryResultCount).toBe(1);
    expect(grid.lastChunkCountTouched).toBe(2);
  });
});
