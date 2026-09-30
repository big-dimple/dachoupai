"""Procedural, original raster sources + portrait crops for the P0 pack.

Called by build_asset_pack.py with the local bundled Python (Pillow).
No downloaded art; Noto font outlines are used under SIL OFL, fonts not shipped.
"""
from pathlib import Path
import argparse
import json
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
TEX = ROOT / 'public/assets/textures/p0'
SPR = ROOT / 'public/assets/sprites/p0'
REN = ROOT / 'public/assets/renders/p0'
TMP = ROOT / 'shots/p0-build'
IVORY = (249, 239, 209)
RED = (185, 44, 43)
GOLD = (213, 165, 68)
JADE = (69, 153, 135)
PURPLE = (118, 66, 122)
FONT = Path('C:/Windows/Fonts/NotoSerifSC-VF.ttf')


def font(size):
    return ImageFont.truetype(str(FONT), size)


def save(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix == '.webp':
        im.save(path, quality=92, method=6, lossless=path.stem.startswith('poker-card'))
    else:
        im.save(path, optimize=True)


def cloud(draw, x, y, s, color, width=3):
    draw.arc((x-s, y-s*.5, x+s, y+s*.5), 180, 360, fill=color, width=width)
    draw.arc((x-s*.55, y-s*.9, x+s*.55, y+s*.2), 170, 360, fill=color, width=width)
    draw.line((x-s, y, x-s*1.3, y+s*.3, x+s*1.3, y+s*.3, x+s, y), fill=color, width=width)


def textures():
    TEX.mkdir(parents=True, exist_ok=True)
    # Full-card UV square. Visible panel has the physical 5:7 aspect in the mesh.
    for side in ['front', 'back']:
        im = Image.new('RGB', (1024, 1024), IVORY if side == 'front' else RED)
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((30, 30, 994, 994), radius=48, outline=GOLD, width=12)
        d.rounded_rectangle((54, 54, 970, 970), radius=32, outline=GOLD, width=3)
        if side == 'front':
            d.text((88, 65), 'A', font=font(116), fill=RED)
            d.polygon([(146, 205), (182, 245), (146, 285), (110, 245)], fill=RED)
            # Original sun / lotus / ruyi emblem; replace card-front.png for art.
            d.ellipse((235, 260, 789, 814), fill=(232, 214, 163), outline=GOLD, width=10)
            d.ellipse((278, 300, 746, 768), fill=JADE, outline=IVORY, width=6)
            for i in range(12):
                a = math.tau*i/12
                x, y = 512+168*math.cos(a), 530+168*math.sin(a)
                d.ellipse((x-30, y-48, x+30, y+48), fill=IVORY, outline=GOLD, width=4)
            d.ellipse((415, 432, 609, 626), fill=RED, outline=GOLD, width=10)
            d.polygon([(512, 463), (562, 529), (512, 595), (462, 529)], fill=GOLD)
            cloud(d, 512, 715, 128, IVORY, 9)
            corner = im.crop((70, 60, 216, 298)).rotate(180)
            im.paste(corner, (808, 726))
        else:
            for y in range(115, 940, 110):
                for x in range(112, 950, 118):
                    cloud(d, x, y, 32, GOLD, 3)
            d.ellipse((300, 300, 724, 724), fill=JADE, outline=GOLD, width=16)
            d.ellipse((328, 328, 696, 696), outline=IVORY, width=5)
            d.text((512, 482), '丑', font=font(218), fill=IVORY, anchor='mm')
            d.line((386, 636, 638, 636), fill=GOLD, width=6)
        save(im, TEX/f'card-{side}.png')
    # Seamless paper maps. Deterministic woven fibers, no high-frequency 4K data.
    n = 512
    normal = Image.new('RGB', (n,n))
    rough = Image.new('L', (n,n))
    for y in range(n):
        for x in range(n):
            wave = math.sin(math.tau*x/8)*math.cos(math.tau*y/16)
            normal.putpixel((x,y), (int(128+8*wave), int(128+6*math.sin(math.tau*y/8)), 254))
            rough.putpixel((x,y), int(207+12*wave))
    save(normal, TEX/'paper-normal.png')
    save(rough, TEX/'paper-roughness.png')
    for kit in ['holographic', 'glass', 'gilded']:
        channels = {k: Image.new('RGB' if k in ['basecolor','normal','emissive'] else 'L', (n,n))
                    for k in ['basecolor','normal','roughness','metallic','emissive','mask']}
        for y in range(n):
            for x in range(n):
                u,v=x/n,y/n
                stripe = .5+.5*math.sin(math.tau*(6*u+2*v))
                vein = abs(math.sin(math.tau*(3*u+2*v+.13*math.sin(math.tau*v))))
                mask = 255 if vein < .085 else 0
                if kit == 'holographic':
                    colors = tuple(int(110+110*math.sin(math.tau*(u+v*.5+i/3))**2) for i in range(3))
                    r,m = int(55+65*stripe), 210
                elif kit == 'glass':
                    colors = (int(65+50*stripe), int(156+40*stripe), int(138+40*stripe))
                    r,m = int(25+35*stripe), 0
                else:
                    colors = (int(194+40*stripe), int(136+50*stripe), int(40+45*stripe))
                    r,m = int(75+40*stripe), 255
                channels['basecolor'].putpixel((x,y), colors)
                channels['normal'].putpixel((x,y), (int(128+9*math.cos(math.tau*(6*u+2*v))),128,254))
                channels['roughness'].putpixel((x,y),r)
                channels['metallic'].putpixel((x,y),m)
                channels['emissive'].putpixel((x,y), tuple(int(c*mask/255*.45) for c in colors))
                channels['mask'].putpixel((x,y),mask)
        for channel, im in channels.items():
            save(im,TEX/f'{kit}-{channel}.png')
    im=Image.new('RGBA',(512,512),(*IVORY,255))
    d=ImageDraw.Draw(im)
    for y in range(55,512,82):
        cloud(d,256,y,100,(*JADE,255),4)
    d.text((256,245),'画',font=font(140),fill=(*RED,255),anchor='mm')
    save(im,TEX/'joker-artwork.png')


def portraits():
    for name in ['amo','touye','laohuan','erxiang','azao','xiemu']:
        im=Image.open(ROOT/f'public/assets/characters/{name}.png').convert('RGB')
        # Explicit head close-up, tighter than the current HUD's largest square.
        # Same existing focal anchors; keep hats, face and upper shoulders.
        focal={'amo':.62,'touye':.52,'laohuan':.55,'erxiang':.52,'azao':.57,'xiemu':.52}[name]
        side=round(im.width*.42)
        left=max(0,min(im.width-side,round(focal*im.width-side/2)))
        crop=(left,0,left+side,side)
        save(im.crop(crop).resize((512,512),Image.Resampling.LANCZOS),
             ROOT/f'public/assets/characters/{name}.avatar.webp')


def effects():
    # 16 frames, 4x4 atlas, fixed 256 cells, straight alpha RGBA.
    SPR.mkdir(parents=True,exist_ok=True)
    for kind in ['play-ruyi','hit-cinnabar','score-gold']:
        sheet=Image.new('RGBA',(1024,1024))
        frames={}
        for f in range(16):
            t=f/15
            im=Image.new('RGBA',(512,512))
            d=ImageDraw.Draw(im)
            alpha=int(255*math.sin(math.pi*t)**.55)
            color=JADE if kind=='play-ruyi' else RED if kind=='hit-cinnabar' else GOLD
            r=24+t*190
            if kind=='play-ruyi':
                for i in range(6):
                    a=math.tau*i/6+t*.7
                    cloud(d,256+math.cos(a)*r,256+math.sin(a)*r,30*(1-t*.5),(*color,alpha),5)
            elif kind=='hit-cinnabar':
                for i in range(12):
                    a=math.tau*i/12
                    points=[(256+math.cos(a)*r*.25,256+math.sin(a)*r*.25),
                            (256+math.cos(a-.055)*r,256+math.sin(a-.055)*r),
                            (256+math.cos(a+.055)*r,256+math.sin(a+.055)*r)]
                    d.polygon(points,fill=(*color,alpha))
                d.ellipse((256-r*.48,256-r*.48,256+r*.48,256+r*.48),outline=(*GOLD,alpha),width=6)
            else:
                for i in range(24):
                    a=math.tau*i/24+t*.6
                    rr=r*(.6+.35*math.sin(i*4.31)**2)
                    x,y=256+math.cos(a)*rr,256+math.sin(a)*rr
                    size=4+6*(1-t)
                    d.polygon([(x,y-size*2),(x+size,y),(x,y+size*2),(x-size,y)],fill=(*color,alpha))
                d.arc((256-r,256-r,256+r,256+r),t*100,t*100+280,fill=(*GOLD,alpha),width=5)
            im=im.resize((256,256),Image.Resampling.LANCZOS)
            px,py=f%4*256,f//4*256
            sheet.paste(im,(px,py))
            frames[f'{kind}-{f:02}']={'frame':{'x':px,'y':py,'w':256,'h':256},
                                     'rotated':False,'trimmed':False,
                                     'spriteSourceSize':{'x':0,'y':0,'w':256,'h':256},
                                     'sourceSize':{'w':256,'h':256}}
        save(sheet,SPR/f'{kind}.png')
        (SPR/f'{kind}.json').write_text(json.dumps({'frames':frames,'meta':{
            'image':f'{kind}.png','size':{'w':1024,'h':1024},'scale':'1',
            'frameRate':30,'repeat':0,'blendMode':'NORMAL','alpha':'straight',
            'purpose':'Phaser load.atlas / anims，16 帧；256px 单帧'}} ,ensure_ascii=False,indent=2),encoding='utf-8')


def finish():
    REN.mkdir(parents=True,exist_ok=True)
    for png in sorted(TMP.glob('*.png')):
        im=Image.open(png)
        if not png.stem.startswith('background-'):
            rgba=im.convert('RGBA')
            matte=Image.new('RGBA',rgba.size,(*IVORY,255))
            im=Image.alpha_composite(matte,rgba).convert('RGB')
        save(im,REN/f'{png.stem}.webp')
    # Deliver layered background at 1920x1080, foregrounds retain real alpha.
    for layer in ['far','mid','near']:
        path=TMP/f'background-{layer}.png'
        if path.exists():
            im=Image.open(path).convert('RGBA')
            out=REN/f'background-{layer}.webp'
            im.save(out,lossless=True,method=6)
    paths=[p for p in sorted(REN.glob('*.webp')) if not p.name.startswith(('background','contact'))]
    thumbs=[]
    for p in paths:
        im=Image.open(p).convert('RGBA')
        bg=Image.new('RGB',im.size,IVORY)
        bg.paste(im,mask=im.getchannel('A'))
        bg.thumbnail((280,220),Image.Resampling.LANCZOS)
        thumbs.append((p.stem,bg))
    columns=5
    sheet=Image.new('RGB',(1500,math.ceil(len(thumbs)/columns)*260),IVORY)
    d=ImageDraw.Draw(sheet)
    for i,(name,im) in enumerate(thumbs):
        x,y=i%columns*300,i//columns*260
        sheet.paste(im,(x+(300-im.width)//2,y))
        d.text((x+150,y+228),name,font=font(14),fill=RED,anchor='mm')
    save(sheet,REN/'contact-sheet.webp')
    layers=[Image.open(REN/f'background-{layer}.webp').convert('RGBA') for layer in ['far','mid','near']]
    bg=layers[0]
    for im in layers[1:]: bg=Image.alpha_composite(bg,im)
    save(bg,REN/'background-composite.webp')
    avatars=Image.new('RGB',(1536,1024),IVORY)
    for i,name in enumerate(['amo','touye','laohuan','erxiang','azao','xiemu']):
        im=Image.open(ROOT/f'public/assets/characters/{name}.avatar.webp')
        avatars.paste(im,(i%3*512,i//3*512))
    save(avatars,REN/'avatars-preview.webp')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--phase',choices=['textures','b','finish'],required=True)
    args=parser.parse_args()
    if args.phase=='textures': textures()
    elif args.phase=='b':
        portraits()
        effects()
    else: finish()
