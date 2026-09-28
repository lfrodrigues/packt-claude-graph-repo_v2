// UTILITY, not a phase of the graph: grade whatever is in the tree right now.
// Run it with:  /graph-verify <slug>
//
// The graph itself is two commands — /graph-plan, then /graph-build — and the
// build carries the verifier and the bounded remediation loop. This script
// exists for the case outside the graph: someone hand-edits src/ next week
// and wants the verifier's opinion without rebuilding. Same verifier, same
// loop, same bound; no build in front of it.

export const meta = {
  name: 'graph-verify',
  description: 'verifier grades every criterion; bounded scoped remediation while it fails',
  phases: [
    { title: 'Check', detail: 'verifier probes every acceptance criterion' },
    { title: 'Recover', detail: 'implementer fixes only failed_criteria, max 2 attempts' },
  ],
};

// The spec is required. No default, no inference: a graph that guesses which
// feature it is building is the mistake the graph exists to catch.
const spec = args && args.spec;
if (!spec)
  throw new Error(
    'No spec. Run /graph-verify <feature-slug> — see .claude/skills/graph-verify/SKILL.md.'
  );
const feature = (args && args.feature) || spec.split('/').pop().replace(/\.md$/, '');
const MAX_ATTEMPTS = 2; // the loop is bounded HERE, in code — not in a prompt

const VERDICT = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    failed_criteria: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['pass', 'failed_criteria', 'summary'],
};

const verify = (round) =>
  agent(
    `Verify every acceptance criterion in ${spec} independently, against src/routes/${feature}.ts and tests/${feature}.test.ts. Do NOT read graph/artifacts/implementation.md. Run npm test, then probe any criterion the tests do not genuinely cover — a passing suite is not evidence that a criterion holds. Write graph/artifacts/verdict.json and verdict.md. (verification round ${round})`,
    { label: `verifier#${round}`, agentType: 'verifier', phase: 'Check', schema: VERDICT }
  );

phase('Check');
let verdict = await verify(0);

// ---------- Recover: bounded, scope = failed_criteria ----------
let attempt = 0;
while (verdict && !verdict.pass && attempt < MAX_ATTEMPTS) {
  attempt += 1;
  log(
    `verdict: FAIL on ${verdict.failed_criteria.join(', ')} — remediation ${attempt}/${MAX_ATTEMPTS}`
  );
  await agent(
    `Attempt ${attempt} of ${MAX_ATTEMPTS}. graph/artifacts/verdict.json lists failed_criteria: ${verdict.failed_criteria.join(', ')}. Fix ONLY those, against ${spec}. Add tests for them; never alter an existing assertion. Append to graph/artifacts/decision-log.md.`,
    { label: `remediation#${attempt}`, agentType: 'implementer', phase: 'Recover' }
  );
  verdict = await verify(attempt);
}

if (!verdict) return { status: 'aborted', reason: 'verifier died' };
if (verdict.pass)
  return { status: 'ready-for-human-merge', feature, attempts: attempt, summary: verdict.summary };

// The bound is spent. This is the third pause, by exception: a human reads the
// decision log and decides.
return {
  status: 'escalated',
  feature,
  attempts: attempt,
  failed_criteria: verdict.failed_criteria,
  summary: verdict.summary,
};
