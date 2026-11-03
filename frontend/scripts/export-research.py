"""Read-only adapter for the frozen Nov 3 cohort. No model calls or rescoring.
Usage: python scripts/export-research.py [materials-directory] [extra-artifact-directory]
"""
import csv, hashlib, io, json, os, shutil, sys, zipfile
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1] if len(sys.argv) > 1 else r'D:/Github_Ku/FigFox-926/fyp_experiment_materials')
OUT = ROOT / 'public/assets/research'
OUT.mkdir(parents=True, exist_ok=True)
def sha(data): return hashlib.sha256(data).hexdigest()
def readcsv(name, skip=2):
    with (SOURCE/'数据表'/name).open(encoding='utf-8-sig', newline='') as f:
        for _ in range(skip): next(f)
        return list(csv.DictReader(f))
def readjson(p): return json.loads(p.read_text('utf-8-sig'))
def write(name, data):
    p=OUT/name; p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

methods=[{'id': k,'name':n,'color':c,'variant':v,'model':model} for k,n,c,v,model in [
 ('A','FigFox','#6243ce','A · SAM + G0/G1/G2 + native execution','GPT-5.5 (G0/G1/G2)'),
 ('DrawAI','DrawAI','#007d88','DrawAI · 20261023 delivery','See historical delivery; not inferred from current upstream defaults'),
 ('AFE','AutoFigure','#b55327','AutoFigureEdit · 20261020 delivery','Not recorded in supplied summary'),
 ('Crafter','Crafter','#3564b1','FigureCrafter · 20261023 delivery','Includes gpt-image-2; full configuration not in summary'),
 ('B','FigFox B','#976235','B · no SAM + full repair','GPT-5.5 (G0/G1/G2)'),
 ('C','FigFox C','#657384','C · SAM + G0 only; identical A checkpoint','GPT-5.5 (G0)')]]
keys=[m['id'] for m in methods]
names_en=['Text, numbers & units','Formula semantics & structure','Object completeness & identity','Counts & repetition','Connection topology & direction','Unambiguous routing','Containment & ownership','Layout, alignment & symmetry','Geometry & internal structure','Visibility & readability','Color, emphasis & hierarchy','Scale & style consistency','Editable content','Grouping & decomposition','File & edit reliability','Local image fidelity','Data chart faithfulness']
groups_en=['Content correctness']*4+['Relations & structure']*5+['Reading & visual order']*3+['Editability']*3+['Specific content']*2
targets_en=['Preserve wording, values and units.','Preserve symbols, operations, scripts, fractions and grouping.','Retain source objects without omissions or inventions.','Preserve layer, step and repeated-unit counts.','Preserve connectivity and arrow direction.','Keep routes clear and unambiguous.','Keep content inside its correct container.','Preserve relative position, alignment and symmetry.','Preserve geometry and internal construction.','Keep content visible and readable.','Preserve color roles, emphasis and hierarchy.','Keep scale and similar styles consistent.','Keep meaningful content individually editable.','Use useful object groups and separations.','Open, edit, save and reopen reliably.','Preserve local photographic and image content.','Preserve the meaning and structure of data charts.']
metrics=[]
for i,r in enumerate(readcsv('评分标准.csv')):
    metrics.append({'id':r['编号'],'name':r['名称'],'en':names_en[i],'group':r['类别'],'groupEn':groups_en[i],'definition':r['目标'],'definitionEn':targets_en[i], 'unit':r['计量单元'],'evidence':r['证据'],'boundary':r['错误边界'],'na':r['NA规则'],'direction':'higher','range':[0,100],'scale':'score','aggregation':'100 × pass / (pass + fail)'})
assert len(metrics)==17
judgments=readcsv('评分判断明细.csv')
assert len(judgments)==2720
samples_csv=list(csv.DictReader((SOURCE/'02_dataset/samples_80.csv').open(encoding='utf-8-sig')))
assert len({r['sample_id'] for r in samples_csv})==80
by_sample={r['sample_id']:{} for r in samples_csv}
evidence={s:{} for s in by_sample}
counts={m['id']:{d['id']:Counter() for d in metrics} for m in methods}
for r in judgments:
    sid,mid=r['图片'],r['维度']
    for k in keys:
        status=r[k+'判断']; assert status in ['pass','fail','unknown','NA'],status
        counts[k][mid][status]+=1
        cell=by_sample[sid].setdefault(k,{}).setdefault(mid,{'counts':Counter(),'evidence':[]})
        cell['counts'][status]+=1
        cell['evidence'].append({'reviewer':int(r['评审']),'status':status,'text':r[k+'证据'],'request':r['评审请求ID']})
