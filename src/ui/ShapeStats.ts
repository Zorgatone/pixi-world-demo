import { Text, TextStyle } from "pixi.js";

import { ShapeRenderStats } from "../world/ShapeRenderLayer";

const UPDATE_INTERVAL_MS = 100;

export class ShapeStats {
  public readonly view: Text;

  private _elapsed: number;

  public constructor() {
    this._elapsed = UPDATE_INTERVAL_MS;

    this.view = new Text({
      text: "",
      style: new TextStyle({
        fill: 0xffffff,
        fontSize: 12,
      }),
    });

    this.view.x = 10;
    this.view.y = 48;
    this.view.zIndex = 9999;
    this.view.eventMode = "none";

    this._updateText();
  }

  public tick(deltaMs: number, stats?: Readonly<ShapeRenderStats>): void {
    this._elapsed += deltaMs;

    if (this._elapsed < UPDATE_INTERVAL_MS) {
      return;
    }

    this._elapsed = 0;
    this._updateText(stats);
  }

  private _updateText(stats?: Readonly<ShapeRenderStats>): void {
    if (!stats) {
      this.view.text =
        "Total shapes: --\n" +
        "Active sprites: --\n" +
        "Culled shapes: --\n" +
        "Sprite pool: --\n" +
        "Query result: --\n" +
        "Chunks touched: --";
      return;
    }

    this.view.text =
      `Total shapes: ${stats.totalObjects}\n` +
      `Active sprites: ${stats.activeSprites}\n` +
      `Culled shapes: ${stats.culledObjects}\n` +
      `Sprite pool: ${stats.poolSize}\n` +
      `Query result: ${stats.queryResultCount}\n` +
      `Chunks touched: ${stats.chunkCountTouched}`;
  }
}
