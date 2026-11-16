#!/usr/bin/env bash
set -euo pipefail

# Clean up merged local/remote branches and optionally archive + delete stale unmerged remote branches.
# Usage:
#   ./scripts/cleanup-branches.sh [--dry-run] [--local] [--remote-merged] [--archive-stale]

REMOTE="origin"
BASE_BRANCH="origin/dev"
STALE_DAYS=90

DRY_RUN=false
DO_LOCAL=false
DO_REMOTE_MERGED=false
DO_ARCHIVE_STALE=false

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --local           Delete local branches already merged into ${BASE_BRANCH}
  --remote-merged   Delete remote branches on ${REMOTE} already merged into ${BASE_BRANCH}
  --archive-stale   Tag unmerged ${REMOTE}/* branches older than ${STALE_DAYS} days as archive/<branch>,
                    push the tags, and delete the remote branches
  --dry-run         Print actions without deleting or pushing anything
  -h, --help        Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --local) DO_LOCAL=true ;;
    --remote-merged) DO_REMOTE_MERGED=true ;;
    --archive-stale) DO_ARCHIVE_STALE=true ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ "$DO_LOCAL" == false && "$DO_REMOTE_MERGED" == false && "$DO_ARCHIVE_STALE" == false ]]; then
  usage
  exit 1
fi

run_cmd() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

CURRENT_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || true)"

if [[ "$DO_REMOTE_MERGED" == true || "$DO_ARCHIVE_STALE" == true ]]; then
  echo "=== Pruning stale remote-tracking refs for ${REMOTE} ==="
  git fetch --prune "$REMOTE"
fi

if [[ "$DO_LOCAL" == true ]]; then
  echo "=== Local branches merged into ${BASE_BRANCH} ==="
  MERGED_LOCAL=()
  while IFS= read -r branch; do
    branch="${branch#"${branch%%[![:space:]]*}"}"
    branch="${branch#\* }"
    [[ -z "$branch" ]] && continue
    case "$branch" in
      dev|main|"$CURRENT_BRANCH") continue ;;
    esac
    MERGED_LOCAL+=("$branch")
  done < <(git branch --merged "$BASE_BRANCH")

  if [[ ${#MERGED_LOCAL[@]} -eq 0 ]]; then
    echo "No merged local branches to delete."
  else
    echo "Deleting ${#MERGED_LOCAL[@]} merged local branches..."
    for branch in "${MERGED_LOCAL[@]}"; do
      # Already verified merged into BASE_BRANCH; -D avoids false positives when a branch's upstream lags behind BASE_BRANCH.
      if git merge-base --is-ancestor "$branch" "$BASE_BRANCH"; then
        run_cmd git branch -D "$branch"
      fi
    done
  fi
fi

if [[ "$DO_REMOTE_MERGED" == true ]]; then
  echo "=== Remote branches on ${REMOTE} merged into ${BASE_BRANCH} ==="
  MERGED_REMOTE=()
  while IFS= read -r ref; do
    ref="${ref#"${ref%%[![:space:]]*}"}"
    [[ -z "$ref" ]] && continue
    [[ "$ref" == *" -> "* ]] && continue
    [[ "$ref" != "${REMOTE}/"* ]] && continue
    branch="${ref#"${REMOTE}/"}"
    case "$branch" in
      HEAD|dev|main|"$CURRENT_BRANCH") continue ;;
    esac
    MERGED_REMOTE+=("$branch")
  done < <(git branch -r --merged "$BASE_BRANCH")

  if [[ ${#MERGED_REMOTE[@]} -eq 0 ]]; then
    echo "No merged remote branches to delete."
  else
    echo "Deleting ${#MERGED_REMOTE[@]} merged remote branches from ${REMOTE}..."
    # Batch deletions in chunks of 25 to avoid command-line limits and speed up pushes
    chunk=()
    for branch in "${MERGED_REMOTE[@]}"; do
      chunk+=(":${branch}")
      if [[ ${#chunk[@]} -ge 25 ]]; then
        run_cmd git push "$REMOTE" "${chunk[@]}"
        chunk=()
      fi
    done
    if [[ ${#chunk[@]} -gt 0 ]]; then
      run_cmd git push "$REMOTE" "${chunk[@]}"
    fi
  fi
fi

if [[ "$DO_ARCHIVE_STALE" == true ]]; then
  echo "=== Unmerged remote branches on ${REMOTE} older than ${STALE_DAYS} days ==="
  CUTOFF_EPOCH=$(( $(date +%s) - STALE_DAYS * 86400 ))
  STALE_BRANCHES=()
  while IFS= read -r ref; do
    ref="${ref#"${ref%%[![:space:]]*}"}"
    [[ -z "$ref" ]] && continue
    [[ "$ref" == *" -> "* ]] && continue
    [[ "$ref" != "${REMOTE}/"* ]] && continue
    branch="${ref#"${REMOTE}/"}"
    case "$branch" in
      HEAD|dev|main|"$CURRENT_BRANCH") continue ;;
    esac
    COMMIT_EPOCH="$(git log -1 --format="%ct" "$ref")"
    if [[ "$COMMIT_EPOCH" -lt "$CUTOFF_EPOCH" ]]; then
      COMMIT_DATE="$(git log -1 --format="%cs" "$ref")"
      echo "  - ${branch} (last commit: ${COMMIT_DATE})"
      STALE_BRANCHES+=("$branch")
    fi
  done < <(git branch -r --no-merged "$BASE_BRANCH")

  if [[ ${#STALE_BRANCHES[@]} -eq 0 ]]; then
    echo "No stale unmerged remote branches found."
  else
    echo "Archiving ${#STALE_BRANCHES[@]} stale remote branches as archive/<branch> tags..."
    TAGS_TO_PUSH=()
    DELETE_REFS=()
    for branch in "${STALE_BRANCHES[@]}"; do
      tag="archive/${branch}"
      run_cmd git tag -f "$tag" "${REMOTE}/${branch}"
      TAGS_TO_PUSH+=("$tag")
      DELETE_REFS+=(":${branch}")
    done
    run_cmd git push "$REMOTE" "${TAGS_TO_PUSH[@]}"
    run_cmd git push "$REMOTE" "${DELETE_REFS[@]}"
  fi
fi
