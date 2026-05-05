import { Container } from "pixi.js";

export interface CameraBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface CameraOptions {
  maxX: number;
  maxY: number;
  initialZoom?: number;
  minZoom: number;
  maxZoom: number;
  smoothing?: number;
}

const DEFAULT_ZOOM = 1;
const DEFAULT_SMOOTHING = 18;
const SNAP_EPSILON = 0.001;
const MIN_WORLD_COORDINATE = 0;

export class Camera {
  public readonly world: Container;

  private readonly _maxX: number;
  private readonly _maxY: number;
  private readonly _minZoom: number;
  private readonly _maxZoom: number;
  private _viewportWidth: number;
  private _viewportHeight: number;
  private _centerX: number;
  private _centerY: number;
  private _targetCenterX: number;
  private _targetCenterY: number;
  private _zoom: number;
  private _targetZoom: number;
  private _smoothing: number;

  public constructor(world: Container, options: CameraOptions) {
    this.world = world;
    this._maxX = Math.max(MIN_WORLD_COORDINATE, options.maxX);
    this._maxY = Math.max(MIN_WORLD_COORDINATE, options.maxY);
    this._minZoom = Math.max(SNAP_EPSILON, options.minZoom);
    this._maxZoom = Math.max(this._minZoom, options.maxZoom);
    this._viewportWidth = 1;
    this._viewportHeight = 1;
    this._centerX = 0;
    this._centerY = 0;
    this._targetCenterX = 0;
    this._targetCenterY = 0;
    this._zoom = this._clampZoom(options.initialZoom ?? DEFAULT_ZOOM);
    this._targetZoom = this._zoom;
    this._smoothing = options.smoothing ?? DEFAULT_SMOOTHING;

    this._clampPosition();
    this._applyTransform();
  }

  public get centerX(): number {
    return this._centerX;
  }

  public get centerY(): number {
    return this._centerY;
  }

  public get zoom(): number {
    return this._zoom;
  }

  public get targetZoom(): number {
    return this._targetZoom;
  }

  public get viewportWidth(): number {
    return this._viewportWidth;
  }

  public get viewportHeight(): number {
    return this._viewportHeight;
  }

  public resize(width: number, height: number): void {
    this._viewportWidth = Math.max(1, width);
    this._viewportHeight = Math.max(1, height);
    this._clampPosition();
    this._applyTransform();
  }

  public jumpToCenter(centerX: number, centerY: number): void {
    this._centerX = centerX;
    this._centerY = centerY;
    this._targetCenterX = centerX;
    this._targetCenterY = centerY;
    this._clampPosition();
    this._applyTransform();
  }

  public moveToCenter(centerX: number, centerY: number): void {
    this._targetCenterX = centerX;
    this._targetCenterY = centerY;
    this._clampTargetPosition();
  }

  public panByWorld(deltaX: number, deltaY: number): void {
    this.moveToCenter(
      this._targetCenterX + deltaX,
      this._targetCenterY + deltaY,
    );
  }

  public panByScreen(deltaX: number, deltaY: number): void {
    this.panByWorld(-deltaX / this._targetZoom, -deltaY / this._targetZoom);
  }

  public setZoom(zoom: number): void {
    this._targetZoom = this._clampZoom(zoom);
    this._clampTargetPosition();
  }

  public zoomByAtScreenPoint(
    factor: number,
    screenX = this._viewportWidth * 0.5,
    screenY = this._viewportHeight * 0.5,
  ): void {
    this.zoomToAtScreenPoint(this._targetZoom * factor, screenX, screenY);
  }

  public zoomToAtScreenPoint(
    zoom: number,
    screenX = this._viewportWidth * 0.5,
    screenY = this._viewportHeight * 0.5,
  ): void {
    const nextZoom = this._clampZoom(zoom);
    const worldX =
      this._targetCenterX +
      (screenX - this._viewportWidth * 0.5) / this._targetZoom;
    const worldY =
      this._targetCenterY +
      (screenY - this._viewportHeight * 0.5) / this._targetZoom;

    this._targetZoom = nextZoom;
    this._targetCenterX =
      worldX - (screenX - this._viewportWidth * 0.5) / nextZoom;
    this._targetCenterY =
      worldY - (screenY - this._viewportHeight * 0.5) / nextZoom;
    this._clampTargetPosition();
  }

  public screenToWorld(
    screenX: number,
    screenY: number,
  ): { x: number; y: number } {
    return {
      x: (screenX - this.world.x) / this._zoom,
      y: (screenY - this.world.y) / this._zoom,
    };
  }

  public getVisibleBounds(margin = 0): CameraBounds {
    const halfWidth = this._viewportWidth / (2 * this._zoom);
    const halfHeight = this._viewportHeight / (2 * this._zoom);

    return {
      minX: Math.max(MIN_WORLD_COORDINATE, this._centerX - halfWidth - margin),
      minY: Math.max(MIN_WORLD_COORDINATE, this._centerY - halfHeight - margin),
      maxX: Math.min(this._maxX, this._centerX + halfWidth + margin),
      maxY: Math.min(this._maxY, this._centerY + halfHeight + margin),
    };
  }

  public update(deltaMs: number): void {
    const deltaSeconds = Math.max(0, deltaMs) / 1000;
    const alpha =
      this._smoothing <= 0 ? 1 : 1 - Math.exp(-this._smoothing * deltaSeconds);

    this._centerX = this._approach(this._centerX, this._targetCenterX, alpha);
    this._centerY = this._approach(this._centerY, this._targetCenterY, alpha);
    this._zoom = this._approach(this._zoom, this._targetZoom, alpha);
    this._clampPosition();

    this._applyTransform();
  }

  private _approach(current: number, target: number, alpha: number): number {
    const next = current + (target - current) * alpha;

    return Math.abs(next - target) < SNAP_EPSILON ? target : next;
  }

  private _applyTransform(): void {
    this.world.scale.set(this._zoom);
    this.world.position.set(
      this._viewportWidth * 0.5 - this._centerX * this._zoom,
      this._viewportHeight * 0.5 - this._centerY * this._zoom,
    );
  }

  private _clampPosition(): void {
    this._zoom = this._clampZoom(this._zoom);
    this._targetZoom = this._clampZoom(this._targetZoom);
    this._clampTargetPosition();
    this._centerX = this._clampCoordinate(
      this._centerX,
      this._zoom,
      this._viewportWidth,
      this._maxX,
    );
    this._centerY = this._clampCoordinate(
      this._centerY,
      this._zoom,
      this._viewportHeight,
      this._maxY,
    );
  }

  private _clampTargetPosition(): void {
    this._targetCenterX = this._clampCoordinate(
      this._targetCenterX,
      this._targetZoom,
      this._viewportWidth,
      this._maxX,
    );
    this._targetCenterY = this._clampCoordinate(
      this._targetCenterY,
      this._targetZoom,
      this._viewportHeight,
      this._maxY,
    );
  }

  private _clampCoordinate(
    coordinate: number,
    zoom: number,
    viewportSize: number,
    maxCoordinate: number,
  ): number {
    const halfViewport = viewportSize / (2 * zoom);
    const min = halfViewport;
    const max = maxCoordinate - halfViewport;

    if (min > max) {
      return maxCoordinate * 0.5;
    }

    return Math.min(max, Math.max(min, coordinate));
  }

  private _clampZoom(zoom: number): number {
    return Math.min(this._maxZoom, Math.max(this._minZoom, zoom));
  }
}
