# Practices

Candidates for the two practice questions (security, code quality) in step 7. Re-check each against the runtime sources before offering it; one that no source supports is dropped, and an unreachable source is marked "unverified".

## Contents

- Sources · Security candidates · Code-quality candidates · Scoring

## Sources

- Hooks reference, security section: <https://code.claude.com/docs/en/hooks>
- Node.js security best practices: <https://nodejs.org/en/learn/getting-started/security-best-practices>
- OWASP Input Validation: <https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html>
- OWASP OS Command Injection Defense: <https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html>
- OWASP Error Handling: <https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html>
- OWASP Logging: <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html>

## Security candidates

| ID  | Practice                                                              | Source                           |
| --- | --------------------------------------------------------------------- | -------------------------------- |
| S1  | Treat all stdin fields as untrusted; check type before use            | Hooks reference; OWASP Input     |
| S2  | Spawn with an argument array, `shell: false`, never interpolate input | OWASP OS Command Injection; Node |
| S3  | Set an explicit timeout on every child process                        | Node security best practices     |
| S4  | Resolve file paths and keep them inside the project or plugin dir     | Hooks reference (path traversal) |
| S5  | Quote or avoid shell variables; prefer exec form with `args`          | Hooks reference                  |
| S6  | Never print secrets or env values; cap output length                  | OWASP Logging                    |
| S7  | Block only when the event allows it; otherwise warn                   | Hooks reference (exit codes)     |

## Code-quality candidates

| ID  | Practice                                                                 | Source                          |
| --- | ------------------------------------------------------------------------ | ------------------------------- |
| Q1  | One error boundary: one capped stderr line, exit 1                       | OWASP Error Handling            |
| Q2  | Side effects passed in as `deps` so the script is unit-testable          | Node security best practices    |
| Q3  | Main guard so an import never runs the script                            | Node.js ES modules docs         |
| Q4  | One merged JSON object on stdout, nothing else                           | Hooks reference (output)        |
| Q5  | Steps run in order, stop at the first failure, name the step             | Hooks reference (parallel runs) |
| Q6  | Pure helpers (`parseInput`, `requireField`) with positive/negative tests | Node.js test runner docs        |

## Scoring

Score each option 0–10 on four criteria: fit to the need 40, supported by a runtime source 25, enforced rather than advisory 20, added complexity 15 (higher = simpler). Total = Σ weight × score / 10, range 0–100. Show the table and the strongest con of the Recommended option before each question.
