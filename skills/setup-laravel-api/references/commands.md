# Commands

Run by name; never alter flags. Versions come from the resolver; a pinned number never appears in this skill.

| Name             | Command                                             | Purpose                                                                               |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `git-root`       | `git rev-parse --show-toplevel`                     | Fails outside a git repo (preloaded)                                                  |
| `php-version`    | `php --version`                                     | Fails when PHP is missing (preloaded)                                                 |
| `composer-check` | `command -v composer`                               | Fails when Composer is missing                                                        |
| `scratch`        | `mktemp -d`                                         | Scratch dir for the scaffold                                                          |
| `latest`         | `composer show <pkg> --latest --format=json`        | Latest stable version of a package; fallback registry row                             |
| `available`      | `composer show --all --available <pkg>`             | Versions and PHP requirements of a package                                            |
| `create`         | `composer create-project laravel/laravel <scratch>` | Scaffold into the scratch dir; never `laravel new --force`                            |
| `require`        | `composer require <pkg>`                            | No constraint: stable by default; `--dev` for dev tools                               |
| `artisan`        | `php artisan <command>`                             | Framework commands (`install:api`, `scalar:install`, `boost:install`, `stub:publish`) |
| `pint`           | `vendor/bin/pint --test`                            | Style check without changes                                                           |
| `pest`           | `vendor/bin/pest`                                   | Run the tests                                                                         |
| `route-list`     | `php artisan route:list`                            | Confirm routes (`/` 204, `/scalar` gated)                                             |
