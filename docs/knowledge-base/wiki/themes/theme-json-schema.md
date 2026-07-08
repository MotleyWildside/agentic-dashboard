# Theme JSON Schema

A theme pack is one JSON file. The machine-checked rules live in
`shared/theme-schema.ts` (`validateThemePack`); the full TypeScript shape is
`ThemePack` in `shared/types.ts`. Reference example:
`themes/terminal-console.json` (the default & merge-fallback pack).

## Required (validation fails without these)

| Field | Rule |
|---|---|
| `id` | lowercase letters/digits/hyphens (`^[a-z0-9-]+$`) — also the filename |
| `name` | non-empty display name |
| `mode` | `"dark"` or `"light"` (feeds MUI palette mode) |
| `palette.background.default` / `.paper` | hex color |
| `palette.text.primary` | hex color |
| `palette.accent` | hex color (becomes MUI `primary`) |
| `status.running` / `.idle` / `.waiting` / `.attention` / `.error` | hex colors (status badge/glow colors) |

Hex = `#rgb`, `#rrggbb`, or `#rrggbbaa`.

## Optional (fall back to the default pack via deep-merge)

```jsonc
{
  "version": "1.0.0", "author": "…",
  "palette": {
    "background": { "elevated": "#…" },
    "text": { "secondary": "#…", "muted": "#…", "dim": "#…" },
    "border": "#…", "divider": "#…"
  },
  "typography": { "fontUi": "…", "fontMono": "…", "headingWeight": 700, "bodyWeight": 500 },
  "radius": { "sm": 4, "md": 6, "lg": 8, "xl": 12 },
  "spacing": { "density": "compact", "base": 4 },
  "effects": {
    "shadowStrength": "none|subtle|medium|strong",
    "glowStrength": "none|subtle|medium|strong",   // running-card glow
    "glassBlur": 12,                                 // top-bar backdrop blur px
    "backgroundNoise": true                          // scanline overlay
  },
  "components": {
    "card": { "borderWidth": 1, "surfaceOpacity": 0.94 },
    "badge": { "variant": "soft", "uppercase": true }
  },
  "progress": { "height": 6, "radius": 999 },
  "agent": { "activeRail": true, "promptMarker": ">" },
  "appChrome": { "background": "#…", "trafficLights": true }
}
```

## Token → UI mapping (where each token lands)

Implemented in `createMuiThemeFromPack` (`src/theme/themeAdapter.ts`):

| Pack token | Consumed as |
|---|---|
| `palette.accent` | MUI `primary.main` (buttons, resize handles, progress default) |
| `status.*` | `theme.dashboard.status.*` → badges, card borders/glows, connection dot |
| `palette.background/text/divider` | MUI palette |
| `typography.fontUi` | MUI `typography.fontFamily`; `fontMono` → `theme.dashboard.fontMono` |
| `radius.*` | MUI `shape.borderRadius` (md) + `theme.dashboard.radius` |
| `effects.shadowStrength` | MUI `shadows` array opacity |
| everything else | verbatim under `theme.dashboard.*` |

Note: status *color keys* (`waiting`, `attention`) are theme vocabulary, not
agent statuses — the mapping from `AgentStatus` to color keys is
`statusColor()` in `src/ui/lib/status.ts` ([[normalized-agent-data]]).
