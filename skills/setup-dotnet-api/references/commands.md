# Commands

Run by name; never alter flags. Versions come from the resolver; a pinned number never appears in this skill.

| Name | Command | Purpose |
| --- | --- | --- |
| `git-root` | `git rev-parse --show-toplevel` | Fails outside a git repo (preloaded) |
| `sdks` | `dotnet --list-sdks` | Installed SDKs (preloaded) |
| `releases` | `curl -fsS https://builds.dotnet.microsoft.com/dotnet/release-metadata/releases-index.json` | Channels; pick the highest `active` channel with a stable `latest-sdk` |
| `scratch` | `mktemp -d` | Scratch dir for the scaffold |
| `collisions` | `diff -rq "<scratch>" "<root>"` | Run after the scaffold and before `move-files`; each `Files ... differ` or type-mismatch line is a collision |
| `move-files` | `cp -Rn "<scratch>/." "<root>"` | Copy the scaffold from the scratch dir into the repo root without overwriting; collisions come from the `collisions` row run first (a colliding file is never overwritten; it is listed under `Open:` with the change it would take), and `cp -n` itself lists none |
| `pkg-latest` | `dotnet package search <id> --exact-match --format json` | Latest stable version of a package; fallback registry row |
| `new-global` | `dotnet new globaljson --sdk-version <v> --roll-forward latestFeature` | Write `global.json` |
| `new-sln` | `dotnet new sln --format slnx --name <RepoNamePascalCase>` | Solution file |
| `new-proj` | `dotnet new <template> --output <dir> --name <name>` | Create each project |
| `sln-add` | `dotnet sln add <csproj>` | Add a project to the solution |
| `add-ref` | `dotnet add <csproj> reference <csproj>` | Project reference |
| `add-pkg` | `dotnet add <csproj> package <id>` | Package (version lives in `Directory.Packages.props`) |
| `build` | `dotnet build -warnaserror` | Build with warnings as errors |
| `test` | `dotnet test` | Run all tests |
| `format` | `dotnet format --verify-no-changes` | Style check without changes |
