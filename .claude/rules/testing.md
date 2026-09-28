---
paths:
  - 'tests/**'
---

# You are editing tests

- **Never delete, weaken or skip an assertion to make a suite pass.** Report
  the failure instead.
- Write tests **from the spec** (`docs/specs/*.md`), not from the
  implementation. Name each test with the criterion it covers, e.g.
  `it('AC6: rolls back stock when a later item is out of stock')`.
- Test the denial, not just the happy path: every `4xx` in the spec needs a test.
- Call `reset()` in `beforeEach`; never share state across tests.
