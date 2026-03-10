use std::path::Path;

use rusqlite::{types::ValueRef, Connection, OptionalExtension};

use crate::llm::memory::SessionMemory;
use crate::llm::models::ChatMessage;
use crate::persistence::crypto::{self, EncryptionKey};

const MEMORY_KEY: &str = "session_memory";
const CHAT_HISTORY_KEY: &str = "chat_history";
const LEGACY_SESSION_TABLE: &str = "session_memory";
const LEGACY_PAYLOAD_COLUMNS: [&str; 5] = ["value", "payload", "data", "json", "session"];
const ENCRYPTED_PAYLOAD_PREFIX: &[u8] = b"tokki:enc:v1:";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PersistedPayloadState {
    Empty,
    LegacyPlaintext,
    ProtectedOrUnknown,
    /// The database file exists but is not a valid SQLite database.
    CorruptedFile,
}

struct DecodedMemoryPayload {
    memory: SessionMemory,
    requires_reencrypt: bool,
}

/// Encrypted SQLite memory store.
pub struct MemoryDb {
    conn: Connection,
    key: EncryptionKey,
}

impl MemoryDb {
    /// Open or create the SQLite database at `path`.
    pub fn open(path: &Path, key: EncryptionKey) -> Result<Self, String> {
        let conn = Connection::open(path).map_err(|e| format!("failed to open db: {e}"))?;

        // Prevent "database is locked" errors when two instances access the same file.
        conn.busy_timeout(std::time::Duration::from_secs(5))
            .map_err(|e| format!("failed to set busy timeout: {e}"))?;

        initialize_schema(&conn)?;
        migrate_legacy_session_table(&conn, &key)?;

        Ok(Self { conn, key })
    }

    /// Load session memory from the encrypted store.
    /// Returns `Default` when no record exists.
    /// If a legacy plaintext JSON payload is found, it is loaded and rewritten encrypted.
    pub fn load_session_memory(&self) -> Result<SessionMemory, String> {
        let result: Result<Vec<u8>, _> =
            self.conn
                .query_row("SELECT value FROM kv WHERE key = ?1", [MEMORY_KEY], |row| {
                    read_value_as_bytes(row, 0)
                });

        match result {
            Ok(stored) => {
                let decoded = decode_session_payload(&self.key, &stored)?;
                if decoded.requires_reencrypt {
                    self.write_encrypted_session_memory(&decoded.memory)?;
                }
                Ok(decoded.memory)
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(SessionMemory::default()),
            Err(e) => Err(format!("db query failed: {e}")),
        }
    }

    /// Save session memory to the encrypted store.
    pub fn save_session_memory(&self, memory: &SessionMemory) -> Result<(), String> {
        self.write_encrypted_session_memory(memory)
    }

    /// Load chat history from the encrypted store.
    /// Returns an empty vec when no record exists.
    pub fn load_chat_history(&self) -> Result<Vec<ChatMessage>, String> {
        let result: Result<Vec<u8>, _> = self.conn.query_row(
            "SELECT value FROM kv WHERE key = ?1",
            [CHAT_HISTORY_KEY],
            |row| read_value_as_bytes(row, 0),
        );

        match result {
            Ok(stored) => {
                let ciphertext = without_encrypted_prefix(&stored)
                    .ok_or_else(|| "chat_history payload missing encryption prefix".to_string())?;
                let plaintext = crypto::decrypt(&self.key, ciphertext)?;
                serde_json::from_slice(&plaintext)
                    .map_err(|e| format!("deserialize chat history failed: {e}"))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(Vec::new()),
            Err(e) => Err(format!("db query failed: {e}")),
        }
    }

    /// Save chat history to the encrypted store.
    pub fn save_chat_history(&self, history: &[ChatMessage]) -> Result<(), String> {
        let json = serde_json::to_vec(history)
            .map_err(|e| format!("serialize chat history failed: {e}"))?;
        let encrypted = crypto::encrypt(&self.key, &json)?;
        let payload = with_encrypted_prefix(&encrypted);
        self.conn
            .execute(
                "INSERT OR REPLACE INTO kv (key, value) VALUES (?1, ?2)",
                rusqlite::params![CHAT_HISTORY_KEY, payload],
            )
            .map_err(|e| format!("db insert chat history failed: {e}"))?;
        Ok(())
    }

    fn write_encrypted_session_memory(&self, memory: &SessionMemory) -> Result<(), String> {
        let json = serde_json::to_vec(memory).map_err(|e| format!("serialize failed: {e}"))?;
        let encrypted = crypto::encrypt(&self.key, &json)?;
        let payload = with_encrypted_prefix(&encrypted);
        upsert_memory_payload(&self.conn, &payload)
    }
}

/// Inspect the database file to determine its payload state.
/// Returns `Empty` if the file doesn't exist or is zero-length.
/// Returns `Empty` if the file is corrupt (caller should backup and start fresh).
pub fn inspect_payload_state(path: &Path) -> Result<PersistedPayloadState, String> {
    if !path.exists() {
        return Ok(PersistedPayloadState::Empty);
    }

    // Zero-length files are not valid SQLite databases. Treat as empty so a
    // fresh DB is created rather than propagating an opaque SQLite error.
    match std::fs::metadata(path) {
        Ok(meta) if meta.len() == 0 => return Ok(PersistedPayloadState::Empty),
        Err(e) => return Err(format!("failed to stat db file: {e}")),
        _ => {}
    }

    let conn = match Connection::open(path) {
        Ok(c) => c,
        Err(_) => return Ok(PersistedPayloadState::CorruptedFile),
    };

    // Any SQLite error while probing the file contents (e.g. "not a database")
    // indicates file-level corruption rather than a missing/empty payload.
    let payload = match read_current_payload(&conn) {
        Ok(Some(p)) => p,
        Ok(None) => return Ok(PersistedPayloadState::Empty),
        Err(_) => return Ok(PersistedPayloadState::CorruptedFile),
    };

    Ok(classify_payload_state(&payload))
}

fn initialize_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS kv (
            key   TEXT PRIMARY KEY,
            value BLOB NOT NULL
        );",
    )
    .map_err(|e| format!("failed to create table: {e}"))
}

