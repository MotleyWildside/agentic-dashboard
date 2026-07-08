# Agentic Dashboard — Knowledge Base (WikiLLM)

This folder is the **persistent, compiled understanding of this project**, maintained
like code. Instead of every future AI agent (or developer) re-discovering the
architecture from raw source, they read this wiki, act, and then **update it** so the
next agent starts smarter.

The approach follows Karpathy's "LLM wiki" idea: knowledge is ingested once, compiled
into small interlinked Markdown notes, and kept in sync with the codebase.

## Three-layer model

| Layer | Location | What it is | Mutability |
|---|---|---|---|
| 1. Raw sources | [raw/](raw/) | Original analysis notes, research, pasted references | Append-only; don't casually rewrite |
| 2. Wiki | [wiki/](wiki/) | The maintained knowledge base — interlinked notes | Update whenever the code changes |
| 3. Schema | [schema.md](schema.md) | Rules for maintaining layers 1–2 | Change deliberately, rarely |

## Where to start

- **AI agent working on this repo?** → [00-agent-entrypoint.md](00-agent-entrypoint.md)
- **Human getting oriented?** → [wiki/index.md](wiki/index.md) then
  [wiki/architecture/overview.md](wiki/architecture/overview.md)
- **Maintaining this wiki?** → [schema.md](schema.md)

## Conventions

- Notes are small, focused Markdown files with Obsidian-style wikilinks like
  `[[plugin-system]]` (they resolve by filename within this knowledge base; plain
  relative Markdown links are also used so GitHub renders them).
- Every page that describes code names the **actual files** it describes.
- Pages carry "Why this exists" and "How to safely change this" sections where the
  answer isn't obvious.
- Architectural decisions get an ADR in [wiki/decisions/](wiki/decisions/).
- The change history of the wiki itself lives in [wiki/log.md](wiki/log.md).
