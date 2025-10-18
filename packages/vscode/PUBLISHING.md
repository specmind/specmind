# Publishing SpecMind VS Code Extension

This guide explains how to publish the SpecMind VS Code extension to the Visual Studio Code Marketplace.

## Prerequisites

- [x] Publisher account created: **SpecMind**
- [x] LICENSE file created
- [x] CHANGELOG.md created
- [x] package.json metadata updated
- [ ] Extension icon (optional but recommended)

## Before Publishing

### 1. Update Version Number

Update the version in `package.json` following [semantic versioning](https://semver.org/):
- **0.1.0** - Initial release (current)
- **0.1.1** - Patch release (bug fixes)
- **0.2.0** - Minor release (new features)
- **1.0.0** - Major release (stable)

### 2. Update CHANGELOG.md

Add release notes for the new version in `CHANGELOG.md`.

### 3. Build and Test

```bash
# Build the extension
pnpm build

# Test locally by pressing F5 in VS Code
# Open the extension development host and verify:
# - .sm files have syntax highlighting
# - Preview works correctly
# - Commands are accessible
# - No console errors
```

### 4. Create Personal Access Token (PAT)

1. Go to https://dev.azure.com/
2. Click on your profile → **Personal access tokens**
3. Click **New Token**
4. Settings:
   - **Name**: VS Code Extension Publishing
   - **Organization**: All accessible organizations
   - **Expiration**: Custom (1 year recommended)
   - **Scopes**: Click "Show all scopes" → Select **Marketplace** → Check **Manage**
5. Click **Create** and **copy the token** (you won't see it again!)

### 5. Login to vsce

```bash
# Install vsce globally (if not already installed)
npm install -g @vscode/vsce

# Login with your publisher
vsce login SpecMind

# Paste your Personal Access Token when prompted
```

## Publishing

### First Time Publishing

```bash
# Navigate to the extension directory
cd packages/vscode

# Package the extension (creates .vsix file)
pnpm package

# This creates: specmind-vscode-0.1.0.vsix

# Publish to marketplace
vsce publish
```

### Updating an Existing Extension

```bash
# Option 1: Automatically increment version and publish
vsce publish patch  # 0.1.0 → 0.1.1
vsce publish minor  # 0.1.0 → 0.2.0
vsce publish major  # 0.1.0 → 1.0.0

# Option 2: Manually update package.json version, then:
vsce publish
```

## Testing the Published Extension

1. Wait 5-10 minutes for the extension to be available
2. Search for "SpecMind" in VS Code Extensions marketplace
3. Install and test
4. Or install directly: `ext install SpecMind.specmind-vscode`

## Local Installation (.vsix)

To test the packaged extension locally:

```bash
# Package without publishing
pnpm package

# Install in VS Code
code --install-extension specmind-vscode-0.1.0.vsix
```

## Unpublishing

⚠️ **Warning**: Unpublishing removes the extension for all users!

```bash
# Unpublish a specific version
vsce unpublish SpecMind.specmind-vscode@0.1.0

# Unpublish all versions
vsce unpublish SpecMind.specmind-vscode
```

## Troubleshooting

### "Publisher not found"
- Verify publisher name in package.json matches your marketplace publisher ID
- Make sure you're logged in: `vsce login SpecMind`

### "Missing README.md"
- README.md must exist in packages/vscode/

### "Missing LICENSE"
- LICENSE file must exist in packages/vscode/

### "Extension size too large"
- Ensure `dist/` folder only contains built files
- Check `.vscodeignore` to exclude unnecessary files

### Authentication Issues
- Generate a new Personal Access Token
- Make sure the token has **Marketplace > Manage** scope
- Token must be for "All accessible organizations"

## Publishing Checklist

Before each release:

- [ ] All tests pass
- [ ] Extension works in development mode (F5)
- [ ] Version number updated in package.json
- [ ] CHANGELOG.md updated with release notes
- [ ] README.md reflects current features
- [ ] No debug console.log statements
- [ ] Build succeeds: `pnpm build`
- [ ] Package succeeds: `pnpm package`
- [ ] Logged into vsce: `vsce login SpecMind`
- [ ] Published: `vsce publish`

## Useful Commands

```bash
# Check if you're logged in
vsce ls-publishers

# Show extension info
vsce show SpecMind.specmind-vscode

# Package without publishing
vsce package

# Verify package contents
unzip -l specmind-vscode-0.1.0.vsix
```

## Resources

- [VS Code Extension Publishing Docs](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Marketplace Management Portal](https://marketplace.visualstudio.com/manage/publishers/SpecMind)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
