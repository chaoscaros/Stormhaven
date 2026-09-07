"""Bounded wall authoring recipe; use the existing pipeline for all delivery.

Only accepts the empty wall template. Appends Foundation's packed timber material
read-only: no second texture bake, no Foundation geometry or source modification.
After this one-shot authoring step, edit the saved wall .blend for further art work.
"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common.contracts import ROOT, assets


def main():
    import bpy
    from mathutils import Vector

    if bpy.app.version[:2] != (4, 5):
        raise ValueError('Use Blender 4.5.x')
    entries = assets()
    source = ROOT / entries['wall_wood']['source']
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
    scene = bpy.context.scene
    if (list(bpy.data.collections['EXPORT'].all_objects)
            or not scene.get('authoring_status', '').startswith('EMPTY TEMPLATE')):
        raise ValueError('Refusing to overwrite authored wall; edit the .blend instead')
    with bpy.data.libraries.load(str(ROOT / entries['foundation_wood']['source']), link=False) as (available, requested):
        name = 'foundation_wood__matte_timber'
        if name not in available.materials:
            raise ValueError('Validated Foundation timber material is missing')
        requested.materials = [name]
    timber = requested.materials[0]
    timber.name = 'wall_wood__matte_timber'
    images = [node.image for node in timber.node_tree.nodes if node.type == 'TEX_IMAGE']
    if len(images) != 1 or not images[0].packed_file:
        raise ValueError('Expected the existing packed Foundation albedo')
    images[0].filepath = '//foundation_wood_albedo.png'

    def piece(name, center, size, long_axis, index):
        bpy.ops.mesh.primitive_cube_add(size=1, location=center)
        obj = bpy.context.object
        obj.name = 'wall_wood__' + name
        obj.scale = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        for face in obj.data.polygons:
            normal_axis = max(range(3), key=lambda a: abs(face.normal[a]))
            face_axes = [a for a in range(3) if a != normal_axis]
            v_axis = long_axis if long_axis in face_axes else face_axes[1]
            u_axis = next(a for a in face_axes if a != v_axis)
            for loop in face.loop_indices:
                co = obj.data.vertices[obj.data.loops[loop].vertex_index].co
                # Consistent meters/texel with Foundation; unwrapped coordinates
                # repeat normally. Never modulo individual corners (folded UVs).
                obj.data.uv_layers.active.data[loop].uv = (
                    (co[u_axis] + size[u_axis] / 2) * .87 + index * .137,
                    (co[v_axis] + size[v_axis] / 2) * .5 + index * .071)
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        for collection in list(obj.users_collection):
            collection.objects.unlink(obj)
        bpy.data.collections['EXPORT'].objects.link(obj)
        obj.data.materials.append(timber)
        return obj

    boards = []
    gap = .004
    width = (1.72 - 7 * gap) / 8
    for i in range(8):
        boards.append(piece(f'plank_{i+1:02}', (-.86 + width/2 + i*(width+gap), 0, 1.2),
                            (width, .09, 2.4), 2, i))
    # Recessed joint backing closes the 4mm grooves on BOTH sides. There are no
    # see-through slits contradicting the solid gameplay wall/precipitation proxy.
    boards.append(piece('recessed_joint_backing', (0, 0, 1.2), (1.72, .036, 2.39), 2, 8))
    frame = [piece('post_left', (-.93, 0, 1.2), (.14, .18, 2.4), 2, 9),
             piece('post_right', (.93, 0, 1.2), (.14, .18, 2.4), 2, 10)]
    for side, y in [('front', .0675), ('back', -.0675)]:
        for i, z in enumerate((.38, 2.02)):
            frame.append(piece(f'{side}_rail_{i+1}', (0, y, z), (1.72, .045, .14), 0, 11+i))
    for name, parts in [('boards', boards), ('frame', frame)]:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in parts:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        bpy.ops.object.join()
        obj = bpy.context.object
        obj.name = 'wall_wood__' + name
        obj.data.name = obj.name + '_mesh'
        bevel = obj.modifiers.new('Soft timber edges 2.5mm', 'BEVEL')
        bevel.width = .0025
        bevel.segments = 2
        bevel.harden_normals = True
        for face in obj.data.polygons:
            face.use_smooth = True
        normal = obj.modifiers.new('Weighted face normals', 'WEIGHTED_NORMAL')
        normal.keep_sharp = True
    scene['authoring_status'] = 'Blender Wall Remodeling - pending user visual acceptance'
    scene['authoring_method'] = 'bpy mesh/UV/bevel; reused packed Foundation wood albedo, no rebake'
    scene['construction'] = '8 vertical boards, recessed joint backing, 2 posts, 2 rails per face'
    scene['contract'] = 'Blender XYZ 2 x .18 x 2.4m; bottom-center identity; gameplay unchanged'
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_distance = 4
                area.spaces.active.region_3d.view_location = Vector((0, 0, 1.2))
                area.spaces.active.shading.type = 'MATERIAL'
    bpy.ops.wm.save_as_mainfile(filepath=str(source), compress=False)
    print('Authored wall only. Validate/export/render/test staged artifacts before promotion.')


if __name__ == '__main__':
    main()
