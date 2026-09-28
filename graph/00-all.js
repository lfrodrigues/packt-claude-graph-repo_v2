// The same graph, start to finish, with NO human in it.
// Run it with:  /graph-all
//
// Gate 1 cannot exist here — a dynamic workflow cannot pause for a person — so
// a fifth node, the DECIDER, answers the planner's open questions in your
// place. That is the only difference from the gated run. Diff the two
// decision-logs afterwards and you are looking at exactly what the gate buys.
//
// Use it for: rehearsal, generating captured fallbacks, and as insurance —
// start it early and a finished run is standing by if a live phase stalls.

export const meta = {
  name: 'graph-all',
  description: 'the whole graph unattended — a decider agent answers gate 1 instead of a human',
  phases: [
    { title: 'Plan', detail: 'planner writes the numbered plan in docs/plans/' },
    { title: 'Decide', detail: 'a model answers the open questions in place of a human' },
    { title: 'Build', detail: 'implementer ∥ tester, verify, bounded remediation' },
  ],
};

// The spec is required. No default, no inference: a graph that guesses which
// feature it is building is the mistake the graph exists to catch.
const spec = args && args.spec;
if (!spec)
  throw new Error(
    'No spec. Run /graph-all <feature-slug> — see .claude/skills/graph-all/SKILL.md.'
  );
const feature = (args && args.feature) || spec.split('/').pop().replace(/\.md$/, '');

// The plan path is required for the same reason, and cannot be computed here:
// NNN depends on what docs/plans/ already holds, and a workflow script has no
// filesystem access. The skill resolves it and passes it in.
const planPath = args && args.plan;
if (!planPath)
  throw new Error(
    'No plan path. The skill resolves docs/plans/<NNN>-<slug>-unattended.md and passes it — see .claude/skills/graph-all/SKILL.md.'
  );

phase('Plan');
const plan = await workflow({ scriptPath: 'graph/01-plan.js' }, { spec, feature, plan: planPath });

phase('Decide');
await agent(
  `Read ${planPath}. For every entry under "Open questions", decide the answer yourself and record it in graph/artifacts/decision-log.md as attempt 0, in the format graph/templates/decision-log.md specifies. State plainly, for each one, that a model decided this and not a human. Do not change the plan and do not write any code.`,
  { label: 'decider', agentType: 'planner' }
);

phase('Build');
const built = await workflow(
  { scriptPath: 'graph/02-build.js' },
  { spec, feature, plan: planPath }
);

// The build carries the verifier and the bounded remediation loop, so there is
// no third stage: whatever it returns — ready-for-human-merge or escalated —
// is the run's outcome.
return {
  status: built && built.status === 'ready-for-human-merge' ? 'unattended-pass' : 'unattended',
  gate1: 'decided by a model',
  plan: plan && plan.status,
  built,
};
