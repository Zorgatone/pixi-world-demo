import { Container, Graphics, Rectangle, Texture } from "pixi.js";

import {
  MAX_OBJECT_SIZE,
  MAX_TEXTURE_DEVICE_PIXEL_RATIO,
  MAX_ZOOM,
} from "./constants";
import { TextureName } from "./types/TextureName";

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

export type TextureCache = Record<TextureName, Texture>;

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

function _generateTextures(
  renderTextureFn: TextureRenderFunction,
): Readonly<TextureCache> {
  const graphics = new Graphics();

  const cache: TextureCache = Object.create(null) as TextureCache;

  renderCircle(graphics);
  cache[TextureName.CIRCLE] = createTexture(graphics, renderTextureFn);
  graphics.clear();

  renderSquare(graphics);
  cache[TextureName.SQUARE] = createTexture(graphics, renderTextureFn);
  graphics.clear();

  renderTriangle(graphics);
  cache[TextureName.TRIANGLE] = createTexture(graphics, renderTextureFn);

  graphics.destroy();

  return Object.freeze(cache);
}

let _textureCache: Readonly<TextureCache> | undefined;

export function generateTextures(
  renderTextureFn: TextureRenderFunction,
): Readonly<TextureCache> {
  if (_textureCache) {
    throw new Error("Texture cache already present!");
  }

  _textureCache = _generateTextures(renderTextureFn);

  return _textureCache;
}

export function getTextureCache(): Readonly<TextureCache> {
  if (!_textureCache) {
    throw new Error("Texture cache is not initialized!");
  }

  return _textureCache;
}
