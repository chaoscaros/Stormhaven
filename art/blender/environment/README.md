# Pending source

`environment_cabin.blend` does not exist yet. Model timber boards, corner supports,
open doorway/frame, floor, thick roof/eaves with controlled material variation.
Source envelope: 10.45 × 10.45 × 4.28 m, floor 10 × 10 × 0.12 m.
Blender front is +Y, bottom-center is (0,0,0). Wall height is 4 m;
roof stays inside the existing z=4..4.28 slab, not a new pitched roof.
Keep the actual 1.9 m clear doorway, floor/threshold and collision proxies intact.
The existing DOOR_WIDTH=2.4 constant includes frame/header semantics; do not widen
the passage based on that constant alone. Confirm imported visual triangles with
`tests/assetFoundation.test.ts`, then user-operated browser walking/occlusion.
See `docs/ART_PIPELINE.md`; this is a modeling brief, not a completed Blender asset.
