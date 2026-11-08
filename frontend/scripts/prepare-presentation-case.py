"""Curate sample-0001 from the supplied archive. No API calls or source writes.

Optional archival regeneration; ordinary npm builds use the checked-in package.
Usage: python scripts/prepare-presentation-case.py <archive-root>
Requires Pillow, as does the original recorded executor.
"""
import hashlib
import importlib.util
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = Path(sys.argv[1])
RUN = ARCHIVE / "01-实验/四方法对比/Full-FigFox/sample-0001/完整记录"
OUT = ROOT / "public/assets/presentation/sample-0001"
OUT.mkdir(parents=True, exist_ok=True)
PUBLIC = ROOT / "public/assets/research/samples/sample-0001"
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads(p.read_text(encoding="utf-8-sig"))
copy = lambda zh, en: {"zh": zh, "en": en}
def region(box, origin="author-verified"):
    return dict(box=box, coordinateWidth=968, coordinateHeight=510, origin=origin)
def save(name, data):
    (OUT / name).write_bytes(data)
    return name

receipt = read(RUN / "native-acceptance.json")
ops = read(RUN / "local-execution-operations.json")
g2 = read(RUN / "G2.json")
proof = read(RUN / "G0-reuse-proof.json")
initial = (RUN / "inputs/initial.svg").read_bytes()
final = (RUN / "S2.svg").read_bytes()
assert sha(initial) == receipt["initial_sha256"] == sha((PUBLIC / "C.svg").read_bytes())
assert sha(final) == receipt["final_sha256"] == sha((PUBLIC / "A.svg").read_bytes())
assert sha((RUN / "inputs/source.png").read_bytes()) == proof["source_sha256"]
executor = ARCHIVE / "03-全部源码/formal-ablation-runner/gpt_guided_repair/contracts.py"
assert sha(executor.read_bytes()) == "2276f55cca4d9c060064e87da47cdaea64d04a73ff1a10e97381071a16733255"
spec = importlib.util.spec_from_file_location("recorded_contracts", executor)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
all_edits = [e for t in ops["transactions"] for e in t["edits"]]
replayed, journal = module.apply_edits(initial.decode(), all_edits, RUN / "inputs/source.png")
assert replayed.encode() == final
assert journal == read(RUN / "execution-journal.json")
txid = "T_B_pooling_arrow_and_feature_container"
txindex = next(i for i, t in enumerate(ops["transactions"]) if t["id"] == txid)
prior = [e for t in ops["transactions"][:txindex] for e in t["edits"]]
tx = ops["transactions"][txindex]
before, _ = module.apply_edits(initial.decode(), prior, RUN / "inputs/source.png")
after, txjournal = module.apply_edits(initial.decode(), prior + tx["edits"], RUN / "inputs/source.png")
# Strip the two allowed subtrees and compare the rest of the document exactly.
def outside_targets(svg):
    root = ET.fromstring(svg)
    for parent in root.iter():
        for child in list(parent):
            if child.get("id") in {"green_pooling_path_left", "feature_dots_top"}:
                parent.remove(child)
    return ET.tostring(root)
assert outside_targets(before) == outside_targets(after)
draft_root = ET.fromstring(initial)
assert draft_root.get("viewBox") == "0 0 968 510"
final_root = ET.fromstring(final)
target = next(e for e in final_root.iter() if e.get("id") == "plus_node_49")
assert target.text == "Global Pooling" and not list(target)

files = {}
for name, source in [("reference.webp", RUN / "inputs/source.png"), ("draft.webp", RUN / "inputs/initial.png"), ("final.webp", RUN / "S2.png")]:
    original_image = Image.open(source).convert("RGB")
    original_image.save(OUT / name, format="WEBP", lossless=True, method=6)
    assert Image.open(OUT / name).convert("RGB").tobytes() == original_image.tobytes()
    files[name] = sha((OUT / name).read_bytes())
for name, data in [("draft.svg", initial), ("final.svg", final),
                   ("before-B1.svg", before.encode()), ("after-B1.svg", after.encode())]:
    files[name] = sha(data)
    save(name, data)
assets = []
im = Image.open(OUT / "reference.webp")
for ident, name, box in [
    ("point-cloud", copy("点云纹理", "Point cloud"), [397, 41, 501, 122]),
    ("vehicle", copy("车辆图形", "Vehicle"), [47, 91, 96, 122]),
    ("graph", copy("图结构", "Graph structure"), [608, 306, 706, 430]),
]:
    file = "crop-" + ident + ".png"
    im.crop(tuple(box)).save(OUT / file)
    files[file] = sha((OUT / file).read_bytes())
    assets.append(dict(id=ident, name=name, image=file, sourceRegion=region(box)))

