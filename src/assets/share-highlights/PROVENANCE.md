# Hukamnama artwork provenance

## Approved neutral collection

These works are original, nonfigurative backgrounds created specifically for
NaamRas short-Hukamnama Story exports. No source images were supplied. Every
approved master is a reviewed 1080×1920 JPEG; every 180×320 thumbnail is a
mechanical derivative of its master.

| Asset | Created | SHA-256 | Art direction |
| --- | --- | --- | --- |
| `00-quiet-parchment.jpg` | 2026-08-11 | `b98f4b3ab6ad21a719f6830faf23b185ca6debec8772414cb12014ca6f1ac40d` | Forest green, warm parchment, muted copper |
| `15-emerald-mist.jpg` | 2026-08-15 | `92d97a481da2078cd9fdc875b885e665b49f631c4e09249b7b36acc55f485eb1` | Ivory, emerald mist, moss mineral speckles |
| `16-indigo-rain.jpg` | 2026-08-15 | `c45cdd8521aa54355bfce0579db5852876f804363a0ab8afea8622056ee0bd9d` | Pearl, indigo, blue-grey vertical texture |
| `17-rose-dawn.jpg` | 2026-08-15 | `496b050a0d1244fa6de40e16d9ee94c0754e925294b04679648ac4f7675000a7` | Pale sand, dusty rose, coral, ochre |
| `18-copper-earth.jpg` | 2026-08-15 | `e037a182242db48fefaa8dafd497da6c524196a950a4773c0ca4b678ed95139c` | Cream, terracotta, umber, oxidized copper |
| `19-river-stone.jpg` | 2026-08-15 | `a0b2710a7f19f378f462a43cb309bc76394c9e08d96a0c3d1b14b8c59696f8fd` | Pearl, limestone, slate, faint teal |
| `20-night-gold.jpg` | 2026-08-15 | `c1498cbfaa3ff7fb1963daa5903a93358be5f9d21e51ddfb6b454dcff4e66a59` | Pale parchment, charcoal, restrained gold leaf |
| `21-sage-canopy.jpg` | 2026-08-15 | `b0d74f5228912bc00d67e87b3fabf102adb8b1493f594a8ef692081da3d85e33` | Ivory, sage, olive, soft charcoal |
| `22-monsoon-blue.jpg` | 2026-08-15 | `e690bb965b299d45b5d7fc2cc9fbfe4ceaeace8f9eb2ec55a74729b5430bc151` | Cream-grey, blue-grey, desaturated teal |
| `23-sandstone-light.jpg` | 2026-08-15 | `49402d660a02e50e9d7043b91b18c13f38e07110480c839ee35b3431cb9cef01` | Limestone, sandstone, pale clay, plaster texture |
| `24-plum-ink.jpg` | 2026-08-15 | `58460beb3421edf6c0d7c271cf404f84b99d5eef93909ed3f0525ca5354b8224` | Parchment, aubergine, plum, wine, smoke-black |
| `25-silver-dusk.jpg` | 2026-08-15 | `6753606a5e167f6b80965c25b5499b9be177d2e91711586adc12d08be875c235` | Ivory, silver-grey, lilac-grey, graphite |

### Generation record

- Tool mode: built-in OpenAI image generation, one initial generation call per
  distinct asset plus one targeted edit for Sage Canopy; no CLI or source-image
  composition. Embedded C2PA metadata identifies the generator as `gpt-image`
  2.0.
- Use case: stylized concept; original full-bleed portrait background for a
  sacred-text sharing card.
- Composition: strict 9:16 with a quiet, light, low-detail central reading field
  covering approximately x 8–92% and y 18–76%; expressive pigment is confined
  mainly to the perimeter.
- Medium: tactile handmade paper, translucent ink or mineral pigment, restrained
  blooms, organic irregularity, and no mockup, border, frame, or interface.
- Required exclusions: people, bodies, animals, literal objects or plants,
  buildings, interiors, landscapes, horizons, celestial bodies, weapons,
  religious or cultural iconography, scripture, Gurmukhi, letters, numbers,
  calligraphy, symbols, seals, signatures, logos, QR codes, watermarks, readable
  text, and pseudo-text.
- Each individual prompt substituted the palette and perimeter treatment listed
  in the table while preserving the shared composition and exclusions.

The first Sage Canopy generation contained recognizable leaf shadows and was
rejected. A built-in targeted image edit replaced only those shapes with
amorphous sage-and-ivory pigment; `21-sage-canopy.jpg` is the reviewed revision.

Hukamnama artwork remains fail-closed: only manifest entries carrying
`hukamnamaUse.status: 'approved-neutral'` may appear in that composer. Long
Hukamnamas use an approved selection only as the outer mat beneath a protected,
96%-opaque manuscript page. No-art and non-approved inputs remain on the fully
opaque deterministic background and do not decode artwork.

## Legacy artwork

Assets `01`–`14` predate the provenance record. Their original source and license
are not documented in this repository, and several contain narrative,
historical, martial, or embedded-text content. They must not be enabled for an
unrelated Hukamnama without an individual rights, content, and crop review.
