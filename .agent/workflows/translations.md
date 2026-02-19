---
description: This workflow describes how to add, modify, or delete translated strings in Lastboard.
---

# Translation Workflow

Lastboard uses a translation system based on `en.json` as the master file.
All locale JSON files in `web/public/locales/` are the single source of truth for translations.

## Source of truth

- **Master file:** `web/public/locales/en.json` — always edit this first
- **Locale files:** `web/public/locales/{lang}.json` — one per language, edited directly

## 1. Add a new string

1. Add the new key to `web/public/locales/en.json`
2. Run the sync script to add the key (with English fallback) to all other locales:
```bash
bun scripts/i18n-sync.ts
```
3. The string will appear in English in all languages until translated.

## 2. Translate the new string

Ask the AI assistant to translate the new key:
> "Traduce la clave `my.new.key` para todos los idiomas y escríbela en los JSON"

The assistant will write the translations directly into each locale JSON file.

## 3. Modify an existing translation

Edit the value directly in the corresponding locale JSON file:
```
web/public/locales/es.json   ← Spanish
web/public/locales/fr.json   ← French
...
```

**No need to run the sync script** for corrections to existing keys.

## 4. Delete a string

1. Remove the key from `web/public/locales/en.json`
2. Run the sync script — it will automatically remove the key from all locale files:
```bash
bun scripts/i18n-sync.ts
```

## 5. Commit

```bash
git add web/public/locales/*.json
git commit -m "feat(i18n): update translations"
```

## Supported languages

| Code | Language    | Code | Language   |
|------|-------------|------|------------|
| es   | Spanish     | ko   | Korean     |
| fr   | French      | nl   | Dutch      |
| de   | German      | pl   | Polish     |
| it   | Italian     | tr   | Turkish    |
| pt   | Portuguese  | id   | Indonesian |
| ru   | Russian     | ar   | Arabic     |
| zh   | Chinese     | fa   | Persian    |
| ja   | Japanese    | el   | Greek      |
| hi   | Hindi       | bn   | Bengali    |
| ur   | Urdu        |      |            |
