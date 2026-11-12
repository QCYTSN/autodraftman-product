"""Export the November 4 archive; no model calls or edits to source files.
Usage: python scripts/export-research.py [research-archive-directory]
Requires Pillow and existing Playwright/Chrome for an absent archival PNG.
"""
import csv
import hashlib
import io
import json
import subprocess
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from PIL import Image
from research_examples import apply_examples

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1] if len(sys.argv) > 1 else r'D:/Downloads/FigFox-研究资料总库/FigFox-研究资料总库')
REVIEW = SOURCE / '02-评分与证据/unified-refresh-20261104'
OUT = ROOT / 'public/assets/research'
OUT.mkdir(parents=True, exist_ok=True)
VERSION = '20261104-codex-harness'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def readjson(path):
    return json.loads(path.read_text('utf-8-sig'))


def write_bytes(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_bytes() != data:
        path.write_bytes(data)


def write(name, data):
    write_bytes(OUT / name, json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))


def write_csv(name, rows):
    text = io.StringIO(newline='')
    csv.writer(text).writerows(rows)
    write_bytes(OUT / name, text.getvalue().encode('utf-8-sig'))


def original_svg(path, expected):
    """Restore archive-normalized newlines only when the original hash proves identity."""
    data = path.read_bytes()
    lf = data.replace(b'\r\n', b'\n')
    for candidate, conversion in [(data, 'unchanged'), (lf, 'LF'), (lf.replace(b'\n', b'\r\n'), 'CRLF')]:
        if sha(candidate) == expected:
            return candidate, conversion
    raise ValueError(f'Original SVG identity cannot be verified: {path}')


def publish_image(data, name):
    image = Image.open(io.BytesIO(data))
    # Preserve transparent backgrounds instead of exposing their hidden black RGB.
    image = image.convert('RGBA' if 'A' in image.getbands() or 'transparency' in image.info else 'RGB')
    width, height = image.size
    image.thumbnail((1600, 1200))
    buffer = io.BytesIO()
    image.save(buffer, 'WEBP', quality=88)
    preview = buffer.getvalue()
    write_bytes(OUT / (name + '.webp'), preview)
    return {'image': name + '.webp', 'width': width, 'height': height,
            'sourceHash': sha(data), 'previewHash': sha(preview)}


catalog = readjson(ROOT / 'scripts/research-catalog.json')
inputs = readjson(REVIEW / 'inputs.json')
statistics = readjson(REVIEW / 'statistics.json')
manifest = {r['sample']: r for r in readjson(REVIEW / 'artifact-manifest.json')}
judgments = readjson(REVIEW / 'harness-judgments.json')
methods, metrics = catalog['methods'], catalog['metrics']
keys = [m['id'] for m in methods]
sample_ids = [s['id'] for s in catalog['samples']]
assert set(sample_ids) == set(inputs['samples']) == set(manifest)
assert len(sample_ids) == 80 and len(judgments) == 80 * 6 * 17
assert [r[1] for r in inputs['sheets']['7'][3:]] == [m['name'] for m in metrics]

by_sample = {sid: {k: {} for k in keys} for sid in sample_ids}
for row in judgments:
    sid, method, metric = row['sample'], row['method'], row['id']
    original = manifest[sid]['candidates'][method]
    assert row['source_sha256'] == original['source_sha256']
    assert row['svg_sha256'] == original['svg_sha256']
    assert row['status'] in ('pass', 'fail', 'unknown', 'NA')
    assert metric not in by_sample[sid][method], (sid, method, metric)
    by_sample[sid][method][metric] = row

