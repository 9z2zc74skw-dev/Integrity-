import bpy, bmesh, math, os
out = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
# Y = length (front -Y), X = width, Z = up. Meters. 5.11 long, 1.925 wide, 1.826 tall, WB 3.04
# station: y, zbot, zbelt, zgreen_base(hood/deck top), zroof, halfw_body, halfw_roof
S = [
 (-2.56,0.45,0.62,0.80,0.80,0.80,0.80),
 (-2.45,0.38,0.75,1.00,1.00,0.90,0.90),
 (-2.10,0.30,0.80,1.10,1.10,0.96,0.96),
 (-1.30,0.28,0.84,1.16,1.16,0.962,0.962),
 (-0.70,0.28,0.90,1.22,1.50,0.962,0.88),   # cowl / windshield base
 (-0.05,0.28,0.92,1.24,1.80,0.962,0.82),
 ( 0.60,0.28,0.92,1.24,1.826,0.962,0.82),
 ( 1.50,0.28,0.92,1.24,1.80,0.962,0.82),
 ( 2.15,0.30,0.95,1.24,1.62,0.962,0.84),   # D-pillar/hatch
 ( 2.45,0.34,0.98,1.20,1.30,0.95,0.90),
 ( 2.56,0.45,0.95,1.15,1.15,0.90,0.90),
]
bm = bmesh.new(); rings=[]
for y,zb,zbe,zg,zr,hw,hr in S:
    pts=[(0,zb),(hw*0.85,zb),(hw,zb+0.1),(hw,zbe),(hw*0.97,zg),(hr,zg+(zr-zg)*0.55 if zr>zg else zg),(hr*0.8,zr),(0,zr)]
    rings.append([bm.verts.new((x,y,z)) for x,z in pts])
n=len(rings[0])
for a,b in zip(rings,rings[1:]):
    for i in range(n-1):
        bm.faces.new((a[i],a[i+1],b[i+1],b[i]))
for r,flip in ((rings[0],1),(rings[-1],0)):
    for i in range(n-1): pass
    f=bm.faces.new(r if flip else r[::-1])
for v in bm.verts:
    if abs(v.co.x)<1e-6: pass
me=bpy.data.meshes.new("body"); bm.to_mesh(me); bm.free()
body=bpy.data.objects.new("Body",me); bpy.context.collection.objects.link(body)
sub=body.modifiers.new("sub","SUBSURF"); sub.levels=2; sub.render_levels=2
mir=body.modifiers.new("mir","MIRROR"); mir.use_axis[0]=True; mir.use_clip=True; mir.use_mirror_merge=True
bpy.context.view_layer.objects.active=body
for m in ("sub","mir"): bpy.ops.object.modifier_apply(modifier=m)
bpy.ops.object.shade_smooth()
mat=bpy.data.materials.new("paint"); mat.diffuse_color=(0.05,0.07,0.12,1); body.data.materials.append(mat)
tm=bpy.data.materials.new("tire"); tm.diffuse_color=(0.02,0.02,0.02,1)
wy=3.04/2
for sx in (-1,1):
    for sy in (-1,1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=0.38,depth=0.28,
            location=(sx*0.90,sy*wy,0.38),rotation=(0,math.pi/2,0))
        w=bpy.context.object; w.name="Wheel"; w.data.materials.append(tm)
bpy.ops.object.select_all(action='DESELECT')
tris=0
dg=bpy.context.evaluated_depsgraph_get()
for o in bpy.data.objects:
    if o.type=='MESH': tris+=sum(len(p.vertices)-2 for p in o.data.polygons)
print("TRIANGLES",tris)
bpy.ops.export_scene.gltf(filepath=os.path.join(out,"durango_base.glb"),export_format='GLB')
bpy.ops.object.light_add(type='SUN',location=(4,-4,6)); bpy.context.object.data.energy=4
bpy.ops.object.camera_add(location=(6.5,-7,3.0),rotation=(math.radians(72),0,math.radians(43)))
bpy.context.scene.camera=bpy.context.object
sc=bpy.context.scene; sc.render.engine='BLENDER_WORKBENCH'
sc.render.resolution_x=640; sc.render.resolution_y=400
sc.display.shading.color_type='MATERIAL'
sc.render.filepath=os.path.join(out,"test.png"); bpy.ops.render.render(write_still=True)
