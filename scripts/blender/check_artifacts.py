"""No Blender required: reject stale/mixed sources and malformed staged outputs.

Does NOT certify visual quality or publish files. Runtime tests and user visual
acceptance remain separate gates. Reports are provenance, not security signatures.
"""
import json
import struct
from common.contracts import ROOT, arguments, stage, digest, validate_stats


def check_glb(data, budget):
    if len(data) < 28 or len(data) >= budget:
        raise ValueError('GLB truncated/over byte budget')
    magic, version, size = struct.unpack_from('<III', data)
    if (magic, version, size) != (0x46546c67, 2, len(data)):
        raise ValueError('Invalid GLB header')
    chunks, offset = [], 12
    while offset < len(data):
        if offset + 8 > len(data):
            raise ValueError('Truncated GLB chunk header')
        length, kind = struct.unpack_from('<II', data, offset)
        offset += 8
        if length % 4 or offset + length > len(data):
            raise ValueError('Invalid GLB chunk length')
        chunks.append((kind, data[offset:offset + length]))
        offset += length
    if [kind for kind, _ in chunks] != [0x4e4f534a, 0x004e4942]:
        raise ValueError('Expected JSON and embedded BIN chunks')
    document = json.loads(chunks[0][1])
    if not document.get('meshes') or not document.get('accessors'):
        raise ValueError('GLB has no mesh/accessors')
    if document.get('cameras') or document.get('animations'):
        raise ValueError('Cameras/animation must not be exported')
    if any('uri' in item for key in ('buffers', 'images') for item in document.get(key, [])):
        raise ValueError('GLB must embed all images/buffers')
    forbidden = {'KHR_lights_punctual', 'KHR_draco_mesh_compression', 'EXT_meshopt_compression'}
    if forbidden.intersection(document.get('extensionsUsed', [])):
        raise ValueError('Unexpected lighting/decoder dependency')
    return document


def main():
    for entry in arguments('Check staged GLB/WebP pair from the same current Blender source'):
        source_hash = digest(ROOT / entry['source'])
        preset_hash = digest(ROOT / 'art/blender/thumbnail-preset.json')
        for suffix in ('.glb', '.webp'):
            report = json.loads(stage(entry, suffix + '.json').read_text())
            target = stage(entry, suffix)
            if report['asset'] != entry['id'] or report['source'] != entry['source'] or report['sourceSha256'] != source_hash:
                raise ValueError('Stale/wrong source report; regenerate GLB and thumbnail')
            if report['outputSha256'] != digest(target) or report['bytes'] != target.stat().st_size:
                raise ValueError('Artifact differs from its report')
            errors, _ = validate_stats(report['stats'], entry)
            if errors:
                raise ValueError('\n'.join(errors))
            if suffix == '.glb':
                check_glb(target.read_bytes(), entry['glbBytes'])
            else:
                if report['presetSha256'] != preset_hash:
                    raise ValueError('Thumbnail preset changed; rerender')
                from PIL import Image
                with Image.open(target) as image:
                    if image.format != 'WEBP' or image.size != (256, 256) or image.mode != 'RGBA' or image.getchannel('A').getextrema() != (0, 255):
                        raise ValueError('Invalid transparent WebP')
                if target.stat().st_size >= 50_000:
                    raise ValueError('Thumbnail exceeds 50 KB')
        print(f'{entry["id"]}: artifact consistency passed; NOT visual/runtime acceptance')


if __name__ == '__main__':
    main()
