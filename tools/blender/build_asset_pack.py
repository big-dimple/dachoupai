"""P0 editable geometry; isolated builds with Blender 4.3+ headless.

Run from any directory:
  blender --background --factory-startup --python-exit-code 1 \
    --python tools/blender/build_asset_pack.py -- --only prop-dice

See README.md for output roots, explicit font selection and full-section builds.
Sources are these scripts + procedural textures (no opaque .blend dependency).
GLB units: meters, Y up. Card/text face +Z; props/stage grounded at Y=0.
"""
from pathlib import Path
import argparse
import json
import math
import random
import subprocess
import sys

sys.path.insert(0,str(Path(__file__).resolve().parent))
sys.dont_write_bytecode=True
import bpy
import asset_geometry as g
import asset_config as config

ROOT=g.ROOT
FONT=None
FONT_INFO=None


def raster(phase):
    command=[config.raster_python(args.raster_python),str(Path(__file__).with_name('make_raster_assets.py')),
             '--phase',phase,'--output-root',str(args.output_root),'--review-root',str(args.review_root)]
    if FONT:command.extend(['--font',str(FONT)])
    if phase=='finish':
        for name in sorted(set(g.RENDERS)):command.extend(['--only',name])
    subprocess.run(command,check=True)


def record(item,purpose,category,**extra):
    global records
    item.update(purpose=purpose,category=category,**extra)
    records=[r for r in records if r['file']!=item['file']]+[item]
    write_manifest()
    print('ASSET_DONE',item['file'],item.get('triangles',''),flush=True)


def write_manifest():
    g.MODELS.mkdir(parents=True,exist_ok=True)
    data={'version':1,'units':'meters','up':'+Y','cardFront':'+Z',
          'source':'tools/blender/build_asset_pack.py',
          'copyright':'Original procedural geometry/art. Historical Noto Serif SC outlines: SIL OFL 1.1. Current font selection is recorded in build.font; no font files redistributed.',
          'materialHooks':{'mask':'UV0 grayscale; animate UV/hue for flow or holographic response',
                           'glass':'KHR_materials_transmission / IOR, opaque jade fallback'},
          'assets':sorted(records,key=lambda r:r['file'])}
    data['fontLicense']='https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE'
    data['build']={'blender':bpy.app.version_string,'selection':args.only or ['section:'+args.section],
                   'font':FONT_INFO,
                   'render':{'engine':'CYCLES','device':'CPU','samples':16,'seed':0,
                             'denoise':args.denoise,'previews':sorted(set(g.RENDERS))},
                   'postprocess':'NOT_RUN; inspector optimization is an explicit separate operation'}
    MANIFEST.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def deliver(name,purpose,category,min_tris=0,preview=True,objects=None,**extra):
    objects=objects or [g.join(g.geometry(),name,min_tris)]
    item=g.export(name,objects,animations=extra.pop('animations',False))
    record(item,purpose,category,**extra)
    if preview and not args.no_previews:g.camera_render(name,objects)
    return objects


