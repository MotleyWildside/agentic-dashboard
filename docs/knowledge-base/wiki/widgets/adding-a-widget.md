# Adding a Widget

## As a user (no code)

1. Click the ✎ (edit layout) icon in the top bar (needs a ≥900 px window).
2. Click ＋ → pick a plugin → the widget appears at the first open grid spot.
3. Drag/resize as desired; ✓ to finish. Layout saves automatically to
   `~/.agent-dashboard/settings.json` (server-validated).
4. Remove via the ✕ on a card in edit mode; ↺ resets the whole layout.

Adding the *first* widget of a plugin starts polling that agent; removing the
last one stops it.

## As a developer

- **Widget for a new agent** → that's a plugin: [[adding-an-agent-provider]].
  It appears in the ＋ dialog automatically.
- **Changing what cards display** → `AgentCard` (and friends) in
  `src/ui/agent-card/`; data must come from the normalized snapshot
  ([[normalized-agent-data]]) — never fetch agent-specific sources from the
  frontend. Rebuild with `npm run build`.
- **Changing size limits for a plugin's widgets** → the plugin's `layout`
  field. Server clamps on save, client clamps interactively; both read the
  same limits from `pluginMeta()`.
- **A genuinely new widget type** (not an agent card) → currently unsupported;
  read [[widget-system]] § known limitation first and write an ADR.
