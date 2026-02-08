---
description: How to add, modify, or delete translated strings in Lastboard
---

# Translation Workflow

This workflow ensures all 20 languages stay synchronized when you add, modify, or delete translation keys.

## Supported Languages (20)
`en`, `es`, `fr`, `de`, `it`, `pt`, `ru`, `zh`, `ja`, `ko`, `nl`, `pl`, `tr`, `id`, `ar`, `fa`, `el`, `hi`, `bn`, `ur`

---

## Adding New Strings

1. **Add key to `en.json`** (Master)
   ```bash
   # Edit: web/public/locales/en.json
   # Add your new key, e.g.:
   "myfeature.new_label": "My New Label"
   ```

2. **Add translations to `i18n-sync.ts`**
   ```bash
   # Edit: scripts/i18n-sync.ts
   # Add all 19 translations for your key in COMMON_TRANSLATIONS
   ```

// turbo
3. **Run sync script**
   ```bash
   bun run scripts/i18n-sync.ts
   ```

// turbo
4. **Audit translations**
   ```bash
   bun run scripts/i18n-audit.ts
   ```

---

## Modifying Existing Strings

1. **Update `en.json`** with the new English text.

2. **Update `i18n-sync.ts`** with all 19 updated translations.

// turbo
3. **Run sync script**
   ```bash
   bun run scripts/i18n-sync.ts
   ```

---

## Deleting Strings

1. **Remove key from `en.json`**.

2. **Remove key from `i18n-sync.ts`** (if present).

// turbo
3. **Run sync script** (cleans orphan keys from all locales).
   ```bash
   bun run scripts/i18n-sync.ts
   ```

---

## Pre-Commit Checklist

// turbo
1. **Scan for issues**
   ```bash
   bun run scripts/i18n-scan.ts
   ```
   - Detects missing `i18n.t('key')` references.
   - Flags hardcoded UI strings.

// turbo
2. **Run audit**
   ```bash
   bun run scripts/i18n-audit.ts
   ```
   - Confirms all 20 languages have 100% coverage.

---

## Quick Reference

| Task | Command |
|------|---------|
| Sync all locales | `bun run scripts/i18n-sync.ts` |
| Audit coverage | `bun run scripts/i18n-audit.ts` |
| Scan for issues | `bun run scripts/i18n-scan.ts` |