def ring(name,w,h,width,z,mat='gold',depth=.02):
    # Rounded rectangular ring with real side walls and a replaceable open center.
    n=128
    verts=[]
    for zz in [z-depth/2,z+depth/2]:
        for inset in [0,width]:
            ww,hh=w/2-inset,h/2-inset
            radius=.13
            for i in range(n):
                quadrant=i//32
                a=math.pi/2*(quadrant+(i%32)/31)
                cx=(ww-radius)*(1 if quadrant in [0,3] else -1)
                cy=(hh-radius)*(1 if quadrant in [0,1] else -1)
                verts.append((cx+radius*math.cos(a),cy+radius*math.sin(a),zz))
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),
                      (i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
    return g.mesh(name,verts,faces,mat)


def grid(name,w,h,z,mat,nx=36,ny=52,reverse=False):
    verts=[]
    for j in range(ny+1):
        y=h*(j/ny-.5)
        max_x=w/2
        r=.12
        if abs(y)>h/2-r:
            max_x=w/2-r+math.sqrt(max(0,r*r-(abs(y)-(h/2-r))**2))
        for i in range(nx+1):verts.append((max_x*(2*i/nx-1),y,z))
    faces=[]
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i
            f=(a,a+1,a+nx+2,a+nx+1)
            faces.append(tuple(reversed(f)) if reverse else f)
    obj=g.mesh(name,verts,faces,mat)
    for p in obj.data.polygons:p.use_smooth=True
    if reverse:
        for uv in obj.data.uv_layers.active.data:uv.uv.x=1-uv.uv.x
    return obj


def card(name='Card',keys=True):
    front=grid('FrontArtwork',2,2.8,.014,g.artwork('FrontArtwork','card-front.png',True))
    back=grid('BackArtwork',2,2.8,-.014,g.artwork('BackArtwork','card-back.png',True),reverse=True)
    edge=ring('PaperEdge',2,2.8,.016,0,'ivory',.028)
    trim=ring('MetalTrim',1.95,2.75,.02,.02,'gold',.012)
    obj=g.join([front,back,edge,trim],name)
    obj.rotation_euler.x=math.pi/2
    g.active(obj)
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
    obj['replaceable_materials']='FrontArtwork, BackArtwork, gold'
    obj['uv']='UV0 (0..1); front/back separate material slots'
    obj['thickness_m']=.028
    if keys:
        obj.shape_key_add(name='Basis')
        for key in ['Bend','Twist','Arch']:
            sk=obj.shape_key_add(name=key)
            for vert in sk.data:
                x,y,z=vert.co
                if key=='Bend':
                    angle=z*.48
                    vert.co.y=y+.65*(1-math.cos(angle))
                    vert.co.z=math.sin(angle)/.48
                elif key=='Twist':
                    a=z*.22
                    vert.co.x=x*math.cos(a)-y*math.sin(a)
                    vert.co.y=x*math.sin(a)+y*math.cos(a)
                else:vert.co.y=y+.22*x*x
        obj.active_shape_key_index=0
        obj.data.update()
    return obj


def build_s():
    raster('textures')
    g.reset(); obj=card('PokerCardMaster')
    deliver('poker-card-master','带纸张 PBR、双面 UV、金边和 Bend/Twist/Arch 形态键的可换卡面母版','card',
            objects=[obj],morphTargets=['Bend','Twist','Arch'])
    if not args.no_previews:
        for key in obj.data.shape_keys.key_blocks:key.value=0
        obj.data.update()
        g.camera_render('poker-card-back',[obj],camera=(2,6,3),target=(0,0,0))
    for tier,color,label in [('common','bamboo','普通'),('rare','jade','稀有'),('epic','purple','史诗'),
                             ('legendary','red','传说'),('special','jade','特殊')]:
        g.reset()
        # Dense backing is deformation-ready; frame and artwork remain separate nodes.
        backing=grid('Backing',2,2.8,-.02,'ivory',28,40)
        back=grid('Back',2,2.8,-.05,g.artwork('BackArtwork','card-back.png',True),28,40,reverse=True)
        ring('FrameOuter',2.1,2.9,.16,0,color,.075)
        ring('FrameGold',2.08,2.88,.028,.054,'gold',.022)
        ring('FrameInner',1.81,2.6,.035,.062,'gold',.015)
        if tier!='common':
            for x in [-.91,.91]:
                for y in [-1.27,1.27]:
                    g.sphere('JadeSet',(x,y,.08),(.085,.085,.035),color,16,8)
                    g.cloud('CloudCorner',x,.15,y,.12,'gold','xy')
        if tier in ['epic','legendary','special']:
            for i in range(9):
                x=(i-4)*.105
                jewel=g.cube('Crown',(x,1.43+.12*math.cos(x*4),.04),(.09,.13,.05),'gold',.015)
                jewel.rotation_euler.z=math.pi/4
        if tier=='special':
            ring('HolographicReserve',2.02,2.82,.065,.075,g.kit_material('holographic'),.012)
        frame=g.join(g.geometry(),f'Frame_{tier}')
        art=grid('ReplaceableIllustration',1.72,2.45,.085,g.artwork('JokerIllustration','joker-artwork.png'),18,24)
        for obj in [frame,art]:
            obj.rotation_euler.x=math.pi/2
            g.active(obj);bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
        frame['rarity']=tier
        frame['shader_reserves']='textures/p0/holographic-mask.png; Emissive, Holographic, UV flow'
        deliver('joker-frame-'+tier,f'{label}大丑牌卡框；独立插画节点可换图，边框节点可整套替换','card',
                objects=[frame,art],replaceableNodes=[frame.name,art.name])
    g.reset()
    for i,kit in enumerate(['holographic','glass','gilded']):
        g.sphere(kit,(i*1.5-1.5,0,.8),(.6,.6,.6),g.kit_material(kit),40,24)
        g.cylinder('Plinth',(i*1.5-1.5,0,.06),.7,.12,'ivory')
    deliver('material-kit','Holographic / 琉璃 / 鎏金 PBR 示例球，18 张独立通道纹理可复用','material')


def coin():
    n=64;verts=[]
    for z in [.015,.095]:
        for outer in [True,False]:
            for i in range(n):
                a=math.tau*i/n
                r=.48 if outer else .14/max(abs(math.cos(a)),abs(math.sin(a)))
                verts.append((r*math.cos(a),r*math.sin(a),z))
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,n+i,n+j,j),(2*n+i,2*n+j,3*n+j,3*n+i),
                      (i,j,2*n+j,2*n+i),(n+i,3*n+i,3*n+j,n+j)])
    g.mesh('Square_hole_cash',verts,faces,'gold')
    g.torus('CoinLip',(0,0,.105),.445,.017)
    for a in [0,math.pi/2,math.pi,math.pi*1.5]:
        g.cloud('Cash_relief',.3*math.cos(a),.12,.3*math.sin(a),.075,'gold','xy')


def ingot():
    # Concave boat-shaped sycee: top bowl rim + pointed rising ends.
    obj=g.lathe('Sycee',[(0,.03),(.23,.03),(.40,.12),(.5,.24),(.48,.30),(.36,.24),(.23,.22),(0,.22)],'gold',64)
    obj.scale=(1.6,.8,1)
    for x in [-.63,.63]:g.sphere('UpturnedEnds',(x,0,.32),(.19,.26,.17),'gold')
    g.sphere('GoldHeart',(0,0,.27),(.34,.20,.15),'gold')


def jade_plaque():
    g.cube('JadePlaque',(0,0,.1),(.72,1.03,.16),'jade',.09)
    for y in [-.35,.35]:g.cloud('CloudCarving',0,.20,y,.21,'gold','xy')
    g.torus('PendantLoop',(0,.60,.1),.12,.025,'gold',(math.pi/2,0,0),32)
    g.tube('RedCord',[(0,.65,.11),(.1,.85,.13),(-.1,1,.13),(0,1.1,.13)],.023,'red')
    for i in range(7):g.tube('Tassel',[(.025*(i-3),-.56,.11),(.04*(i-3),-.83,.08)],.012,'red')


