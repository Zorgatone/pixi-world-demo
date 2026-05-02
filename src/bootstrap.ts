import { Root } from "./Root";
import { Shape } from "./Shape";
import { generateTextures, TextureName } from "./textures";

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

function setupScene(root: Root): void {
  const app = root.app;

  const textures = generateTextures(
    app.renderer.generateTexture.bind(app.renderer),
    MAX_WIDTH,
    MAX_HEIGHT,
  );

  const radius = 100;
  const diameter = radius * 2;
  const squareSide = radius * Math.sqrt(Math.PI);

  const circle = new Shape();
  circle.init(TextureName.CIRCLE, textures, diameter, diameter, 0xda2299);
  circle.view.position.set(140, 140);
  circle.view.rotation = Math.PI / 4;

  const square = new Shape();
  square.init(TextureName.SQUARE, textures, squareSide, squareSide, 0x9922da);
  square.view.position.set(340, 340);
  square.view.rotation = Math.PI / 4;

  root.worldContainer.addChild(circle.view);
  root.worldContainer.addChild(square.view);
}

export async function bootstrap(): Promise<void> {
  const root = await setupRoot();

  setupScene(root);
}
