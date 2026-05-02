import { randInt } from "./randInt";

export const randColor = (random: () => number) => randInt(random, 0xffffff);
