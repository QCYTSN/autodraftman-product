"""Apply the full-80 paper tables, without inventing individual judgments.

Run after export-research.py, or directly with `python scripts/paper_summary.py`.
The three checked-in TeX tables are data only; no TeX is executed.
"""
import csv
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(__file__).with_name('research-paper-20261110')
VERSION = 'paper-full80-20261110'
EDITING = {'D13', 'D14', 'D15'}


def apply_paper_summary(output=ROOT / 'public/assets/research'):
    read = lambda path: json.loads(path.read_text('utf-8-sig'))
    write = lambda path, value: path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    summary = read(output / 'summary.json')
    history = output / 'history/20261104'
    history.mkdir(parents=True, exist_ok=True)
    if summary['provenance']['version'] != VERSION:
        assert summary['provenance']['snapshot'] == '2026-11-04', 'Unexpected source snapshot; audit before importing'
        # Retain the previous snapshot and downloads with their original identity.
        for name in ['summary.json', 'provenance.json', '四方法评分.csv', '消融评分.csv', '评分计数.csv', '数据口径.csv']:
            (history / name).write_bytes((output / name).read_bytes())
    previous = read(history / 'summary.json')
    source_manifest = read(SOURCE / 'source.json')
    for name, digest in source_manifest['sha256'].items():
        assert hashlib.sha256((SOURCE / name).read_bytes()).hexdigest() == digest, name

    rows = [line.split('&') for line in (SOURCE / 'table-all-criteria.tex').read_text('utf-8').splitlines() if re.match(r'^D\d\d ', line)]
    assert len(rows) == 17
    csv_rows = {}
    for scope, key, methods, n_column, first_score in [
        ('comparison', 'summaries', ['A', 'AFE', 'Crafter', 'DrawAI'], 1, 2),
        ('ablation', 'ablationSummaries', ['A', 'B', 'C'], 6, 7),
    ]:
        records = [['metric', 'name', 'version', 'method', 'mean_0_100', 'valid_images', 'scoring', 'individual_records']]
        for cells in rows:
            metric, name = cells[0].strip().split(' ', 1)
            for i, method in enumerate(methods):
                paper_value = float(re.search(r'\d+\.\d+', cells[first_score + i])[0])
                old = previous[key][method][metric]
                if metric in EDITING:
                    n = 79 if method == 'AFE' else 80
                    summary[key][method][metric] = dict(score=paper_value, counts={}, sampleN=n,
                        judgmentN=n, version=VERSION, individualRecords='unavailable')
                else:
                    # Paper rounds visual scores to two decimals; retain source precision.
                    assert abs(old['score'] - paper_value) <= .00501, (scope, metric, method)
                    if metric != 'D09':
                        assert old['sampleN'] == int(cells[n_column].strip())
                    summary[key][method][metric] = old
                score = summary[key][method][metric]
                records.append([metric, name, VERSION if metric != 'D09' else 'historical-D09', method,
                    score['score'], score['sampleN'] if metric != 'D09' else '',
                    '0/0.5/1 mean x 100' if metric in EDITING else 'historical' if metric == 'D09' else '0/1 mean x 100',
                    'unavailable' if metric in EDITING else '20261104'])
        csv_rows['四方法评分.csv' if scope == 'comparison' else '消融评分.csv'] = records

    aggregates = {}
    aggregate_rows = [['scope', 'measure', 'method', 'mean_0_100', 'ci95_low', 'ci95_high', 'valid_images', 'version']]
    for scope, methods in [('comparison', ['A', 'AFE', 'Crafter', 'DrawAI']), ('ablation', ['A', 'B', 'C'])]:
        aggregates[scope] = {}
        for line in (SOURCE / f'table-{scope}.tex').read_text('utf-8').splitlines():
            values = re.findall(r'\\shortstack\{([\d.]+)\\\\\{\}\[([\d.]+),([\d.]+)\]', line)
            if not values:
                continue
            measure = {'保真度': 'fidelity', '可编辑性': 'editability', '总体': 'overall'}[line.split('&')[0].strip()]
            aggregates[scope][measure] = {}
            for method, values_for_method in zip(methods, values, strict=True):
                mean, low, high = map(float, values_for_method)
                n = 79 if scope == 'comparison' and (measure == 'fidelity' or method == 'AFE') else 80
                assert 0 <= low <= mean <= high <= 100
                aggregates[scope][measure][method] = dict(mean=mean, ci95=[low, high], sampleN=n)
                aggregate_rows.append([scope, measure, method, mean, low, high, n, VERSION])
        assert len(aggregates[scope]) == 3
    summary['aggregates'] = aggregates
    for metric in summary['metrics']:
        if metric['id'] in EDITING:
            metric['aggregation'] = '100 x mean(1 pass, 0.5 partial, 0 fail), NA excluded'
            metric['na'] = '本轮网页编辑复评：AFE sample-0062 原件损坏，D13–D15 记 NA，排除分母。'
            metric['evidence'] = '全量网页编辑复评汇总；新版逐图操作记录尚未提供。'
    summary['provenance'] = {**previous['provenance'], 'snapshot': '2026-11-10', 'version': VERSION,
        'detailSnapshot': '2026-11-04', 'summaryOnlyMetrics': sorted(EDITING), 'paper': source_manifest,
        'judgmentsScope': 'The judgments count and sourceHashes describe the retained 20261104 per-image archive, not the updated editing review.',
        'scopes': {scope: {**previous['provenance']['scopes'][scope], 'aggregation': 'Mean valid criteria within each image, then mean across valid images; D09 excluded.',
                          'reviewMethod': 'Existing visual review plus full-cohort web-editor 0/0.5/1 re-review.'}
                   for scope in ['comparison', 'ablation']}}
    write(output / 'summary.json', summary)
    write(output / 'provenance.json', summary['provenance'])
    csv_rows['论文汇总评分.csv'] = aggregate_rows
    csv_rows['数据口径.csv'] = [
        ['field', 'value'], ['version', VERSION], ['source', source_manifest['directory']],
        ['D13-D15', 'Full-cohort web-editor review; pass=1, partial=0.5, fail=0; NA excluded; mean x 100'],
        ['editing sampleN', 'AFE=79; all other methods/configurations=80; AFE sample-0062 excluded as NA'],
        ['overall', 'Mean valid criteria within each image, then mean across images; D09 excluded; comparison and ablation have separate eligible sets'],
        ['CI95', 'Image bootstrap, 10000 resamples, seed 20261104; copied from the paper, not recalculated'],
        ['individual records', '20261104 historical binary records retained; latest D13-D15 individual records unavailable'],
        ['resources', 'Unchanged original per-image records, including retained API reserves where recorded'],
    ]
    # The old count file must not appear to describe the new partial-credit review.
    csv_rows['评分计数.csv'] = [['version', 'availability', 'historical_file'],
        [VERSION, 'Latest per-image editing counts unavailable', 'history/20261104/评分计数.csv']]
    for name, records in csv_rows.items():
        with (output / name).open('w', newline='', encoding='utf-8-sig') as handle:
            csv.writer(handle).writerows(records)
    print(json.dumps({'version': VERSION, 'criteria': len(rows), 'aggregate_cells': len(aggregate_rows) - 1}))


if __name__ == '__main__':
    apply_paper_summary()
