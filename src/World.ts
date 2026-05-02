import { Application } from "pixi.js";

import { watchPixelRatio } from "./utils/watchPixelRatio";

enum InitState {
  INIT_ERROR = -1,
  UNINITIALIZED = 0,
  INITIALIZING = 1,
  INIT_SUCCESS = 2,
}

export class World {
  public readonly app: Application;

  private _initState: InitState;
  private _currentResolution: number;
  private _initPromise?: undefined | Promise<void>;
  private _resizePromise?: undefined | Promise<void>;

  public constructor() {
    this._onResolutionChanged = this._onResolutionChanged.bind(this);
    this._updateResolution = this._updateResolution.bind(this);

    this._currentResolution = devicePixelRatio;
    this._initState = InitState.UNINITIALIZED;
    this.app = new Application();

    this._setupWatchers();
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

      this._initState = InitState.INIT_SUCCESS;
    } catch (error) {
      this._initState = InitState.INIT_ERROR;
      throw error;
    }

    domElement.appendChild(this.app.canvas);
  }

  private _setupWatchers(): void {
    this._watchResolution();
  }

  private _watchResolution(): void {
    watchPixelRatio(this._onResolutionChanged);
  }

  private _onResolutionChanged(resolution: number): void {
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
    this.app.resize();
  }
}
