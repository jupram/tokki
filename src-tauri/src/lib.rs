pub mod commands;
pub mod engine;
pub mod events;
pub mod runtime;
pub mod settings;

use runtime::SharedRuntime;
use tauri::{
    menu::MenuBuilder,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle,
    Manager,
    WebviewUrl,
    WebviewWindowBuilder,
};

const MAIN_WINDOW_LABEL: &str = "main";
const SETTINGS_WINDOW_LABEL: &str = "settings";
const MENU_ID_OPEN_MAIN: &str = "open-main";
const MENU_ID_OPEN_SETTINGS: &str = "open-settings";
const MENU_ID_QUIT: &str = "quit";

fn focus_window(window: tauri::WebviewWindow) -> tauri::Result<()> {
    window.show()?;
    window.set_focus()?;
    Ok(())
}

fn open_main_window(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        focus_window(window)?;
    }

    Ok(())
}

fn open_settings_window(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
        return focus_window(window);
    }

    let window = WebviewWindowBuilder::new(
        app,
        SETTINGS_WINDOW_LABEL,
        WebviewUrl::App("index.html?view=settings".into()),
    )
    .title("Tokki Settings")
    .inner_size(460.0, 720.0)
    .resizable(false)
    .center()
    .build()?;

    focus_window(window)
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .text(MENU_ID_OPEN_MAIN, "Show Tokki")
        .text(MENU_ID_OPEN_SETTINGS, "Settings")
        .separator()
        .text(MENU_ID_QUIT, "Quit")
        .build()?;

    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Tokki")
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = open_settings_window(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            MENU_ID_OPEN_MAIN => {
                let _ = open_main_window(app);
            }
            MENU_ID_OPEN_SETTINGS => {
                let _ = open_settings_window(app);
            }
            MENU_ID_QUIT => app.exit(0),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    let _tray = builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SharedRuntime::default())
        .setup(|app| {
            let settings_store = settings::SettingsStore::load(&app.handle())?;
            app.manage(settings_store);
            setup_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_behavior_loop,
            commands::stop_behavior_loop,
            commands::handle_user_interaction,
            commands::get_current_state,
            commands::advance_tick,
            commands::request_llm_reply,
            settings::get_settings,
            settings::save_settings,
            settings::reset_settings,
            settings::set_avatar_preference
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
