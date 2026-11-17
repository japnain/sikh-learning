#!/usr/bin/env python3
"""Prepare private, checksum-verified SQL imports; publication is a separate step."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("directory", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
manifest = json.loads((args.directory / "manifest.json").read_text())
args.output.mkdir(parents=True, exist_ok=True)

def quote(value):
    return "'" + str(value).replace("'", "''") + "'"

count = 0
for reading in manifest["readings"]:
    variants = reading.get("variants", [{"variant": "default", "path": reading.get("id", "") + ".json", "sha256": reading.get("sha256"), "bytes": reading.get("bytes")}])
    key = reading.get("readingKey", "shabados:" + reading.get("id", ""))
    for variant in variants:
        raw = (args.directory / variant["path"]).read_bytes()
        if len(raw) != variant["bytes"] or hashlib.sha256(raw).hexdigest() != variant["sha256"]:
            raise ValueError(f"Changed payload: {key}/{variant['variant']}")
        payload = raw.decode("utf-8")
        parsed = json.loads(payload)
        provenance = parsed.get("provenance", {"provider": "banidb", "rawSha256": reading["rawSha256"]} if "rawSha256" in reading else {})
        fields = [key, manifest["sourceRevision"], variant["variant"], payload, variant["sha256"]]
        sql = "INSERT INTO public.scripture_reading_packs (reading_key,source_revision,variant,payload_json,payload_sha256,payload_bytes,provenance,published) VALUES ("
        sql += ",".join(map(quote, fields)) + "," + str(len(raw)) + "," + quote(json.dumps(provenance, ensure_ascii=False)) + "::jsonb,false) ON CONFLICT (reading_key,source_revision,variant,format_version) DO NOTHING RETURNING reading_key,variant,payload_bytes;\n"
        (args.output / f"{count:03d}.sql").write_text(sql)
        count += 1
print(json.dumps({"prepared": count, "published": False}))
