import { TextureName } from "../types/TextureName";
import { randInt } from "./randInt";

const shapes: Readonly<TextureName[]> = Object.values(TextureName);

export const randShapeKind = (random: () => number): TextureName =>
  shapes[randInt(random, shapes.length)];
