// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod commands;
pub mod codespaces;
pub mod conflict;
pub mod github;
pub mod sync;
pub mod types;

use commands::*;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to VSCode Android!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_websocket::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            github::github_login,
            github::github_callback,
            github::get_github_user,
            github::logout,
            codespaces::list_codespaces,
            codespaces::get_codespace,
            codespaces::start_codespace,
            codespaces::stop_codespace,
            codespaces::create_codespace,
            codespaces::get_codespace_dev_url,
            sync::sync_file_to_codespace,
            sync::sync_file_from_codespace,
            sync::get_remote_file,
            sync::push_all_changes,
            sync::pull_all_changes,
            sync::get_sync_status,
            sync::clear_sync_queue,
            types::get_app_state,
            types::set_editor_settings,
            types::set_theme
        ])
        .setup(|app| {
            // Initialize app state
            let handle = app.handle().clone();
            
            // Start background sync worker
            std::thread::spawn(move || {
                sync::start_sync_worker(handle);
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
