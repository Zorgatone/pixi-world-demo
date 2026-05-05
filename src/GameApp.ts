import { Application, Ticker } from "pixi.js";

import {
  watchPixelRatio,
  type RemoveListenerFn,
} from "./utils/watchPixelRatio";
import { WorldScene } from "./WorldScene";

enum InitState {
  INIT_ERROR = -1,
  UNINITIALIZED = 0,
  INITIALIZING = 1,
  INIT_SUCCESS = 2,
  DESTROYED = 3,
}

export class GameApp {
  public readonly app: Application;

  private _scene?: WorldScene;
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
  }

  public get scene(): WorldScene {
    if (!this._scene) {
      throw new Error("World scene is not initialized!");
    }

    return this._scene;
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
      throw new Error("GameApp was destroyed during initialization!");
    }

    this._initState = InitState.INIT_SUCCESS;

    domElement.appendChild(this.app.canvas);

    this._scene = new WorldScene(this.app);
    this.app.stage.addChild(this._scene.view);

    this._setupWatchers(domElement);
    this._updateViewport();

    this.app.ticker.add(this._tick, this);
  }

  public destroy(): void {
    if (this._initState === InitState.DESTROYED) {
      return;
    }

    const wasInitialized = this._initState === InitState.INIT_SUCCESS;

    this.app.ticker.remove(this._tick, this);
    this._removeScene();
    this._teardownWatchers();
    delete this._resizePromise;
    delete this._initPromise;

    if (wasInitialized) {
      this.app.destroy({ removeView: true }, { children: true });
    }

    this._initState = InitState.DESTROYED;
  }

  private _tick(ticker: Ticker): void {
    this._scene?.tick(ticker.deltaMS, this.app.renderer.resolution);
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

    this._scene?.resize(screen.width, screen.height);
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

  private _removeScene(): void {
    if (!this._scene) {
      return;
    }

    this.app.stage.removeChild(this._scene.view);
    this._scene.destroy();
    delete this._scene;
  }
}
