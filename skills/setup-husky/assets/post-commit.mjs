// Reports whether HEAD carries a valid signature; never fails the commit.
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const defaults = {
  spawn: spawnSync,
  log: (line) => console.log(line)
};

// Runs git and returns the spawn result.
function git(args, deps) {
  return deps.spawn('git', args, { encoding: 'utf8', timeout: 30_000 });
}

// Prints the signature status of HEAD; returns the exit code, always 0.
export function main(deps = defaults) {
  const subject = (git(['log', '-1', '--format=%s'], deps).stdout ?? '').trim();
  const verify = git(['verify-commit', 'HEAD'], deps);

  if (verify.status === 0) {
    deps.log(`✅ Signed: "${subject}"`);
  } else {
    deps.log(`❌ Signed: "${subject}"`);
    const reason = (verify.stderr || verify.error?.message || '').trim() || 'commit has no signature';
    deps.log(reason.replace(/^/gm, '   '));
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
