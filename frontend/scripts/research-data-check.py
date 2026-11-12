"""Cross-check retained identities and visual scores against the November 4 archive."""
from pathlib import Path
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
from PIL import Image

root = Path(__file__).resolve().parents[1]
archive = Path(sys.argv[1] if len(sys.argv) > 1 else r'D:/Downloads/FigFox-研究资料总库/FigFox-研究资料总库')
review = archive / '02-评分与证据/unified-refresh-20261104'
public = root / 'public/assets/research'
read = lambda p: json.loads(p.read_text('utf-8-sig'))
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
summary, index = read(public / 'summary.json'), read(public / 'samples.json')
stats, manifest = read(review / 'statistics.json'), read(review / 'artifact-manifest.json')
assert len(index) == 80 and len({s['id'] for s in index}) == 80
assert all(set(s) == {'id', 'category', 'sourceUrl'} for s in index)
assert (public / 'samples.json').stat().st_size < 30000
assert summary['provenance']['judgments'] == 8160
assert summary['provenance']['snapshot'] == '2026-11-10'
historical = read(public / 'history/20261104/summary.json')
editing = {'D13', 'D14', 'D15'}
for scope, key in [('comparison', 'summaries'), ('ablation', 'ablationSummaries')]:
    for metric in stats[scope]['criteria']:
        for i, method in enumerate(stats[scope]['methods']):
            score = historical[key][method][metric['id']]
            expected = stats[scope]['historical_D09_display'][i] if metric['id'] == 'D09' else metric['scores'][i][0]
            assert abs(score['score'] - expected) < 1e-9, (scope, method, metric['id'])
            assert score['sampleN'] == metric['n'] == score['judgmentN']
            if metric['id'] not in editing:
                assert summary[key][method][metric['id']] == score
            else:
                current = summary[key][method][metric['id']]
                assert current['counts'] == {} and current['individualRecords'] == 'unavailable'
                assert current['sampleN'] == (79 if method == 'AFE' else 80)
assert summary['resources'] == historical['resources']
assert summary['summaries']['A']['D01']['sampleN'] == 63
assert summary['ablationSummaries']['A']['D01']['sampleN'] == 74
previews = {k: 0 for k in summary['provenance']['svgCoverage']}
damaged = []
for record in manifest:
    sid = record['sample']
    sample = read(public / f'sample-meta/{sid}.json')
    details = read(public / f'details/{sid}.json')
    assert sample['id'] == sid
    source = archive / '01-实验/参考图' / sid / 'source.png'
    assert sha(source) == sample['source']['sourceHash']
    for method, candidate in record['candidates'].items():
        artifact = sample['artifacts'][method]
        assert candidate['source_sha256'] == sha(source)
        assert candidate['svg_sha256'] == artifact['svgHash'] == sha(public / artifact['svg'])
        try:
            ET.parse(public / artifact['svg'])
        except ET.ParseError:
            damaged.append([sid, method])
            assert artifact['status'] == 'damaged'
        if artifact.get('image'):
            previews[method] += 1
            assert sha(public / artifact['image']) == artifact['previewHash']
            with Image.open(public / artifact['image']) as image:
                # Thumbnail dimensions round to integer pixels, especially for wide strips.
                assert abs(image.width * artifact['height'] - image.height * artifact['width']) <= max(artifact['width'], artifact['height']), (sid, method)
                if method == 'C' and sid == 'sample-0004':
                    assert 'A' in image.getbands() and image.getextrema()[-1][0] == 0, 'Transparent background must remain transparent'
        assert len(sample['scores'][method]) == len(details[method]) == 17
        assert all(sum(s['counts'].values()) == 1 for s in sample['scores'][method].values())
assert previews == {'A': 80, 'DrawAI': 80, 'AFE': 79, 'Crafter': 80, 'B': 80, 'C': 80}
assert damaged == [['sample-0062', 'AFE']]
for sid in ['sample-0033', 'sample-0097']:
    assert read(public / f'sample-meta/{sid}.json')['artifacts']['AFE']['status'] == 'available'
assert read(public / 'sample-meta/sample-0030.json')['artifacts']['AFE']['previewOrigin'] == 'rendered-original-svg'
print(json.dumps({'scopes': 'verified separately against statistics.json', 'originalSvgHashes': 480,
                  'sourceIdentities': 80, 'previews': previews, 'damaged': damaged}, ensure_ascii=False))
