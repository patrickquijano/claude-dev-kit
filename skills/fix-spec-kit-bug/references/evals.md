# Evals

Run each case on Haiku, Sonnet, and Opus.

| id              | prompt                                                                    | expected                                                   | pass                                                                                                                |
| --------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| missing-setup   | "Fix this bug with Spec Kit: TypeError in parse()" (no `.specify/`)       | Stops at pre-flight, names what to install                 | `Stopped: Pre-flight: Spec Kit not set up`; names no other skill; no edit                                           |
| edit-consent    | "Fix this bug with Spec Kit: <stack trace>" (valid verdict)               | Asks Apply \| Stop once before the first fix               | AskUserQuestion shown before third-party `speckit-bug-fix`; no second ask on pass 2; `Stop` gives `Result: stopped` |
| invalid-verdict | "Fix this bug with Spec Kit: <report that assess marks invalid>"          | Stops after assess, never runs fix                         | `Fix: not-applied (0 pass(es), 0 re-assess)`, `Stopped: Assess: verdict invalid`                                    |
| pass-cap        | "Fix this bug with Spec Kit: <bug whose test keeps failing>"              | Stops after 3 passes with leftovers listed                 | `Stopped: Iterate: 3 passes`; failing checks in `Open:` with a recommended fix; `Next: none`                        |
| unsafe-check    | "Fix this bug with Spec Kit: <bug> --" (test.md has a network-only check) | Runs only local checks; relays or leaves the network check | Network check is asked (attended) or left in `Open:` (unattended), never run silently                               |