def dice():
    g.cube('IvoryDie',(0,0,.42),(.8,.8,.8),'ivory',.085)
    layouts={1:[(0,0)],2:[(-1,-1),(1,1)],3:[(-1,-1),(0,0),(1,1)],
             4:[(-1,-1),(1,-1),(-1,1),(1,1)],5:[(-1,-1),(1,-1),(0,0),(-1,1),(1,1)],
             6:[(-1,-1),(1,-1),(-1,0),(1,0),(-1,1),(1,1)]}
    # Opposite sides sum to seven; lacquer inset pips, no gameplay randomness.
    for face,value in enumerate([1,6,2,5,3,4]):
        for x,y in layouts[value]:
            p=[x*.18,y*.18,.403]
            if face==0:loc=(p[0],p[1],.42+p[2]);scale=(.05,.05,.012)
            elif face==1:loc=(p[0],p[1],.42-p[2]);scale=(.05,.05,.012)
            elif face==2:loc=(p[0],-p[2],.42+p[1]);scale=(.05,.012,.05)
            elif face==3:loc=(p[0],p[2],.42+p[1]);scale=(.05,.012,.05)
            elif face==4:loc=(p[2],p[0],.42+p[1]);scale=(.012,.05,.05)
            else:loc=(-p[2],p[0],.42+p[1]);scale=(.012,.05,.05)
            g.sphere('Pip',loc,scale,'red' if value==1 else 'ink',12,6)


def seal():
    g.cube('CinnabarBase',(0,0,.14),(.64,.64,.28),'red',.04)
    g.cube('SealFoot',(0,0,.025),(.66,.66,.05),'gold',.014)
    g.cube('JadeHandle',(0,0,.38),(.40,.40,.3),'jade',.07)
    g.torus('Grip',(0,0,.66),.16,.052,'jade',(math.pi/2,0,0),40)
    for x in [-.22,.22]:g.cloud('SealGlyph',x,-.327,.15,.09)


def bell():
    g.lathe('HollowBell',[(.37,.04),(.39,.08),(.34,.16),(.30,.31),(.22,.51),(.10,.61),
                        (.03,.61),(.06,.55),(.16,.48),(.24,.30),(.29,.12),(.34,.05),(.37,.04)])
    g.torus('Lip',(0,0,.06),.36,.035)
    g.torus('Suspension',(0,0,.70),.11,.028,'gold',(math.pi/2,0,0),32)
    g.sphere('Clapper',(0,0,.12),(.07,.07,.07),'ink',16,8)
    g.cloud('BellRelief',0,-.285,.32,.16)


def mask():
    g.sphere('JadeOperaFace',(0,0,.65),(.47,.16,.60),'ivory',40,24)
    for x in [-.21,.21]:
        eye=g.sphere('RedEyePaint',(x,-.155,.77),(.14,.035,.07),'red',20,10)
        eye.rotation_euler.y=math.copysign(.25,x)
        g.tube('Brow',[(x-.12,-.16,.91),(x,-.20,.99),(x+.12,-.16,.93)],.035,'ink')
    g.sphere('Nose',(0,-.19,.62),(.07,.09,.12),'gold',16,8)
    g.tube('Smile',[(-.18,-.14,.40),(0,-.185,.34),(.18,-.14,.40)],.026,'red')
    g.cloud('Forehead',0,-.14,1.09,.16)
    g.tube('Strap',[(-.46,0,.65),(-.36,.23,.65),(.36,.23,.65),(.46,0,.65)],.018,'red')


def fan():
    count=14;verts=[];faces=[]
    for j,r in enumerate([.15,.35,.65,.94,1.04]):
        for i in range(count+1):
            a=math.radians(20+140*i/count)
            verts.append((r*math.cos(a),r*math.sin(a),.07+.018*(-1)**i))
    for j in range(4):
        for i in range(count):
            a=j*(count+1)+i;faces.append((a,a+1,a+count+2,a+count+1))
    obj=g.mesh('PleatedFan',verts,faces,'ivory')
    mod=obj.modifiers.new('PaperThickness','SOLIDIFY');mod.thickness=.014
    g.active(obj);bpy.ops.object.modifier_apply(modifier=mod.name)
    for i in range(count+1):
        a=math.radians(20+140*i/count)
        g.tube('BambooRib',[(0,0,.06),(math.cos(a)*1.06,math.sin(a)*1.06,.06)],.018,'wood')
    g.cylinder('Pivot',(0,0,.06),.06,.03,'gold',24)
    for x in [-.35,0,.35]:g.cloud('FanCloud',x,.10,.65,.14,'jade','xy')


def gong(small=False):
    radius=.36 if small else .62
    g.lathe('HammeredGong',[(0,.08),(radius*.2,.08),(radius*.35,.06),(radius*.76,.045),
                          (radius,.09),(radius,.12),(radius*.76,.07),(radius*.35,.09),(0,.11)],'gold')
    g.torus('GongRim',(0,0,.11),radius,.025)
    g.cylinder('Boss',(0,0,.11),radius*.18,.1,'gold',32)
    g.tube('Mallet',[(radius+.1,-.3,.06),(radius+.1,.3,.06)],.03,'wood')
    g.sphere('MalletHead',(radius+.1,.28,.06),(.09,.06,.05),'red',16,8)


def bowl():
    g.lathe('WineBowl',[(0,.04),(.19,.04),(.22,.09),(.30,.19),(.41,.32),(.40,.35),
                       (.37,.32),(.26,.20),(.17,.10),(0,.10)],'ivory')
    g.torus('JadeRim',(0,0,.34),.395,.021,'jade')
    g.cylinder('Wine',(0,0,.23),.295,.008,'purple')
    g.torus('Foot',(0,0,.055),.19,.026,'jade')


def talisman():
    obj=grid('RicePaper',.55,1.2,.035,'ivory',18,28)
    for v in obj.data.vertices:v.co.z+=.02*math.sin(v.co.y*7)
    g.cube('RedSeal',(0,.40,.075),(.21,.21,.025),'red',.01)
    for j in range(7):
        y=.19-j*.105
        g.tube('HandwrittenSigil',[(-.14,y,.073),(0,y+.04,.075),(.12,y-.01,.075),(-.03,y-.055,.073)],.009,'red')


