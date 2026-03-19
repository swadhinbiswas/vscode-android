#!/bin/bash
# Script to configure Android permissions for Tauri Android builds
# This runs before the build in CI/CD

set -e

ANDROID_MANIFEST="src-tauri/gen/android/app/src/main/AndroidManifest.xml"

# Generate Android project if it doesn't exist
if [ ! -d "src-tauri/gen/android" ]; then
    echo "Generating Android project..."
    cargo tauri android init
fi

# Define required permissions
declare -a PERMISSIONS=(
    "INTERNET"
    "ACCESS_NETWORK_STATE"
    "WRITE_EXTERNAL_STORAGE"
    "READ_EXTERNAL_STORAGE"
)

# Add permissions to AndroidManifest.xml if not already present
for permission in "${PERMISSIONS[@]}"; do
    if ! grep -q "android.permission.$permission" "$ANDROID_MANIFEST"; then
        echo "Adding permission: $permission"
        sed -i "/<manifest/a\\    <uses-permission android:name=\"android.permission.$permission\" />" "$ANDROID_MANIFEST"
    fi
done

echo "Android permissions configured successfully!"
