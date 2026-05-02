import { Container, Graphics, Texture } from "pixi.js";

const WHITE = 0xffffff;

function renderCircle(
  graphics: Graphics,
  maxWidth: number,
  maxHeight: number,
): void {
  const radius = Math.min(maxWidth, maxHeight) / 2;
  graphics.circle(radius, radius, radius).fill(WHITE);
}

function renderSquare(
  graphics: Graphics,
  maxWidth: number,
  maxHeight: number,
): void {
  const side = Math.min(maxWidth, maxHeight);
  graphics.rect(0, 0, side, side).fill(WHITE);
}

type TextureRenderFunction = (container: Container) => Texture;

export enum TextureName {
  CIRCLE = "circle",
  SQUARE = "square",
}

export type TextureCache = Record<TextureName, Texture>;

function _generateTextures(
  renderTextureFn: TextureRenderFunction,
  maxWidth: number,
  maxHeight: number,
): Readonly<TextureCache> {
  const graphics = new Graphics();

  const cache: TextureCache = Object.create(null) as TextureCache;

  renderCircle(graphics, maxWidth, maxHeight);
  cache[TextureName.CIRCLE] = renderTextureFn(graphics);
  graphics.clear();

  renderSquare(graphics, maxWidth, maxHeight);
  cache[TextureName.SQUARE] = renderTextureFn(graphics);
  // graphics.clear();

  graphics.destroy();

  return Object.freeze(cache);
}

let _textureCache: Readonly<TextureCache> | undefined;

export function generateTextures(
  renderTextureFn: TextureRenderFunction,
  maxWidth: number,
  maxHeight: number,
): Readonly<TextureCache> {
  if (_textureCache) {
    throw new Error("Texture cache already present!");
  }

  _textureCache = _generateTextures(renderTextureFn, maxWidth, maxHeight);

  return _textureCache;
}

export function getTextureCache(): Readonly<TextureCache> {
  if (!_textureCache) {
    throw new Error("Texture cache is not initialized!");
  }

  return _textureCache;
}
