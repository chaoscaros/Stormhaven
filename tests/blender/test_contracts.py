"""Standard-library tests: never import bpy, require Blender, or create .blend."""
import copy
import json
from pathlib import Path
import struct
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/blender'))
from common.contracts import assets, inside, validate_stats
from check_artifacts import check_glb


class ArtContracts(unittest.TestCase):
    def setUp(self):
        self.contract = assets()['foundation_wood']
        self.stats = {'bounds': [[-1, -1, 0], [1, 1, .2]], 'triangles': 600, 'materials': 2, 'errors': []}

    def test_manifest_has_exact_p0_without_claiming_sources(self):
        self.assertEqual(list(assets()), ['foundation_wood', 'wall_wood', 'campfire_basic', 'environment_cabin', 'stone_axe'])
        for entry in assets().values():
            self.assertEqual(Path(entry['source']).suffix, '.blend')
        self.assertIsNone(assets()['stone_axe']['runtimeId'])

    def test_valid_metrics(self):
        self.assertEqual(validate_stats(self.stats, self.contract), ([], []))

    def test_each_exact_dimension(self):
        for i in range(3):
            stats = copy.deepcopy(self.stats)
            stats['bounds'][1][i] -= .01
            self.assertTrue(validate_stats(stats, self.contract)[0])

    def test_nonfinite_bounds(self):
        for bad in (float('inf'), float('nan'), -float('inf')):
            stats = copy.deepcopy(self.stats)
            stats['bounds'][1][0] = bad
            self.assertTrue(validate_stats(stats, self.contract)[0])

    def test_bottom_center_anchor(self):
        for axis in range(3):
            stats = copy.deepcopy(self.stats)
            for bound in stats['bounds']:
                bound[axis] += .01
            self.assertIn('Asset anchor must be bottom-center at world origin', validate_stats(stats, self.contract)[0])

    def test_triangle_budget_is_post_modifier(self):
        for count in (0, -1, 4001, float('nan')):
            self.assertTrue(validate_stats({**self.stats, 'triangles': count}, self.contract)[0])

    def test_below_target_warns_not_fails(self):
        errors, warnings = validate_stats({**self.stats, 'triangles': 300}, self.contract)
        self.assertFalse(errors)
        self.assertTrue(warnings)

    def test_material_budget_and_adapter_failures(self):
        for count in (0, 4):
            self.assertTrue(validate_stats({**self.stats, 'materials': count}, self.contract)[0])
        self.assertIn('Missing UV', validate_stats({**self.stats, 'errors': ['Missing UV']}, self.contract)[0])

    def test_envelope_accepts_smaller_campfire_but_not_overflow(self):
        stats = {'bounds': [[-.5, -.5, 0], [.5, .5, .4]], 'triangles': 1200, 'materials': 3}
        self.assertFalse(validate_stats(stats, assets()['campfire_basic'])[0])
        stats['bounds'][1][2] = .51
        self.assertTrue(validate_stats(stats, assets()['campfire_basic'])[0])

    def test_escape_rejected(self):
        with self.assertRaises(ValueError):
            inside(ROOT / '../outside', ROOT)

    @staticmethod
    def binary(doc):
        payload = json.dumps(doc).encode()
        payload += b' ' * (-len(payload) % 4)
        return (struct.pack('<III', 0x46546c67, 2, 32 + len(payload))
                + struct.pack('<II', len(payload), 0x4e4f534a) + payload
                + struct.pack('<II', 4, 0x004e4942) + b'\0' * 4)

    def test_container_checks_not_full_gltf_validation(self):
        doc = {'meshes': [{}], 'accessors': [{}]}
        valid = self.binary(doc)
        self.assertEqual(check_glb(valid, 10000), doc)
        for data in (valid[:-1], b'not a GLB', valid[:20]):
            with self.assertRaises(ValueError):
                check_glb(data, 10000)
        with self.assertRaises(ValueError):
            check_glb(valid, len(valid))

    def test_no_helpers_external_files_or_decoders(self):
        for extra in ({'cameras': [{}]}, {'animations': [{}]},
                      {'images': [{'uri': 'texture.png'}]},
                      {'buffers': [{'uri': 'https://example.com/a.bin'}]},
                      {'extensionsUsed': ['KHR_lights_punctual']},
                      {'extensionsUsed': ['KHR_draco_mesh_compression']}):
            with self.assertRaises(ValueError):
                check_glb(self.binary({'meshes': [{}], 'accessors': [{}], **extra}), 10000)


if __name__ == '__main__':
    unittest.main()
