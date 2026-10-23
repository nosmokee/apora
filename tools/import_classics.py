"""Import public-domain primary texts; never import modern summaries or commentary.

The published reader uses reflowable, application-generated pages, not printed
page references. Source HTML is cached outside the repository for reproducibility.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib,json,re,time,subprocess
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
CACHE=Path('/data/opora-classics-source');CACHE.mkdir(exist_ok=True)

def fetch(url):
    target=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.html')
    if target.exists():return target.read_bytes()
    for attempt in range(3):
        try:
            result=subprocess.run(['curl','--http1.0','--compressed','-L','--max-time','45','-sS',url],capture_output=True)
            data=result.stdout
            if result.returncode and b'</html>' not in data.lower():raise ValueError('Source request failed')
            if len(data)<1000:raise ValueError('Incomplete source')
            target.write_bytes(data);return data
        except Exception:
            if attempt==2:raise
            time.sleep(2)

def chapter(item):
    label,url=item
    soup=BeautifulSoup(fetch(url),'html.parser');text=soup.select_one('#text')
    if not text:raise ValueError('Missing text '+url)
    for node in text.select('script,style,fn,.fns,.thdr,.author,.title,.notes'):
        node.decompose()
    paragraphs=[]
    for node in text.find_all(['h2','h3','z']):
        if node.find_parent('z'):continue
        if node.name=='z' and node.select('v'):
            value='\n'.join(v.get_text(' ',strip=True) for v in node.select('v'))
        else:value=node.get_text(' ',strip=True)
        value=re.sub(r'[ \t]+',' ',value).strip()
        if value:paragraphs.append(value)
    if sum(map(len,paragraphs))<500:raise ValueError('Chapter too short '+url)
    return {'title':label,'paragraphs':paragraphs,'source':url}

books=[]
for id,number,title,author,year,minchap in [('work-captain',107,'Капитанская дочка','Александр Пушкин',1836,14),('work-onegin',436,'Евгений Онегин','Александр Пушкин',1833,9)]:
    url=f'https://ilibrary.ru/text/{number}/index.html';soup=BeautifulSoup(fetch(url),'html.parser')
    links={}
    for a in soup.select('a[href]'):
        href=a['href'];m=re.fullmatch(rf'/text/{number}/p\.(\d+)/index\.html',href)
        if m:
            num=int(m[1]);label=a.get_text(' ',strip=True)
            if number==436 and num==1:label='Посвящение и эпиграф'
            if number==436 and num==12:label='Приложение: фрагменты десятой главы'
            if number==107 and num==15:label='Приложение: пропущенная глава (черновик)'
            if num not in links or (len(label)>len(links[num][0]) and label!='Читать онлайн'):
                links[num]=(label,'https://ilibrary.ru'+href)
    assert len(links)>=minchap,(title,len(links))
    with ThreadPoolExecutor(max_workers=3) as pool:
        chapters=list(pool.map(chapter,[links[n] for n in sorted(links)]))
    books.append({'id':id,'title':title,'author':author,'firstPublished':year,'source':url,'rights':'Оригинальное произведение в общественном достоянии: автор умер в 1837 году. Источник транскрипции — Интернет-библиотека Алексея Комарова. Редакторские примечания сайта не включены.','pagination':'Страницы приложения условные и не совпадают с печатным изданием.','chapters':chapters})
    print(title,len(chapters),'source sections',sum(len(p) for c in chapters for p in c['paragraphs']),'characters',flush=True)
(ROOT/'web-source/data/classics.json').write_text(json.dumps(books,ensure_ascii=False,indent=2)+'\n')
