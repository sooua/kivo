mod translate;

use translate::TranslateRequest;

#[tauri::command]
async fn translate(req: TranslateRequest) -> Result<translate::TranslateResponse, String> {
    translate::do_translate(req).await
}

#[tauri::command]
async fn test_connection(req: TranslateRequest) -> Result<String, String> {
    translate::do_test_connection(req).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![translate, test_connection])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
