"""Validate committed app-icon resources without external dependencies."""
from pathlib import Path
import struct,json,hashlib,re,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
def png(p,size):
 data=p.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';assert struct.unpack('>II',data[16:24])==(size,size),p
 return hashlib.sha256(data).hexdigest()
for size in [192,512]:
 name=f'icon-{size}.png';expected=png(root/'web-source'/name,size)
 for folder in [root,root/'windows/app',root/'android/app/src/main/assets']:assert png(folder/name,size)==expected
for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:png(root/f'android/app/src/main/res/mipmap-{density}/ic_launcher.png',size)
ico=(root/'windows/app/icon.ico').read_bytes();reserved,kind,n=struct.unpack('<HHH',ico[:6]);assert (reserved,kind,n)==(0,1,7)
assert {ico[6+i*16] or 256 for i in range(n)}=={16,24,32,48,64,128,256}
ns='{http://schemas.android.com/apk/res/android}'
adaptive=ET.parse(root/'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml').getroot();assert adaptive.tag=='adaptive-icon'
assert adaptive.find('background').attrib[ns+'drawable']=='@color/ic_launcher_background'
assert adaptive.find('foreground').attrib[ns+'drawable']=='@drawable/ic_launcher_foreground'
assert '<text' not in (root/'web-source/assets/branding/opora-blue.svg').read_text()
config=json.loads((root/'windows/package.json').read_text());assert config['build']['win']['icon']=='app/icon.ico' and config['build']['win']['signAndEditExecutable'] is True
manifest=json.loads((root/'web-source/manifest.webmanifest').read_text());assert all(i['src'].endswith('?v=blue1') for i in manifest['icons'])
assert re.search(r'icon:\s*path\.join\(__dirname,\s*[\'"]icon\.ico[\'"]\)', (root/'windows/app/main.cjs').read_text())
assert 'opora-2.0.0-main2' in (root/'web-source/sw.js').read_text()
print('ICON_ASSETS_OK: shared PWA images, Android legacy/adaptive, outlined glyph, seven-size Windows ICO')
