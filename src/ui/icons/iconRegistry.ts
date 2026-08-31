import axeBold from "@phosphor-icons/core/bold/axe-bold.svg?raw";
import axeDuotone from "@phosphor-icons/core/duotone/axe-duotone.svg?raw";
import axeFill from "@phosphor-icons/core/fill/axe-fill.svg?raw";
import axeRegular from "@phosphor-icons/core/regular/axe.svg?raw";
import backpackDuotone from "@phosphor-icons/core/duotone/backpack-duotone.svg?raw";
import backpackFill from "@phosphor-icons/core/fill/backpack-fill.svg?raw";
import boneBold from "@phosphor-icons/core/bold/bone-bold.svg?raw";
import boneDuotone from "@phosphor-icons/core/duotone/bone-duotone.svg?raw";
import boneFill from "@phosphor-icons/core/fill/bone-fill.svg?raw";
import boneRegular from "@phosphor-icons/core/regular/bone.svg?raw";
import buildingsDuotone from "@phosphor-icons/core/duotone/buildings-duotone.svg?raw";
import buildingsFill from "@phosphor-icons/core/fill/buildings-fill.svg?raw";
import campfireBold from "@phosphor-icons/core/bold/campfire-bold.svg?raw";
import campfireDuotone from "@phosphor-icons/core/duotone/campfire-duotone.svg?raw";
import campfireFill from "@phosphor-icons/core/fill/campfire-fill.svg?raw";
import cloudSnowBold from "@phosphor-icons/core/bold/cloud-snow-bold.svg?raw";
import cloudSnowRegular from "@phosphor-icons/core/regular/cloud-snow.svg?raw";
import flaskBold from "@phosphor-icons/core/bold/flask-bold.svg?raw";
import flaskDuotone from "@phosphor-icons/core/duotone/flask-duotone.svg?raw";
import flaskFill from "@phosphor-icons/core/fill/flask-fill.svg?raw";
import flaskRegular from "@phosphor-icons/core/regular/flask.svg?raw";
import gearSixBold from "@phosphor-icons/core/bold/gear-six-bold.svg?raw";
import gearSixDuotone from "@phosphor-icons/core/duotone/gear-six-duotone.svg?raw";
import gearSixFill from "@phosphor-icons/core/fill/gear-six-fill.svg?raw";
import gearSixRegular from "@phosphor-icons/core/regular/gear-six.svg?raw";
import gridNineBold from "@phosphor-icons/core/bold/grid-nine-bold.svg?raw";
import gridNineDuotone from "@phosphor-icons/core/duotone/grid-nine-duotone.svg?raw";
import gridNineFill from "@phosphor-icons/core/fill/grid-nine-fill.svg?raw";
import hammerDuotone from "@phosphor-icons/core/duotone/hammer-duotone.svg?raw";
import hammerFill from "@phosphor-icons/core/fill/hammer-fill.svg?raw";
import houseLineBold from "@phosphor-icons/core/bold/house-line-bold.svg?raw";
import houseLineRegular from "@phosphor-icons/core/regular/house-line.svg?raw";
import infoBold from "@phosphor-icons/core/bold/info-bold.svg?raw";
import infoRegular from "@phosphor-icons/core/regular/info.svg?raw";
import jarBold from "@phosphor-icons/core/bold/jar-bold.svg?raw";
import jarDuotone from "@phosphor-icons/core/duotone/jar-duotone.svg?raw";
import jarFill from "@phosphor-icons/core/fill/jar-fill.svg?raw";
import jarRegular from "@phosphor-icons/core/regular/jar.svg?raw";
import leafBold from "@phosphor-icons/core/bold/leaf-bold.svg?raw";
import leafDuotone from "@phosphor-icons/core/duotone/leaf-duotone.svg?raw";
import leafFill from "@phosphor-icons/core/fill/leaf-fill.svg?raw";
import leafRegular from "@phosphor-icons/core/regular/leaf.svg?raw";
import logBold from "@phosphor-icons/core/bold/log-bold.svg?raw";
import logDuotone from "@phosphor-icons/core/duotone/log-duotone.svg?raw";
import logFill from "@phosphor-icons/core/fill/log-fill.svg?raw";
import logRegular from "@phosphor-icons/core/regular/log.svg?raw";
import mountainsBold from "@phosphor-icons/core/bold/mountains-bold.svg?raw";
import mountainsDuotone from "@phosphor-icons/core/duotone/mountains-duotone.svg?raw";
import mountainsFill from "@phosphor-icons/core/fill/mountains-fill.svg?raw";
import mountainsRegular from "@phosphor-icons/core/regular/mountains.svg?raw";
import pauseBold from "@phosphor-icons/core/bold/pause-bold.svg?raw";
import pauseRegular from "@phosphor-icons/core/regular/pause.svg?raw";
import playBold from "@phosphor-icons/core/bold/play-bold.svg?raw";
import playRegular from "@phosphor-icons/core/regular/play.svg?raw";
import scalesBold from "@phosphor-icons/core/bold/scales-bold.svg?raw";
import scalesRegular from "@phosphor-icons/core/regular/scales.svg?raw";
import shirtBold from "@phosphor-icons/core/bold/t-shirt-bold.svg?raw";
import shirtDuotone from "@phosphor-icons/core/duotone/t-shirt-duotone.svg?raw";
import shirtFill from "@phosphor-icons/core/fill/t-shirt-fill.svg?raw";
import shirtRegular from "@phosphor-icons/core/regular/t-shirt.svg?raw";
import thermometerBold from "@phosphor-icons/core/bold/thermometer-bold.svg?raw";
import thermometerRegular from "@phosphor-icons/core/regular/thermometer.svg?raw";
import wallBold from "@phosphor-icons/core/bold/wall-bold.svg?raw";
import wallDuotone from "@phosphor-icons/core/duotone/wall-duotone.svg?raw";
import wallFill from "@phosphor-icons/core/fill/wall-fill.svg?raw";
import warningBold from "@phosphor-icons/core/bold/warning-bold.svg?raw";
import warningFill from "@phosphor-icons/core/fill/warning-fill.svg?raw";
import warningRegular from "@phosphor-icons/core/regular/warning.svg?raw";
import xBold from "@phosphor-icons/core/bold/x-bold.svg?raw";
import xRegular from "@phosphor-icons/core/regular/x.svg?raw";

