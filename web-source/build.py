"""Build the offline app from readable modules and versioned content files.

The large single HTML is a distribution artifact, not the editable source.
"""
from pathlib import Path
import base64
import json

SOURCE = Path(__file__).resolve().parent
SCRIPTS = [
    'app.js', 'study.js', 'upgrades.js', 'fixes.js', 'topic_tasks.js',
    'compatibility.js', 'russian_topics.js', 'learning_v07.js',
    'homework.js', 'v1.js', 'exams.js',
    'modules/storage.js', 'modules/schedule.js', 'modules/navigation.js',
    'modules/reader.js', 'modules/textbooks.js', 'modules/about.js', 'modules/integration.js',
]


def read_json(name):
    return json.loads((SOURCE / name).read_text(encoding='utf-8'))


def build():
    data = read_json('library.json')
    for name in ['history-v2', 'subjects-v2']:
        data['cards'].extend(read_json(f'data/{name}.json'))
    by_id = {card['id']: card for card in data['cards']}
    assert len(by_id) == len(data['cards']), 'Duplicate card IDs'
    for update in read_json('data/literature-v2.json'):
        card = by_id[update['id']]
        card['sections'] = update['sections'] + card.get('sections', [])
        card['qa'] = card.get('qa', []) + update['qa']
    data['classics'] = read_json('data/classics.json')
    data['elements'] = read_json('elements.json')
    data['geography'] = read_json('geography.json')
    data['morphology'] = read_json('morphology.json')
    data['examBank'] = read_json('exam-bank.json')
    essays = [card for card in data['cards'] if card.get('kind') == 'essay']
    assert len(essays) == 436
    assert all(len(card.get('essays', [])) == 2 for card in essays)
    assert all(essay['wordCount'] >= 350 for card in essays for essay in card['essays'])
    assert len(data['examBank']['tasks']) == 56
    assert all(len(card.get('solved', [])) >= 2 for card in data['cards'] if card['subject'] == 'Биология')
    assert len(data['classics']) == 2
    data['assets'] = {}
    for asset in read_json('image_credits.json'):
        encoded = base64.b64encode((SOURCE / asset['file']).read_bytes()).decode()
        data['assets'][asset['id']] = {**asset, 'data': 'data:image/png;base64,' + encoded}
    scripts = []
    for name in SCRIPTS:
        source = (SOURCE / name).read_text(encoding='utf-8')
        if name == 'study.js':
            source = source.replace("setView('library');initOffline();", '')
            # Also accept formatted legacy initialization.
            source = source.replace('setView("library");\ninitOffline();', '')
        scripts.append(source)
    scripts.append("setView('subjects');initOffline();")
    html = (SOURCE / 'template.html').read_text(encoding='utf-8')
    replacements = {
        '/*STYLE*/': (SOURCE / 'style.css').read_text() + '\n' + (SOURCE / 'modules/v2.css').read_text(),
        '/*DATA*/': json.dumps(data, ensure_ascii=False).replace('</', '<\\/'),
        '/*APP*/': '\n'.join(scripts),
    }
    for marker, value in replacements.items():
        assert marker in html
        html = html.replace(marker, value)
    (SOURCE / 'index.html').write_text(html, encoding='utf-8')
    print(f"Built v{data['version']}: {len(data['cards'])} cards, {len(data['classics'])} full books")


if __name__ == '__main__':
    build()
