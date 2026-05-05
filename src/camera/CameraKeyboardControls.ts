import { Camera } from "./Camera";

const KEYBOARD_PAN_MAX_SPEED = 900;
const KEYBOARD_PAN_ACCELERATION = 2800;
const KEYBOARD_PAN_DECELERATION = 4200;
const MIN_KEYBOARD_PAN_SPEED = 1;
const KEYBOARD_ZOOM_FACTOR = 1.08;

interface PanDirection {
  x: number;
  y: number;
}

export class CameraKeyboardControls {
  private readonly _camera: Camera;
  private readonly _pressedKeys: Set<string>;
  private _keyboardVelocityX: number;
  private _keyboardVelocityY: number;

  public constructor(camera: Camera) {
    this._camera = camera;
    this._pressedKeys = new Set();
    this._keyboardVelocityX = 0;
    this._keyboardVelocityY = 0;

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  public destroy(): void {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }

  public update(deltaMs: number): boolean {
    const direction = this._getPanDirection();

    this._updatePan(deltaMs, direction);

    return direction.x !== 0 || direction.y !== 0;
  }

  public reset(): void {
    this._pressedKeys.clear();
    this.stopPan();
  }

  public stopPan(): void {
    this._keyboardVelocityX = 0;
    this._keyboardVelocityY = 0;
  }

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

  private _getPanDirection(): PanDirection {
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

  private _updatePan(deltaMs: number, direction: PanDirection): void {
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
      this.stopPan();
      return;
    }

    this._camera.panByWorld(
      this._keyboardVelocityX * deltaSeconds,
      this._keyboardVelocityY * deltaSeconds,
    );
  }

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

  private _approach(current: number, target: number, maxDelta: number): number {
    const delta = target - current;

    if (Math.abs(delta) <= maxDelta) {
      return target;
    }

    return current + Math.sign(delta) * maxDelta;
  }
}
