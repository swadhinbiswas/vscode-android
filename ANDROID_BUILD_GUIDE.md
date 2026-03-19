# Android Build Configuration Guide

This guide explains how to configure automated Android builds with proper permissions and keystore signing in GitHub Actions.

## Overview

For Tauri v2 Android builds, configuration is handled differently:
- **Permissions**: Managed via `AndroidManifest.xml` in the generated Android project
- **Keystore**: Configured via GitHub Secrets environment variables

## Automated Build Setup

### 1. Android Permissions

Permissions are automatically configured during the CI/CD build process by the `setup-android-permissions.sh` script. The script:
1. Initializes the Android project if not exists
2. Adds required permissions to `AndroidManifest.xml`

**Default permissions included:**
- `INTERNET` - Network access
- `ACCESS_NETWORK_STATE` - Check network status
- `WRITE_EXTERNAL_STORAGE` - Write to storage
- `READ_EXTERNAL_STORAGE` - Read from storage

**To add more permissions**, edit `scripts/setup-android-permissions.sh` and add to the `PERMISSIONS` array.

### 2. Keystore Configuration (Release Builds)

For signed release builds, configure the following **GitHub Secrets** in your repository:

Go to: **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `TAURI_ANDROID_KEYSTORE_FILE` | Base64-encoded keystore file | `MIIJ...` (long base64 string) |
| `TAURI_ANDROID_KEYSTORE_PASSWORD` | Keystore password | `your_keystore_password` |
| `TAURI_ANDROID_KEYSTORE_KEY_PASSWORD` | Key password | `your_key_password` |
| `TAURI_ANDROID_KEYSTORE_KEY_ALIAS` | Key alias | `your_alias` |

### Creating a Keystore

**Option 1: Generate new keystore**
```bash
keytool -genkey -v -keystore your-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias your_alias
```

**Option 2: Use existing keystore**
If you have an existing keystore, skip to the next section.

### Encoding Keystore for GitHub Secrets

```bash
# Encode keystore to base64
base64 -w 0 your-keystore.jks > keystore-base64.txt

# Copy the contents of keystore-base64.txt and add as TAURI_ANDROID_KEYSTORE_FILE secret
```

**Note:** GitHub secrets have a 64KB limit. If your keystore is larger, consider:
1. Using a smaller key size (2048 instead of 4096)
2. Storing the keystore in a private artifact repository
3. Using GitHub's larger organization-level secrets

## Local Development

### Debug Builds (Unsigned)
```bash
cargo tauri android build --debug --apk
```

### Release Builds (Signed)
```bash
export TAURI_ANDROID_KEYSTORE_PATH="/path/to/keystore.jks"
export TAURI_ANDROID_KEYSTORE_PASSWORD="your_password"
export TAURI_ANDROID_KEYSTORE_KEY_PASSWORD="key_password"
export TAURI_ANDROID_KEYSTORE_KEY_ALIAS="alias"

cargo tauri android build --release
```

## Manual AndroidManifest.xml Editing

If you need to manually edit permissions:

1. Generate the Android project:
   ```bash
   cargo tauri android init
   ```

2. Edit the manifest:
   ```xml
   <!-- src-tauri/gen/android/app/src/main/AndroidManifest.xml -->
   <manifest xmlns:android="http://schemas.android.com/apk/res/android">
       <uses-permission android:name="android.permission.INTERNET" />
       <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
       <!-- Add more permissions as needed -->
   </manifest>
   ```

**Note:** The `gen/android` directory is auto-generated. For persistent changes, consider:
- Modifying the setup script
- Using Tauri's configuration options
- Creating a post-build hook

## Troubleshooting

### Build fails with "Keystore not found"
- Ensure all 4 keystore secrets are set correctly
- Verify the base64 encoding of the keystore file
- Check that the keystore password and alias match

### Permission errors at runtime
- Verify permissions are added to `AndroidManifest.xml`
- Some permissions require runtime requests (Android 6.0+)
- Check LogCat for specific permission denials

### "gen/android directory not found"
- Run `cargo tauri android init` to generate the Android project
- This happens automatically in CI/CD

## CI/CD Workflow

The automated workflow:
1. **Lint & Test** - Fast feedback on code quality
2. **Build Debug APK** - Always runs, creates unsigned debug build
3. **Build Release AAB** - Runs on master branch or manual trigger, creates signed release build (if keystore secrets are configured)
4. **E2E Tests** - Optional testing
5. **GitHub Release** - Creates release on version tags

## Security Best Practices

1. **Never commit keystore files** to the repository
2. **Use GitHub Secrets** for sensitive data
3. **Use separate keystores** for debug and release
4. **Backup your keystore** securely - losing it means you can't update your app
5. **Use strong passwords** for keystore protection