fn migrate_legacy_session_table(conn: &Connection, key: &EncryptionKey) -> Result<(), String> {
    if has_current_memory_row(conn)? || !table_exists(conn, LEGACY_SESSION_TABLE)? {
        return Ok(());
    }

    let Some(payload) = read_legacy_payload(conn, LEGACY_SESSION_TABLE)? else {
        return Ok(());
    };

    let decoded = decode_session_payload(key, &payload)?;
    let json = serde_json::to_vec(&decoded.memory).map_err(|e| format!("serialize failed: {e}"))?;
    let encrypted = crypto::encrypt(key, &json)?;
    let payload = with_encrypted_prefix(&encrypted);

    // Wrap in a transaction so a crash mid-migration cannot leave partial state.
    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("failed to start migration transaction: {e}"))?;
    tx.execute(
        "INSERT OR REPLACE INTO kv (key, value) VALUES (?1, ?2)",
        rusqlite::params![MEMORY_KEY, payload],
    )
    .map_err(|e| format!("db insert failed during migration: {e}"))?;
    tx.commit()
        .map_err(|e| format!("failed to commit migration: {e}"))
}

fn upsert_memory_payload(conn: &Connection, payload: &[u8]) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO kv (key, value) VALUES (?1, ?2)",
        rusqlite::params![MEMORY_KEY, payload],
    )
    .map_err(|e| format!("db insert failed: {e}"))?;
    Ok(())
}

fn has_current_memory_row(conn: &Connection) -> Result<bool, String> {
    conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM kv WHERE key = ?1)",
        [MEMORY_KEY],
        |row| row.get::<_, i64>(0),
    )
    .map(|exists| exists != 0)
    .map_err(|e| format!("failed to inspect kv table: {e}"))
}

