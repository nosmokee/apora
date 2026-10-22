"""Build one-file app. Portrait PNGs are embedded for offline use."""
from pathlib import Path
import json,base64
p=Path(__file__).resolve().parent
db=json.loads((p/'library.json').read_text(encoding='utf-8'))
assert len({c['id'] for c in db['cards']})==len(db['cards'])
db['elements']=json.loads((p/'elements.json').read_text(encoding='utf-8'))
db['geography']=json.loads((p/'geography.json').read_text(encoding='utf-8'))
db['morphology']=json.loads((p/'morphology.json').read_text(encoding='utf-8'))
db['assets']={}
for a in json.loads((p/'image_credits.json').read_text(encoding='utf-8')):
 db['assets'][a['id']]={**a,'data':'data:image/png;base64,'+base64.b64encode((p/a['file']).read_bytes()).decode()}
html=(p/'template.html').read_text(encoding='utf-8')
for marker,value in [('/*STYLE*/',(p/'style.css').read_text(encoding='utf-8')),('/*DATA*/',json.dumps(db,ensure_ascii=False).replace('</','<\\/')),('/*APP*/',(p/'app.js').read_text(encoding='utf-8')+'\n'+(p/'study.js').read_text(encoding='utf-8').replace("setView('library');initOffline();",'')+'\n'+(p/'upgrades.js').read_text(encoding='utf-8')+'\n'+(p/'fixes.js').read_text(encoding='utf-8')+'\n'+(p/'topic_tasks.js').read_text(encoding='utf-8')+'\n'+(p/'compatibility.js').read_text(encoding='utf-8')+'\n'+(p/'russian_topics.js').read_text(encoding='utf-8')+'\n'+(p/'learning_v07.js').read_text(encoding='utf-8')+'\n'+(p/'homework.js').read_text(encoding='utf-8')+"\nsetView('subjects');initOffline();")]:
 assert marker in html
 html=html.replace(marker,value)
(p/'index.html').write_text(html,encoding='utf-8')
print(f"Built v{db['version']}: {len(db['cards'])} materials, {len(db['assets'])} embedded PNGs")
