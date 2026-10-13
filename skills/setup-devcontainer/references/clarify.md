Details step 3 (Clarify).

AskUserQuestion, recommended option first with the reason; derivable facts and facts the input gives are never asked.

- Call 1:
  - Services, three multiSelect questions: "Databases" (PostgreSQL, MySQL, MariaDB, MongoDB), "Cache and messaging" (Redis, Valkey, RabbitMQ, Kafka), "Search and dev tools" (OpenSearch, Elasticsearch, Mailpit, LocalStack). Catalog services with analyzer evidence get "(Recommended)" and their evidence; the analyzer's `Other services` are named in the first question's text, to add via "Other". An "Other" service resolves to its official Docker Hub image (none found → call 3). Nothing selected → no services.
  - Claude Code: Yes, no firewall (Recommended; feature, sign-in volume, Codespaces secrets) | Yes, with firewall (egress allowlist; adds NET_ADMIN and NET_RAW, needs a Dockerfile, blocks unlisted registries) | No.
- Approach: no question; derive per practices.md `## Approach` from call 1 and report it with the reason.
- Call 2, each question only when it applies:
  - Docker access, when the analyzer says `Builds images: yes`: None (Recommended; least access) | docker-outside-of-docker (host daemon) | docker-in-docker (privileged).
  - Stack and runtime version, when `Empty: yes` or the version is not derivable.
  - Config to update, when update mode found more than one config.
- Call 3: only for gaps left after call 2 and failed step 4 lookups (step 4 re-runs for the answers).
