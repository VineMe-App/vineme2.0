#!/usr/bin/env bash
set -euo pipefail

# Configure GitHub merge settings and repository rulesets on dev and main.
# Ruleset definitions live in .github/rulesets/{dev,main}-branch-ruleset.json
# and can also be imported directly in GitHub Settings -> Rules -> Rulesets.
#
# Usage:
#   ./scripts/setup-branch-protection.sh

OWNER="VineMe-App"
REPO="vineme2.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is not installed." >&2
  exit 1
fi

# Ensure gh has a working token; fall back to git credential helper if default gh auth is expired.
if ! gh auth status >/dev/null 2>&1 && [[ -z "${GH_TOKEN:-}" ]]; then
  GIT_PW="$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p' || true)"
  if [[ -n "$GIT_PW" ]]; then
    export GH_TOKEN="$GIT_PW"
  fi
fi

if ! gh api "repos/${OWNER}/${REPO}" >/dev/null 2>&1; then
  echo "Error: Not authenticated to GitHub with access to ${OWNER}/${REPO}." >&2
  echo "Run 'gh auth login -h github.com' and re-run this script." >&2
  exit 1
fi

echo "=== Updating repository merge settings on ${OWNER}/${REPO} ==="
gh api -X PATCH "repos/${OWNER}/${REPO}" \
  -f allow_squash_merge=true \
  -f allow_merge_commit=true \
  -f allow_rebase_merge=false \
  -f delete_branch_on_merge=true \
  -f pull_request_creation_policy=collaborators_only \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY >/dev/null
echo "Updated repository merge and PR settings (squash/merge enabled, rebase disabled, auto-delete head branches, collaborators-only PRs)."

# Remove legacy classic branch protection rules if present so Rulesets are the single source of truth.
for branch in dev main; do
  if gh api "repos/${OWNER}/${REPO}/branches/${branch}/protection" >/dev/null 2>&1; then
    gh api -X DELETE "repos/${OWNER}/${REPO}/branches/${branch}/protection" >/dev/null
    echo "Removed legacy classic branch protection on '${branch}' (replaced by Rulesets)."
  fi
done

upsert_ruleset() {
  local file="$1"
  local name
  name="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).name)" "$file")"

  local existing_id
  existing_id="$(gh api "repos/${OWNER}/${REPO}/rulesets" --jq ".[] | select(.name == \"${name}\") | .id" | head -n 1 || true)"

  if [[ -n "$existing_id" ]]; then
    gh api -X PUT "repos/${OWNER}/${REPO}/rulesets/${existing_id}" --input "$file" >/dev/null
    echo "Updated ruleset '${name}' (id: ${existing_id})."
  else
    local new_id
    new_id="$(gh api -X POST "repos/${OWNER}/${REPO}/rulesets" --input "$file" --jq '.id')"
    echo "Created ruleset '${name}' (id: ${new_id})."
  fi
}

upsert_ruleset "${REPO_ROOT}/.github/rulesets/dev-branch-ruleset.json"
upsert_ruleset "${REPO_ROOT}/.github/rulesets/main-branch-ruleset.json"
upsert_ruleset "${REPO_ROOT}/.github/rulesets/branch-naming-ruleset.json"

echo "=== Active Rulesets on ${OWNER}/${REPO} ==="
gh api "repos/${OWNER}/${REPO}/rulesets" --jq '.[] | {id, name, enforcement, html_url: ._links.html.href}'
