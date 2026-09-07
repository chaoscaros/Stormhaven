/** UI-only transient label. No timer/state is part of Hotbar or Save data. */
export class HotbarSelectionNotice {
  #timer: ReturnType<typeof setTimeout> | undefined;
  #disposed = false;

  constructor(private readonly publish: (name: string | undefined) => void) {}

  show(name: string): void {
    if (this.#disposed) return;
    this.clear();
    this.publish(name);
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      this.publish(undefined);
    }, 1_250);
  }

  clear(): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    this.publish(undefined);
  }

  dispose(): void {
    this.clear();
    this.#disposed = true;
  }
}