import type { GameIconId, GameIconSize, GameIconWeight } from "./GameIcon";
import { isGameIconId } from "./GameIcon";

type IconSources = Readonly<Partial<Record<GameIconWeight, string>>>;

const iconRegistry = Object.freeze({
  empty: {},
  inventory: { duotone: backpackDuotone, fill: backpackFill },
  crafting: { duotone: hammerDuotone, fill: hammerFill },
  building: { duotone: buildingsDuotone, fill: buildingsFill },
  campfire: { bold: campfireBold, duotone: campfireDuotone, fill: campfireFill },
  wood: { regular: logRegular, bold: logBold, duotone: logDuotone, fill: logFill },
  stone: { regular: mountainsRegular, bold: mountainsBold, duotone: mountainsDuotone, fill: mountainsFill },
  stick: { regular: leafRegular, bold: leafBold, duotone: leafDuotone, fill: leafFill },
  cloth: { regular: shirtRegular, bold: shirtBold, duotone: shirtDuotone, fill: shirtFill },
  scrap_metal: { regular: gearSixRegular, bold: gearSixBold, duotone: gearSixDuotone, fill: gearSixFill },
  water_bottle: { regular: flaskRegular, bold: flaskBold, duotone: flaskDuotone, fill: flaskFill },
  canned_food: { regular: jarRegular, bold: jarBold, duotone: jarDuotone, fill: jarFill },
  raw_meat: { regular: boneRegular, bold: boneBold, duotone: boneDuotone, fill: boneFill },
  stone_axe: { regular: axeRegular, bold: axeBold, duotone: axeDuotone, fill: axeFill },
  foundation_wood: { bold: gridNineBold, duotone: gridNineDuotone, fill: gridNineFill },
  wall_wood: { bold: wallBold, duotone: wallDuotone, fill: wallFill },
  campfire_basic: { bold: campfireBold, duotone: campfireDuotone, fill: campfireFill },
  temperature: { regular: thermometerRegular, bold: thermometerBold },
  shelter: { regular: houseLineRegular, bold: houseLineBold },
  weather: { regular: cloudSnowRegular, bold: cloudSnowBold },
  weight: { regular: scalesRegular, bold: scalesBold },
  close: { regular: xRegular, bold: xBold },
  pause: { regular: pauseRegular, bold: pauseBold },
  resume: { regular: playRegular, bold: playBold },
  warning: { regular: warningRegular, bold: warningBold, fill: warningFill },
  info: { regular: infoRegular, bold: infoBold },
} satisfies Readonly<Record<GameIconId, IconSources>>);

const FALLBACK_WEIGHTS: readonly GameIconWeight[] = ["duotone", "bold", "regular", "fill"];

export interface RenderGameIconOptions {
  readonly weight?: GameIconWeight;
  readonly size?: GameIconSize;
  readonly label?: string;
}

export function getGameIconSvg(
  id: GameIconId,
  weight: GameIconWeight = "regular",
): string {
  if (id === "empty") return "";
  const sources: IconSources = iconRegistry[id];
  return sources[weight]
    ?? FALLBACK_WEIGHTS.map((candidate) => sources[candidate]).find(Boolean)
    ?? iconRegistry.info.regular;
}

export function renderGameIcon(
  element: HTMLElement,
  id: GameIconId,
  options: RenderGameIconOptions = {},
): void {
  const weight = options.weight ?? "regular";
  const size = options.size ?? 24;
  element.classList.add("game-icon");
  element.dataset.gameIcon = id;
  element.dataset.gameIconWeight = weight;
  element.dataset.gameIconSize = String(size);
  element.innerHTML = getGameIconSvg(id, weight);
  if (options.label) {
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", options.label);
    element.removeAttribute("aria-hidden");
  } else {
    element.setAttribute("aria-hidden", "true");
    element.removeAttribute("role");
    element.removeAttribute("aria-label");
  }
}

export function hydrateGameIcons(root: ParentNode = document): void {
  for (const element of root.querySelectorAll<HTMLElement>("[data-game-icon]")) {
    const id = element.dataset.gameIcon;
    if (!id || !isGameIconId(id)) continue;
    renderGameIcon(element, id, {
      weight: parseWeight(element.dataset.gameIconWeight),
      size: parseSize(element.dataset.gameIconSize),
    });
  }
}

function parseWeight(value: string | undefined): GameIconWeight {
  if (value === "bold" || value === "duotone" || value === "fill") return value;
  return "regular";
}

function parseSize(value: string | undefined): GameIconSize {
  const size = Number(value);
  if (size === 16 || size === 20 || size === 24 || size === 32 || size === 40 || size === 48 || size === 64) {
    return size;
  }
  return 24;
}
