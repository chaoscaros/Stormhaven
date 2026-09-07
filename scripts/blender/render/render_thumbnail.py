"""Same saved source, fixed isolated Cycles rig, transparent PNG intermediate."""
import json
import math
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common.contracts import ROOT, arguments, stage, write_json, digest
from common.validation import open_source, inspect


def main():
    import bpy
    from mathutils import Vector, Euler
    preset_path = ROOT / 'art/blender/thumbnail-preset.json'
    preset = json.loads(preset_path.read_text())
    for entry in arguments('Render staged thumbnails from the same saved Blender source'):
        open_source(entry)
        objects, report = inspect(entry)
        # Detach EXPORT meshes from source scene into a fresh isolated scene.
        # Helpers/source cameras/world/compositor cannot contaminate the thumbnail.
        scene = bpy.data.scenes.new('StormhavenThumbnail')
        bpy.context.window.scene = scene
        for obj in objects:
            scene.collection.objects.link(obj)
        override = preset['overrides'].get(entry['id'], {})
        rotation = Euler(tuple(math.radians(v) for v in override.get('rotationDegrees', [0, 0, 0]))).to_matrix()
        points = []
        for obj in objects:
            obj.rotation_euler = rotation.to_euler()
        bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        for obj in objects:
            evaluated = obj.evaluated_get(graph)
            points.extend(obj.matrix_world @ Vector(corner) for corner in evaluated.bound_box)
        center = Vector(tuple((min(p[i] for p in points) + max(p[i] for p in points)) / 2 for i in range(3)))
        extent = max(max(p[i] for p in points) - min(p[i] for p in points) for i in range(3))
        camera_data = bpy.data.cameras.new('thumbnail_camera')
        camera = bpy.data.objects.new('thumbnail_camera', camera_data)
        scene.collection.objects.link(camera)
        direction = Vector(preset['viewDirection']).normalized()
        camera.location = center + direction * extent * 4
        camera.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
        camera_data.type = 'ORTHO'
        inverse = camera.rotation_euler.to_matrix().transposed()
        projected = [inverse @ (p - center) for p in points]
        # Center projected bounds, rather than the world AABB, to avoid clipping.
        offset = Vector(((min(p.x for p in projected) + max(p.x for p in projected)) / 2,
                         (min(p.y for p in projected) + max(p.y for p in projected)) / 2, 0))
        camera.location += camera.rotation_euler.to_matrix() @ offset
        coverage = override.get('coverage', preset['coverage'])
        if not .5 <= coverage <= .85:
            raise ValueError('Thumbnail coverage must stay within 0.5..0.85')
        camera_data.ortho_scale = max(max(p[i] for p in projected) - min(p[i] for p in projected) for i in (0, 1)) / coverage
        camera_data.clip_end = max(100, extent * 10)
        scene.camera = camera
        for light in preset['lights']:
            data = bpy.data.lights.new(light['name'], 'AREA')
            data.energy = light['energy'] * extent * extent
            data.shape = 'DISK'
            data.size = light['size'] * extent
            obj = bpy.data.objects.new(light['name'], data)
            scene.collection.objects.link(obj)
            obj.location = center + Vector(light['direction']).normalized() * extent * 3
            obj.rotation_euler = (center - obj.location).to_track_quat('-Z', 'Y').to_euler()
        scene.world = bpy.data.worlds.new('thumbnail_world')
        scene.world.use_nodes = True
        scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .15
        scene.render.engine = 'CYCLES'
        scene.cycles.device = 'CPU'
        scene.cycles.samples = preset['samples']
        scene.cycles.seed = 0
        scene.render.film_transparent = True
        scene.render.resolution_x = scene.render.resolution_y = preset['resolution']
        scene.render.resolution_percentage = 100
        scene.render.image_settings.file_format = 'PNG'
        scene.render.image_settings.color_mode = 'RGBA'
        scene.render.image_settings.color_depth = '8'
        scene.view_settings.view_transform = preset['viewTransform']
        scene.view_settings.look = 'None'
        scene.view_settings.exposure = preset['exposure']
        scene.view_settings.gamma = preset['gamma']
        target = stage(entry, '.png')
        scene.render.filepath = str(target)
        bpy.ops.render.render(write_still=True)
        report.update({'outputSha256': digest(target), 'presetSha256': digest(preset_path)})
        write_json(stage(entry, '.png.json'), report)
        print(f'Staged {target.name}; convert with render/convert_thumbnail.py')


if __name__ == '__main__':
    main()
