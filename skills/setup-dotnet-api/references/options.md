# Options

## Contents

- Fixed criteria · Sources · Questions

## Fixed criteria

Default weights for every data-store or tool question:

| Criterion                          | Weight |
| ---------------------------------- | ------ |
| Official or first-party support    | 25     |
| Maintenance and community evidence | 20     |
| Fit for the stated workload        | 20     |
| Operating cost and self-hosting    | 15     |
| License                            | 10     |
| Measured performance evidence      | 10     |

The user's stated goals replace these only when they name different goals. Never bias toward a vendor.

## Sources

Every score uses the `grill.md` anchors and cites a URL or says `unverified`; license scores cite the package's license file or registry page.

## Questions

| Question        | Candidates (verify each against the research)                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| SQL             | SQL Server, PostgreSQL (Npgsql), MySQL or MariaDB provider, SQLite; check provider support for the resolved EF Core major on NuGet first |
| NoSQL           | MongoDB, Cosmos DB, DynamoDB, others the research finds                                                                                  |
| Search Engine   | Elasticsearch, OpenSearch, Meilisearch, Typesense                                                                                        |
| Cache           | in-memory, Redis, Valkey, SQL-backed distributed cache                                                                                   |
| Messaging       | Wolverine, MassTransit, Azure Service Bus, RabbitMQ client, Kafka client; check each license                                             |
| SMTP            | MailKit, Fluent-based senders; exclude `SmtpClient` (not recommended by Microsoft)                                                       |
| Object Storage  | S3 and S3-compatible SDKs, Azure Blob Storage, local                                                                                     |
| CQRS dispatcher | MIT `Mediator` source generator, `WolverineFx`, hand-rolled handlers; MediatR only if its license fits                                   |
| API style       | controllers plus JsonApiDotNetCore, minimal APIs plus a hand-rolled JSON:API envelope                                                    |

Skip omits the piece.
