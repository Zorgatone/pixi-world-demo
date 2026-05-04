# Pixi World Demo

## Set-up instructions

You can see a full working demo hosted with Github Pages here: [https://zorgatone.github.io/pixi-world-demo](https://zorgatone.github.io/pixi-world-demo)

Alternatively follow the steps below to configure a development environment and being able to run it locally and test it.

1. Download and extract the source code as a [ZIP here](https://github.com/Zorgatone/pixi-world-demo/archive/refs/heads/main.zip), or clone with [Git](https://git-scm.com) using a visual [Git client](https://github.com/apps/desktop) or with one of the commands below:

   ```shell
   git clone https://github.com/Zorgatone/pixi-world-demo.git

   # or alternatively using SSH (if you have it configured)

   git clone git@github.com:Zorgatone/pixi-world-demo.git
   ```

2. Open a terminal (if you haven't already), then navigate to the project folder:

   ```shell
   cd pixi-world-demo
   ```

3. Install the required [NPM](https://www.npmjs.com) dependencies

   ```shell
   npm install
   ```

4. Start the development server (with [Vite](https://vite.dev)) to serve a debug version of the game to test it:

   ```shell
   npm run dev
   ```

Optionally you can check for linting and typescript errors using `npm run lint` and `npm run type-check` or run the unit tests with `npm run test`.

Other useful npm script you can run is `npm run prettify` to format files after some changes.

You can run a production build using `npm run build`, the assets will be in the `dist` folder (which is listed in `.gitignore` and won't be committed).

New changes pushed to the `main` branch will trigger a Github Actions pipeline (defined in the `.github/workflows/pages.yaml` file) that runs the build pipeline and deploys the game demo using Github Pages.

This project uses [Volta](https://volta.sh) as a [Node](https://nodejs.org/) version manager, and it's set to use the LTS version available at the time of writing (ie. Node 22).

## Random shapes generation

Random shapes with random sizes and colors are generated from a repeatable seed, the seed can be changed in the query-string. For example:

1. [http://http://localhost:8080/?seed=banana](http://http://localhost:8080/?seed=banana) for localhost
2. [https://zorgatone.github.io/pixi-world-demo/?seed=banana](https://zorgatone.github.io/pixi-world-demo/?seed=banana) for the version deployed on GitHub Pages

## VS Code tips

If you're using [Visual Studio Code](https://code.visualstudio.com) as an editor, please add the following to your workspace settings JSON to have VS Code intellisense use the same version of TypeScript as Vite:

```json
{
  "js/ts.tsdk.path": "node_modules/typescript/lib"
}
```

Workspace VS Code Extensions recommendations:

1. [EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
2. [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
3. [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
