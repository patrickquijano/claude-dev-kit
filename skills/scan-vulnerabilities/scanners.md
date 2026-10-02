# Scanners

Shared by `cdk:scan-vulnerabilities` and `cdk:security-scanner`. Security scanners only; never add or run linters, formatters, or code-style tools.

## Pinned images

Pin tag and digest together so a moved tag cannot change the scanner. Digests were checked against Docker Hub, GHCR, and Quay on 2026-10-02. To update one, change tag and digest together and re-check the registry.

| Scanner     | Image                                                                                                             | Version command     |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ------------------- |
| semgrep     | `semgrep/semgrep:1.179.0@sha256:93963d9295a366f59e4850127b1550400ee7b388f04fe144e4a1f6325d96e01b`                 | `semgrep --version` |
| trivy       | `aquasec/trivy:0.75.0@sha256:af6acf9a6b85dfe389a1941505c0ce9efef52a4719635e1a962f022a3d855daa`                    | `--version`         |
| gitleaks    | `zricethezav/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f`            | `version`           |
| osv-scanner | `ghcr.io/google/osv-scanner:v2.6.0@sha256:afd838850ac1a0fcc15ff4a041dc9ba11123c3f0d2666217a5f0fcf9222b55fa`       | `--version`         |
| checkov     | `bridgecrew/checkov:3.3.22@sha256:617c76e3f9b1f7907ebca9abb6b9d746844edcb48e9bd775e4692c69c1c6ac47`               | `--version`         |
| dockle      | `goodwithtech/dockle:v0.4.15@sha256:eade932f793742de0aa8755406c7677cd7696f8675b6180926f7eeffa7abe6b9`             | `--version`         |
| kubescape   | `quay.io/kubescape/kubescape-cli:v4.0.15@sha256:16f1383351936d4085f9eec4a01a08abe34e531629d2e849d3893aaed2c74052` | `version`           |
| zap         | `zaproxy/zap-stable:2.17.0@sha256:781a2bdaea47324e7bab583e2263f21d257b0aee61ed51521a5be45f5f5081ef`               | image tag           |
| jq (redact) | `ghcr.io/jqlang/jq:1.8.2@sha256:b9c68867e5766576263a222e91db3de422d802069c7af70440e667a95344e486`                 | `--version`         |

Record the resolved digest per run: `docker image inspect --format '{{index .RepoDigests 0}}' <image>`.

## Repository detection

List files with `git ls-files --cached --others --exclude-standard`. Skip `node_modules/`, `vendor/`, `third_party/`, `dist/`, `build/`, `out/`, `target/`, `.venv/`, `.git/`, and `.vulnerability-reports/`. Also skip `*.min.*` and files whose first lines say they are generated.

| Signal       | Detected by                                                                                                                                                                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source code  | Extensions semgrep supports: `.js .jsx .ts .tsx .py .go .java .kt .scala .rb .php .cs .c .h .cpp .rs .swift .ex .exs .sh .tf .yaml .yml .json`, plus `Dockerfile`                                                                                                                                                                     |
| Dependencies | `package-lock.json yarn.lock pnpm-lock.yaml bun.lock requirements*.txt poetry.lock Pipfile.lock uv.lock pdm.lock go.mod Cargo.lock Gemfile.lock composer.lock pom.xml gradle.lockfile buildscript-gradle.lockfile packages.lock.json *.csproj mix.lock pubspec.lock conan.lock`                                                       |
| IaC          | `*.tf *.tfvars`, CloudFormation (YAML or JSON with `AWSTemplateFormatVersion` or `Resources` with `Type: AWS::`), `*.bicep`, ARM (`$schema` with `deploymentTemplate`), `serverless.yml`, `Dockerfile*`, `docker-compose*.y*ml compose*.y*ml`, `.github/workflows/*.y*ml`, `.gitlab-ci.yml`, `azure-pipelines.yml`, Ansible playbooks |
| Kubernetes   | YAML with top-level `apiVersion` and `kind`, `Chart.yaml` (Helm), `kustomization.y*ml`                                                                                                                                                                                                                                                |
| Images       | `Dockerfile*` or `Containerfile*`, or `image=<ref>` arguments                                                                                                                                                                                                                                                                         |
| Web target   | Only the `zap-target=<url>` argument; never inferred                                                                                                                                                                                                                                                                                  |

Production exposure: a dependency is `dev` when only the manifest's dev, test, or build section declares it (npm `devDependencies`, Poetry dev groups, Maven `test` scope, Gradle `test*` configurations). A file is `test` under `test/`, `tests/`, `spec/`, `__tests__/`, or `*_test.*`. Everything else is `production`, or `unknown` when it cannot be determined.

