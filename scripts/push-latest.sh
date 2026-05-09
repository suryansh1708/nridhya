#!/bin/bash
# Stage, commit (if needed), and push to origin. Usage:
#   ./scripts/push-latest.sh "Brief commit message"

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(dirname "$SCRIPT_DIR")"

MSG="${*:-"Update site"}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

git add -A
if git diff --cached --quiet; then
    echo "Nothing to commit."
else
    git commit -m "$MSG"
fi
git push origin "$BRANCH"

echo "Pushed to origin/$BRANCH"
