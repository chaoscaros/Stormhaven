"""Offline Game Item Art v1. Python 3 + numpy + Pillow (WebP support).

Run from any directory. Reads our static, unindexed, vertex-colored GLBs only;
rejects unsupported glTF instead of silently misrendering. Never starts a browser
or changes world assets. Three missing objects are thumbnail-only authored meshes.
"""
from pathlib import Path
import hashlib
import json
import math
import runpy
import struct

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/thumbnails'
AUTHOR = runpy.run_path(str(ROOT / 'scripts/author-first-blizzard-assets.py'))
Model = AUTHOR['Model']
MATERIALS = AUTHOR['MATERIALS']
SOURCES = {
    'wood': 'items/split-log.glb', 'stone': 'items/granite-1.glb',
    'stick': 'items/branched-stick.glb', 'water_bottle': 'items/water-bottle.glb',
    'canned_food': 'items/ration-can.glb', 'raw_meat': 'items/raw-meat.glb',
    'foundation_wood': 'buildings/wood-foundation.glb',
    'wall_wood': 'buildings/wood-wall.glb', 'campfire_basic': 'buildings/campfire.glb',
}


def read_glb(path):
    data = path.read_bytes()
    magic, version, size = struct.unpack_from('<III', data)
    assert magic == 0x46546c67 and version == 2 and size == len(data)
    length, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4e4f534a
    doc = json.loads(data[20:20+length])
    binary = data[28+length:]
    assert len(doc['nodes']) == 1 and set(doc['nodes'][0]) <= {'name', 'mesh'}

    def read(index):
        a = doc['accessors'][index]
        view = doc['bufferViews'][a['bufferView']]
        assert a['componentType'] == 5126 and 'byteStride' not in view
        width = {'VEC3': 3, 'VEC4': 4}[a['type']]
        offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
        return np.frombuffer(binary, '<f4', count=a['count']*width, offset=offset).reshape(-1, width)

    parts = []
    for p in doc['meshes'][0]['primitives']:
        assert 'indices' not in p and p.get('mode', 4) == 4
        attrs = p['attributes']
        mat = doc['materials'][p['material']]['pbrMetallicRoughness']
        parts.append((read(attrs['POSITION']), read(attrs['NORMAL']), read(attrs['COLOR_0']),
                      mat['baseColorFactor'][:3], mat['metallicFactor'], mat['roughnessFactor']))
    return parts


def supplemental(item):
    """Not gameplay/world models: folded fabric, jagged metal, a bound stone axe."""
    m = Model()
    if item == 'cloth':
        # Continuous draped fabric, irregular soft folds rather than board strips.
        for layer in range(3):
            def point(i,j):
                x=-.38+i*.038+.012*math.sin(j*.4+layer)
                z=-.25+j*.025+layer*.015+.008*math.sin(i*.7)
                y=.035+layer*.04+.014*math.sin(i*.45+j*.13)+.009*math.cos(j*.45)
                return (x,y,z)
            for i in range(20):
                for j in range(20):
                    m.quad([point(i,j),point(i,j+1),point(i+1,j+1),point(i+1,j)],6,.67)
            for j in [0,20]:
                m.tube([point(i,j) for i in range(21)],[.013]*21,6,6,9,6)
            for i in [0,20]:
                m.tube([point(i,j) for j in range(21)],[.013]*21,6,6,8,6)
    elif item == 'scrap_metal':
        # Bent sheet fragments with chipped edges and rusty patches, no gear.
        for layer in range(3):
            ring = [(-.38,.025,-.23),(.12,.04,-.3),(.36,.015,-.16),
                    (.26,.09,.08),(.32,.12,.25),(-.16,.035,.3),(-.32,.018,.14)]
            ring = [(x+layer*.055,y+layer*.065,z-layer*.035) for x,y,z in ring]
            center = (layer*.055,.05+layer*.065,-layer*.035)
            for i in range(len(ring)):
                a,b = ring[i], ring[(i+1)%len(ring)]
                m.tri([center,b,a],4,.73+layer*.1)
                m.tri([center,a,b],4,.62)
                m.quad([a,b,(b[0],b[1]-.014,b[2]),(a[0],a[1]-.014,a[2])],7,.7)
        m.box((.03,.199,.02),(.09,.005,.12),7,.75)
    elif item == 'stone_axe':
        m.tube([(-.2,.035,0),(-.1,.38,0),(.06,.78,0),(.08,.92,0)],
               [.036,.031,.038,.031],0,12,11)
        m.rock((-.13,.69,-.025),(.57,.25,.15),92,3)
        # Pale lashings cross the actual stone head and wooden haft.
        for i in range(5):
            y=.745+i*.022
            loop=[(-.005,y,-.105),(.14,y,.005),(.08,y+.012,.105),(-.07,y+.012,0),(-.005,y,-.105)]
            for a,b in zip(loop,loop[1:]):
                m.tube([a,b],[.011,.011],6,6,20+i,6)
    elif item == 'campfire_flame':
        m.tube([(0,.22,0),(-.03,.38,.015),(.03,.60,0)], [.11,.075,.001],7,9,30,7)
        m.tube([(.065,.22,-.04),(.09,.34,-.03),(.055,.47,-.02)], [.065,.037,.001],1,7,31,1)
    else:
        raise ValueError(item)
    return [(np.array(p).reshape(-1,3),np.array(n).reshape(-1,3),np.array(c).reshape(-1,4),
             ((1,.25,.025) if i==7 else (1,.67,.12)) if item=='campfire_flame' else MATERIALS[i][1],
             MATERIALS[i][2],MATERIALS[i][3]) for i,(p,n,c) in m.parts.items()]


