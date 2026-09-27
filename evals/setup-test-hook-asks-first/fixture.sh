#!/usr/bin/env bash
# Seeds a Vitest project whose .claude/settings.json already runs tests on Stop.
set -eu
mkdir -p .claude src
cat > package.json <<'EOF'
{
  "name": "demo",
  "version": "1.0.0",
  "type": "module",
  "devDependencies": { "vitest": "*" }
}
EOF
cat > vitest.config.js <<'EOF'
export default {};
EOF
cat > src/sum.js <<'EOF'
export const sum = (a, b) => a + b;
EOF
cat > src/sum.test.js <<'EOF'
import { expect, test } from 'vitest';
import { sum } from './sum.js';

test('adds', () => expect(sum(1, 2)).toBe(3));
EOF
cat > .claude/settings.json <<'EOF'
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "npx vitest run" }] }]
  }
}
EOF