def score(c): return 100*c.get('pass',0)/(c.get('pass',0)+c.get('fail',0)) if c.get('pass',0)+c.get('fail',0) else None
summaries={k:{} for k in keys}
four=readcsv('四方法评分.csv'); ablation=readcsv('消融评分.csv')
column={'A':'FigFox A','DrawAI':'DrawAI','AFE':'AutoFigureEdit','Crafter':'FigureCrafter'}
for i,d in enumerate(metrics):
    mid=d['id']
    for k in keys:
        c=counts[k][mid]
        official=float(four[i][column[k]]) if k in column else float(ablation[i]['B：无SAM完整' if k=='B' else 'C：有SAM初稿'])
        assert sum(c.values())==160
        if mid!='D09': assert abs(score(c)-official)<1e-8,(k,mid)
        summaries[k][mid]={'score':official,'currentScore':score(c),'counts':dict(c),'judgmentN':c['pass']+c['fail'],'sampleN':sum(bool(by_sample[s][k][mid]['counts']['pass']+by_sample[s][k][mid]['counts']['fail']) for s in by_sample),'version':'historical-D09' if mid=='D09' else '20261103-double-review'}
for r in readcsv('评分计数.csv',1):
    label={'通过':'pass','失败':'fail','未知':'unknown','不适用':'NA'}[r['判断类别']]
    for k in keys: assert counts[k][r['维度']][label]==int(r[k])

# Index archives by artifact hash: names alone are never accepted as identity.
archives=[]
for directory in [Path(r'D:/Downloads'),Path(r'C:/Users/peanut/xwechat_files/wxid_jdplfr7w9pl222_08cd/msg/file/2026-10')]+([Path(sys.argv[2])] if len(sys.argv)>2 else []):
    if directory.exists(): archives.extend(directory.glob('*.zip'))
artifact_index={}; opened=[]
for p in archives:
    if not any(x in p.name.lower() for x in ['crafter','drawai','afe','autofigure']): continue
    z=zipfile.ZipFile(p); opened.append(z)
    for name in z.namelist():
        if name.endswith('final.svg'):
            artifact_index[sha(z.read(name))]=(z,name)

def publish_image(data, name):
    im=Image.open(io.BytesIO(data)).convert('RGB'); width,height=im.size
    im.thumbnail((1600,1200)); p=OUT/(name+'.webp');p.parent.mkdir(parents=True,exist_ok=True)
    im.save(p,'WEBP',quality=88)
    return {'image':name+'.webp','width':width,'height':height,'sourceHash':sha(data),'previewHash':sha(p.read_bytes())}