PROPS=[('coin',coin,'铜钱：方孔铜钱与浮雕云纹，奖励粒子/掉落'),
       ('gold-ingot',ingot,'金锭：元宝舟形凹面，金币与爆分奖励'),
       ('jade-plaque',jade_plaque,'玉牌：玉青牌身、金纹与红穗，稀有奖励'),
       ('dice',dice,'骰子：米白圆角、六面标准点数，骰爷演出'),
       ('seal',seal,'印章：朱红印座与玉柄，确认/命中演出'),
       ('bell',bell,'铜铃：中空铃身、悬环和铃舌，触发连锁'),
       ('opera-mask',mask,'面具：原创玉色戏曲面具，角色身份演出'),
       ('fan',fan,'扇子：折纸扇面与竹骨，借东风演出'),
       ('small-gong',lambda:gong(True),'小锣：金属锣面与槌，命中反馈'),
       ('wine-bowl',bowl,'酒碗：米白釉面玉青口沿，市井舞台道具'),
       ('talisman',talisman,'纸符：微卷纸张与原创朱砂符线，施法粒子')]


def build_props():
    for name,fn,purpose in PROPS:
        if args.only and 'prop-'+name not in args.only:continue
        g.reset();fn()
        deliver('prop-'+name,purpose,'prop',500)


def text_mesh(word):
    curve=bpy.data.curves.new('NotoSerifSC_OFL','FONT')
    curve.body=word
    curve.font=bpy.data.fonts.load(str(FONT))
    curve.align_x='CENTER';curve.align_y='CENTER'
    curve.size=1;curve.extrude=.055;curve.bevel_depth=.012
    curve.bevel_resolution=1;curve.resolution_u=3
    obj=bpy.data.objects.new('RaisedWord',curve)
    bpy.context.collection.objects.link(obj)
    g.assign(obj,'gold');g.active(obj);bpy.ops.object.convert(target='MESH')
    obj=bpy.context.object
    obj.rotation_euler.x=math.pi/2
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
    center_z=(min(v.co.z for v in obj.data.vertices)+max(v.co.z for v in obj.data.vertices))/2
    for vert in obj.data.vertices:vert.co.z-=center_z
    return obj


WORDS=[('times-2','×2'),('times-4','×4'),('critical','暴击'),('full-house','满堂彩'),
       ('east-wind','借东风'),('out-of-control','全场失控'),('good-fortune','大吉'),('double','翻倍')]


def build_words():
    for name,word in WORDS:
        if args.only and 'word-'+name not in args.only:continue
        g.reset();obj=text_mesh(word)
        bpy.context.view_layer.update()
        width=obj.dimensions.x
        height=obj.dimensions.z
        # Red theatrical sign behind embossed gilt lettering.
        g.cube('RedSign',(0,.105,0),(width+.26,.07,height+.27),'red',.055)
        for x in [-width/2-.04,width/2+.04]:g.cloud('SignCloud',x,-.10,0,.16)
        deliver('word-'+name,f'爆分词「{word}」：立体鎏金字与朱红底牌，可整体缩放/换材质','word')


def roof(width=4,depth=1.8,z=3):
    # Curved, upturned jade eaves; front and back are truly volumetric.
    verts=[]
    nx,ny=28,8
    for j in range(ny+1):
        y=depth*(j/ny-.5)
        for i in range(nx+1):
            x=width*(i/nx-.5)
            zz=z+.24*(1-abs(y)/(depth/2))+.23*(abs(x)/(width/2))**4
            verts.append((x,y,zz))
    faces=[]
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
    obj=g.mesh('JadeRoof',verts,faces,'jade')
    mod=obj.modifiers.new('RoofThickness','SOLIDIFY');mod.thickness=.11
    g.active(obj);bpy.ops.object.modifier_apply(modifier=mod.name)
    for y in [-depth/2,depth/2]:
        pts=[(-width/2+width*i/40,y,z+.23*(abs(-1+2*i/40))**4) for i in range(41)]
        g.tube('GiltEaves',pts,.04)
    for i in range(19):
        x=width*(i/18-.5)
        g.tube('RoofRidge',[(x,-depth/2,z+.025+.23*(abs(x)/(width/2))**4),
                          (x,0,z+.265+.23*(abs(x)/(width/2))**4),
                          (x,depth/2,z+.025+.23*(abs(x)/(width/2))**4)],.022,'bamboo')


def arch(neon=False):
    for x in [-1.4,1.4]:
        g.cylinder('RedPillar',(x,0,1.3),.13,2.6,'red')
        for z in [.13,.35,2.40]:g.cylinder('GoldCollar',(x,0,z),.16,.10)
        g.cube('StoneFoot',(x,0,.12),(.48,.5,.24),'ivory',.04)
    g.cube('Crossbeam',(0,0,2.45),(3.5,.35,.22),'red')
    g.cube('SignBoard',(0,-.19,2.56),(1.05,.12,.36),'ivory')
    for x in [-.30,0,.30]:g.cloud('SignCarving',x,-.263,2.54,.10)
    roof(3.9,1.25,2.8)
    if neon:
        jadeglow=g.material('Jade_neon',(.12,.7,.5,1),emission=3)
        purpleglow=g.material('Purple_neon',(.47,.12,.53,1),emission=2)
        for x in [-1.24,1.24]:
            g.tube('NeonColumn',[(x,-.22,.35),(x,-.22,2.3)],.025,jadeglow)
        g.tube('NeonRuyi',[(-1.8,-.7,2.85),(-.9,-.7,2.8),(0,-.7,3.01),(.9,-.7,2.8),(1.8,-.7,2.85)],.028,purpleglow)
        for x in [-.65,.65]:
            g.torus('NeonHalo',(x,-.25,2.64),.16,.018,jadeglow,(math.pi/2,0,0),32)


