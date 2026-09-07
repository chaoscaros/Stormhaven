"""Author Stormhaven's original, deterministic glTF 2.0 assets (Python 3 stdlib).

Offline authoring only; never imported by the game. Coordinates below are game
meters, Y up. Export mirrors X and winding (Babylon glTF AUTO mirrors X back).
Meshes are merged by PBR material. No third-party models/textures or dependencies.
"""
from pathlib import Path
import json
import math
import random
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / "public/assets"
TAU = math.tau


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def unit(v):
    length = math.sqrt(sum(x*x for x in v)) or 1
    return tuple(x/length for x in v)


MATERIALS = [
    ("weathered timber", (.34, .20, .10), 0, .92),
    ("fresh split grain", (.62, .42, .23), 0, .87),
    ("bark and knots", (.18, .11, .065), 0, .98),
    ("cold granite", (.36, .40, .39), 0, .95),
    ("galvanized metal", (.52, .59, .59), .8, .36),
    ("blue reusable plastic", (.09, .37, .43), 0, .32),
    ("off white packaging", (.77, .74, .62), 0, .8),
    ("oxide label", (.46, .19, .09), 0, .84),
    ("muted meat", (.43, .19, .17), 0, .72),
    ("fat edge", (.68, .51, .41), 0, .79),
    ("roof felt", (.16, .21, .22), 0, .95),
]


