# Publishing Guide

This guide explains how to publish SpecMind packages to npm and extension marketplaces.

## npm Publishing

### Prerequisites

1. **npm Account**: Create account at https://www.npmjs.com/
2. **npm Token**: Generate automation token and add as `NPM_TOKEN` GitHub secret
3. **Publish Access**: Verify you have publish access to the `@specmind` scope

### Version Management

**IMPORTANT**: You must manually update package versions before publishing.

#### Easy Way - Using the Version Bump Script:

```bash
# Bump all packages to the same version
./scripts/bump-version.sh 0.1.4
```

This automatically updates version in all package.json files.

#### Manual Way:

Update `version` field in these files:
- `packages/format/package.json`
- `packages/core/package.json`
- `packages/cli/package.json`
- `packages/vscode/package.json`

## Publishing Process

### Automated Publishing (Recommended)

The repository includes GitHub Actions workflow for automated publishing:

```bash
# 1. Bump version in all packages
./scripts/bump-version.sh 0.1.4

# 2. Review and commit changes
git diff
git add .
git commit -m "Bump version to 0.1.4"

# 3. Create and push tag
git tag v0.1.4
git push && git push --tags
```

GitHub Actions will automatically:
- Run tests
- Build all packages
- Publish to npm (requires `NPM_TOKEN` secret)

### Manual Publishing

If you need to publish manually:

```bash
# Build all packages first
pnpm install
pnpm build

# Publish all packages at once
pnpm -r publish --access public
```

This will:
1. Convert `workspace:^` dependencies to actual version numbers
2. Publish packages in the correct order (dependencies first)

### Publish Individual Packages

If you need to publish a single package:

```bash
# Navigate to package directory
cd packages/cli

# Publish (will automatically build via prepublishOnly)
pnpm publish
```

### Publishing Order (if publishing individually)

If you must publish packages individually, follow this order:

1. **@specmind/format** (no dependencies)
2. **@specmind/core** (depends on format)
3. **specmind** (CLI - depends on core and format)
4. **specmind-vscode** (depends on format)

## Version Management

### Current Approach: Manual Versioning

Currently, versions are managed manually. When releasing a new version:

1. Update version in all `package.json` files:
   - `packages/format/package.json`
   - `packages/core/package.json`
   - `packages/cli/package.json`
   - `packages/vscode/package.json`

2. Commit the version changes:
   ```bash
   git add packages/*/package.json
   git commit -m "chore: bump all packages to version X.Y.Z"
   ```

3. Create a git tag:
   ```bash
   git tag vX.Y.Z
   git push origin main --tags
   ```

4. Publish all packages:
   ```bash
   pnpm -r publish
   ```

### Future: Automated with Changesets (Recommended)

Consider adding [changesets](https://github.com/changesets/changesets) for automated version management:

```bash
# Install changesets
pnpm add -Dw @changesets/cli
pnpm changeset init

# Create a changeset when making changes
pnpm changeset

# Bump versions based on changesets
pnpm changeset version

# Publish with changelog generation
pnpm changeset publish
```

## Workspace Dependencies

The packages use `workspace:^` protocol in development:

```json
"dependencies": {
  "@specmind/core": "workspace:^"
}
```

**This is correct!** When you run `pnpm publish`, it automatically converts these to actual version numbers:

```json
"dependencies": {
  "@specmind/core": "^0.1.3"
}
```

## Verification After Publishing

1. **Check npm registry:**
   ```bash
   npm view specmind
   npm view @specmind/core
   npm view @specmind/format
   ```

2. **Test installation:**
   ```bash
   # In a test directory
   npx specmind@latest setup claude-code
   ```

3. **Verify versions align:**
   ```bash
   npm view specmind dependencies
   # Should show @specmind/core and @specmind/format with matching versions
   ```

## Troubleshooting

### "workspace:^" appears in published package

- **Cause:** You used `npm publish` instead of `pnpm publish`
- **Solution:** Always use `pnpm publish` or `pnpm -r publish`

### Build artifacts missing

- **Cause:** Build didn't run before publish
- **Solution:** The `prepublishOnly` script should handle this automatically. If not, manually run `pnpm build` first.

### Wrong version dependencies

- **Cause:** Versions not updated consistently across all packages
- **Solution:** Ensure all internal dependencies reference the same version. Use search/replace to update all at once.

## Publishing Checklist

- [ ] All tests pass (`pnpm test`)
- [ ] All packages build successfully (`pnpm build`)
- [ ] Version numbers updated in all package.json files
- [ ] CHANGELOG.md updated (if applicable)
- [ ] Git changes committed
- [ ] Git tag created
- [ ] Logged into npm (`npm whoami`)
- [ ] Published via `pnpm -r publish`
- [ ] Verified on npm registry
- [ ] Tested installation with `npx`
- [ ] Git tags pushed to GitHub

## Current Version

**0.1.3** - Published 2025-10-20

### What's Included in 0.1.3

- Fixed `npx specmind setup claude-code` to include assistants folder
- Assistants folder now properly bundled in CLI package
- Build script copies assistants before compilation
- All packages updated to use `workspace:^` for development
