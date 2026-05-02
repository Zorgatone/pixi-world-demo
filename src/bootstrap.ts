import { Container, Sprite } from "pixi.js";

import { Root } from "./Root";
import { generateTextures, TextureCache } from "./textures";
import { ShapeObj } from "./types/ShapeObj";
import { hashSeed } from "./utils/hashSeed";
import { createPrng } from "./utils/prng";
import { randShapeObj } from "./utils/randShapeObj";

const MAX_SCALE = 4;
const MAX_WIDTH = 200 * MAX_SCALE;
const MAX_HEIGHT = MAX_WIDTH;

async function setupRoot(): Promise<Root> {
  const pixiContainer = document.getElementById("pixi-container");

  if (!pixiContainer) {
    throw new Error("Could not find pixi-container DOM element!");
  }

  const root = new Root();

  await root.init(pixiContainer);

  return root;
}

function generateData(): ShapeObj[] {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get("seed") || "seed";

  const random = createPrng(hashSeed(seed));
  const nextShapeObj = () => randShapeObj(random);

  const data = new Array<ShapeObj>(5);

  for (let i = 0, len = data.length; i < len; i += 1) {
    data[i] = nextShapeObj();
  }

  return data;
}

function makeTextures(root: Root): Readonly<TextureCache> {
  const app = root.app;

  return generateTextures(
    app.renderer.generateTexture.bind(app.renderer),
    MAX_WIDTH,
    MAX_HEIGHT,
  );
}

function setupScene(
  root: Root,
  textureCache: Readonly<TextureCache>,
  data: ShapeObj[],
): Container {
  const shapesContainer = new Container();

  let x = 300;
  let y = 300;

  for (let i = 0, len = data.length; i < len; i += 1) {
    const config = data[i];

    const sprite = new Sprite(textureCache[config.kind]);

    sprite.anchor.set(0.5, 0.5);
    sprite.tint = config.color;
    sprite.scale.set(config.scale / (4 * window.devicePixelRatio));
    sprite.position.set(x, y);
    sprite.rotation = config.rotation;

    shapesContainer.addChild(sprite);

    x += sprite.width + 100;
    y += sprite.height + 100;
    // TODO: keep the sprite class to manage state later
  }

  root.worldContainer.addChild(shapesContainer);

  return shapesContainer;
}

export async function bootstrap(): Promise<void> {
  const root = await setupRoot();

  const data = generateData();
  const textures = makeTextures(root);

  setupScene(root, textures, data);
}
