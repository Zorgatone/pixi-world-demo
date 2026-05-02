import { Container, Graphics, Texture } from "pixi.js";

export enum TextureName {
  CIRCLE = "circle",
  SQUARE = "square",
}

type TextureRenderFunction = (container: Container) => Texture;

const white = 0xffffff;

function renderCircle(
  graphics: Graphics,
  maxWidth: number,
  maxHeight: number,
): void {
  const radius = Math.min(maxWidth, maxHeight) / 2;
  graphics.circle(radius, radius, radius).fill(white);
}

function renderSquare(
  graphics: Graphics,
  maxWidth: number,
  maxHeight: number,
): void {
  const side = Math.min(maxWidth, maxHeight);
  graphics.rect(0, 0, side, side).fill(white);
}

export type TextureCache = Record<TextureName, Texture>;

export function generateTextures(
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
