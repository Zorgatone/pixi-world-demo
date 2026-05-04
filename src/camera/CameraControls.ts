import { Application } from "pixi.js";

import { Camera } from "./Camera";

const KEYBOARD_PAN_MAX_SPEED = 900;
const KEYBOARD_PAN_ACCELERATION = 2800;
const KEYBOARD_PAN_DECELERATION = 4200;
const MIN_KEYBOARD_PAN_SPEED = 1;
const KEYBOARD_ZOOM_FACTOR = 1.08;
const WHEEL_ZOOM_SPEED = 0.0015;
const LINE_HEIGHT_PX = 16;
const VELOCITY_SAMPLE_WEIGHT = 0.35;
const FLING_DECAY_RATE = 4.8;
const MIN_FLING_SPEED = 8;
const MAX_FLING_SPEED = 3600;
const RELEASED_MOUSE_MOVE_FLING_GRACE_MS = 160;

interface PointerState {
  x: number;
  y: number;
  pointerType: string;
}

export class CameraControls {
  private readonly _app: Application;
  private readonly _camera: Camera;
  private readonly _pressedKeys: Set<string>;
  private readonly _pointers: Map<number, PointerState>;
  private _activePointerId?: number;
  private _lastPointerX: number;
  private _lastPointerY: number;
  private _lastPointerTime: number;
  private _dragVelocityX: number;
  private _dragVelocityY: number;
  private _flingVelocityX: number;
  private _flingVelocityY: number;
  private _keyboardVelocityX: number;
  private _keyboardVelocityY: number;
  private _pinchDistance?: number;
  private _pinchCenterX: number;
  private _pinchCenterY: number;
  private _didPinch: boolean;

  public constructor(app: Application, camera: Camera) {
    this._app = app;
    this._camera = camera;
    this._pressedKeys = new Set();
    this._pointers = new Map();
    this._lastPointerX = 0;
    this._lastPointerY = 0;
    this._lastPointerTime = 0;
    this._dragVelocityX = 0;
    this._dragVelocityY = 0;
    this._flingVelocityX = 0;
    this._flingVelocityY = 0;
    this._keyboardVelocityX = 0;
    this._keyboardVelocityY = 0;
    this._pinchCenterX = 0;
    this._pinchCenterY = 0;
    this._didPinch = false;

    this._app.canvas.addEventListener("pointerdown", this._onPointerDown);
    this._app.canvas.addEventListener("pointermove", this._onPointerMove);
    this._app.canvas.addEventListener("pointerup", this._onPointerUp);
    this._app.canvas.addEventListener("pointercancel", this._onPointerCancel);
    this._app.canvas.addEventListener("wheel", this._onWheel, {
      passive: false,
    });
    window.addEventListener("pointerup", this._onGlobalPointerUp);
    window.addEventListener("pointercancel", this._onGlobalPointerCancel);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._onWindowBlur);
    document.addEventListener("visibilitychange", this._onVisibilityChange);
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
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("blur", this._onWindowBlur);
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
  }

  public update(deltaMs: number): void {
    const direction = this._getKeyboardPanDirection();
    const hasKeyboardInput = direction.x !== 0 || direction.y !== 0;

    if (hasKeyboardInput) {
      this._stopFling();
    } else {
      this._updateFling(deltaMs);
    }

    this._updateKeyboardPan(deltaMs, direction);
  }

  private _getKeyboardPanDirection(): { x: number; y: number } {
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

    return { x, y };
  }

  private _updateKeyboardPan(
    deltaMs: number,
    direction: { x: number; y: number },
  ): void {
    const deltaSeconds = Math.max(0, deltaMs) / 1000;

    if (deltaSeconds <= 0) {
      return;
    }

    const directionLength = Math.hypot(direction.x, direction.y);
    const hasInput = directionLength > 0;
    const targetVelocityX = hasInput
      ? (direction.x / directionLength) * KEYBOARD_PAN_MAX_SPEED
      : 0;
    const targetVelocityY = hasInput
      ? (direction.y / directionLength) * KEYBOARD_PAN_MAX_SPEED
      : 0;
    const maxDelta =
      (hasInput ? KEYBOARD_PAN_ACCELERATION : KEYBOARD_PAN_DECELERATION) *
      deltaSeconds;

    this._keyboardVelocityX = this._approach(
      this._keyboardVelocityX,
      targetVelocityX,
      maxDelta,
    );
    this._keyboardVelocityY = this._approach(
      this._keyboardVelocityY,
      targetVelocityY,
      maxDelta,
    );

    if (
      Math.hypot(this._keyboardVelocityX, this._keyboardVelocityY) <
      MIN_KEYBOARD_PAN_SPEED
    ) {
      this._stopKeyboardPan();
      return;
    }

    this._camera.panByWorld(
      this._keyboardVelocityX * deltaSeconds,
      this._keyboardVelocityY * deltaSeconds,
    );
  }

  private readonly _onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    this._stopFling();
    this._stopKeyboardPan();
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
      return;
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
    this._pointers.delete(event.pointerId);

    if (this._app.canvas.hasPointerCapture(event.pointerId)) {
      this._app.canvas.releasePointerCapture(event.pointerId);
    }

    if (this._pointers.size === 0) {
      this._activePointerId = undefined;
      this._pinchDistance = undefined;
      this._didPinch = false;
      this._dragVelocityX = 0;
      this._dragVelocityY = 0;
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
    this._stopFling();

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

  private readonly _onWindowBlur = (): void => {
    this._resetKeyboardInput();
    this._cancelPointerInteraction();
  };

  private readonly _onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      this._resetKeyboardInput();
      this._cancelPointerInteraction();
    }
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
    this._stopFling();

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

  private _getCanvasPoint(event: PointerEvent | WheelEvent): PointerState {
    const bounds = this._app.canvas.getBoundingClientRect();

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      pointerType: "pointerType" in event ? event.pointerType : "wheel",
    };
  }

  private _isReleasedMouseMove(event: PointerEvent): boolean {
    return event.pointerType === "mouse" && event.buttons === 0;
  }

  private _handleReleasedMouseMove(event: PointerEvent): void {
    const elapsedSinceLastDragSample =
      performance.now() - this._lastPointerTime;

    if (elapsedSinceLastDragSample <= RELEASED_MOUSE_MOVE_FLING_GRACE_MS) {
      this._onPointerUp(event);
      return;
    }

    this._cancelPointerInteraction();
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
      this._stopFling();
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
      this._stopFling();
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

  private _stopFling(): void {
    this._flingVelocityX = 0;
    this._flingVelocityY = 0;
  }

  private _stopKeyboardPan(): void {
    this._keyboardVelocityX = 0;
    this._keyboardVelocityY = 0;
  }

  private _cancelPointerInteraction(): void {
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
  }

  private _resetKeyboardInput(): void {
    this._pressedKeys.clear();
    this._stopKeyboardPan();
  }

  private _approach(current: number, target: number, maxDelta: number): number {
    const delta = target - current;

    if (Math.abs(delta) <= maxDelta) {
      return target;
    }

    return current + Math.sign(delta) * maxDelta;
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
