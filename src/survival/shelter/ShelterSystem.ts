import type { ShelterPlacement } from "../environment/SurvivalEnvironmentScenario";
import type { SpatialPoint } from "../environment/SpatialPoint";
import { AxisAlignedVolume } from "./AxisAlignedVolume";

export interface ShelterProfile {
  readonly id: string;
  readonly displayName: string;
  readonly windProtection: number;
  readonly temperatureBonusCelsius: number;
}

export interface ShelterState {
  readonly isSheltered: boolean;
  readonly shelterId?: string;
  readonly profileId?: string;
  readonly displayName?: string;
  readonly windProtection: number;
  readonly temperatureBonusCelsius: number;
}

interface RegisteredShelter {
  readonly placement: ShelterPlacement;
  readonly profile: ShelterProfile;
  readonly volume: AxisAlignedVolume;
}

const OUTDOOR_STATE: ShelterState = Object.freeze({
  isSheltered: false,
  windProtection: 0,
  temperatureBonusCelsius: 0,
});

/** 查询纯坐标所在的 Shelter Volume，不依赖 Babylon Mesh。 */
export class ShelterSystem {
  readonly #shelters: readonly RegisteredShelter[];

  constructor(profiles: readonly ShelterProfile[], placements: readonly ShelterPlacement[]) {
    const profileMap = new Map<string, ShelterProfile>();
    for (const profile of profiles) {
      if (profileMap.has(profile.id)) throw new Error(`Shelter Profile ID 重复：${profile.id}`);
      profileMap.set(profile.id, Object.freeze({ ...profile }));
    }
    this.#shelters = Object.freeze(placements.map((placement) => {
      const profile = profileMap.get(placement.profileId);
      if (!profile) throw new Error(`不存在 Shelter Profile ID：${placement.profileId}`);
      return Object.freeze({
        placement,
        profile,
        volume: new AxisAlignedVolume(placement.bounds),
      });
    }));
  }

  static parseProfiles(value: unknown): readonly ShelterProfile[] {
    if (!Array.isArray(value)) throw new Error("Shelter Profile 配置必须是数组。");
    const profiles = value.map((entry, index) => parseProfile(entry, index));
    const ids = new Set<string>();
    for (const profile of profiles) {
      if (ids.has(profile.id)) throw new Error(`Shelter Profile ID 重复：${profile.id}`);
      ids.add(profile.id);
    }
    return Object.freeze(profiles);
  }

  static empty(): ShelterSystem {
    return new ShelterSystem([], []);
  }

  getState(position: SpatialPoint): ShelterState {
    const matches = this.#shelters
      .filter((shelter) => shelter.volume.contains(position))
      .sort((a, b) =>
        b.profile.windProtection - a.profile.windProtection
        || b.profile.temperatureBonusCelsius - a.profile.temperatureBonusCelsius);
    const active = matches[0];
    if (!active) return OUTDOOR_STATE;
    return Object.freeze({
      isSheltered: true,
      shelterId: active.placement.id,
      profileId: active.profile.id,
      displayName: active.profile.displayName,
      windProtection: active.profile.windProtection,
      temperatureBonusCelsius: active.profile.temperatureBonusCelsius,
    });
  }
}

function parseProfile(value: unknown, index: number): ShelterProfile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Shelter Profile[${index}] 必须是对象。`);
  }
  const record = value as Record<string, unknown>;
  const id = readString(record.id, `Shelter Profile[${index}].id`);
  const displayName = readString(
    record.displayName,
    `Shelter Profile[${index}].displayName`,
  );
  const windProtection = readFinite(
    record.windProtection,
    `Shelter Profile[${index}].windProtection`,
  );
  const temperatureBonusCelsius = readFinite(
    record.temperatureBonusCelsius,
    `Shelter Profile[${index}].temperatureBonusCelsius`,
  );
  if (windProtection < 0 || windProtection > 1) {
    throw new Error(`Shelter Profile[${index}].windProtection 必须在 0 到 1 之间。`);
  }
  if (temperatureBonusCelsius < 0) {
    throw new Error(`Shelter Profile[${index}].temperatureBonusCelsius 不能小于 0。`);
  }
  return Object.freeze({ id, displayName, windProtection, temperatureBonusCelsius });
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} 必须是非空字符串。`);
  }
  return value;
}

function readFinite(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} 必须是有限数值。`);
  }
  return value;
}
