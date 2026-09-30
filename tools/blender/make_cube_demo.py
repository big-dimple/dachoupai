"""大丑牌 Blender 无头资产流水线示例：生成一个道具并导出 GLB。

调用方式（Windows / Git Bash 均可）：
  "D:/tools/blender-5.2.1-windows-x64/blender.exe" --background --factory-startup --python tools/blender/make_cube_demo.py

约定：
- 产物写到仓库相对路径 public/assets/models/，文件名 kebab-case
- 保持低模（见 TODO.md P0 H5 性能预算），材质用 Principled BSDF
- 可用 gltf-transform optimize 再压缩：npx gltf-transform optimize in.glb out.glb
"""
import bpy, os

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
cube = bpy.context.active_object
cube.name = "demo-die"

mat = bpy.data.materials.new("jade")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.35, 0.75, 0.55, 1.0)
bsdf.inputs["Roughness"].default_value = 0.35
cube.data.materials.append(mat)

os.makedirs("public/assets/models", exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath="public/assets/models/demo-die.glb",
    export_format="GLB",
    export_yup=True,
    export_apply=True,
)
print("EXPORTED public/assets/models/demo-die.glb")
