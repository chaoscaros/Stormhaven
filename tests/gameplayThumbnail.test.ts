import { afterEach, describe, expect, it, vi } from "vitest";
import items from "../data/items/items.json";
import builds from "../data/building/buildings.json";
import sources from "../public/assets/thumbnails/sources.json";
import { getGameplayThumbnailForItem, getGameplayThumbnailForBuild, getDisplayVisualForHotbarEntry, ITEM_THUMBNAIL_IDS, BUILD_THUMBNAIL_IDS } from "../src/ui/thumbnails/thumbnailRegistry";
import { renderGameplayThumbnail } from "../src/ui/thumbnails/GameplayThumbnail";
import { HotbarSelectionNotice } from "../src/ui/hotbar/HotbarSelectionNotice";
import { installUiDom, UiElement, emit } from "./helpers/uiDomFixture";
import { readAsset } from "./helpers/assetFiles.mjs";
import { createSaveFixture, InMemorySaveRepository, populateSaveFixture } from "./helpers/saveFixture";
import { SaveService } from "../src/save/SaveService";
import { SaveSnapshotBuilder } from "../src/save/SaveSnapshotBuilder";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Gameplay thumbnail registry and local art", () => {
  it("covers every real Item/Build once, with distinct local assets and retained semantic fallback", () => {
    expect([...ITEM_THUMBNAIL_IDS].sort()).toEqual(items.map((item) => item.id).sort());
    expect([...BUILD_THUMBNAIL_IDS].sort()).toEqual(builds.map((build) => build.id).sort());
    const visuals = [...items.map((item) => getGameplayThumbnailForItem(item.id)), ...builds.map((build) => getGameplayThumbnailForBuild(build.id))];
    expect(new Set(visuals.map((visual) => visual.id)).size).toBe(12);
    expect(new Set(visuals.map((visual) => visual.url)).size).toBe(12);
    for (const visual of visuals) {
      expect(visual.url).toBe(`/assets/thumbnails/${visual.id}.webp`);
      expect(visual.fallbackIcon).toBe(visual.id);
    }
  });

  it("ships 256px alpha WebPs under per-file and total budget", () => {
    let total = 0;
    for (const entry of sources) {
      const data = readAsset(`public/assets/thumbnails/${entry.id}.webp`);
      expect(new TextDecoder().decode(data.slice(0,4))).toBe("RIFF");
      expect(new TextDecoder().decode(data.slice(8,16))).toBe("WEBPVP8X");
      expect(data[20]! & 0x10).toBe(0x10); // Extended WebP alpha flag.
      const uint24 = (offset: number) => data[offset]! + data[offset+1]!*256 + data[offset+2]!*65536;
      expect([uint24(24)+1,uint24(27)+1]).toEqual([256,256]);
      expect(data.byteLength).toBe(entry.bytes);
      expect(data.byteLength).toBeLessThan(50_000);
      total += data.byteLength;
    }
    expect(total).toBeLessThan(1_000_000);
  });

  it("unknown, cross-category and empty IDs safely resolve without inventing paths", () => {
    for (const id of [undefined, "future", "__proto__", "../../secret", "inventory"]) {
      expect(getGameplayThumbnailForItem(id)).toEqual({ id: "unknown", fallbackIcon: "info" });
    }
    expect(getGameplayThumbnailForBuild("wood").url).toBeUndefined();
    expect(getDisplayVisualForHotbarEntry({ type: "empty" })).toEqual({ id: "empty", fallbackIcon: "empty" });
    expect(getDisplayVisualForHotbarEntry({ type: "item", id: "wood" }).url).toContain("wood.webp");
    expect(getDisplayVisualForHotbarEntry({ type: "build", id: "campfire_basic" }).url).toContain("campfire_basic.webp");
  });
});

