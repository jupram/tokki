pub mod client;
pub mod config;
pub mod grounding;
pub mod memory;
pub mod models;
pub mod offline;
pub mod ollama;
pub mod openai;
pub mod provider;

/// Maximum response body size we'll read from any LLM endpoint (1 MB).
/// Prevents a malicious or buggy server from forcing unbounded memory allocation.
const MAX_RESPONSE_BODY_BYTES: usize = 1_048_576;

/// Read a response body in chunks, enforcing a byte-size cap.
/// Returns the collected bytes or an error if the cap is exceeded.
pub async fn read_bounded_body(
    mut response: reqwest::Response,
) -> Result<Vec<u8>, String> {
    let mut body = Vec::new();

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("error reading response chunk: {e}"))?
    {
        if body.len() + chunk.len() > MAX_RESPONSE_BODY_BYTES {
            return Err(format!(
                "LLM response exceeded {} byte limit",
                MAX_RESPONSE_BODY_BYTES
            ));
        }
        body.extend_from_slice(&chunk);
    }

    Ok(body)
}
