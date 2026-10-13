// PreToolUse git safety guard: blocks or asks on the git and gh commands the repo rules forbid (rules in .claude/rules/git.md).
// `classify` is pure; `decide` reads the git context and calls it.
import { existsSync } from 'node:fs';
import { git, shipReleaseMarker } from './git-state.mjs';
import { segments } from '../../../skills/bump-version/scripts/release-check.mjs';

const realDeps = { git, existsSync, env: process.env, cwd: () => process.cwd() };

const block = (reason) => ({ decision: 'block', reason: `git-guard: ${reason}` });
const ask = (reason) => ({ decision: 'ask', reason: `git-guard: ${reason}` });

const hasShort = (arg, letter) => /^-[A-Za-z]+$/.test(arg) && arg.includes(letter);
const VALUE_FLAGS = new Set(['-m', '-F', '-C', '-c', '--message', '--file']);

// Branch a push refspec writes to; '' when it names no branch.
function destination(spec, branch) {
  const dest = spec
    .replace(/^\+/, '')
    .split(':')
    .pop()
    .replace(/^refs\/heads\//, '');
  return dest === 'HEAD' ? branch : dest;
}

function pushRule(args, ctx) {
  const flags = args.filter((a) => a.startsWith('-'));
  const positional = args.filter((a) => !a.startsWith('-'));
  const refspecs = positional.slice(1);
  const deleting = flags.some((a) => a === '--delete' || a === '-d');
  const plusSpec = refspecs.some((a) => a.startsWith('+'));
  const bareLease = flags.some((a) => a === '--force-with-lease');
  const forced = flags.some((a) => a === '--force' || hasShort(a, 'f') || a === '--mirror') || plusSpec;
  const leased = flags.some((a) => /^--force-with-lease=[^:]+:.+/.test(a));
  const dests = refspecs.length
    ? refspecs.map((a) => destination(a, ctx.branch))
    : flags.includes('--tags')
      ? []
      : [ctx.branch];
  const hitsDefault = dests.includes(ctx.defaultBranch) || flags.includes('--all') || flags.includes('--mirror');
  if (forced)
    return block(
      'force push is forbidden (.claude/rules/git.md ## Push). Use --force-with-lease=<branch>:<sha> after explicit confirmation; never on the default branch.'
    );
  if (flags.includes('--no-verify')) return block('--no-verify is forbidden on push; fix the failing hook instead.');
  if (leased && hitsDefault) return block(`force push to ${ctx.defaultBranch} is forbidden.`);
  if (
    (deleting && dests.includes(ctx.defaultBranch)) ||
    refspecs.some((a) => a.startsWith(':') && destination(a) === ctx.defaultBranch)
  )
    return block(`deleting ${ctx.defaultBranch} is forbidden.`);
  if (bareLease)
    return ask('bare --force-with-lease protects nothing; pass --force-with-lease=<branch>:<pre-rewrite sha>.');
  if (hitsDefault)
    return ask(`push to the default branch ${ctx.defaultBranch}; work on a Conventional Branch instead.`);
  return null;
}

function commitRule(args, ctx) {
  const skip = [];
  args.forEach((a, i) => {
    if (VALUE_FLAGS.has(a)) skip.push(i + 1);
  });
  const flags = args.filter((a, i) => a.startsWith('-') && !skip.includes(i));
  if (flags.includes('--no-verify') || flags.some((a) => hasShort(a, 'n')))
    return block('--no-verify (-n) is forbidden on commit; fix the failing hook instead.');
  if (ctx.branch && ctx.branch === ctx.defaultBranch)
    return ask(`commit on the default branch ${ctx.defaultBranch}; switch to a Conventional Branch first.`);
  return null;
}

function branchRule(args, ctx) {
  const del = args.filter((a) => a === '-d' || a === '-D' || a === '--delete' || hasShort(a, 'd') || hasShort(a, 'D'));
  if (!del.length) return null;
  const names = args.filter((a) => !a.startsWith('-'));
  if (names.includes(ctx.defaultBranch)) return block(`deleting ${ctx.defaultBranch} is forbidden.`);
  if (del.some((a) => a === '-D' || hasShort(a, 'D'))) return ask('git branch -D deletes unmerged work.');
  return null;
}

function gitRule(rest, ctx) {
  const args = [...rest];
  // Skip global options before the subcommand (-C <path>, -c <k=v>, --no-pager, ...).
  while (args.length && args[0].startsWith('-')) args.splice(0, ['-C', '-c'].includes(args[0]) ? 2 : 1);
  const [sub, ...tail] = args;
  if (sub === 'push') return pushRule(tail, ctx);
  if (sub === 'commit') return commitRule(tail, ctx);
  if (sub === 'merge' && tail.includes('--no-verify')) return block('--no-verify is forbidden on merge.');
  if (sub === 'branch') return branchRule(tail, ctx);
  if (sub === 'reset' && tail.includes('--hard')) return ask('git reset --hard discards uncommitted work.');
  if (
    sub === 'clean' &&
    !tail.some((a) => a === '--dry-run' || hasShort(a, 'n')) &&
    tail.some((a) => a === '--force' || hasShort(a, 'f'))
  )
    return ask('git clean -f deletes untracked files.');
  return null;
}

// First block, else first ask, across every command in the line: { decision: 'block' | 'ask' | null, reason }.
// `ctx`: { branch, defaultBranch, shipRelease, ci }.
export function classify(command, ctx) {
  let asked = null;
  for (const raw of segments(String(command ?? ''))) {
    const t = [...raw];
    const envs = [];
    while (t.length && /^[A-Za-z_]\w*=/.test(t[0])) envs.push(t.shift());
    const [bin, ...rest] = t;
    let hit = null;
    if (envs.includes('HUSKY=0') && !ctx.ci)
      hit = block('HUSKY=0 is allowed in CI only; never bypass the Git hooks locally.');
    else if (bin === 'git') hit = gitRule(rest, ctx);
    else if (bin === 'gh' && rest[0] === 'pr' && rest[1] === 'merge' && rest.includes('--admin'))
      hit = ctx.shipRelease
        ? block('--admin merge is forbidden during /cdk:ship-release.')
        : ask('--admin merge bypasses branch protection.');
    else if (bin === 'claude' && rest[0] === 'plugin' && rest[1] === 'eval')
      hit = block('claude plugin eval is run by the user by hand, never by Claude.');
    if (hit?.decision === 'block') return hit;
    asked ??= hit;
  }
  return asked ?? { decision: null, reason: '' };
}

// Default branch: origin/HEAD, else main or master when it exists, else main.
function defaultBranchOf(cwd, run) {
  const head = run(cwd, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  if (head.status === 0)
    return head.stdout
      .toString()
      .trim()
      .replace(/^origin\//, '');
  for (const name of ['main', 'master'])
    if (run(cwd, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`]).status === 0) return name;
  return 'main';
}

// Guard decision for a PreToolUse event; { decision: null } for anything that is not a git, gh, or claude Bash command.
export function decide(event, deps = {}) {
  const d = { ...realDeps, ...deps };
  const command = event?.tool_name === 'Bash' ? String(event.tool_input?.command ?? '') : '';
  if (!/\b(git|gh|claude)\b|HUSKY/.test(command)) return { decision: null, reason: '' };
  const cwd = (typeof event.cwd === 'string' && event.cwd) || d.env.CLAUDE_PROJECT_DIR || d.cwd();
  const branchRun = d.git(cwd, ['branch', '--show-current']);
  const ctx = {
    branch: branchRun.status === 0 ? branchRun.stdout.toString().trim() : '',
    defaultBranch: defaultBranchOf(cwd, d.git),
    shipRelease: Boolean(shipReleaseMarker(cwd, d.git, d.existsSync)),
    ci: Boolean(d.env.CI)
  };
  return classify(command, ctx);
}