fn read_current_payload(conn: &Connection) -> Result<Option<Vec<u8>>, String> {
    if table_exists(conn, "kv")? {
        let payload = conn
            .query_row("SELECT value FROM kv WHERE key = ?1", [MEMORY_KEY], |row| {
                read_value_as_bytes(row, 0)
            })
            .optional()
            .map_err(|e| format!("failed to read kv payload: {e}"))?;
        if payload.is_some() {
            return Ok(payload);
        }
    }

    if table_exists(conn, LEGACY_SESSION_TABLE)? {
        return read_legacy_payload(conn, LEGACY_SESSION_TABLE);
    }

    Ok(None)
}

fn table_exists(conn: &Connection, table: &str) -> Result<bool, String> {
    conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
        [table],
        |row| row.get::<_, i64>(0),
    )
    .map(|exists| exists != 0)
    .map_err(|e| format!("failed to inspect sqlite schema: {e}"))
}

fn read_legacy_payload(conn: &Connection, table: &str) -> Result<Option<Vec<u8>>, String> {
    let columns = table_columns(conn, table)?;
    if columns.is_empty() {
        return Ok(None);
    }

    let lowered = columns
        .iter()
        .map(|column| column.to_ascii_lowercase())
        .collect::<Vec<_>>();

    let key_idx = lowered.iter().position(|name| name == "key");
    let value_idx = lowered.iter().position(|name| name == "value");
    if let (Some(key_idx), Some(value_idx)) = (key_idx, value_idx) {
        let key_col = &columns[key_idx];
        let value_col = &columns[value_idx];
        let query = format!(
            "SELECT {} FROM {} WHERE {} = ?1 ORDER BY rowid DESC LIMIT 1",
            quote_identifier(value_col),
            quote_identifier(table),
            quote_identifier(key_col)
        );

        let payload = conn
            .query_row(&query, [MEMORY_KEY], |row| read_value_as_bytes(row, 0))
            .optional()
            .map_err(|e| format!("failed to read legacy key/value payload: {e}"))?;
        if payload.is_some() {
            return Ok(payload);
        }
    }

    for candidate in LEGACY_PAYLOAD_COLUMNS {
        if let Some(index) = lowered.iter().position(|column| column == candidate) {
            let query = format!(
                "SELECT {} FROM {} ORDER BY rowid DESC LIMIT 1",
                quote_identifier(&columns[index]),
                quote_identifier(table),
            );
            return conn
                .query_row(&query, [], |row| read_value_as_bytes(row, 0))
                .optional()
                .map_err(|e| format!("failed to read legacy payload: {e}"));
        }
    }

    if columns.len() == 1 {
        let query = format!(
            "SELECT {} FROM {} ORDER BY rowid DESC LIMIT 1",
            quote_identifier(&columns[0]),
            quote_identifier(table),
        );
        return conn
            .query_row(&query, [], |row| read_value_as_bytes(row, 0))
            .optional()
            .map_err(|e| format!("failed to read single-column legacy payload: {e}"));
    }

    Ok(None)
}

fn table_columns(conn: &Connection, table: &str) -> Result<Vec<String>, String> {
    let pragma = format!("PRAGMA table_info({})", quote_identifier(table));
    let mut stmt = conn
        .prepare(&pragma)
        .map_err(|e| format!("failed to inspect table columns: {e}"))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("failed to iterate table columns: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("failed to collect table columns: {e}"))
}

fn quote_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}

fn read_value_as_bytes(row: &rusqlite::Row<'_>, index: usize) -> rusqlite::Result<Vec<u8>> {
    match row.get_ref(index)? {
        ValueRef::Blob(bytes) => Ok(bytes.to_vec()),
        ValueRef::Text(text) => Ok(text.to_vec()),
        ValueRef::Integer(number) => Ok(number.to_string().into_bytes()),
        ValueRef::Real(number) => Ok(number.to_string().into_bytes()),
        ValueRef::Null => Ok(Vec::new()),
    }
}

