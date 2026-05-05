import { Container, Graphics, Rectangle, Texture } from "pixi.js";

import {
  MAX_OBJECT_SIZE,
  MAX_TEXTURE_DEVICE_PIXEL_RATIO,
  MAX_ZOOM,
} from "./constants";
import { ShapeKind } from "./types/ShapeKind";

const WHITE = 0xffffff;
const SHAPE_TEXTURE_SIZE = MAX_OBJECT_SIZE * MAX_ZOOM;
const SHAPE_TEXTURE_FRAME = new Rectangle(
  0,
  0,
  SHAPE_TEXTURE_SIZE,
  SHAPE_TEXTURE_SIZE,
);

function renderCircle(graphics: Graphics): void {
  const radius = SHAPE_TEXTURE_SIZE / 2;

  graphics.circle(radius, radius, radius).fill(WHITE);
}

function renderSquare(graphics: Graphics): void {
  graphics.rect(0, 0, SHAPE_TEXTURE_SIZE, SHAPE_TEXTURE_SIZE).fill(WHITE);
}

function renderTriangle(graphics: Graphics): void {
  const ratio = Math.sqrt(3) / 2;
  const side = SHAPE_TEXTURE_SIZE;
  const height = SHAPE_TEXTURE_SIZE * ratio;
  const yOffset = (SHAPE_TEXTURE_SIZE - height) / 2;

  graphics
    .poly([
      ...[side / 2, yOffset],
      ...[0, yOffset + height],
      ...[side, yOffset + height],
    ])
    .fill(WHITE);
}

type TextureRenderFunction = (options: {
  target: Container;
  frame: Rectangle;
  resolution: number;
  antialias: boolean;
}) => Texture;

type ShapeTextureMap = Record<ShapeKind, Texture>;

export class ShapeTextureCache {
  private readonly _textures: Readonly<ShapeTextureMap>;
  private _isDestroyed: boolean;

  public constructor(textures: ShapeTextureMap) {
    this._textures = Object.freeze(textures);
    this._isDestroyed = false;
  }

  public get(kind: ShapeKind): Texture {
    return this._textures[kind];
  }

  public destroy(): void {
    if (this._isDestroyed) {
      return;
    }

    this._isDestroyed = true;

    for (const texture of new Set(Object.values(this._textures))) {
      texture.destroy(true);
    }
  }
}

function createTexture(
  graphics: Graphics,
  renderTextureFn: TextureRenderFunction,
): Texture {
  return renderTextureFn({
    target: graphics,
    frame: SHAPE_TEXTURE_FRAME,
    resolution: MAX_TEXTURE_DEVICE_PIXEL_RATIO,
    antialias: true,
  });
}

export function createShapeTextures(
  renderTextureFn: TextureRenderFunction,
): ShapeTextureCache {
  const graphics = new Graphics();

  const textures: ShapeTextureMap = Object.create(null) as ShapeTextureMap;

  renderCircle(graphics);
  textures[ShapeKind.CIRCLE] = createTexture(graphics, renderTextureFn);
  graphics.clear();

  renderSquare(graphics);
  textures[ShapeKind.SQUARE] = createTexture(graphics, renderTextureFn);
  graphics.clear();

  renderTriangle(graphics);
  textures[ShapeKind.TRIANGLE] = createTexture(graphics, renderTextureFn);

  graphics.destroy();

  return new ShapeTextureCache(textures);
}
