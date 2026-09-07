import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { Scene } from "@babylonjs/core/scene";
import { localAssetUrl } from "./AssetRegistry";

export type AssetWarning = (message: string, error?: unknown) => void;
export type ContainerLoad = (url: string) => Promise<AssetContainer>;

/** One source per URL, including in-flight and failed requests. Owned by one Scene. */
export class AssetLoader {
  readonly #pending = new Map<string, Promise<AssetContainer | undefined>>();
  readonly #sources = new Map<string, AssetContainer>();
  #disposed = false;
  constructor(
    private readonly loadContainer: ContainerLoad,
    private readonly warn: AssetWarning = console.warn,
  ) {}

  static forScene(scene: Scene): AssetLoader {
    return new AssetLoader(url => LoadAssetContainerAsync(localAssetUrl(url), scene));
  }

  load(url: string): Promise<AssetContainer | undefined> {
    if (this.#disposed) return Promise.resolve(undefined);
    const cached = this.#pending.get(url);
    if (cached) return cached;
    const request = Promise.resolve().then(() => this.loadContainer(url)).then(container => {
      if (this.#disposed) { container.dispose(); return undefined; }
      this.#sources.set(url, container);
      return container;
    }).catch((error: unknown) => {
      this.warn(`Stormhaven 模型加载失败，使用占位外观：${url}`, error);
      return undefined;
    });
    this.#pending.set(url, request);
    return request;
  }
  get(url: string): AssetContainer | undefined { return this.#sources.get(url); }
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const container of this.#sources.values()) container.dispose();
    this.#sources.clear();
    this.#pending.clear();
  }
}
