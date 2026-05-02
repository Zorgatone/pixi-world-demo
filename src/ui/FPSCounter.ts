import { Text, TextStyle } from "pixi.js";

export class FPSCounter {
  public readonly view: Text;

  private _elapsed: number;
  private _frames: number;
  private _previousTime: number;

  public constructor() {
    this._elapsed = 0;
    this._frames = 0;
    this._previousTime = performance.now();

    this.view = new Text({
      text: "FPS: --",
      style: new TextStyle({
        fill: 0xffffff,
        fontSize: 12,
      }),
    });

    this.view.x = 10;
    this.view.y = 10;
    this.view.zIndex = 9999;
    this.view.eventMode = "none";
  }

  public reset(): void {
    this._elapsed = 0;
    this._frames = 0;
    this._previousTime = performance.now();
  }

  public tick(): void {
    const now = performance.now();
    const deltaTimeMs = now - this._previousTime;
    this._previousTime = now;
    this._update(deltaTimeMs);
  }

  private _update(deltaMs: number): void {
    this._elapsed += deltaMs;
    this._frames += 1;

    if (this._elapsed >= 100) {
      const fps = (this._frames * 1000) / this._elapsed;
      this.view.text = `FPS: ${fps.toFixed(1)}`;
      this._elapsed = 0;
      this._frames = 0;
    }
  }
}
