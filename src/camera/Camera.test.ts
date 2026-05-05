import { Container } from "pixi.js";
import { describe, expect, it } from "vitest";

import { Camera } from "./Camera";

describe("Camera", () => {
  it("clamps center position and zoom to the configured world limits", () => {
    const camera = new Camera(new Container(), {
      maxX: 1_000,
      maxY: 800,
      minZoom: 0.5,
      maxZoom: 2,
    });

    camera.resize(200, 100);

    camera.jumpToCenter(-100, -100);

    expect(camera.centerX).toBe(100);
    expect(camera.centerY).toBe(50);

    camera.jumpToCenter(2_000, 2_000);

    expect(camera.centerX).toBe(900);
    expect(camera.centerY).toBe(750);

    camera.setZoom(10);

    expect(camera.targetZoom).toBe(2);

    camera.setZoom(0.1);

    expect(camera.targetZoom).toBe(0.5);
  });
});
