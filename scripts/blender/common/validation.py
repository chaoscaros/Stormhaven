"""Blender adapter: evaluated mesh metrics, no mutation of the source file."""
import math
from .contracts import ROOT, digest, validate_stats
from .material_utils import material_errors


def open_source(entry):
    import bpy
    path = ROOT / entry['source']
    if not path.is_file():
        raise ValueError(f'Missing real Blender source: {entry["source"]}; model it first')
    if path.stat().st_size > 25_000_000:
        raise ValueError('Source exceeds 25 MB review gate; discuss optimization/LFS before increasing budget')
    if bpy.app.version[:2] != (4, 5):
        raise ValueError('Prepared API target is Blender 4.5.x; validate a version change explicitly')
    bpy.ops.wm.open_mainfile(filepath=str(path), load_ui=False)
    return path


def inspect(entry):
    import bpy
    scene = bpy.context.scene
    if scene.unit_settings.system != 'METRIC' or abs(scene.unit_settings.scale_length - 1) > 1e-6:
        raise ValueError('Scene must be Metric, unit scale 1')
    collection = bpy.data.collections.get('EXPORT')
    objects = list(collection.all_objects) if collection else []
    if not objects:
        raise ValueError('EXPORT is empty: template is not an authored asset')
    errors, materials, points, triangles = [], set(), [], 0
    graph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != 'MESH':
            errors.append(f'{obj.name}: only static meshes allowed in EXPORT')
            continue
        if not obj.name.startswith(entry['id'] + '__'):
            errors.append(f'{obj.name}: expected {entry["id"]}__part name')
        if obj.parent or obj.constraints or obj.animation_data or obj.data.shape_keys:
            errors.append(f'{obj.name}: bake parenting/constraints/animation/shape keys')
        # Every mesh uses the asset anchor; part offsets belong in mesh data.
        if any(abs(obj.matrix_world[i][j] - (1 if i == j else 0)) > 1e-6
               or not math.isfinite(obj.matrix_world[i][j]) for i in range(4) for j in range(4)):
            errors.append(f'{obj.name}: apply transforms; set origin to world zero')
        if obj.hide_render or obj.hide_viewport or not obj.visible_get():
            errors.append(f'{obj.name}: export mesh hidden/excluded')
        if any(m.show_viewport != m.show_render for m in obj.modifiers):
            errors.append(f'{obj.name}: viewport/render modifier settings disagree')
        if any(m.type not in {'BEVEL', 'WEIGHTED_NORMAL', 'TRIANGULATE'} for m in obj.modifiers):
            errors.append(f'{obj.name}: bake modifiers other than Bevel/Weighted Normal/Triangulate')
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=graph)
        try:
            if not mesh.vertices or not mesh.polygons:
                errors.append(f'{obj.name}: empty mesh')
                continue
            mesh.calc_loop_triangles()
            triangles += len(mesh.loop_triangles)
            points.extend(obj.matrix_world @ v.co for v in mesh.vertices)
            if not mesh.uv_layers.active or not all(math.isfinite(v) for uv in mesh.uv_layers.active.data for v in uv.uv):
                errors.append(f'{obj.name}: missing/invalid UV')
            for poly in mesh.polygons:
                if poly.material_index >= len(mesh.materials) or not mesh.materials[poly.material_index]:
                    errors.append(f'{obj.name}: face has missing material'); break
            for material in mesh.materials:
                if material and material.name not in materials:
                    materials.add(material.name)
                    errors.extend(material_errors(material, entry['textureSize']))
        finally:
            evaluated.to_mesh_clear()
    if not points or not all(math.isfinite(v) for p in points for v in p):
        raise ValueError('Empty/non-finite evaluated geometry')
    bounds = [[min(p[i] for p in points) for i in range(3)],
              [max(p[i] for p in points) for i in range(3)]]
    stats = {'bounds': bounds, 'triangles': triangles, 'materials': len(materials), 'errors': errors}
    errors, warnings = validate_stats(stats, entry)
    if errors:
        raise ValueError('\n'.join(errors))
    return objects, {'asset': entry['id'], 'blenderVersion': bpy.app.version_string,
                     'source': entry['source'], 'sourceSha256': digest(ROOT / entry['source']),
                     'stats': stats, 'warnings': warnings}
