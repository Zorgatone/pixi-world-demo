import { Container } from "pixi.js";

import { Root } from "./Root";
import { generateTextures, TextureCache } from "./textures";
import { ShapeObj } from "./types/ShapeObj";
import {
  MAX_ROTATED_OBJECT_SIZE,
  OBJECT_COUNT,
  SPAWN_CELL_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";
import { hashSeed } from "./utils/hashSeed";
import { createPrng } from "./utils/prng";
import { randInt } from "./utils/randInt";
import { randShapeObj } from "./utils/randShapeObj";
import { ShapeRenderLayer } from "./world/ShapeRenderLayer";

const SPAWN_GRID_COLUMNS = Math.floor(WORLD_WIDTH / SPAWN_CELL_SIZE);
const SPAWN_GRID_ROWS = Math.floor(WORLD_HEIGHT / SPAWN_CELL_SIZE);
const SPAWN_CELL_COUNT = SPAWN_GRID_COLUMNS * SPAWN_GRID_ROWS;

function createSpawnCells(): Uint32Array {
  if (MAX_ROTATED_OBJECT_SIZE > SPAWN_CELL_SIZE) {
    throw new Error(
      "Spawn cell size must be at least equal to max rotated object size!",
    );
  }

  if (OBJECT_COUNT > SPAWN_CELL_COUNT) {
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

async function setupRoot(): Promise<Root> {
  const pixiContainer = document.getElementById("pixi-container");

  if (!pixiContainer) {
    throw new Error("Could not find pixi-container DOM element!");
  }

  const root = new Root();

  await root.init(pixiContainer);

  return root;
}

function generateData(): ShapeObj[] {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get("seed") || "seed";

  const random = createPrng(hashSeed(seed));
  const nextShapeObj = () => randShapeObj(random);
  const spawnCells = createSpawnCells();
  const data = new Array<ShapeObj>(OBJECT_COUNT);

  for (let i = 0, len = data.length; i < len; i += 1) {
    const shape = nextShapeObj();
    const cell = takeRandomSpawnCell(spawnCells, i, random);

    positionShapeInCell(shape, cell);
    data[i] = shape;
  }

  return data;
}

function makeTextures(root: Root): Readonly<TextureCache> {
  const app = root.app;

  return generateTextures(app.renderer.generateTexture.bind(app.renderer));
}

function setupScene(
  root: Root,
  textureCache: Readonly<TextureCache>,
  data: ShapeObj[],
): Container {
  const shapeLayer = new ShapeRenderLayer(textureCache, data);

  root.camera.jumpTo(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  shapeLayer.tick(root.camera);

  root.worldContainer.addChild(shapeLayer.view);
  root.app.ticker.add(() => {
    shapeLayer.tick(root.camera);
  });

  return shapeLayer.view;
}

export async function bootstrap(): Promise<void> {
  const root = await setupRoot();

  const data = generateData();
  const textures = makeTextures(root);

  setupScene(root, textures, data);
}
