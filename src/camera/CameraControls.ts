import { Application } from "pixi.js";

import { Camera } from "./Camera";

const KEYBOARD_PAN_SPEED = 900;
const KEYBOARD_ZOOM_FACTOR = 1.08;
const WHEEL_ZOOM_SPEED = 0.0015;
const LINE_HEIGHT_PX = 16;

interface PointerState {
  x: number;
  y: number;
}

export class CameraControls {
  private readonly _app: Application;
  private readonly _camera: Camera;
  private readonly _pressedKeys: Set<string>;
  private readonly _pointers: Map<number, PointerState>;
  private _activePointerId?: number;
  private _lastPointerX: number;
  private _lastPointerY: number;
  private _pinchDistance?: number;
  private _pinchCenterX: number;
  private _pinchCenterY: number;

  public constructor(app: Application, camera: Camera) {
    this._app = app;
    this._camera = camera;
    this._pressedKeys = new Set();
    this._pointers = new Map();
    this._lastPointerX = 0;
    this._lastPointerY = 0;
    this._pinchCenterX = 0;
    this._pinchCenterY = 0;

    this._app.canvas.addEventListener("pointerdown", this._onPointerDown);
    this._app.canvas.addEventListener("pointermove", this._onPointerMove);
    this._app.canvas.addEventListener("pointerup", this._onPointerUp);
    this._app.canvas.addEventListener("pointercancel", this._onPointerUp);
    this._app.canvas.addEventListener("wheel", this._onWheel, {
      passive: false,
    });
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  public destroy(): void {
    this._app.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this._app.canvas.removeEventListener("pointermove", this._onPointerMove);
    this._app.canvas.removeEventListener("pointerup", this._onPointerUp);
    this._app.canvas.removeEventListener("pointercancel", this._onPointerUp);
    this._app.canvas.removeEventListener("wheel", this._onWheel);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }

  public update(deltaMs: number): void {
    let x = 0;
    let y = 0;

    if (this._pressedKeys.has("ArrowLeft") || this._pressedKeys.has("KeyA")) {
      x -= 1;
    }

    if (this._pressedKeys.has("ArrowRight") || this._pressedKeys.has("KeyD")) {
      x += 1;
    }

    if (this._pressedKeys.has("ArrowUp") || this._pressedKeys.has("KeyW")) {
      y -= 1;
    }

    if (this._pressedKeys.has("ArrowDown") || this._pressedKeys.has("KeyS")) {
      y += 1;
    }

    if (x === 0 && y === 0) {
      return;
    }

    const length = Math.hypot(x, y);
    const distance = KEYBOARD_PAN_SPEED * (deltaMs / 1000);

    this._camera.panByWorld((x / length) * distance, (y / length) * distance);
  }

  private readonly _onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    this._activePointerId = event.pointerId;
    const point = this._getCanvasPoint(event);

    this._pointers.set(event.pointerId, point);
    this._lastPointerX = point.x;
    this._lastPointerY = point.y;

    if (this._pointers.size >= 2) {
      this._startPinch();
    }

    this._app.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly _onPointerMove = (event: PointerEvent): void => {
    if (!this._pointers.has(event.pointerId)) {
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

    this._lastPointerX = point.x;
    this._lastPointerY = point.y;
    this._camera.panByScreen(deltaX, deltaY);
    event.preventDefault();
  };

  private readonly _onPointerUp = (event: PointerEvent): void => {
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
    } else if (this._pointers.size === 0) {
      this._activePointerId = undefined;
    }

    this._pinchDistance = undefined;
    event.preventDefault();
  };

  private readonly _onWheel = (event: WheelEvent): void => {
    const point = this._getCanvasPoint(event);
    const deltaY = this._normalizeWheelDelta(event);
    const factor = Math.exp(-deltaY * WHEEL_ZOOM_SPEED);

    this._camera.zoomByAtScreenPoint(factor, point.x, point.y);
    event.preventDefault();
  };

  private readonly _onKeyDown = (event: KeyboardEvent): void => {
    if (this._isPanKey(event.code)) {
      this._pressedKeys.add(event.code);
      event.preventDefault();
      return;
    }

    if (event.code === "Equal" || event.code === "NumpadAdd") {
      this._camera.zoomByAtScreenPoint(KEYBOARD_ZOOM_FACTOR);
      event.preventDefault();
    } else if (event.code === "Minus" || event.code === "NumpadSubtract") {
      this._camera.zoomByAtScreenPoint(1 / KEYBOARD_ZOOM_FACTOR);
      event.preventDefault();
    }
  };

  private readonly _onKeyUp = (event: KeyboardEvent): void => {
    this._pressedKeys.delete(event.code);
  };

  private _isPanKey(code: string): boolean {
    return (
      code === "ArrowLeft" ||
      code === "ArrowRight" ||
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "KeyA" ||
      code === "KeyD" ||
      code === "KeyW" ||
      code === "KeyS"
    );
  }

  private _startPinch(): void {
    const pinch = this._getPinch();

    if (!pinch) {
      return;
    }

    this._pinchDistance = pinch.distance;
    this._pinchCenterX = pinch.centerX;
    this._pinchCenterY = pinch.centerY;
  }

  private _updatePinch(): void {
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

  private _getCanvasPoint(event: PointerEvent | WheelEvent): PointerState {
    const bounds = this._app.canvas.getBoundingClientRect();

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
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