efficiency={r['图片']:r for r in readcsv('逐图效率.csv')}
samples=[]; coverage=Counter()
for r in samples_csv:
    sid=r['sample_id']; base=SOURCE/'01_latest'; original=(base/'inputs'/sid/'source.png').read_bytes()
    assert sha(original)==r['source_sha256']
    checkpoint=readjson(base/'checkpoints'/sid/'with-sam/manifest.json')
    acceptance=readjson(base/'evidence'/sid/'A/native-acceptance.json')
    assert checkpoint['source_sha256']==r['source_sha256']
    assert sha((base/'results'/sid/'C/final.svg').read_bytes())==checkpoint['initial_sha256']==acceptance['initial_sha256'], (sid,'A/C draft lineage')
    mapping=readjson(base/'evaluation/comprehensive-review'/sid/'complete.json')['mapping']
    mapping={v['method']:v for v in mapping.values()}
    sample={'id':sid,'category':r['clutter_bin'],'sourceUrl':r['source_url'],'source':publish_image(original,f'samples/{sid}/source'),'artifacts':{}}
    for k in keys:
        m=mapping[k]; svg=None; png=None
        if k in ['A','B','C']:
            svg=(base/'results'/sid/k/'final.svg').read_bytes();png=(base/'results'/sid/k/'final.png').read_bytes()
        elif m.get('svg_sha256') in artifact_index:
            z,n=artifact_index[m['svg_sha256']];svg=z.read(n)
            pn=n[:-3]+'png'
            if pn in z.namelist(): png=z.read(pn)
        artifact={'status':'missing','svgHash':m.get('svg_sha256'),'runId':m['svg'].split('/samples/')[0].split('/cases/')[0], 'conditionId':k,'evaluationVersion':'20261103-double-review'}
        if svg is not None:
            assert sha(svg)==m['svg_sha256'],(sid,k,'svg hash')
            dest=f'samples/{sid}/{k}.svg';(OUT/dest).write_bytes(svg);artifact['svg']=dest
            if png:
                assert sha(png)==m['png_sha256'],(sid,k,'png hash')
                artifact.update(publish_image(png,f'samples/{sid}/{k}')); artifact['status']='available';coverage[k]+=1
        if sid=='sample-0062' and k=='AFE': artifact['status']='damaged'
        sample['artifacts'][k]=artifact
    detail=by_sample[sid]
    compact={}
    for k in keys:
        compact[k]={}
        for d in metrics:
            cell=detail[k][d['id']];cell['score']=score(cell['counts'])
            compact[k][d['id']]={'score':cell['score'],'counts':dict(cell['counts'])}
    write(f'details/{sid}.json',detail)
    sample['scores']=compact
    sample['resources']={k:{'cost':float(efficiency[sid][k+'费用USD']),'seconds':float(efficiency[sid][k+'记录耗时秒']),'tokens':int(efficiency[sid][k+' API Token'])} for k in ['A','B','C']}
    samples.append(sample)
    if sid=='sample-0001':
        g1=readjson(base/'evidence'/sid/'A/G1.json');g2=readjson(base/'evidence'/sid/'A/G2.json')
        receipt=readjson(base/'evidence'/sid/'A/native-acceptance.json')
        impl=readjson(base/'results'/sid/'A/implementation.json')
        write('pipeline.json',{'sample':sid,'issues':g1.get('issues',[])[:8],'facts':g2.get('fact_checks',[])[:8], 'receipt':receipt,'operations':[{'transaction':t['id'],'edits':[{'op':e['op'],'target':e.get('id','')} for e in t.get('edits',[])]} for t in impl['transactions']]})
resources={}
for k in keys:
    col={'A':'FigFox A','B':'FigFox B','C':'FigFox C','AFE':'AutoFigureEdit','Crafter':'FigureCrafter','DrawAI':'DrawAI'}[k]
    rows=readcsv('时间费用Token.csv'); values={r['指标']:float(r[col]) for r in rows if r.get(col)}
    resources[k]={'cost':values['平均计入费用USD/张'],'minutes':values['平均时间分钟/张'],'tokens':values['平均API Token/张'],'n':80,'comparable':k in ['A','B','C']}
    if k in ['A','B','C']:
        assert abs(sum(s['resources'][k]['cost'] for s in samples)/80-resources[k]['cost'])<1e-8
        assert abs(sum(s['resources'][k]['seconds'] for s in samples)/80/60-resources[k]['minutes'])<1e-8
        assert abs(sum(s['resources'][k]['tokens'] for s in samples)/80-resources[k]['tokens'])<1e-8
provenance={'snapshot':'2026-11-03','version':'v3-17-criteria','cohortN':80,'judgments':16320,'reviewers':2,'coverage':dict(coverage),'sourceHashes':{p.name:sha(p.read_bytes()) for p in (SOURCE/'数据表').glob('*.csv')},'migration':readjson(SOURCE/'01_latest/evaluation/migration.json'),'d09':readjson(SOURCE/'数据表/D09-display-override.json')}
write('summary.json',{'methods':methods,'metrics':metrics,'summaries':summaries,'resources':resources,'provenance':provenance})
write('samples.json',samples)
for name in ['四方法评分.csv','消融评分.csv','评分计数.csv','评分标准.csv','数据口径.csv','时间费用Token.csv']:
    shutil.copyfile(SOURCE/'数据表'/name,OUT/name)
write('provenance.json',provenance)
for z in opened:z.close()
print(json.dumps({'samples':len(samples),'judgments':len(judgments)*6,'verifiedPreviews':dict(coverage),'validated':'16 current criteria × 6 conditions; D09 explicitly versioned'},ensure_ascii=False))
