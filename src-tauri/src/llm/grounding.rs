//! Grounding / web-search module.
//!
//! Provides a trait-based search abstraction with normalized results,
//! retry logic (exponential backoff), and rate-limiting.
//! Follows the patterns from KNOWLEDGE_TRANSFER.md adapted to Rust + reqwest.

use serde::{Deserialize, Serialize};
use std::future::Future;
use std::pin::Pin;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::Semaphore;

// ---------------------------------------------------------------------------
// Normalized result schema
// ---------------------------------------------------------------------------

/// A single search result, normalized across providers.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
    pub display_url: String,
    pub source: String,
    pub date: Option<String>,
}

/// Standard response wrapper returned by every provider.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub success: bool,
    pub error: Option<String>,
    pub api_id: String,
    pub results: Vec<SearchResult>,
    pub latency_ms: u64,
    pub query: String,
}

// ---------------------------------------------------------------------------
// Provider trait
// ---------------------------------------------------------------------------

/// Trait that every grounding / search backend must implement.
pub trait SearchProvider: Send + Sync {
    fn api_id(&self) -> &str;
    fn search(
        &self,
        query: &str,
        count: u32,
    ) -> Pin<Box<dyn Future<Output = SearchResponse> + Send + '_>>;
}

// ---------------------------------------------------------------------------
// Retry wrapper with exponential backoff
// ---------------------------------------------------------------------------

/// Configuration for retry behaviour.
#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub max_attempts: u32,
    pub initial_delay_ms: u64,
    pub max_delay_ms: u64,
    pub backoff_factor: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 4,
            initial_delay_ms: 500,
            max_delay_ms: 15_000,
            backoff_factor: 2.0,
        }
    }
}

/// Wrap a `SearchProvider` to add retry + backoff on transient failures.
pub async fn search_with_retry(
    provider: &dyn SearchProvider,
    query: &str,
    count: u32,
    cfg: &RetryConfig,
) -> SearchResponse {
    let mut delay_ms = cfg.initial_delay_ms;

    for attempt in 1..=cfg.max_attempts {
        let resp = provider.search(query, count).await;
        if resp.success || attempt == cfg.max_attempts {
            return resp;
        }
        tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
        delay_ms = ((delay_ms as f64) * cfg.backoff_factor) as u64;
        if delay_ms > cfg.max_delay_ms {
            delay_ms = cfg.max_delay_ms;
        }
    }
    // Unreachable, but satisfy the compiler.
    SearchResponse {
        success: false,
        error: Some("max retries exceeded".into()),
        api_id: provider.api_id().to_string(),
        results: vec![],
        latency_ms: 0,
        query: query.to_string(),
    }
}

// ---------------------------------------------------------------------------
// Rate limiter (semaphore + minimum interval)
// ---------------------------------------------------------------------------

/// Simple rate limiter: limits concurrency and enforces a minimum interval
/// between requests.
#[derive(Clone)]
pub struct RateLimiter {
    semaphore: Arc<Semaphore>,
    last_request_epoch_ms: Arc<AtomicU64>,
    min_interval_ms: u64,
}

impl RateLimiter {
    pub fn new(max_concurrent: usize, min_interval_ms: u64) -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
            last_request_epoch_ms: Arc::new(AtomicU64::new(0)),
            min_interval_ms,
        }
    }

    /// Acquire a permit, enforcing both concurrency and interval limits.
    /// Returns `false` if the semaphore has been closed (should not happen
    /// in normal operation, but we handle it gracefully instead of panicking).
    pub async fn acquire(&self) -> bool {
        let _permit = match self.semaphore.acquire().await {
            Ok(permit) => permit,
            Err(_) => return false,
        };
        let now = epoch_ms();
        let last = self.last_request_epoch_ms.load(Ordering::Relaxed);
        if now < last + self.min_interval_ms {
            let wait = (last + self.min_interval_ms) - now;
            tokio::time::sleep(std::time::Duration::from_millis(wait)).await;
        }
        self.last_request_epoch_ms
            .store(epoch_ms(), Ordering::Relaxed);
        true
    }
}

fn epoch_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

// ---------------------------------------------------------------------------
// Bing v7 provider implementation
// ---------------------------------------------------------------------------

/// Bing Web Search API v7 provider.
pub struct BingV7 {
    api_key: String,
    endpoint: String,
    http: reqwest::Client,
    rate_limiter: RateLimiter,
}

const BING_REQUEST_TIMEOUT_SECS: u64 = 15;

impl BingV7 {
    pub fn new(api_key: String) -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(BING_REQUEST_TIMEOUT_SECS))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self {
            api_key,
            endpoint: "https://www.bingapis.com/api/v7/search".to_string(),
            http,
            rate_limiter: RateLimiter::new(5, 200),
        }
    }
}

impl SearchProvider for BingV7 {
    fn api_id(&self) -> &str {
        "gapi_v7"
    }

