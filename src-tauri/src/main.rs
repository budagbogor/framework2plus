// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Emitter};
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};

#[tauri::command]
async fn save_file(path: String, content: String) -> Result<String, String> {
    let p = std::path::Path::new(&path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(p, content).map_err(|e| e.to_string())?;
    Ok("File saved successfully".into())
}

#[tauri::command]
async fn execute_command(app: AppHandle, cmd: String, args: Vec<String>, cwd: String) -> Result<(), String> {
    let mut command = Command::new(cmd);
    command.args(args)
           .current_dir(PathBuf::from(cwd))
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());
    
    let mut child = command.spawn().map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let app_clone = app.clone();

    // Stream Stdout
    tauri::async_runtime::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_clone.emit("terminal-output", line);
        }
    });

    // Stream Stderr
    let app_clone_err = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_clone_err.emit("terminal-output", format!("Error: {}", line));
        }
    });

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_file, execute_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
