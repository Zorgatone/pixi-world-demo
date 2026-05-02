export function hashSeed(seed: string): number {
  // Apply xmur3 once

  const len = seed.length;
  let h = 1779033703 ^ len;

  for (let i = 0; i < len; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;

  return h >>> 0;
}
