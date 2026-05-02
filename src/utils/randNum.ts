export function randNum(
  random: () => number,
  max: number,
  min: number = 0,
): number {
  console.assert(min < max, "Invalid range!");

  return random() * (max - min) + min;
}
