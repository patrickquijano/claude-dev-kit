# Commands

| Name            | Command                                                                                                  | Purpose                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `repo-root`     | `git rev-parse --show-toplevel`                                                                          | Repo root; fail falls back to cwd (preloaded in Context)                     |
| `docker-check`  | `command -v docker`                                                                                      | Whether docker is installed                                                  |
| `image-build`   | `docker build -f <Dockerfile> -t cdk-build-test:<run id> <context>`                                      | Test build to a throwaway tag (default target only)                          |
| `image-inspect` | `docker image inspect cdk-build-test:<run id> --format '{{.Config.User}} {{json .Config.ExposedPorts}}'` | User and ports of the test image, compared with the plan                     |
| `image-remove`  | `docker image rm cdk-build-test:<run id>`                                                                | Remove the throwaway test image                                              |
| `tool-probe`    | `docker run --rm --entrypoint sh <image> -c 'command -v <tool>'`                                         | Path of a tool inside a trusted image, for `COPY --from` (asks for approval) |
