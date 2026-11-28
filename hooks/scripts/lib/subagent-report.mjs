// Parses a `cdk:plan-implementer` Return report and finds why it cannot be accepted (missing or failing proof).
const STATUS = /^Status:\s*(done|partial|blocked)\b/m;
const PROOF_LINE = /^\s*-\s*(tests|lint):\s*(.+?)\s*$/gm;
const EXIT = /^exit\s+(\d+)$/;
const SKIPPED = /^skipped\s*\(.+\)$/;

// Returns `{ status, proof }`: the Status word (or null) and each `Proof:` entry as `{ name, exit, skipped, raw }`.
export function parseReport(text) {
  const status = STATUS.exec(text)?.[1] ?? null;
  const start = text.search(/^Proof:\s*$/m);
  const proof = [];
  if (start !== -1) {
    const end = text.slice(start).search(/^(?:Pinned|REQUIRES_REVIEW|Deviations|Self-check|Question):/m);
    const section = end === -1 ? text.slice(start) : text.slice(start, start + end);
    for (const [, name, raw] of section.matchAll(PROOF_LINE)) {
      const code = EXIT.exec(raw);
      proof.push({ name, exit: code ? Number(code[1]) : null, skipped: SKIPPED.test(raw), raw });
    }
  }
  return { status, proof };
}

// Returns the reasons a report is rejected; empty for a blocked report (nothing was edited) or one whose proof all passed or was skipped with a reason.
export function problems(text) {
  const { status, proof } = parseReport(text);
  if (status === 'blocked') return [];
  if (proof.length === 0) return ['the report has no `Proof:` entries (`- tests: exit <n>`, `- lint: exit <n>`)'];
  return proof.flatMap(({ name, exit, skipped, raw }) => {
    if (skipped || exit === 0) return [];
    return [
      exit === null
        ? `\`Proof:\` ${name} entry "${raw}" is not \`exit <n>\` or \`skipped (<reason>)\``
        : `\`Proof:\` ${name} exited ${exit}`
    ];
  });
}
