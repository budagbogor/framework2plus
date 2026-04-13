// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Emitter, Manager, State};
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};

#[derive(Clone, Serialize)]
struct TerminalOutputEvent {
    command_id: String,
    line: String,
    stream: String,
}

#[derive(Clone, Serialize)]
struct CommandStatusEvent {
    command_id: String,
    status: String,
    exit_code: Option<i32>,
    error: Option<String>,
}

struct CommandRegistry {
    pids: Mutex<HashMap<String, u32>>,
}

#[derive(Clone, Serialize)]
struct ReleaseArtifact {
    path: String,
    file_name: String,
    artifact_type: String,
    size_bytes: u64,
}

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
async fn execute_command(
    app: AppHandle,
    registry: State<'_, CommandRegistry>,
    command_id: String,
    cmd: String,
    args: Vec<String>,
    cwd: String,
) -> Result<String, String> {
    let mut command = Command::new(cmd);
    command.args(args)
           .current_dir(PathBuf::from(cwd))
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());
    
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    if let Some(pid) = child.id() {
        let mut pids = registry.pids.lock().map_err(|e| e.to_string())?;
        pids.insert(command_id.clone(), pid);
    }
    let _ = app.emit("command-status", CommandStatusEvent {
        command_id: command_id.clone(),
        status: "started".into(),
        exit_code: None,
        error: None,
    });

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let app_clone = app.clone();
    let command_id_out = command_id.clone();

    // Stream Stdout
    tauri::async_runtime::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_clone.emit("terminal-output", TerminalOutputEvent {
                command_id: command_id_out.clone(),
                line,
                stream: "stdout".into(),
            });
        }
    });

    // Stream Stderr
    let app_clone_err = app.clone();
    let command_id_err = command_id.clone();
    tauri::async_runtime::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_clone_err.emit("terminal-output", TerminalOutputEvent {
                command_id: command_id_err.clone(),
                line,
                stream: "stderr".into(),
            });
        }
    });

    let app_wait = app.clone();
    let command_id_wait = command_id.clone();
    let app_for_cleanup = app.clone();
    tauri::async_runtime::spawn(async move {
        match child.wait().await {
            Ok(status) => {
                if let Some(registry) = app_for_cleanup.try_state::<CommandRegistry>() {
                    if let Ok(mut pids) = registry.pids.lock() {
                        pids.remove(&command_id_wait);
                    }
                }
                let lifecycle = if status.success() { "completed" } else { "failed" };
                let _ = app_wait.emit("command-status", CommandStatusEvent {
                    command_id: command_id_wait.clone(),
                    status: lifecycle.into(),
                    exit_code: status.code(),
                    error: None,
                });
            }
            Err(err) => {
                if let Some(registry) = app_for_cleanup.try_state::<CommandRegistry>() {
                    if let Ok(mut pids) = registry.pids.lock() {
                        pids.remove(&command_id_wait);
                    }
                }
                let _ = app_wait.emit("command-status", CommandStatusEvent {
                    command_id: command_id_wait,
                    status: "failed".into(),
                    exit_code: None,
                    error: Some(err.to_string()),
                });
            }
        }
    });

    Ok(command_id)
}

#[tauri::command]
async fn stop_command(
    app: AppHandle,
    registry: State<'_, CommandRegistry>,
    command_id: String,
) -> Result<String, String> {
    let pid = {
        let pids = registry.pids.lock().map_err(|e| e.to_string())?;
        pids.get(&command_id).copied()
    };

    let pid = match pid {
        Some(value) => value,
        None => return Err(format!("Command {} tidak ditemukan atau sudah berhenti.", command_id)),
    };

    #[cfg(target_os = "windows")]
    let status = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .status()
        .await
        .map_err(|e| e.to_string())?;

    #[cfg(not(target_os = "windows"))]
    let status = Command::new("kill")
        .args(["-TERM", &pid.to_string()])
        .status()
        .await
        .map_err(|e| e.to_string())?;

    if let Ok(mut pids) = registry.pids.lock() {
        pids.remove(&command_id);
    }

    if status.success() {
        let _ = app.emit("command-status", CommandStatusEvent {
            command_id: command_id.clone(),
            status: "stopped".into(),
            exit_code: status.code(),
            error: None,
        });
        Ok(command_id)
    } else {
        let message = format!("Gagal menghentikan command {}.", command_id);
        let _ = app.emit("command-status", CommandStatusEvent {
            command_id: command_id.clone(),
            status: "failed".into(),
            exit_code: status.code(),
            error: Some(message.clone()),
        });
        Err(message)
    }
}

#[tauri::command]
async fn list_release_artifacts(project_root: String) -> Result<Vec<ReleaseArtifact>, String> {
    let candidates = [
        "src-tauri/target/release/bundle/nsis",
        "src-tauri/target/release/bundle/msi",
        "src-tauri/target/release",
    ];

    let mut artifacts = Vec::new();
    for relative in candidates {
        let dir = PathBuf::from(&project_root).join(relative);
        if !dir.exists() {
            continue;
        }
        let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let ext = path.extension().and_then(|value| value.to_str()).unwrap_or("").to_ascii_lowercase();
            if !matches!(ext.as_str(), "exe" | "msi") {
                continue;
            }
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            let file_name = path.file_name().and_then(|value| value.to_str()).unwrap_or("").to_string();
            artifacts.push(ReleaseArtifact {
                path: path.to_string_lossy().to_string(),
                file_name,
                artifact_type: ext,
                size_bytes: metadata.len(),
            });
        }
    }

    artifacts.sort_by(|a, b| a.file_name.cmp(&b.file_name));
    Ok(artifacts)
}

fn main() {
    tauri::Builder::default()
        .manage(CommandRegistry { pids: Mutex::new(HashMap::new()) })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_file, execute_command, stop_command, list_release_artifacts])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
