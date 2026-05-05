import { Application, Container } from "pixi.js";

import { Camera } from "../camera/Camera";
import { CameraControls } from "../camera/CameraControls";
import { MAX_ZOOM, MIN_ZOOM, WORLD_HEIGHT, WORLD_WIDTH } from "../constants";
import { CameraInfo } from "../ui/CameraInfo";
import { FPSCounter } from "../ui/FPSCounter";
import { ShapeStats } from "../ui/ShapeStats";
import { WorldGrid } from "../ui/WorldGrid";

import { ShapeRenderLayer } from "./ShapeRenderLayer";

export class WorldScene {
  public readonly view: Container;
  public readonly camera: Camera;
  public readonly uiContainer: Container;
  public readonly worldContainer: Container;

  private readonly _cameraControls: CameraControls;
  private readonly _cameraInfo: CameraInfo;
  private readonly _fpsCounter: FPSCounter;
  private readonly _shapeStats: ShapeStats;
  private readonly _worldGrid: WorldGrid;
  private _shapeLayer?: ShapeRenderLayer;

  public constructor(app: Application) {
    this.view = new Container();

    this.worldContainer = new Container();
    this.camera = new Camera(this.worldContainer, {
      maxX: WORLD_WIDTH,
      maxY: WORLD_HEIGHT,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });

    this.uiContainer = new Container();
    this.uiContainer.sortableChildren = true;

    this._worldGrid = new WorldGrid();
    this._cameraInfo = new CameraInfo(this.camera);
    this._fpsCounter = new FPSCounter();
    this._shapeStats = new ShapeStats();
    this._cameraControls = new CameraControls(app, this.camera);

    this.view.addChild(this.worldContainer);
    this.view.addChild(this.uiContainer);
    this.uiContainer.addChild(this._worldGrid.view);
    this.uiContainer.addChild(this._fpsCounter.view);
    this.uiContainer.addChild(this._cameraInfo.view);
    this.uiContainer.addChild(this._shapeStats.view);
    this._fpsCounter.reset();
  }

  public resize(width: number, height: number): void {
    this.camera.resize(width, height);
  }

  public tick(deltaMs: number, resolution: number): void {
    this._cameraControls.update(deltaMs);
    this.camera.update(deltaMs);
    this._shapeLayer?.tick(this.camera);
    this._fpsCounter.tick();
    this._cameraInfo.tick(deltaMs);
    this._shapeStats.tick(deltaMs, this._shapeLayer?.stats);
    this._worldGrid.tick(this.camera, resolution);
  }

  public setShapeLayer(shapeLayer: ShapeRenderLayer): void {
    this._removeShapeLayer();
    this._shapeLayer = shapeLayer;
    this.worldContainer.addChild(shapeLayer.view);
    shapeLayer.tick(this.camera);
  }

  public destroy(): void {
    this._cameraControls.destroy();
    this._removeShapeLayer();
    this.view.destroy({ children: true });
  }

  private _removeShapeLayer(): void {
    if (!this._shapeLayer) {
      return;
    }

    this.worldContainer.removeChild(this._shapeLayer.view);
    this._shapeLayer.destroy();
    delete this._shapeLayer;
  }
}
