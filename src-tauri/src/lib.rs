pub mod commands;
pub mod engine;
pub mod events;
pub mod llm;
pub mod runtime;

use runtime::{SharedLlmClient, SharedRuntime};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SharedRuntime::default())
        .manage(SharedLlmClient::default())
        .invoke_handler(tauri::generate_handler![
            commands::start_behavior_loop,
            commands::stop_behavior_loop,
            commands::handle_user_interaction,
            commands::get_current_state,
            commands::advance_tick,
            commands::send_chat_message,
            commands::get_chat_history,
            commands::set_avatar,
            commands::get_session_memory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