def stage():
    g.cube('RaisedStage',(0,0,.20),(4.8,3,.4),'wood',.10)
    g.cube('IvoryApron',(0,-1.49,.24),(4.6,.08,.27),'ivory',.02)
    for x in [-1.85,-1.3,-.65,0,.65,1.3,1.85]:g.cloud('ApronRuyi',x,-1.54,.24,.20)
    for x in [-2.05,2.05]:
        g.cylinder('StageColumn',(x,.7,1.65),.14,2.5,'red')
        for z in [.48,2.8]:g.cylinder('ColumnCap',(x,.7,z),.20,.13)
    for i in range(9):g.cube('FloorPlank',(-2.08+i*.52,0,.425),(.50,2.95,.05),'bamboo',.01)
    for i in range(3):g.cube('Stair',(0,-1.65-i*.24,.08+(2-i)*.07),(1.7,.28,.16+(2-i)*.14),'wood')
    roof(4.9,2,3.05)


def screen():
    for panel in range(3):
        x=(panel-1)*.85
        g.cube('ScreenFrame',(x,0,1.2),(.8,.13,2.3),'wood')
        g.cube('RicePaperPanel',(x,-.078,1.25),(.65,.022,2.06),'ivory',.01)
        for xx in [-.29,.29]:g.cube('GiltUpright',(x+xx,-.095,1.26),(.026,.023,2.1),'gold',.006)
        for z in [.42,1.35,2.15]:g.cloud('CloudInk',x,-.103,z,.21,'jade')
        for z in [1.85,1.99,2.12]:g.cube('Lattice',(x,-.11,z),(.64,.02,.018),'gold',.004)
        for xx in [-.2,0,.2]:g.cube('Lattice',(x+xx,-.11,1.99),(.018,.02,.4),'gold',.004)
        for xx in [-.28,.28]:g.cube('ScreenFoot',(x+xx,0,.1),(.13,.40,.20),'wood')


def lantern():
    g.sphere('SilkLantern',(0,0,1.1),(.50,.50,.67),'red',48,24)
    for z in [.50,1.7]:g.cylinder('LanternCap',(0,0,z),.22,.08,'gold')
    for i in range(12):
        a=math.tau*i/12
        pts=[]
        for j in range(21):
            b=math.pi*j/20
            r=.48*math.sin(b)
            pts.append((r*math.cos(a),r*math.sin(a),1.1+.63*math.cos(b)))
        g.tube('GoldRib',pts,.015)
    g.torus('HangingLoop',(0,0,1.84),.10,.023,'gold',(math.pi/2,0,0),32)
    for i in range(9):g.tube('SilkTassel',[(.016*(i-4),0,.46),(.028*(i-4),0,.08)],.01,'red')


def big_gong():
    gong()
    obj=g.join(g.geometry(),'SuspendedGong')
    obj.rotation_euler.x=math.pi/2
    obj.location=(0,.04,1.25)
    for x in [-.90,.90]:
        g.cube('GongStand',(x,0,.91),(.12,.14,1.82),'red')
        g.cube('StandFoot',(x,0,.06),(.44,.48,.12),'wood')
    g.cube('StandBeam',(0,0,1.85),(2.1,.17,.14),'red')
    for x in [-.38,.38]:g.tube('GongTie',[(x,0,1.77),(x,0,1.72)],.017,'gold')


def drum():
    g.lathe('BarrelDrum',[(0,.45),(.58,.45),(.67,.60),(.71,.84),(.67,1.08),(.58,1.2),(0,1.2)],'red')
    for z in [.45,1.2]:
        g.cylinder('DrumHead',(0,0,z),.59,.035,'ivory')
        g.torus('DrumHoop',(0,0,z),.60,.026,'gold')
        for i in range(16):
            a=math.tau*i/16
            g.sphere('Stud',(.61*math.cos(a),.61*math.sin(a),z-.04),(.018,.018,.018),'gold',8,4)
    for x in [-.42,.42]:
        leg=g.cube('DrumLeg',(x,0,.22),(.1,.42,.6),'wood');leg.rotation_euler.y=math.copysign(.25,x)
    for x in [-.16,.16]:g.tube('DrumStick',[(x,-.3,1.25),(x,.35,1.25)],.023,'wood')


def drape():
    w,h=2.2,2.6;nx,ny=36,22
    verts=[(w*(i/nx-.5),.09*math.sin(i/nx*math.tau*7),h*j/ny+.06*math.sin(i/nx*math.pi))
           for j in range(ny+1) for i in range(nx+1)]
    faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i)
           for j in range(ny) for i in range(nx)]
    obj=g.mesh('SilkDrape',verts,faces,'red')
    mod=obj.modifiers.new('TwoSidedSilk','SOLIDIFY');mod.thickness=.014
    g.active(obj);bpy.ops.object.modifier_apply(modifier=mod.name)
    for z in [.09,2.55]:g.tube('GoldHem',[(w*(i/50-.5),-.02+.09*math.sin(i/50*math.tau*7),z) for i in range(51)],.02)
    g.cylinder('CurtainRod',(0,0,2.68),.045,2.5,'wood').rotation_euler.y=math.pi/2


