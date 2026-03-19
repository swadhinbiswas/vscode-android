use serde::{Deserialize, Serialize};

/// GitHub user information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubUser {
    pub login: String,
    pub id: u64,
    pub avatar_url: String,
    pub html_url: String,
    pub name: Option<String>,
    pub email: Option<String>,
}

/// GitHub Codespace information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Codespace {
    pub name: String,
    pub id: String,
    pub owner: GitHubUser,
    pub repository: CodespaceRepository,
    pub state: CodespaceState,
    pub created_at: String,
    pub updated_at: String,
    pub dev_container_path: Option<String>,
    pub pending_operation: bool,
    pub pending_operation_disabled_reason: Option<String>,
    pub idle_timeout_minutes: Option<u32>,
    pub max_idle_timeout_minutes: Option<u32>,
    pub machine: CodespaceMachine,
    pub vscode_cli_available: bool,
    pub codespace_region: Option<String>,
    pub git_status: Option<GitStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodespaceRepository {
    pub id: u64,
    pub name: String,
    pub full_name: String,
    pub owner: RepositoryOwner,
    pub html_url: String,
    pub default_branch: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepositoryOwner {
    pub login: String,
    pub id: u64,
    pub avatar_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CodespaceState {
    WaitingForAuth,
    Unknown,
    Creating,
    Available,
    Destroying,
    Deleted,
    Exporting,
    Failed,
    Rebuilding,
    Running,
    Shutdown,
    Starting,
    Stopped,
    Stopping,
    Updating,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodespaceMachine {
    pub name: String,
    pub display_name: String,
    pub operating_system: String,
    pub storage_in_bytes: u64,
    pub memory_in_bytes: u64,
    pub cpus: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub has_uncommitted_changes: bool,
    pub has_unpushed_changes: bool,
    pub has_unpulled_changes: bool,
}

/// Sync operation types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SyncOperation {
    Push {
        path: String,
        content: String,
        timestamp: u64,
        checksum: String,
    },
    Pull {
        path: String,
        remote_checksum: String,
    },
    Delete {
        path: String,
        timestamp: u64,
    },
}

/// Sync status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub is_syncing: bool,
    pub pending_operations: u32,
    pub last_sync_time: Option<u64>,
    pub last_error: Option<String>,
    pub connected_codespace: Option<String>,
    pub is_online: bool,
}

/// File diff for sync
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiff {
    pub path: String,
    pub original_content: String,
    pub modified_content: String,
    pub diff_patches: Vec<String>,
}

/// Editor settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorSettings {
    pub theme: String,
    pub font_size: u32,
    pub font_family: String,
    pub tab_size: u32,
    pub word_wrap: bool,
    pub minimap_enabled: bool,
    pub line_numbers: bool,
    pub auto_save: bool,
    pub auto_save_delay: u32,
}

impl Default for EditorSettings {
    fn default() -> Self {
        Self {
            theme: "vs-dark".to_string(),
            font_size: 14,
            font_family: "Consolas, 'Courier New', monospace".to_string(),
            tab_size: 2,
            word_wrap: true,
            minimap_enabled: false,
            line_numbers: true,
            auto_save: true,
            auto_save_delay: 1000,
        }
    }
}

/// App state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
    pub is_authenticated: bool,
    pub github_user: Option<GitHubUser>,
    pub connected_codespace: Option<Codespace>,
    pub sync_status: SyncStatus,
    pub editor_settings: EditorSettings,
    pub open_files: Vec<String>,
    pub active_file: Option<String>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            is_authenticated: false,
            github_user: None,
            connected_codespace: None,
            sync_status: SyncStatus {
                is_syncing: false,
                pending_operations: 0,
                last_sync_time: None,
                last_error: None,
                connected_codespace: None,
                is_online: true,
            },
            editor_settings: EditorSettings::default(),
            open_files: vec![],
            active_file: None,
        }
    }
}

/// Command response wrapper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> CommandResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.to_string()),
        }
    }
}

/// OAuth callback response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthCallback {
    pub code: String,
    pub state: String,
}

/// Token storage structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenData {
    pub access_token: String,
    pub token_type: String,
    pub scope: String,
    pub expires_at: Option<u64>,
    pub refresh_token: Option<String>,
}

/// Application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub debug_mode: bool,
    pub sync_interval: u64,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            debug_mode: false,
            sync_interval: 5000,
        }
    }
}

/// Get current app state
#[tauri::command]
pub async fn get_app_state() -> Result<CommandResponse<AppState>, String> {
    Ok(CommandResponse::success(AppState::default()))
}

/// Set editor settings
#[tauri::command]
pub async fn set_editor_settings(settings: EditorSettings) -> Result<CommandResponse<()>, String> {
    // In production, persist to store
    Ok(CommandResponse::success(()))
}

/// Set theme
#[tauri::command]
pub async fn set_theme(theme: String) -> Result<CommandResponse<()>, String> {
    // In production, persist to store
    Ok(CommandResponse::success(()))
}
