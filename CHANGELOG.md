# Changelog

## 2026-04-19

### Learn archive cleanup
- fixed broken collection-to-topic references across the Learn archive
- hand-reviewed and rewrote the lowest-scoring topic scenarios so pressure, repair, and practice views now read as distinct paths instead of template variants
- deduped daily-guidance summaries and removed repetitive exhortation scaffolds from published guidance copy
- replaced generated canonical Learn IDs with stable editorial slugs, while keeping legacy aliases so existing links and saved references can still resolve
- updated Learn surface copy to reflect a reviewed, usable archive instead of public-growth framing
- verified the cleanup with repository tests and corpus-level integrity checks before shipping
