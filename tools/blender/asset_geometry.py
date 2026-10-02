"""Blender primitives, mesh assembly, PBR materials and reproducible exports."""
from pathlib import Path
import math
import bpy
from mathutils import Vector
from asset_config import DEFAULT_OUTPUT, DEFAULT_REVIEW, review_path

ROOT=Path(__file__).resolve().parents[2]
MODELS=DEFAULT_OUTPUT/'models'
TEX=DEFAULT_OUTPUT/'textures/p0'
TMP=DEFAULT_REVIEW/'raw'
RENDERS=[]
DENOISE=False
PALETTE={'ivory':(.92,.84,.65,1),'red':(.55,.025,.02,1),
         'gold':(.83,.48,.095,1),'jade':(.09,.42,.30,1),
         'bamboo':(.16,.32,.065,1),'purple':(.30,.065,.30,1),
         'wood':(.30,.10,.035,1),'ink':(.025,.065,.06,1)}
MATS={}


def configure(output_root,review_root,denoise=False):
    global MODELS,TEX,TMP,DENOISE
    MODELS=output_root/'models'
    TEX=output_root/'textures/p0'
    TMP=review_path(review_root)/'raw'
    DENOISE=denoise
    RENDERS.clear()


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()


def material(name,color=None,metal=0,rough=.42,emission=0):
    if name in MATS: return MATS[name]
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    color=color or PALETTE.get(name,PALETTE['ivory'])
    bsdf.inputs['Base Color'].default_value=color
    bsdf.inputs['Metallic'].default_value=metal
    bsdf.inputs['Roughness'].default_value=rough
    if emission:
        bsdf.inputs['Emission Color'].default_value=color
        bsdf.inputs['Emission Strength'].default_value=emission
    MATS[name]=mat
    return mat


def named(name):
    return material(name,metal=.82 if name=='gold' else .4 if name=='ink' else 0,
                    rough=.25 if name in ['gold','jade'] else .5)


def image_node(mat,path,noncolor=False):
    # Existing editable textures are read-only dependencies of isolated builds.
    if not path.exists():
        path=ROOT/'public/assets/textures/p0'/path.name
    node=mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.image=bpy.data.images.load(str(path),check_existing=True)
    if noncolor: node.image.colorspace_settings.name='Non-Color'
    return node


def artwork(name,file,paper=False):
    mat=material(name)
    nodes=mat.node_tree.nodes
    links=mat.node_tree.links
    bsdf=nodes.get('Principled BSDF')
    tex=image_node(mat,TEX/file)
    links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    if paper:
        n=image_node(mat,TEX/'paper-normal.png',True)
        normal=nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value=.32
        links.new(n.outputs['Color'],normal.inputs['Color'])
        links.new(normal.outputs['Normal'],bsdf.inputs['Normal'])
        rough=image_node(mat,TEX/'paper-roughness.png',True)
        links.new(rough.outputs['Color'],bsdf.inputs['Roughness'])
    mat['replaceable']=True
    mat['source_texture']=f'textures/p0/{file}'
    return mat


def kit_material(kit):
    mat=material('Kit_'+kit)
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    bsdf=nodes.get('Principled BSDF')
    for channel,input_name in [('basecolor','Base Color'),('roughness','Roughness'),
                               ('metallic','Metallic'),('emissive','Emission Color')]:
        node=image_node(mat,TEX/f'{kit}-{channel}.png',channel in ['roughness','metallic'])
        links.new(node.outputs['Color'],bsdf.inputs[input_name])
    node=image_node(mat,TEX/f'{kit}-normal.png',True)
    normal=nodes.new('ShaderNodeNormalMap')
    links.new(node.outputs['Color'],normal.inputs['Color'])
    links.new(normal.outputs['Normal'],bsdf.inputs['Normal'])
    bsdf.inputs['Emission Strength'].default_value=.3
    if kit=='glass':
        bsdf.inputs['Transmission Weight'].default_value=.55
        bsdf.inputs['IOR'].default_value=1.46
    mat['flow_mask']=f'textures/p0/{kit}-mask.png'
    mat['holographic_hook']='UV0 + mask; animate UV / hue in consumer shader'
    return mat


