# PLAN-010 i18n internationalization and custom theme system

- **status**: completed
- **createdAt**: 2026-03-17 10:00
- **approvedAt**: 2026-03-17 10:30
- **relatedTask**: FEAT-024, FEAT-025

## Current State

### i18n (FEAT-024)
- No i18n infrastructure exists
- All UI text is hardcoded English strings in JSX across ~26 component files
- Text categories: UI labels/headers (30+), placeholders (12+), buttons (50+), error/status messages (20+), aria-labels (24+), descriptions (15+)
- Settings panel already has an "Appearance" tab that can be extended with language selector

### Theme System (FEAT-025)
- Basic light/dark/system toggle implemented via `use-theme.ts` hook
- CSS variables defined in `globals.css` using OKLCH color space (27 color variables + sidebar variants)
- shadcn/ui components already consume CSS variables (`--color-primary`, `--color-background`, etc.)
- Theme preference persisted to `localStorage` (key: `matrix-web-theme`)
- No custom color schemes or theme pack support

## Proposal

### Part A: i18n (FEAT-024)

**Dependencies:** `i18next` + `react-i18next`

**Architecture:**
```
apps/web/src/
├── i18n/
│   ├── index.ts              # i18next init (lng detection, fallback)
│   ├── locales/
│   │   ├── en.json           # English translations
│   │   └── zh-CN.json        # Chinese translations
│   └── types.ts              # Typed translation keys (optional)
```

**Implementation steps:**

1. Install `i18next` + `react-i18next`
2. Create `apps/web/src/i18n/index.ts` — initialize i18next with:
   - Language detection from localStorage (key: `matrix-web-language`)
   - Fallback language: `en`
   - Bundled JSON resources (no lazy loading — total text is small)
3. Create `en.json` and `zh-CN.json` translation files with namespaced keys:
   - `common.*` — shared labels (Cancel, Close, Save, etc.)
   - `auth.*` — login/register pages
   - `chat.*` — message input, room list, sidebar
   - `settings.*` — all 5 settings panels
   - `crypto.*` — encryption, key backup, device verification
   - `lock.*` — lock screen
4. Import `i18n/index.ts` in `main.tsx` (side-effect import before React render)
5. Replace hardcoded strings with `t('key')` calls using `useTranslation()` hook in each component
6. Add language selector to Appearance panel (dropdown: English / 简体中文)
7. Persist language choice to localStorage, i18next handles runtime switch

**Key decisions:**
- Single namespace (flat keys with dot-separated groups) — simpler than multi-namespace for this project size
- Bundled translations (no lazy loading) — total JSON is <10KB per language
- aria-labels are also translated for accessibility

### Part B: Theme System (FEAT-025)

**Architecture:**
```
apps/web/src/
├── hooks/
│   └── use-theme.ts          # Extended: theme mode + custom colors
├── themes/
│   ├── index.ts              # Theme registry, load/save/export/import
│   ├── presets.ts            # Built-in theme presets
│   └── types.ts              # ThemePreset type definition
```

**Implementation steps:**

1. Define `ThemePreset` type:
   ```ts
   interface ThemePreset {
     id: string
     name: string
     colors: {
       light: Record<string, string>   // CSS variable overrides for light mode
       dark: Record<string, string>    // CSS variable overrides for dark mode
     }
   }
   ```
2. Create 4 built-in presets:
   - **Default** — current shadcn neutral colors (no overrides)
   - **Blue** — blue-tinted primary/accent
   - **Green** — green-tinted primary/accent
   - **Rose** — rose/pink-tinted primary/accent
3. Extend `use-theme.ts`:
   - Add `activePreset: string` state (persisted to `localStorage` key: `matrix-web-theme-preset`)
   - `applyPreset()` — inject CSS variable overrides via `document.documentElement.style.setProperty()`
   - `removePreset()` — clear all overrides to return to default
4. Extend Appearance panel:
   - Add "Color Theme" section below existing theme mode selector
   - Grid of preset cards with color preview swatches
   - Import/Export buttons:
     - Export: serialize current preset to JSON, trigger download
     - Import: file input, parse JSON, validate shape, apply
5. Custom theme import validation: check required keys, validate OKLCH format
6. Persist custom imported themes to localStorage (key: `matrix-web-custom-themes`)

**Key decisions:**
- CSS variable override approach (not class-based) — compatible with existing Tailwind setup
- Presets only override color variables, keeping `--radius` and animations unchanged
- Import/export uses plain JSON — no proprietary format
- Each preset provides both light and dark variants

## Risks

1. **Translation completeness** — missing keys will show raw key strings. Mitigation: use `saveMissing` in dev mode to detect gaps.
2. **String interpolation** — some strings have dynamic values (e.g., "X attempt(s) remaining"). Mitigation: use i18next interpolation `{{count}}` and pluralization.
3. **CSS variable specificity** — inline style overrides may conflict with Tailwind `@theme` declarations. Mitigation: use `document.documentElement.style` which has highest specificity.
4. **Theme preset size** — importing malformed JSON could crash the app. Mitigation: validate with a schema check before applying.

## Scope

| Area | Files Changed | Effort |
|------|--------------|--------|
| i18n infrastructure | 3 new files | Small |
| Translation extraction (26 components) | ~26 modified | Medium |
| Language selector UI | 1 modified | Small |
| Theme system infrastructure | 3 new files | Small |
| Theme presets | 1 new file | Small |
| Appearance panel extension | 1 modified | Medium |
| **Total** | ~30 files | **Medium-Large** |

## Alternatives

### i18n Framework
- **Option A (chosen): react-i18next** — industry standard, great React integration, interpolation, pluralization
- **Option B: FormatJS/react-intl** — ICU message format, heavier bundle, more complex API
- **Option C: Paraglide.js** — compile-time, smaller bundle, but less mature ecosystem

### Theme System
- **Option A (chosen): CSS variable overrides** — minimal code, works with existing Tailwind setup
- **Option B: Multiple CSS files** — traditional approach, requires build-time theme compilation
- **Option C: CSS-in-JS runtime** — most flexible but adds bundle size and runtime cost

## Notes

(User annotations and replies.)
