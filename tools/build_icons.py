"""Resize the selected blue icon. Canonical outlined SVG and 1024 PNG live in branding/."""
from pathlib import Path
from PIL import Image,ImageDraw
import shutil
root=Path(__file__).resolve().parents[1]
source=Image.open(root/'web-source/assets/branding/opora-blue-1024.png').convert('RGB')
assert source.size==(1024,1024)
for size in [192,512]:
 p=root/'web-source'/f'icon-{size}.png';source.resize((size,size),Image.Resampling.LANCZOS).save(p,optimize=True)
 for target in [root,root/'windows/app',root/'android/app/src/main/assets']:shutil.copy2(p,target/p.name)
for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
 p=root/'android/app/src/main/res'/f'mipmap-{density}'/'ic_launcher.png';p.parent.mkdir(parents=True,exist_ok=True);source.resize((size,size),Image.Resampling.LANCZOS).save(p,optimize=True)
# Windows needs a multi-resolution ICO, not a renamed PNG. Round only desktop corners;
# iPhone and Android adaptive masks are applied by the OS to full-bleed artwork.
mask=Image.new('L',source.size,0);ImageDraw.Draw(mask).rounded_rectangle((0,0,1023,1023),radius=225,fill=255)
win=source.convert('RGBA');win.putalpha(mask)
win.save(root/'windows/app/icon.ico',format='ICO',sizes=[(n,n) for n in [16,24,32,48,64,128,256]])
print('Blue icons generated: PWA 192/512, Android five densities, Windows seven ICO sizes')
