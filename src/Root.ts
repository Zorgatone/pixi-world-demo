import { Application, Container, Ticker } from "pixi.js";

import { Camera } from "./camera/Camera";
import { CameraControls } from "./camera/CameraControls";
import { MAX_ZOOM, MIN_ZOOM, WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import { CameraInfo } from "./ui/CameraInfo";
import { FPSCounter } from "./ui/FPSCounter";
import { ShapeStats } from "./ui/ShapeStats";
import { WorldGrid } from "./ui/WorldGrid";
import {
  watchPixelRatio,
  type RemoveListenerFn,
} from "./utils/watchPixelRatio";
import { ShapeRenderLayer } from "./world/ShapeRenderLayer";

enum InitState {
  INIT_ERROR = -1,
  UNINITIALIZED = 0,
  INITIALIZING = 1,
  INIT_SUCCESS = 2,
  DESTROYED = 3,
}

export class Root {
  public readonly app: Application;

  public readonly camera: Camera;
  public readonly uiContainer: Container;
  public readonly worldContainer: Container;
  private _cameraControls?: CameraControls;
  private _cameraInfo: CameraInfo;
  private _fpsCounter: FPSCounter;
  private _shapeStats: ShapeStats;
  private _worldGrid: WorldGrid;
  private _shapeLayer?: ShapeRenderLayer;
  private _initState: InitState;
  private _currentResolution: number;
  private _initPromise?: undefined | Promise<void>;
  private _resizePromise?: undefined | Promise<void>;
  private _viewportElement?: HTMLElement;
  private _resizeObserver?: ResizeObserver;
  private _removePixelRatioListener?: RemoveListenerFn;
  private _queuedViewportUpdate?: number;

  public constructor() {
    this._onResolutionChanged = this._onResolutionChanged.bind(this);
    this._updateResolution = this._updateResolution.bind(this);
    this._queueViewportUpdate = this._queueViewportUpdate.bind(this);
    this._updateViewport = this._updateViewport.bind(this);

    this._currentResolution = devicePixelRatio;
    this._initState = InitState.UNINITIALIZED;
    this.app = new Application();

    this.worldContainer = new Container();
    this.camera = new Camera(this.worldContainer, {
      maxX: WORLD_WIDTH,
      maxY: WORLD_HEIGHT,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
    this._worldGrid = new WorldGrid();

    this.uiContainer = new Container();
    this.uiContainer.sortableChildren = true;

    this._cameraInfo = new CameraInfo(this.camera);
    this._fpsCounter = new FPSCounter();
    this._shapeStats = new ShapeStats();
  }

  public async init(domElement: HTMLElement): Promise<void> {
    if (
      this._initState !== InitState.UNINITIALIZED &&
      this._initState !== InitState.INIT_ERROR
    ) {
      throw new Error("Invalid init state!");
    }

    this._initState = InitState.INITIALIZING;

    try {
      console.assert(
        typeof this._initPromise === "undefined",
        "Found unexpected init promise during initialization!",
      );

      this._currentResolution = devicePixelRatio;

      this._initPromise = this.app.init({
        resizeTo: domElement,
        backgroundColor: 0x000000,
        antialias: true,
        autoDensity: true,
        resolution: this._currentResolution,
      });

      await this._initPromise;
    } catch (error) {
      if (!this._isDestroyed()) {
        this._initState = InitState.INIT_ERROR;
      }

      throw error;
    }

    if (this._isDestroyed()) {
      this.app.destroy({ removeView: true }, { children: true });
      throw new Error("Root was destroyed during initialization!");
    }

    this._initState = InitState.INIT_SUCCESS;

    domElement.appendChild(this.app.canvas);

    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.uiContainer);

    this.uiContainer.addChild(this._worldGrid.view);
    this.uiContainer.addChild(this._fpsCounter.view);
    this.uiContainer.addChild(this._cameraInfo.view);
    this.uiContainer.addChild(this._shapeStats.view);
    this._fpsCounter.reset();

    this._setupWatchers(domElement);
    this._cameraControls = new CameraControls(this.app, this.camera);
    this._updateViewport();

    this.app.ticker.add(this._tick, this);
  }

  public setShapeLayer(shapeLayer: ShapeRenderLayer): void {
    this._removeShapeLayer();
    this._shapeLayer = shapeLayer;
    this.worldContainer.addChild(shapeLayer.view);
    shapeLayer.tick(this.camera);
  }

  public destroy(): void {
    if (this._initState === InitState.DESTROYED) {
      return;
    }

    const wasInitialized = this._initState === InitState.INIT_SUCCESS;

    this.app.ticker.remove(this._tick, this);
    this._cameraControls?.destroy();
    delete this._cameraControls;

    this._removeShapeLayer();
    this._teardownWatchers();
    delete this._resizePromise;
    delete this._initPromise;

    if (wasInitialized) {
      this.app.destroy({ removeView: true }, { children: true });
    }

    this._initState = InitState.DESTROYED;
  }

  private _tick(ticker: Ticker): void {
    this._cameraControls?.update(ticker.deltaMS);
    this.camera.update(ticker.deltaMS);
    this._shapeLayer?.tick(this.camera);
    this._fpsCounter.tick();
    this._cameraInfo.tick(ticker.deltaMS);
    this._shapeStats.tick(ticker.deltaMS, this._shapeLayer?.stats);
    this._worldGrid.tick(this.camera, this.app.renderer.resolution);
  }

  private _isDestroyed(): boolean {
    return this._initState === InitState.DESTROYED;
  }

  private _setupWatchers(domElement: HTMLElement): void {
    this._watchResolution();
    this._watchViewport(domElement);
  }

  private _watchResolution(): void {
    this._removePixelRatioListener?.();
    this._removePixelRatioListener = watchPixelRatio(this._onResolutionChanged);
  }

  private _onResolutionChanged(resolution: number): void {
    if (this._initState === InitState.DESTROYED) {
      return;
    }

    this._currentResolution = resolution;
    console.log(`New resolution: ${this._currentResolution}x`);

    console.assert(
      this._initState !== InitState.INIT_ERROR &&
        this._initState !== InitState.UNINITIALIZED,
      "Unexpected init state during resolution change!",
    );

    if (
      !this._resizePromise &&
      this._initPromise &&
      this._initState === InitState.INITIALIZING
    ) {
      this._resizePromise = this._initPromise.then(this._updateResolution);
    } else {
      delete this._resizePromise;
      this._updateResolution();
    }
  }

  private _updateResolution(): void {
    console.assert(
      this._initState === InitState.INIT_SUCCESS,
      "Unexpected init state during resolution update!",
    );

    this.app.renderer.resolution = this._currentResolution;
    this._updateViewport();
  }

  private _watchViewport(domElement: HTMLElement): void {
    this._viewportElement = domElement;
    this._resizeObserver = new ResizeObserver(this._queueViewportUpdate);
    this._resizeObserver.observe(domElement);

    window.addEventListener("resize", this._queueViewportUpdate, {
      passive: true,
    });
    window.addEventListener("orientationchange", this._queueViewportUpdate, {
      passive: true,
    });
    window.visualViewport?.addEventListener(
      "resize",
      this._queueViewportUpdate,
      {
        passive: true,
      },
    );
  }

  private _queueViewportUpdate(): void {
    if (typeof this._queuedViewportUpdate !== "undefined") {
      return;
    }

    this._queuedViewportUpdate = requestAnimationFrame(this._updateViewport);
  }

  private _updateViewport(): void {
    delete this._queuedViewportUpdate;

    if (this._initState !== InitState.INIT_SUCCESS || !this._viewportElement) {
      return;
    }

    this.app.resize();

    const screen = this.app.renderer.screen;

    this.camera.resize(screen.width, screen.height);
  }

  private _teardownWatchers(): void {
    this._removePixelRatioListener?.();
    delete this._removePixelRatioListener;

    this._resizeObserver?.disconnect();
    delete this._resizeObserver;

    window.removeEventListener("resize", this._queueViewportUpdate);
    window.removeEventListener("orientationchange", this._queueViewportUpdate);
    window.visualViewport?.removeEventListener(
      "resize",
      this._queueViewportUpdate,
    );

    if (typeof this._queuedViewportUpdate !== "undefined") {
      cancelAnimationFrame(this._queuedViewportUpdate);
      delete this._queuedViewportUpdate;
    }

    delete this._viewportElement;
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
