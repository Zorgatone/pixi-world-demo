import { Container, Sprite, Texture } from "pixi.js";

import { TextureCache, TextureName } from "./textures";

export class Shape {
  public readonly view: Container;

  private readonly _sprite: Sprite;

  public constructor() {
    this.view = new Container();
    this._sprite = new Sprite(Texture.EMPTY);

    this.view.addChild(this._sprite);
  }

  public init(
    shapeKind: TextureName,
    textureCache: TextureCache,
    maxWidth: number, // bounds
    maxHeight: number, // bounds
    tint: number,
  ) {
    const texture = textureCache[shapeKind];
    this._sprite.texture = texture;
    this._sprite.tint = tint;
    const widthScale = maxWidth / texture.width;
    const heightScale = maxHeight / texture.height;
    this._sprite.scale.set(Math.min(widthScale, heightScale));
    this._sprite.anchor.set(0.5, 0.5);

    this.view.scale.set(1);
  }

  public reset() {
    this._sprite.texture = Texture.EMPTY;
    this._sprite.tint = 0xffffff;
  }
}
