"""Intentionally narrow glTF PBR baseline. Bake complex shaders before export."""
from pathlib import Path
from .contracts import ROOT


def material_errors(material, texture_limit):
    import bpy
    errors = []
    if not material or not material.use_nodes:
        return ['Missing node-based PBR material']
    nodes = material.node_tree.nodes
    allowed = {'ShaderNodeOutputMaterial', 'ShaderNodeBsdfPrincipled',
               'ShaderNodeTexImage', 'ShaderNodeNormalMap', 'ShaderNodeSeparateColor',
               'ShaderNodeSeparateRGB', 'NodeFrame', 'NodeReroute'}
    for node in nodes:
        if node.bl_idname not in allowed:
            errors.append(f'{material.name}: bake unsupported node {node.bl_idname}')
        if node.bl_idname == 'ShaderNodeTexImage':
            image = node.image
            if not image or image.source != 'FILE':
                errors.append(f'{material.name}: missing or non-file image')
                continue
            if not image.packed_file and not Path(bpy.path.abspath(image.filepath, library=image.library)).is_file():
                errors.append(f'{material.name}: missing texture {image.filepath}')
            if not image.packed_file and (not image.filepath.startswith('//') or not
                    Path(bpy.path.abspath(image.filepath, library=image.library)).resolve().is_relative_to(ROOT / 'art/blender')):
                errors.append(f'{material.name}: pack texture or use // path inside art/blender')
            if min(image.size) <= 0 or max(image.size) > texture_limit:
                errors.append(f'{material.name}: invalid/oversized texture {tuple(image.size)}')
    outputs = [n for n in nodes if n.bl_idname == 'ShaderNodeOutputMaterial' and n.is_active_output]
    if len(outputs) != 1 or not outputs[0].inputs['Surface'].is_linked:
        errors.append(f'{material.name}: missing active material output')
    elif outputs[0].inputs['Surface'].links[0].from_node.bl_idname != 'ShaderNodeBsdfPrincipled':
        errors.append(f'{material.name}: connect Principled directly to Surface')
    return errors
