import { ShapeObj } from "../types/ShapeObj";
import { TextureName } from "../types/TextureName";
import { MAX_OBJECT_SIZE, MIN_OBJECT_SIZE } from "../constants";

import { randColor } from "./randColor";
import { randNum } from "./randNum";
import { randShapeKind } from "./randShapeKind";

export const randShapeObj = (random: () => number): ShapeObj => {
  const kind = randShapeKind(random);
  const rotation =
    kind === TextureName.CIRCLE ? 0 : randNum(random, 2 * Math.PI);
  const size = randNum(random, MAX_OBJECT_SIZE, MIN_OBJECT_SIZE);

  return {
    x: 0,
    y: 0,
    kind: kind,
    color: randColor(random),
    width: size,
    height: size,
    rotation: rotation,
  };
};
