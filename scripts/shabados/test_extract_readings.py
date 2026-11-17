"""Integrity tests for the offline corpus importer, without network or full corpus."""
import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("extract_readings", Path(__file__).with_name("extract-readings.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ExtractionIntegrityTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.previous_definitions = module.DEFINITIONS
        module.DEFINITIONS = Path(self.directory.name)
        (module.DEFINITIONS / "TEST.toml").write_text('[[sections]]\nlines = ["K5AX", "AANY"]\n')
        self.db = sqlite3.connect(":memory:")
        self.db.executescript("""
          CREATE TABLE bani_lines (bani_id TEXT,line_id TEXT,section_order INTEGER,line_order INTEGER);
          CREATE TABLE asset_lines (asset_id TEXT,line_id TEXT,type TEXT,data TEXT,additional TEXT,priority INTEGER);
        """)
        self.db.executemany("INSERT INTO bani_lines VALUES (?,?,?,?)", [("TEST", "K5AX", 1, 1), ("TEST", "AANY", 1, 2)])
        self.db.executemany("INSERT INTO asset_lines VALUES (?,?,?,?,?,?)", [
            ("SSA2", "K5AX", "primary", "ਰਾਗੁ ਵਡਹੰਸੁ ਮਹਲਾ ੧ ਘਰੁ ੫ ਅਲਾਹਣੀਆ ॥", '{"page":578,"line":18}', 1),
            ("SSA2", "AANY", "primary", "ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥", '{"page":578,"line":18}', 1),
            ("DSSK", "K5AX", "translation", "Fixture English heading", '{"language":"en"}', 2),
        ])

    def tearDown(self):
        module.DEFINITIONS = self.previous_definitions
        self.db.close()
        self.directory.cleanup()

    def test_preserves_order_source_text_and_local_identity(self):
        payload, summary = module.build_reading(self.db, "TEST")
        lines = [line for entry in payload["entries"] for line in entry["lines"]]
        self.assertEqual([line["providerLineId"] for line in lines], ["K5AX", "AANY"])
        self.assertEqual(lines[0]["gurmukhi"], "ਰਾਗੁ ਵਡਹੰਸੁ ਮਹਲਾ ੧ ਘਰੁ ੫ ਅਲਾਹਣੀਆ ॥")
        self.assertTrue(lines[0]["isHeader"])
        self.assertEqual(lines[1]["verseId"], module.LINE_ID_BASE + int("AANY", 36))
        self.assertEqual(lines[1]["shabadId"], 0)
        self.assertEqual(payload["availableLengths"], [])
        self.assertIsNone(payload["resolvedLength"])
        self.assertEqual(summary["lineCount"], 2)
        self.assertEqual(payload["provenance"]["definitionRevision"], module.DEFINITION_REVISION)
        self.assertEqual(payload["provenance"]["sourceRevision"], module.SOURCE_REVISION)

    def test_never_fabricates_missing_translation_or_transliteration(self):
        payload, _ = module.build_reading(self.db, "TEST")
        lines = payload["entries"][0]["lines"]
        self.assertEqual(lines[0]["translations_en"], {"ssk": "Fixture English heading"})
        self.assertEqual(lines[1]["translation_en"], "")
        self.assertEqual(lines[0]["translation_hi"], "")
        self.assertEqual(lines[0]["transliteration"], "")

    def test_reordered_definition_is_rejected(self):
        (module.DEFINITIONS / "TEST.toml").write_text('[[sections]]\nlines = ["AANY", "K5AX"]\n')
        with self.assertRaisesRegex(ValueError, "line order"):
            module.build_reading(self.db, "TEST")

    def test_missing_primary_line_is_rejected(self):
        self.db.execute("DELETE FROM asset_lines WHERE line_id='AANY'")
        with self.assertRaisesRegex(ValueError, "expected one SSA2 primary"):
            module.build_reading(self.db, "TEST")

    def test_duplicate_primary_is_rejected(self):
        self.db.execute("INSERT INTO asset_lines SELECT * FROM asset_lines WHERE line_id='AANY'")
        with self.assertRaisesRegex(ValueError, "expected one SSA2 primary"):
            module.build_reading(self.db, "TEST")

    def test_invalid_source_ang_is_rejected(self):
        self.db.execute("UPDATE asset_lines SET additional=? WHERE line_id='AANY'", (json.dumps({"page": 0}),))
        with self.assertRaisesRegex(ValueError, "valid source Ang"):
            module.build_reading(self.db, "TEST")

    def test_raag_verses_are_not_misclassified_as_headings(self):
        self.assertFalse(module.header("ਰਾਗ ਰਤਨ ਪਰਵਾਰ ਪਰੀਆ; ਸਬਦ ਗਾਵਣ ਆਈਆ ॥"))
        self.assertFalse(module.header("ਰਾਗ ਏਕ ਸੰਗਿ; ਪੰਚ ਬਰੰਗਨ ॥"))
        self.assertTrue(module.header("ਵਡਹੰਸੁ ਮਹਲਾ ੧ ॥"))
        self.assertTrue(module.header("ਰਾਗ ਮਾਲਾ ॥"))


if __name__ == "__main__":
    unittest.main()
