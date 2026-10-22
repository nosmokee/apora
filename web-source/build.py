"""Build one-file app. Portrait PNGs are embedded for offline use."""
from pathlib import Path
import json,base64
p=Path(__file__).resolve().parent
db=json.loads((p/'library.json').read_text(encoding='utf-8'))
assert len({c['id'] for c in db['cards']})==len(db['cards'])
if db['version'].startswith('1.0.'):
 essays=[c for c in db['cards'] if c.get('kind')=='essay']
 bio=[c for c in db['cards'] if c.get('subject')=='Биология']
 assert len(essays)==436 and len({c['title'].casefold() for c in essays})==436
 assert all(len(c.get('essays',[]))==2 for c in essays)
 assert all(e['wordCount']>=350 and len(e['paragraphs'])>=6 for c in essays for e in c['essays'])
 assert len(bio)==30 and all(len(c.get('solved',[]))>=2 for c in bio)

db['elements']=json.loads((p/'elements.json').read_text(encoding='utf-8'))
db['geography']=json.loads((p/'geography.json').read_text(encoding='utf-8'))
db['morphology']=json.loads((p/'morphology.json').read_text(encoding='utf-8'))
db['examBank']=json.loads((p/'exam-bank.json').read_text(encoding='utf-8'))
assert len(db['examBank']['tasks'])==56 and len({t['id'] for t in db['examBank']['tasks']})==56
assert all(t['q'] and t['answer'] and len(t['steps'])>=3 for t in db['examBank']['tasks'])
db['assets']={}
for a in json.loads((p/'image_credits.json').read_text(encoding='utf-8')):
 db['assets'][a['id']]={**a,'data':'data:image/png;base64,'+base64.b64encode((p/a['file']).read_bytes()).decode()}
html=(p/'template.html').read_text(encoding='utf-8')
for marker,value in [('/*STYLE*/',(p/'style.css').read_text(encoding='utf-8')),('/*DATA*/',json.dumps(db,ensure_ascii=False).replace('</','<\\/')),('/*APP*/',(p/'app.js').read_text(encoding='utf-8')+'\n'+(p/'study.js').read_text(encoding='utf-8').replace("setView('library');initOffline();",'')+'\n'+(p/'upgrades.js').read_text(encoding='utf-8')+'\n'+(p/'fixes.js').read_text(encoding='utf-8')+'\n'+(p/'topic_tasks.js').read_text(encoding='utf-8')+'\n'+(p/'compatibility.js').read_text(encoding='utf-8')+'\n'+(p/'russian_topics.js').read_text(encoding='utf-8')+'\n'+(p/'learning_v07.js').read_text(encoding='utf-8')+'\n'+(p/'homework.js').read_text(encoding='utf-8')+'\n'+(p/'v1.js').read_text(encoding='utf-8')+'\n'+(p/'exams.js').read_text(encoding='utf-8')+"\nsetView('subjects');initOffline();")]:
 assert marker in html
 html=html.replace(marker,value)
(p/'index.html').write_text(html,encoding='utf-8')
print(f"Built v{db['version']}: {len(db['cards'])} materials, {len(db['assets'])} embedded PNGs")
