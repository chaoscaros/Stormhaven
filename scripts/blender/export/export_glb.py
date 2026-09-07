"""Official glTF exporter; staging only, source and live assets never overwritten."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common.contracts import arguments, stage, write_json, digest
from common.validation import open_source, inspect


def main():
    import bpy
    for entry in arguments('Validate and export prepared P0 source to output/blender'):
        open_source(entry)
        objects, report = inspect(entry)
        for obj in bpy.context.view_layer.objects:
            obj.select_set(False)
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        target = stage(entry, '.glb')
        temporary = stage(entry, '.pending.glb')
        result = bpy.ops.export_scene.gltf(
            filepath=str(temporary), export_format='GLB', use_selection=True,
            export_yup=True, export_apply=True, export_animations=False,
            export_cameras=False, export_lights=False, export_extras=False,
            export_materials='EXPORT', export_texcoords=True, export_normals=True,
            export_draco_mesh_compression_enable=False)
        if result != {'FINISHED'} or temporary.stat().st_size >= entry['glbBytes']:
            raise ValueError('Export failed or exceeds GLB byte budget; live assets unchanged')
        temporary.replace(target)
        report.update({'outputSha256': digest(target), 'bytes': target.stat().st_size})
        write_json(stage(entry, '.glb.json'), report)
        print(f'Staged {target.name}; review and runtime import acceptance still required')


if __name__ == '__main__':
    main()
