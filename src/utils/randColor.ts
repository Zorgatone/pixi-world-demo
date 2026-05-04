import { randInt } from "./randInt";

const WHITE = 0xffffff;
const COLOR_COUNT = WHITE + 1;
const COLOR_CHANNEL_MAX = 255;
// WCAG2 accessibility (enough contrast on black background)
const MIN_VISIBLE_LUMINANCE = 0.18;
const MAX_RANDOM_COLOR_ATTEMPTS = 16;

export function randColor(random: () => number): number {
  for (let i = 0; i < MAX_RANDOM_COLOR_ATTEMPTS; i += 1) {
    const color = randInt(random, COLOR_COUNT);

    if (getRelativeLuminance(color) >= MIN_VISIBLE_LUMINANCE) {
      return color;
    }
  }

  return WHITE;
}

function getRelativeLuminance(color: number): number {
  const red = toLinearRgb((color >> 16) & 0xff);
  const green = toLinearRgb((color >> 8) & 0xff);
  const blue = toLinearRgb(color & 0xff);

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function toLinearRgb(channel: number): number {
  const value = channel / COLOR_CHANNEL_MAX;

  if (value <= 0.04045) {
    return value / 12.92;
  }

  return ((value + 0.055) / 1.055) ** 2.4;
}
