import {
  MAX_ROTATED_OBJECT_SIZE,
  OBJECT_COUNT,
  SPAWN_CELL_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../constants";
import { ShapeObj } from "../types/ShapeObj";
import { hashSeed } from "../utils/hashSeed";
import { createPrng } from "../utils/prng";
import { randInt } from "../utils/randInt";
import { randShapeObj } from "../utils/randShapeObj";

export const SPAWN_GRID_COLUMNS = Math.floor(WORLD_WIDTH / SPAWN_CELL_SIZE);
export const SPAWN_GRID_ROWS = Math.floor(WORLD_HEIGHT / SPAWN_CELL_SIZE);
export const SPAWN_CELL_COUNT = SPAWN_GRID_COLUMNS * SPAWN_GRID_ROWS;

function createSpawnCells(objectCount: number): Uint32Array {
  if (MAX_ROTATED_OBJECT_SIZE > SPAWN_CELL_SIZE) {
    throw new Error(
      "Spawn cell size must be at least equal to max rotated object size!",
    );
  }

  if (objectCount > SPAWN_CELL_COUNT) {
    throw new Error("Too many objects to fit world size!");
  }

  const cells = new Uint32Array(SPAWN_CELL_COUNT);

  for (let i = 0; i < SPAWN_CELL_COUNT; i += 1) {
    cells[i] = i;
  }

  return cells;
}

// Partial Fisher-Yates shuffle
function takeRandomSpawnCell(
  cells: Uint32Array,
  index: number,
  random: () => number,
): number {
  const swapIndex = randInt(random, cells.length, index);
  const cell = cells[swapIndex];

  cells[swapIndex] = cells[index];
  cells[index] = cell;

  return cell;
}

function positionShapeInCell(shape: ShapeObj, cell: number): void {
  const cellX = cell % SPAWN_GRID_COLUMNS;
  const cellY = Math.floor(cell / SPAWN_GRID_COLUMNS);

  shape.x = cellX * SPAWN_CELL_SIZE + SPAWN_CELL_SIZE * 0.5;
  shape.y = cellY * SPAWN_CELL_SIZE + SPAWN_CELL_SIZE * 0.5;
}

export function generateWorldData(
  seed = "seed",
  objectCount = OBJECT_COUNT,
): ShapeObj[] {
  const random = createPrng(hashSeed(seed));
  const nextShapeObj = () => randShapeObj(random);
  const spawnCells = createSpawnCells(objectCount);
  const data = new Array<ShapeObj>(objectCount);

  for (let i = 0, len = data.length; i < len; i += 1) {
    const shape = nextShapeObj();
    const cell = takeRandomSpawnCell(spawnCells, i, random);

    positionShapeInCell(shape, cell);
    data[i] = shape;
  }

  return data;
}