def unit(v):
    a = np.array(v, dtype=float)
    return a/np.linalg.norm(a)


def render(parts):
    size = 768  # 3x supersampling; one 256px runtime image.
    eye = unit((.55,.65,-.8))
    right = unit(np.cross(eye,(0,1,0)))
    up = np.cross(right,eye)
    light = unit((-.35,.85,-.45))
    half = unit(light+eye)
    # Match Babylon's AUTO handedness conversion of our authored GLBs.
    parts = [(p*np.array([-1,1,1]),n*np.array([-1,1,1]),c,b,m,r) for p,n,c,b,m,r in parts]
    points = np.concatenate([part[0] for part in parts])
    projected = points@np.array([right,up]).T
    lo,hi = projected.min(axis=0), projected.max(axis=0)
    center = (lo+hi)/2
    scale = size*.78/max(hi-lo)
    rgba = np.zeros((size,size,4),np.uint8)
    depth = np.full((size,size),-np.inf)
    for p,n,c,base,metal,rough in parts:
        screen = (p@np.array([right,up]).T-center)*scale
        screen[:,0] += size/2
        screen[:,1] = size/2-screen[:,1]
        z = p@eye
        for i in range(0,len(p),3):
            normal = n[i]
            if normal@eye < 0:
                continue
            shade = .30+.70*max(0,normal@light)
            spec = (.025+metal*.22)*max(0,normal@half)**(12+(1-rough)*45)
            rgb = np.uint8(np.clip(np.array(base)*c[i,:3]*shade+spec,0,1)**(1/2.2)*255)
            (x0,y0),(x1,y1),(x2,y2) = screen[i:i+3]
            left=max(0,math.floor(min(x0,x1,x2))); right_edge=min(size-1,math.ceil(max(x0,x1,x2)))
            top=max(0,math.floor(min(y0,y1,y2))); bottom=min(size-1,math.ceil(max(y0,y1,y2)))
            det=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
            if abs(det)<1e-9 or left>right_edge or top>bottom:
                continue
            yy,xx=np.mgrid[top:bottom+1,left:right_edge+1]+.5
            a=((y1-y2)*(xx-x2)+(x2-x1)*(yy-y2))/det
            b=((y2-y0)*(xx-x2)+(x0-x2)*(yy-y2))/det
            cc=1-a-b
            zz=a*z[i]+b*z[i+1]+cc*z[i+2]
            local=depth[top:bottom+1,left:right_edge+1]
            mask=(a>=0)&(b>=0)&(cc>=0)&(zz>local)
            local[mask]=zz[mask]
            rgba[top:bottom+1,left:right_edge+1][mask]=[*rgb,255]
    # Soft contact ellipse below the silhouette; transparent, no baked tile.
    shadow = Image.new('RGBA',(size,size))
    bottom = size/2+(hi[1]-lo[1])*scale/2
    width = (hi[0]-lo[0])*scale*.72
    ImageDraw.Draw(shadow).ellipse((size/2-width/2,bottom-22,size/2+width/2,bottom+7),fill=(8,12,14,65))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    return Image.alpha_composite(shadow,Image.fromarray(rgba)).resize((256,256),Image.Resampling.LANCZOS)


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    manifest = []
    sheet = Image.new('RGB',(1024,768),(22,29,30))
    for index,item in enumerate([*SOURCES,'cloth','scrap_metal','stone_axe']):
        source = ROOT/'public/assets/models'/SOURCES[item] if item in SOURCES else None
        parts = read_glb(source) if source else supplemental(item)
        if item == 'campfire_basic':
            parts += supplemental('campfire_flame')
        picture = render(parts)
        target = OUT/f'{item}.webp'
        picture.save(target,format='WEBP',quality=90,method=6)
        assert target.stat().st_size < 50_000
        manifest.append({'id':item,'source':str(source.relative_to(ROOT)) if source else 'thumbnail-only procedural mesh',
                         'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest() if source else None,
                         'bytes':target.stat().st_size})
        x,y=(index%4)*256,(index//4)*256
        sheet.paste(picture,(x,y),picture)
        ImageDraw.Draw(sheet).text((x+12,y+236),item,fill=(206,218,214))
    assert sum(row['bytes'] for row in manifest)<1_000_000
    (OUT/'sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
    # Development-only review sheet, excluded from runtime assets/git.
    review = ROOT/'node_modules/.cache/stormhaven-thumbnail-review.png'
    review.parent.mkdir(parents=True,exist_ok=True)
    sheet.save(review)
    print(json.dumps(manifest,indent=2))
    print(f'Review: {review.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
