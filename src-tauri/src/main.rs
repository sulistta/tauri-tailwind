// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

/// Argumento usado pelo binário de duplo propósito para entrar em modo daemon.
const IDLE_DAEMON_FLAG: &str = "--idle-daemon";

/// Raiz controlada pelo app para os binários temporários simulados.
const TEMP_ROOT: &str = "/tmp/process_simulator";

/// URL pública esperada para perfis remotos.
///
/// Formatos aceitos:
/// - [{ "name": "...", "description": "..." }]
/// - { "profiles": [{ "name": "...", "description": "..." }] }
const PROFILE_LIST_URL: &str =
    "https://raw.githubusercontent.com/example/process-simulator-profiles/main/profiles.json";

type SharedSimulationManager = Mutex<SimulationManager>;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProcessProfile {
    name: String,
    description: String,
}

#[derive(Debug, Deserialize)]
struct ProfileEnvelope {
    profiles: Vec<ProcessProfile>,
}

#[derive(Debug, Clone, Serialize)]
struct SimulationStatus {
    active: bool,
    pid: Option<u32>,
    target_name: Option<String>,
    executable_path: Option<String>,
}

#[derive(Default)]
struct SimulationManager {
    child: Option<Child>,
    target_name: Option<String>,
    executable_path: Option<PathBuf>,
    work_dir: Option<PathBuf>,
}

impl SimulationManager {
    fn status(&mut self) -> SimulationStatus {
        // Atualiza o estado caso o filho tenha terminado fora do fluxo normal.
        if let Some(child) = self.child.as_mut() {
            if matches!(child.try_wait(), Ok(Some(_))) {
                self.child = None;
            }
        }

        SimulationStatus {
            active: self.child.is_some(),
            pid: self.child.as_ref().map(Child::id),
            target_name: self.target_name.clone(),
            executable_path: self
                .executable_path
                .as_ref()
                .map(|path| path.display().to_string()),
        }
    }

    fn stop_active(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.child.take() {
            match child.try_wait() {
                Ok(Some(_)) => {}
                Ok(None) => {
                    child
                        .kill()
                        .map_err(|error| format!("falha ao finalizar processo filho: {error}"))?;
                    let _ = child.wait();
                }
                Err(error) => {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(format!("falha ao consultar processo filho: {error}"));
                }
            }
        }

        if let Some(work_dir) = self.work_dir.take() {
            if work_dir.exists() {
                fs::remove_dir_all(&work_dir).map_err(|error| {
                    format!(
                        "falha ao remover diretório temporário {}: {error}",
                        work_dir.display()
                    )
                })?;
            }
        }

        // Remove a raiz se ela ficou vazia; não falha se outro processo/app ainda a usa.
        let _ = fs::remove_dir(TEMP_ROOT);

        self.target_name = None;
        self.executable_path = None;
        Ok(())
    }
}

impl Drop for SimulationManager {
    fn drop(&mut self) {
        // Garante cleanup best-effort se o app fechar sem chamar stop_simulation.
        let _ = self.stop_active();
    }
}

#[tauri::command]
fn start_simulation(
    target_name: String,
    state: tauri::State<'_, SharedSimulationManager>,
) -> Result<SimulationStatus, String> {
    let safe_name = sanitize_target_name(&target_name)?;
    let mut manager = state
        .lock()
        .map_err(|_| "estado de simulação está bloqueado/contaminado".to_string())?;

    // Este utilitário mantém uma única simulação ativa por vez.
    manager.stop_active()?;

    let current_exe = std::env::current_exe()
        .map_err(|error| format!("falha ao resolver binário atual: {error}"))?;
    let work_dir = build_isolated_work_dir()?;
    fs::create_dir_all(&work_dir).map_err(|error| {
        format!(
            "falha ao criar diretório temporário {}: {error}",
            work_dir.display()
        )
    })?;

    let simulated_exe = work_dir.join(&safe_name);
    fs::copy(&current_exe, &simulated_exe).map_err(|error| {
        format!(
            "falha ao copiar {} para {}: {error}",
            current_exe.display(),
            simulated_exe.display()
        )
    })?;

    ensure_executable_permissions(&simulated_exe)?;

    let child = Command::new(&simulated_exe)
        .arg(IDLE_DAEMON_FLAG)
        .current_dir(&work_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| {
            format!(
                "falha ao iniciar processo simulado {}: {error}",
                simulated_exe.display()
            )
        })?;

    manager.target_name = Some(safe_name);
    manager.executable_path = Some(simulated_exe);
    manager.work_dir = Some(work_dir);
    manager.child = Some(child);

    Ok(manager.status())
}

