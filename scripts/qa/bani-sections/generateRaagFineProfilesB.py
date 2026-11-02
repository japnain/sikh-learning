#!/usr/bin/env python3
"""Render reviewed B-raags metadata; never discover boundaries from runtime text.

Run from any directory: python3 scripts/qa/bani-sections/generateRaagFineProfilesB.py
The explicit fixture is the review input. Changes to it require source review.
"""
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / 'scripts/qa/fixtures/raag-fine-boundaries-b-20261102.json'
OUTPUT = ROOT / 'src/content/baniSections/raagFineProfilesB.ts'


def generate():
    reviewed = json.loads(MANIFEST.read_text())
    baseline = {item['baniDbId']: item for item in (
        json.loads(line.strip().rstrip(','))
        for line in (ROOT / 'src/content/baniSections/catalogProfiles.ts').read_text().splitlines()
        if line.lstrip().startswith('{')
    )}
    with gzip.open(ROOT / 'scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz', 'rt') as stream:
        captures = {item['baniDbId']: item['payload']['verses'] for item in json.load(stream)['readings']}
    profiles = []
    for reading in reviewed['readings']:
        bani_id = reading['baniDbId']
        original = baseline[bani_id]
        assert reading['fingerprint'] == original['fingerprint']
        original_by_id = {section['id']: section for section in original['sections']}
        rows = captures[bani_id]
        by_id = {row['verse']['verseId']: row for row in rows}
        positions = {row['verse']['verseId']: index for index, row in enumerate(rows)}
        sections = []
        body_positions = set()
        for group_index, group in enumerate(reading['groups']):
            parent = dict(original_by_id[group['originalParentId']]) if 'originalParentId' in group else {
                'id': group['id'], 'kind': 'section' if group.get('editorialLabel') else 'provider-heading',
                'label': group['label'], 'startVerseId': group['startVerseId'],
                'excerptVerseId': group['excerptVerseId'],
            }
            assert parent['startVerseId'] == group['startVerseId']
            assert parent['excerptVerseId'] == group['excerptVerseId']
            if 'printedHeading' in group:
                assert by_id[group['startVerseId']]['verse']['verse']['unicode'].strip() == group['printedHeading']
            upper = positions[reading['groups'][group_index + 1]['startVerseId']] if group_index + 1 < len(reading['groups']) else len(rows)
            for unit in group['units']:
                start, end = positions[unit['startVerseId']], positions[unit['endVerseId']]
                assert positions[parent['startVerseId']] <= start <= end < upper
                assert by_id[unit['startVerseId']]['verse']['verse']['unicode'].strip() == unit['opening']
                assert by_id[unit['endVerseId']]['verse']['verse']['unicode'].strip() == unit['closing']
                assert not body_positions.intersection(range(start, end + 1))
                assert all(not row.get('header') for row in rows[start:end + 1])
                body_positions.update(range(start, end + 1))
            if len(group['units']) == 1:
                parent['kind'] = group['units'][0]['kind']
            else:
                if bani_id == 67 and parent['startVerseId'] in (21622, 21662):
                    parent['kind'] = 'composition'
                children = []
                for index, unit in enumerate(group['units']):
                    child = {'id': f"{parent['id']}-{unit['kind']}-{index + 1}", 'kind': unit['kind'],
                             'number': index + 1, 'startVerseId': unit['startVerseId'],
                             'excerptVerseId': unit['startVerseId']}
                    if bani_id == 73 and unit['startVerseId'] == 23090:
                        child['label'] = {'en': 'Single-line shabad', 'pa': 'ਇੱਕ-ਪੰਕਤੀ ਸ਼ਬਦ', 'hi': 'एक-पंक्ति शबद'}
                    children.append(child)
                parent['children'] = children
            sections.append(parent)
        assert [row['verse']['verseId'] for index, row in enumerate(rows) if index not in body_positions] == reading['nonBodyVerseIds']
        profiles.append({'baniDbId': bani_id, 'fingerprint': original['fingerprint'], 'sections': sections})
    return profiles


def render(profiles):
    return """import type { BaniSectionProfile } from './profileTypes'

/** Reviewed individual units in Gond, Ramkali, Maru, Kedara, Bhairao, Basant,
 * Sarang, Malaar and Prabhati. Original scripture and reading identity unchanged.
 * Source review: docs/qa/bani-raag-fine-b-20261102.md.
 * Regenerate offline: python3 scripts/qa/bani-sections/generateRaagFineProfilesB.py
 * Child numbers are navigation ordinals within their parent, not canonical IDs.
 */
export const RAAG_FINE_SECTION_PROFILES_B = """ + json.dumps(profiles, ensure_ascii=False, indent=2) + ' as const satisfies readonly BaniSectionProfile[]\n'


if __name__ == '__main__':
    OUTPUT.write_text(render(generate()))
