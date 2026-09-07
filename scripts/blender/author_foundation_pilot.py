"""One-shot, Blender-only Pilot authoring recipe; .blend remains the editable source.

Refuses to overwrite authored work. Uses real mesh/UV/bevel authoring and Cycles
diffuse baking, not the legacy Python GLB writer or software thumbnail renderer.
"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common.contracts import ROOT, assets, stage


def main():
    import bpy
    from mathutils import Vector

    entry = assets()['foundation_wood']
    source = ROOT / entry['source']
    if bpy.app.version[:2] != (4, 5):
        raise ValueError('Use Blender 4.5.x')
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
    scene = bpy.context.scene
    if (list(bpy.data.collections['EXPORT'].all_objects)
            or not scene.get('authoring_status', '').startswith('EMPTY TEMPLATE')):
        raise ValueError('Refusing to overwrite authored source; edit the .blend instead')

    # Bake one reusable longitudinal timber texture with Cycles. The procedural
    # recipe is retained as an unused authoring material, never exported to glTF.
    bpy.ops.mesh.primitive_plane_add(size=2)
    plane = bpy.context.object
    plane.name = 'WORK_wood_bake_surface'
    material = bpy.data.materials.new('WORK_wood_grain_recipe')
    material.use_nodes = True
    material.use_fake_user = True
    plane.data.materials.append(material)
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = nodes.get('Principled BSDF')
    uv = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = (85, 2.8, 1)
    links.new(uv.outputs['UV'], mapping.inputs['Vector'])
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 3
    noise.inputs['Detail'].default_value = 2
    noise.inputs['Roughness'].default_value = .65
    links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .22
    ramp.color_ramp.elements[0].color = (.075, .037, .017, 1)
    ramp.color_ramp.elements[1].position = .78
    ramp.color_ramp.elements[1].color = (.32, .21, .112, 1)
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], shader.inputs['Base Color'])
    shader.inputs['Roughness'].default_value = .82
    image = bpy.data.images.new('foundation_wood_albedo', width=1024, height=1024, alpha=False)
    target_node = nodes.new('ShaderNodeTexImage')
    target_node.image = image
    nodes.active = target_node
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 16
    scene.render.bake.use_pass_direct = False
    scene.render.bake.use_pass_indirect = False
    scene.render.bake.use_pass_color = True
    bpy.ops.object.bake(type='DIFFUSE')
    image.filepath_raw = str(stage(entry, '.albedo.png'))
    image.file_format = 'PNG'
    image.save()
    image.pack()
    image.filepath = '//foundation_wood_albedo.png'  # Packed; no machine-local path.
    bpy.data.objects.remove(plane, do_unlink=True)

    timber = bpy.data.materials.new('foundation_wood__matte_timber')
    timber.use_nodes = True
    bsdf = timber.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = 0
    bsdf.inputs['Roughness'].default_value = .82
    tex = timber.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = image
    timber.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])

    def beam(name, center, size, long_axis, index):
        bpy.ops.mesh.primitive_cube_add(size=1, location=center)
        obj = bpy.context.object
        obj.name = 'foundation_wood__' + name
        obj.data.name = obj.name + '_mesh'
        obj.scale = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        # Real per-face UVs, grain follows the piece's long axis, with a different
        # texture slice per plank. Bevel interpolates these UVs at machined edges.
        cross = 1 - long_axis
        for face in obj.data.polygons:
            face_axis = max(range(3), key=lambda a: abs(face.normal[a]))
            for loop_id in face.loop_indices:
                co = obj.data.vertices[obj.data.loops[loop_id].vertex_index].co
                transverse = 2 if face_axis == cross else cross
                u = co[transverse] / max(size[transverse], .001) + .5
                v = co[long_axis] / size[long_axis] + .5
                if face_axis == long_axis:
                    v = co[2] / size[2] + .5
                obj.data.uv_layers.active.data[loop_id].uv = ((u * .17 + index * .137) % 1, v)
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        for collection in list(obj.users_collection):
            collection.objects.unlink(obj)
        bpy.data.collections['EXPORT'].objects.link(obj)
        obj.data.materials.append(timber)
        return obj

    boards = []
    gap = .006
    width = (2 - 9 * gap) / 10
    for i in range(10):
        boards.append(beam(f'plank_{i+1:02}', (-1 + width/2 + i*(width+gap), 0, .175),
                           (width, 2, .05), 1, i))
    frame = [beam('rim_front', (0, -.94, .075), (2, .12, .15), 0, 11),
             beam('rim_back', (0, .94, .075), (2, .12, .15), 0, 12)]
    for i, x in enumerate((-.94, -.5, 0, .5, .94)):
        frame.append(beam(f'joist_{i+1:02}', (x, 0, .075),
                          (.12 if i in (0, 4) else .08, 1.76, .15), 1, i+13))
    for name, pieces in [('deck', boards), ('frame', frame)]:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in pieces:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = pieces[0]
        bpy.ops.object.join()
        obj = bpy.context.object
        obj.name = 'foundation_wood__' + name
        obj.data.name = obj.name + '_mesh'
        bevel = obj.modifiers.new('Soft machined timber edges', 'BEVEL')
        bevel.width = .0025
        bevel.segments = 2
        bevel.affect = 'EDGES'
        bevel.harden_normals = True
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        normal = obj.modifiers.new('Weighted face normals', 'WEIGHTED_NORMAL')
        normal.keep_sharp = True
        obj['construction'] = '10 separate planks, 6mm joints' if name == 'deck' else '2 rim beams + 5 joists'

    scene['authoring_status'] = 'Blender Foundation Pilot - pending user visual acceptance'
    scene['authoring_method'] = 'Blender bpy mesh/UV/bevel authoring + Cycles diffuse bake'
    scene['contract'] = 'Blender XYZ 2 x 2 x .2m; bottom-center anchor; gameplay proxy unchanged'
    # Useful source-file opening view; no GUI launched by this recipe.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_distance = 3.5
                area.spaces.active.region_3d.view_location = Vector((0, 0, .1))
                area.spaces.active.shading.type = 'MATERIAL'
    bpy.ops.wm.save_as_mainfile(filepath=str(source), compress=False)
    print('Authored foundation only; run validation/export/render before promotion')


if __name__ == '__main__':
    main()
