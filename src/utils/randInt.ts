import { randNum } from "./randNum";

export function randInt(
  random: () => number,
  max: number,
  min: number = 0,
): number {
  max = Math.floor(max);
  min = Math.ceil(min);

  return Math.floor(randNum(random, max, min));
}
