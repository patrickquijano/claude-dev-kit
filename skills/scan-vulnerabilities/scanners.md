# Scanners

Shared by `cdk:scan-vulnerabilities` and `cdk:security-scanner`. Security scanners only; never add or run linters, formatters, or code-style tools.

## Image resolution

Resolve every image once per run to its latest stable release within the verified major, then lock its digest for the whole run (iterations, rescans, final scan), so before and after counts compare one scanner build. A new run resolves again; nothing carries over from an earlier run.

| Scanner     | Image repo                        | Release source (GitHub) | Tag from release tag | Verified major | Version command     |
| ----------- | --------------------------------- | ----------------------- | -------------------- | -------------- | ------------------- |
| semgrep     | `semgrep/semgrep`                 | `semgrep/semgrep`       | strip `v`            | 1              | `semgrep --version` |
| trivy       | `aquasec/trivy`                   | `aquasecurity/trivy`    | strip `v`            | 0              | `--version`         |
| gitleaks    | `zricethezav/gitleaks`            | `gitleaks/gitleaks`     | as is (`v` kept)     | 8              | `version`           |
| osv-scanner | `ghcr.io/google/osv-scanner`      | `google/osv-scanner`    | as is (`v` kept)     | 2              | `--version`         |
| checkov     | `bridgecrew/checkov`              | `bridgecrewio/checkov`  | as is (no `v`)       | 3              | `--version`         |
| dockle      | `goodwithtech/dockle`             | `goodwithtech/dockle`   | as is (`v` kept)     | 0              | `--version`         |
| kubescape   | `quay.io/kubescape/kubescape-cli` | `kubescape/kubescape`   | as is (`v` kept)     | 4              | `version`           |
| zap         | `zaproxy/zap-stable`              | `zaproxy/zaproxy`       | strip `v`            | 2              | image tag           |
| jq (redact) | `ghcr.io/jqlang/jq`               | `jqlang/jq`             | strip `jq-`          | 1              | `--version`         |

The verified major is a retained constraint: the command templates, flags, exit codes, and redaction key paths below were verified on it. A newer major is reported (`Newer major:`), never used, until the templates are re-verified. Major 0 (trivy, dockle) does not guarantee flag stability across minors: a template that errors or yields unparseable output on a new minor makes the scanner `failed`, never clean.

Steps per scanner:

1. `curl -fsS --max-time 20 "https://api.github.com/repos/<release source>/releases?per_page=100&page=<n>"` (pages 1–3, stopping at the first page that holds a candidate); read `tag_name`, `draft`, `prerelease`.
2. Keep releases with `draft: false`, `prerelease: false`, and a tag that strictly matches `<prefix>X.Y.Z` (prefix `v`, `jq-`, or none per the table). The strict match drops `-rc`, `-beta`, `-alpha`, nightly, and preview tags that the flag misses. A release or repo whose notes or README mark it deprecated or archived is skipped and reported; no registry exposes a deprecation flag.
3. Highest semver whose major equals the verified major. A higher major → note it for `Newer major:`.
4. Derive the image tag from the table, then `docker buildx imagetools inspect <image repo>:<tag> --format '{{json .Manifest.Digest}}'` (the multi-platform index digest). Tag not published → next lower stable release, at most 3 candidates.
5. Write `scanner-images.json` in the run dir: per scanner `version`, `image`, `tag`, `digest`, `release_url`, `resolved_at`, `newer_major`.

A transient failure (network error, HTTP 403 or 429 from the unauthenticated GitHub rate limit) gets one retry within the run; a second failure is `version unverified: step 1`.

Fail safe: any step fails or finds no verified-major stable release → that scanner is `unavailable` with reason `version unverified: <step>`. Never fall back to `latest`, an earlier run's file, an older remembered tag, or a prerelease, and never guess a digest. jq `unavailable` for any reason (unverified, failed pull) → redaction is impossible, so the run stops.

Run every scanner as `<image repo>:<tag>@<digest>` from `scanner-images.json`. Record the resolved digest per run: `docker image inspect --format '{{index .RepoDigests 0}}' <image>`; it must equal the locked digest (the multi-platform index digest), else the scanner is `unavailable`. Rescan or final mode with no `scanner-images.json` → stop (`scanner agent failed`); never re-resolve mid-run.

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
# $SEMGREP, $TRIVY, $GITLEAKS, $OSV, $CHECKOV, $DOCKLE, $KUBESCAPE, $ZAP, $JQ = <image repo>:<tag>@<digest> from scanner-images.json
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

Images: build each repo Dockerfile locally (`docker build -f <Dockerfile> -t cdk-vuln-scan/<slug>:<ts> <its dir>`), or use each `image=<ref>` that already exists locally. A build runs the project's own Dockerfile steps; list that under validation limitations. Resolved scanner images may be pulled; never pull or push a target image the user did not name. Export once with `docker save <ref> -o "$RAW/images/<slug>.tar"` so that no scanner needs the Docker socket:

```bash
docker run "${COMMON[@]}" -v "$RAW/images:/images:ro" -e TRIVY_CACHE_DIR=/cache -v "$CACHE/trivy:/cache" \
  "$TRIVY" image --input /images/<slug>.tar --format json --output /out/trivy-image-<slug>.json
docker run "${COMMON[@]}" "${OFFLINE[@]}" -v "$RAW/images:/images:ro" "$DOCKLE" --input /images/<slug>.tar \
  -f json -o /out/dockle-<slug>.json
```

A build failure gives status `failed` (`image build failed`) for trivy image and dockle, never clean. The skill removes the `cdk-vuln-scan/*` tags it built at the end of the run.

## Network

Data that leaves the machine; print it at pre-flight and repeat it in `summary.md` `## Scope`:

- Image resolution queries `api.github.com` (release lists) and the image registries (Docker Hub, `ghcr.io`, `quay.io`) for tag digests; only repo names and tags are sent.
- osv-scanner sends package names, versions, and ecosystems to `api.osv.dev`, and may resolve Maven transitive dependencies through `deps.dev`.
- kubescape may refresh its control frameworks from its artifact registry.
- trivy downloads its vulnerability and misconfiguration databases from its registries.
- semgrep downloads the `p/default` ruleset from the Semgrep registry (`--metrics=off`, no code sent).
- Docker pulls the resolved `tag@digest` images. ZAP runs with `-z "-silent"`, so it makes no update or add-on requests. Gitleaks, dockle, and jq run with `--network none`.

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
