import { ShapeObj } from "../types/ShapeObj";
import { TextureName } from "../types/TextureName";

import { randColor } from "./randColor";
import { randNum } from "./randNum";
import { randShapeKind } from "./randShapeKind";

export const randShapeObj = (random: () => number): ShapeObj => {
  const kind = randShapeKind(random);

  return {
    kind: kind,
    color: randColor(random),
    scale: randNum(random, 4, 0.2),
    rotation: kind === TextureName.CIRCLE ? 0 : randNum(random, 2 * Math.PI),
  };
};
