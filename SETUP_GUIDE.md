# Setup Guide for VSCode Android

This guide walks you through setting up the development environment for VSCode Android.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [GitHub OAuth Setup](#github-oauth-setup)
4. [Android Studio Configuration](#android-studio-configuration)
5. [Building for Android](#building-for-android)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### 1. Install Rust

```bash
# Linux/macOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Verify installation
rustc --version  # Should be 1.70+
cargo --version
```

### 2. Install Node.js

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify
node --version  # Should be 18+
npm --version
```

### 3. Install Android Studio

1. Download from https://developer.android.com/studio
2. Install and open Android Studio
3. Open SDK Manager (Tools → SDK Manager)
4. Install:
   - Android SDK Platform 34
   - Android SDK Build-Tools 34.0.0
   - Android NDK (Side by Side) 25.2.9519653
   - CMake
   - Android SDK Command-line Tools

5. Set environment variables:

```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/bin
```

### 4. Install Tauri CLI

```bash
cargo install tauri-cli
```

### 5. Install Java JDK

```bash
# Ubuntu/Debian
sudo apt install openjdk-17-jdk

# macOS
brew install openjdk@17

# Verify
java -version  # Should be 17+
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/vscode-android.git
cd vscode-android
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the project root:

```bash
# .env
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
```

## GitHub OAuth Setup

### 1. Create OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: VSCode Android
   - **Homepage URL**: `https://github.com/your-org/vscode-android`
   - **Authorization callback URL**: `vscode-android://oauth/callback`
4. Click "Register application"

### 2. Get Credentials

1. After registration, copy the **Client ID**
2. Click "Generate a new client secret" and copy it
3. Add these to your `.env` file

### 3. Update Source Code

Edit `src-tauri/src/github.rs`:

```rust
const GITHUB_CLIENT_ID: &str = "YOUR_CLIENT_ID";
```

## Android Studio Configuration

### 1. Open Project in Android Studio

```bash
# Generate Android project
cd vscode-android
cargo tauri android init

# Open in Android Studio
studio src-tauri/gen/android/
```

### 2. Configure Gradle

Edit `src-tauri/gen/android/build.gradle`:

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.0'
    }
}
```

### 3. Set Up Emulator (Optional)

1. Open AVD Manager (Tools → AVD Manager)
2. Click "Create Virtual Device"
3. Select a device (e.g., Pixel 6)
4. Download and select system image (API 34)
5. Finish setup

## Building for Android

### Development Build

```bash
# Run on connected device/emulator
npm run tauri:android:dev

# Or using cargo directly
cargo tauri android dev
```

### Production APK

```bash
# Build debug APK
npm run tauri:android:apk

# Build release APK (requires signing)
cargo tauri android build --release
```

### AAB for Play Store

```bash
npm run tauri:android:aab
```

### Signing Configuration

1. Generate keystore:

```bash
keytool -genkey -v -keystore vscode-android.keystore -alias vscode-android -keyalg RSA -keysize 2048 -validity 10000
```

2. Create `keystore.properties`:

```properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=vscode-android
storeFile=/path/to/vscode-android.keystore
```

3. Update `tauri.conf.json`:

```json
{
  "bundle": {
    "android": {
      "keystorePath": "/path/to/vscode-android.keystore",
      "keystorePassword": "your_store_password",
      "keyPassword": "your_key_password",
      "keyAlias": "vscode-android"
    }
  }
}
```

## Testing

### Unit Tests

```bash
npm run test
npm run test:ui  # With UI
```

### E2E Tests

```bash
# Install Playwright browsers
npx playwright install

# Run tests
npm run test:e2e
```

### On Device Testing

1. Enable USB debugging on Android device
2. Connect via USB
3. Run: `npm run tauri:android:dev`

## Troubleshooting

### Common Issues

#### 1. Rust Compilation Errors

```bash
# Clean and rebuild
cd src-tauri
cargo clean
cargo build
```

#### 2. Gradle Sync Failed

```bash
# Invalidate caches
File → Invalidate Caches / Restart

# Or clean gradle
./gradlew clean
```

#### 3. NDK Not Found

```bash
# Verify NDK path
echo $ANDROID_NDK_HOME

# Should point to: $ANDROID_HOME/ndk/<version>
```

#### 4. Port Already in Use

```bash
# Kill process on port 1420
lsof -ti:1420 | xargs kill -9

# Or change port in vite.config.ts
```

#### 5. OAuth Callback Not Working

- Ensure custom URL scheme is registered
- Check AndroidManifest.xml for intent-filter
- Verify callback URL matches exactly

#### 6. Build Too Large

```bash
# Enable ProGuard/R8
# Edit src-tauri/gen/android/app/build.gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

### Debug Mode

```bash
# Enable debug logging
export RUST_LOG=debug
export TAURI_DEBUG=true

# Run with verbose output
cargo tauri android dev --verbose
```

### Performance Profiling

```bash
# Enable React DevTools
npm install -g react-devtools

# Run profiler
react-devtools

# Android Profiler in Android Studio
```

## Next Steps

1. ✅ Run the app in development
2. ✅ Test GitHub OAuth flow
3. ✅ Connect to a Codespace
4. ✅ Test file editing and sync
5. ✅ Build production APK

## Additional Resources

- [Tauri Documentation](https://tauri.app/v2/)
- [Android Developer Guide](https://developer.android.com/guide)
- [GitHub Codespaces API](https://docs.github.com/en/rest/codespaces)
- [Monaco Editor Docs](https://microsoft.github.io/monaco-editor/)

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/vscode-android/issues
- Discussions: https://github.com/your-org/vscode-android/discussions
