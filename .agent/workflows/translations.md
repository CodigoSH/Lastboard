---
description: How to add, modify, or delete translated strings in Lastboard
---

# Translation Workflow

This workflow ensures all 20 languages stay synchronized using a combination of master files and a centralized dictionary.

## Supported Languages (20)
`en`, `es`, `fr`, `de`, `it`, `pt`, `ru`, `zh`, `ja`, `ko`, `nl`, `pl`, `tr`, `id`, `ar`, `fa`, `el`, `hi`, `bn`, `ur`

---

## Technical Overview

1. **Master File**: `web/public/locales/en.json` defines the structure and keys.
2. **Sync Dictionary**: `scripts/i18n-sync.ts` contains `COMMON_TRANSLATIONS`, which stores localized overrides for all 19 non-English languages.
3. **Logic**: The sync script reads `en.json`, matches keys in `COMMON_TRANSLATIONS`, and updates/cleans all other `.json` files in `web/public/locales/`.

---

## 🚀 Standard Procedure

### 1. Add/Modify Keys
- **Step A**: Add the key and English text to `web/public/locales/en.json`.
- **Step B**: Add the 19 translations to the `COMMON_TRANSLATIONS` object in `scripts/i18n-sync.ts`.

### 2. Synchronize
// turbo
```bash
bun run scripts/i18n-sync.ts
```
- **Updates** existing keys with new translations from the script.
- **Adds** missing keys (falling back to English if not in `COMMON_TRANSLATIONS`).
- **Removes** orphan keys no longer present in `en.json`.
- **Sorts** all JSON files alphabetically to match `en.json`.

---

## 🔍 Quality Control (Pre-Commit)

### 1. Verification Audit
// turbo
```bash
bun run scripts/i18n-audit.ts
```
- Checks for **missing keys** in secondary languages.
- Detects **untranslated strings** (where value == English).
- Provides a **completeness score** for each language.

### 2. Code Scan
// turbo
```bash
bun run scripts/i18n-scan.ts
```
- Finds `i18n.t('key')` calls using **missing keys**.
- Heuristically flags **hardcoded strings** in TS/HTML templates.

---

## Quick Reference

| Script | Purpose |
|------|---------|
| `i18n-sync.ts` | Push translations from dictionary to JSON files |
| `i18n-audit.ts` | Verify coverage and translation status |
| `i18n-scan.ts` | Detect technical translation gaps in code |
