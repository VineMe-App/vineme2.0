#!/usr/bin/env bash
set -euo pipefail

# Configure GitHub merge settings and branch protection rules on dev and main.
# Usage:
#   ./scripts/setup-branch-protection.sh

OWNER="VineMe-App"
REPO="vineme2.0"

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

echo "=== Inspecting existing merge settings & protections on ${OWNER}/${REPO} ==="
gh api "repos/${OWNER}/${REPO}" --jq '{default_branch, allow_squash_merge, allow_merge_commit, allow_rebase_merge, delete_branch_on_merge}'

echo "=== Updating repository merge settings ==="
gh api -X PATCH "repos/${OWNER}/${REPO}" \
  -f allow_squash_merge=true \
  -f allow_merge_commit=true \
  -f allow_rebase_merge=false \
  -f delete_branch_on_merge=true \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY >/dev/null
echo "Updated repository merge settings (squash for PRs, merge commit for releases, auto-delete head branches)."

apply_branch_protection() {
  local branch="$1"
  local approvals="$2"

  echo "=== Configuring branch protection for '${branch}' (approvals: ${approvals}) ==="
  gh api -X PUT "repos/${OWNER}/${REPO}/branches/${branch}/protection" \
    --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["test (20.x)"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": ${approvals}
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
  echo "Configured branch protection for '${branch}'."
}

apply_branch_protection "dev" 0
apply_branch_protection "main" 1

echo "=== Done! Current protection summary ==="
for branch in dev main; do
  echo "--- ${branch} ---"
  gh api "repos/${OWNER}/${REPO}/branches/${branch}/protection" --jq '{
    required_status_checks: .required_status_checks.contexts,
    required_approving_review_count: .required_pull_request_reviews.required_approving_review_count,
    dismiss_stale_reviews: .required_pull_request_reviews.dismiss_stale_reviews,
    required_conversation_resolution: .required_conversation_resolution.enabled,
    enforce_admins: .enforce_admins.enabled,
    allow_force_pushes: .allow_force_pushes.enabled,
    allow_deletions: .allow_deletions.enabled
  }'
done
