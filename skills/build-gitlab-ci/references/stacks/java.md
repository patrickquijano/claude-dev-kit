# Java

## Detect

`pom.xml` (Maven), `build.gradle` or `build.gradle.kts` (Gradle), wrapper scripts `mvnw` and `gradlew`.

## Cache

- Key: `files: [pom.xml]` (key from the lockfile); paths: `.m2/repository` (set `maven.repo.local`), or `.gradle` with `GRADLE_USER_HOME` under the project dir.
- Policy: `pull-push` (the default, not written) on the install or build job; `policy: pull` on every job that only reads the cache.

## Test and reports

- Test: `mvn test` or `gradle test`; prefer the wrapper when present.
- Coverage: JaCoCo XML converted to Cobertura, or a Cobertura plugin when the project has one.
- Report types: `artifacts:reports:junit` for test results; `artifacts:reports:coverage_report` for coverage; `sast` and `dependency_scanning` when enabled. Set `expire_in` on each.

## Image

Image family `maven`, `gradle`, or an `eclipse-temurin` JDK image. Match the declared Java version, then resolve the full tag.

## Deploy

Artifacts: publish to the package registry on tags. Services: an `environment` per target.
