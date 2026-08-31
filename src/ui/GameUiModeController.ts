export type GameUiMode =
  | "gameplay"
  | "inventory_menu"
  | "crafting_menu"
  | "building_menu"
  | "build_placement";

type ModeListener = (mode: GameUiMode) => void;

/** 单一 UI/Input Mode 来源，避免菜单和放置状态形成 Boolean 组合。 */
export class GameUiModeController {
  readonly #listeners = new Set<ModeListener>();
  #mode: GameUiMode = "gameplay";

  constructor(private readonly canvas: HTMLCanvasElement) {}

  get mode(): GameUiMode {
    return this.#mode;
  }

  isMenuOpen(): boolean {
    return this.#mode.endsWith("_menu");
  }

  isWorldInteractionBlocked(): boolean {
    return this.#mode !== "gameplay";
  }

  openMenu(mode: Extract<GameUiMode, `${string}_menu`>): void {
    this.#setMode(mode);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  resumeGameplay(): void {
    this.#setMode("gameplay");
    void this.canvas.requestPointerLock();
  }

  /** Pointer Lock 被浏览器释放时返回 Gameplay，等待玩家再次点击画布。 */
  returnToGameplayUnlocked(): void {
    this.#setMode("gameplay");
  }

  enterBuildPlacement(): void {
    this.#setMode("build_placement");
    void this.canvas.requestPointerLock();
  }

  subscribe(listener: ModeListener): () => void {
    this.#listeners.add(listener);
    listener(this.#mode);
    return () => this.#listeners.delete(listener);
  }

  #setMode(mode: GameUiMode): void {
    if (this.#mode === mode) return;
    this.#mode = mode;
    for (const listener of this.#listeners) listener(mode);
  }
}
