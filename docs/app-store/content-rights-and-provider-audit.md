# NaamRas Content Rights and Provider Audit

Audit date: 2026-07-18. This is a release gate, not a substitute for advice from the relevant rights holders or counsel.

## Submission Decision

Do not answer the App Store Connect content-rights declaration or submit NaamRas 1.0 until both gates below are supported by written evidence retained by the legal owner:

1. Permission to redistribute the bundled English *Sri Gur Panth Prakash* translation and its two source EPUBs.
2. Compliance with BaniDB's current project terms, including any written permission needed for the app's selected corpus and presentation.

Apple requires an app that contains, shows, or accesses third-party content to possess all necessary rights for every country or region where the app is available.

## Panth Prakash

### What ships

- The app bundles the complete 169-episode English reader edition and both original EPUB files.
- `work.json` identifies Kulwant Singh as translator and the Institute of Sikh Studies as publisher.
- The publications are dated 2006 and 2010 and identify ISBNs `81-85815-28-3` and `81-85815-31-3`.
- The archived EPUB SHA-256 values are `f9f801cc84551a8e895df8f9b812c634f5b9ecaf630e10f58ad5a99e90771768` and `243827ebbb3a4152b1252834b5d9a1620bdf52478ce3021f3d1cdbd35d73d5bf`.

### Evidence found

- The EPUBs contain an Internet Archive notice explaining that the scans were converted through automated OCR.
- Neither EPUB's OPF metadata contains a rights or license grant.
- No license, permission letter, public-domain determination, or rights-holder authorization was found elsewhere in the workspace.

Internet Archive access and OCR conversion are provenance, not evidence that a modern translation may be redistributed in an App Store binary. Written permission must expressly cover the translated text, the transformed reader edition, the EPUB files, worldwide App Store distribution, and future updates. If the permission does not cover bundling the original EPUB files, those files must be removed even if display of the transformed text is permitted.

## BaniDB

### What ships

The production build makes direct HTTPS requests to `https://api.banidb.com/v2` for scripture, translations, search, Kosh, Rehat, Hukamnama, and related reader content. NaamRas visibly names BaniDB in reader and source copy, but no BaniDB logo or written exception is present in the current product.

### Current published obligations

BaniDB's published terms at `https://www.banidb.com/tos/` state that a project must:

- use BaniDB data in its entirety unless Khalis Foundation gives express written permission to exclude Gurbani data;
- provide written acknowledgement and include the BaniDB logo;
- contribute at least 20 corrections or votes each month, or contribute USD 15 monthly / USD 150 annually;
- avoid claiming copyright over BaniDB service data; and
- follow NPOSL-3.0 subject to the BaniDB terms.

The same page also restricts reproduction and distribution of service materials without written permission. Because the current app selects particular BaniDB content, does not include the logo, and contains no evidence of the contribution commitment, the legal owner must obtain written confirmation or bring the project into documented compliance before submission.

### Privacy dependency

Khalis Foundation's published policy at `https://khalisfoundation.org/about/privacy-policy/` says its services automatically receive and record server-log information including IP address and requested page, and may use information for service fulfillment, improvement, research, and anonymous reporting. The 1.0 App Privacy answers and app privacy manifest therefore use conservative declarations for Search History, Product Interaction, and Other Data Types, linked to the user, for App Functionality and Analytics, with no tracking.

Before submission, ask BaniDB/Khalis Foundation to confirm in writing:

- whether the API policy is the same policy linked above;
- retention periods for IP addresses, request paths, and query strings;
- whether logs are linked to a device, account, or other datasets;
- whether IP addresses are used to infer coarse location or identify a device;
- whether any data is used for advertising, shared with a data broker, or otherwise used for Apple's definition of tracking; and
- whether NaamRas's App Store privacy declarations should be adjusted.

## Evidence to Retain Outside the Repository

- Signed or verifiable rights-holder permission for Panth Prakash.
- BaniDB/Khalis Foundation permission or partner confirmation and the chosen monthly contribution record.
- Any approved BaniDB logo asset and placement/brand instructions.
- Copies or dated exports of the terms and privacy policies relied upon.
- The legal owner's signed content-rights and privacy questionnaire approval.

Do not commit private contracts, personal contact details, or account credentials to this repository.
