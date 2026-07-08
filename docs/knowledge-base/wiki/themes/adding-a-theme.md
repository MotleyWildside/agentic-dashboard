# Adding a Theme

## Custom theme (user, no code)

1. Write a JSON pack per [[theme-json-schema]] — easiest: Settings → **Export**
   an existing theme and edit it. Give it a fresh `id`.
2. Settings (⚙) → **Import JSON**. Invalid packs are rejected with the exact
   validation errors; valid ones are stored and selected immediately.
3. Where it lands: Electron → `<userData>/themes/<id>.json`; browser →
   localStorage. Delete custom themes from the same dialog.

## Built-in theme (ships with the app)

1. Add `themes/<id>.json` (the `id` field must match the filename).
2. Register it in `builtInThemeModules` in `src/theme/themeAdapter.ts`
   (the browser bundle imports built-ins statically; Electron discovers the
   file automatically from `themes/`).
3. `npm test` — `test/theme-schema.test.ts` validates every bundled pack, so a
   bad theme fails the suite.
4. `npm run build` (frontend bundle includes the new pack).
5. Add the theme name to the built-ins list in [[theme-system]].

## Tips

- Start from `themes/light-productivity.json` for light mode,
  `terminal-console.json` for dark.
- Only the required fields are mandatory — omitted optional tokens deep-merge
  from the default pack, so a minimal pack is ~20 lines.
- Check both a running agent (glow/status colors) and the settings dialog
  (border/elevated surfaces) when eyeballing a new pack.
