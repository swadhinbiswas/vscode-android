use crate::types::{CommandResponse, FileDiff, SyncOperation, SyncStatus};
use diffy::Patch;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use tokio::sync::RwLock;

/// Global sync state
pub struct SyncState {
    pub pending_operations: Vec<SyncOperation>,
    pub is_syncing: bool,
    pub last_sync_time: Option<u64>,
    pub last_error: Option<String>,
    pub connected_codespace: Option<String>,
    pub is_online: bool,
    pub file_checksums: HashMap<String, String>,
    pub remote_checksums: HashMap<String, String>,
}

impl Default for SyncState {
    fn default() -> Self {
        Self {
            pending_operations: Vec::new(),
            is_syncing: false,
            last_sync_time: None,
            last_error: None,
            connected_codespace: None,
            is_online: true,
            file_checksums: HashMap::new(),
            remote_checksums: HashMap::new(),
        }
    }
}

lazy_static::lazy_static! {
    pub static ref SYNC_STATE: Arc<RwLock<SyncState>> = Arc::new(RwLock::new(SyncState::default()));
}

/// Sync a file to the codespace (push)
#[tauri::command]
pub async fn sync_file_to_codespace(
    app: AppHandle,
    path: String,
    content: String,
) -> Result<CommandResponse<()>, String> {
    let checksum = compute_checksum(&content);
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    
    let operation = SyncOperation::Push {
        path: path.clone(),
        content,
        timestamp,
        checksum: checksum.clone(),
    };
    
    // Add to pending operations
    {
        let mut state = SYNC_STATE.write().await;
        state.pending_operations.push(operation);
        state.file_checksums.insert(path, checksum);
    }
    
    // Trigger immediate sync
    process_sync_queue(app).await?;
    
    Ok(CommandResponse::success(()))
}

/// Sync a file from the codespace (pull)
#[tauri::command]
pub async fn sync_file_from_codespace(
    app: AppHandle,
    path: String,
) -> Result<CommandResponse<String>, String> {
    get_remote_file(app, path).await
}

/// Get a remote file from codespace
#[tauri::command]
pub async fn get_remote_file(
    app: AppHandle,
    path: String,
) -> Result<CommandResponse<String>, String> {
    let token = crate::github::get_stored_token(&app).map_err(|e| e.to_string())?;
    
    let state = SYNC_STATE.read().await;
    let codespace_name = state
        .connected_codespace
        .clone()
        .ok_or_else(|| "No codespace connected".to_string())?;
    drop(state);
    
    // Use GitHub API to get file content
    // Note: This is a simplified approach - in production, you'd use the Codespaces API
    let client = reqwest::Client::new();
    let response = client
        .get(format!(
            "https://api.github.com/repos/{}/contents/{}",
            codespace_name, path
        ))
        .header("Accept", "application/vnd.github.v3+json")
        .header("Authorization", format!("{} {}", token.token_type, token.access_token))
        .query(&[("ref", "HEAD")])
        .send()
        .await
        .map_err(|e| format!("Failed to fetch file: {}", e))?;
    
    if !response.status().is_success() {
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(CommandResponse::success(String::new()));
        }
        let error_text = response.text().await.unwrap_or_default();
        return Ok(CommandResponse::error(&format!(
            "GitHub API error: {}",
            error_text
        )));
    }
    
    #[derive(serde::Deserialize)]
    struct FileContent {
        content: String,
        encoding: String,
    }
    
    let file_content: FileContent = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse file content: {}", e))?;
    
    // Decode base64 content
    let decoded = base64::decode(&file_content.content)
        .map_err(|e| format!("Failed to decode content: {}", e))?;
    let content = String::from_utf8(decoded)
        .map_err(|e| format!("Invalid UTF-8: {}", e))?;
    
    Ok(CommandResponse::success(content))
}

/// Push all pending changes
#[tauri::command]
pub async fn push_all_changes(app: AppHandle) -> Result<CommandResponse<u32>, String> {
    let count = process_sync_queue(app.clone()).await?;
    Ok(CommandResponse::success(count))
}

/// Pull all changes from codespace
#[tauri::command]
pub async fn pull_all_changes(app: AppHandle) -> Result<CommandResponse<()>, String> {
    // This would typically poll the codespace for changes
    // For now, we'll just mark as synced
    let mut state = SYNC_STATE.write().await;
    state.last_sync_time = Some(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    );
    drop(state);
    
    Ok(CommandResponse::success(()))
}

/// Get current sync status
#[tauri::command]
pub async fn get_sync_status() -> Result<CommandResponse<SyncStatus>, String> {
    let state = SYNC_STATE.read().await;
    Ok(CommandResponse::success(SyncStatus {
        is_syncing: state.is_syncing,
        pending_operations: state.pending_operations.len() as u32,
        last_sync_time: state.last_sync_time,
        last_error: state.last_error.clone(),
        connected_codespace: state.connected_codespace.clone(),
        is_online: state.is_online,
    }))
}

