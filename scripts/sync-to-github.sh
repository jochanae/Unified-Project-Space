#!/usr/bin/env bash
# sync-to-github.sh — push local sandbox improvements to jochanae/atlas-idk
#
# Direction: local artifacts/atlas-frontend/src → GitHub atlas-idk/src
#
# Intentionally SKIPPED (Replit-patched — must stay different from GitHub):
#   src/lib/api.ts              (Cloud Run base URL live, relative URL local)
#   src/vite.config.ts          (Replit PORT/BASE_PATH config)
#   vite.config.ts              (same)
#   src/components/UnifiedSubheader.tsx
#
# Usage:
#   bash scripts/sync-to-github.sh             # dry run (shows what would change)
#   bash scripts/sync-to-github.sh --push      # actually push to GitHub
#   bash scripts/sync-to-github.sh --push --file src/pages/home.tsx  # single file

set -e

REPO="jochanae/atlas-idk"
BRANCH="main"
LOCAL_SRC="/home/runner/workspace/artifacts/atlas-frontend/src"
GH_API="https://api.github.com"
DRY_RUN=true
SINGLE_FILE=""
COMMIT_MSG="sync: push local sandbox improvements to atlas-idk"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)   DRY_RUN=false; shift ;;
    --file)   SINGLE_FILE="$2"; shift 2 ;;
    --msg)    COMMIT_MSG="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌  GITHUB_TOKEN is not set. Cannot push to GitHub."
  exit 1
fi

if $DRY_RUN; then
  echo "🔍  DRY RUN — no changes will be pushed (pass --push to apply)"
  echo ""
fi

# Files that must never be pushed (intentionally patched for Replit)
SKIP_PATTERNS=(
  "src/App.tsx"
  "src/lib/install-api-fetch.ts"
  "src/lib/api.ts"
  "vite.config.ts"
  "src/vite.config.ts"
  "src/components/UnifiedSubheader.tsx"
)

should_skip() {
  local relpath="$1"
  for pattern in "${SKIP_PATTERNS[@]}"; do
    if [[ "$relpath" == *"$pattern"* ]]; then
      return 0
    fi
  done
  return 1
}

push_file() {
  local relpath="$1"       # e.g. src/pages/home.tsx
  local abs_local="$LOCAL_SRC/${relpath#src/}"

  if [ ! -f "$abs_local" ]; then
    echo "  ⚠️   LOCAL NOT FOUND: $relpath"
    return
  fi

  # Get current file info from GitHub (SHA needed for updates)
  local gh_response
  gh_response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "$GH_API/repos/$REPO/contents/$relpath?ref=$BRANCH")

  local gh_sha gh_md5 local_md5 local_b64

  gh_sha=$(echo "$gh_response" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if isinstance(d,list): print('')
elif 'sha' in d: print(d['sha'])
else: print('')
" 2>/dev/null)

  # Check if content differs (skip if same)
  if [ -n "$gh_sha" ]; then
    gh_md5=$(echo "$gh_response" | python3 -c "
import sys,json,base64,hashlib
d=json.load(sys.stdin)
if 'content' not in d: print(''); exit()
c=base64.b64decode(d['content'].replace('\n',''))
print(hashlib.md5(c).hexdigest())
" 2>/dev/null)
    local_md5=$(md5sum "$abs_local" | cut -d' ' -f1)

    if [ "$gh_md5" = "$local_md5" ]; then
      echo "  ✓   SAME:   $relpath"
      return
    fi
  fi

  # Encode local file as base64
  local_b64=$(base64 -w 0 "$abs_local")

  if $DRY_RUN; then
    if [ -z "$gh_sha" ]; then
      echo "  +   NEW:    $relpath"
    else
      echo "  ✏️   UPDATE: $relpath"
    fi
    return
  fi

  # Build JSON payload
  local payload
  if [ -n "$gh_sha" ]; then
    payload=$(python3 -c "
import json,sys
print(json.dumps({'message': sys.argv[1], 'content': sys.argv[2], 'sha': sys.argv[3], 'branch': sys.argv[4]}))
" "$COMMIT_MSG" "$local_b64" "$gh_sha" "$BRANCH")
  else
    payload=$(python3 -c "
import json,sys
print(json.dumps({'message': sys.argv[1], 'content': sys.argv[2], 'branch': sys.argv[3]}))
" "$COMMIT_MSG" "$local_b64" "$BRANCH")
  fi

  local result
  result=$(curl -s -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$GH_API/repos/$REPO/contents/$relpath")

  local status
  status=$(echo "$result" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'content' in d: print('OK')
elif 'message' in d: print('ERR: ' + d['message'])
else: print('ERR: unknown')
" 2>/dev/null)

  if [[ "$status" == "OK" ]]; then
    if [ -z "$gh_sha" ]; then
      echo "  ✅  CREATED: $relpath"
    else
      echo "  ✅  PUSHED:  $relpath"
    fi
  else
    echo "  ❌  FAILED:  $relpath — $status"
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────

if [ -n "$SINGLE_FILE" ]; then
  # Single-file mode
  relpath="src/${SINGLE_FILE#src/}"
  if should_skip "$relpath"; then
    echo "⏭   SKIP (Replit-patched): $relpath"
  else
    push_file "$relpath"
  fi
  exit 0
fi

# Full sync — walk all local src files
echo "Comparing local → GitHub ($REPO @ $BRANCH)..."
echo ""

pushed=0; skipped=0; same=0

find "$LOCAL_SRC" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.json" \) | \
  grep -v "node_modules" | \
  grep -v "_workspace" | \
  sort | \
while read -r abs_file; do
  relpath="src/${abs_file#$LOCAL_SRC/}"

  if should_skip "$relpath"; then
    echo "  ⏭   SKIP:   $relpath"
    continue
  fi

  push_file "$relpath"
done

echo ""
if $DRY_RUN; then
  echo "🔍  Dry run complete. Run with --push to apply changes."
  echo "    Example: bash scripts/sync-to-github.sh --push"
else
  echo "✅  Sync complete. Lovable will redeploy automatically from the updated atlas-idk."
fi
