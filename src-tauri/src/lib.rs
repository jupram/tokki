pub mod commands;
pub mod discovery;
pub mod engine;
pub mod events;
pub mod llm;
pub mod persistence;
pub mod presence;
pub mod runtime;

use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime,
};

use runtime::{request_shutdown, SharedLlmClient, SharedPersistence, SharedRuntime};

const MAIN_WINDOW_LABEL: &str = "main";
const FALLBACK_TRAY_ICON_SIZE: usize = 16;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TrayToggleAction {
    Show,
    Hide,
}

fn tray_toggle_action(is_visible: bool, is_minimized: bool) -> TrayToggleAction {
    if is_visible && !is_minimized {
        TrayToggleAction::Hide
    } else {
        TrayToggleAction::Show
    }
}

fn generated_fallback_tray_icon() -> Image<'static> {
    let mut rgba = vec![0; FALLBACK_TRAY_ICON_SIZE * FALLBACK_TRAY_ICON_SIZE * 4];

    for y in 0..FALLBACK_TRAY_ICON_SIZE {
        for x in 0..FALLBACK_TRAY_ICON_SIZE {
            let idx = (y * FALLBACK_TRAY_ICON_SIZE + x) * 4;
            let pixel = if x == 0
                || y == 0
                || x == FALLBACK_TRAY_ICON_SIZE - 1
                || y == FALLBACK_TRAY_ICON_SIZE - 1
            {
                [0x8d, 0x4c, 0x73, 0xff]
            } else if ((x == 5 || x == 10) && y >= 5 && y <= 6)
                || (y == 10 && (x == 4 || x == 11))
                || (y == 11 && (5..=10).contains(&x))
            {
                [0x3f, 0x2a, 0x33, 0xff]
            } else {
                [0xf5, 0xb7, 0xc5, 0xff]
            };
            rgba[idx..idx + 4].copy_from_slice(&pixel);
        }
    }

    Image::new_owned(
        rgba,
        FALLBACK_TRAY_ICON_SIZE as u32,
        FALLBACK_TRAY_ICON_SIZE as u32,
    )
}

