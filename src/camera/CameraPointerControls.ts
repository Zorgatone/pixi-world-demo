import { Application } from "pixi.js";

import { Camera } from "./Camera";

const WHEEL_ZOOM_SPEED = 0.0015;
const LINE_HEIGHT_PX = 16;
const VELOCITY_SAMPLE_WEIGHT = 0.35;
const FLING_DECAY_RATE = 4.8;
const MIN_FLING_SPEED = 8;
const MAX_FLING_SPEED = 3600;
const RELEASED_MOUSE_MOVE_FLING_GRACE_MS = 160;
const FOCUS_RECOVERED_MOUSE_DRAG_MS = 1000;

interface PointerState {
  x: number;
  y: number;
}

interface CameraPointerControlsOptions {
  onInteractionStart(): void;
}

export class CameraPointerControls {
  private readonly _app: Application;
  private readonly _camera: Camera;
  private readonly _options: CameraPointerControlsOptions;
  private readonly _pointers: Map<number, PointerState>;
  private _activePointerId?: number;
  private _lastPointerX: number;
  private _lastPointerY: number;
  private _lastPointerTime: number;
  private _dragVelocityX: number;
  private _dragVelocityY: number;
  private _flingVelocityX: number;
  private _flingVelocityY: number;
  private _pinchDistance?: number;
  private _pinchCenterX: number;
  private _pinchCenterY: number;
  private _didPinch: boolean;
  private _recoverMissingMouseDownUntil: number;

  public constructor(
    app: Application,
    camera: Camera,
    options: CameraPointerControlsOptions,
  ) {
    this._app = app;
    this._camera = camera;
    this._options = options;
    this._pointers = new Map();
    this._lastPointerX = 0;
    this._lastPointerY = 0;
    this._lastPointerTime = 0;
    this._dragVelocityX = 0;
    this._dragVelocityY = 0;
    this._flingVelocityX = 0;
    this._flingVelocityY = 0;
    this._pinchCenterX = 0;
    this._pinchCenterY = 0;
    this._didPinch = false;
    this._recoverMissingMouseDownUntil = 0;

    this._app.canvas.addEventListener("pointerdown", this._onPointerDown);
    this._app.canvas.addEventListener("pointermove", this._onPointerMove);
    this._app.canvas.addEventListener("pointerup", this._onPointerUp);
    this._app.canvas.addEventListener("pointercancel", this._onPointerCancel);
    this._app.canvas.addEventListener("wheel", this._onWheel, {
      passive: false,
    });
    window.addEventListener("pointerup", this._onGlobalPointerUp);
    window.addEventListener("pointercancel", this._onGlobalPointerCancel);
  }

  public destroy(): void {
    this._app.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this._app.canvas.removeEventListener("pointermove", this._onPointerMove);
    this._app.canvas.removeEventListener("pointerup", this._onPointerUp);
    this._app.canvas.removeEventListener(
      "pointercancel",
      this._onPointerCancel,
    );
    this._app.canvas.removeEventListener("wheel", this._onWheel);
    window.removeEventListener("pointerup", this._onGlobalPointerUp);
    window.removeEventListener("pointercancel", this._onGlobalPointerCancel);
  }

  public update(deltaMs: number): void {
    this._updateFling(deltaMs);
  }

  public stopFling(): void {
    this._flingVelocityX = 0;
    this._flingVelocityY = 0;
  }

  public allowFocusRecoveredMouseDrag(): void {
    this._recoverMissingMouseDownUntil =
      performance.now() + FOCUS_RECOVERED_MOUSE_DRAG_MS;
  }

  public cancelInteraction(): void {
    for (const pointerId of this._pointers.keys()) {
      if (this._app.canvas.hasPointerCapture(pointerId)) {
        this._app.canvas.releasePointerCapture(pointerId);
      }
    }

    this._pointers.clear();
    this._activePointerId = undefined;
    this._pinchDistance = undefined;
    this._didPinch = false;
    this._dragVelocityX = 0;
    this._dragVelocityY = 0;
    this._recoverMissingMouseDownUntil = 0;
  }

  private readonly _onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    this.stopFling();
    this._recoverMissingMouseDownUntil = 0;
    this._options.onInteractionStart();
    this._activePointerId = event.pointerId;
    const point = this._getCanvasPoint(event);

    this._pointers.set(event.pointerId, point);
    this._lastPointerX = point.x;
    this._lastPointerY = point.y;
    this._lastPointerTime = performance.now();
    this._dragVelocityX = 0;
    this._dragVelocityY = 0;

    if (this._pointers.size >= 2) {
      this._didPinch = true;
      this._startPinch();
    } else {
      this._didPinch = false;
    }

