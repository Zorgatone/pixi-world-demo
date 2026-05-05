import { ShapeKind } from "./ShapeKind";

export interface ShapeData {
  x: number;
  y: number;
  kind: ShapeKind;
  color: number;
  width: number;
  height: number;
  rotation: number;
}
