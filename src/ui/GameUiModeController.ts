export type GameUiMode =
  | "boot"
  | "main_menu"
  | "gameplay"
  | "player_menu"
  | "interaction_menu"
  | "build_placement"
  | "paused";

export type PlayerMenuTab = "inventory" | "crafting" | "building";
export type InteractionMenuType = "campfire";

export interface GameUiState {
  readonly mode: GameUiMode;
  readonly playerMenuTab?: PlayerMenuTab;
  readonly interactionMenu?: {
    readonly type: InteractionMenuType;
    readonly targetId: string;
  };
}

export type GameUiStateListener = (state: GameUiState) => void;

/** DOM 无关的唯一 Game Shell 状态源，负责顶层模式与 Player Menu 子路由。 */
export class GameUiStateMachine {
  readonly #listeners = new Set<GameUiStateListener>();
  #state: GameUiState = freezeState({ mode: "boot" });

  get state(): GameUiState {
    return this.#state;
  }

  showMainMenu(): void {
    if (this.#state.mode === "boot") this.#setState({ mode: "main_menu" });
  }

  startGame(): void {
    if (this.#state.mode === "main_menu") this.#setState({ mode: "gameplay" });
  }

  openPlayerMenu(tab: PlayerMenuTab): void {
    if (this.#state.mode !== "gameplay" && this.#state.mode !== "player_menu") return;
    this.#setState({ mode: "player_menu", playerMenuTab: tab });
  }

  toggleInventoryMenu(): void {
    if (this.#state.mode === "player_menu") {
      this.#setState({ mode: "gameplay" });
      return;
    }
    this.openPlayerMenu("inventory");
  }

  openInteractionMenu(type: InteractionMenuType, targetId: string): void {
    if (this.#state.mode !== "gameplay") return;
    this.#setState({
      mode: "interaction_menu",
      interactionMenu: Object.freeze({ type, targetId }),
    });
  }

  enterBuildPlacement(): void {
    if (
      this.#state.mode === "gameplay"
      || this.#state.mode === "build_placement"
      || (this.#state.mode === "player_menu" && this.#state.playerMenuTab === "building")
    ) {
      this.#setState({ mode: "build_placement" });
    }
  }

  closeToGameplay(): void {
    if (["player_menu", "interaction_menu", "build_placement", "paused"].includes(this.#state.mode)) {
      this.#setState({ mode: "gameplay" });
    }
  }

  pause(): void {
    if (this.#state.mode === "gameplay") this.#setState({ mode: "paused" });
  }

  handleEscape(): void {
    switch (this.#state.mode) {
      case "player_menu":
      case "interaction_menu":
      case "build_placement":
        this.#setState({ mode: "gameplay" });
        break;
      case "gameplay":
        this.#setState({ mode: "paused" });
        break;
      case "paused":
        this.#setState({ mode: "gameplay" });
        break;
      default:
        break;
    }
  }

  subscribe(listener: GameUiStateListener): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  #setState(state: GameUiState): void {
    const next = freezeState(state);
    if (sameState(this.#state, next)) return;
    this.#state = next;
    for (const listener of this.#listeners) listener(next);
  }
}

/** 将纯 Shell State 与浏览器 Pointer Lock 契约连接。 */
export class GameUiModeController {
  readonly #machine = new GameUiStateMachine();

  constructor(private readonly canvas: HTMLCanvasElement) {}

  get state(): GameUiState {
    return this.#machine.state;
  }

  get mode(): GameUiMode {
    return this.state.mode;
  }

  get playerMenuTab(): PlayerMenuTab | undefined {
    return this.state.playerMenuTab;
  }

  isMenuOpen(): boolean {
    return this.mode === "player_menu" || this.mode === "interaction_menu" || this.mode === "paused";
  }

  isWorldInteractionBlocked(): boolean {
    return this.mode !== "gameplay";
  }

  showMainMenu(): void {
    this.#machine.showMainMenu();
  }

  startGame(): void {
    this.#machine.startGame();
    if (this.mode === "gameplay") this.#requestPointerLock();
  }

  openPlayerMenu(tab: PlayerMenuTab): void {
    this.#machine.openPlayerMenu(tab);
    if (this.mode === "player_menu") this.#releasePointerLock();
  }

  toggleInventoryMenu(): void {
    this.#machine.toggleInventoryMenu();
    this.#syncPointerLock();
  }

  openInteractionMenu(type: InteractionMenuType, targetId: string): void {
    this.#machine.openInteractionMenu(type, targetId);
    if (this.mode === "interaction_menu") this.#releasePointerLock();
  }

  resumeGameplay(): void {
    this.#machine.closeToGameplay();
    if (this.mode === "gameplay") this.#requestPointerLock();
  }

  pauseFromPointerUnlock(): void {
    this.#machine.pause();
  }

  handleEscape(): void {
    this.#machine.handleEscape();
    this.#syncPointerLock();
  }

  enterBuildPlacement(): void {
    this.#machine.enterBuildPlacement();
    if (this.mode === "build_placement") this.#requestPointerLock();
  }

  returnToGameplayUnlocked(): void {
    this.#machine.closeToGameplay();
  }

  subscribe(listener: GameUiStateListener): () => void {
    return this.#machine.subscribe(listener);
  }

  #syncPointerLock(): void {
    if (this.mode === "gameplay" || this.mode === "build_placement") this.#requestPointerLock();
    else this.#releasePointerLock();
  }

  #requestPointerLock(): void {
    if (document.pointerLockElement !== this.canvas) void this.canvas.requestPointerLock();
  }

  #releasePointerLock(): void {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }
}

function freezeState(state: GameUiState): GameUiState {
  return Object.freeze({
    ...state,
    ...(state.interactionMenu
      ? { interactionMenu: Object.freeze({ ...state.interactionMenu }) }
      : {}),
  });
}

function sameState(first: GameUiState, second: GameUiState): boolean {
  return first.mode === second.mode
    && first.playerMenuTab === second.playerMenuTab
    && first.interactionMenu?.type === second.interactionMenu?.type
    && first.interactionMenu?.targetId === second.interactionMenu?.targetId;
}