class Model:
    def __init__(self):
        self.parts = {}

    def tri(self, points, material, tint=1):
        # Mirror to RH glTF; reverse winding so outward normals remain outward.
        points = [(-p[0], p[1], p[2]) for p in (points[0], points[2], points[1])]
        n = unit(cross(sub(points[1], points[0]), sub(points[2], points[0])))
        if sum(abs(x) for x in n) < .1:
            return
        part = self.parts.setdefault(material, [[], [], []])
        for p in points:
            part[0].extend(p)
            part[1].extend(n)
            part[2].extend([tint, tint, tint, 1])

    def quad(self, points, material, tint=1):
        self.tri([points[0], points[1], points[2]], material, tint)
        self.tri([points[0], points[2], points[3]], material, tint)

    def box(self, center, size, material=0, tint=1):
        x, y, z = center
        a, b, c = [n/2 for n in size]
        vertices = [(x+dx*a, y+dy*b, z+dz*c) for dx, dy, dz in
                    [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                     (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        for face in [(0,3,2,1),(4,5,6,7),(0,4,7,3),(1,2,6,5),(3,7,6,2),(0,1,5,4)]:
            self.quad([vertices[i] for i in face], material, tint)

    def tube(self, points, radii, material=2, sides=9, seed=0, cut=1):
        rng = random.Random(seed)
        direction = unit(sub(points[-1], points[0]))
        u = unit(cross(direction, (0, 1, 0) if abs(direction[1]) < .9 else (1, 0, 0)))
        v = cross(direction, u)
        angular = [1+rng.uniform(-.1,.1) for _ in range(sides)]
        rings = [[tuple(p[k] + radius * angular[i] * (math.cos(i*TAU/sides)*u[k]+math.sin(i*TAU/sides)*v[k])
                        for k in range(3)) for i in range(sides)] for p, radius in zip(points, radii)]
        for j in range(len(rings)-1):
            for i in range(sides):
                n = (i+1) % sides
                self.quad([rings[j][i],rings[j][n],rings[j+1][n],rings[j+1][i]], material, rng.uniform(.78,1))
        for i in range(sides):
            n = (i+1) % sides
            self.tri([points[0],rings[0][n],rings[0][i]], cut)
            self.tri([points[-1],rings[-1][i],rings[-1][n]], cut)

    def lathe(self, profile, material, sides=32):
        # Smooth-looking faceted ring profile with real rims/shoulders/neck.
        for (y0,r0),(y1,r1) in zip(profile, profile[1:]):
            for i in range(sides):
                a, b = i*TAU/sides, (i+1)*TAU/sides
                self.quad([(r0*math.cos(a),y0,r0*math.sin(a)),(r1*math.cos(a),y1,r1*math.sin(a)),
                           (r1*math.cos(b),y1,r1*math.sin(b)),(r0*math.cos(b),y0,r0*math.sin(b))], material)

    def rock(self, center, size, seed, material=3):
        rng = random.Random(seed)
        rings = []
        for j,(y,r) in enumerate([(0,.52),(.22,.94),(.66,1),(.92,.54),(1,.14)]):
            rings.append([(center[0]+math.cos(i*TAU/9+j*.13)*size[0]/2*r*rng.uniform(.82,1),
                           center[1]+y*size[1],
                           center[2]+math.sin(i*TAU/9+j*.13)*size[2]/2*r*rng.uniform(.82,1)) for i in range(9)])
        for j in range(4):
            for i in range(9):
                n=(i+1)%9
                self.quad([rings[j][i],rings[j+1][i],rings[j+1][n],rings[j][n]], material,rng.uniform(.72,1))
        for i in range(9):
            self.tri([(center[0],center[1],center[2]),rings[0][i],rings[0][(i+1)%9]],material)
            self.tri([(center[0],center[1]+size[1],center[2]),rings[-1][(i+1)%9],rings[-1][i]],material)

    def save(self, relative):
        bottom = min(min(arrays[0][1::3]) for arrays in self.parts.values())
        for arrays in self.parts.values():
            arrays[0][1::3] = [y-bottom for y in arrays[0][1::3]]
        binary=bytearray(); views=[]; accessors=[]; primitives=[]
        def accessor(values, width):
            offset=len(binary)
            binary.extend(struct.pack('<'+'f'*len(values),*values))
            views.append(dict(buffer=0,byteOffset=offset,byteLength=len(binary)-offset,target=34962))
            entry=dict(bufferView=len(views)-1,componentType=5126,count=len(values)//width,type={3:'VEC3',4:'VEC4'}[width])
            entry['min']=[min(values[k::width]) for k in range(width)]
            entry['max']=[max(values[k::width]) for k in range(width)]
            accessors.append(entry)
            return len(accessors)-1
        used=[]
        for material,arrays in sorted(self.parts.items()):
            used.append(material)
            primitives.append(dict(attributes=dict(POSITION=accessor(arrays[0],3),NORMAL=accessor(arrays[1],3),COLOR_0=accessor(arrays[2],4)),material=len(used)-1))
        materials=[dict(name=MATERIALS[i][0],pbrMetallicRoughness=dict(baseColorFactor=[*MATERIALS[i][1],1],metallicFactor=MATERIALS[i][2],roughnessFactor=MATERIALS[i][3]),doubleSided=False) for i in used]
        document=dict(asset=dict(version='2.0',generator='Stormhaven original asset authoring v1'),scene=0,scenes=[dict(nodes=[0])],
                      nodes=[dict(name=Path(relative).stem,mesh=0)],meshes=[dict(primitives=primitives)],materials=materials,
                      buffers=[dict(byteLength=len(binary))],bufferViews=views,accessors=accessors)
        encoded=json.dumps(document,separators=(',',':')).encode()
        encoded+=b' '*((-len(encoded))%4); binary+=b'\0'*((-len(binary))%4)
        data=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
        path=ROOT/'models'/relative; path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(data)
        print(f'{relative}: {len(data):,} bytes, {sum(len(a[0])//9 for a in self.parts.values()):,} triangles, {len(used)} materials')


def plank(model, center, size, seed):
    """Closed board, fine bevel-like grain strips and knots, merged into materials."""
    rng=random.Random(seed)
    model.box(center,size,0,rng.uniform(.76,1))
    x,y,z=center; w,h,d=size
    if h < w:  # floor top: long thin irregular grain lines
        for _ in range(3):
            model.box((x+rng.uniform(-w*.38,w*.38),y+h/2+.00015,z+rng.uniform(-d*.1,d*.1)),(.003,.0003,d*rng.uniform(.4,.75)),2,.85)
    else:  # vertical board face, both sides
        for face in [-1,1]:
            for _ in range(2):
                model.box((x+rng.uniform(-w*.36,w*.36),y+rng.uniform(-h*.18,h*.18),z+face*(d/2+.00015)),(.003,h*rng.uniform(.2,.48),.0003),2,.8)


def create_models():
    m=Model()
    # Split timber: curved bark beneath a flat pale split face, tapered ends.
    rings=[]
    for x,rad in [(-.475,.15),(-.3,.18),(.18,.175),(.475,.145)]:
        rings.append([(x,.225+math.sin(math.pi+i*math.pi/8)*rad,math.cos(math.pi+i*math.pi/8)*rad) for i in range(9)])
    for j in range(3):
        for i in range(8): m.quad([rings[j][i],rings[j+1][i],rings[j+1][i+1],rings[j][i+1]],2,.78+i*.025)
        m.quad([rings[j][8],rings[j+1][8],rings[j+1][0],rings[j][0]],1)
    for index,ring in enumerate((rings[0],rings[-1])):
        for i in range(1,8): m.tri([ring[0],ring[i],ring[i+1]] if index == 0 else [ring[0],ring[i+1],ring[i]],1)
    for z in [-.095,-.045,.015,.07]: m.box((0,.2253,z),(.84,.0006,.0025),2)
    m.save('items/split-log.glb')
    for i in range(3):
        m=Model(); m.rock((0,0,0),(.62-i*.035,.44+i*.05,.52+i*.025),11+i); m.save(f'items/granite-{i+1}.glb')
    m=Model()
    m.tube([(-.51,.055,-.045),(-.22,.065,.005),(.02,.095,-.01),(.28,.085,.025),(.53,.08,.065)],[.045,.043,.037,.028,.014],seed=7)
    m.tube([(-.05,.085,0),(.06,.10,.15),(.25,.12,.29)],[.026,.019,.007],seed=8)
    m.tube([(.26,.085,.025),(.34,.15,-.14),(.45,.16,-.2)],[.02,.011,.004],seed=9)
    m.save('items/branched-stick.glb')
    m=Model()
    m.lathe([(0,0),(0,.125),(.035,.15),(.09,.15),(.105,.145),(.12,.15),(.42,.15),(.44,.145),(.46,.15),(.52,.15),(.59,.10),(.64,.065),(.73,.065)],5)
    m.lathe([(.69,.068),(.71,.074),(.77,.074),(.79,.063),(.79,0)],4)
    m.lathe([(.22,.1505),(.36,.1505)],6)
    m.lathe([(.26,.151),(.29,.151)],5)
    m.save('items/water-bottle.glb')
    m=Model()
    m.lathe([(0,0),(0,.18),(.015,.2),(.035,.2),(.045,.19),(.51,.19),(.52,.2),(.55,.2),(.56,.18),(.56,0)],4)
    m.lathe([(.075,.191),(.48,.191)],7)
    m.lathe([(.12,.193),(.405,.193)],6)
    # Raised pull ring with an open center, rather than a brand logo.
    for i in range(16):
        a=i*TAU/16; b=(i+1)*TAU/16
        m.tube([(.052*math.cos(a),.568,.09*math.sin(a)),(.052*math.cos(b),.568,.09*math.sin(b))],[.009,.009],4,6,i,4)
    m.save('items/ration-can.glb')
    m=Model();m.rock((0,0,0),(.48,.12,.32),32,9);m.rock((.015,.025,0),(.44,.12,.28),33,8);m.save('items/raw-meat.glb')
    m=Model()
    for x in [-.84,-.28,.28,.84]: m.box((x,.055,0),(.17,.11,2),2)
    for i in range(10): plank(m,(-.9+i*.2,.15485,0),(.2,.0897,2),i)
    m.save('buildings/wood-foundation.glb')
    m=Model()
    for i in range(10): plank(m,(-.9+i*.2,1.2,0),(.2,2.4,.1),30+i)
    for y in [.22,1.2,2.18]:
        for z in [-.07,.07]: m.box((0,y,z),(2,.12,.04),2)
    m.save('buildings/wood-wall.glb')
    m=Model()
    for i in range(10):
        a=i*TAU/10; m.rock((.43*math.cos(a),0,.43*math.sin(a)),(.22,.17+(i%3)*.025,.22),50+i)
    for i in range(3):
        a=i*math.pi/3; dx=.35*math.cos(a);dz=.35*math.sin(a)
        m.tube([(-dx,.17,-dz),(0,.22,0),(dx,.25,dz)],[.07,.065,.05],2,10,70+i)
    m.save('buildings/campfire.glb')
    create_cabin()


def create_cabin():
    m=Model()
    # Exact existing shell: 10x10 floor, inner volume 9.5x4x9.5,
    # front segments retain the legacy 1.9m physical gap; no new roof volume.
    for i in range(40): plank(m,(-4.875+i*.25,.06,0),(.25,.12,10),100+i)
    for side in [-1,1]:
        for i in range(16):
            m.box((side*4.875,.125+i*.25,0),(.25,.25,9.5),0,.77+(i%4)*.055)
            # Front halves and lintel exactly match the legacy colliders.
            m.box((side*2.85,.125+i*.25,-4.875),(3.8,.25,.25),0,.78+(i%5)*.045)
        for z in [-4.875,4.875]: m.box((side*4.875,2,z),(.25,4,.25),2)
    for i in range(16): m.box((0,.125+i*.25,4.875),(9.5,.25,.25),0,.8+(i%3)*.065)
    for i in range(6): m.box((0,2.625+i*.25,-4.875),(1.9,.25,.25),0,.88)
    # Felt roof sections, fascia and rafters stay inside original flat roof AABB.
    m.box((0,4.138,0),(10.45,.276,10.45),10)
    for i in range(21): m.box((-5+i*.5,4.278,0),(.028,.004,10.45),4,.7)
    for side in [-1,1]:
        m.box((side*5.12,4.08,0),(.2,.15,10.45),1,.7)
        m.box((0,4.08,side*5.12),(10.45,.15,.2),1,.7)
        m.box((side*1.2,1.25,-4.875),(.16,2.5,.42),1,.8)
    m.box((0,2.5,-4.875),(2.72,.16,.42),1,.8)
    m.box((0,.0275,-4.875),(2.4,.055,.42),1,.8)
    # Narrow warm inner battens and roof joists, entirely within wall/roof slabs.
    for x in [-3.6,-1.8,0,1.8,3.6]: m.box((x,4.04,0),(.12,.08,9.5),1,.7)
    m.save('environment/cabin.glb')


def png(path, pixels, size=1024):
    def chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    raw=b''.join(b'\0'+bytes(pixels[y*size*3:(y+1)*size*3]) for y in range(size))
    data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
    path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)


def snow():
    size=1024; rng=random.Random(3401)
    # Periodic Fourier ridges + fine grains; borders tile without a seam.
    waves=[(rng.randrange(1,14),rng.randrange(1,14),rng.random()*TAU,rng.uniform(.15,1)) for _ in range(14)]
    sx=[[math.sin(TAU*k*x/size+phase) for x in range(size)] for k,_,phase,_ in waves]
    cy=[[math.cos(TAU*k*y/size) for y in range(size)] for _,k,_,_ in waves]
    heights=[sum(sx[i][x]*cy[i][y]*waves[i][3] for i in range(len(waves)))/6+rng.uniform(-.065,.065) for y in range(size) for x in range(size)]
    albedo=[];normal=[];roughness=[]
    for y in range(size):
        for x in range(size):
            h=heights[y*size+x];value=max(155,min(215,int(187+h*27)))
            albedo.extend((value,min(230,value+8),min(235,value+12)))
            dx=heights[y*size+(x+1)%size]-heights[y*size+(x-1)%size]
            dy=heights[((y+1)%size)*size+x]-heights[((y-1)%size)*size+x]
            n=unit((-dx*1.3,-dy*1.3,1));normal.extend(round((v*.5+.5)*255) for v in n)
            # glTF/Babylon metallic-roughness packing: G roughness, B metal=0.
            roughness.extend((255,max(215,min(252,int(238+h*12))),0))
    for name,pixels in [('snow-albedo',albedo),('snow-normal',normal),('snow-roughness',roughness)]:
        path=ROOT/'textures/terrain'/f'{name}.png';png(path,pixels,size);print(f'{path.name}: {path.stat().st_size:,} bytes, {size}x{size}')


if __name__ == '__main__':
    create_models()
    snow()
