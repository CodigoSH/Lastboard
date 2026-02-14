---
description: This workflow describes how to add, modify, or delete translated strings in Lastboard.
---

# Translation Workflow

Lastboard uses a robust translation system based on a central `en.json` file and a synchronization script. **DO NOT** create ad-hoc scripts to modify JSON files directly.

## 1. Add/Modify Keys
Always edit the master English file first:
- `web/public/locales/en.json`

## 2. Synchronization
To propagate changes to all other 20+ supported languages, run the synchronization script using **Bun**:

```bash
bun scripts/i18n-sync.ts
```

*Note: Ensure `i18n-sync.ts` exists in `scripts/`. If it is located elsewhere (e.g., project root), adjust the path accordingly.*

## 3. Verification
Check a few target files (e.g., `es.json`, `pt.json`) to verify the new keys have been added.

## 4. Commit
Commit all changed JSON files.

```bash
git add web/public/locales/*.json
git commit -m "feat(i18n): update translations"
```
