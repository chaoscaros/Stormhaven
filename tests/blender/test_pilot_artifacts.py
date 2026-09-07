"""Committed Pilot provenance/container checks; no bpy/Pillow installation needed.

These are not substitutes for Blender inspection or game pixel acceptance.
"""
import hashlib
import json
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parents[2]


class FoundationPilotArtifacts(unittest.TestCase):
    def setUp(self):
        self.record = json.loads((ROOT / 'art/blender/buildings/foundation_wood.provenance.json').read_text())

    def test_current_source_and_both_deliverables_match_recorded_hashes(self):
        for key in ('source', 'glb', 'thumbnail'):
            data = (ROOT / self.record[key]).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), self.record[key + 'Sha256'])
            if key != 'source':
                self.assertEqual(len(data), self.record[key + 'Bytes'])
        self.assertTrue((ROOT / self.record['source']).read_bytes().startswith(b'BLENDER'))
        self.assertLess((ROOT / self.record['source']).stat().st_size, 25_000_000)

    def test_ui_uses_same_blend_source_and_current_thumbnail_preset(self):
        entries = json.loads((ROOT / 'public/assets/thumbnails/sources.json').read_text())
        entry = next(e for e in entries if e['id'] == 'foundation_wood')
        self.assertEqual(entry['source'], self.record['source'])
        self.assertEqual(entry['sourceSha256'], self.record['sourceSha256'])
        self.assertEqual(entry['bytes'], self.record['thumbnailBytes'])
        preset = (ROOT / 'art/blender/thumbnail-preset.json').read_bytes()
        self.assertEqual(hashlib.sha256(preset).hexdigest(), self.record['presetSha256'])

    def test_blender_glb_embeds_one_real_1k_png(self):
        data = (ROOT / self.record['glb']).read_bytes()
        json_size = struct.unpack_from('<I', data, 12)[0]
        doc = json.loads(data[20:20+json_size])
        self.assertIn('Blender', doc['asset']['generator'])
        self.assertEqual(len(doc['images']), 1)
        image = doc['images'][0]
        self.assertNotIn('uri', image)
        self.assertEqual(image['mimeType'], 'image/png')
        view = doc['bufferViews'][image['bufferView']]
        start = 28 + json_size + view.get('byteOffset', 0)
        png = data[start:start + view['byteLength']]
        self.assertEqual(png[:8], b'\x89PNG\r\n\x1a\n')
        self.assertEqual(struct.unpack_from('>II', png, 16), (1024, 1024))


if __name__ == '__main__':
    unittest.main()