fn resolve_tray_icon(default_icon: Option<Image<'static>>) -> Image<'static> {
    default_icon.unwrap_or_else(|| {
        eprintln!("[tokki] default window icon missing; using generated fallback tray icon");
        generated_fallback_tray_icon()
    })
}

fn clone_default_window_icon(default_icon: Option<&Image<'_>>) -> Option<Image<'static>> {
    default_icon.map(|icon| Image::new_owned(icon.rgba().to_vec(), icon.width(), icon.height()))
}

fn with_main_window<R: Runtime>(
    app: &AppHandle<R>,
    source: &str,
) -> Option<tauri::WebviewWindow<R>> {
    match app.get_webview_window(MAIN_WINDOW_LABEL) {
        Some(window) => Some(window),
        None => {
            eprintln!("[tokki] {source}: main window '{MAIN_WINDOW_LABEL}' not found");
            None
        }
    }
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>, source: &str) {
    let Some(window) = with_main_window(app, source) else {
        return;
    };

    if let Err(error) = window.unminimize() {
        eprintln!("[tokki] {source}: failed to unminimize main window: {error}");
    }
    if let Err(error) = window.show() {
        eprintln!("[tokki] {source}: failed to show main window: {error}");
    }
    if let Err(error) = window.set_focus() {
        eprintln!("[tokki] {source}: failed to focus main window: {error}");
    }
}

fn hide_main_window<R: Runtime>(app: &AppHandle<R>, source: &str) {
    let Some(window) = with_main_window(app, source) else {
        return;
    };

    if let Err(error) = window.hide() {
        eprintln!("[tokki] {source}: failed to hide main window: {error}");
    }
}

fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = with_main_window(app, "tray click") else {
        return;
    };

    let is_visible = match window.is_visible() {
        Ok(value) => value,
        Err(error) => {
            eprintln!(
                "[tokki] tray click: failed to query main window visibility: {error}; treating window as hidden"
            );
            false
        }
    };
    let is_minimized = match window.is_minimized() {
        Ok(value) => value,
        Err(error) => {
            eprintln!(
                "[tokki] tray click: failed to query main window minimized state: {error}; assuming window is not minimized"
            );
            false
        }
    };

    match tray_toggle_action(is_visible, is_minimized) {
        TrayToggleAction::Show => show_main_window(app, "tray click"),
        TrayToggleAction::Hide => hide_main_window(app, "tray click"),
    }
}

fn exit_app<R: Runtime>(app: &AppHandle<R>) {
    if let Some(runtime) = app.try_state::<SharedRuntime>() {
        if let Err(error) = request_shutdown(runtime.inner()) {
            eprintln!("[tokki] failed to stop behavior loop during shutdown: {error}");
        }
    }

    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let persistence = SharedPersistence::default();
    let (runtime, restore_error) = SharedRuntime::restore_or_default(&persistence);
    if let Some(error) = restore_error {
        eprintln!("[tokki] failed to restore persistent session memory: {error}");
        eprintln!(
            "[tokki] starting with a fresh in-memory runtime for this launch; persistence commands will keep reporting errors until storage is available again"
        );
    }
    let llm_client = SharedLlmClient::default();

    tauri::Builder::default()
        .manage(runtime)
        .manage(llm_client)
        .manage(persistence)
        .setup(|app| {
            let show_i = MenuItem::with_id(app, "show", "Show Tokki", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .tooltip("Tokki")
                .icon(resolve_tray_icon(clone_default_window_icon(
                    app.default_window_icon(),
                )))
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => show_main_window(app, "tray menu show"),
                    "hide" => hide_main_window(app, "tray menu hide"),
                    "quit" => exit_app(app),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_behavior_loop,
            commands::stop_behavior_loop,
            commands::handle_user_interaction,
            commands::get_current_state,
            commands::advance_tick,
            commands::send_chat_message,
            commands::get_chat_history,
            commands::clear_chat_history,
            commands::set_avatar,
            commands::get_session_memory,
            commands::get_personality,
            commands::set_personality,
            commands::set_humor_level,
            commands::load_persistent_memory,
            commands::save_persistent_memory,
            commands::report_mouse_shake,
            commands::get_provider_config,
            commands::set_provider_config,
            commands::get_provider_info,
            commands::check_provider_health,
            commands::export_memory,
            commands::import_memory,
            commands::import_memory_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tray_toggle_action_restores_minimized_windows_instead_of_hiding_them() {
        assert_eq!(tray_toggle_action(true, true), TrayToggleAction::Show);
        assert_eq!(tray_toggle_action(false, false), TrayToggleAction::Show);
        assert_eq!(tray_toggle_action(true, false), TrayToggleAction::Hide);
    }

    #[test]
    fn resolve_tray_icon_uses_existing_default_icon_when_available() {
        let expected = Image::new_owned(vec![0x12, 0x34, 0x56, 0xff], 1, 1);

        let resolved = resolve_tray_icon(Some(expected.clone()));

        assert_eq!(resolved.width(), expected.width());
        assert_eq!(resolved.height(), expected.height());
        assert_eq!(resolved.rgba(), expected.rgba());
    }

    #[test]
    fn resolve_tray_icon_generates_visible_fallback_when_default_icon_is_missing() {
        let resolved = resolve_tray_icon(None);

        assert_eq!(resolved.width(), FALLBACK_TRAY_ICON_SIZE as u32);
        assert_eq!(resolved.height(), FALLBACK_TRAY_ICON_SIZE as u32);
        assert_eq!(
            resolved.rgba().len(),
            FALLBACK_TRAY_ICON_SIZE * FALLBACK_TRAY_ICON_SIZE * 4
        );
        assert!(resolved
            .rgba()
            .chunks_exact(4)
            .any(|pixel| pixel[3] == 0xff));
    }
}
