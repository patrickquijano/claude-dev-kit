# Backing services

Candidate pools for the Backend API questions in `flow.md` `## Clarify`. Each question offers the 3 top-scored candidates plus **None (not set up)**; the rest stay reachable through Other. Popularity, maintenance status, and licence are researched at run time with one web search per topic and never stored here. Image tags are resolved per `practices.md` `## Image tags`; an image outside Docker Hub is asked per the Images rule.

## Contents

- Pools

## Pools

| Topic          | Candidate      | Official image                       | Docs                                                                                 |
| -------------- | -------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| SQL            | PostgreSQL     | `postgres` (Docker Hub)              | <https://hub.docker.com/_/postgres>                                                  |
| SQL            | MySQL          | `mysql` (Docker Hub)                 | <https://hub.docker.com/_/mysql>                                                     |
| SQL            | MariaDB        | `mariadb` (Docker Hub)               | <https://hub.docker.com/_/mariadb>                                                   |
| SQL            | SQL Server     | `mcr.microsoft.com/mssql/server`     | <https://learn.microsoft.com/sql/linux/sql-server-linux-docker-container-deployment> |
| NoSQL          | MongoDB        | `mongo` (Docker Hub)                 | <https://hub.docker.com/_/mongo>                                                     |
| NoSQL          | Cassandra      | `cassandra` (Docker Hub)             | <https://hub.docker.com/_/cassandra>                                                 |
| NoSQL          | Couchbase      | `couchbase` (Docker Hub)             | <https://hub.docker.com/_/couchbase>                                                 |
| NoSQL          | DynamoDB Local | `amazon/dynamodb-local` (Docker Hub) | <https://hub.docker.com/r/amazon/dynamodb-local>                                     |
| Search engine  | Elasticsearch  | `elasticsearch` (Docker Hub)         | <https://hub.docker.com/_/elasticsearch>                                             |
| Search engine  | OpenSearch     | `opensearchproject/opensearch`       | <https://hub.docker.com/r/opensearchproject/opensearch>                              |
| Search engine  | Meilisearch    | `getmeili/meilisearch`               | <https://hub.docker.com/r/getmeili/meilisearch>                                      |
| Search engine  | Typesense      | `typesense/typesense`                | <https://hub.docker.com/r/typesense/typesense>                                       |
| Cache          | Redis          | `redis` (Docker Hub)                 | <https://hub.docker.com/_/redis>                                                     |
| Cache          | Valkey         | `valkey/valkey`                      | <https://hub.docker.com/r/valkey/valkey>                                             |
| Cache          | Memcached      | `memcached` (Docker Hub)             | <https://hub.docker.com/_/memcached>                                                 |
| Messaging      | RabbitMQ       | `rabbitmq` (Docker Hub)              | <https://hub.docker.com/_/rabbitmq>                                                  |
| Messaging      | Apache Kafka   | `apache/kafka`                       | <https://hub.docker.com/r/apache/kafka>                                              |
| Messaging      | NATS           | `nats` (Docker Hub)                  | <https://hub.docker.com/_/nats>                                                      |
| SMTP testing   | Mailpit        | `axllent/mailpit`                    | <https://hub.docker.com/r/axllent/mailpit>                                           |
| SMTP testing   | smtp4dev       | `rnwood/smtp4dev`                    | <https://hub.docker.com/r/rnwood/smtp4dev>                                           |
| SMTP testing   | MailHog        | `mailhog/mailhog`                    | <https://hub.docker.com/r/mailhog/mailhog>                                           |
| Object storage | MinIO          | `minio/minio`                        | <https://hub.docker.com/r/minio/minio>                                               |
| Object storage | LocalStack     | `localstack/localstack`              | <https://hub.docker.com/r/localstack/localstack>                                     |
| Object storage | SeaweedFS      | `chrislusf/seaweedfs`                | <https://hub.docker.com/r/chrislusf/seaweedfs>                                       |

An image name above is a lookup target, not a pinned tag; confirm it exists on the cited page at run time and never write a tag from memory.
