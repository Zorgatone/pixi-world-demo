import { describe, expect, it } from "vitest";

import { SPAWN_CELL_SIZE } from "../constants";
import { generateWorldData, SPAWN_GRID_COLUMNS } from "./generateWorldData";

function getSpawnCellIndex(x: number, y: number): number {
  const cellX = Math.floor(x / SPAWN_CELL_SIZE);
  const cellY = Math.floor(y / SPAWN_CELL_SIZE);

  return cellY * SPAWN_GRID_COLUMNS + cellX;
}

describe("generateWorldData", () => {
  it("generates deterministic world data for the same seed", () => {
    const firstRun = generateWorldData("deterministic-seed", 32);
    const secondRun = generateWorldData("deterministic-seed", 32);

    expect(secondRun).toEqual(firstRun);
  });

  it("places generated objects in unique centered spawn cells", () => {
    const data = generateWorldData("unique-cells", 1_000);
    const occupiedCells = new Set<number>();

    for (const shape of data) {
      const cellX = Math.floor(shape.x / SPAWN_CELL_SIZE);
      const cellY = Math.floor(shape.y / SPAWN_CELL_SIZE);

      expect(shape.x).toBe(cellX * SPAWN_CELL_SIZE + SPAWN_CELL_SIZE * 0.5);
      expect(shape.y).toBe(cellY * SPAWN_CELL_SIZE + SPAWN_CELL_SIZE * 0.5);
      occupiedCells.add(getSpawnCellIndex(shape.x, shape.y));
    }

    expect(occupiedCells.size).toBe(data.length);
  });
});