## Applicability

| Scanner     | Runs when                                                       | Scope                                                           |
| ----------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| semgrep     | Source code detected                                            | SAST; keep only `metadata.category: security` results           |
| trivy fs    | Always                                                          | `vuln` (if dependencies), `secret`, `misconfig` (if IaC)        |
| gitleaks    | Always: `dir` mode; also `git` mode when `.git/` exists         | Secrets in the tree and in history                              |
| osv-scanner | Dependencies detected                                           | Dependency CVEs and advisories                                  |
| checkov     | IaC or Kubernetes detected                                      | IaC misconfiguration                                            |
| trivy image | Image built or given                                            | OS and library CVEs in the image                                |
| dockle      | Image built or given                                            | Image security hygiene (CIS)                                    |
| kubescape   | Kubernetes detected                                             | Manifests, Helm, and Kustomize files only; never a live cluster |
| zap         | `zap-target` given, and the skill passed the authorization gate | DAST against that target only                                   |

Not applicable → status `skipped` with the reason. Never record a skipped scanner as clean.

## Command templates

Common variables:

```bash
ROOT=$(git rev-parse --show-toplevel)
RUN="$ROOT/.vulnerability-reports/<ts>"
RAW=$(mktemp -d)                     # host temp dir outside the repo; deleted after redaction
CACHE="$ROOT/.vulnerability-reports/.cache"
mkdir -p "$RAW/<scanner>" "$CACHE/trivy"   # before each run, or Docker creates them as root
COMMON=(--rm --name "cdk-vs-<scanner>-<iteration>" --user "$(id -u):$(id -g)" -e HOME=/tmp
        -v "$ROOT:/src:ro" -v "$RAW/<scanner>:/out")
OFFLINE=(--network none)             # scanners that need no network
```

The repository is mounted read-only (`:ro`), so a scanner cannot change source files. Logs go to `$RAW/<scanner>/<scanner>.log`. Semgrep's stdout prints matched code, so only its stderr is logged.

```bash
# semgrep (exit 0 = done; findings in JSON)
docker run "${COMMON[@]}" "$SEMGREP" semgrep scan --config p/default --metrics=off --quiet \
  --json-output=/out/semgrep.json /src >/dev/null 2>"$RAW/semgrep/semgrep.log"

# trivy filesystem (drop vuln or misconfig from --scanners when not applicable)
docker run "${COMMON[@]}" -e TRIVY_CACHE_DIR=/cache -v "$CACHE/trivy:/cache" "$TRIVY" fs \
  --scanners vuln,secret,misconfig --skip-dirs /src/.vulnerability-reports \
  --format json --output /out/trivy-fs.json /src >"$RAW/trivy/trivy.log" 2>&1

# gitleaks working tree, then history (--redact masks values in logs and reports)
# gitleaks ignores .gitignore, so the skip list goes into a config that extends the defaults;
# when the repo has .gitleaks.toml, add `path = "/src/.gitleaks.toml"` under [extend] instead
cat > "$RAW/gitleaks/gitleaks.toml" <<'TOML'
[extend]
useDefault = true
[allowlist]
paths = ['''(^|/)(\.vulnerability-reports|node_modules|vendor|third_party|dist|build|out|target|\.venv)/''', '''\.min\.''']
TOML
docker run "${COMMON[@]}" "${OFFLINE[@]}" "$GITLEAKS" dir /src --config /out/gitleaks.toml --redact --no-banner \
  --report-format json --report-path /out/gitleaks-dir.json >"$RAW/gitleaks/gitleaks.log" 2>&1
docker run "${COMMON[@]}" "${OFFLINE[@]}" "$GITLEAKS" git /src --config /out/gitleaks.toml --redact --no-banner \
  --report-format json --report-path /out/gitleaks-git.json >>"$RAW/gitleaks/gitleaks.log" 2>&1

# osv-scanner
docker run "${COMMON[@]}" "$OSV" scan source -r /src --format json \
  --output-file /out/osv.json >"$RAW/osv-scanner/osv-scanner.log" 2>&1

# checkov (--skip-download: no Prisma Cloud calls; --compact: no code blocks in CLI output)
docker run "${COMMON[@]}" "$CHECKOV" -d /src --skip-path .vulnerability-reports --quiet --compact \
  --skip-download -o json --output-file-path /out >"$RAW/checkov/checkov.log" 2>&1

# kubescape (local files only; --keep-local never reports to a backend)
docker run "${COMMON[@]}" "$KUBESCAPE" scan /src --keep-local --format json --format-version v2 \
  --output /out/kubescape.json >"$RAW/kubescape/kubescape.log" 2>&1
```

