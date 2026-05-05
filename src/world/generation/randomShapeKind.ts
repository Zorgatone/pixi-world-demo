import { ShapeKind } from "../../types/ShapeKind";
import { randInt } from "../../utils/randInt";

const shapes: Readonly<ShapeKind[]> = Object.values(ShapeKind);

export const randomShapeKind = (random: () => number): ShapeKind =>
  shapes[randInt(random, shapes.length)];
