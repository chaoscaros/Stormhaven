import { describe, expect, it } from "vitest";
import { GameUiStateMachine } from "../src/ui/GameUiModeController";

describe("GameUiStateMachine", () => {
  it("boot → main_menu → gameplay", () => {
    const shell = new GameUiStateMachine();
    expect(shell.state.mode).toBe("boot");
    shell.showMainMenu();
    expect(shell.state.mode).toBe("main_menu");
    shell.startGame();
    expect(shell.state.mode).toBe("gameplay");
  });

  it("Gameplay 快捷入口打开统一 Player Menu 的对应 Tab", () => {
    const shell = runningShell();
    shell.openPlayerMenu("inventory");
    expect(shell.state).toMatchObject({ mode: "player_menu", playerMenuTab: "inventory" });
    shell.openPlayerMenu("crafting");
    expect(shell.state.playerMenuTab).toBe("crafting");
    shell.openPlayerMenu("building");
    expect(shell.state.playerMenuTab).toBe("building");
  });

  it("Tab 在任意 Player Menu Tab 中关闭整个菜单", () => {
    const shell = runningShell();
    shell.openPlayerMenu("crafting");
    shell.toggleInventoryMenu();
    expect(shell.state.mode).toBe("gameplay");
  });

  it("Player Menu、Interaction Menu 与 Pause 不会叠加", () => {
    const shell = runningShell();
    shell.openInteractionMenu("campfire", "campfire_1");
    shell.openPlayerMenu("inventory");
    expect(shell.state).toMatchObject({
      mode: "interaction_menu",
      interactionMenu: { type: "campfire", targetId: "campfire_1" },
    });
    shell.handleEscape();
    shell.handleEscape();
    expect(shell.state.mode).toBe("paused");
    shell.openPlayerMenu("building");
    expect(shell.state.mode).toBe("paused");
    shell.openInteractionMenu("campfire", "campfire_2");
    expect(shell.state.mode).toBe("paused");
  });

  it("Esc 按优先级关闭 Player/Interaction，Gameplay 切换 Pause", () => {
    const playerMenu = runningShell();
    playerMenu.openPlayerMenu("inventory");
    playerMenu.handleEscape();
    expect(playerMenu.state.mode).toBe("gameplay");

    const interaction = runningShell();
    interaction.openInteractionMenu("campfire", "campfire_1");
    interaction.handleEscape();
    expect(interaction.state.mode).toBe("gameplay");

    interaction.handleEscape();
    expect(interaction.state.mode).toBe("paused");
    interaction.handleEscape();
    expect(interaction.state.mode).toBe("gameplay");
  });

  it("BuildPlacement Esc 只退出放置而不会进入 Pause", () => {
    const shell = runningShell();
    shell.openPlayerMenu("building");
    shell.enterBuildPlacement();
    expect(shell.state.mode).toBe("build_placement");
    shell.handleEscape();
    expect(shell.state.mode).toBe("gameplay");
  });
});

function runningShell(): GameUiStateMachine {
  const shell = new GameUiStateMachine();
  shell.showMainMenu();
  shell.startGame();
  return shell;
}
