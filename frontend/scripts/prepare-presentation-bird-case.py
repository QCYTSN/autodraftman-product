"""Curate sample-0032 from the supplied archive, without changing source artifacts.

Optional regeneration: python scripts/prepare-presentation-bird-case.py <archive-root>
Ordinary builds use the checked-in case. Requires Pillow and the archived executor.
"""
import base64
import hashlib
import importlib.util
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = Path(sys.argv[1])
CASE = "sample-0032"
RUN = ARCHIVE / "01-实验/四方法对比/Full-FigFox" / CASE / "完整记录"
OUT = ROOT / "public/assets/presentation" / CASE
OUT.mkdir(parents=True, exist_ok=True)
PUBLIC = ROOT / "public/assets/research/samples" / CASE
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads(p.read_text(encoding="utf-8-sig"))
copy = lambda zh, en: {"zh": zh, "en": en}
region = lambda box, origin="author-verified": dict(box=box, coordinateWidth=575, coordinateHeight=241, origin=origin)
receipt = read(RUN / "native-acceptance.json")
ops = read(RUN / "local-execution-operations.json")
g1, g2, proof = [read(RUN / f) for f in ["G1.json", "G2.json", "G0-reuse-proof.json"]]
initial, final = [(RUN / f).read_bytes() for f in ["inputs/initial.svg", "S2.svg"]]
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
txid = "tx_A2_redraw_upper_left_hash_table"
txindex = next(i for i, t in enumerate(ops["transactions"]) if t["id"] == txid)
tx = ops["transactions"][txindex]
prior = [e for t in ops["transactions"][:txindex] for e in t["edits"]]
before, _ = module.apply_edits(initial.decode(), prior, RUN / "inputs/source.png")
after, _ = module.apply_edits(initial.decode(), prior + tx["edits"], RUN / "inputs/source.png")
targets = {e["id"] for e in tx["edits"]}
def outside_targets(svg):
    root = ET.fromstring(svg)
    for parent in root.iter():
        for child in list(parent):
            if child.get("id") in targets:
                parent.remove(child)
    return ET.tostring(root)
assert before != after and outside_targets(before) == outside_targets(after)
draft_root, final_root = ET.fromstring(initial), ET.fromstring(final)
assert draft_root.get("viewBox") == final_root.get("viewBox") == "0 0 575 241"
text = next(e for e in final_root.iter() if e.get("id") == "txt_hash_table_title")
assert text.text == "Hash Table" and not list(text)
files = {}
def save(name, data):
    (OUT / name).write_bytes(data)
    files[name] = sha(data)
    return name
for name, source in [("reference.webp", "inputs/source.png"), ("draft.webp", "inputs/initial.png"), ("final.webp", "S2.png")]:
    original = Image.open(RUN / source).convert("RGB")
    original.save(OUT / name, format="WEBP", lossless=True, method=6)
    assert Image.open(OUT / name).convert("RGB").tobytes() == original.tobytes()
    files[name] = sha((OUT / name).read_bytes())
for name, data in [("draft.svg", initial), ("final.svg", final), ("before-A2.svg", before.encode()), ("after-A2.svg", after.encode())]:
    save(name, data)
assets = []
for ident, name, element_id, box, display_height in [
    ("bird", copy("小鸟图像", "Bird image"), "plus_node_27", [15, 32, 90, 105], 124),
    ("flame", copy("训练标记", "Train icon"), "plus_node_29", [107, 28, 119, 44], 64),
    ("snowflake", copy("冻结标记", "Freeze icon"), "plus_node_129", [445, 130, 459, 146], 64),
]:
    element = next(e for e in draft_root.iter() if e.get("id") == element_id)
    payload = base64.b64decode((element.get("href") or element.get("{http://www.w3.org/1999/xlink}href")).split(",", 1)[1])
    match = next(a for a in proof["sam"]["asset_proofs"] if a["sha256"] == sha(payload))
    assets.append(dict(id=ident, name=name, image=save("sam-" + ident + ".png", payload), sourceRegion=region(box), draftRegion=region(box),
        displayHeight=display_height, evidence=dict(assetId=match["id"], svgElementId=element_id, sha256=sha(payload), recovery="Exact embedded PNG bytes matched to same-run G0 asset proof; source placement visually verified, not recovered SAM bounds.")))
issues = []
for ident, title, targets_for_issue, transaction, fact in [
    ("A2", copy("单元格排列", "Cell layout"), ["left_hash_table_top"], txid, "F_A_hash_table_interior"),
    ("B2", copy("原型库排列", "Prototype layout"), ["right_proto_top"], "tx_B2_redraw_upper_right_prototype_bank", "F_B_proto_bank_interior"),
    ("C2", copy("新增列分组", "New column grouping"), ["left_hash_table_bottom"], "tx_C2_redraw_lower_left_hash_new_area", "F_C_hash_table_interior"),
]:
    recorded = next(i for i in g1["issues"] if i["id"] == ident)
    check = next(f for f in g2["fact_checks"] if f["fact_id"] == fact)
    issues.append(dict(id=ident, title=title, sourceRegion=region(recorded["bbox"]), draftRegion=region(recorded["bbox"], "model-recorded"), finalRegion=region(recorded["bbox"]),
        sourceEvidence=copy("原图的网格、颜色与列分组", check["source_reading"]), draftEvidence=copy("初稿改变了网格、颜色或列分组", check["initial_reading"]),
        verification=check["decision"], targetIds=targets_for_issue, transactionId=transaction, factId=fact,
        recordedEvidence=dict(source=recorded["source_evidence"], draft=recorded["initial_evidence"]), labelPosition=[207, 8], leaderSide="top",
        sourceEndpoint=[232, 50] if ident == "A2" else None, draftEndpoint=[232, 50] if ident == "A2" else None))
