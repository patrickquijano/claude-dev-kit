#!/usr/bin/env bash
# Seeds a small CLI package with no README, so the skill has facts to work from.
set -eu
mkdir -p bin
cat > package.json <<'EOF'
{
  "name": "greet-cli",
  "version": "0.1.0",
  "description": "Print a greeting for a name.",
  "type": "module",
  "bin": { "greet": "bin/greet.js" },
  "scripts": { "test": "node --test" },
  "license": "MIT"
}
EOF
cat > bin/greet.js <<'EOF'
#!/usr/bin/env node
console.log(`Hello, ${process.argv[2] ?? 'world'}!`);
EOF
printf 'MIT License\n' > LICENSE
