import { Application } from "pixi.js";

import { Camera } from "./Camera";
import { CameraKeyboardControls } from "./CameraKeyboardControls";
import { CameraPointerControls } from "./CameraPointerControls";

export class CameraControls {
  private readonly _keyboardControls: CameraKeyboardControls;
  private readonly _pointerControls: CameraPointerControls;

  public constructor(app: Application, camera: Camera) {
    this._keyboardControls = new CameraKeyboardControls(camera);
    this._pointerControls = new CameraPointerControls(app, camera, {
      onInteractionStart: () => {
        this._keyboardControls.stopPan();
      },
    });

    window.addEventListener("blur", this._resetInput);
    window.addEventListener("focus", this._resetInput);
    window.addEventListener("pagehide", this._resetInput);
    window.addEventListener("pageshow", this._resetInput);
    document.addEventListener("visibilitychange", this._onVisibilityChange);
  }

  public destroy(): void {
    this._keyboardControls.destroy();
    this._pointerControls.destroy();
    window.removeEventListener("blur", this._resetInput);
    window.removeEventListener("focus", this._resetInput);
    window.removeEventListener("pagehide", this._resetInput);
    window.removeEventListener("pageshow", this._resetInput);
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
  }

  public update(deltaMs: number): void {
    const hasKeyboardInput = this._keyboardControls.update(deltaMs);

    if (hasKeyboardInput) {
      this._pointerControls.stopFling();
    } else {
      this._pointerControls.update(deltaMs);
    }
  }

  private readonly _resetInput = (): void => {
    this._keyboardControls.reset();
    this._pointerControls.cancelInteraction();
  };

  private readonly _onVisibilityChange = (): void => {
    this._resetInput();
  };
}
