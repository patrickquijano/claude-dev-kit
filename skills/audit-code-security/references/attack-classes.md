# Attack classes

Pick the product type from the manifests and entry points, then pass its checklist in the recon and hunt briefs. A repo can match several types; use each one that applies. The items point at what to look at; a finding still needs the bar in the findings reference.

## Contents

- Web app or API · CLI or library · Plugin or agent tooling · Infra or CI · Mobile or desktop · Data pipeline

## Web app or API

- Authentication: session or token creation, expiry, reset flows, default accounts.
- Authorization: object-level checks on every route, tenant isolation, admin-only paths reachable by ordinary users.
- Injection: SQL, NoSQL, shell, template, header, and log injection from request data.
- Server-side requests: URL fetchers, webhooks, and image or file importers that reach internal addresses.
- Files: upload type and size, path joins from request data, archive extraction.
- Browser side: output encoding, redirects, cross-origin settings, cookie flags.
- State change: forgery protection on cookie-authenticated requests, replayable operations, race windows.
- Secrets and errors: keys in code or logs, verbose errors that leak internals.

## CLI or library

- Arguments and environment: values that reach a shell, a path, or a file mode.
- Parsing: untrusted files or streams in unsafe deserializers, unbounded sizes or depths.
- Filesystem: temporary files, symlink following, world-writable outputs, path traversal in extraction.
- Network: certificate checks switched off, plaintext fallbacks, redirects to other hosts.
- Supply chain: install scripts, dynamic imports of paths from input, unpinned remote code.
- Public API: functions that trust their callers with data the caller took from outside.

## Plugin or agent tooling

- Prompt input: file, web, or tool output that reaches a model prompt and can steer tool calls.
- Tool reach: broad shell or file permissions granted by default, write access outside the project.
- Hooks and scripts: command strings built from event data, unquoted paths, eval of input.
- Credentials: tokens passed on command lines or written to logs and run files.
- Trust of fetched content: remote text treated as instructions, unverified downloads run as code.
- Cross-agent returns: data from a subagent used unchecked in a shell argument or a path.

## Infra or CI

- Pipeline triggers: untrusted pull-request code running with secrets or write tokens.
- Injection: expression interpolation of issue, branch, or commit text into shell steps.
- Permissions: token scopes wider than the job needs, shared runners, long-lived credentials.
- Supply chain: actions or images referenced by moving tags, unchecked downloads.
- Images and manifests: containers running as root, exposed ports, secrets baked into layers.
- Infrastructure code: public storage, open security groups, wildcard policies.

## Mobile or desktop

- Local storage: tokens or personal data stored unencrypted, backups that include them.
- Inter-process entry points: deep links, intents, custom URL schemes, exported components.
- Transport: pinning absent, cleartext traffic allowed, debug trust settings left on.
- Web views: loading remote content with native bridges exposed.
- Updates and plugins: unsigned code loaded at run time.
- Privilege: over-broad permissions, helper processes running with elevated rights.

## Data pipeline

- Ingest: untrusted records that reach a query, a template, or a deserializer.
- Credentials: connection strings in config or logs, shared service accounts.
- Access: datasets and buckets readable by more principals than the job needs.
- Personal data: sensitive fields copied to logs, samples, or less-protected stores.
- Orchestration: job definitions or notebooks that execute code from shared locations.
- Outputs: files written to paths built from record values, exports with injection into spreadsheets.
