#!/bin/bash
# Fetches Jira DevStatus (branches, PRs) for a given ticket key.
# Uses JIRA_EMAIL and JIRA_API_TOKEN from .env or local environment variables.
# Usage: ./jira-dev-status.sh TICKET_KEY

set -euo pipefail

TICKET_KEY="${1:?Usage: $0 TICKET_KEY}"

# Check for environment variables
if [[ -z "${JIRA_API_TOKEN:-}" || -z "${JIRA_EMAIL:-}" ]]; then
  # Try loading from .env file in project root.
  # Parse safely: split on the first '=' only, skip comments/blank lines,
  # and export without word-splitting or glob-expanding the value.
  if [[ -f ".env" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      [[ -z "${line//[[:space:]]/}" ]] && continue
      key="${line%%=*}"
      value="${line#*=}"
      key="${key//[[:space:]]/}"
      [[ -z "$key" ]] && continue
      export "$key=$value"
    done < ".env"
  fi
fi

if [[ -z "${JIRA_API_TOKEN:-}" || -z "${JIRA_EMAIL:-}" ]]; then
  echo "Error: JIRA_EMAIL/JIRA_API_TOKEN must be set or defined in .env" >&2
  exit 1
fi

# Retrieve configuration from pr-reviewer.config.json or fall back to a default
JIRA_BASE="https://company.atlassian.net"
if [[ -f "pr-reviewer.config.json" ]]; then
  CONFIG_BASE=$(python3 -c "import sys,json; print(json.load(open('pr-reviewer.config.json')).get('jira', {}).get('baseUrl', ''))" 2>/dev/null || true)
  if [[ -n "$CONFIG_BASE" ]]; then
    JIRA_BASE="$CONFIG_BASE"
  fi
fi

# Step 1: Get numeric issue ID from ticket key
ISSUE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  "${JIRA_BASE}/rest/api/3/issue/${TICKET_KEY}?fields=summary")

HTTP_CODE=$(echo "$ISSUE_RESPONSE" | tail -1)
ISSUE_BODY=$(echo "$ISSUE_RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
  echo "Error: Jira API returned HTTP ${HTTP_CODE} for ${TICKET_KEY}" >&2
  echo "Response: ${ISSUE_BODY}" >&2
  exit 1
fi

ISSUE_ID=$(echo "$ISSUE_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [[ -z "$ISSUE_ID" ]]; then
  echo "Error: Could not resolve issue ID for ${TICKET_KEY}" >&2
  exit 1
fi

# Step 2: Fetch dev-status details
DEVSTATUS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  "${JIRA_BASE}/rest/dev-status/latest/issue/detail?issueId=${ISSUE_ID}&applicationType=bitbucket&dataType=pullrequest" \
  || curl -s -w "\n%{http_code}" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  "${JIRA_BASE}/rest/dev-status/latest/issue/detail?issueId=${ISSUE_ID}&applicationType=github&dataType=pullrequest")

DS_HTTP_CODE=$(echo "$DEVSTATUS_RESPONSE" | tail -1)
DS_BODY=$(echo "$DEVSTATUS_RESPONSE" | sed '$d')

if [[ "$DS_HTTP_CODE" -lt 200 || "$DS_HTTP_CODE" -ge 300 ]]; then
  echo "Error: DevStatus API returned HTTP ${DS_HTTP_CODE}" >&2
  echo "Response: ${DS_BODY}" >&2
  exit 1
fi

echo "$DS_BODY" | python3 -c "
import sys, json

data = json.load(sys.stdin)
details = data.get('detail', [])

for d in details:
    prs = d.get('pullRequests', [])
    branches = d.get('branches', [])

    if prs:
        print('PULL REQUESTS:')
        for pr in prs:
            repo = pr.get('repositoryName', 'unknown')
            slug = repo.split('/')[-1] if '/' in repo else repo
            print(f'  repo={slug}  id={pr[\"id\"]}  status={pr[\"status\"]}  branch={pr[\"source\"][\"branch\"]}  title={pr[\"name\"]}')
        print()

    if branches:
        print('BRANCHES:')
        for b in branches:
            repo = b.get('repository', {}).get('name', 'unknown')
            slug = repo.split('/')[-1] if '/' in repo else repo
            print(f'  repo={slug}  branch={b[\"name\"]}')
        print()

if not any(d.get('pullRequests') or d.get('branches') for d in details):
    print('No PRs or branches linked to this ticket.')
"
