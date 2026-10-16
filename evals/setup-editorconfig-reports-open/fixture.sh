#!/usr/bin/env bash
# Seeds a git repo whose existing .editorconfig and files conflict (tabs vs spaces), a style problem setup-editorconfig never auto-fixes.
set -eu
git init -q
mkdir -p src
printf 'root = true\n\n[*]\nindent_style = space\nindent_size = 2\nend_of_line = lf\ninsert_final_newline = true\n' > .editorconfig
printf 'function f() {\n\treturn 1;\n}\n' > src/app.js
printf 'print("hi")   \n' > src/main.py
git add -A
git -c user.name=t -c user.email=t@example.com commit -q -m 'chore: seed' --no-gpg-sign
