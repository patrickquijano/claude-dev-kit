#!/usr/bin/env bash
# Seeds an ESM project with source code and no test tooling.
set -eu
mkdir -p src
cat > package.json <<'EOP'
{
  "name": "demo",
  "version": "1.0.0",
  "type": "module"
}
EOP
cat > src/sum.js <<'EOP'
export const sum = (a, b) => a + b;
EOP