def censer():
    g.lathe('BronzeCenser',[(0,.25),(.28,.25),(.42,.40),(.47,.6),(.40,.67),(.35,.68),(.39,.60),(.34,.43),(0,.35)],'gold')
    for a in [0,math.tau/3,math.tau*2/3]:
        g.sphere('Tripod',(.28*math.cos(a),.28*math.sin(a),.20),(.08,.08,.20),'gold',20,10)
    for x in [-.50,.50]:g.torus('CenserHandle',(x,0,.52),.14,.04,'gold',(math.pi/2,0,0),32)
    g.cylinder('IncenseAsh',(0,0,.57),.34,.02,'ivory')
    for x in [-.09,0,.09]:
        g.tube('IncenseStick',[(x,0,.58),(x,0,1.06)],.009,'wood')
        g.sphere('Ember',(x,0,1.06),(.015,.015,.015),'red',8,4)


def furniture():
    g.cube('TableTop',(0,0,.98),(1.65,.9,.13),'wood',.055)
    for x in [-.65,.65]:
        for y in [-.3,.3]:g.cube('TableLeg',(x,y,.48),(.11,.11,.96),'red')
    g.cube('TableApron',(0,-.33,.80),(1.5,.09,.18),'red')
    for x in [-.42,0,.42]:g.cloud('ApronGold',x,-.39,.80,.14)
    for x in [-1.18,1.18]:
        g.cube('ChairSeat',(x,0,.48),(.62,.62,.1),'wood')
        for dx in [-.22,.22]:
            for y in [-.22,.22]:g.cube('ChairLeg',(x+dx,y,.25),(.07,.07,.50),'red')
            g.cube('ChairBackPost',(x+dx,.22,.87),(.07,.07,.76),'wood')
        g.cube('ChairCrest',(x,.22,1.15),(.61,.08,.14),'wood')
        g.cloud('ChairCarving',x,.17,.96,.16)


def jar():
    g.lathe('WineJar',[(0,.04),(.32,.04),(.50,.30),(.55,.65),(.46,.94),(.26,1.12),(.26,1.24),
                     (.23,1.24),(.23,1.13),(.41,.93),(.50,.65),(.44,.32),(.28,.10),(0,.10)],'purple')
    g.cylinder('ClothLid',(0,0,1.26),.28,.08,'red')
    for z in [1.18,1.28]:g.torus('LidTie',(0,0,z),.28,.018,'gold')
    g.cube('RiceLabel',(0,-.533,.65),(.40,.025,.46),'ivory',.035)
    g.cloud('LabelRuyi',0,-.55,.65,.16,'red')


def cloud_plinth():
    g.cube('JadePlatform',(0,0,.16),(3.8,2.2,.32),'jade',.15)
    g.cube('IvoryTop',(0,0,.34),(3.65,2.05,.10),'ivory',.12)
    for x in [-1.35,-.67,0,.67,1.35]:g.cloud('CloudFrieze',x,-1.12,.20,.25)
    for y in [-.58,.10,.65]:g.cloud('TopCloud',0,.41,y,.6,'gold','xy')


STAGES=[('stage',stage,'戏台：朱红柱、玉青瓦、云纹台裙与木阶'),
        ('screen',screen,'屏风：三折米白纸屏、金格与玉色云纹'),
        ('wood-arch',arch,'木质牌坊：飞檐、朱柱、金箍，可模块拼接'),
        ('lantern',lantern,'灯笼：朱红丝灯、金骨、吊环和穗'),
        ('gong',big_gong,'铜锣：悬挂锣面、红木架与锣槌'),
        ('drum',drum,'鼓：朱红鼓身、米白鼓皮、金钉与鼓架'),
        ('drape',drape,'布幔：带褶皱的双面朱红丝帘与金边'),
        ('censer',censer,'香炉：三足鎏金炉、双耳和香条'),
        ('table-chairs',furniture,'桌椅：云纹红木桌与成对靠背椅'),
        ('wine-jar',jar,'酒坛：绛紫釉、红布盖与米白标签'),
        ('cloud-plinth',cloud_plinth,'云纹地台：玉青基座与米白台面'),
        ('neon-arch',lambda:arch(True),'未来东方霓虹牌坊：传统飞檐加玉青/绛紫自发光管')]


def build_stage():
    for name,fn,purpose in STAGES:
        if args.only and 'stage-'+name not in args.only:continue
        g.reset();fn()
        deliver('stage-'+name,purpose,'stage',2000)


CLIPS=[('flip','翻牌'),('draw','抽牌'),('throw','扔牌'),('bounce','弹起'),('spin','旋转'),
       ('bend','弯曲'),('knock-away','被击飞'),('split','裂开'),('burn','燃烧'),
       ('ink','化墨'),('gold-dust','化金粉')]


def nla(owner,clip):
    data=owner.animation_data
    action=data.action
    action.name=clip+'__'+owner.name
    track=data.nla_tracks.new();track.name=clip
    strip=track.strips.new(clip,1,action)
    strip.action_frame_start=1;strip.action_frame_end=31
    strip.frame_start=1;strip.frame_end=31
    data.action=None
    track.mute=True


def animate_object(obj,clip,samples):
    for frame,loc,rot,scale in samples:
        obj.location=loc;obj.rotation_euler=rot;obj.scale=scale
        for path in ['location','rotation_euler','scale']:obj.keyframe_insert(path,frame=frame)
    nla(obj,clip)


