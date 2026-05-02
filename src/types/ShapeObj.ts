import { TextureName } from "./TextureName";

export interface ShapeObj {
  x: number;
  y: number;
  kind: TextureName;
  color: number;
  width: number;
  height: number;
  rotation: number;
}
