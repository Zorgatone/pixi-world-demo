import { Root } from "./Root";
import { generateTextures, TextureCache } from "./textures";
import { ShapeObj } from "./types/ShapeObj";
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

function generateData(): ShapeObj[] {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get("seed") || "seed";

  return generateWorldData(seed);
}

function makeTextures(root: Root): Readonly<TextureCache> {
  const app = root.app;

  return generateTextures(app.renderer.generateTexture.bind(app.renderer));
}

function setupScene(
  root: Root,
  textureCache: Readonly<TextureCache>,
  data: ShapeObj[],
): void {
  const shapeLayer = new ShapeRenderLayer(textureCache, data);

  root.camera.jumpTo(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  root.setShapeLayer(shapeLayer);
}

export async function bootstrap(): Promise<void> {
  const root = await setupRoot();

  const data = generateData();
  const textures = makeTextures(root);

  setupScene(root, textures, data);
}