manifest = dict(id=CASE, title=copy("小鸟图像编码与原型库", "Bird encoding and prototype banks"),
    provenance=dict(sourceCommit="c67feff986f5f9de0e1a139d416eefcccf8a3b80", runId="四方法对比/Full-FigFox/" + CASE, conditionId="A",
        upstreamHashes=dict(source=proof["source_sha256"], draft=sha(initial), final=sha(final), executor=sha(executor.read_bytes()),
            operations=sha((RUN / "local-execution-operations.json").read_bytes()), journal=sha((RUN / "execution-journal.json").read_bytes()),
            samCatalog=proof["sam"]["catalog_sha256"], samProof=sha((RUN / "G0-reuse-proof.json").read_bytes()),
            inspection=sha((RUN / "G1.json").read_bytes()), planning=sha((RUN / "G2.json").read_bytes()),
            draftPng=sha((RUN / "inputs/initial.png").read_bytes()), finalPng=sha((RUN / "S2.png").read_bytes())), bundledHashes=files),
    dimensions=dict(width=575, height=241, viewBox=[0, 0, 575, 241]),
    images=dict(reference="reference.webp", draftPreview="draft.webp", finalPreview="final.webp"), svg=dict(draft="draft.svg", final="final.svg"),
    sam=dict(mode="recorded", segmentationCount=None, assets=assets,
        reason="Three actual SAM PNGs recovered byte-for-byte from the initial SVG and matched to same-run G0-reuse-proof asset hashes. Source placements visually verified. The complete SAM catalog is unavailable, so no segmentation total or original mask bounds are claimed."),
    issues=issues,
    issueMap=[dict(id=i["id"], region=region(i["bbox"], "model-recorded"),
        labelPosition={"A2": [207, 6], "B2": [486, 8], "C2": [191, 124], "D2": [481, 116]}.get(i["id"]), labelAnchor="end" if i["id"] in ("C2", "D2") else "start", sourceEvidence=i["source_evidence"], draftEvidence=i["initial_evidence"], repair=i["repair"]) for i in g1["issues"]],
    repair=dict(kind="transaction-snapshot", beforeSvg="before-A2.svg", afterSvg="after-A2.svg", transactionId=txid,
        context="Sequential replay: icon visibility transaction applied first; then the single hash-table replacement.", region=region([207, 28, 270, 111]),
        operations=[dict(op=e["op"], targetId=e["id"], description=copy("恢复哈希表单元格", "Restore hash-table cells")) for e in tx["edits"]],
        executionStatus="recorded-complete", plannedOperations=receipt["planned_operations"], executedOperations=receipt["executed_operations"],
        unresolvedCount=len(receipt["unresolved"]), unresolvedItems=receipt["unresolved"], visualQualityPass=receipt["visual_quality_pass"], transactionOperations=len(tx["edits"]),
        replay=dict(fullResultHashMatches=True, journalMatches=True, outsideTargetsUnchanged=True, beforeHash=sha(before.encode()), afterHash=sha(after.encode()))),
    gapGuidance=dict(state="not-recorded", summary=copy("当前材料未记录此分支调用", "This material does not record a call to this branch.")),
    editTarget=dict(elementId="txt_hash_table_title", textNodePath=[0], originalText="Hash Table", exampleText="Demo Table", focusCamera=[180, 0, 110, 125]),
    modelLabels=dict(draft=None, inspection="GPT-5.5", planning="GPT-5.5", guidance=None),
    objectCounts=dict(text=sum(e.tag.endswith("}text") for e in draft_root.iter()),
        graphics=sum(e.tag.split("}")[-1] in {"path", "rect", "circle", "ellipse", "polygon", "polyline", "line"} for e in draft_root.iter()),
        connectors=sum("marker-end" in e.attrib for e in draft_root.iter())),
    transformations=[
        "Reference and previews losslessly encoded from archival PNGs with decoded RGB identity; original SVG bytes unchanged.",
        "SAM assets decoded from original SVG data URIs with byte identity against same-run asset proofs. No synthesized or enlarged source files.",
        "Source placements visually verified; SVG placements read from actual objects. Full catalog and original masks unavailable.",
        "Complete recorded executor replay matches final bytes and journal. A2 snapshots differ only in the recorded target subtree.",
        "Evidence ROI retains original model coordinates, verified against source and SVG. First issue defines the main presentation route.",
        "Sanitization and instance namespaces affect runtime copies only. Edits and exports operate on an editable copy of the final document."])
(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
print(json.dumps({"case": CASE, "sam": manifest["sam"]["mode"], "replay": manifest["repair"]["replay"]}))