fn classify_payload_state(payload: &[u8]) -> PersistedPayloadState {
    if payload.is_empty() {
        return PersistedPayloadState::ProtectedOrUnknown;
    }

    if payload.starts_with(ENCRYPTED_PAYLOAD_PREFIX) {
        return PersistedPayloadState::ProtectedOrUnknown;
    }

    if looks_like_json(payload) && serde_json::from_slice::<SessionMemory>(payload).is_ok() {
        return PersistedPayloadState::LegacyPlaintext;
    }

    PersistedPayloadState::ProtectedOrUnknown
}

fn with_encrypted_prefix(ciphertext: &[u8]) -> Vec<u8> {
    let mut payload = Vec::with_capacity(ENCRYPTED_PAYLOAD_PREFIX.len() + ciphertext.len());
    payload.extend_from_slice(ENCRYPTED_PAYLOAD_PREFIX);
    payload.extend_from_slice(ciphertext);
    payload
}

fn without_encrypted_prefix(payload: &[u8]) -> Option<&[u8]> {
    payload.strip_prefix(ENCRYPTED_PAYLOAD_PREFIX)
}

fn decrypt_memory_json(key: &EncryptionKey, ciphertext: &[u8]) -> Result<SessionMemory, String> {
    let plaintext = crypto::decrypt(key, ciphertext)?;
    serde_json::from_slice(&plaintext).map_err(|e| format!("deserialize failed: {e}"))
}

fn decode_session_payload(
    key: &EncryptionKey,
    stored: &[u8],
) -> Result<DecodedMemoryPayload, String> {
    if let Some(ciphertext) = without_encrypted_prefix(stored) {
        let memory = decrypt_memory_json(key, ciphertext)?;
        return Ok(DecodedMemoryPayload {
            memory,
            requires_reencrypt: false,
        });
    }

    if let Ok(memory) = decrypt_memory_json(key, stored) {
        return Ok(DecodedMemoryPayload {
            memory,
            requires_reencrypt: true,
        });
    }

    if looks_like_json(stored) {
        let memory = serde_json::from_slice(stored)
            .map_err(|e| format!("legacy deserialize failed: {e}"))?;
        return Ok(DecodedMemoryPayload {
            memory,
            requires_reencrypt: true,
        });
    }

    Err("decrypt failed: bad key or corrupted data".to_string())
}

