"""Publish curated observation overlays without changing judgments or artifacts."""
import json
import xml.etree.ElementTree as ET
from pathlib import Path


def apply_examples(out, examples):
    catalog = json.loads((Path(__file__).with_name('research-examples.json')).read_text('utf-8'))
    for scope, criteria in catalog.items():
        for metric, observation in criteria.items():
            sid = observation['sample']
            sample = json.loads((out / f'sample-meta/{sid}.json').read_text('utf-8'))
            assert metric in sample['eligible'][scope], (scope, metric, sid)
            assert (out / observation['evidence'].split('#')[0]).is_file()
            for method, region in observation['regions'].items():
                assert method == 'source' or method in observation['methods']
                x, y, width, height = region['bounds']
                assert min(x, y) >= 0 and min(width, height) > 0
                assert x + width <= 1 and y + height <= 1
                if region.get('objectIds'):
                    artifact = sample['artifacts'][method]
                    ids = {e.get('id') for e in ET.parse(out / artifact['svg']).iter()}
                    assert set(region['objectIds']) <= ids, (sid, method)
            examples[scope][metric] = sid
    (out / 'example-observations.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), 'utf-8')


if __name__ == '__main__':
    out = Path(__file__).resolve().parents[1] / 'public/assets/research'
    summary = json.loads((out / 'summary.json').read_text('utf-8'))
    apply_examples(out, summary['examples'])
    (out / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, separators=(',', ':')), 'utf-8')
    print('Published 12 curated observations; scores and original artifacts unchanged.')
