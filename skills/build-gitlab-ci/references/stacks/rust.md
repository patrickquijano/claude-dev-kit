# Rust

## Detect

`Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`.

## Cache

- Key: `files: [Cargo.lock]` (key from the lockfile); paths: `.cargo/registry` (set `CARGO_HOME` under the project dir) and `target` for incremental builds.
- Policy: `pull-push` (the default, not written) on the install or build job; `policy: pull` on every job that only reads the cache.

## Test and reports

- Test: `cargo test`.
- Coverage: A coverage tool the project already uses; none → omit coverage.
- Report types: `artifacts:reports:junit` for test results; `artifacts:reports:coverage_report` for coverage; `sast` when enabled. Set `expire_in` on each.

## Image

Image family `rust`; variant `alpine` or `slim`. Match `rust-toolchain.toml` or `rust-version`, then resolve the full tag.

## Deploy

Binaries: release artifacts on tags.
