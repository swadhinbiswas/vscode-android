# Known Issues and Solutions

This document covers potential issues you may encounter while developing or using VSCode Android, along with their solutions.

## Table of Contents

1. [Network & Connectivity](#network--connectivity)
2. [Authentication](#authentication)
3. [Build Issues](#build-issues)
4. [Performance](#performance)
5. [Sync Issues](#sync-issues)
6. [Codespaces](#codespaces)
7. [Mobile-Specific](#mobile-specific)

---

## Network & Connectivity

### Issue: Network Latency Causes Sync Delays

**Problem**: High latency between device and GitHub servers causes noticeable sync delays.

**Solutions**:
1. **Implement aggressive debouncing** (already set to 300ms)
2. **Use WebSocket for real-time updates** instead of polling
3. **Enable delta sync** - only send changed portions of files
4. **Implement optimistic UI** - show changes immediately, sync in background

```rust
// In sync.rs - adjust debounce time based on network quality
let debounce_ms = if is_slow_network { 500 } else { 300 };
```

### Issue: Intermittent Connection Loss

**Problem**: Mobile networks are unreliable, causing sync failures.

**Solutions**:
1. **Offline-first architecture** - all edits work locally
2. **Sync queue persistence** - store pending changes in SQLite
3. **Exponential backoff** for retries
4. **Network status indicator** in status bar

```rust
// Retry with exponential backoff
async fn retry_with_backoff<F, T>(operation: F, max_retries: u32) -> Result<T>
where
    F: Fn() -> Future<Output = Result<T>>,
{
    let mut delay = 1000; // 1 second
    for attempt in 0..max_retries {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(_) if attempt < max_retries - 1 => {
                tokio::time::sleep(Duration::from_millis(delay)).await;
                delay *= 2; // Exponential backoff
            }
            Err(e) => return Err(e),
        }
    }
}
```

---

## Authentication

### Issue: OAuth Token Expiration

**Problem**: GitHub OAuth tokens expire, requiring re-authentication.

**Solutions**:
1. **Request no-expiry tokens** with appropriate scopes
2. **Implement token refresh** flow
3. **Store refresh tokens** securely
4. **Graceful re-auth** - don't lose work on token expiry

```rust
// Check token expiry before API calls
fn is_token_valid(token: &TokenData) -> bool {
    if let Some(expires_at) = token.expires_at {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        // Consider token invalid 5 minutes before expiry
        now < expires_at - 300
    } else {
        true // No expiry set
    }
}
```

### Issue: OAuth Scope Insufficient

**Problem**: Missing scopes prevent Codespaces access.

**Required Scopes**:
- `repo` - Full repository access
- `codespace` - Codespaces management
- `workflow` - GitHub Actions (optional)
- `user:email` - User email access

**Solution**: Update OAuth app configuration:

```rust
const GITHUB_SCOPES: &str = "repo,codespace,workflow,user:email";
```

---

## Build Issues

### Issue: Rust Compilation Fails on Windows

**Problem**: Linker errors during Rust compilation.

**Solutions**:
1. Install Visual Studio Build Tools
2. Install Windows SDK
3. Set correct target triple

```bash
# Install MSVC target
rustup target add x86_64-pc-windows-msvc

# Use correct linker
$env:RUSTFLAGS = "-C link-arg=/SUBSYSTEM:WINDOWS"
```

### Issue: Android NDK Version Mismatch

**Problem**: Build fails due to NDK version incompatibility.

**Solution**: Use the exact NDK version specified:

```bash
# In local.properties
ndk.dir=/path/to/ndk/25.2.9519653

# In build.gradle
android.ndkVersion = "25.2.9519653"
```

### Issue: Gradle Build Too Slow

**Problem**: Android builds take too long.

**Solutions**:
1. **Enable Gradle daemon**
2. **Increase heap size**
3. **Use build cache**

```properties
# gradle.properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

---

## Performance

### Issue: Editor Lag on Low-End Devices

**Problem**: Monaco Editor causes frame drops on older devices.

**Solutions**:
1. **Reduce editor features** on low-end devices
2. **Disable minimap** by default
3. **Limit line highlighting**
4. **Use web workers** for heavy operations

```typescript
// Detect device capability
const isLowEndDevice = navigator.hardwareConcurrency <= 4;

const editorOptions = {
  minimap: { enabled: !isLowEndDevice },
  renderWhitespace: isLowEndDevice ? 'none' : 'selection',
  cursorSmoothCaretAnimation: !isLowEndDevice,
};
```

### Issue: Memory Leaks in WebView

**Problem**: Long sessions cause memory growth.

**Solutions**:
1. **Dispose Monaco instances** properly
2. **Clear event listeners** on unmount
3. **Implement memory limits**
4. **Periodic garbage collection**

```typescript
useEffect(() => {
  return () => {
    // Cleanup Monaco editor
    if (editorRef.current) {
      editorRef.current.dispose();
    }
    // Clear references
    editorRef.current = null;
    monacoRef.current = null;
  };
}, []);
```

### Issue: Large File Performance

**Problem**: Files >1MB cause editor slowdown.

**Solutions**:
1. **Virtual scrolling** (enabled by Monaco)
2. **Lazy loading** of file content
3. **Chunked sync** for large files
4. **Warning for very large files**

```rust
// Warn for files > 1MB
const MAX_FILE_SIZE: u64 = 1024 * 1024;

if file_size > MAX_FILE_SIZE {
    return Err("File too large for mobile editing".into());
}
```

---

## Sync Issues

### Issue: Sync Conflicts

**Problem**: Same file edited locally and remotely simultaneously.

**Solutions**:
1. **Last-write-wins** (default)
2. **3-way merge** with base content
3. **Conflict markers** for manual resolution
4. **Version history** for recovery

```rust
// Conflict detection
fn detect_conflict(local: &FileState, remote: &FileState) -> bool {
    // Both modified since last sync
    local.modified_at > local.last_synced_at
        && remote.modified_at > remote.last_synced_at
        // Different content
        && local.checksum != remote.checksum
}
```

### Issue: Sync Queue Overflow

**Problem**: Too many pending changes overwhelm the queue.

**Solutions**:
1. **Batch operations** - combine multiple edits
2. **Queue size limit** - drop oldest if full
3. **Priority queue** - current file first
4. **Compression** for queued content

```rust
// Batch consecutive edits to same file
fn batch_operations(ops: Vec<SyncOperation>) -> Vec<SyncOperation> {
    let mut batches: HashMap<String, SyncOperation> = HashMap::new();
    
    for op in ops {
        if let SyncOperation::Push { path, content, .. } = op {
            // Keep only latest version of each file
            batches.insert(path.clone(), SyncOperation::Push {
                path,
                content,
                timestamp: now(),
                checksum: compute_checksum(&content),
            });
        }
    }
    
    batches.into_values().collect()
}
```

### Issue: Partial Sync Failures

**Problem**: Some files sync, others fail.

**Solutions**:
1. **Per-file error tracking**
2. **Retry failed files** separately
3. **User notification** with details
4. **Manual retry** option

---

## Codespaces

### Issue: Codespace Startup Timeout

**Problem**: Codespaces take too long to start.

**Solutions**:
1. **Increase timeout** (default: 60s)
2. **Show progress** during startup
3. **Background start** - browse while waiting
4. **Use faster machine** types

```typescript
// Poll with progress
const waitForCodespace = async (name: string) => {
  const startTime = Date.now();
  const timeout = 120000; // 2 minutes
  
  while (Date.now() - startTime < timeout) {
    const status = await getCodespaceStatus(name);
    
    if (status.state === 'available') {
      return status;
    }
    
    // Update progress
    const progress = ((Date.now() - startTime) / timeout) * 100;
    updateProgress(progress);
    
    await sleep(2000);
  }
  
  throw new Error('Startup timeout');
};
```

### Issue: Codespace Port Forwarding

**Problem**: Can't access forwarded ports from mobile.

**Solutions**:
1. **Use public port** option
2. **Configure CORS** for web apps
3. **WebSocket proxy** for real-time apps
4. **HTTPS requirement** for mobile

### Issue: Codespace Idle Timeout

**Problem**: Codespaces shut down after inactivity.

**Solutions**:
1. **Keep-alive ping** every 5 minutes
2. **User warning** before shutdown
3. **Auto-reconnect** on reconnect
4. **Increase idle timeout** in settings

```rust
// Keep-alive for Codespace
async fn keep_alive(codespace_id: &str) {
    let mut interval = interval(Duration::from_secs(300));
    
    loop {
        interval.tick().await;
        // Send keep-alive request
        let _ = ping_codespace(codespace_id).await;
    }
}
```

---

## Mobile-Specific

### Issue: Soft Keyboard Covers Editor

**Problem**: On-screen keyboard hides the code being typed.

**Solutions**:
1. **Scroll to cursor** on focus
2. **Adjust viewport** on keyboard show
3. **Floating cursor** indicator
4. **External keyboard** support

```typescript
// Scroll to cursor when keyboard appears
editor.onDidChangeCursorPosition((e) => {
  const cursorPosition = editor.getPosition();
  editor.revealPositionInCenter(cursorPosition);
});
```

### Issue: Touch Target Too Small

**Problem**: UI elements hard to tap on mobile.

**Solutions**:
1. **Minimum 48dp** touch targets
2. **Increase padding** on mobile
3. **Touch-friendly icons**
4. **Gesture alternatives** to small buttons

```css
/* Mobile touch targets */
@media (pointer: coarse) {
  button, .icon-button {
    min-width: 48px;
    min-height: 48px;
    padding: 12px;
  }
}
```

### Issue: Orientation Changes

**Problem**: Layout breaks on rotation.

**Solutions**:
1. **Responsive breakpoints**
2. **State preservation** on rotate
3. **Editor state** restore
4. **Lock orientation** option

```typescript
// Preserve state on orientation change
useEffect(() => {
  const saveState = () => {
    localStorage.setItem('editor_state', JSON.stringify({
      openFiles,
      activeFile,
      cursorPosition,
      scrollPosition,
    }));
  };
  
  window.addEventListener('beforeunload', saveState);
  return () => window.removeEventListener('beforeunload', saveState);
}, [openFiles, activeFile]);
```

### Issue: Battery Drain

**Problem**: App drains battery quickly.

**Solutions**:
1. **Reduce polling** frequency
2. **Pause sync** in background
3. **Dark theme** for OLED screens
4. **Throttle animations**

```rust
// Reduce background activity
if app_state == Background {
    sync_interval = Duration::from_secs(30); // Instead of 5s
}
```

---

## Debugging Tips

### Enable Verbose Logging

```bash
# Rust backend
export RUST_LOG=debug

# Frontend
localStorage.setItem('debug', 'vscode-android:*');
```

### Network Inspection

```bash
# Use Chrome DevTools for WebView
adb shell dumpsys window | grep -i mCurrentFocus
adb forward tcp:9222 localabstract:chrome_devtools_remote
# Open chrome://inspect in desktop Chrome
```

### Performance Profiling

```bash
# Android Systrace
python $ANDROID_HOME/platform-tools/systrace/systrace.py -o trace.html

# React DevTools
npm install -g react-devtools
react-devtools
```

---

## Getting Help

If you encounter issues not covered here:

1. **Check existing issues**: https://github.com/your-org/vscode-android/issues
2. **Search discussions**: https://github.com/your-org/vscode-android/discussions
3. **Create new issue** with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Device/OS version
   - Logs and screenshots
