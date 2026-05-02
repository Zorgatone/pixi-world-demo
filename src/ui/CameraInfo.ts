import { Text, TextStyle } from "pixi.js";

import { Camera } from "../camera/Camera";

const UPDATE_INTERVAL_MS = 100;

export class CameraInfo {
  public readonly view: Text;

  private readonly _camera: Camera;
  private _elapsed: number;

  public constructor(camera: Camera) {
    this._camera = camera;
    this._elapsed = UPDATE_INTERVAL_MS;

    this.view = new Text({
      text: "",
      style: new TextStyle({
        fill: 0xffffff,
        fontSize: 12,
      }),
    });

    this.view.x = 10;
    this.view.y = 23;
    this.view.zIndex = 9999;
    this.view.eventMode = "none";

    this._updateText();
  }

  public tick(deltaMs: number): void {
    this._elapsed += deltaMs;

    if (this._elapsed < UPDATE_INTERVAL_MS) {
      return;
    }

    this._elapsed = 0;
    this._updateText();
  }

  private _updateText(): void {
    this.view.text =
      `Camera: ${this._camera.x.toFixed(2)}, ${this._camera.y.toFixed(2)}\n` +
      `Zoom: ${this._camera.zoom.toFixed(2)}x`;
  }
}
