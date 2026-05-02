export type PixelRatioCallbackFn = (devicePixelRatio: number) => void;
export type RemoveListenerFn = () => void;

type InternalListener = () => void;

interface InternalState {
  query: MediaQueryList;
  addEventListener(): void;
  removeEventListener(): void;
  updateQuery(): void;
}

export function watchPixelRatio(
  onChangeListener: PixelRatioCallbackFn,
): RemoveListenerFn {
  const matchPixelQuery = (pixelRatio: number): MediaQueryList => {
    return matchMedia(`(resolution: ${pixelRatio}dppx)`);
  };

  const listener: InternalListener = (): void => {
    state.updateQuery();
    onChangeListener(window.devicePixelRatio);
  };

  const state: InternalState = {
    query: matchPixelQuery(window.devicePixelRatio),
    addEventListener(): void {
      this.query.addEventListener("change", listener, {
        once: true,
      });
    },
    removeEventListener(): void {
      this.query.removeEventListener("change", listener);
    },
    updateQuery(): void {
      state.query = matchPixelQuery(window.devicePixelRatio);
      state.addEventListener();
    },
  };

  state.addEventListener();

  return () => {
    state.removeEventListener();
  };
}
