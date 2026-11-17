#!/usr/bin/env python3
"""Extract reviewed Shabad OS readings; never fetch or publish privileged data.

Usage: python3 scripts/shabados/extract-readings.py --database /path/master.sqlite --output /tmp/packs
The SQLite release is downloaded separately from the official release URL below.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import tomllib
from collections import Counter
from pathlib import Path

RELEASE = "v5.0.0-next.0"
RELEASE_URL = f"https://github.com/shabados/database/releases/download/{RELEASE}/master.sqlite"
DATABASE_SHA256 = "517890c7e7c2f3dcef7f21b51d074a581b8eded4ebe14c504b84ea075ff16aeb"
SOURCE_REVISION = "shabados-v5.0.0-next.0-517890c7e7c2"
DEFINITION_REVISION = "157b8dc3749fa6b8789610af8c7cb1c4eff3b35a"
READINGS = ("ALHN", "ANN6", "MDVI", "RGMA")
LINE_ID_BASE = 7_000_000_000_000
DEFINITIONS = Path(__file__).with_name("definitions")


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")


def definition_order(reading_id: str) -> list[tuple[str, int, int]]:
    data = tomllib.loads((DEFINITIONS / f"{reading_id}.toml").read_text())
    return [(line_id, section_no, line_no)
            for section_no, section in enumerate(data["sections"], 1)
            for line_no, line_id in enumerate(section["lines"], 1)]


def header(text: str) -> bool:
    """Recognize only explicit, source-preserved headings; never omit a row."""
    compact = re.sub(r"[।॥]+", " ", text)
    compact = " ".join(compact.split())
    if compact in ("ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ", "ਸਲੋਕੁ", "ਸਲੋਕ", "ਰਾਗ ਮਾਲਾ"):
        return True
    # A verse may begin with 'ਰਾਗ' (for example Anand's 'ਰਾਗ ਰਤਨ...').
    # Require the complete bounded title/Mahala metadata form instead.
    return bool(re.fullmatch(
        r"[\u0A00-\u0A7F ]{1,45} ਮਹਲਾ [੦-੯0-9]+(?: ਘਰੁ? [੦-੯0-9]+)?(?: ਅਲਾਹਣੀਆ| ਅਨੰਦੁ)?",
        compact,
    ))


def build_reading(db: sqlite3.Connection, reading_id: str) -> tuple[dict, dict]:
    order = list(db.execute(
        "SELECT line_id, section_order, line_order FROM bani_lines WHERE bani_id=? ORDER BY section_order,line_order",
        (reading_id,)))
    expected = definition_order(reading_id)
    if order != expected:
        raise ValueError(f"{reading_id}: release line order does not match the pinned definition")
    if not order:
        raise ValueError(f"{reading_id}: empty reading")
    entries, entry, group_key = [], None, None
    used_assets, coverage = set(), Counter()
    english_keys = {"DSSK": "ssk", "SBMS": "ms"}
    punjabi_keys = {"PSST": "ss", "NKFT": "ft", "SBMS": "ms"}
    # The published release lacks a line-id index. One bounded scan avoids
    # scanning hundreds of thousands of asset rows again for every reading line.
    line_ids = sorted({row[0] for row in order})
    assets_by_line: dict[str, list] = {line_id: [] for line_id in line_ids}
    placeholders = ",".join("?" for _ in line_ids)
    for line_id, *asset in db.execute(
        f"SELECT line_id,asset_id,type,data,additional FROM asset_lines WHERE line_id IN ({placeholders}) ORDER BY priority,asset_id",
        line_ids,
    ):
        assets_by_line[line_id].append(asset)
    for line_id, section_no, line_no in order:
        if not re.fullmatch(r"[A-Z0-9]{4}", line_id):
            raise ValueError(f"{reading_id}: unsupported source line id {line_id}")
        rows = assets_by_line[line_id]
        primaries = [row for row in rows if row[0] == "SSA2" and row[1] == "primary"]
        if len(primaries) != 1:
            raise ValueError(f"{reading_id}/{line_id}: expected one SSA2 primary, found {len(primaries)}")
        _, _, text, extra_raw = primaries[0]
        extra = json.loads(extra_raw or "{}")
        ang = extra.get("page")
        if not isinstance(text, str) or not text.strip() or not isinstance(ang, int) or not 1 <= ang <= 1430:
            raise ValueError(f"{reading_id}/{line_id}: missing text or valid source Ang")
        en, pa = {}, {}
        used_assets.add("SSA2")
        for asset_id, kind, content, raw in rows:
            additional = json.loads(raw or "{}")
            language = additional.get("language")
            if kind != "translation" or not content:
                continue
            if language == "en" and asset_id in english_keys:
                en[english_keys[asset_id]] = content
            elif language == "pa" and asset_id in punjabi_keys:
                pa[punjabi_keys[asset_id]] = content
            else:
                continue
            used_assets.add(asset_id)
            coverage[f"{asset_id}:{language}"] += 1
        # No transliteration or Hindi translation is invented where upstream has none.
        line = {
            "verseId": LINE_ID_BASE + int(line_id, 36), "providerLineId": line_id,
            "shabadId": 0, "ang": ang, "originalAng": ang,
            "gurmukhi": text, "transliteration": "", "translation_en": en.get("ssk", en.get("ms", "")),
            "translations_en": en, "translation_pa": pa.get("ss", pa.get("ms", pa.get("ft", ""))),
            "translations_pa": pa, "translation_hi": "", "translations_hi": {},
        }
        if header(text):
            line["isHeader"] = True
            line["headerLevel"] = 1
        if group_key != (section_no, ang):
            group_key = (section_no, ang)
            entry = {
                "id": f"shabados-{reading_id}-{len(entries) + 1:03d}", "scripture": "SGGS", "source": "G",
                "ang": ang, "shabadId": 0, "sourceName": "Sri Guru Granth Sahib Ji",
                "sourceMeta": {"sourceId": "SGGS", "english": "Sri Guru Granth Sahib Ji", "pageNo": ang},
                "lines": [], "verseIds": [], "gurmukhi": "", "transliteration": "",
                "translation_en": "", "translation_hi": "", "translation_pa": "", "words": [],
            }
            entries.append(entry)
        entry["lines"].append(line)
        entry["verseIds"].append(line["verseId"])
    for entry in entries:
        for field in ("gurmukhi", "transliteration", "translation_en", "translation_hi", "translation_pa"):
            entry[field] = "\n".join(line[field] for line in entry["lines"] if line[field])
    provenance = {
        "provider": "shabados", "readingId": reading_id, "sourceRevision": SOURCE_REVISION,
        "formatVersion": 1, "assets": sorted(used_assets), "releaseTag": RELEASE,
        "databaseSha256": DATABASE_SHA256, "definitionRevision": DEFINITION_REVISION,
        "definitionOrderVerified": True,
    }
    payload = {"entries": entries, "availableLengths": [], "resolvedLength": None,
               "normalizationRevision": 2, "provenance": provenance}
    summary = {"id": reading_id, "lineCount": len(order), "entryCount": len(entries),
               "opening": entries[0]["lines"][0]["gurmukhi"], "ending": entries[-1]["lines"][-1]["gurmukhi"],
               "translationCoverage": dict(sorted(coverage.items())), "sourceOrderVerified": True,
               "missingUpstreamLayers": ["transliteration", "Hindi translation"]}
    return payload, summary


def export_line_index(db: sqlite3.Connection, output: Path) -> int:
    count = 0
    query = """SELECT a.line_id,a.asset_id,a.data,a.additional,l.line_group_id,l.line_group_order,
                      g.section_id,g.section_order,s.source_id,s.source_order
               FROM asset_lines a LEFT JOIN lines l ON l.id=a.line_id
               LEFT JOIN line_groups g ON g.id=l.line_group_id LEFT JOIN sections s ON s.id=g.section_id
               WHERE a.type='primary' ORDER BY a.line_id,a.priority,a.asset_id"""
    with output.open("w") as stream:
        for line_id, asset, text, raw, group, group_order, section, section_order, source, source_order in db.execute(query):
            extra = json.loads(raw or "{}")
            row = {"lineId": line_id, "assetId": asset, "text": text, "page": extra.get("page"),
                   "printedLine": extra.get("line"), "sourceId": source, "sectionId": section,
                   "sourceOrder": source_order, "sectionOrder": section_order,
                   "lineGroupId": group, "lineGroupOrder": group_order}
            stream.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
            count += 1
    return count


def export_assemblies(db: sqlite3.Connection, output: Path) -> int:
    assemblies = []
    for bani_id, name in db.execute("SELECT id,name FROM banis ORDER BY id"):
        lines = [{"lineId": line_id, "sectionOrder": section, "lineOrder": position}
                 for line_id, section, position in db.execute(
                     "SELECT line_id,section_order,line_order FROM bani_lines WHERE bani_id=? ORDER BY section_order,line_order",
                     (bani_id,))]
        assemblies.append({"baniId": bani_id, "name": json.loads(name), "lines": lines})
    write_json(output, {"sourceRevision": SOURCE_REVISION, "assemblies": assemblies})
    return len(assemblies)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--line-index", action="store_true")
    args = parser.parse_args()
    if digest(args.database) != DATABASE_SHA256:
        raise SystemExit("Source database checksum does not match the reviewed release")
    db = sqlite3.connect(f"file:{args.database.resolve()}?mode=ro", uri=True)
    if db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        raise SystemExit("SQLite integrity check failed")
    args.output.mkdir(parents=True, exist_ok=True)
    summaries = []
    for reading_id in READINGS:
        payload, summary = build_reading(db, reading_id)
        destination = args.output / f"{reading_id}.json"
        write_json(destination, payload)
        summary.update({"bytes": destination.stat().st_size, "sha256": digest(destination)})
        summaries.append(summary)
    assets = [{"id": row[0], "name": json.loads(row[1]), "reference": json.loads(row[2] or "{}")} for row in db.execute("SELECT id,name,reference FROM assets ORDER BY id")]
    manifest = {"sourceRevision": SOURCE_REVISION, "definitionRevision": DEFINITION_REVISION,
                "databaseUrl": RELEASE_URL, "databaseSha256": DATABASE_SHA256, "readings": summaries,
                "assets": assets, "licenseNotice": "Retain the upstream data notice and source/translator attribution. Review asset rights before redistribution."}
    if args.line_index:
        manifest["primaryLineIndexRows"] = export_line_index(db, args.output / "line-index.jsonl")
        manifest["assemblyCount"] = export_assemblies(db, args.output / "assemblies.json")
    write_json(args.output / "manifest.json", manifest)
    print(json.dumps({"output": str(args.output), "readings": summaries, "indexRows": manifest.get("primaryLineIndexRows")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
