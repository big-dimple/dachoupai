"""Render one font-free reward clip from the unchanged repository coin GLB.

blender --background --factory-startup --python-exit-code 1 \
  --python art/sources/coin-reward/render.py
Output: shots/coin-reward/frames/coin-000.png ... coin-015.png.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'public/assets/models/prop-coin.glb'
SOURCE_SHA256 = '25c97ba5ac7a094ac7d234b16a932ecf87a32a722a6e76388beccae4d6201c69'
# One 800 ms arrival/spin/settle; last two samples hold the settled pose.
# No reward value or event logic is baked into the clip.
TURN = [-300, -291, -270, -238, -196, -150, -104, -66, -38, -20, -11, -6, -10, -12, -12, -12]
HEIGHT = [.23, .29, .31, .29, .25, .20, .14, .08, .025, -.025, .035, .012, 0, 0, 0, 0]
SCALE = [.68, .74, .81, .87, .92, .97, 1, 1, 1, 1.025, .99, 1.01, 1, 1, 1, 1]


def light(name, location, energy, size, color):
    bpy.ops.object.light_add(type='AREA', location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.energy = energy
    obj.data.shape = 'DISK'
    obj.data.size = size
    obj.data.color = color
    obj.rotation_euler = (-obj.location).to_track_quat('-Z', 'Y').to_euler()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=ROOT / 'shots/coin-reward/frames')
    parser.add_argument('--size', type=int, default=384)
    parser.add_argument('--samples', type=int, default=128)
    parser.add_argument('--frames', default=','.join(map(str, range(16))), help='Selected frame indices for review')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    frames = [int(v) for v in args.frames.split(',')]
    if not frames or any(v not in range(16) for v in frames):
        parser.error('Frame indices must be 0..15')
    if args.size < 256 or args.size > 1024 or args.samples < 16 or args.samples > 512:
        parser.error('Use size 256..1024 and samples 16..512')
    out = args.out.expanduser().resolve()
    public = (ROOT / 'public').resolve()
    if out == public or public in out.parents:
        parser.error('Raw review frames must remain outside public; pack.mjs writes the atlas')
    digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if digest != SOURCE_SHA256:
        raise ValueError('Source coin changed; review and record the new source before regenerating')
    out.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if len(meshes) != 1:
        raise ValueError('Expected the single delivered coin mesh')
    coin = meshes[0]
    # Recenter the imported object without modifying its stored geometry or source.
    center = sum((Vector(c) for c in coin.bound_box), Vector()) / 8
    bpy.ops.object.empty_add()
    pivot = bpy.context.object
    pivot.name = 'RewardCoinPose'
    coin.parent = pivot
    coin.location = -center

    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = args.samples
    scene.cycles.seed = 0
    scene.cycles.use_animated_seed = False
    scene.cycles.use_denoising = False  # This system Blender has no OpenImageDenoise.
    scene.render.resolution_x = scene.render.resolution_y = args.size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.render.film_transparent = True
    scene.render.fps = 20
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    world = bpy.data.worlds.new('TealNeutralStudio')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.32, .46, .43, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .50
    # Broad warm key and restrained cyan rim. No emissive particle cloud or matte.
    light('WarmKey', (-2.2, -3, 4.5), 360, 3.0, (1, .83, .60))
    # Review correction: the original 260 W filled the back with a pale flash.
    # Reduce this reflection source rather than darkening every coin pose.
    light('TealRim', (2.5, 1.5, 2), 80, 2.2, (.50, .88, .88))
    light('SoftFront', (.2, -4, 1.5), 100, 3.0, (.90, .96, 1))
    bpy.ops.object.camera_add(location=(0, -2.7, 6.8))
    camera = bpy.context.object
    target = Vector((0, .07, 0))
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 1.43
    camera.data.lens = 50
    scene.camera = camera

    poses = []
    for i in frames:
        pivot.location = (-.12 * (1 - min(i / 10, 1)), HEIGHT[i], 0)
        pivot.rotation_euler = tuple(math.radians(v) for v in (10, TURN[i], -18 + 14 * min(i / 12, 1)))
        pivot.scale = (SCALE[i],) * 3
        scene.frame_set(i)
        scene.render.filepath = str(out / f'coin-{i:03}.png')
        bpy.ops.render.render(write_still=True)
        poses.append({'frame': i, 'timeMs': i * 50, 'rotationDegrees': [10, TURN[i], -18 + 14 * min(i / 12, 1)],
                      'translation': list(pivot.location), 'scale': SCALE[i]})
    record = {'source': SOURCE.relative_to(ROOT).as_posix(), 'sourceSha256': digest,
              'blender': bpy.app.version_string, 'render': {'engine': 'CYCLES', 'device': 'CPU', 'samples': args.samples,
              'seed': 0, 'denoise': False, 'viewTransform': 'AgX', 'exposureEV': 0, 'tealRimWatts': 80,
              'size': [args.size, args.size], 'alpha': 'straight RGBA'},
              'action': 'single coin arrival, one turn and settle; last pose holds',
              'frames': 16, 'fps': 20, 'durationMs': 800, 'loop': False,
              'material': 'Original imported gold material unchanged; lighting only', 'poses': poses}
    (out.parent / 'render-report.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf8')
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != digest:
        raise ValueError('Source was unexpectedly changed')
    print('COIN_REWARD_RENDERED', len(poses), out, flush=True)


if __name__ == '__main__':
    main()
