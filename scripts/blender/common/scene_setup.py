"""Initialize a real EMPTY .blend template; never invent finished models."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common.contracts import ROOT, arguments


def main():
    import bpy
    entries = arguments('Create empty Blender templates; refuses to overwrite sources')
    if bpy.app.version[:2] != (4, 5):
        raise ValueError('Use Blender 4.5.x for this prepared pipeline')
    for entry in entries:
        if (ROOT / entry['source']).exists():
            raise ValueError(f'Source exists, refusing batch overwrite: {entry["source"]}')
    for entry in entries:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        scene = bpy.context.scene
        scene.unit_settings.system = 'METRIC'
        scene.unit_settings.scale_length = 1
        for name in ('EXPORT', 'COLLISION_REFERENCE', 'THUMBNAIL_HELPERS', 'WORK'):
            collection = bpy.data.collections.new(name)
            scene.collection.children.link(collection)
            if name != 'EXPORT':
                collection.hide_render = True
        scene['stormhaven_asset_id'] = entry['id']
        scene['authoring_status'] = 'EMPTY TEMPLATE - manual modeling required'
        scene.cursor.location = (0, 0, 0)
        target = ROOT / entry['source']
        target.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(target))
        print(f'Created EMPTY template: {entry["source"]}')


if __name__ == '__main__':
    main()
