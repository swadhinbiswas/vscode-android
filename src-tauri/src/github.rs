use crate::types::{CommandResponse, GitHubUser, TokenData};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;
use uuid::Uuid;

const GITHUB_CLIENT_ID: &str = "Iv1.8f12a7e0c0e0e0e0"; // Replace with your OAuth app client ID
const GITHUB_CLIENT_SECRET: &str = ""; // Should be set via environment variable
const GITHUB_SCOPES: &str = "repo,codespace,workflow,user:email";

#[derive(Debug, Serialize, Deserialize)]
struct OAuthTokenResponse {
    access_token: String,
    token_type: String,
    scope: String,
    #[serde(default)]
    expires_in: Option<u64>,
    #[serde(default)]
    refresh_token: Option<String>,
}

/// Initiate GitHub OAuth login flow
#[tauri::command]
pub async fn github_login(app: AppHandle) -> Result<CommandResponse<String>, String> {
    let state = Uuid::new_v4().to_string();
    
    // Store state for verification
    app.state::<AppStateContainer>()
        .0
        .lock()
        .unwrap()
        .oauth_state = Some(state.clone());
    
    let auth_url = format!(
        "https://github.com/login/oauth/authorize?client_id={}&scope={}&state={}",
        GITHUB_CLIENT_ID, GITHUB_SCOPES, state
    );
    
    // Return auth URL for the frontend to open
    Ok(CommandResponse::success(auth_url))
}

/// Handle OAuth callback
#[tauri::command]
pub async fn github_callback(
    app: AppHandle,
    code: String,
    state: String,
) -> Result<CommandResponse<TokenData>, String> {
    // Verify state
    let stored_state = app.state::<AppStateContainer>()
        .0
        .lock()
        .unwrap()
        .oauth_state
        .clone();
    
    if stored_state.as_ref() != Some(&state) {
        return Ok(CommandResponse::error("Invalid OAuth state"));
    }
    
    // Exchange code for token
    let client = reqwest::Client::new();
    let token_response = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .form(&[
            ("client_id", GITHUB_CLIENT_ID),
            ("client_secret", get_client_secret()),
            ("code", &code),
            ("state", &state),
        ])
        .send()
        .await
        .map_err(|e| format!("Token exchange failed: {}", e))?;
    
    let token_data: OAuthTokenResponse = token_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;
    
    // Store token securely
    let token_store = TokenData {
        access_token: token_data.access_token,
        token_type: token_data.token_type,
        scope: token_data.scope,
        expires_at: token_data.expires_in.map(|e| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()
                + e
        }),
        refresh_token: token_data.refresh_token,
    };
    
    // Store in secure store
    if let Err(e) = store_token(&app, &token_store) {
        return Ok(CommandResponse::error(&format!("Failed to store token: {}", e)));
    }
    
    // Clear OAuth state
    app.state::<AppStateContainer>()
        .0
        .lock()
        .unwrap()
        .oauth_state = None;
    
    Ok(CommandResponse::success(token_store))
}

/// Get current GitHub user
#[tauri::command]
pub async fn get_github_user(app: AppHandle) -> Result<CommandResponse<GitHubUser>, String> {
    let token = get_stored_token(&app)?;
    
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/user")
        .header("Accept", "application/vnd.github.v3+json")
        .header("Authorization", format!("{} {}", token.token_type, token.access_token))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch user: {}", e))?;
    
    if !response.status().is_success() {
        return Ok(CommandResponse::error(&format!(
            "GitHub API error: {}",
            response.status()
        )));
    }
    
    let user: GitHubUser = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse user response: {}", e))?;
    
    Ok(CommandResponse::success(user))
}

/// Logout and clear tokens
#[tauri::command]
pub async fn logout(app: AppHandle) -> Result<CommandResponse<()>, String> {
    // Clear stored token
    let store = app.get_store("tokens.bin").map_err(|e| e.to_string())?;
    store.clear();
    store.save().map_err(|e| e.to_string())?;
    
    Ok(CommandResponse::success(()))
}

fn get_client_secret() -> &'static str {
    std::env::var("GITHUB_CLIENT_SECRET")
        .ok()
        .unwrap_or_else(|| GITHUB_CLIENT_SECRET.to_string())
        .leak()
}

fn store_token(app: &AppHandle, token: &TokenData) -> Result<(), String> {
    let store = app.get_store("tokens.bin").map_err(|e: tauri_plugin_store::Error| e.to_string())?;
    store
        .set("github_token", serde_json::to_value(token).map_err(|e| e.to_string())?)
        .save()
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn get_stored_token(app: &AppHandle) -> Result<TokenData, String> {
    let store = app.get_store("tokens.bin").map_err(|e: tauri_plugin_store::Error| e.to_string())?;
    let token_value = store
        .get("github_token")
        .ok_or_else(|| "No token stored".to_string())?;
    
    serde_json::from_value(token_value).map_err(|e| format!("Failed to parse token: {}", e))
}

/// App state container for OAuth state management
#[derive(Default)]
pub struct AppStateContainer(std::sync::Mutex<AppStateInner>);

#[derive(Default)]
pub struct AppStateInner {
    pub oauth_state: Option<String>,
}
