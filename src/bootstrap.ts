import { ShapeData } from "./types/ShapeData";
import { generateWorldData } from "./world/generateWorldData";
import { WorldScene } from "./world/WorldScene";

import { WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import { GameApp } from "./GameApp";
import { createShapeTextures, ShapeTextureCache } from "./textures";

async function setupGameApp(): Promise<GameApp> {
  const pixiContainer = document.getElementById("pixi-container");

  if (!pixiContainer) {
    throw new Error("Could not find pixi-container DOM element!");
  }

  const gameApp = new GameApp();

  await gameApp.init(pixiContainer);

  return gameApp;
}

function generateData(): ShapeData[] {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get("seed") || "seed";

  return generateWorldData(seed);
}

function makeTextures(gameApp: GameApp): ShapeTextureCache {
  const app = gameApp.app;

  return createShapeTextures(app.renderer.generateTexture.bind(app.renderer));
}

function setupScene(
  scene: WorldScene,
  textureCache: ShapeTextureCache,
  data: ShapeData[],
): void {
  scene.camera.jumpToCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  scene.setShapes(textureCache, data);
}

export async function bootstrap(): Promise<void> {
  const gameApp = await setupGameApp();

  const data = generateData();
  const textures = makeTextures(gameApp);

  setupScene(gameApp.scene, textures, data);
}
