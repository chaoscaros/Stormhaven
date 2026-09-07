"""Standard-library-only contracts, shared by tools and no-Blender tests."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / 'art/blender/manifest.json'
STAGING = ROOT / 'output/blender'


def inside(path, base):
    path, base = Path(path).resolve(), Path(base).resolve()
    if not path.is_relative_to(base):
        raise ValueError(f'Path escapes {base}: {path}')
    return path


def assets():
    data = json.loads(MANIFEST.read_text())
    if data['schemaVersion'] != 1:
        raise ValueError('Unsupported art manifest version')
    entries = data['assets']
    if len({a['id'] for a in entries}) != len(entries):
        raise ValueError('Duplicate art ID')
    for entry in entries:
        if not entry['id'].replace('_', '').isalnum():
            raise ValueError('Invalid art ID')
        inside(ROOT / entry['source'], ROOT / 'art/blender')
        inside(ROOT / entry['glb'], ROOT / 'public/assets/models')
    return {entry['id']: entry for entry in entries}


def arguments(description):
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument('--asset', required=True, choices=[*assets(), 'all'])
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    entries = assets()
    return list(entries.values()) if args.asset == 'all' else [entries[args.asset]]


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def effective_preset_digest(preset, asset_id):
    """Unrelated asset overrides must not invalidate an unchanged accepted rig."""
    effective = {key: value for key, value in preset.items() if key != 'overrides'}
    effective['override'] = preset.get('overrides', {}).get(asset_id, {})
    return hashlib.sha256(json.dumps(effective, sort_keys=True, separators=(',', ':'),
                                     allow_nan=False).encode()).hexdigest()


def stage(entry, suffix):
    target = inside(STAGING / f"{entry['id']}{suffix}", STAGING)
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def write_json(path, data):
    Path(path).write_text(json.dumps(data, indent=2, allow_nan=False) + '\n')


def validate_stats(stats, contract):
    """Reject bad export metrics; under-target triangles are warnings, not padding."""
    errors = list(stats.get('errors', []))
    warnings = []
    bounds = stats['bounds']
    if len(bounds) != 2 or any(len(v) != 3 for v in bounds):
        return ['Invalid bounds shape'], warnings
    if not all(math.isfinite(v) for row in bounds for v in row):
        return ['Non-finite bounds'], warnings
    lo, hi = bounds
    if any(b <= a for a, b in zip(lo, hi)):
        errors.append('Empty or degenerate bounds')
    if abs(lo[2]) > .001 or any(abs(lo[i] + hi[i]) > .002 for i in (0, 1)):
        errors.append('Asset anchor must be bottom-center at world origin')
    for axis, limit in enumerate(contract['dimensions']):
        size = hi[axis] - lo[axis]
        if size > limit + .001 or (contract['exactBounds'] and abs(size - limit) > .001):
            errors.append(f'Dimension {axis}: {size} does not fit {limit}')
    count = stats['triangles']
    if not isinstance(count, int) or count <= 0 or count > contract['triangles'][1]:
        errors.append('Triangle count empty/invalid/over budget')
    elif count < contract['triangles'][0]:
        warnings.append('Below triangle target: review silhouette; never add useless faces')
    if not isinstance(stats['materials'], int) or not 0 < stats['materials'] <= contract['materials']:
        errors.append('Material count empty/invalid/over budget')
    return errors, warnings