scopes, eligibility, examples = {}, {}, {}
for scope, stats in statistics.items():
    ids = stats['methods']
    scopes[scope] = {k: {} for k in ids}
    eligibility[scope] = {sid: [] for sid in sample_ids}
    examples[scope] = {}
    for metric in stats['criteria']:
        mid = metric['id']
        valid = [sid for sid in sample_ids if all(by_sample[sid][k][mid]['status'] in ('pass', 'fail') for k in ids)]
        assert len(valid) == metric['n'], (scope, mid, len(valid), metric['n'])
        examples[scope][mid] = valid[0] if valid else sample_ids[0]
        for sid in valid:
            eligibility[scope][sid].append(mid)
        for index, k in enumerate(ids):
            counts = Counter(by_sample[sid][k][mid]['status'] for sid in valid)
            raw = Counter(by_sample[sid][k][mid]['status'] for sid in sample_ids)
            current = 100 * counts['pass'] / len(valid) if valid else None
            assert current is not None and abs(current - metric['scores'][index][0]) < 1e-8
            score = stats['historical_D09_display'][index] if mid == 'D09' else current
            scopes[scope][k][mid] = {
                'score': score, 'currentScore': current, 'counts': dict(counts),
                'rawCounts': dict(raw), 'sampleN': len(valid), 'judgmentN': len(valid),
                'version': 'historical-D09' if mid == 'D09' else VERSION, 'scope': scope}
    write_csv('四方法评分.csv' if scope == 'comparison' else '消融评分.csv',
              [['指标', '名称', '评分版本', '共同有效图数', *ids], *[
                  [m['id'], m['name'], scopes[scope][ids[0]][m['id']]['version'],
                   '' if m['id'] == 'D09' else scopes[scope][ids[0]][m['id']]['sampleN'],
                   *[scopes[scope][k][m['id']]['score'] for k in ids]] for m in metrics]])

resource_names = {'A': 'FigFox A', 'B': 'FigFox B', 'C': 'FigFox C',
                  'AFE': 'AutoFigureEdit', 'DrawAI': 'DrawAI', 'Crafter': 'FigureCrafter'}
sheet = inputs['sheets']['3']
resources = {}
for k, name in resource_names.items():
    col = sheet[2].index(name)
    values = {r[0]: r[col] for r in sheet[3:] if len(r) > col and isinstance(r[col], (int, float))}
    resources[k] = {'cost': values['平均计入费用USD/张'], 'minutes': values['平均时间分钟/张'],
                    'tokens': values['平均API Token/张'], 'n': 80, 'comparable': k in ('A', 'B', 'C')}
efficiency = {r[0]: dict(zip(inputs['sheets']['4'][2][1:], r[1:])) for r in inputs['sheets']['4'][3:]}
folders = {'A': '四方法对比/Full-FigFox', 'AFE': '四方法对比/AFE', 'DrawAI': '四方法对比/DrawAI',
           'Crafter': '四方法对比/Crafter', 'B': '三配置消融/wo-SAM3', 'C': '三配置消融/wo-repair'}
coverage, restoration, derived, damaged = Counter(), Counter(), [], []
sample_index = []
for item in catalog['samples']:
    sid = item['id']
    source = (SOURCE / '01-实验/参考图' / sid / 'source.png').read_bytes()
    assert sha(source) == item['sourceHash']
    sample = {k: item[k] for k in ('id', 'category', 'sourceUrl')}
    sample_index.append(dict(sample))
    sample['source'] = publish_image(source, f'samples/{sid}/source')
    sample['artifacts'], sample['scores'], details = {}, {}, {}
    sample['eligible'] = {scope: eligibility[scope][sid] for scope in scopes}
    for k in keys:
        directory = SOURCE / '01-实验' / folders[k] / sid
        m = readjson(directory / '来源.json')
        assert m['source_sha256'] == sha(source) == manifest[sid]['candidates'][k]['source_sha256']
        assert m['svg_sha256'] == manifest[sid]['candidates'][k]['svg_sha256']
        svg, conversion = original_svg(directory / '最终输出.svg', m['svg_sha256'])
        restoration[conversion] += 1
        destination = f'samples/{sid}/{k}.svg'
        write_bytes(OUT / destination, svg)
        artifact = {'status': 'missing', 'svg': destination, 'svgHash': sha(svg),
                    'archiveSvgHash': sha((directory / '最终输出.svg').read_bytes()),
                    'byteRecovery': conversion, 'runId': f'{folders[k]}/{sid}',
                    'conditionId': k, 'evaluationVersion': VERSION}
        try:
            ET.fromstring(svg)
            parseable = True
        except ET.ParseError:
            parseable = False
            artifact['status'] = 'damaged'
            damaged.append([sid, k])
        png_path = directory / '最终输出.png'
        png = None
        if png_path.exists():
            png = png_path.read_bytes()
            assert sha(png) == m['png_sha256'], (sid, k, 'PNG identity')
            artifact['previewOrigin'] = 'recorded-png'
        elif parseable:
            assert m['png_sha256'] is None
            rendered = ROOT / '.review/research-rendered' / f'{sid}-{k}.png'
            rendered.parent.mkdir(parents=True, exist_ok=True)
            result = subprocess.run(['node', str(ROOT / 'scripts/render-research-preview.mjs'),
                                     str(OUT / destination), str(rendered)], check=True, capture_output=True, text=True)
            artifact['renderer'] = json.loads(result.stdout)['renderer']
            artifact['previewOrigin'] = 'rendered-original-svg'
            png = rendered.read_bytes()
            derived.append([sid, k])
        if png:
            artifact.update(publish_image(png, f'samples/{sid}/{k}'))
            artifact['status'] = 'available'
            coverage[k] += 1
        sample['artifacts'][k] = artifact
        sample['scores'][k], details[k] = {}, {}
        for metric in metrics:
            mid = metric['id']
            row = by_sample[sid][k][mid]
            sample['scores'][k][mid] = {'score': row['score'], 'counts': {row['status']: 1}}
            details[k][mid] = {'evidence': [{'status': row['status'], 'text': row['evidence'],
                                           'reviewer': 0, 'source': row['review_source']}]}
    sample['resources'] = {k: {'cost': efficiency[sid][k + '费用USD'],
                               'seconds': efficiency[sid][k + '记录耗时秒'],
                               'tokens': efficiency[sid][k + ' API Token']} for k in ('A', 'B', 'C')}
    write(f'sample-meta/{sid}.json', sample)
    write(f'details/{sid}.json', details)

