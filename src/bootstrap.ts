import { Application } from "pixi.js";

async function createApp(): Promise<Application> {
  const app = new Application();
  const pixiContainer = document.getElementById("pixi-container")!;

  await app.init({
    resizeTo: pixiContainer,
    backgroundColor: 0x000000,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio,
  });

  pixiContainer.appendChild(app.canvas);

  return app;
}

export async function bootstrap(): Promise<void> {
  const app = await createApp();

  void app;
}
