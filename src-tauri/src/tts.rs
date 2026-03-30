use reqwest::Client;

fn lang_to_google_tts(code: &str) -> &str {
    match code {
        "auto" => "en",
        "en" => "en",
        "zh" => "zh-CN",
        "ja" => "ja",
        "ko" => "ko",
        "fr" => "fr",
        "de" => "de",
        "es" => "es",
        "ru" => "ru",
        "ar" => "ar",
        "pt" => "pt",
        other => other,
    }
}

/// Fetch TTS audio from Google Translate (free, no API key needed).
/// Google TTS has a ~200 char limit per request, so we split long text into chunks.
pub async fn google_tts(text: &str, lang: &str) -> Result<Vec<u8>, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let tts_lang = lang_to_google_tts(lang);

    // Split text into chunks of ~190 chars at word/sentence boundaries
    let chunks = split_text(text, 190);
    let mut audio_data: Vec<u8> = Vec::new();

    for chunk in &chunks {
        let url = format!(
            "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl={}&q={}",
            tts_lang,
            urlencoding::encode(chunk)
        );

        let resp = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("TTS request failed: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("TTS returned status {}", resp.status()));
        }

        let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
        audio_data.extend_from_slice(&bytes);
    }

    if audio_data.is_empty() {
        return Err("No audio data received".to_string());
    }

    Ok(audio_data)
}

fn split_text(text: &str, max_len: usize) -> Vec<String> {
    if text.len() <= max_len {
        return vec![text.to_string()];
    }

    let mut chunks = Vec::new();
    let mut remaining = text;

    while !remaining.is_empty() {
        if remaining.len() <= max_len {
            chunks.push(remaining.to_string());
            break;
        }

        // Try to split at sentence boundary
        let search_range = &remaining[..max_len];
        let split_pos = search_range
            .rfind(|c: char| c == '.' || c == '!' || c == '?' || c == '。' || c == '！' || c == '？' || c == '，' || c == ',')
            .map(|p| p + 1)
            .or_else(|| search_range.rfind(' ').map(|p| p + 1))
            .unwrap_or(max_len);

        let (chunk, rest) = remaining.split_at(split_pos);
        chunks.push(chunk.trim().to_string());
        remaining = rest.trim();
    }

    chunks.into_iter().filter(|s| !s.is_empty()).collect()
}
