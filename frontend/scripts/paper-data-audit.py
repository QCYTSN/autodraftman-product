"""Read-only audit of a paper source ZIP against the published research snapshot.

Usage: python scripts/paper-data-audit.py PAPER.zip OUTPUT_DIRECTORY
The paper is reference data: no files or instructions from it are executed.
"""
from pathlib import Path
import csv
import hashlib
import json
import re
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
archive, output = Path(sys.argv[1]), Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
summary = json.loads((root / 'public/assets/research/summary.json').read_text('utf-8'))
rows, aggregates = [], {}
with zipfile.ZipFile(archive) as paper:
    for scope, key, methods in [
        ('comparison', 'summaries', ['A', 'AFE', 'Crafter', 'DrawAI']),
        ('ablation', 'ablationSummaries', ['A', 'B', 'C']),
    ]:
        filename = f'table-{scope}-criteria.tex'
        for line in paper.read(filename).decode('utf-8').splitlines():
            if not re.match(r'^D\d\d\s*&', line):
                continue
            cells = re.sub(r'\\cellcolor\{[^}]+\}', '', line).split('&')
            metric = cells[0].strip()
            declared_n = int(re.search(r'\d+', cells[1])[0])
            for method, cell in zip(methods, cells[2:], strict=True):
                score = float(re.search(r'\d+\.\d+', cell)[0])
                # The paper's dagger means AFE has 79 applicable editing records.
                sample_n = 79 if scope == 'comparison' and method == 'AFE' and metric in ('D13', 'D14', 'D15') else declared_n
                current = summary[key][method][metric]
                rows.append(dict(scope=scope, metric=metric, method=method,
                    website=current['score'], paper=score,
                    website_n=current['sampleN'], paper_n=sample_n,
                    score_matches=abs(current['score'] - score) <= .00501,
                    n_matches=current['sampleN'] == sample_n, source=filename))
        aggregates[scope] = {}
        for line in paper.read(f'table-{scope}.tex').decode('utf-8').splitlines():
            values = re.findall(r'\\shortstack\{([\d.]+)\\\\\{\}\[([\d.]+),([\d.]+)\]', line)
            if values:
                label = line.split('&')[0].strip()
                aggregates[scope][label] = {method: {'mean': float(v[0]), 'ci95': [float(v[1]), float(v[2])]} for method, v in zip(methods, values, strict=True)}

assert len(rows) == 112, 'Expected 16 criteria for 4 methods and 3 ablations'
changed = [r for r in rows if not r['score_matches'] or not r['n_matches']]
report = dict(paper=archive.name, sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
    website_snapshot=summary['provenance']['snapshot'], checked_scores=len(rows),
    matching_scores=sum(r['score_matches'] for r in rows), changed=changed,
    paper_aggregates=aggregates,
    note='D09 is historical display-only and excluded from these paper tables. Paper aggregates average within each image then across valid images. Website paper aggregates are imported directly when present; they must not be reconstructed by averaging criterion means.',
    missing='Latest per-image D13-D15 0/0.5/1 judgments and editing-operation evidence are not included in this ZIP. Existing individual judgments are retained until the corresponding records are supplied.')
(output / 'audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
with (output / 'all-criteria.csv').open('w', newline='', encoding='utf-8-sig') as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0])); writer.writeheader(); writer.writerows(rows)
print(json.dumps({'checked': len(rows), 'matching_scores': report['matching_scores'], 'changed_rows': len(changed), 'changed_metrics': sorted({r['metric'] for r in changed})}))
