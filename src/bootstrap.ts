import { Root } from "./Root";
import { createShapeTextures, ShapeTextureCache } from "./textures";
import { ShapeData } from "./types/ShapeData";
import { WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import { generateWorldData } from "./world/generateWorldData";
import { ShapeRenderLayer } from "./world/ShapeRenderLayer";

async function setupRoot(): Promise<Root> {
  const pixiContainer = document.getElementById("pixi-container");

  if (!pixiContainer) {
    throw new Error("Could not find pixi-container DOM element!");
  }

  const root = new Root();

  await root.init(pixiContainer);

  return root;
}

function generateData(): ShapeData[] {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get("seed") || "seed";

  return generateWorldData(seed);
}

function makeTextures(root: Root): Readonly<ShapeTextureCache> {
  const app = root.app;

  return createShapeTextures(app.renderer.generateTexture.bind(app.renderer));
}

function setupScene(
  root: Root,
  textureCache: Readonly<ShapeTextureCache>,
  data: ShapeData[],
): void {
  const shapeLayer = new ShapeRenderLayer(textureCache, data);

  root.camera.jumpToCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  root.setShapeLayer(shapeLayer);
}

export async function bootstrap(): Promise<void> {
  const root = await setupRoot();

  const data = generateData();
  const textures = makeTextures(root);

  setupScene(root, textures, data);
}
