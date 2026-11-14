---
paths:
  - '**/*.md'
---

# Markdown

- Prose is never hard-wrapped (Prettier `proseWrap: never` in `.prettierrc.json`): one line per paragraph.
- A `markdown` template fence whose lines a script, eval, or test reads one by one (report, spec, changelog header) sits between `<!-- prettier-ignore-start -->` and `<!-- prettier-ignore-end -->` lines outside the fence, and its line patterns go in `tests/integration/skills/template-fences.test.mjs`.
- Verify: `npm run lint` and `npm test`.
