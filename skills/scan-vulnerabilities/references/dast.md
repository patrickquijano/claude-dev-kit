Details step 2 (DAST gate).

Check `zap-target`, and `zap-spec` when it is a URL, against `scanners.md` `## OWASP ZAP`. A non-local host, or `zap-mode=api` without `zap-spec` → ZAP `skipped` with that reason, no question. Else AskUserQuestion: I own this non-production target and authorize a passive scan (Recommended) | Skip ZAP. Mode `full` → a second question: Use baseline instead (Recommended) | Run active scan (sends attack payloads to the target). Any unclear ownership → skip ZAP and record why.