describe("Static img DOM and failure lifecycle", () => {
  it("uses non-draggable natural-color image; repeated renders keep the same node", () => {
    installUiDom();
    const element = new UiElement();
    const visual = getGameplayThumbnailForItem("wood");
    renderGameplayThumbnail(element.dom, visual);
    const image = element.children[0]!;
    expect(image.tagName).toBe("img");
    expect(image.src).toBe(visual.url);
    expect(image.draggable).toBe(false);
    renderGameplayThumbnail(element.dom, visual);
    expect(element.children[0]).toBe(image);
  });

  it("a real error event swaps image to local SVG once, with no retry on refresh", () => {
    installUiDom();
    const element = new UiElement();
    const visual = getGameplayThumbnailForItem("wood");
    renderGameplayThumbnail(element.dom, visual);
    const image = element.children[0]!;
    emit(image,"error");
    const fallback = element.children[0]!;
    expect(fallback.innerHTML).toContain("<svg");
    expect(element.dataset.thumbnailFallback).toBe("true");
    emit(image,"error");
    renderGameplayThumbnail(element.dom, visual);
    expect(element.children[0]).toBe(fallback);
    expect(element.querySelector("img")).toBeNull();
  });

  it("late failures cannot replace new art, and broken fallback still leaves a safe marker", () => {
    installUiDom();
    const element = new UiElement();
    renderGameplayThumbnail(element.dom,getGameplayThumbnailForItem("wood"));
    const stale = element.children[0]!;
    renderGameplayThumbnail(element.dom,getGameplayThumbnailForItem("stone"));
    const current = element.children[0]!;
    emit(stale,"error");
    expect(element.children[0]).toBe(current);
    vi.spyOn(UiElement.prototype,"setAttribute").mockImplementation(() => { throw new Error("SVG unavailable"); });
    // Only fail the fallback renderer's call, not the outer host aria setup.
    emit(current,"error");
    expect(element.children[0]!.textContent).toBe("?");
  });

  it("unknown ID renders a local info fallback without any network image", () => {
    installUiDom();
    const element = new UiElement();
    renderGameplayThumbnail(element.dom,getGameplayThumbnailForItem("unknown"));
    expect(element.querySelector("img")).toBeNull();
    expect(element.children[0]!.dataset.gameIcon).toBe("info");
  });
});

describe("Selection name timing", () => {
  it("fast switches replace the timeout; menu clear and dispose cancel it", () => {
    vi.useFakeTimers();
    const publish = vi.fn();
    const notice = new HotbarSelectionNotice(publish);
    notice.show("木材");
    vi.advanceTimersByTime(1000);
    notice.show("石头");
    vi.advanceTimersByTime(300);
    expect(publish).toHaveBeenLastCalledWith("石头");
    vi.advanceTimersByTime(950);
    expect(publish).toHaveBeenLastCalledWith(undefined);
    notice.show("木墙");
    notice.clear();
    expect(vi.getTimerCount()).toBe(0);
    notice.dispose();
    publish.mockClear();
    notice.show("已释放");
    vi.runAllTimers();
    expect(publish).not.toHaveBeenCalled();
  });
});

it("rendering all known art and failed images cannot alter Save v1 round trip", async () => {
  installUiDom();
  const source = createSaveFixture();
  populateSaveFixture(source);
  const before = new SaveSnapshotBuilder(source.runtime).capture(1000);
  for (const id of ITEM_THUMBNAIL_IDS) {
    const host = new UiElement();
    renderGameplayThumbnail(host.dom,getGameplayThumbnailForItem(id));
    emit(host.children[0]!,"error");
  }
  expect(new SaveSnapshotBuilder(source.runtime).capture(1000)).toEqual(before);
  const repository = new InMemorySaveRepository();
  const access = { canSave: () => true, canLoad: () => true };
  await new SaveService(repository,source.runtime,access,() => 1000).save();
  const target = createSaveFixture();
  expect(await new SaveService(repository,target.runtime,access).load()).toMatchObject({ reason: "ok" });
  expect(new SaveSnapshotBuilder(target.runtime).capture(1000)).toEqual(before);
  expect(JSON.stringify(before)).not.toMatch(/webp|thumbnail|phosphor|\.glb/);
});