/// Clear the sync queue
#[tauri::command]
pub async fn clear_sync_queue() -> Result<CommandResponse<()>, String> {
    let mut state = SYNC_STATE.write().await;
    state.pending_operations.clear();
    Ok(CommandResponse::success(()))
}

/// Process the sync queue
async fn process_sync_queue(app: AppHandle) -> Result<u32, String> {
    let mut state = SYNC_STATE.write().await;
    
    if state.is_syncing || state.pending_operations.is_empty() {
        return Ok(0);
    }
    
    state.is_syncing = true;
    let operations: Vec<SyncOperation> = state.pending_operations.drain(..).collect();
    let count = operations.len() as u32;
    drop(state);
    
    let token = match crate::github::get_stored_token(&app) {
        Ok(t) => t,
        Err(e) => {
            let mut state = SYNC_STATE.write().await;
            state.is_syncing = false;
            state.last_error = Some(e.clone());
            return Err(e);
        }
    };
    
    // Process each operation
    for operation in operations {
        if let Err(e) = process_operation(&token, operation).await {
            let mut state = SYNC_STATE.write().await;
            state.last_error = Some(e.clone());
            state.is_syncing = false;
            return Err(e);
        }
    }
    
    let mut state = SYNC_STATE.write().await;
    state.is_syncing = false;
    state.last_sync_time = Some(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    );
    
    Ok(count)
}

/// Process a single sync operation
async fn process_operation(token: &crate::types::TokenData, operation: SyncOperation) -> Result<(), String> {
    match operation {
        SyncOperation::Push {
            path,
            content,
            timestamp: _,
            checksum: _,
        } => {
            // Push file to codespace via GitHub API or WebSocket
            push_file_to_codespace(token, &path, &content).await?;
        }
        SyncOperation::Pull {
            path,
            remote_checksum,
        } => {
            // Pull file from codespace
            let _ = remote_checksum; // Use for conflict detection
            // Implementation would fetch and apply
        }
        SyncOperation::Delete { path, timestamp: _ } => {
            // Delete file from codespace
            let _ = path; // Implementation would delete
        }
    }
    Ok(())
}

/// Push a file to codespace
async fn push_file_to_codespace(
    token: &crate::types::TokenData,
    path: &str,
    content: &str,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    
    // Encode content as base64
    let encoded = base64::encode(content);
    
    #[derive(serde::Serialize)]
    struct UpdateFileRequest {
        message: String,
        content: String,
        branch: String,
    }
    
    let body = UpdateFileRequest {
        message: format!("Sync from VSCode Android: {}", path),
        content: encoded,
        branch: "main".to_string(), // Should get from codespace
    };
    
    let response = client
        .put(format!(
            "https://api.github.com/repos/{}/contents/{}",
            token.scope, path // Simplified - should use actual repo
        ))
        .header("Accept", "application/vnd.github.v3+json")
        .header("Authorization", format!("{} {}", token.token_type, token.access_token))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to push file: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error: {}", error_text));
    }
    
    Ok(())
}

/// Compute checksum for content
fn compute_checksum(content: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

/// Generate diff between two strings
pub fn generate_diff(original: &str, modified: &str) -> Result<FileDiff, String> {
    let patches = diffy::create_patch(original, modified);
    let diff_str = patches.to_string();
    
    Ok(FileDiff {
        path: String::new(),
        original_content: original.to_string(),
        modified_content: modified.to_string(),
        diff_patches: vec![diff_str],
    })
}

/// Apply diff patches
pub fn apply_diff(original: &str, patch_str: &str) -> Result<String, String> {
    let patch = Patch::from_str(patch_str)
        .map_err(|e| format!("Failed to parse patch: {}", e))?;
    
    let result = diffy::apply(original, &patch)
        .map_err(|e| format!("Failed to apply patch: {}", e))?;
    
    Ok(result)
}

/// Start the background sync worker
pub fn start_sync_worker(app: AppHandle) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(2));
        
        loop {
            interval.tick().await;
            
            // Check for pending operations
            {
                let state = SYNC_STATE.read().await;
                if !state.pending_operations.is_empty() && !state.is_syncing {
                    drop(state);
                    let _ = process_sync_queue(app.clone()).await;
                }
            }
            
            // Check online status
            let is_online = check_network_connectivity().await;
            {
                let mut state = SYNC_STATE.write().await;
                state.is_online = is_online;
            }
        }
    });
}

/// Check network connectivity
async fn check_network_connectivity() -> bool {
    let client = reqwest::Client::new();
    match client.get("https://api.github.com").send().await {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}
