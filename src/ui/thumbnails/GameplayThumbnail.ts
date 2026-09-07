import { renderGameIcon } from "../icons/iconRegistry";
import type { GameplayThumbnail } from "./thumbnailRegistry";

export type ThumbnailSize = "small" | "slot" | "card" | "detail";
const rendered = new WeakMap<HTMLElement, string>();

/** Static img only. Replace once per visual, never on hover/quantity updates.
 * onerror is attached before src: cached failures are covered. Detached images
 * cannot mutate their replacement; handlers belong only to the removed image.
 */
export function renderGameplayThumbnail(
  element: HTMLElement,
  visual: GameplayThumbnail,
  size: ThumbnailSize = "slot",
): void {
  const key = `${visual.id}:${visual.url ?? ""}:${size}`;
  if (rendered.get(element) === key) return;
  rendered.set(element, key);
  element.classList.remove("game-icon", "ui-icon");
  element.classList.add("gameplay-thumbnail");
  element.dataset.thumbnail = visual.id;
  element.dataset.thumbnailSize = size;
  delete element.dataset.gameIcon;
  element.setAttribute("aria-hidden", "true");
  const fallback = (): void => {
    const icon = document.createElement("span");
    try {
      renderGameIcon(icon, visual.fallbackIcon, { size: 32, weight: "regular" });
    } catch {
      icon.textContent = "?";
    }
    element.dataset.thumbnailFallback = "true";
    element.replaceChildren(icon);
  };
  delete element.dataset.thumbnailFallback;
  if (!visual.url) {
    fallback();
    return;
  }
  const image = document.createElement("img");
  image.alt = ""; // Name/quantity belong to the parent accessible control.
  image.draggable = false;
  image.width = 256;
  image.height = 256;
  image.decoding = "async";
  image.addEventListener("error", () => {
    if (image.parentElement === element) fallback();
  }, { once: true });
  element.replaceChildren(image);
  image.src = visual.url;
}

export function createGameplayThumbnail(
  visual: GameplayThumbnail,
  size: ThumbnailSize = "small",
): HTMLElement {
  const element = document.createElement("span");
  renderGameplayThumbnail(element, visual, size);
  return element;
}
