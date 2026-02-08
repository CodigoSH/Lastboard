# Release Notes: v1.1.7-Beta.2

## ⚡ Improvements

### Immediate Beta Detection (UX Fix)
- **Fixed:** Beta versions are now detected immediately when toggling "Beta Tester" on
- **Problem:** Previously required a manual page refresh to detect new beta versions after enabling the toggle
- **Solution:** `handleBetaToggle` now triggers an immediate `checkForUpdates()` call to synchronize with the GitHub API

**Technical Details:**
```typescript
async handleBetaToggle(checked: boolean) {
    this.savePrefs({ beta_updates: checked });
    // ... update visual state ...
    await this.checkForUpdates(); // 🚀 Immediate check
}
```

**Impact:**
- ✅ Instant feedback when switching channels
- ✅ Smoother update experience for beta testers

---

## 📝 Files Modified

- `web/src/components/ui/SettingsContent/SettingsContent.ts` - Added immediate update check trigger
- `package.json` - Version bump
- `internal/version/version.go` - Version bump
- `web/src/components/ui/SettingsContent/SettingsContent.ts` - Version bump

---

## ⚠️ Known Issues

None reported.

---

## 🔄 Migration Notes

**No migration required.** This release is fully backward compatible.
