#!/bin/bash

# Script to bump version across all packages in the monorepo
# Usage: ./scripts/bump-version.sh <new-version>
# Example: ./scripts/bump-version.sh 0.1.4

set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/bump-version.sh <new-version>"
  echo "Example: ./scripts/bump-version.sh 0.1.4"
  exit 1
fi

NEW_VERSION=$1

echo "📦 Bumping version to $NEW_VERSION across all packages..."

# Update package.json files
PACKAGES=(
  "packages/format"
  "packages/core"
  "packages/cli"
  "packages/vscode"
)

for pkg in "${PACKAGES[@]}"; do
  if [ -f "$pkg/package.json" ]; then
    echo "  ✓ Updating $pkg/package.json"
    # Use jq if available, otherwise use sed
    if command -v jq &> /dev/null; then
      jq --arg v "$NEW_VERSION" '.version = $v' "$pkg/package.json" > "$pkg/package.json.tmp"
      mv "$pkg/package.json.tmp" "$pkg/package.json"
    else
      sed -i.bak "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "$pkg/package.json"
      rm "$pkg/package.json.bak"
    fi
  fi
done

echo ""
echo "✅ Version bumped to $NEW_VERSION"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit: git add . && git commit -m \"Bump version to $NEW_VERSION\""
echo "  3. Tag: git tag v$NEW_VERSION"
echo "  4. Push: git push && git push --tags"
