"""Offline Pillow conversion; no dependency installation and no live asset writes."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common.contracts import ROOT, arguments, stage, digest, write_json


def main():
    from PIL import Image, features
    if not features.check('webp'):
        raise ValueError('Existing Pillow environment needs WebP support; ask user, do not install automatically')
    for entry in arguments('Convert reviewed Blender PNG to staged transparent WebP'):
        source = stage(entry, '.png')
        report = json.loads(stage(entry, '.png.json').read_text())
        if report['sourceSha256'] != digest(ROOT / entry['source']) or report['outputSha256'] != digest(source):
            raise ValueError('Stale or changed render; render from the current .blend again')
        with Image.open(source) as image:
            if image.size != (256, 256) or image.mode != 'RGBA' or image.getchannel('A').getextrema() != (0, 255):
                raise ValueError('Expected visible object on transparent 256px RGBA image')
            target = stage(entry, '.webp')
            image.save(target, format='WEBP', quality=90, method=6)
        if target.stat().st_size >= 50_000:
            raise ValueError('Thumbnail exceeds 50 KB; review before promotion')
        report.update({'outputSha256': digest(target), 'bytes': target.stat().st_size})
        write_json(stage(entry, '.webp.json'), report)
        print(f'Staged {target.name}; not installed into the game')


if __name__ == '__main__':
    main()
