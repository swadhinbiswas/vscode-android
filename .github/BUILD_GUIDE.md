# GitHub Actions Build Guide

## Overview

This project uses GitHub Actions to automatically build Android APKs on every push. You can trigger builds manually without needing a PC.

## Workflows

### 1. CI/CD Pipeline (Automatic)

**Trigger:** Push to `main` or `master` branch

**What it does:**
- Runs linting and type checking
- Runs unit tests
- Builds debug APK
- Builds release AAB (on main branch)
- Runs E2E tests
- Creates GitHub Release (on tags)

**Artifacts:**
- Debug APK (14 days retention)
- Release AAB/APK (14 days retention)
- Test results (7 days retention)

### 2. Quick Build (Manual)

**Trigger:** Manual trigger from GitHub Actions tab

**How to use:**
1. Go to **Actions** tab in GitHub
2. Click **Quick Build (Manual Trigger)**
3. Click **Run workflow**
4. Select build type (debug/release)
5. Check "Upload artifact"
6. Click **Run workflow**

**Artifacts:**
- APK file (14 days retention)

## How to Download and Install APK

### Step 1: Download from GitHub

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Click on the workflow run (e.g., "Quick Build #1")
4. Scroll down to **Artifacts** section
5. Click on `vscode-android-debug-apk` to download

### Step 2: Install on Android Device

#### Option A: Using ADB (USB)
```bash
# Enable USB debugging on your device
# Connect device via USB
adb install vscode-android-debug.apk
```

#### Option B: Direct Install
1. Transfer APK to your device
2. Open file manager
3. Tap the APK file
4. Allow "Install from unknown sources" if prompted
5. Install

#### Option C: Using QR Code
1. Upload APK to a file hosting service
2. Generate QR code for download link
3. Scan QR code on device
4. Download and install

## Build Configuration

### Required Secrets (for release builds)

For signed release builds, add these secrets in **Settings → Secrets and variables → Actions**:

| Secret Name | Description |
|-------------|-------------|
| `KEYSTORE_PATH` | Path to keystore file |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_PASSWORD` | Key password |
| `KEY_ALIAS` | Key alias |

### Environment Variables

The workflows use these environment variables:
- `ANDROID_HOME`: Android SDK location (auto-set)
- `ANDROID_SDK_ROOT`: Android SDK root (auto-set)
- `CARGO_TERM_COLOR`: Colored output
- `RUST_BACKTRACE`: Debug backtraces

## Troubleshooting

### Build Fails with "SDK not found"

The Android SDK is automatically installed by the workflow. If it fails:
1. Check the workflow logs for SDK installation errors
2. Verify `android.setup-android` action version is correct

### Build Times Out

Android builds can take 30-60 minutes. If it times out:
1. Increase `timeout-minutes` in workflow
2. Use cached dependencies (already configured)

### APK Too Large

To reduce APK size:
1. Enable ProGuard/R8 in build config
2. Use APK splits for different ABIs
3. Remove unused dependencies

## Build Times

| Build Type | Estimated Time |
|------------|---------------|
| Debug APK | 20-40 minutes |
| Release AAB | 30-60 minutes |
| Lint & Test | 5-10 minutes |
| E2E Tests | 10-15 minutes |

## GitHub Actions Minutes Usage

Free tier includes 2,000 minutes/month. Android builds typically use:
- Debug build: ~30 minutes
- Release build: ~45 minutes

**Tip:** Use manual builds for testing to save minutes.

## Customizing Workflows

### Add New Build Variant

Edit `.github/workflows/ci-cd.yml`:

```yaml
- name: Build Custom APK
  run: cargo tauri android build --custom-flag
```

### Change Android SDK Version

Edit the `setup-android` step:

```yaml
with:
  platform-version: 35  # Change from 34
  build-tools-version: 35.0.0
```

### Add Email Notification

```yaml
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      // Send email or Slack notification
```

## Viewing Build Logs

1. Go to **Actions** tab
2. Click on workflow run
3. Click on job name (e.g., "Build Android Debug APK")
4. View real-time logs

## Downloading Artifacts via API

```bash
# Get workflow run ID
RUN_ID=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')

# Download artifact
gh run download $RUN_ID --name vscode-android-debug-apk
```

## Security Notes

- Artifacts are public for public repositories
- Use private repo for sensitive builds
- Artifacts expire after retention period
- Don't commit keystores or secrets

## Support

For issues:
1. Check workflow logs
2. Review GitHub Actions documentation
3. Check Tauri Discord/forums
4. Open GitHub issue
