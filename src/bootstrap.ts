import { FPSCounter } from "./FPSCounter";
import { generateTextures, TextureName } from "./textures";
import { World } from "./World";
import { Shape } from "./Shape";
import { Container } from "pixi.js";
import { watchPixelRatio } from "./utils/watchPixelRatio";

const MAX_SCALE = 4;
const MAX_WIDTH = 200 * MAX_SCALE;
const MAX_HEIGHT = MAX_WIDTH;

async function createWorld(): Promise<World> {
  const pixiContainer = document.getElementById("pixi-container");

  if (!pixiContainer) {
    throw new Error("Could not find pixi-container DOM element!");
  }

  const world = new World();

  await world.init(pixiContainer);

  const fpsCounter = new FPSCounter();

  const app = world.app;

  app.stage.addChild(fpsCounter.view);

  fpsCounter.start(app.ticker);

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

  const deviceScaleContainer = new Container();

  deviceScaleContainer.addChild(circle.view);
  deviceScaleContainer.addChild(square.view);

  deviceScaleContainer.scale.set(1 / window.devicePixelRatio);

  app.stage.addChild(deviceScaleContainer);

  watchPixelRatio((ratio) => {
    deviceScaleContainer.scale.set(1 / ratio);
  });

  return world;
}

// function showLoading(
//   container: Container,
//   width: number,
//   height: number,
// ): void {
//   const label = new Text({
//     style: new TextStyle({
//       fill: 0xffffff,
//       fontSize: 32,
//     }),
//   });
//   label.text = "Loading...";
//   label.anchor.set(0.5);
//   label.position.set(width / 2, height / 2);

//   container.addChild(label);
// }

export async function bootstrap(): Promise<void> {
  // const maxScale = 4;

  const app = await createWorld();

  // showLoading(
  //   app.stage,
  //   app.canvas.width / window.devicePixelRatio,
  //   app.canvas.height / window.devicePixelRatio,
  // );

  // const textures = generateTextures(
  //   app.renderer.generateTexture.bind(app.renderer),
  //   maxScale,
  // );

  // app.stage.removeChildren();

  // const circle = new Sprite(textures[TextureName.CIRCLE]);
  // circle.tint = 0xda2299;
  // circle.scale.set(1 / resolution);
  // circle.position.set(40, 40);

  // const square = new Sprite(textures[TextureName.SQUARE]);
  // square.tint = 0x9922da;
  // square.scale.set(1 / resolution);
  // square.position.set(280, 280);
  // square.rotation = Math.PI / 4;

  // app.stage.addChild(circle);
  // app.stage.addChild(square);

  void app;
}