Only JSON reports are kept, because redaction projects JSON to an allow-list (`reports.md` `## Redaction`). SARIF, HTML, and JUnit embed snippets and messages that an allow-list cannot cover.

Images: build each repo Dockerfile locally (`docker build -f <Dockerfile> -t cdk-vuln-scan/<slug>:<ts> <its dir>`), or use each `image=<ref>` that already exists locally. A build runs the project's own Dockerfile steps; list that under validation limitations. Pinned scanner images may be pulled; never pull or push a target image the user did not name. Export once with `docker save <ref> -o "$RAW/images/<slug>.tar"` so that no scanner needs the Docker socket:

```bash
docker run "${COMMON[@]}" -v "$RAW/images:/images:ro" -e TRIVY_CACHE_DIR=/cache -v "$CACHE/trivy:/cache" \
  "$TRIVY" image --input /images/<slug>.tar --format json --output /out/trivy-image-<slug>.json
docker run "${COMMON[@]}" "${OFFLINE[@]}" -v "$RAW/images:/images:ro" "$DOCKLE" --input /images/<slug>.tar \
  -f json -o /out/dockle-<slug>.json
```

A build failure gives status `failed` (`image build failed`) for trivy image and dockle, never clean. The skill removes the `cdk-vuln-scan/*` tags it built at the end of the run.

## Network

Data that leaves the machine; print it at pre-flight and repeat it in `summary.md` `## Scope`:

- osv-scanner sends package names, versions, and ecosystems to `api.osv.dev`, and may resolve Maven transitive dependencies through `deps.dev`.
- kubescape may refresh its control frameworks from its artifact registry.
- trivy downloads its vulnerability and misconfiguration databases from its registries.
- semgrep downloads the `p/default` ruleset from the Semgrep registry (`--metrics=off`, no code sent).
- Docker pulls the pinned images. ZAP runs with `-z "-silent"`, so it makes no update or add-on requests. Gitleaks, dockle, and jq run with `--network none`.

## OWASP ZAP

- Run only for an explicit `zap-target`, after the skill's authorization gate. Never infer, guess, or crawl to another host.
- Allowed hosts: `localhost`, `127.0.0.1`, `::1`, or a private address (`10/8`, `172.16/12`, `192.168/16`) that the user confirmed as their own non-production environment. Any other host gives status `skipped` (`not local`). The same check applies to `zap-spec` when it is a URL.
- Inside the container, `localhost` points at the container itself. On macOS and Windows, rewrite the given host to `host.docker.internal`. On Linux, add `--network host`. This maps the given target; it is not a new one.
- ZAP writes to `/zap/wrk` as user `zap`: mount `"$RAW/zap:/zap/wrk:rw"` after `chmod 777 "$RAW/zap"`, and do not pass `--user`. A local spec file is copied into `$RAW/zap/` first.
- API mode needs both `zap-target` and `zap-spec`. Always pass `-O <zap-target>`, so ZAP sends requests to the validated target, never to the `servers` host inside the spec.

| Mode               | Command                                                                                                               | Approval                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| baseline (default) | `zap-baseline.py -t <url> -J zap.json -z "-silent"`                                                                   | Authorization                                 |
| api                | `zap-api-scan.py -t <spec> -f openapi -O <zap-target> -S -J zap.json -z "-silent"` (`-S` = safe mode, no active scan) | Authorization                                 |
| full (active)      | `zap-full-scan.py -t <url> -J zap.json -z "-silent"`                                                                  | Authorization + explicit active-scan approval |

## Exit codes and status

| Scanner     | Done                                | Failed                                      |
| ----------- | ----------------------------------- | ------------------------------------------- |
| semgrep     | 0 (or 1 with `--error`)             | ≥ 2                                         |
| trivy       | 0                                   | non-zero                                    |
| gitleaks    | 0 (no leaks), 1 with a valid report | 1 without report, 126                       |
| osv-scanner | 0, 1                                | 127, 129–255; 128 = `skipped` (no packages) |
| checkov     | 0, 1 (failed checks)                | other                                       |
| dockle      | 0                                   | non-zero                                    |
| kubescape   | 0                                   | non-zero                                    |
| zap         | 0 (pass), 1 (fail), 2 (warn)        | 3                                           |

Status is one of: `ok` (done, zero findings), `findings`, `failed`, `timeout`, `unavailable` (Docker or image pull failed), or `skipped`. A missing or unparsable report always gives `failed`. Run each scanner with a 10-minute Bash timeout. On timeout, `docker rm -f cdk-vs-<scanner>-<iteration>` (only this run's own container) and set status `timeout`.
