import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { InstantiatedEntries } from "@babylonjs/core/assetContainer";
import type { Scene } from "@babylonjs/core/scene";
import { AssetRegistry, assetVariantIndex } from "./AssetRegistry";
import { AssetLoader, type AssetWarning } from "./AssetLoader";

export interface AssetInstance {
  readonly root: TransformNode;
  dispose(): void;
}

/** Clones share immutable source geometry/materials; gameplay uses separate proxies. */
export class AssetInstanceFactory {
  readonly #instances = new Set<AssetInstance>();
  readonly #warned = new Set<string>();
  #disposed = false;
  constructor(
    private readonly scene: Scene,
    readonly registry: AssetRegistry,
    readonly loader: AssetLoader,
    private readonly warn: AssetWarning = console.warn,
  ) {}

  create(id: string, instanceId: string, position: Readonly<{ x: number; y: number; z: number }>, rotationDegrees = 0): AssetInstance | undefined {
    if (this.#disposed) return undefined;
    const definition = this.registry.get(id);
    const url = definition?.urls[assetVariantIndex(instanceId, definition.urls.length)];
    const source = url ? this.loader.get(url) : undefined;
    if (!definition || !source) { this.#fallbackWarning(id); return undefined; }
    let entries: InstantiatedEntries | undefined;
    const root = new TransformNode(`asset:${instanceId}`, this.scene);
    try {
      entries = source.instantiateModelsToScene(name => `${instanceId}:${name}`, false, { doNotInstantiate: true });
      for (const node of entries.rootNodes) node.parent = root;
      root.position.set(position.x + definition.positionOffset.x, position.y + definition.positionOffset.y, position.z + definition.positionOffset.z);
      root.rotation.y = (rotationDegrees + definition.rotationOffset) * Math.PI / 180;
      root.scaling.setAll(definition.scale);
      for (const mesh of root.getChildMeshes()) {
        mesh.isPickable = false;
        mesh.checkCollisions = false;
        mesh.receiveShadows = true;
      }
      let disposed = false;
      const ownedEntries = entries;
      const instance: AssetInstance = { root, dispose: () => {
        if (disposed) return;
        disposed = true;
        this.#instances.delete(instance);
        ownedEntries.dispose(); // No material/texture disposal: siblings still share them.
        root.dispose(false, false);
      } };
      this.#instances.add(instance);
      return instance;
    } catch (error: unknown) {
      entries?.dispose();
      root.dispose(false, false);
      this.#fallbackWarning(id, error);
      return undefined;
    }
  }

  dispose(): void {
    this.#disposed = true;
    for (const instance of [...this.#instances]) instance.dispose();
    this.loader.dispose();
  }

  #fallbackWarning(id: string, error?: unknown): void {
    if (this.#warned.has(id)) return;
    this.#warned.add(id);
    this.warn(`Stormhaven 使用原始占位外观：${id}`, error);
  }
}
