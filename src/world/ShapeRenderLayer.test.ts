import { Container, Texture } from "pixi.js";
import { describe, expect, it } from "vitest";

import { Camera } from "../camera/Camera";
import { CHUNK_SIZE } from "../constants";
import { ShapeTextureCache } from "../textures";
import { ShapeData } from "../types/ShapeData";
import { ShapeKind } from "../types/ShapeKind";
import { ShapeRenderLayer } from "./ShapeRenderLayer";

function createTestTextureCache(): ShapeTextureCache {
  return new ShapeTextureCache({
    [ShapeKind.CIRCLE]: Texture.WHITE,
    [ShapeKind.SQUARE]: Texture.WHITE,
    [ShapeKind.TRIANGLE]: Texture.WHITE,
  });
}

function createCamera(centerX: number, centerY: number): Camera {
  const camera = new Camera(new Container(), {
    maxX: 5_000,
    maxY: 5_000,
    minZoom: 0.5,
    maxZoom: 2,
  });

  camera.resize(100, 100);
  camera.jumpToCenter(centerX, centerY);

  return camera;
}

function createShape(x: number, y: number): ShapeData {
  return {
    x: x,
    y: y,
    kind: ShapeKind.SQUARE,
    color: 0xffffff,
    width: 10,
    height: 10,
    rotation: 0,
  };
}

describe("ShapeRenderLayer", () => {
  it("reuses pooled sprites when the queried object set changes", () => {
    const layer = new ShapeRenderLayer(createTestTextureCache(), [
      createShape(500, 500),
      createShape(2_000, 500),
    ]);
    const camera = createCamera(500, 500);

    layer.tick(camera);

    const firstSprite = layer.view.children[0];

    expect(layer.stats.activeSprites).toBe(1);
    expect(firstSprite).toBeDefined();

    camera.jumpToCenter(2_000, 500);
    layer.tick(camera);

    expect(layer.stats.activeSprites).toBe(1);
    expect(layer.stats.poolSize).toBe(0);
    expect(layer.view.children[0]).toBe(firstSprite);

    layer.destroy();
  });

  it("keeps the current query while the viewport remains inside the retained margin", () => {
    const initiallyQueriedShape = createShape(
      1_000 + 50 + CHUNK_SIZE - 10,
      1_000,
    );
    const deferredShape = createShape(1_000 + 50 + CHUNK_SIZE + 55, 1_000);
    const layer = new ShapeRenderLayer(createTestTextureCache(), [
      initiallyQueriedShape,
      deferredShape,
    ]);
    const camera = createCamera(1_000, 1_000);

    layer.tick(camera);

    expect(layer.stats.activeSprites).toBe(1);

    camera.jumpToCenter(1_060, 1_000);
    layer.tick(camera);

    expect(layer.stats.activeSprites).toBe(1);

    camera.jumpToCenter(1_300, 1_000);
    layer.tick(camera);

    expect(layer.stats.activeSprites).toBe(2);

    layer.destroy();
  });
});