    this._app.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly _onPointerMove = (event: PointerEvent): void => {
    if (!this._pointers.has(event.pointerId)) {
      if (!this._tryRecoverMissingMouseDown(event)) {
        return;
      }
    }

    if (this._isReleasedMouseMove(event)) {
      this._handleReleasedMouseMove(event);
      return;
    }

    const point = this._getCanvasPoint(event);

    this._pointers.set(event.pointerId, point);

    if (this._pointers.size >= 2) {
      this._updatePinch();
      event.preventDefault();
      return;
    }

    if (this._activePointerId !== event.pointerId) {
      return;
    }

    const deltaX = point.x - this._lastPointerX;
    const deltaY = point.y - this._lastPointerY;
    const now = performance.now();

    this._lastPointerX = point.x;
    this._lastPointerY = point.y;
    this._sampleDragVelocity(deltaX, deltaY, now);
    this._camera.panByScreen(deltaX, deltaY);
    event.preventDefault();
  };

  private readonly _onPointerUp = (event: PointerEvent): void => {
    if (!this._pointers.has(event.pointerId)) {
      return;
    }

    const pointer = this._pointers.get(event.pointerId);

    this._pointers.delete(event.pointerId);

    if (this._app.canvas.hasPointerCapture(event.pointerId)) {
      this._app.canvas.releasePointerCapture(event.pointerId);
    }

    if (this._pointers.size === 1) {
      const remainingEntry = this._pointers.entries().next().value;

      if (!remainingEntry) {
        return;
      }

      const [remainingPointerId, remainingPointer] = remainingEntry;

      this._activePointerId = remainingPointerId;
      this._lastPointerX = remainingPointer.x;
      this._lastPointerY = remainingPointer.y;
      this._lastPointerTime = performance.now();
      this._dragVelocityX = 0;
      this._dragVelocityY = 0;
      this._didPinch = true;
    } else if (this._pointers.size === 0) {
      this._activePointerId = undefined;
      this._startFling(pointer);
    }

    this._pinchDistance = undefined;
    event.preventDefault();
  };

  private readonly _onPointerCancel = (event: PointerEvent): void => {
    this._dropPointer(event.pointerId);

    if (this._app.canvas.hasPointerCapture(event.pointerId)) {
      this._app.canvas.releasePointerCapture(event.pointerId);
    }
  };

  private readonly _onGlobalPointerUp = (event: PointerEvent): void => {
    if (!this._pointers.has(event.pointerId)) {
      return;
    }

    this._onPointerUp(event);
  };

  private readonly _onGlobalPointerCancel = (event: PointerEvent): void => {
    if (!this._pointers.has(event.pointerId)) {
      return;
    }

    this._onPointerCancel(event);
  };

  private readonly _onWheel = (event: WheelEvent): void => {
    this.stopFling();

    const point = this._getCanvasPoint(event);
    const deltaY = this._normalizeWheelDelta(event);
    const factor = Math.exp(-deltaY * WHEEL_ZOOM_SPEED);

    this._camera.zoomByAtScreenPoint(factor, point.x, point.y);
    event.preventDefault();
  };

  private _startPinch(): void {
    this.stopFling();

    const pinch = this._getPinch();

    if (!pinch) {
      return;
    }

    this._pinchDistance = pinch.distance;
    this._pinchCenterX = pinch.centerX;
    this._pinchCenterY = pinch.centerY;
  }

  private _updatePinch(): void {
    this._didPinch = true;

    const pinch = this._getPinch();

    if (!pinch) {
      return;
    }

    if (typeof this._pinchDistance !== "undefined" && this._pinchDistance > 0) {
      this._camera.panByScreen(
        pinch.centerX - this._pinchCenterX,
        pinch.centerY - this._pinchCenterY,
      );
      this._camera.zoomByAtScreenPoint(
        pinch.distance / this._pinchDistance,
        pinch.centerX,
        pinch.centerY,
      );
    }

    this._pinchDistance = pinch.distance;
    this._pinchCenterX = pinch.centerX;
    this._pinchCenterY = pinch.centerY;
  }

  private _getPinch():
    | { centerX: number; centerY: number; distance: number }
    | undefined {
    const pointers = Array.from(this._pointers.values());

    if (pointers.length < 2) {
      return undefined;
    }

    const first = pointers[0];
    const second = pointers[1];
    const deltaX = second.x - first.x;
    const deltaY = second.y - first.y;

    return {
      centerX: (first.x + second.x) * 0.5,
      centerY: (first.y + second.y) * 0.5,
      distance: Math.hypot(deltaX, deltaY),
    };
  }