def active(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj


def assign(obj,mat):
    obj.data.materials.append(named(mat) if isinstance(mat,str) else mat)
    return obj


def cube(name,loc,scale,mat='red',bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=bpy.context.object
    obj.name=name
    obj.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=obj.modifiers.new('Crafted_edges','BEVEL')
        mod.width=bevel
        mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return assign(obj,mat)


def sphere(name,loc,scale,mat='gold',segments=24,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    obj=bpy.context.object
    obj.name=name
    obj.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in obj.data.polygons: p.use_smooth=True
    return assign(obj,mat)


def cylinder(name,loc,radius,depth,mat='gold',vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    obj=bpy.context.object
    obj.name=name
    mod=obj.modifiers.new('Rim_bevel','BEVEL')
    mod.width=min(.035,depth*.15)
    mod.segments=3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in obj.data.polygons: p.use_smooth=len(p.vertices)==4
    return assign(obj,mat)


def torus(name,loc,major,minor,mat='gold',rotation=(0,0,0),segments=64):
    bpy.ops.mesh.primitive_torus_add(major_segments=segments,minor_segments=10,
                                  major_radius=major,minor_radius=minor,location=loc,rotation=rotation)
    obj=bpy.context.object
    obj.name=name
    for p in obj.data.polygons:p.use_smooth=True
    return assign(obj,mat)


def mesh(name,verts,faces,mat='ivory'):
    data=bpy.data.meshes.new(name)
    data.from_pydata(verts,[],faces)
    data.update()
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    assign(obj,mat)
    uv=data.uv_layers.new(name='UV0')
    xs=[v[0] for v in verts]; ys=[v[1] for v in verts]
    w=max(xs)-min(xs) or 1; h=max(ys)-min(ys) or 1
    for p in data.polygons:
        for loop in p.loop_indices:
            co=data.vertices[data.loops[loop].vertex_index].co
            uv.data[loop].uv=((co.x-min(xs))/w,(co.y-min(ys))/h)
    return obj


def lathe(name,profile,mat='gold',segments=64):
    verts=[]
    for r,z in profile:
        verts.extend([(r*math.cos(math.tau*i/segments),r*math.sin(math.tau*i/segments),z)
                      for i in range(segments)])
    faces=[]
    for j in range(len(profile)-1):
        for i in range(segments):
            a=j*segments+i;b=j*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    obj=mesh(name,verts,faces,mat)
    # Cylindrical UV, with an explicit duplicated seam in loop space.
    for p in obj.data.polygons:
        for loop in p.loop_indices:
            vi=obj.data.loops[loop].vertex_index
            ring,col=divmod(vi,segments)
            col=segments if col==0 and p.index%segments==segments-1 else col
            obj.data.uv_layers.active.data[loop].uv=(col/segments,ring/(len(profile)-1))
        p.use_smooth=True
    return obj


def tube(name,points,radius=.025,mat='gold',sides=8):
    verts=[]
    for i,point in enumerate(points):
        p=Vector(point)
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        tangent.normalize()
        normal=tangent.cross(Vector((0,0,1)))
        if normal.length<.01:normal=tangent.cross(Vector((0,1,0)))
        normal.normalize();bitangent=tangent.cross(normal)
        for j in range(sides):
            verts.append(tuple(p+radius*(normal*math.cos(math.tau*j/sides)+bitangent*math.sin(math.tau*j/sides))))
    faces=[(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j)
           for i in range(len(points)-1) for j in range(sides)]
    obj=mesh(name,verts,faces,mat)
    for p in obj.data.polygons:p.use_smooth=True
    return obj


def cloud(name,x,y,z,size=.3,mat='gold',plane='xz'):
    pts=[]
    for i in range(41):
        a=math.pi*3*i/40
        r=size*(1-i/52)
        px,pz=x+r*math.cos(a),z+r*.55*math.sin(a)
        pts.append((px,y,pz) if plane=='xz' else (px,pz,y))
    return tube(name,pts,.018,mat)


def join(objects,name,min_tris=0):
    objects=[o for o in objects if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    obj=bpy.context.object
    obj.name=name
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    if min_tris:
        obj.data.calc_loop_triangles()
        if len(obj.data.loop_triangles)<min_tris:
            # Preserve silhouette while providing deformation-ready topology.
            mod=obj.modifiers.new('Topology_budget','SUBSURF')
            mod.subdivision_type='SIMPLE'
            mod.levels=1
            bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def geometry():return [o for o in bpy.context.scene.objects if o.type=='MESH']


def triangles(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def export(name,objects=None,animations=False):
    MODELS.mkdir(parents=True,exist_ok=True)
    objs=objects or geometry()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objs:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(MODELS/f'{name}.glb'),export_format='GLB',
        use_selection=True,export_yup=True,export_apply=False,
        # Post-export inspector bakes MikkTSpace only on Normal-mapped primitives.
        # Untextured procedural relief does not need tangent attributes.
        export_texcoords=True,export_normals=True,export_tangents=False,
        export_animations=animations,export_animation_mode='NLA_TRACKS',
        export_force_sampling=True,export_frame_range=False,export_extras=True,
        export_morph=True,export_morph_normal=True,
        export_image_format='AUTO',export_cameras=False,export_lights=False)
    return {'file':f'models/{name}.glb','triangles':sum(triangles(o) for o in objs),
            'nodes':[o.name for o in objs],'materials':sorted({m.name for o in objs for m in o.data.materials if m})}


def camera_render(name,objects=None,size=(640,640),camera=None,target=None,transparent=True,ortho_scale=None):
    TMP.mkdir(parents=True,exist_ok=True)
    objs=objects or geometry()
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=16
    scene.cycles.seed=0
    scene.cycles.device='CPU'
    scene.cycles.use_denoising=DENOISE
    scene.render.resolution_x,scene.render.resolution_y=size
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    scene.render.film_transparent=transparent
    scene.world=bpy.data.worlds.new('Cream_studio')
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.87,.82,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    scene.view_settings.view_transform='AgX'
    bpy.context.view_layer.update()
    coords=[o.matrix_world@Vector(corner) for o in objs for corner in o.bound_box]
    low=Vector(tuple(min(v[i] for v in coords) for i in range(3)))
    high=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
    center=(low+high)/2 if target is None else Vector(target)
    extent=max(high-low)
    bpy.ops.object.camera_add(location=Vector(camera) if camera else center+Vector((1.2,-2,1.1))*extent)
    cam=bpy.context.object
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'
    cam.data.ortho_scale=ortho_scale or extent*1.55
    scene.camera=cam
    lights=[]
    for offset,power,scale in [((-3,-4,6),750,5),((4,1,5),1000,4),((0,4,2),400,3)]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(offset))
        light=bpy.context.object
        light.data.energy=power
        light.data.shape='DISK'
        light.data.size=scale
        light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
        lights.append(light)
    scene.render.filepath=str(TMP/f'{name}.png')
    bpy.ops.render.render(write_still=True)
    RENDERS.append(name)
    for obj in [cam,*lights]: bpy.data.objects.remove(obj,do_unlink=True)