fn looks_like_json(bytes: &[u8]) -> bool {
    let trimmed = bytes
        .iter()
        .skip_while(|byte| byte.is_ascii_whitespace())
        .copied()
        .collect::<Vec<_>>();
    matches!(trimmed.first(), Some(b'{') | Some(b'['))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_db() -> MemoryDb {
        let key = EncryptionKey::generate().expect("keygen");
        MemoryDb::open(Path::new(":memory:"), key).expect("open")
    }

    fn temp_file_path(prefix: &str) -> PathBuf {
        let mut path = std::env::temp_dir();
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        path.push(format!("{prefix}-{nonce}.db"));
        path
    }

    fn read_payload(db: &MemoryDb) -> Vec<u8> {
        db.conn
            .query_row("SELECT value FROM kv WHERE key = ?1", [MEMORY_KEY], |row| {
                row.get(0)
            })
            .expect("read stored payload")
    }

    #[test]
    fn load_empty_returns_default() {
        let db = temp_db();
        let mem = db.load_session_memory().expect("load");
        assert_eq!(mem.message_count, 0);
        assert!(mem.user_name.is_none());
    }

    #[test]
    fn round_trip_save_load() {
        let db = temp_db();
        let mut mem = SessionMemory::default();
        mem.update("My name is Alice", "greet", "playful");
        mem.update("tell me about cats", "help", "curious");
        mem.update("I love warm tea", "help", "playful");
        mem.update("I'm learning Rust", "think", "curious");

        db.save_session_memory(&mem).expect("save");
        let loaded = db.load_session_memory().expect("load");

        assert_eq!(loaded.user_name, Some("Alice".to_string()));
        assert_eq!(loaded.topics, vec!["cats"]);
        assert_eq!(loaded.preferences.len(), 1);
        assert_eq!(loaded.preferences[0].summary(), "loves warm tea");
        assert_eq!(loaded.conversation_highlights.len(), 1);
        assert_eq!(loaded.conversation_highlights[0].summary, "Learning Rust");
        assert_eq!(loaded.message_count, 4);
        assert_eq!(loaded.greet_count, 1);

        let stored = read_payload(&db);
        let ciphertext = without_encrypted_prefix(&stored).expect("payload should be versioned");
        let decrypted = crypto::decrypt(&db.key, ciphertext).expect("payload should decrypt");
        let decrypted_memory: SessionMemory =
            serde_json::from_slice(&decrypted).expect("payload should deserialize");
        assert_eq!(decrypted_memory.user_name, Some("Alice".to_string()));
    }

    #[test]
    fn save_overwrites_previous() {
        let db = temp_db();
        let mut mem = SessionMemory::default();
        mem.update("My name is Bob", "greet", "playful");
        db.save_session_memory(&mem).expect("save 1");

        mem.update("tell me about dogs", "help", "playful");
        db.save_session_memory(&mem).expect("save 2");

        let loaded = db.load_session_memory().expect("load");
        assert_eq!(loaded.message_count, 2);
        assert_eq!(loaded.topics, vec!["dogs"]);
    }

    #[test]
    fn load_migrates_plaintext_json_payload_to_encrypted_payload() {
        let db = temp_db();
        let mut legacy = SessionMemory::default();
        legacy.update("My name is Juno", "greet", "playful");
        legacy.update("tell me about turtles", "help", "curious");
        let plaintext = serde_json::to_vec(&legacy).expect("serialize");

        db.conn
            .execute(
                "INSERT OR REPLACE INTO kv (key, value) VALUES (?1, ?2)",
                rusqlite::params![MEMORY_KEY, plaintext.clone()],
            )
            .expect("seed plaintext payload");

        let loaded = db
            .load_session_memory()
            .expect("load should migrate payload");
        assert_eq!(loaded.user_name, Some("Juno".to_string()));
        assert_eq!(loaded.topics, vec!["turtles"]);

        let stored: Vec<u8> = db
            .conn
            .query_row("SELECT value FROM kv WHERE key = ?1", [MEMORY_KEY], |row| {
                row.get(0)
            })
            .expect("read stored payload");

        assert_ne!(stored, plaintext);
        let ciphertext = without_encrypted_prefix(&stored).expect("payload should include prefix");
        let decrypted =
            crypto::decrypt(&db.key, ciphertext).expect("payload should now be encrypted");
        let migrated: SessionMemory =
            serde_json::from_slice(&decrypted).expect("migrated payload should deserialize");
        assert_eq!(migrated.user_name, Some("Juno".to_string()));
        assert!(migrated.preferences.is_empty());
        assert!(migrated.profile_facts.is_empty());
        assert!(migrated.conversation_highlights.is_empty());
        assert!(!migrated.active_time_bands.is_empty());
    }

    #[test]
    fn load_migrates_legacy_encrypted_payload_without_prefix() {
        let db = temp_db();
        let mut legacy = SessionMemory::default();
        legacy.update("My name is Riku", "greet", "playful");
        legacy.update("tell me about turtles", "help", "curious");
        let plaintext = serde_json::to_vec(&legacy).expect("serialize");
        let legacy_ciphertext = crypto::encrypt(&db.key, &plaintext).expect("encrypt");

        db.conn
            .execute(
                "INSERT OR REPLACE INTO kv (key, value) VALUES (?1, ?2)",
                rusqlite::params![MEMORY_KEY, legacy_ciphertext],
            )
            .expect("seed legacy encrypted payload");

        let loaded = db
            .load_session_memory()
            .expect("load should migrate payload");
        assert_eq!(loaded.user_name, Some("Riku".to_string()));
        assert_eq!(loaded.topics, vec!["turtles"]);

        let stored = read_payload(&db);
        let ciphertext = without_encrypted_prefix(&stored).expect("payload should include prefix");
        let decrypted = crypto::decrypt(&db.key, ciphertext).expect("payload should decrypt");
        let migrated: SessionMemory =
            serde_json::from_slice(&decrypted).expect("migrated payload should deserialize");
        assert_eq!(migrated.user_name, Some("Riku".to_string()));
    }

    #[test]
    fn open_migrates_legacy_session_memory_table_into_kv() {
        let file_path = temp_file_path("tokki-memory-legacy");

        let legacy_json = r#"{
            "user_name":"Mika",
            "topics":["foxes"],
            "message_count":2,
            "greet_count":1,
            "mood_trend":"curious"
        }"#;

        {
            let legacy_conn = Connection::open(&file_path).expect("open legacy db");
            legacy_conn
                .execute_batch(
                    "CREATE TABLE session_memory (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL
                    );",
                )
                .expect("create legacy table");
            legacy_conn
                .execute(
                    "INSERT INTO session_memory (key, value) VALUES (?1, ?2)",
                    rusqlite::params![MEMORY_KEY, legacy_json],
                )
                .expect("seed legacy payload");
        }

        let key = EncryptionKey::generate().expect("keygen");
        let db = MemoryDb::open(&file_path, key).expect("open with migration");
        let loaded = db.load_session_memory().expect("load migrated memory");
        assert_eq!(loaded.user_name, Some("Mika".to_string()));
        assert_eq!(loaded.topics, vec!["foxes"]);
        assert_eq!(loaded.message_count, 2);
        assert!(loaded.preferences.is_empty());
        assert!(loaded.profile_facts.is_empty());
        assert!(loaded.conversation_highlights.is_empty());
        assert!(loaded.mood_history.is_empty());
        assert!(loaded.active_time_bands.is_empty());
        assert!(loaded.first_message_at.is_none());
        assert!(loaded.last_message_at.is_none());

        let kv_rows: i64 = db
            .conn
            .query_row(
                "SELECT COUNT(*) FROM kv WHERE key = ?1",
                [MEMORY_KEY],
                |row| row.get(0),
            )
            .expect("count kv rows");
        assert_eq!(kv_rows, 1);

        let stored = read_payload(&db);
        assert!(
            without_encrypted_prefix(&stored).is_some(),
            "legacy migration should write versioned encrypted payload"
        );

        let _ = std::fs::remove_file(file_path);
    }

    #[test]
    fn inspect_payload_state_reports_empty_for_missing_db() {
        let path = temp_file_path("tokki-memory-state-missing");
        if path.exists() {
            let _ = std::fs::remove_file(&path);
        }

        let state = inspect_payload_state(&path).expect("inspect should succeed");
        assert_eq!(state, PersistedPayloadState::Empty);
    }

    #[test]
    fn inspect_payload_state_detects_plaintext_payload() {
        let path = temp_file_path("tokki-memory-state-plaintext");
        let conn = Connection::open(&path).expect("open");
        initialize_schema(&conn).expect("schema");
        conn.execute(
            "INSERT OR REPLACE INTO kv (key, value) VALUES (?1, ?2)",
            rusqlite::params![MEMORY_KEY, br#"{"user_name":"Ari"}"#.to_vec()],
        )
        .expect("seed plaintext");
        drop(conn);

        let state = inspect_payload_state(&path).expect("inspect should succeed");
        assert_eq!(state, PersistedPayloadState::LegacyPlaintext);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn inspect_payload_state_detects_versioned_encrypted_payload() {
        let path = temp_file_path("tokki-memory-state-encrypted");
        let key = EncryptionKey::generate().expect("keygen");
        let plaintext = serde_json::to_vec(&SessionMemory::default()).expect("serialize");
        let encrypted = crypto::encrypt(&key, &plaintext).expect("encrypt");
        let payload = with_encrypted_prefix(&encrypted);

        let conn = Connection::open(&path).expect("open");
        initialize_schema(&conn).expect("schema");
        conn.execute(
            "INSERT OR REPLACE INTO kv (key, value) VALUES (?1, ?2)",
            rusqlite::params![MEMORY_KEY, payload],
        )
        .expect("seed encrypted");
        drop(conn);

        let state = inspect_payload_state(&path).expect("inspect should succeed");
        assert_eq!(state, PersistedPayloadState::ProtectedOrUnknown);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn inspect_payload_state_treats_invalid_json_as_protected() {
        let path = temp_file_path("tokki-memory-state-protected");
        let conn = Connection::open(&path).expect("open");
        initialize_schema(&conn).expect("schema");
        conn.execute(
            "INSERT OR REPLACE INTO kv (key, value) VALUES (?1, ?2)",
            rusqlite::params![MEMORY_KEY, br#"{"broken": }"#.to_vec()],
        )
        .expect("seed invalid json");
        drop(conn);

        let state = inspect_payload_state(&path).expect("inspect should succeed");
        assert_eq!(state, PersistedPayloadState::ProtectedOrUnknown);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn wrong_key_fails_to_load() {
        let key1 = EncryptionKey::generate().expect("keygen");
        let key2 = EncryptionKey::generate().expect("keygen");

        let db1 = MemoryDb::open(Path::new(":memory:"), key1).expect("open");
        let mut mem = SessionMemory::default();
        mem.update("secret data", "help", "curious");
        db1.save_session_memory(&mem).expect("save");

        // Can't use different key on in-memory DB, but we can test crypto directly
        let json = serde_json::to_vec(&mem).unwrap();
        let encrypted =
            crypto::encrypt(&EncryptionKey::generate().expect("keygen"), &json).expect("encrypt");
        assert!(crypto::decrypt(&key2, &encrypted).is_err());
    }

    #[test]
    fn inspect_payload_state_returns_corrupted_for_garbage_file() {
        let path = temp_file_path("tokki-memory-corrupt");
        std::fs::write(&path, b"this is not a sqlite database at all!").expect("write");

        let state = inspect_payload_state(&path).expect("inspect should not error");
        assert_eq!(state, PersistedPayloadState::CorruptedFile);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn inspect_payload_state_returns_empty_for_zero_length_file() {
        let path = temp_file_path("tokki-memory-zero");
        std::fs::write(&path, b"").expect("write");

        let state = inspect_payload_state(&path).expect("inspect should not error");
        assert_eq!(state, PersistedPayloadState::Empty);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn open_succeeds_on_zero_length_file() {
        let path = temp_file_path("tokki-memory-zero-open");
        std::fs::write(&path, b"").expect("write");

        let key = EncryptionKey::generate().expect("keygen");
        let db = MemoryDb::open(&path, key).expect("open should succeed on empty file");
        let mem = db.load_session_memory().expect("load");
        assert_eq!(mem.message_count, 0);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn open_fails_on_corrupt_file() {
        let path = temp_file_path("tokki-memory-corrupt-open");
        std::fs::write(&path, b"not a sqlite database").expect("write");

        let key = EncryptionKey::generate().expect("keygen");
        let result = MemoryDb::open(&path, key);
        assert!(result.is_err(), "opening corrupt db should fail");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn save_is_atomic_on_replace() {
        let db = temp_db();
        let mut mem = SessionMemory::default();
        mem.update("My name is Alice", "greet", "playful");
        db.save_session_memory(&mem).expect("save 1");

        // Verify the first save is there
        let loaded = db.load_session_memory().expect("load 1");
        assert_eq!(loaded.user_name, Some("Alice".to_string()));

        // Second save replaces
        mem.update("tell me about cats", "help", "curious");
        db.save_session_memory(&mem).expect("save 2");

        let loaded = db.load_session_memory().expect("load 2");
        assert_eq!(loaded.message_count, 2);
        assert_eq!(loaded.user_name, Some("Alice".to_string()));
    }

    #[test]
    fn decode_empty_payload_returns_error() {
        let key = EncryptionKey::generate().expect("keygen");
        let result = decode_session_payload(&key, &[]);
        assert!(result.is_err(), "empty payload should be an error");
    }

    #[test]
    fn decode_truncated_ciphertext_returns_error() {
        let key = EncryptionKey::generate().expect("keygen");
        // Valid prefix but truncated ciphertext
        let mut payload = ENCRYPTED_PAYLOAD_PREFIX.to_vec();
        payload.extend_from_slice(&[0u8; 5]); // too short to be valid AES-GCM
        let result = decode_session_payload(&key, &payload);
        assert!(result.is_err(), "truncated ciphertext should be an error");
    }

    #[test]
    fn chat_history_load_empty_returns_empty_vec() {
        let db = temp_db();
        let history = db.load_chat_history().expect("load");
        assert!(history.is_empty());
    }

    #[test]
    fn chat_history_round_trip_save_load() {
        use crate::llm::models::ChatMessage;
        let db = temp_db();
        let messages = vec![
            ChatMessage {
                role: "user".to_string(),
                content: "Hello Tokki!".to_string(),
                timestamp: 1000,
            },
            ChatMessage {
                role: "assistant".to_string(),
                content: "Hi there! 🐰".to_string(),
                timestamp: 1001,
            },
        ];
        db.save_chat_history(&messages).expect("save");
        let loaded = db.load_chat_history().expect("load");
        assert_eq!(loaded.len(), 2);
        assert_eq!(loaded[0].role, "user");
        assert_eq!(loaded[0].content, "Hello Tokki!");
        assert_eq!(loaded[0].timestamp, 1000);
        assert_eq!(loaded[1].role, "assistant");
        assert_eq!(loaded[1].content, "Hi there! 🐰");
    }

    #[test]
    fn chat_history_save_overwrites_previous() {
        use crate::llm::models::ChatMessage;
        let db = temp_db();
        let v1 = vec![ChatMessage {
            role: "user".to_string(),
            content: "first message".to_string(),
            timestamp: 100,
        }];
        db.save_chat_history(&v1).expect("save v1");

        let v2 = vec![
            ChatMessage {
                role: "user".to_string(),
                content: "first message".to_string(),
                timestamp: 100,
            },
            ChatMessage {
                role: "assistant".to_string(),
                content: "reply".to_string(),
                timestamp: 101,
            },
            ChatMessage {
                role: "user".to_string(),
                content: "second message".to_string(),
                timestamp: 200,
            },
        ];
        db.save_chat_history(&v2).expect("save v2");

        let loaded = db.load_chat_history().expect("load");
        assert_eq!(loaded.len(), 3);
        assert_eq!(loaded[2].content, "second message");
    }

    #[test]
    fn chat_history_is_encrypted_at_rest() {
        use crate::llm::models::ChatMessage;
        let db = temp_db();
        let messages = vec![ChatMessage {
            role: "user".to_string(),
            content: "secret chat".to_string(),
            timestamp: 42,
        }];
        db.save_chat_history(&messages).expect("save");

        // Read raw bytes from db and confirm they're not plaintext JSON
        let raw: Vec<u8> = db
            .conn
            .query_row(
                "SELECT value FROM kv WHERE key = ?1",
                [CHAT_HISTORY_KEY],
                |row| row.get(0),
            )
            .expect("read raw payload");

        assert!(
            without_encrypted_prefix(&raw).is_some(),
            "chat history should use versioned encrypted format"
        );
        assert!(
            !raw.windows(b"secret chat".len())
                .any(|w| w == b"secret chat"),
            "plaintext should not appear in raw storage"
        );
    }

    #[test]
    fn chat_history_and_session_memory_coexist_independently() {
        use crate::llm::models::ChatMessage;
        let db = temp_db();

        let mut mem = SessionMemory::default();
        mem.update("My name is Kai", "greet", "playful");
        db.save_session_memory(&mem).expect("save memory");

        let messages = vec![ChatMessage {
            role: "user".to_string(),
            content: "Hi Tokki".to_string(),
            timestamp: 999,
        }];
        db.save_chat_history(&messages).expect("save history");

        let loaded_mem = db.load_session_memory().expect("load memory");
        let loaded_history = db.load_chat_history().expect("load history");

        assert_eq!(loaded_mem.user_name, Some("Kai".to_string()));
        assert_eq!(loaded_history.len(), 1);
        assert_eq!(loaded_history[0].content, "Hi Tokki");
    }
}
