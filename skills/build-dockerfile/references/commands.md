# Commands

| Name           | Command                                                                        | Purpose                                                                      |
| -------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `repo-root`    | `git rev-parse --show-toplevel`                                                | Repo root; fail falls back to cwd (preloaded in Context)                     |
| `docker-check` | `command -v docker`                                                            | Whether docker is installed                                                  |
| `image-digest` | `docker buildx imagetools inspect <image>:<tag> --format '{{json .Manifest}}'` | Read its `digest` field: multi-platform index digest of a resolved tag       |
| `tool-probe`   | `docker run --rm --entrypoint sh <image> -c 'command -v <tool>'`               | Path of a tool inside a trusted image, for `COPY --from` (asks for approval) |