  private _dropPointer(pointerId: number): void {
    if (!this._pointers.delete(pointerId)) {
      return;
    }

    if (this._pointers.size === 0) {
      this._activePointerId = undefined;
      this._pinchDistance = undefined;
      this._didPinch = false;
      this._dragVelocityX = 0;
      this._dragVelocityY = 0;
    }
  }

  private _getCanvasPoint(event: PointerEvent | WheelEvent): PointerState {
    const bounds = this._app.canvas.getBoundingClientRect();

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  }

  private _isReleasedMouseMove(event: PointerEvent): boolean {
    return event.pointerType === "mouse" && event.buttons === 0;
  }

  private _tryRecoverMissingMouseDown(event: PointerEvent): boolean {
    if (!this._canRecoverMissingMouseDown(event)) {
      return false;
    }

    this.stopFling();
    this._recoverMissingMouseDownUntil = 0;
    this._options.onInteractionStart();

    const point = this._getCanvasPoint(event);

    this._activePointerId = event.pointerId;
    this._pointers.set(event.pointerId, point);
    this._lastPointerX = point.x;
    this._lastPointerY = point.y;
    this._lastPointerTime = performance.now();
    this._dragVelocityX = 0;
    this._dragVelocityY = 0;
    this._pinchDistance = undefined;
    this._didPinch = false;
    this._trySetPointerCapture(event.pointerId);
    event.preventDefault();

    return true;
  }

  private _canRecoverMissingMouseDown(event: PointerEvent): boolean {
    return (
      event.pointerType === "mouse" &&
      event.isPrimary &&
      (event.buttons & 1) === 1 &&
      performance.now() <= this._recoverMissingMouseDownUntil
    );
  }

  private _trySetPointerCapture(pointerId: number): void {
    if (this._app.canvas.hasPointerCapture(pointerId)) {
      return;
    }

    try {
      this._app.canvas.setPointerCapture(pointerId);
    } catch {
      // Some browsers may not allow capture when recovering after a missed down.
    }
  }

  private _handleReleasedMouseMove(event: PointerEvent): void {
    const elapsedSinceLastDragSample =
      performance.now() - this._lastPointerTime;

    if (elapsedSinceLastDragSample <= RELEASED_MOUSE_MOVE_FLING_GRACE_MS) {
      this._onPointerUp(event);
      return;
    }

    this.cancelInteraction();
    event.preventDefault();
  }

  private _sampleDragVelocity(
    deltaX: number,
    deltaY: number,
    now: number,
  ): void {
    const deltaSeconds = Math.max(0.001, (now - this._lastPointerTime) / 1000);
    const velocityX = deltaX / deltaSeconds;
    const velocityY = deltaY / deltaSeconds;

    this._lastPointerTime = now;
    this._dragVelocityX =
      this._dragVelocityX * (1 - VELOCITY_SAMPLE_WEIGHT) +
      velocityX * VELOCITY_SAMPLE_WEIGHT;
    this._dragVelocityY =
      this._dragVelocityY * (1 - VELOCITY_SAMPLE_WEIGHT) +
      velocityY * VELOCITY_SAMPLE_WEIGHT;
  }

  private _startFling(pointer: PointerState | undefined): void {
    if (!pointer || this._didPinch) {
      this._didPinch = false;
      return;
    }

    const worldVelocityX = -this._dragVelocityX / this._camera.targetZoom;
    const worldVelocityY = -this._dragVelocityY / this._camera.targetZoom;
    const speed = Math.hypot(worldVelocityX, worldVelocityY);

    this._didPinch = false;

    if (speed < MIN_FLING_SPEED) {
      this.stopFling();
      return;
    }

    const scale = Math.min(1, MAX_FLING_SPEED / speed);

    this._flingVelocityX = worldVelocityX * scale;
    this._flingVelocityY = worldVelocityY * scale;
    this._dragVelocityX = 0;
    this._dragVelocityY = 0;
  }

  private _updateFling(deltaMs: number): void {
    const deltaSeconds = Math.max(0, deltaMs) / 1000;
    const speed = Math.hypot(this._flingVelocityX, this._flingVelocityY);

    if (speed < MIN_FLING_SPEED || deltaSeconds <= 0) {
      this.stopFling();
      return;
    }

    this._camera.panByWorld(
      this._flingVelocityX * deltaSeconds,
      this._flingVelocityY * deltaSeconds,
    );

    const decay = Math.exp(-FLING_DECAY_RATE * deltaSeconds);

    this._flingVelocityX *= decay;
    this._flingVelocityY *= decay;
  }

  private _normalizeWheelDelta(event: WheelEvent): number {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return event.deltaY * LINE_HEIGHT_PX;
    }

    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      return event.deltaY * this._app.canvas.clientHeight;
    }

    return event.deltaY;
  }
}