#[tauri::command]
fn stop_simulation(
    state: tauri::State<'_, SharedSimulationManager>,
) -> Result<SimulationStatus, String> {
    let mut manager = state
        .lock()
        .map_err(|_| "estado de simulação está bloqueado/contaminado".to_string())?;
    manager.stop_active()?;
    Ok(manager.status())
}

#[tauri::command]
async fn fetch_profile_list() -> Result<Vec<ProcessProfile>, String> {
    let client = reqwest::Client::builder()
        .user_agent("dc-auto-quest-process-simulator/0.1")
        .build()
        .map_err(|error| format!("falha ao criar cliente HTTP: {error}"))?;

    let response = client.get(PROFILE_LIST_URL).send().await;
    let response = match response {
        Ok(response) if response.status().is_success() => response,
        Ok(response) => {
            eprintln!("lista remota indisponível: HTTP {}", response.status());
            return Ok(default_profiles());
        }
        Err(error) => {
            eprintln!("lista remota indisponível: {error}");
            return Ok(default_profiles());
        }
    };

    let body = response
        .text()
        .await
        .map_err(|error| format!("falha ao ler resposta remota: {error}"))?;

    parse_profiles(&body).or_else(|error| {
        eprintln!("JSON remoto inválido; usando perfis locais: {error}");
        Ok(default_profiles())
    })
}

fn main() {
    // Intercepta o modo daemon antes de qualquer inicialização do Tauri/webview.
    if std::env::args().any(|arg| arg == IDLE_DAEMON_FLAG) {
        loop {
            std::thread::park();
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .manage(SharedSimulationManager::default())
        .invoke_handler(tauri::generate_handler![
            start_simulation,
            stop_simulation,
            fetch_profile_list
        ])
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                if let Ok(mut manager) = window.state::<SharedSimulationManager>().lock() {
                    let _ = manager.stop_active();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn sanitize_target_name(target_name: &str) -> Result<String, String> {
    let trimmed = target_name.trim();

    if trimmed.is_empty() {
        return Err("nome do processo não pode ser vazio".to_string());
    }

    if trimmed.len() > 80 {
        return Err("nome do processo deve ter no máximo 80 caracteres".to_string());
    }

    if trimmed.contains('/') || trimmed.contains('\\') || trimmed == "." || trimmed == ".." {
        return Err("nome do processo deve ser apenas um nome de arquivo".to_string());
    }

    let is_safe = trimmed
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '_' | '-' | '.'));

    if !is_safe {
        return Err("use apenas letras, números, ponto, hífen ou underscore".to_string());
    }

    Ok(trimmed.to_string())
}

fn build_isolated_work_dir() -> Result<PathBuf, String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("relógio do sistema inválido: {error}"))?
        .as_nanos();

    Ok(PathBuf::from(TEMP_ROOT).join(format!(
        "run-{}-{timestamp}",
        std::process::id()
    )))
}

#[cfg(unix)]
fn ensure_executable_permissions(path: &PathBuf) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    let mut permissions = fs::metadata(path)
        .map_err(|error| format!("falha ao ler permissões de {}: {error}", path.display()))?
        .permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(path, permissions)
        .map_err(|error| format!("falha ao aplicar chmod 755 em {}: {error}", path.display()))
}

#[cfg(not(unix))]
fn ensure_executable_permissions(_path: &PathBuf) -> Result<(), String> {
    Ok(())
}

fn parse_profiles(body: &str) -> Result<Vec<ProcessProfile>, serde_json::Error> {
    serde_json::from_str::<Vec<ProcessProfile>>(body).or_else(|_| {
        serde_json::from_str::<ProfileEnvelope>(body).map(|envelope| envelope.profiles)
    })
}

fn default_profiles() -> Vec<ProcessProfile> {
    vec![
        ProcessProfile {
            name: "processo_teste".to_string(),
            description: "Perfil genérico para validação de coleta de processos.".to_string(),
        },
        ProcessProfile {
            name: "telemetry_agent".to_string(),
            description: "Simula um agente local usado por pipelines de telemetria.".to_string(),
        },
        ProcessProfile {
            name: "audit_worker".to_string(),
            description: "Processo ocioso para testes de auditoria e inventário.".to_string(),
        },
    ]
}
