// Phase 1 of the engineering graph: the plan, and the human gate after it.
// Run it with:  /graph-plan      (or Workflow({ scriptPath: 'graph/01-plan.js' }))
//
// Plain JavaScript, not TypeScript: a dynamic workflow script is parsed as JS.
// No Node APIs, no Date.now()/Math.random() — they would break resume.

export const meta = {
  name: 'graph-plan',
  description: 'planner reads the spec and writes the numbered plan, then stops for the human gate',
  phases: [{ title: 'Plan', detail: 'planner writes docs/plans/<NNN>-<slug>.md' }],
};

// The spec is required. No default, no inference: a graph that guesses which
// feature it is building is the mistake the graph exists to catch.
const spec = args && args.spec;
if (!spec)
  throw new Error(
    'No spec. Run /graph-plan <feature-slug> — see .claude/skills/graph-plan/SKILL.md.'
  );
const feature = (args && args.feature) || spec.split('/').pop().replace(/\.md$/, '');

// The plan path is required for the same reason, and cannot be computed here:
// NNN depends on what docs/plans/ already holds, and a workflow script has no
// filesystem access. The skill resolves it and passes it in.
const planPath = args && args.plan;
if (!planPath)
  throw new Error(
    'No plan path. The skill resolves docs/plans/<NNN>-<slug>.md and passes it — see .claude/skills/graph-plan/SKILL.md.'
  );

phase('Plan');
const plan = await agent(
  `Read ${spec} and the repository. The feature slug is "${feature}": the implementation will live in src/routes/${feature}.ts and its tests in tests/${feature}.test.ts. Write your plan to ${planPath}, following graph/templates/plan.md. Return your confidence score and your open questions.`,
  { label: 'planner', agentType: 'planner' }
);

// The script stops here ON PURPOSE. A dynamic workflow cannot pause for a
// human, so gate 1 is a separate run: read the questions below, answer them in
// graph/artifacts/decision-log.md, then run /graph-build.
log(`--- gate 1 · ${feature} ---`);
log(String(plan));
log('Answer the open questions in graph/artifacts/decision-log.md, then run /graph-build.');

return { status: 'awaiting-gate-1', feature, planPath, plan: String(plan) };
