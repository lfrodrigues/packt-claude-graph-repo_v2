// Phase 2: implementer and tester in parallel, then verify, then a bounded
// remediation loop. One command takes a plan to a merge-ready branch or an
// escalation. Run it with:  /graph-build <slug>
//
// The whole run lives in one worktree, opened by /graph-plan. The isolation
// that matters is per RUN, not per node: the graph gets a branch of its own so
// it never mutates main while it is still exploring.
//
// Gate 1 has already happened: graph/artifacts/decision-log.md holds the
// human's answers to the planner's open questions, and both nodes read it —
// off disk, in this same tree, which is why no commit is needed mid-run.

export const meta = {
  name: 'graph-build',
  description: 'implementer ∥ tester on disjoint files, then the verifier grades every criterion',
  phases: [
    { title: 'Build', detail: 'implementer and tester in parallel, on disjoint files' },
    { title: 'Check', detail: 'verifier probes every acceptance criterion' },
    { title: 'Recover', detail: 'implementer fixes only failed_criteria, max 2 attempts' },
  ],
};

// The spec is required. No default, no inference: a graph that guesses which
// feature it is building is the mistake the graph exists to catch.
const spec = args && args.spec;
if (!spec)
  throw new Error(
    'No spec. Run /graph-build <feature-slug> — see .claude/skills/graph-build/SKILL.md.'
  );
const feature = (args && args.feature) || spec.split('/').pop().replace(/\.md$/, '');

// The plan path is required for the same reason, and cannot be computed here:
// NNN depends on what docs/plans/ already holds, and a workflow script has no
// filesystem access. The skill re-derives it and passes it in.
const planPath = args && args.plan;
if (!planPath)
  throw new Error(
    'No plan path. The skill re-derives docs/plans/<NNN>-<slug>.md and passes it — see .claude/skills/graph-build/SKILL.md.'
  );

const MAX_ATTEMPTS = 2; // the loop is bounded HERE, in code — not in a prompt

const REPORT = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    criteria_done: { type: 'array', items: { type: 'string' } },
    criteria_not_done: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['files', 'criteria_done', 'criteria_not_done'],
};

const VERDICT = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    failed_criteria: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['pass', 'failed_criteria', 'summary'],
};

// ---------- Build: disjoint files, so there is nothing to merge ----------
// These two run at the same time in the same tree. What keeps them off each
// other's files is a RULE in each agent file — implementer.md says "no writes
// under tests/", tester.md writes only tests/<feature>.test.ts. Both hold bare
// Edit and Write, so nothing enforces it; it holds because the model complies.
//
// A worktree each would not enforce it either. It would buy two full copies of
// the repo and a merge somebody has to write. The isolation worth having is
// one worktree for the whole RUN, which is what /graph-plan opens.
phase('Build');
const [impl, tests] = await parallel([
  () =>
    agent(
      `Implement the steps assigned to "implementer" in ${planPath} for ${spec}. Read graph/artifacts/decision-log.md for the human's gate-1 answers. Only touch src/. Write graph/artifacts/implementation.md.`,
      { label: 'implementer', agentType: 'implementer', schema: REPORT }
    ),
  () =>
    agent(
      `Write tests/${feature}.test.ts covering every acceptance criterion in ${spec}. Read graph/artifacts/decision-log.md for the human's gate-1 answers. Do NOT read src/routes/${feature}.ts or graph/artifacts/implementation.md. Write graph/artifacts/test-report.md.`,
      { label: 'tester', agentType: 'tester', schema: REPORT }
    ),
]);

// A barrier is correct here: the verifier cannot grade anything until both
// lanes have FINISHED. There is nothing to merge — they wrote to the same
// tree, to files that cannot collide.
if (!impl || !tests) return { status: 'aborted', reason: 'a build lane died', impl, tests };
log(
  `implementer left undone: ${impl.criteria_not_done.join(', ') || 'nothing'} · tester gaps: ${tests.criteria_not_done.join(', ') || 'none'}`
);

// ---------- Check ----------
const verify = (round) =>
  agent(
    `Verify every acceptance criterion in ${spec} independently, against src/routes/${feature}.ts and tests/${feature}.test.ts. Do NOT read graph/artifacts/implementation.md. Run npm test, then probe any criterion the tests do not genuinely cover — a passing suite is not evidence that a criterion holds. Write graph/artifacts/verdict.json and verdict.md. (verification round ${round})`,
    { label: `verifier#${round}`, agentType: 'verifier', phase: 'Check', schema: VERDICT }
  );

phase('Check');
let verdict = await verify(0);

// ---------- Recover: bounded, scope = failed_criteria ----------
// There is no human gate here on purpose (see graph/README.md, "The gates"):
// a fix scoped to a list the fixer did not write, bounded in code, is
// reversible and cheap. The bound is the control. A human sees the run only
// when the bound is spent — that is escalation, the third pause, by exception.
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
log(verdict.pass ? `verdict: PASS after ${attempt} remediation(s)` : `verdict: FAIL — bound spent`);

// Gate 2 lives outside this script: a human reads the verdict before merging.
if (verdict.pass)
  return { status: 'ready-for-human-merge', feature, attempts: attempt, summary: verdict.summary };

// The bound is spent. A human reads the decision log and decides.
return {
  status: 'escalated',
  feature,
  attempts: attempt,
  failed_criteria: verdict.failed_criteria,
  summary: verdict.summary,
};
