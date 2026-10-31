# Red flags

Seed list for the step 14 pass; the research adds findings.

## Contents

- Seed flags · Pass

## Seed flags

| ID | Cause                                                                                       | Options to weigh                                                                                   |
| -- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| D1 | `tests/IntegrationTests.csproj` at the `tests/` root compiles sibling projects' `.cs` files | Keep the path with `<Compile Remove>` or `DefaultItemExcludes` for sibling folders; ask to move it |
| D2 | A commercial-licensed dispatcher, assertion, or messaging package picked silently           | MIT alternative; hand-rolled; the commercial one with the license cost named in the plan           |
| D3 | JSON:API and ProblemDetails both active, so two error formats                               | One JSON:API `errors` renderer; ProblemDetails only; controllers plus JsonApiDotNetCore            |
| D4 | EF provider support missing for the resolved EF Core major                                  | Pick a supported provider; pin the EF major with a plan entry; skip the store                      |
| D5 | `EFCore.NamingConventions` (snake_case `created_at`) is community, not Microsoft            | Use it, cited in the plan; map column names by hand                                                |
| D6 | `SmtpClient` appears as an SMTP candidate                                                   | Exclude it; use the picked library                                                                 |
| D7 | WebApi references Infrastructure beyond the composition root                                | Keep registration only in `Program`/an extension; add an abstraction in Application                |
| D8 | `/` renders a default endpoint                                                              | Leave `/` unmapped so nothing renders                                                              |

## Pass

1. Review the written files against this list and the research findings; add rows for anything new.
2. One table row per flag: ID, root cause, 2-3 options, the chosen one, and a one-line reason citing a URL or `unverified`.
