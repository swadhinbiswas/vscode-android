use crate::types::{Codespace, CodespaceState, CommandResponse};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

/// List all codespaces for the authenticated user
#[tauri::command]
pub async fn list_codespaces(app: AppHandle) -> Result<CommandResponse<Vec<Codespace>>, String> {
    let token = crate::github::get_stored_token(&app)?;
    
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/user/codespaces")
        .header("Accept", "application/vnd.github.v3+json")
        .header("Authorization", format!("{} {}", token.token_type, token.access_token))
        .header("User-Agent", "vscode-android")
        .query(&[("per_page", "100")])
        .send()
        .await
        .map_err(|e| format!("Failed to fetch codespaces: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Ok(CommandResponse::error(&format!(
            "GitHub API error: {}",
            error_text
        )));
    }
    
    #[derive(Deserialize)]
    struct CodespacesResponse {
        codespaces: Vec<Codespace>,
    }
    
    let data: CodespacesResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse codespaces: {}", e))?;
    
    Ok(CommandResponse::success(data.codespaces))
}

/// Get details for a specific codespace
#[tauri::command]
pub async fn get_codespace(
    app: AppHandle,
    codespace_name: String,
) -> Result<CommandResponse<Codespace>, String> {
    let token = crate::github::get_stored_token(&app)?;
    
    let client = reqwest::Client::new();
    let response = client
        .get(format!(
            "https://api.github.com/user/codespaces/{}",
            codespace_name
        ))
        .header("Accept", "application/vnd.github.v3+json")
        .header("Authorization", format!("{} {}", token.token_type, token.access_token))
        .header("User-Agent", "vscode-android")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch codespace: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Ok(CommandResponse::error(&format!(
            "GitHub API error: {}",
            error_text
        )));
    }
    
    let codespace: Codespace = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse codespace: {}", e))?;
    
    Ok(CommandResponse::success(codespace))
}

/// Start a stopped codespace
#[tauri::command]
pub async fn start_codespace(
    app: AppHandle,
    codespace_name: String,
) -> Result<CommandResponse<Codespace>, String> {
    let token = crate::github::get_stored_token(&app)?;
    
    let client = reqwest::Client::new();
    let response = client
        .post(format!(
            "https://api.github.com/user/codespaces/{}/start",
            codespace_name
        ))
        .header("Accept", "application/vnd.github.v3+json")
        .header("Authorization", format!("{} {}", token.token_type, token.access_token))
        .header("User-Agent", "vscode-android")
        .send()
        .await
        .map_err(|e| format!("Failed to start codespace: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Ok(CommandResponse::error(&format!(
            "GitHub API error: {}",
            error_text
        )));
    }
    
    let codespace: Codespace = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse codespace: {}", e))?;
    
    Ok(CommandResponse::success(codespace))
}

/// Stop a running codespace
#[tauri::command]
pub async fn stop_codespace(
    app: AppHandle,
    codespace_name: String,
) -> Result<CommandResponse<Codespace>, String> {
    let token = crate::github::get_stored_token(&app)?;
    
    let client = reqwest::Client::new();
    let response = client
        .post(format!(
            "https://api.github.com/user/codespaces/{}/stop",
            codespace_name
        ))
        .header("Accept", "application/vnd.github.v3+json")
        .header("Authorization", format!("{} {}", token.token_type, token.access_token))
        .header("User-Agent", "vscode-android")
        .send()
        .await
        .map_err(|e| format!("Failed to stop codespace: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Ok(CommandResponse::error(&format!(
            "GitHub API error: {}",
            error_text
        )));
    }
    
    let codespace: Codespace = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse codespace: {}", e))?;
    
    Ok(CommandResponse::success(codespace))
}

/// Create a new codespace
#[tauri::command]
pub async fn create_codespace(
    app: AppHandle,
    repo: String,
    branch: Option<String>,
    machine: Option<String>,
    devcontainer_path: Option<String>,
) -> Result<CommandResponse<Codespace>, String> {
    let token = crate::github::get_stored_token(&app)?;
    
    #[derive(Serialize)]
    struct CreateCodespaceRequest {
        repository_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        ref_: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        machine: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        devcontainer_path: Option<String>,
    }
    
    let body = CreateCodespaceRequest {
        repository_id: repo,
        ref_: branch,
        machine,
        devcontainer_path,
    };
    
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.github.com/user/codespaces")
        .header("Accept", "application/vnd.github.v3+json")
        .header("Authorization", format!("{} {}", token.token_type, token.access_token))
        .header("User-Agent", "vscode-android")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to create codespace: {}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Ok(CommandResponse::error(&format!(
            "GitHub API error: {}",
            error_text
        )));
    }
    
    let codespace: Codespace = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse codespace: {}", e))?;
    
    Ok(CommandResponse::success(codespace))
}

/// Get the dev URL for a codespace (for WebSocket connection)
#[tauri::command]
pub async fn get_codespace_dev_url(
    app: AppHandle,
    codespace_name: String,
) -> Result<CommandResponse<String>, String> {
    // First get the codespace details
    let codespace_result = get_codespace(app.clone(), codespace_name.clone()).await?;
    
    if !codespace_result.success {
        return Ok(CommandResponse::error(
            codespace_result.error.as_deref().unwrap_or("Unknown error"),
        ));
    }
    
    let codespace = codespace_result.data.unwrap();
    
    // Construct the dev URL
    // Format: wss://<codespace_name>-<port>.app.github.dev
    // For VS Code Server, typically port 8000 or 443
    let dev_url = format!("wss://{}.app.github.dev", codespace.name.replace('_', "-"));
    
    Ok(CommandResponse::success(dev_url))
}

/// Check if a codespace is available/running
pub fn is_codespace_available(codespace: &Codespace) -> bool {
    matches!(codespace.state, CodespaceState::Available | CodespaceState::Running)
}
