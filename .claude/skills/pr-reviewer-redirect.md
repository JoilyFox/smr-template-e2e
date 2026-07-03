---
name: start-review
description: Start an AI pull request review, list review queue, or check Jira tickets. Use when the user asks to "start review", "review PR", or "what needs review".
---

## Action Plan
All AI PR Reviewer custom skills, agents, configurations, and tools live in the self-contained `./pr-reviewer/` folder to prevent cluttering the root project.

When a review command or session is requested:
1. Load the corresponding custom workflows from the nested directory:
   * **Start Session**: `./pr-reviewer/.claude/skills/start-review/SKILL.md`
   * **Core PR Review**: `./pr-reviewer/.claude/skills/pr-review/SKILL.md`
   * **Jira Tickets List**: `./pr-reviewer/.claude/skills/tickets/SKILL.md`
   * **Ticket Memory**: `./pr-reviewer/.claude/skills/ticket-memory/SKILL.md`
2. Spin up the parallel agents defined in:
   * **Functional Audit**: `./pr-reviewer/.claude/agents/code-review.md`
   * **Security/Performance Audit**: `./pr-reviewer/.claude/agents/risk-review.md`
3. Delegate all details fetching, comment auditing, scoring (1-100), user prompting, and Jira updates to these nested specifications.
