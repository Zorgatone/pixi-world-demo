import { Graphics } from "pixi.js";

import { Camera } from "../camera/Camera";
import { GRID_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from "../constants";

const GRID_COLOR = 0xffffff;
const GRID_ALPHA = 0.5;
const GRID_LINE_WIDTH = 1;
const WORLD_EDGE_COLOR = 0xff0000;
const WORLD_EDGE_ALPHA = 1;
const WORLD_EDGE_LINE_WIDTH = 8;
const GRID_STATE_EPSILON = 0.001;

interface WorldGridState {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  minColumn: number;
  maxColumn: number;
  minRow: number;
  maxRow: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  resolution: number;
  viewportWidth: number;
  viewportHeight: number;
  showLeftEdge: boolean;
  showRightEdge: boolean;
  showTopEdge: boolean;
  showBottomEdge: boolean;
}

export class WorldGrid {
  public readonly view: Graphics;

  private _state?: WorldGridState;

  public constructor() {
    this.view = new Graphics();
    this.view.eventMode = "none";
  }

  public tick(camera: Camera, resolution: number): void {
    const nextState = this._getState(camera, resolution);

    if (this._isSameState(nextState)) {
      return;
    }

    this._state = nextState;
    this._draw(nextState);
  }

  private _getState(camera: Camera, resolution: number): WorldGridState {
    const bounds = camera.getVisibleBounds();
    const minColumn = Math.max(0, Math.ceil(bounds.minX / GRID_SIZE));
    const maxColumn = Math.min(
      Math.floor(WORLD_WIDTH / GRID_SIZE),
      Math.floor(bounds.maxX / GRID_SIZE),
    );
    const minRow = Math.max(0, Math.ceil(bounds.minY / GRID_SIZE));
    const maxRow = Math.min(
      Math.floor(WORLD_HEIGHT / GRID_SIZE),
      Math.floor(bounds.maxY / GRID_SIZE),
    );
    const viewportWidth = camera.viewportWidth;
    const viewportHeight = camera.viewportHeight;
    const leftEdgeX = this._projectWorldX(
      0,
      camera.x,
      camera.zoom,
      viewportWidth,
    );
    const rightEdgeX = this._projectWorldX(
      WORLD_WIDTH,
      camera.x,
      camera.zoom,
      viewportWidth,
    );
    const topEdgeY = this._projectWorldY(
      0,
      camera.y,
      camera.zoom,
      viewportHeight,
    );
    const bottomEdgeY = this._projectWorldY(
      WORLD_HEIGHT,
      camera.y,
      camera.zoom,
      viewportHeight,
    );

    return {
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
      minColumn: minColumn,
      maxColumn: maxColumn,
      minRow: minRow,
      maxRow: maxRow,
      cameraX: camera.x,
      cameraY: camera.y,
      zoom: camera.zoom,
      resolution: resolution,
      viewportWidth: viewportWidth,
      viewportHeight: viewportHeight,
      showLeftEdge: this._isStrokeVisible(leftEdgeX, viewportWidth),
      showRightEdge: this._isStrokeVisible(rightEdgeX, viewportWidth),
      showTopEdge: this._isStrokeVisible(topEdgeY, viewportHeight),
      showBottomEdge: this._isStrokeVisible(bottomEdgeY, viewportHeight),
    };
  }

  private _isSameState(nextState: WorldGridState): boolean {
    const state = this._state;

    if (!state) {
      return false;
    }

    return (
      state.minColumn === nextState.minColumn &&
      state.maxColumn === nextState.maxColumn &&
      state.minRow === nextState.minRow &&
      state.maxRow === nextState.maxRow &&
      state.showLeftEdge === nextState.showLeftEdge &&
      state.showRightEdge === nextState.showRightEdge &&
      state.showTopEdge === nextState.showTopEdge &&
      state.showBottomEdge === nextState.showBottomEdge &&
      this._isSameNumber(state.cameraX, nextState.cameraX) &&
      this._isSameNumber(state.cameraY, nextState.cameraY) &&
      this._isSameNumber(state.zoom, nextState.zoom) &&
      this._isSameNumber(state.resolution, nextState.resolution) &&
      this._isSameNumber(state.viewportWidth, nextState.viewportWidth) &&
      this._isSameNumber(state.viewportHeight, nextState.viewportHeight)
    );
  }

  private _isSameNumber(a: number, b: number): boolean {
    return Math.abs(a - b) < GRID_STATE_EPSILON;
  }

  private _draw(state: WorldGridState): void {
    this.view.clear();

    for (let column = state.minColumn; column <= state.maxColumn; column += 1) {
      const x = this._worldToScreenX(column * GRID_SIZE, state);

      this._drawLine(x, 0, x, state.viewportHeight);
    }

    for (let row = state.minRow; row <= state.maxRow; row += 1) {
      const y = this._worldToScreenY(row * GRID_SIZE, state);

      this._drawLine(0, y, state.viewportWidth, y);
    }

    this._drawWorldEdges(state);
  }

  private _drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.view.moveTo(x1, y1).lineTo(x2, y2).stroke({
      color: GRID_COLOR,
      alpha: GRID_ALPHA,
      width: GRID_LINE_WIDTH,
      pixelLine: true,
    });
  }

  private _drawWorldEdges(state: WorldGridState): void {
    if (state.showLeftEdge) {
      const x = this._worldToScreenX(0, state);

      this._drawEdgeLine(x, 0, x, state.viewportHeight);
    }

    if (state.showRightEdge) {
      const x = this._worldToScreenX(WORLD_WIDTH, state);

      this._drawEdgeLine(x, 0, x, state.viewportHeight);
    }

    if (state.showTopEdge) {
      const y = this._worldToScreenY(0, state);

      this._drawEdgeLine(0, y, state.viewportWidth, y);
    }

    if (state.showBottomEdge) {
      const y = this._worldToScreenY(WORLD_HEIGHT, state);

      this._drawEdgeLine(0, y, state.viewportWidth, y);
    }
  }

  private _drawEdgeLine(x1: number, y1: number, x2: number, y2: number): void {
    this.view.moveTo(x1, y1).lineTo(x2, y2).stroke({
      color: WORLD_EDGE_COLOR,
      alpha: WORLD_EDGE_ALPHA,
      width: WORLD_EDGE_LINE_WIDTH,
    });
  }

  private _worldToScreenX(worldX: number, state: WorldGridState): number {
    return this._snapToPhysicalPixel(
      this._projectWorldX(
        worldX,
        state.cameraX,
        state.zoom,
        state.viewportWidth,
      ),
      state.resolution,
    );
  }

  private _worldToScreenY(worldY: number, state: WorldGridState): number {
    return this._snapToPhysicalPixel(
      this._projectWorldY(
        worldY,
        state.cameraY,
        state.zoom,
        state.viewportHeight,
      ),
      state.resolution,
    );
  }

  private _projectWorldX(
    worldX: number,
    cameraX: number,
    zoom: number,
    viewportWidth: number,
  ): number {
    return (worldX - cameraX) * zoom + viewportWidth * 0.5;
  }

  private _projectWorldY(
    worldY: number,
    cameraY: number,
    zoom: number,
    viewportHeight: number,
  ): number {
    return (worldY - cameraY) * zoom + viewportHeight * 0.5;
  }

  private _isStrokeVisible(coordinate: number, viewportSize: number): boolean {
    const halfWidth = WORLD_EDGE_LINE_WIDTH * 0.5;

    return coordinate + halfWidth > 0 && coordinate - halfWidth < viewportSize;
  }

  private _snapToPhysicalPixel(coordinate: number, resolution: number): number {
    return Math.round(coordinate * resolution) / resolution;
  }
}
