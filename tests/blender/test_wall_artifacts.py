"""Same tests run on staging before promotion and committed artifacts afterwards."""
import hashlib
import json
import os
from pathlib import Path
import struct
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/blender'))
from common.contracts import effective_preset_digest
from check_artifacts import check_glb


def embedded_png(data):
    size = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20+size])
    if len(doc['images']) != 1:
        raise ValueError('Expected one embedded timber albedo')
    image = doc['images'][0]
    if 'uri' in image or image['mimeType'] != 'image/png':
        raise ValueError('Expected embedded PNG')
    view = doc['bufferViews'][image['bufferView']]
    start = 28 + size + view.get('byteOffset', 0)
    return data[start:start + view['byteLength']]


class WallArtifacts(unittest.TestCase):
    def setUp(self):
        self.record = json.loads((ROOT / 'art/blender/buildings/wall_wood.provenance.json').read_text())

    def artifact(self, key):
        override = os.environ.get('STORMHAVEN_WALL_ARTIFACT_DIR')
        if override and key != 'source':
            return (ROOT / override / ('wall_wood.glb' if key == 'glb' else 'wall_wood.webp')).read_bytes()
        return (ROOT / self.record[key]).read_bytes()

    def test_real_source_and_pair_match_provenance(self):
        for key in ('source', 'glb', 'thumbnail'):
            data = self.artifact(key)
            self.assertEqual(hashlib.sha256(data).hexdigest(), self.record[key + 'Sha256'])
            self.assertEqual(len(data), self.record[key + 'Bytes'])
        self.assertTrue(self.artifact('source').startswith(b'BLENDER'))
        self.assertLess(len(self.artifact('source')), 25_000_000)
        check_glb(self.artifact('glb'), 1_000_000)

    def test_reuses_exact_foundation_albedo_not_a_duplicate_bake(self):
        png = embedded_png(self.artifact('glb'))
        self.assertEqual(png[:8], b'\x89PNG\r\n\x1a\n')
        self.assertEqual(struct.unpack_from('>II', png, 16), (1024, 1024))
        foundation = (ROOT / 'public/assets/models/buildings/wood-foundation.glb').read_bytes()
        self.assertEqual(png, embedded_png(foundation))

    def test_transparent_256_webp_and_current_effective_rig(self):
        data = self.artifact('thumbnail')
        self.assertEqual(data[:4], b'RIFF')
        self.assertEqual(data[8:16], b'WEBPVP8X')
        self.assertTrue(data[20] & 0x10)  # Alpha flag; full pixel alpha verified by paired checker.
        self.assertEqual(1 + int.from_bytes(data[24:27], 'little'), 256)
        self.assertEqual(1 + int.from_bytes(data[27:30], 'little'), 256)
        self.assertLess(len(data), 50_000)
        preset = json.loads((ROOT / 'art/blender/thumbnail-preset.json').read_text())
        self.assertEqual(effective_preset_digest(preset, 'wall_wood'), self.record['effectivePresetSha256'])

    def test_thumbnail_id_and_same_source_metadata(self):
        entries = json.loads((ROOT / 'public/assets/thumbnails/sources.json').read_text())
        entry = next(row for row in entries if row['id'] == 'wall_wood')
        if os.environ.get('STORMHAVEN_WALL_ARTIFACT_DIR'):
            # Before promotion, live metadata must still describe the old art.
            # Staged render/export reports establish same-source provenance here.
            directory = ROOT / os.environ['STORMHAVEN_WALL_ARTIFACT_DIR']
            for suffix in ('glb', 'webp'):
                report = json.loads((directory / f'wall_wood.{suffix}.json').read_text())
                self.assertEqual(report['source'], self.record['source'])
                self.assertEqual(report['sourceSha256'], self.record['sourceSha256'])
        else:
            self.assertEqual(entry['source'], self.record['source'])
            self.assertEqual(entry['sourceSha256'], self.record['sourceSha256'])
            self.assertEqual(entry['bytes'], self.record['thumbnailBytes'])


if __name__ == '__main__':
    unittest.main()
