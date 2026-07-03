---
name: start-review
description: Daily review routine — fetch pending Jira tickets, let user pick which to review, then run pr-review for each. Use when user wants to start a review session.
---

## When to use this skill
When the user says "start review", wants to begin a review session, or wants to go through pending tickets.

## Workflow

### Step 1: Fetch pending tickets
Run the `/tickets` skill to get all Jira tickets labeled `ReadyForReview` with status `In Progress`. Present the list to the user as a numbered table:

| # | Ticket | Summary | Type | Assignee | Priority | Linked PR / Repo |
|---|--------|---------|------|----------|----------|-----------------|

### Step 2: User selects tickets
Ask the user:
> Which tickets would you like to review? (e.g. `1, 3` or `all`)

Wait for the user's response. Parse their selections — they may provide:
- Numbers referencing the table (e.g. `1, 3`)
- Ticket keys directly (e.g. `PROJ-123`)
- `all` to review everything

**Do NOT ask for repo slugs** — these are auto-discovered by the `/tickets` skill via ticket memory or the `jira-dev-status.sh` script.

### Step 3: Review each ticket sequentially
For each selected ticket (in order), run the `/pr-review` workflow with:
- The **ticket key** (e.g. `PROJ-123`)
- The **repo slug(s)** and **PR ID(s)** already discovered in step 1

**Sequential, not parallel** — review one ticket at a time so the user can approve/reject findings before moving to the next.

After each ticket review is posted, confirm completion and move to the next.

### Step 4: Session summary
After all selected tickets are reviewed, present a brief summary:
- How many tickets reviewed
- How many PRs approved vs. changes requested
- Any tickets skipped or with no linked PRs
