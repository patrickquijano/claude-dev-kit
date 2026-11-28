## Reuse before creating

Before writing any new script, helper, or test file, look for an existing solution in this order:

1. Local: repo scripts, Makefile, package.json scripts, existing tests, utilities, installed CLI tools.
2. Packages: the project's package registry for a maintained library.
3. Online: `gh search repos`, `gh search code`, official docs. Maximum 2 searches per task.

Run tier 3 only if tiers 1 and 2 fail. A solution qualifies only if it needs little or no change, is actively maintained, has a compatible license, and adds no heavy dependency. If one qualifies, report source, version, and license, then ask me before installing or running it. Pin exact versions. Create a scratch or temp file only if all tiers fail. Then state in one line what you searched and why it was not enough. Delete the file when done.
