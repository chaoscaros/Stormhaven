import type { Scene } from "@babylonjs/core/scene";
import { AssetRegistry, type AssetStage } from "./AssetRegistry";
import { AssetLoader } from "./AssetLoader";
import { AssetInstanceFactory } from "./AssetInstanceFactory";

export async function createAssetRuntime(scene: Scene, onStage: (stage: string) => void, loadEnvironment: () => Promise<void> = async () => {}): Promise<AssetInstanceFactory> {
  const registry = new AssetRegistry();
  const loader = AssetLoader.forScene(scene);
  const factory = new AssetInstanceFactory(scene, registry, loader);
  scene.onDisposeObservable.addOnce(() => factory.dispose());
  const stages: readonly [AssetStage, string][] = [["environment", "加载环境资源"], ["items", "加载物品模型"], ["buildings", "加载建筑模型"]];
  for (const [stage, label] of stages) {
    onStage(label);
    await Promise.all([
      ...registry.getAll().filter(entry => entry.stage === stage).flatMap(entry => entry.urls.map(url => loader.load(url))),
      ...(stage === "environment" ? [loadEnvironment()] : []),
    ]);
  }
  return factory;
}
