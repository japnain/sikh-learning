#!/usr/bin/env python3
"""Bounded, traversal-safe EPUB extraction for the trusted private importer."""
import json
from pathlib import Path, PurePosixPath
import stat
import sys
import zipfile

MAX_ENTRIES = 10000
MAX_ENTRY_BYTES = 64 * 1024 * 1024
MAX_TOTAL_BYTES = 512 * 1024 * 1024


def extract(source, destination):
    root = Path(destination).resolve()
    root.mkdir(parents=True, exist_ok=True)
    if any(root.iterdir()):
        raise ValueError("Extraction destination must be empty")
    with zipfile.ZipFile(source) as archive:
        entries = archive.infolist()
        if len(entries) > MAX_ENTRIES:
            raise ValueError("EPUB exceeds the entry-count limit")
        seen = set()
        total = 0
        for entry in entries:
            name = entry.filename
            parts = PurePosixPath(name).parts
            if (not name or "\\" in name or "\x00" in name or name.startswith("/")
                    or any(part in ("..", ".") for part in parts)
                    or any(":" in part for part in parts)):
                raise ValueError("Unsafe EPUB entry path")
            canonical = str(PurePosixPath(name)).rstrip("/")
            if canonical in seen:
                raise ValueError("Duplicate EPUB entry path")
            seen.add(canonical)
            mode = entry.external_attr >> 16
            if stat.S_ISLNK(mode) or (stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR)):
                raise ValueError("EPUB contains a non-regular entry")
            if entry.flag_bits & 1:
                raise ValueError("Encrypted EPUB entries are unsupported")
            total += entry.file_size
            if entry.file_size > MAX_ENTRY_BYTES or total > MAX_TOTAL_BYTES:
                raise ValueError("EPUB exceeds the uncompressed-size limit")
            if entry.file_size > 1024 * 1024 and entry.file_size / max(1, entry.compress_size) > 1000:
                raise ValueError("EPUB exceeds the compression-ratio limit")
        files = []
        actual_total = 0
        for entry in entries:
            target = root.joinpath(*PurePosixPath(entry.filename).parts)
            if root not in target.resolve().parents:
                raise ValueError("EPUB path escaped its destination")
            if entry.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            actual = 0
            with archive.open(entry) as incoming, target.open("xb") as output:
                while chunk := incoming.read(1024 * 1024):
                    actual += len(chunk)
                    actual_total += len(chunk)
                    if actual > MAX_ENTRY_BYTES or actual_total > MAX_TOTAL_BYTES:
                        raise ValueError("EPUB exceeded its declared bounds")
                    output.write(chunk)
            if actual != entry.file_size:
                raise ValueError("EPUB entry size mismatch")
            files.append(entry.filename)
        mimetype = root / "mimetype"
        if not mimetype.is_file() or mimetype.read_text().strip() != "application/epub+zip":
            raise ValueError("Input is not an EPUB package")
        print(json.dumps({"files": files, "uncompressedBytes": actual_total}))


if __name__ == "__main__":
    try:
        if len(sys.argv) != 3:
            raise ValueError("Expected source EPUB and destination")
        extract(sys.argv[1], sys.argv[2])
    except (ValueError, OSError, zipfile.BadZipFile, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