pipeline_path = SOURCE / '01-实验/四方法对比/Full-FigFox/sample-0001/完整记录'
g1, g2 = readjson(pipeline_path / 'G1.json'), readjson(pipeline_path / 'G2.json')
receipt = readjson(pipeline_path / 'native-acceptance.json')
ops = readjson(pipeline_path / 'local-execution-operations.json')
assert receipt['initial_sha256'] == manifest['sample-0001']['candidates']['C']['svg_sha256']
write('pipeline.json', {'sample': 'sample-0001', 'issues': g1.get('issues', [])[:8],
                       'facts': g2.get('fact_checks', [])[:8], 'receipt': receipt,
                       'operations': [{'transaction': t['id'], 'edits': [
                           {'op': e['op'], 'target': e.get('id', '')} for e in t.get('edits', [])]}
                           for t in ops['transactions']]})
provenance = {'snapshot': '2026-11-04', 'version': VERSION, 'cohortN': 80,
              'judgments': len(judgments), 'reviewers': 1, 'coverage': dict(coverage),
              'svgCoverage': {k: 80 for k in keys}, 'damaged': damaged, 'derivedPreviews': derived,
              'byteRecovery': dict(restoration), 'sourceHashes': {n: sha((REVIEW / n).read_bytes())
              for n in ['statistics.json', 'harness-judgments.json', 'artifact-manifest.json', 'inputs.json']},
              'scopes': {scope: {'methods': s['methods'], 'aggregation': s['aggregation'],
                                 'reviewMethod': s['review_method']} for scope, s in statistics.items()}}
apply_examples(OUT, examples)
write('summary.json', {'methods': methods, 'metrics': metrics, 'summaries': scopes['comparison'],
                       'ablationSummaries': scopes['ablation'], 'resources': resources,
                       'examples': examples, 'provenance': provenance})
write('samples.json', sample_index)
write('provenance.json', provenance)
write_csv('评分计数.csv', [['方法', '指标', '通过', '失败', '未知', 'NA'], *[
    [k, metric['id'], *[sum(by_sample[sid][k][metric['id']]['status'] == status for sid in sample_ids)
                        for status in ('pass', 'fail', 'unknown', 'NA')]] for k in keys for metric in metrics]])
write_csv('评分标准.csv', inputs['sheets']['7'])
write_csv('时间费用Token.csv', inputs['sheets']['3'])
write_csv('数据口径.csv', [['版本', VERSION], ['评分来源', statistics['comparison']['review_method']],
                          *[[scope, s['aggregation']] for scope, s in statistics.items()]])
print(json.dumps({'samples': 80, 'judgments': len(judgments), 'previews': dict(coverage),
                  'svgFiles': 480, 'damaged': damaged, 'derivedPreviews': derived,
                  'byteRecovery': dict(restoration)}, ensure_ascii=False))

# Apply the later paper summaries after preserving the original per-image export.
from paper_summary import apply_paper_summary
apply_paper_summary(OUT)
