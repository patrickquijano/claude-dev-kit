# Commands

| Name           | Command                                                                               | Purpose                                                  |
| -------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `repo-root`    | `git rev-parse --show-toplevel`                                                       | Repo root; fail falls back to cwd (preloaded in Context) |
| `docker-check` | `command -v docker`                                                                   | Whether docker is installed                              |
| `image-digest` | `docker buildx imagetools inspect <image>:<tag> --format '{{json .Manifest.Digest}}'` | Multi-platform index digest of a resolved tag            |
