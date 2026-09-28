# Node: <name>

| Field        | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| Role         | One sentence. What this node is for.                           |
| Inputs       | Artifacts it reads (paths). Nothing else.                      |
| Outputs      | Artifacts it writes (paths). Nothing else.                     |
| Tools        | The minimum set. Restriction is the boundary, not the prompt.  |
| Model        | haiku / sonnet / opus — and why.                               |
| Completion   | Observable conditions. Not "when done".                        |
| Failure      | Conditions under which it must STOP and report, not improvise. |
| Max attempts | Integer. The loop must be bounded.                             |
| Human gate   | before / after / none                                          |
