# Handoff

Step 6 detail.

Read the section whose heading starts with `## If go`, up to the next `##` heading. Section missing → `Next: none`, `Result: stopped`; run step 8 on the items the assessment left (open questions or risks in `decision.md`) without re-entering any loop, then print the Output with `Stopped: Hand off: no If go section` and end; none left → `Resolution: none`. `handoff=no` → `Next: handoff ready`, `Result: done`, `Resolution: none`, report, end. Else report the output below first, since run-spec-kit output would bury it, then invoke the `cdk:run-spec-kit` skill via the Skill tool with that section body verbatim as its argument; run-spec-kit owns the rest, including its post-converge review of open items.