    fn search(
        &self,
        query: &str,
        count: u32,
    ) -> Pin<Box<dyn Future<Output = SearchResponse> + Send + '_>> {
        let query_owned = query.to_string();
        Box::pin(async move {
            if !self.rate_limiter.acquire().await {
                return SearchResponse {
                    success: false,
                    error: Some("rate limiter unavailable".into()),
                    api_id: "gapi_v7".into(),
                    results: vec![],
                    latency_ms: 0,
                    query: query_owned,
                };
            }
            let start = std::time::Instant::now();

            let res = self
                .http
                .get(&self.endpoint)
                .query(&[
                    ("q", query_owned.as_str()),
                    ("count", &count.to_string()),
                    ("mkt", "en-US"),
                    ("safeSearch", "Moderate"),
                ])
                .header("Ocp-Apim-Subscription-Key", &self.api_key)
                .send()
                .await;

            let latency_ms = start.elapsed().as_millis() as u64;

            match res {
                Ok(resp) => {
                    if !resp.status().is_success() {
                        return SearchResponse {
                            success: false,
                            error: Some(format!("HTTP {}", resp.status())),
                            api_id: "gapi_v7".into(),
                            results: vec![],
                            latency_ms,
                            query: query_owned,
                        };
                    }
                    match resp.json::<serde_json::Value>().await {
                        Ok(json) => {
                            let results = normalize_bing_v7(&json);
                            SearchResponse {
                                success: true,
                                error: None,
                                api_id: "gapi_v7".into(),
                                results,
                                latency_ms,
                                query: query_owned,
                            }
                        }
                        Err(e) => SearchResponse {
                            success: false,
                            error: Some(format!("JSON parse error: {e}")),
                            api_id: "gapi_v7".into(),
                            results: vec![],
                            latency_ms,
                            query: query_owned,
                        },
                    }
                }
                Err(e) => SearchResponse {
                    success: false,
                    error: Some(format!("request error: {e}")),
                    api_id: "gapi_v7".into(),
                    results: vec![],
                    latency_ms,
                    query: query_owned,
                },
            }
        })
    }
}

/// Extract domain from a URL for the `source` field.
fn extract_domain(url: &str) -> String {
    url.split("://")
        .nth(1)
        .unwrap_or(url)
        .split('/')
        .next()
        .unwrap_or("")
        .to_string()
}

fn normalize_bing_v7(json: &serde_json::Value) -> Vec<SearchResult> {
    let empty = vec![];
    let items = json
        .get("webPages")
        .and_then(|w| w.get("value"))
        .and_then(|v| v.as_array())
        .unwrap_or(&empty);

    items
        .iter()
        .map(|r| {
            let url = r
                .get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            SearchResult {
                title: r
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                url: url.clone(),
                snippet: r
                    .get("snippet")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                display_url: r
                    .get("displayUrl")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                source: extract_domain(&url),
                date: r
                    .get("dateLastCrawled")
                    .and_then(|v| v.as_str())
                    .map(String::from),
            }
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_domain_from_https() {
        assert_eq!(extract_domain("https://example.com/page"), "example.com");
    }

    #[test]
    fn extract_domain_from_http() {
        assert_eq!(extract_domain("http://www.test.org/path"), "www.test.org");
    }

    #[test]
    fn extract_domain_no_protocol() {
        assert_eq!(extract_domain("example.com/page"), "example.com");
    }

    #[test]
    fn normalize_bing_empty_json() {
        let json = serde_json::json!({});
        let results = normalize_bing_v7(&json);
        assert!(results.is_empty());
    }

    #[test]
    fn normalize_bing_valid_response() {
        let json = serde_json::json!({
            "webPages": {
                "value": [
                    {
                        "name": "Test Page",
                        "url": "https://example.com/test",
                        "snippet": "A test snippet",
                        "displayUrl": "example.com/test",
                        "dateLastCrawled": "2025-01-01T00:00:00Z"
                    },
                    {
                        "name": "Another Page",
                        "url": "https://other.com/page",
                        "snippet": "Another snippet"
                    }
                ]
            }
        });
        let results = normalize_bing_v7(&json);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].title, "Test Page");
        assert_eq!(results[0].source, "example.com");
        assert_eq!(results[0].date, Some("2025-01-01T00:00:00Z".to_string()));
        assert_eq!(results[1].title, "Another Page");
        assert_eq!(results[1].source, "other.com");
        assert_eq!(results[1].date, None);
    }

    #[test]
    fn retry_config_defaults() {
        let cfg = RetryConfig::default();
        assert_eq!(cfg.max_attempts, 4);
        assert_eq!(cfg.initial_delay_ms, 500);
        assert_eq!(cfg.backoff_factor, 2.0);
    }

    #[test]
    fn rate_limiter_creation() {
        let rl = RateLimiter::new(3, 500);
        assert_eq!(rl.min_interval_ms, 500);
    }

    #[test]
    fn search_response_serializes() {
        let resp = SearchResponse {
            success: true,
            error: None,
            api_id: "test".into(),
            results: vec![SearchResult {
                title: "T".into(),
                url: "https://t.com".into(),
                snippet: "S".into(),
                display_url: "t.com".into(),
                source: "t.com".into(),
                date: None,
            }],
            latency_ms: 42,
            query: "q".into(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"latency_ms\":42"));
    }
}
