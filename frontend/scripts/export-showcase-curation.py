"""Export curated display evidence from unchanged recorded runs (no model calls)."""
import hashlib
import json
from pathlib import Path
import sys

package = Path(sys.argv[1])
public = Path(__file__).resolve().parents[1] / 'public/assets/research'
sample = 'sample-0072'
run = package / '01-实验/四方法对比/Full-FigFox' / sample / '完整记录'


def read(name):
    return json.loads((run / name).read_text(encoding='utf-8'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


receipt = read('native-acceptance.json')
proof = read('G0-reuse-proof.json')
assert digest(public / 'samples' / sample / 'C.svg') == receipt['initial_sha256'] == proof['initial_svg_sha256']
assert digest(public / 'samples' / sample / 'A.svg') == receipt['final_sha256']
issues = read('G1.json')['issues']
focus = []
for name, ids, zh, en, inspect_zh, inspect_en, repair_zh, repair_en in [
    ('protein', ['B1', 'D1'], '蛋白质细节', 'Protein detail',
     '蛋白质结构被简化为几块曲面。', 'The draft simplifies the protein into broad shapes.',
     '恢复结构细节，保留外围文字与连接。', 'Restore the structural detail and retain the surrounding labels and connections.'),
    ('cloud', ['A1', 'C1'], '点云细节', 'Point-cloud detail',
     '密集点云变成了稀疏、规则的圆点。', 'The dense point cloud becomes a sparse, regular dot pattern.',
     '恢复原图中的密集点云。', 'Restore the dense point cloud from the source.'),
]:
    selected = [issue for issue in issues if issue['id'] in ids]
    assert len(selected) == len(ids)
    x0 = min(issue['bbox'][0] for issue in selected)
    y0 = min(issue['bbox'][1] for issue in selected)
    x1 = max(issue['bbox'][2] for issue in selected)
    y1 = max(issue['bbox'][3] for issue in selected)
    focus.append({'id': name, 'issueIds': ids, 'label': {'zh': zh, 'en': en},
                  'bounds': [x0, y0, x1 - x0, y1 - y0],
                  'inspect': {'zh': inspect_zh, 'en': inspect_en},
                  'repair': {'zh': repair_zh, 'en': repair_en}})
operations = read('local-execution-operations.json')['transactions']
data = {
    'sample': sample, 'title': {'zh': '蛋白质结构生成', 'en': 'Protein structure generation'},
    'width': 1776, 'height': 309, 'focus': focus, 'issues': issues, 'receipt': receipt,
    'operations': [{'transaction': t['id'], 'edits': [{'op': e['op'], 'target': e.get('id', '')} for e in t['edits']]} for t in operations],
    'provenance': {'run': '四方法对比/Full-FigFox/' + sample,
                   'files': {name: digest(run / name) for name in ['G1.json', 'native-acceptance.json', 'G0-reuse-proof.json', 'local-execution-operations.json']},
                   'sourceSha256': proof['source_sha256']},
}
(public / 'pipeline-featured.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Verified matching draft/final hashes; exported recorded pipeline evidence for ' + sample)
