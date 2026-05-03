export const OBJECT_COUNT = 100_000;

export const MIN_OBJECT_SIZE = 8;
export const MAX_OBJECT_SIZE = 64;

// AABB = Axis-Aligned Bounding Box (the square has the largest BB at 45º)
export const ROTATED_AABB_PADDING = Math.SQRT2;
export const MAX_ROTATED_OBJECT_SIZE = Math.ceil(
  MAX_OBJECT_SIZE * ROTATED_AABB_PADDING,
);

export const SPAWN_CELL_SIZE = MAX_ROTATED_OBJECT_SIZE;
export const CHUNK_SPAWN_CELL_COUNT = 5;
export const CHUNK_SIZE = SPAWN_CELL_SIZE * CHUNK_SPAWN_CELL_COUNT;
export const GRID_SIZE = CHUNK_SIZE;

const TARGET_WORLD_WIDTH = 50_000;
const TARGET_WORLD_HEIGHT = 50_000;

export const WORLD_WIDTH =
  Math.ceil(TARGET_WORLD_WIDTH / CHUNK_SIZE) * CHUNK_SIZE;
export const WORLD_HEIGHT =
  Math.ceil(TARGET_WORLD_HEIGHT / CHUNK_SIZE) * CHUNK_SIZE;

export const MIN_ZOOM = 0.75;
export const MAX_ZOOM = 2.0;

export const MAX_TEXTURE_DEVICE_PIXEL_RATIO = 4;
