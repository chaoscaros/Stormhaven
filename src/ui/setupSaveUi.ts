import type { SaveService, SaveResult } from "../save/SaveService";
import type { FoundationUi } from "./setupFoundationUi";

/** Explicit actions only: startup probes existence, never auto-loads or auto-saves. */
export function setupSaveUi(service: SaveService, ui: FoundationUi, refreshMenus: () => void) {
  const save = button("save-button");
  const resume = button("resume-button");
  const enter = button("enter-button");
  const continueButton = button("continue-button");
  const feedback = element("save-feedback");
  const status = element("save-slot-status");
  const warning = element("new-game-warning");
  let disposed = false;
  let busy = false;
  let hasSave = false;

  const setBusy = (value: boolean): void => {
    busy = value;
    ui.modes.setOperationPending(value);
    save.disabled = value;
    resume.disabled = value;
    enter.disabled = value;
    continueButton.disabled = value || !hasSave;
  };
  const saveClick = async (): Promise<void> => {
    if (busy || ui.modes.mode !== "paused") return;
    setBusy(true);
    feedback.textContent = "正在保存……";
    try {
      const result = await service.save();
      if (disposed) return;
      feedback.textContent = result.reason === "ok" ? "游戏已保存" : `保存失败：${failureMessage(result)}`;
      if (result.reason === "ok") { hasSave = true; warning.hidden = false; }
    } catch { if (!disposed) feedback.textContent = "保存失败，请重试"; }
    finally { if (!disposed) setBusy(false); }
  };
  const loadClick = async (): Promise<void> => {
    if (busy || ui.modes.mode !== "main_menu") return;
    setBusy(true);
    ui.showLoading("读取存档");
    let recoveryRequired = false;
    try {
      const result = await service.load(async (stage) => {
        if (disposed) throw new Error("Save UI disposed");
        ui.setLoadingStage(stage);
        // Yield for actual UI painting, not a simulated loading percentage or timed delay.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      });
      if (disposed) return;
      if (result.reason === "ok") {
        refreshMenus();
        feedback.textContent = result.warnings.length ? "已恢复存档；失效的快捷栏绑定已清空" : "存档已恢复；如未锁定鼠标，请点击继续游戏";
        ui.hideLoading();
        setBusy(false);
        ui.modes.startGame();
      } else {
        recoveryRequired = result.recoveryRequired ?? false;
        status.textContent = recoveryRequired ? "世界恢复失败，请刷新页面后重试；原存档未改动" : failureMessage(result);
        if (result.reason === "not_found") hasSave = false;
      }
    } catch { if (!disposed) status.textContent = "读取存档失败，请重试"; }
    finally {
      if (!disposed) {
        ui.hideLoading();
        setBusy(recoveryRequired);
      }
    }
  };
  save.addEventListener("click", saveClick);
  continueButton.addEventListener("click", loadClick);

  return {
    async initialize(): Promise<void> {
      const result = await service.hasSave();
      if (disposed) return;
      hasSave = result.reason === "ok" && result.exists;
      continueButton.disabled = !hasSave;
      warning.hidden = !hasSave;
      status.textContent = result.reason !== "ok"
        ? "无法访问本地存档；请检查浏览器权限或关闭其他游戏标签页。仍可开始新游戏。"
        : hasSave ? "发现本地存档，可继续上次进度" : "暂无存档 · 游戏中按 Esc 手动保存";
    },
    dispose(): void {
      disposed = true;
      save.removeEventListener("click", saveClick);
      continueButton.removeEventListener("click", loadClick);
    },
  };
}

function failureMessage(result: SaveResult): string {
  switch (result.reason) {
    case "not_found": return "没有找到存档，请开始新游戏";
    case "validation_failed":
    case "unsupported_version":
    case "unsupported_future_version": return "存档损坏或版本不兼容";
    case "storage_error": return "无法访问本地存储，请检查权限、剩余空间或其他游戏标签页";
    case "restore_failed": return "世界恢复失败，已还原初始世界，可重试或开始新游戏";
    default: return "当前无法执行，请稍后重试";
  }
}
function element(id: string): HTMLElement {
  const value = document.getElementById(id);
  if (!(value instanceof HTMLElement)) throw new Error(`Missing #${id}`);
  return value;
}
function button(id: string): HTMLButtonElement {
  const value = element(id);
  if (!(value instanceof HTMLButtonElement)) throw new Error(`Invalid button #${id}`);
  return value;
}
