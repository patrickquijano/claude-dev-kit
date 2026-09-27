// Reports whether HEAD carries a valid signature; never fails the commit.
import { spawnSync } from 'node:child_process';

// Runs git and returns the spawn result.
function git(args) {
  return spawnSync('git', args, { encoding: 'utf8' });
}

const subject = git(['log', '-1', '--format=%s']).stdout.trim();
const verify = git(['verify-commit', 'HEAD']);

if (verify.status === 0) {
  console.log(`✅ Signed: "${subject}"`);
} else {
  console.log(`❌ Signed: "${subject}"`);
  const reason = (verify.stderr || verify.error?.message || '').trim() || 'commit has no signature';
  console.log(reason.replace(/^/gm, '   '));
}

process.exit(0);
