use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Deserialize)]
pub struct TranslateRequest {
    pub text: String,
    pub from: String,
    pub to: String,
    pub engine: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TranslateResponse {
    pub text: String,
    pub engine: String,
}

// Language code mapping for different APIs
fn lang_code_mymemory(code: &str) -> &str {
    match code {
        "auto" => "autodetect",
        "en" => "en-GB",
        "zh" => "zh-CN",
        "ja" => "ja-JP",
        "ko" => "ko-KR",
        "fr" => "fr-FR",
        "de" => "de-DE",
        "es" => "es-ES",
        "ru" => "ru-RU",
        "ar" => "ar-SA",
        "pt" => "pt-PT",
        _ => code,
    }
}

fn lang_name(code: &str) -> &str {
    match code {
        "auto" => "auto-detected language",
        "en" => "English",
        "zh" => "Chinese",
        "ja" => "Japanese",
        "ko" => "Korean",
        "fr" => "French",
        "de" => "German",
        "es" => "Spanish",
        "ru" => "Russian",
        "ar" => "Arabic",
        "pt" => "Portuguese",
        _ => code,
    }
}

async fn translate_mymemory(client: &Client, req: &TranslateRequest) -> Result<String, String> {
    let from = lang_code_mymemory(&req.from);
    let to = lang_code_mymemory(&req.to);
    let langpair = format!("{}|{}", from, to);

    let url = format!(
        "https://api.mymemory.translated.net/get?q={}&langpair={}",
        urlencoding::encode(&req.text),
        urlencoding::encode(&langpair)
    );

    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let text = body["responseData"]["translatedText"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Failed to parse MyMemory response".to_string())?;

    // MyMemory returns this error when source and target languages are the same
    if text.contains("PLEASE SELECT TWO DISTINCT LANGUAGES") {
        return Err("Source and target languages appear to be the same. Please select a different target language.".to_string());
    }

    Ok(text)
}

async fn translate_deepl(client: &Client, req: &TranslateRequest) -> Result<String, String> {
    let api_key = req.api_key.as_deref().ok_or("DeepL API key is required")?;

    let source_lang = match req.from.as_str() {
        "auto" => None,
        "en" => Some("EN"),
        "zh" => Some("ZH"),
        "ja" => Some("JA"),
        "ko" => Some("KO"),
        "fr" => Some("FR"),
        "de" => Some("DE"),
        "es" => Some("ES"),
        "ru" => Some("RU"),
        "ar" => Some("AR"),
        "pt" => Some("PT"),
        other => Some(other),
    };

    let target_lang = match req.to.as_str() {
        "en" => "EN",
        "zh" => "ZH",
        "ja" => "JA",
        "ko" => "KO",
        "fr" => "FR",
        "de" => "DE",
        "es" => "ES",
        "ru" => "RU",
        "ar" => "AR",
        "pt" => "PT",
        other => other,
    };

    let mut form = vec![
        ("text", req.text.as_str()),
        ("target_lang", target_lang),
    ];
    // DeepL needs source_lang to be a separate owned string we can reference
    let source_owned: String;
    if let Some(sl) = source_lang {
        source_owned = sl.to_string();
        form.push(("source_lang", &source_owned));
    }

    let resp = client
        .post("https://api-free.deepl.com/v2/translate")
        .header("Authorization", format!("DeepL-Auth-Key {}", api_key))
        .form(&form)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    body["translations"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| {
            body["message"]
                .as_str()
                .unwrap_or("Failed to parse DeepL response")
                .to_string()
        })
}

async fn translate_google(client: &Client, req: &TranslateRequest) -> Result<String, String> {
    let api_key = req.api_key.as_deref().ok_or("Google API key is required")?;

    let source = if req.from == "auto" { "" } else { &req.from };

    let body = serde_json::json!({
        "q": req.text,
        "source": source,
        "target": req.to,
        "format": "text"
    });

    let resp = client
        .post(format!(
            "https://translation.googleapis.com/language/translate/v2?key={}",
            api_key
        ))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let result: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    result["data"]["translations"][0]["translatedText"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| {
            result["error"]["message"]
                .as_str()
                .unwrap_or("Failed to parse Google response")
                .to_string()
        })
}

async fn translate_openai_compatible(
    client: &Client,
    req: &TranslateRequest,
    endpoint: &str,
    model: &str,
) -> Result<String, String> {
    let api_key = req.api_key.as_deref().ok_or("API key is required")?;

    let from_name = lang_name(&req.from);
    let to_name = lang_name(&req.to);

    let body = serde_json::json!({
        "model": model,
        "temperature": 0.3,
        "messages": [
            {
                "role": "system",
                "content": "You are a professional translator. Translate the user's text accurately and naturally. Output ONLY the translated text, nothing else."
            },
            {
                "role": "user",
                "content": format!("Translate the following text from {} to {}:\n\n{}", from_name, to_name, req.text)
            }
        ]
    });

    let resp = client
        .post(endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let result: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    result["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.trim().to_string())
        .ok_or_else(|| {
            result["error"]["message"]
                .as_str()
                .unwrap_or("Failed to parse LLM response")
                .to_string()
        })
}

async fn translate_claude(client: &Client, req: &TranslateRequest) -> Result<String, String> {
    let api_key = req.api_key.as_deref().ok_or("Claude API key is required")?;
    let endpoint = req
        .base_url
        .as_deref()
        .unwrap_or("https://api.anthropic.com/v1/messages");
    let model = req
        .model
        .as_deref()
        .unwrap_or("claude-sonnet-4-20250514");

    let from_name = lang_name(&req.from);
    let to_name = lang_name(&req.to);

    let body = serde_json::json!({
        "model": model,
        "max_tokens": 4096,
        "system": "You are a professional translator. Translate the user's text accurately and naturally. Output ONLY the translated text, nothing else.",
        "messages": [
            {
                "role": "user",
                "content": format!("Translate the following text from {} to {}:\n\n{}", from_name, to_name, req.text)
            }
        ]
    });

    let resp = client
        .post(endpoint)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let result: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    result["content"][0]["text"]
        .as_str()
        .map(|s| s.trim().to_string())
        .ok_or_else(|| {
            result["error"]["message"]
                .as_str()
                .unwrap_or("Failed to parse Claude response")
                .to_string()
        })
}

async fn translate_ollama(client: &Client, req: &TranslateRequest) -> Result<String, String> {
    let endpoint = req
        .base_url
        .as_deref()
        .unwrap_or("http://localhost:11434/v1/chat/completions");
    let model = req.model.as_deref().unwrap_or("llama3.1");

    let from_name = lang_name(&req.from);
    let to_name = lang_name(&req.to);

    let body = serde_json::json!({
        "model": model,
        "temperature": 0.3,
        "messages": [
            {
                "role": "system",
                "content": "You are a professional translator. Translate the user's text accurately and naturally. Output ONLY the translated text, nothing else."
            },
            {
                "role": "user",
                "content": format!("Translate the following text from {} to {}:\n\n{}", from_name, to_name, req.text)
            }
        ]
    });

    // Ollama: no Authorization header
    let resp = client
        .post(endpoint)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let result: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    result["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.trim().to_string())
        .ok_or_else(|| {
            result["error"]["message"]
                .as_str()
                .unwrap_or("Failed to parse Ollama response")
                .to_string()
        })
}

pub async fn do_translate(req: TranslateRequest) -> Result<TranslateResponse, String> {
    let client = Client::new();
    let engine = req.engine.clone();

    let text = match engine.as_str() {
        "mymemory" => translate_mymemory(&client, &req).await?,
        "deepl" => translate_deepl(&client, &req).await?,
        "google" => translate_google(&client, &req).await?,
        "claude" => translate_claude(&client, &req).await?,
        "ollama" => translate_ollama(&client, &req).await?,
        // All OpenAI-compatible engines
        "openai" | "nvidia" | "deepseek" | "qwen" | "zhipu" | "kimi" | "doubao" => {
            let default_endpoint = match engine.as_str() {
                "openai" => "https://api.openai.com/v1/chat/completions",
                "nvidia" => "https://integrate.api.nvidia.com/v1/chat/completions",
                "deepseek" => "https://api.deepseek.com/v1/chat/completions",
                "qwen" => "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                "zhipu" => "https://open.bigmodel.cn/api/paas/v4/chat/completions",
                "kimi" => "https://api.moonshot.cn/v1/chat/completions",
                "doubao" => "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
                _ => unreachable!(),
            };
            let default_model = match engine.as_str() {
                "openai" => "gpt-4o",
                "nvidia" => "meta/llama-3.1-405b-instruct",
                "deepseek" => "deepseek-chat",
                "qwen" => "qwen-plus",
                "zhipu" => "glm-4-flash",
                "kimi" => "moonshot-v1-8k",
                "doubao" => "doubao-pro-32k",
                _ => unreachable!(),
            };

            let endpoint = req.base_url.as_deref().unwrap_or(default_endpoint);
            let model = req.model.as_deref().unwrap_or(default_model);
            translate_openai_compatible(&client, &req, endpoint, model).await?
        }
        _ => return Err(format!("Unknown engine: {}", engine)),
    };

    Ok(TranslateResponse { text, engine })
}

/// Test connection by performing a minimal translation of "hello" → target
pub async fn do_test_connection(req: TranslateRequest) -> Result<String, String> {
    let mut test_req = req;
    test_req.text = "hello".to_string();
    test_req.from = "en".to_string();
    if test_req.to == "en" {
        test_req.to = "zh".to_string();
    }

    let result = do_translate(test_req).await?;
    if result.text.trim().is_empty() {
        return Err("Connection succeeded but received empty response.".to_string());
    }
    Ok(format!("Connection successful. Test: hello → {}", result.text.trim()))
}