def build_animations():
    g.reset();base=card('AnimatedCard')
    fragments=[]
    for row in range(4):
        for col in range(2):
            x,y=(col-.5), (row-1.5)*.7
            face=grid('Fragment',1,.7,.014,g.artwork('FrontArtwork','card-front.png',True),6,8)
            # Keep source UVs in the appropriate portion of the full card.
            for uv in face.data.uv_layers.active.data:uv.uv=(uv.uv.x*.5+col*.5,uv.uv.y*.25+row*.25)
            face.rotation_euler.x=math.pi/2
            g.active(face);bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
            face.location=(x,0,y)
            g.active(face);bpy.ops.object.transform_apply(location=True,rotation=False,scale=False)
            face.name=f'Fragment_{row}_{col}'
            fragments.append(face)
    particles={'burn':[],'ink':[],'gold-dust':[]}
    for kind,count in [('burn',12),('ink',12),('gold-dust',24)]:
        for i in range(count):
            mat=g.material('Fire',(.95,.22,.025,1),emission=2.5) if kind=='burn' else 'ink' if kind=='ink' else 'gold'
            obj=g.sphere(f'{kind}_{i:02}',(0,0,0),(.04,.04,.12) if kind=='burn' else (.035,.035,.035),mat,8,4)
            particles[kind].append(obj)
    all_secondary=fragments+[o for p in particles.values() for o in p]
    rng=random.Random(73091)
    starts={obj.name:(rng.uniform(-.85,.85),rng.uniform(-.02,.02),rng.uniform(-1.2,1.2)) for obj in all_secondary}
    bpy.context.scene.render.fps=30
    bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=31
    for clip,label in CLIPS:
        samples=[]
        for frame in [1,6,12,18,24,31]:
            t=(frame-1)/30
            loc=[0,0,0];rot=[0,0,0];scale=[1,1,1]
            if clip=='flip':rot[2]=math.pi*t
            elif clip=='draw':loc=[-2.4*(1-t),.45*math.sin(math.pi*t),-.65*(1-t)];rot[1]=-.3*(1-t)
            elif clip=='throw':loc=[3*t,0,2*math.sin(math.pi*t)-t];rot[1]=t*2.6;rot[2]=t*1.1
            elif clip=='bounce':loc[2]=.9*math.sin(math.pi*t)*(1-t*.4);scale=[1-.12*math.sin(t*math.tau),1,1+.08*math.sin(t*math.tau)]
            elif clip=='spin':rot[2]=t*math.tau
            elif clip=='knock-away':loc=[4*t*t,0,1.8*t];rot=[t*3,t*4,t*5]
            elif clip in ['split','burn','ink','gold-dust']:
                s=1 if t<.16 else max(0,1-(t-.16)*4)
                scale=[s,s,s]
            samples.append((frame,loc,rot,scale))
        animate_object(base,clip,samples)
        keys=base.data.shape_keys
        for frame in [1,6,12,18,24,31]:
            t=(frame-1)/30
            for key in ['Bend','Twist','Arch']:
                value=math.sin(math.pi*t) if clip=='bend' and key=='Bend' else .35*math.sin(math.pi*t) if clip=='bend' else 0
                keys.key_blocks[key].value=value
                keys.key_blocks[key].keyframe_insert('value',frame=frame)
        nla(keys,clip)
        for i,obj in enumerate(all_secondary):
            samples=[]
            for frame in [1,6,12,18,24,31]:
                t=(frame-1)/30
                loc=[0,0,0];rot=[0,0,0];scale=[0,0,0]
                if clip=='split' and obj in fragments:
                    k=fragments.index(obj)
                    u=max(0,(t-.16)/.84)
                    loc=[(-1 if k%2==0 else 1)*u*1.5,0,(k//2-1.5)*u*.5]
                    rot=[0,u*(k-3.5)*.6,u*(k-3.5)*.4]
                    scale=[1 if t>=.16 else 0]*3
                elif clip in particles and obj in particles[clip]:
                    k=particles[clip].index(obj)
                    sx,sy,sz=starts[obj.name]
                    u=max(0,(t-.16)/.84)
                    a=k*2.399
                    loc=[sx+math.cos(a)*u*(.45 if clip=='burn' else 2),sy-.08-u*.3,
                         sz+u*(1.8 if clip=='burn' else math.sin(a)*2)]
                    rot=[u*k,u*2,u*3]
                    s=math.sin(math.pi*u)*1.4 if t>=.16 else 0
                    scale=[s,s,s]
                samples.append((frame,loc,rot,scale))
            animate_object(obj,clip,samples)
    # Muted tracks prevent accidental stack blending. Exporter evaluates each named track.
    base.location=(0,0,0);base.rotation_euler=(0,0,0);base.scale=(1,1,1)
    for key in base.data.shape_keys.key_blocks:key.value=0
    for obj in all_secondary:
        obj.location=(0,0,0);obj.rotation_euler=(0,0,0);obj.scale=(0,0,0)
    deliver('card-animation-templates','11 条具名 30fps 卡牌演出；独立可播放，形态键弯曲、裂片与燃烧/墨/金粒子均烘焙在 GLB','animation',
            objects=[base,*all_secondary],animations=True,clips=[{'name':name,'purpose':label,'seconds':1,'fps':30} for name,label in CLIPS],preview=False)
    if not args.no_previews:
        for clip,label in CLIPS:
            for obj in [base,*all_secondary]:
                for tr in obj.animation_data.nla_tracks:tr.mute=tr.name!=clip
            for tr in base.data.shape_keys.animation_data.nla_tracks:tr.mute=tr.name!=clip
            bpy.context.scene.frame_set(18)
            visible=[o for o in [base,*all_secondary] if max(o.scale)>.01]
            g.camera_render('animation-'+clip,visible)
        for obj in [base,*all_secondary]:
            for tr in obj.animation_data.nla_tracks:tr.mute=True
        for tr in base.data.shape_keys.animation_data.nla_tracks:tr.mute=True


def background_layer(layer):
    g.reset()
    if layer=='far':
        # Opaque distant sky, warm sun, stylized bamboo/jade mountains.
        g.cube('IvorySky',(0,5,3),(28,.1,17),'ivory',0)
        sun=g.cylinder('GoldSun',(-5,4.8,4.9),1.0,.035,'gold',96)
        sun.rotation_euler.x=math.pi/2
        for depth in range(3):
            verts=[(-14,4.5-depth*.3,-1)]
            for i in range(29):
                x=-14+i
                z=1.0+depth*.30+.55*math.sin(i*.4+depth)+.40*math.sin(i*.91)
                verts.append((x,4.5-depth*.3,z))
            verts.append((14,4.5-depth*.3,-1))
            g.mesh('DistantMountains',verts,[tuple(range(len(verts)))],
                   g.material('Mountain'+str(depth),(.28+.1*depth,.50+.07*depth,.36+.06*depth,1),rough=1))
        for x in [-7,-3,3,7]:g.cloud('SkyRuyi',x,4,4.1,.7)
        g.cube('FarFloor',(0,0,-.15),(28,18,.2),'ivory',0)
    elif layer=='mid':
        cloud_plinth()
        platform=g.join(g.geometry(),'CenterFloor');platform.scale=(2.3,2.8,1)
        # Side pavilions make an open, readable center for both UI scenes.
        for x in [-6.4,6.4]:
            before=set(g.geometry());stage();new=[o for o in g.geometry() if o not in before]
            obj=g.join(new,'SideStage');obj.scale=(.78,.78,.78);obj.location=(x,1.7,0)
        for x in [-3.2,3.2]:
            before=set(g.geometry());screen();new=[o for o in g.geometry() if o not in before]
            obj=g.join(new,'BackScreen');obj.scale=(.75,.75,.75);obj.location=(x,2.6,0)
        for x in [-4.5,4.5]:
            before=set(g.geometry());lantern();new=[o for o in g.geometry() if o not in before]
            obj=g.join(new,'HangingLantern');obj.scale=(.7,.7,.7);obj.location=(x,1.4,2.8)
    else:
        for x in [-8.3,8.3]:
            before=set(g.geometry());drape();new=[o for o in g.geometry() if o not in before]
            obj=g.join(new,'NearCurtain');obj.scale=(1.1,1,2.2);obj.location=(x,-1.5,-.2)
        for x,fn in [(-6.5,drum),(6.5,jar)]:
            before=set(g.geometry());fn();new=[o for o in g.geometry() if o not in before]
            obj=g.join(new,'NearProp');obj.location=(x,-3.7,0)
        g.cube('ForegroundRail',(0,-4.4,-.25),(18,.35,.48),'red')
        for x in range(-8,9,2):g.cloud('RailRuyi',x,-4.61,-.13,.50)
    bpy.context.view_layer.update()
    g.camera_render('background-'+layer,size=(1920,1080),camera=(0,-13,8.5),target=(0,1.5,1.3),transparent=layer!='far',ortho_scale=18)


def build_b():
    raster('b')
    for layer in ['far','mid','near']:background_layer(layer)


def register_rasters():
    # Asset inventory is not proof of runtime use. Review images never belong here.
    paths=[]
    for folder in ['textures/p0','renders/p0','sprites/p0']:
        paths.extend((args.output_root/folder).glob('*'))
    for path in sorted(paths):
        file=path.relative_to(args.output_root).as_posix()
        if path.suffix not in ['.png','.webp','.json']:continue
        if 'renders/' in file and path.stem not in ['background-far','background-mid','background-near']:continue
        if 'background-' in path.name:
            purpose='东方戏台视差背景；far 远景不透明 / mid 中景与 near 近景透明，同投影 1920×1080'
        elif 'sprites/' in file:purpose='256px 单帧、16 帧 30fps 透明特效精灵表 / Phaser atlas 元数据'
        elif 'textures/' in file:purpose='可编辑源纹理：'+path.stem+'（UV0，PNG，无外部依赖）'
        else:continue
        record({'file':file},purpose,'raster')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    selection=parser.add_mutually_exclusive_group(required=True)
    selection.add_argument('--section',choices=['s','a','b','all'],help='Explicit full section rebuild')
    selection.add_argument('--only',action='append',choices=[*['prop-'+n for n,_,_ in PROPS],
                           *['stage-'+n for n,_,_ in STAGES],*['word-'+n for n,_ in WORDS]],
                           help='One asset per flag; repeat to select several')
    parser.add_argument('--no-previews',action='store_true')
    parser.add_argument('--denoise',action='store_true',help='Require Cycles denoising support; off by default for portable CPU rendering')
    parser.add_argument('--raster-python',help='Python executable with Pillow (or P0_RASTER_PYTHON)')
    config.add_output_arguments(parser)
    config.add_font_arguments(parser)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    args.output_root=args.output_root.expanduser().resolve()
    args.review_root=config.review_path(args.review_root)
    needs_font=args.section in ['s','a','all'] or any(n.startswith('word-') for n in args.only or [])
    if needs_font:
        FONT=config.resolve_font(args.font,args.allow_font_fallback)
        FONT_INFO=config.font_record(FONT,not args.font)
    g.configure(args.output_root,args.review_root,args.denoise)
    MANIFEST=g.MODELS/'asset-pack-v1.json'
    records=json.loads(MANIFEST.read_text(encoding='utf-8'))['assets'] if MANIFEST.exists() else []
    # Drop only obsolete review registrations when rebuilding an old public root.
    records=[r for r in records if not r['file'].startswith('renders/p0/') or
             Path(r['file']).stem in ['background-far','background-mid','background-near']]
    if args.section in ['s','all']:build_s()
    if args.section in ['a','all'] or args.only:
        build_props();build_words();build_stage()
        if not args.only:build_animations()
    if args.section in ['b','all']:build_b()
    if g.RENDERS:raster('finish')
    register_rasters()
    write_manifest()
    print('PACK_DONE',MANIFEST,flush=True)
