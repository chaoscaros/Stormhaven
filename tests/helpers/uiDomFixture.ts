import { vi } from "vitest";

/** Narrow DOM contract double for renderer/event tests, NOT browser/layout QA. */
export class UiElement extends EventTarget {
  readonly children: UiElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly style: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  className = "";
  parentElement: UiElement | null = null;
  textContent = "";
  innerHTML = "";
  hidden = false;
  disabled = false;
  draggable = false;
  src = "";
  alt = "";
  width = 0;
  height = 0;
  readonly classList = {
    add: (...names: string[]) => { this.className = [...new Set([...this.className.split(" "), ...names])].join(" ").trim(); },
    remove: (...names: string[]) => { this.className = this.className.split(" ").filter((name) => !names.includes(name)).join(" "); },
  };

  constructor(readonly tagName = "div") { super(); }
  get dom(): HTMLElement { return this as unknown as HTMLElement; }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  removeAttribute(name: string): void { this.attributes.delete(name); }
  append(...nodes: (UiElement | string)[]): void {
    for (const node of nodes) {
      if (typeof node === "string") { this.textContent += node; continue; }
      if (node.tagName === "fragment") { this.append(...node.children); continue; }
      node.parentElement = this;
      this.children.push(node);
    }
  }
  replaceChildren(...nodes: UiElement[]): void {
    for (const child of this.children) child.parentElement = null;
    this.children.length = 0;
    this.textContent = "";
    this.append(...nodes);
  }
  querySelectorAll(selector: string): UiElement[] {
    const matches = (node: UiElement): boolean => selector.startsWith(".")
      ? node.className.split(" ").includes(selector.slice(1))
      : selector === "[data-game-icon]" ? !!node.dataset.gameIcon : node.tagName === selector;
    return this.children.flatMap((child) => [
      ...(matches(child) ? [child] : []), ...child.querySelectorAll(selector),
    ]);
  }
  querySelector(selector: string): UiElement | null { return this.querySelectorAll(selector)[0] ?? null; }
  getBoundingClientRect(): { top: number; left: number; right: number } { return { top: 100, left: 100, right: 180 }; }
  requestPointerLock(): void { /* User-gesture/browser acceptance remains manual. */ }
}

export function installUiDom() {
  const elements = new Map<string, UiElement>();
  const get = (id: string): UiElement => {
    if (!elements.has(id)) elements.set(id, new UiElement());
    return elements.get(id)!;
  };
  const windowEvents = new EventTarget();
  Object.assign(windowEvents, { innerWidth: 1920, innerHeight: 1080 });
  const documentEvents = new EventTarget();
  Object.assign(documentEvents, {
    createElement: (tag: string) => new UiElement(tag),
    createDocumentFragment: () => new UiElement("fragment"),
    getElementById: get,
    pointerLockElement: null,
    exitPointerLock: () => undefined,
  });
  vi.stubGlobal("HTMLElement", UiElement);
  vi.stubGlobal("document", documentEvents);
  vi.stubGlobal("window", windowEvents);
  const canvas = new UiElement("canvas");
  return { get, canvas, windowEvents, canvasDom: canvas as unknown as HTMLCanvasElement };
}

export function emit(target: EventTarget, type: string, properties: object = {}): Event {
  const event = Object.assign(new Event(type, { cancelable: true }), properties);
  target.dispatchEvent(event);
  return event;
}
