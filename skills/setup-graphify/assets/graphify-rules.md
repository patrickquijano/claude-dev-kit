# Graphify

The repo has a knowledge graph in `graphify-out/` (`graph.json`, `GRAPH_REPORT.md`). A scoped query costs far fewer tokens than grep or reading files.

## When to use

- Codebase, architecture, and cross-file questions → `graphify query "<question>"` before grep or file reads.
- How two things relate → `graphify path "<A>" "<B>"`.
- One concept or symbol in depth → `graphify explain "<concept>"`.
- Cap output with `--budget <tokens>`; `--dfs` traces one path, the default breadth-first gives context.
- Broad orientation → `graphify-out/wiki/index.md` when it exists; read `GRAPH_REPORT.md` only when query, path, and explain fall short.

## When to skip

- The file or symbol is already known → read or grep it directly.
- The graph is missing or stale and the question is about code just edited → read the file.

## Keeping it current

- After editing code, run `graphify update .` (AST only, no API cost).
- Docs, papers, and images need a full `/graphify .`; it spends session tokens, so run it only when those changed.
- `Community N` placeholder names in `GRAPH_REPORT.md` → `graphify label . --missing-only`; it spends LLM tokens, so run it only when placeholders exist.
- Never edit `graphify-out/` by hand.

## Sharing

- Commit `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` with the change that produced them. The rest of `graphify-out/` stays local and ignored.
- After cloning, run `graphify hook install` once; git hooks and the merge driver are per clone.

Verify: `graphify update .` leaves `graphify-out/graph.json` in place.
