import { MAX_OBJECT_SIZE, MIN_OBJECT_SIZE } from "../../constants";
import { ShapeData } from "../../types/ShapeData";
import { ShapeKind } from "../../types/ShapeKind";
import { randNum } from "../../utils/randNum";

import { randomShapeKind } from "./randomShapeKind";
import { randomVisibleColor } from "./randomVisibleColor";

export const createRandomShape = (random: () => number): ShapeData => {
  const kind = randomShapeKind(random);
  const rotation = kind === ShapeKind.CIRCLE ? 0 : randNum(random, 2 * Math.PI);
  const size = randNum(random, MAX_OBJECT_SIZE, MIN_OBJECT_SIZE);

  return {
    x: 0,
    y: 0,
    kind: kind,
    color: randomVisibleColor(random),
    width: size,
    height: size,
    rotation: rotation,
  };
};
