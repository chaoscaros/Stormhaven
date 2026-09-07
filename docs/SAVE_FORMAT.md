# Save Foundation v0.1 — contract and recovery

## Storage and compatibility

- Database `stormhaven`, IndexedDB structure version **1**, object store `saves` (out-of-line key), fixed key `slot_1`.
- Save `version: 1` comes from `SAVE_SCHEMA_VERSION`, independent from the IndexedDB version and game `0.1.0`.
- Scenario ID is the existing **`first-blizzard`**, not a new alias.
- Metadata holds `saveId`, `scenarioId`, `createdAt`, `updatedAt`; timestamps are Unix **milliseconds**. Valid overwrites retain `createdAt`. A backwards OS clock cannot make `updatedAt` earlier than `createdAt`.
- One readwrite transaction uses `put(data, saveId)`. Request success is not save success: resolve only on transaction completion. Quota/abort/open/blocked failures become `storage_error`; never delete before overwrite.
- Browser site storage is origin/profile/device scoped. Switching port or localhost/127.0.0.1 changes the slot namespace. Git does not back up browser saves. Clearing site data or private-session cleanup can lose saves. No durability guarantee beyond the browser's normal IndexedDB contract.
- Multiple tabs are not coordinated: last successful manual write wins. Avoid playing/saving the same origin in parallel tabs. No locking or multi-slot UX in this issue.

## Source fields

| Section | Saved source | Rebuilt, never serialized |
| --- | --- | --- |
| player | position `{x,y,z}`, rotation `{yaw,pitch}` radians, thermalReserve | camera instance, velocity, grounding, effective temperature/trend/status |
| time | totalGameMinutes, timeScale | formatted day/hour/minute and real clock timestamps |
| weather | currentWeatherId, nullable target/duration/elapsed transition (game seconds) | visual preview, particles, fog, sky, lights; Forecast consumed set |
| inventory | exactly 24 ordered slots, each `{itemId,quantity}` or `null` | used slots, weight and catalog definitions |
| pickups | every scenario pickup ID plus remaining quantity, including zero | meshes, target registry; missing live registry entries map to zero |
| buildings | stable id, definitionId, position, rotationDegrees, nullable snapPointId | AABB, snap coordinates, occupancy, meshes, collision and snow obstacles |
| campfires | stable id, worldBuildingId, fuelSecondsRemaining, status | isLit, capacity/config, position, heat source, interaction and light |
| hotbar | 8 ordered `{slotIndex,entry}` values, selectedIndex | quantity display, SVG paths, placement Ghost, Item Use |

`src/save/schema/SaveGameV1.ts` is authoritative. Data uses only plain structured values; validator rejects missing required fields, sparse slot arrays, non-finite numbers, invalid IDs/references, duplicate entities, invalid fuel/thermal/stack/weight limits, and inconsistent scenario weather timelines. Extra plain fields are stripped from the canonical parsed result; runtime class objects are rejected.

Hotbar is the one explicit reference-tolerance exception: unknown item/build IDs become empty entries plus `hotbar_unknown_id:<index>:<id>` warnings. Known item shortcuts remain even when inventory quantity is zero. No shortcut execution occurs during restore.

## Pipeline and ownership

`SaveSnapshotBuilder` composes Domain snapshots and `PlayerTransformPort`. `SaveService` owns operation serialization, paused/main-menu access checks and repository error mapping. `IndexedDbSaveRepository` imports no Domain systems. `migrateSave` dispatches on the schema version and validates into fresh objects before any live restore.

`SaveRestoreCoordinator` captures a rollback snapshot, then applies:

1. Inventory: existing `replaceWithSnapshot` validates/commits ordered slots.
2. Pickups: rebuild quantities from known scenario IDs; zero entries stay removed from the live registry and presentation.
3. Buildings: clear old presentation/components, rebuild domain foundations/utilities before attached walls; derive bounds and occupied snap points; restore presentation through `prepare/activate`, **not** `BuildService.place`.
4. Campfire: presentation bindings register components; headless fallback provides the same domain registration; restore exact fuel/status and enable heat for burning states.
5. Hotbar and player: restore layout/selection/transform without activating shortcuts; clear camera inertia/direction and vertical velocity; ground probe runs against rebuilt geometry when gameplay resumes.
6. Simulation: restore total time, current/transition weather, thermal reserve; reconstruct Forecast consumption through saved time inclusively; recalculate shelter/heat/thermal with zero delta.
7. Refresh fire visuals and weather mapper; reset presentation preview; refresh menus, then enter gameplay.

Static world, fixed shelter and static obstacles already exist before the main menu. They are not duplicated by load. `Game.getSaveBindings` only exposes narrow player/presentation ports; it does not perform persistence orchestration.

Forecast reconstruction is safe because v1 has a deterministic scenario schedule and no Domain weather override. Validation checks saved weather/transition against that schedule, including transition elapsed tolerance for floating-point accumulation. If later issues permit arbitrary weather actions or change this schedule, introduce a real schema migration/compatibility decision before loading old saves; do not quietly replay events.

## Failure and UI contract

- Startup only probes existence, never automatically loads. Continue is disabled without a slot. New Game does not delete/overwrite; the next manual Save does, with a visible prior warning.
- Saving is allowed from Pause; pending operation blocks Escape/Resume/double-click transitions. It stays paused after success/failure.
- Loading remains in frozen main-menu state behind the real stage overlay: 读取存档 → 验证版本 → 恢复库存 → 恢复世界资源 → 恢复建筑 → 恢复生存状态 → 完成. Stages yield for painting, without fake percentages or deliberate timers.
- After success, request pointer lock. If the browser rejects the asynchronous gesture, return to Pause so the user can explicitly click Resume. Do not leave an unhandled pointer-lock rejection.
- `ok`, `not_found`, `validation_failed`, `unsupported_version`, `unsupported_future_version`, `storage_error`, `restore_failed`, `busy`, `invalid_state` are stable service reasons; UI maps them to Chinese.
- Invalid save never mutates live state. Restore failure reapplies the complete previous snapshot (including presentation); original disk record remains unchanged. If rollback itself fails, `recoveryRequired: true` locks the UI and asks for page refresh rather than entering a partial world.
- A corrupt/obsolete v1 record can be deliberately replaced by starting New Game and manually saving. A **future-version** record is refused on both load and overwrite to avoid silently downgrading it; open with a compatible game build.
- Only real v1 is supported. No fake v0→v1 migration, autosave, offline simulation, multi-slot UI, cloud, export/import, settings, equipment or storage-container work is included.

## Verification boundary

`tests/saveFoundation.test.ts` covers source schema, full snapshot→repository→restore round trip, real Craft/Build transactions, zero/partial/untouched pickups, inventory order, all fire states, hotbar tolerance, 17:45 transition plus boundary instants, no double charge/duplicate IDs, metadata, failure preservation and rollback/retry.

`tests/savePresentationIntegration.test.ts` uses Babylon **NullEngine**, not a browser: real presentation code rebuilds mesh collision flags, obstacle registration, resource lookup, fire light and interaction without duplicate objects. It does not prove on-screen rendering, collision feel, WebGL or pointer lock.

`tests/indexedDbSaveRepository.test.ts` injects a small storage event boundary: pending transaction cannot report success early and aborted overwrite retains the previous record. This is not a real-browser IndexedDB implementation test. See `COMMAND_RUNBOOK.md` for user-operated build and Save→Refresh→Continue acceptance across target browsers.
