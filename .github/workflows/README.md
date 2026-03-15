# Workflows

This directory contains GitHub Actions workflows for automated builds and testing.

## Available Workflows

### `ci-cd.yml` - Main CI/CD Pipeline

**Triggers:**
- Push to `main` or `master`
- Pull requests
- Manual dispatch with build type selection

**Jobs:**
1. **Lint & Test** - Fast feedback on code quality
2. **Build Android Debug APK** - Debug build for testing
3. **Build Android Release AAB** - Release build (main branch only)
4. **E2E Tests** - End-to-end testing
5. **Create GitHub Release** - Auto-release on tags

### `quick-build.yml` - Manual Build Trigger

**Triggers:**
- Manual dispatch only

**Use case:** Quick builds for testing without pushing code

**Options:**
- Build type: debug / release
- Upload artifact: yes / no

## Usage

### Automatic Build on Push

```bash
git push origin main
```

The CI/CD pipeline will automatically:
1. Run tests
2. Build debug APK
3. Upload artifacts

### Manual Build

1. Go to **Actions** tab
2. Select **Quick Build (Manual Trigger)**
3. Click **Run workflow**
4. Choose options
5. Download APK from artifacts

## Artifacts

Build artifacts are available for 14 days:

| Artifact Name | Type | Retention |
|--------------|------|-----------|
| `vscode-android-debug-apk` | Debug APK | 14 days |
| `vscode-android-release-apk` | Release APK | 14 days |
| `vscode-android-release-aab` | Release AAB | 14 days |
| `test-results` | Test reports | 7 days |
| `e2e-results` | E2E reports | 7 days |

## Build Configuration

### Android SDK Versions

- **Compile SDK:** 34
- **Target SDK:** 34
- **Min SDK:** 24
- **NDK:** 25.2.9519653
- **Build Tools:** 34.0.0

### Rust Toolchain

- **Channel:** stable
- **Targets:** 
  - aarch64-linux-android
  - armv7-linux-androideabi
  - i686-linux-android
  - x86_64-linux-android

### Node.js

- **Version:** 18
- **Package Manager:** npm

## Timeouts

| Job | Timeout |
|-----|---------|
| Lint & Test | 30 min |
| Build Debug | 60 min |
| Build Release | 90 min |
| E2E Tests | 30 min |

## Caching

The workflows cache:
- npm packages
- Cargo dependencies
- Android SDK components

This reduces build times by 40-60%.

## Secrets Required

For release builds with signing:

```bash
# Add these in GitHub Settings → Secrets
gh secret set KEYSTORE_PATH
gh secret set KEYSTORE_PASSWORD
gh secret set KEY_PASSWORD
gh secret set KEY_ALIAS
```

## Monitoring

### Build Status Badges

Add to README.md:

```markdown
![CI/CD](https://github.com/USER/REPO/actions/workflows/ci-cd.yml/badge.svg)
![Quick Build](https://github.com/USER/REPO/actions/workflows/quick-build.yml/badge.svg)
```

### Build History

View all builds: **Actions** tab → Select workflow → See run history

## Cost Optimization

Free tier: 2,000 minutes/month

**Tips:**
- Use manual builds for testing
- Cancel redundant builds
- Optimize build scripts
- Use self-hosted runners for heavy usage

## Self-Hosted Runners

For faster builds and cost savings:

```bash
# On your machine
cd ~
mkdir actions-runner && cd actions-runner
curl -O -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
./config.sh --url https://github.com/USER/REPO --token TOKEN
./run.sh
```

## Troubleshooting

### Common Issues

1. **Build fails immediately**
   - Check repository permissions
   - Verify Actions are enabled

2. **Timeout errors**
   - Increase timeout-minutes
   - Check for infinite loops in scripts

3. **Artifact download fails**
   - Check retention period
   - Verify workflow completed successfully

### Getting Help

- [GitHub Actions Docs](https://docs.github.com/actions)
- [Tauri Discord](https://discord.com/invite/tauri)
- [GitHub Community](https://github.community/)