pipeline = read(ROOT / "public/assets/research/pipeline.json")
specs = [
    ("B1", copy("连接方向", "Arrow direction"), [585, 107, 623, 146], [580, 107, 626, 151],
     copy("向上后转向右侧", "Up, then to the right"),
     copy("箭头朝下，指向特征点", "Down toward the feature dot"),
     ["green_pooling_path_left", "feature_dots_top"], txid, "F_B_pool_arrow"),
    ("B2", copy("文字与边框重叠", "Label overlaps border"), [818, 103, 932, 140], [817, 99, 932, 140],
     copy("标题位于面板上方", "Label above the panel"),
     copy("面板边线穿过标题", "Panel border crosses the label"),
     ["f05_top_bbox_frame"], "T_B_restore_top_bbox_panel", None),
    ("D1", copy("图连接缺失", "Missing graph connection"), [608, 306, 706, 430], [608, 306, 706, 430],
     copy("左上节点连向中央节点", "Upper-left node connects to the center"),
     copy("橙色对角连接缺失", "Orange diagonal connection is missing"),
     ["red_dashed_verticals"], "T_D_restore_structure_graph_topology", None),
]
issues = []
for ident, title, source, result, se, de, targets, transaction, fact in specs:
    recorded = next(i for i in pipeline["issues"] if i["id"] == ident)
    verification = next((f["decision"] for f in g2["fact_checks"] if f["fact_id"] == fact), "not-recorded")
    issues.append(dict(id=ident, title=title, sourceRegion=region(source),
                       draftRegion=region(recorded["bbox"], "model-recorded"), finalRegion=region(result),
                       sourceEvidence=se, draftEvidence=de, verification=verification,
                       targetIds=targets, transactionId=transaction, factId=fact,
                       recordedEvidence=dict(source=recorded["source_evidence"], draft=recorded["initial_evidence"]),
                       labelPosition={"B1": [552, 54], "B2": [821, 48], "D1": [664, 261]}[ident],
                       sourceEndpoint=[620, 111] if ident == "B1" else None,
                       draftEndpoint=[592, 133] if ident == "B1" else None))

manifest = dict(
    id="sample-0001", title=copy("科研图的重建、检查与修复", "Reconstruct, inspect and repair a research figure"),
    provenance=dict(sourceCommit="c67feff986f5f9de0e1a139d416eefcccf8a3b80",
                    runId="四方法对比/Full-FigFox/sample-0001", conditionId="A",
                    upstreamHashes=dict(source=proof["source_sha256"], draft=sha(initial), final=sha(final),
                                        executor=sha(executor.read_bytes()), operations=sha((RUN / "local-execution-operations.json").read_bytes()),
                                        journal=sha((RUN / "execution-journal.json").read_bytes()), samCatalog=proof["sam"]["catalog_sha256"],
                                        draftPng=sha((RUN / "inputs/initial.png").read_bytes()), finalPng=sha((RUN / "S2.png").read_bytes())),
                    bundledHashes=files),
    dimensions=dict(width=968, height=510, viewBox=[0, 0, 968, 510]),
    images=dict(reference="reference.webp", draftPreview="draft.webp", finalPreview="final.webp"),
    svg=dict(draft="draft.svg", final="final.svg"),
    sam=dict(mode="reference-crop-illustration", segmentationCount=None, assets=assets,
             reason="Same-run SAM proof is retained, but its catalog and crop bytes are absent from the accessible archive. Available preflight catalogs belong to a different source hash."),
    issues=issues,
    repair=dict(kind="transaction-snapshot", beforeSvg="before-B1.svg", afterSvg="after-B1.svg",
                transactionId=txid, context="Sequential replay: preceding transaction applied, then B1 transaction.",
                region=region([575, 105, 628, 216]),
                operations=[dict(op=e["op"], targetId=e["id"],
                    description=copy("调整 pooling 路径" if e["op"] == "set" else "调整关联特征对象",
                                     "Update pooling path" if e["op"] == "set" else "Update feature container")) for e in tx["edits"]],
                executionStatus="recorded-complete", plannedOperations=receipt["planned_operations"],
                executedOperations=receipt["executed_operations"], unresolvedCount=len(receipt["unresolved"]),
                visualQualityPass=receipt["visual_quality_pass"], transactionOperations=len(tx["edits"]),
                replay=dict(fullResultHashMatches=True, journalMatches=True, outsideTargetsUnchanged=True,
                            beforeHash=sha(before.encode()), afterHash=sha(after.encode()))),
    gapGuidance=dict(state="not-recorded",
        summary=copy("当前材料未记录此分支调用", "This material does not record a call to this branch.")),
    editTarget=dict(elementId="plus_node_49", textNodePath=[0], originalText="Global Pooling", exampleText="Demo Pooling", focusCamera=[552, 55, 400, 200]),
    modelLabels=dict(draft=None, inspection="GPT-5.5", planning="GPT-5.5", guidance=None),
    objectCounts=dict(text=sum(e.tag.endswith("}text") for e in draft_root.iter()),
                      graphics=sum(e.tag.split("}")[-1] in {"path", "rect", "circle", "ellipse", "polygon", "polyline", "line"} for e in draft_root.iter()),
                      connectors=sum("marker-end" in e.attrib for e in draft_root.iter())),
    transformations=[
        "Reference and previews losslessly encoded from same-run archival PNGs; decoded RGB pixels verified identical. SVG source bytes unchanged.",
        "Three illustrative rectangular crops extracted from the lossless reference; no segmentation or source-to-draft mapping claimed.",
        "Transaction snapshots generated by the archived executor after validating full-run byte identity and journal equality.",
        "Source and final ROI boxes visually verified against the reference and SVG. Draft boxes retain original model coordinates.",
        "DOM sanitization and instance ID prefixes apply only to runtime display copies; export uses the clean editable document."
    ])
save("manifest.json", (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode())
print(json.dumps({"case": manifest["id"], "sam": manifest["sam"]["mode"], "repair": manifest["repair"]["kind"], "replay": manifest["repair"]["replay"]}))
