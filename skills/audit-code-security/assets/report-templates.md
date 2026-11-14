# Report templates

Fill each placeholder from the `findings.json` record fields (`id`, `coverage_id`, `file`, `line`, `actor`, `input`, `boundary`, `impact`, `evidence`, `verdict`, `severity`, `refutation`, `fix`, `regression_test`, `fix_status`). `Depends on` is the deployment fact that a `needs_validation` record's `refutation` names. Write a secret's value as `[redacted]`, never the value.

## REPORT

<!-- prettier-ignore-start -->

```markdown
# Security audit: <repo>

Run: <absolute run directory> | Head: <head> | Profile: <profile> | Range: <range or none>

| Verdict          | Count |
| ---------------- | ----- |
| confirmed        | <n>   |
| needs_validation | <n>   |
| rejected         | <n>   |

| ID   | Severity   | File:line   | Verdict   | Fix status   |
| ---- | ---------- | ----------- | --------- | ------------ |
| <id> | <severity> | <file:line> | <verdict> | <fix_status> |

Fix status: <n> fixed, <n> open, <n> not_applicable
Open: <ids still open, or none>
Not hunted: <`scope.json` `out_of_scope` and `sensitive` paths, the recon `no source` unit's paths, and the deferred units' paths, or none>
```

<!-- prettier-ignore-end -->

## FINDINGS-DETAIL

```markdown
### <id> — <severity> — <file:line>

- Unit: <coverage_id>
- Actor: <actor>
- Input: <input>
- Boundary: <boundary>
- Impact: <impact>
- Evidence: <evidence, at most 3 lines, secrets as [redacted]>
- Refutation: <refutation>
- Fix: <fix>
- Regression test: <regression_test>
- Fix status: <fix_status>
```

## NEEDS-VALIDATION

```markdown
### <id> — <file:line>

- Unit: <coverage_id>
- Actor: <actor>
- Input: <input>
- Boundary: <boundary>
- Impact if true: <impact>
- Evidence: <evidence, secrets as [redacted]>
- Refutation: <refutation>
- Depends on: <the deployment fact named in refutation, or `not verified: over the verify cap` (rerun with a narrower scope)>
```

## FIX-SPEC

One `## <id>` section per confirmed finding, most severe first.

<!-- prettier-ignore-start -->

```markdown
# Fix spec: <repo>

Run directory: <absolute run directory>
Repo root: <absolute repo root>
Edit only files inside the repo; never write to the run directory. Add no commands, dependencies, or CI, hook, or config changes.

## <id> — <file:line>

- File: <file>
- Flaw: <impact>
- Fix: <fix>
- Regression test: <regression_test>
```

<!-- prettier-ignore-end -->
