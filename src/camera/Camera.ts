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
  private _x: number;
  private _y: number;
  private _targetX: number;
  private _targetY: number;
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
    this._x = 0;
    this._y = 0;
    this._targetX = 0;
    this._targetY = 0;
    this._zoom = this._clampZoom(options.initialZoom ?? DEFAULT_ZOOM);
    this._targetZoom = this._zoom;
    this._smoothing = options.smoothing ?? DEFAULT_SMOOTHING;

    this._clampPosition();
    this._applyTransform();
  }

  public get x(): number {
    return this._x;
  }

  public get y(): number {
    return this._y;
  }

  public get zoom(): number {
    return this._zoom;
  }

  public get targetZoom(): number {
    return this._targetZoom;
  }

  public resize(width: number, height: number): void {
    this._viewportWidth = Math.max(1, width);
    this._viewportHeight = Math.max(1, height);
    this._clampPosition();
    this._applyTransform();
  }

  public jumpTo(x: number, y: number): void {
    this._x = x;
    this._y = y;
    this._targetX = x;
    this._targetY = y;
    this._clampPosition();
    this._applyTransform();
  }

  public moveTo(x: number, y: number): void {
    this._targetX = x;
    this._targetY = y;
    this._clampTargetPosition();
  }

  public panByWorld(deltaX: number, deltaY: number): void {
    this.moveTo(this._targetX + deltaX, this._targetY + deltaY);
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
      this._targetX + (screenX - this._viewportWidth * 0.5) / this._targetZoom;
    const worldY =
      this._targetY + (screenY - this._viewportHeight * 0.5) / this._targetZoom;

    this._targetZoom = nextZoom;
    this._targetX = worldX - (screenX - this._viewportWidth * 0.5) / nextZoom;
    this._targetY = worldY - (screenY - this._viewportHeight * 0.5) / nextZoom;
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
      minX: Math.max(MIN_WORLD_COORDINATE, this._x - halfWidth - margin),
      minY: Math.max(MIN_WORLD_COORDINATE, this._y - halfHeight - margin),
      maxX: Math.min(this._maxX, this._x + halfWidth + margin),
      maxY: Math.min(this._maxY, this._y + halfHeight + margin),
    };
  }

  public update(deltaMs: number): void {
    const deltaSeconds = Math.max(0, deltaMs) / 1000;
    const alpha =
      this._smoothing <= 0 ? 1 : 1 - Math.exp(-this._smoothing * deltaSeconds);

    this._x = this._approach(this._x, this._targetX, alpha);
    this._y = this._approach(this._y, this._targetY, alpha);
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
      this._viewportWidth * 0.5 - this._x * this._zoom,
      this._viewportHeight * 0.5 - this._y * this._zoom,
    );
  }

  private _clampPosition(): void {
    this._zoom = this._clampZoom(this._zoom);
    this._targetZoom = this._clampZoom(this._targetZoom);
    this._clampTargetPosition();
    this._x = this._clampCoordinate(
      this._x,
      this._zoom,
      this._viewportWidth,
      this._maxX,
    );
    this._y = this._clampCoordinate(
      this._y,
      this._zoom,
      this._viewportHeight,
      this._maxY,
    );
  }

  private _clampTargetPosition(): void {
    this._targetX = this._clampCoordinate(
      this._targetX,
      this._targetZoom,
      this._viewportWidth,
      this._maxX,
    );
    this._targetY = this._clampCoordinate(
      this._targetY,
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
