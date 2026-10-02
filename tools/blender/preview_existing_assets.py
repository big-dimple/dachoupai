"""Read existing GLBs; render review evidence without rebuilding or modifying sources.

BLENDER --background --factory-startup --python tools/blender/preview_existing_assets.py
  -- --out shots/a00-render
Camera/light setup follows asset_geometry.camera_render, but imports delivered GLBs.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--only', default='')
parser.add_argument('--oblique', action='store_true', help='Oblique review angle for bend/edge inspection')
parser.add_argument('--denoise', action='store_true', help='Requires a Blender build with Cycles denoising support')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
out = args.out.resolve()
if out == ROOT / 'public' or ROOT / 'public' in out.parents:
    raise ValueError('Review output must not overwrite public assets')
out.mkdir(parents=True, exist_ok=True)
records = []


def setup(objects, card=False):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 8
    scene.cycles.device = 'CPU'
    scene.cycles.seed = 0
    scene.cycles.use_denoising = args.denoise
    scene.render.resolution_x = scene.render.resolution_y = 320
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.film_transparent = True
    scene.render.fps = 24
    scene.world = bpy.data.worlds.new('A00_review_world')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.78, .87, .82, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .65
    scene.view_settings.view_transform = 'AgX'
    bpy.context.view_layer.update()
    coords = [o.matrix_world @ Vector(c) for o in objects for c in o.bound_box]
    low = Vector(tuple(min(v[i] for v in coords) for i in range(3)))
    high = Vector(tuple(max(v[i] for v in coords) for i in range(3)))
    center = (low + high) / 2
    extent = max(high - low)
    bpy.ops.object.camera_add(location=center + Vector((.15, -2, .12) if card and not args.oblique else (1.2, -2, 1.1)) * extent)
    cam = bpy.context.object
    cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = extent * 1.55
    scene.camera = cam
    for offset, power, size in [((-3, -4, 6), 750, 5), ((4, 1, 5), 1000, 4), ((0, 4, 2), 400, 3)]:
        bpy.ops.object.light_add(type='AREA', location=center + Vector(offset))
        light = bpy.context.object
        light.data.energy = power
        light.data.shape = 'DISK'
        light.data.size = size
        light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()


def render(name):
    bpy.context.scene.render.filepath = str(out / (name + '.png'))
    bpy.ops.render.render(write_still=True)


for source in sorted((ROOT / 'public/assets/models').glob('*.glb')):
    if args.only and args.only not in source.stem:
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if source.stem != 'card-animation-templates':
        setup(meshes, source.stem.startswith(('poker-', 'joker-', 'word-')))
        render(source.stem)
        records.append({'source': source.relative_to(ROOT).as_posix(), 'renders': [source.stem + '.png']})
    else:
        # Imported glTF animation clips live in separate NLA tracks, including shape keys.
        # Restore original transforms before each clip; unrelated particles stay hidden.
        originals = {o.name: (o.location.copy(), o.rotation_quaternion.copy(), o.scale.copy()) for o in meshes}
        setup([bpy.data.objects['AnimatedCard']], True)
        names = sorted(a.name for a in bpy.data.actions)
        rendered = []
        for name in names:
            for obj in meshes:
                obj.location, obj.rotation_quaternion, obj.scale = originals[obj.name]
                obj.hide_render = obj.name != 'AnimatedCard' and not (
                    obj.name.startswith(name + '_') or name == 'split' and obj.name.startswith('Fragment_'))
                owners = [obj] + ([obj.data.shape_keys] if obj.data.shape_keys else [])
                for owner in owners:
                    if owner.animation_data:
                        owner.animation_data.action = None
                        for track in owner.animation_data.nla_tracks:
                            track.mute = track.name != name
                    if owner != obj:
                        for key in owner.key_blocks:
                            key.value = 0
            for frame in [0, 6, 12, 18, 24]:
                bpy.context.scene.frame_set(frame)
                filename = f'clip-{name}-{frame:02}'
                render(filename)
                rendered.append(filename + '.png')
        records.append({'source': source.relative_to(ROOT).as_posix(), 'clips': names, 'fps': 24,
                        'sampleFrames': [0, 6, 12, 18, 24], 'renders': rendered})
    print('A00_RENDERED', source.name, flush=True)
    (out / 'render-log.json').write_text(json.dumps({'blender': bpy.app.version_string, 'engine': 'CYCLES',
        'device': 'CPU', 'seed': 0, 'denoising': args.denoise,
        'samples': 8, 'size': [320, 320], 'records': records}, indent=2) + '\n', encoding='utf8')
