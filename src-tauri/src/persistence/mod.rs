pub mod crypto;
pub mod db;
pub mod keystore;
pub mod portable;

use crate::llm::memory::SessionMemory;

/// High-level persistent memory API.
/// Loads on startup, saves after each chat exchange.
pub struct PersistentMemory {
    db: db::MemoryDb,
}

impl PersistentMemory {
    /// Open (or create) the memory database at `%LOCALAPPDATA%\Tokki\memory.db`.
    /// The encryption key is sourced from the Windows Credential Manager,
    /// auto-generated on first launch.
    ///
    /// If the database file is detected as corrupt, it is backed up to a
    /// timestamped `.bak` file and a fresh database is created so the app can
    /// still launch. The user can manually recover the backup later.
    pub fn open() -> Result<Self, String> {
        let data_dir = data_directory()?;
        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("failed to create data dir: {e}"))?;

        let db_path = data_dir.join("memory.db");

        // Phase 1: Inspect the payload state (tolerates corrupt files).
        let payload_state = db::inspect_payload_state(&db_path)?;

        if payload_state == db::PersistedPayloadState::CorruptedFile {
            backup_corrupt_db(&db_path)?;
            // After backup the file is gone, proceed as empty.
            return Self::open_fresh(&db_path);
        }

        // Phase 2: Resolve the encryption key.
        let key_policy = key_creation_policy(payload_state);
        let key = keystore::get_or_create_key(key_policy)
            .map_err(|error| format!("failed to resolve encryption key: {error}"))?;

        // Phase 3: Open the database (schema + migration may still hit corruption).
        match db::MemoryDb::open(&db_path, key.clone()) {
            Ok(db) => Ok(Self { db }),
            Err(first_error) if db_path.exists() => {
                backup_corrupt_db(&db_path)?;
                let db = db::MemoryDb::open(&db_path, key).map_err(|retry_error| {
                    format!("recovery failed after backup: {retry_error} (original: {first_error})")
                })?;
                Ok(Self { db })
            }
            Err(e) => Err(e),
        }
    }

    /// Load persisted session memory (returns Default if none stored).
    pub fn load(&self) -> Result<SessionMemory, String> {
        self.db.load_session_memory()
    }

    /// Save session memory to encrypted storage.
    pub fn save(&self, memory: &SessionMemory) -> Result<(), String> {
        self.db.save_session_memory(memory)
    }

    /// Load persisted chat history (returns empty vec if none stored).
    pub fn load_chat_history(&self) -> Result<Vec<crate::llm::models::ChatMessage>, String> {
        self.db.load_chat_history()
    }

    /// Save chat history to encrypted storage.
    pub fn save_chat_history(
        &self,
        history: &[crate::llm::models::ChatMessage],
    ) -> Result<(), String> {
        self.db.save_chat_history(history)
    }

    fn open_fresh(db_path: &std::path::Path) -> Result<Self, String> {
        let key = keystore::get_or_create_key(keystore::KeyCreationPolicy::AllowGenerate)
            .map_err(|error| format!("failed to resolve encryption key: {error}"))?;
        let db = db::MemoryDb::open(db_path, key)?;
        Ok(Self { db })
    }
}

#[cfg(test)]
impl PersistentMemory {
    pub(crate) fn in_memory() -> Self {
        let key = crypto::EncryptionKey::generate().expect("keygen");
        let db = db::MemoryDb::open(std::path::Path::new(":memory:"), key).expect("open");
        Self { db }
    }
}

fn data_directory() -> Result<std::path::PathBuf, String> {
    dirs::data_local_dir()
        .map(|d| d.join("Tokki"))
        .ok_or_else(|| "could not determine %LOCALAPPDATA%".to_string())
}

fn key_creation_policy(payload_state: db::PersistedPayloadState) -> keystore::KeyCreationPolicy {
    match payload_state {
        db::PersistedPayloadState::Empty | db::PersistedPayloadState::LegacyPlaintext => {
            keystore::KeyCreationPolicy::AllowGenerate
        }
        db::PersistedPayloadState::ProtectedOrUnknown => {
            keystore::KeyCreationPolicy::RequireExisting
        }
        // Should not reach here — caller backs up before calling key_creation_policy.
        db::PersistedPayloadState::CorruptedFile => keystore::KeyCreationPolicy::AllowGenerate,
    }
}

/// Rename a corrupt database file to `memory.db.<timestamp>.bak` so the user
/// can attempt manual recovery later. The original path is freed for a fresh DB.
fn backup_corrupt_db(db_path: &std::path::Path) -> Result<(), String> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let backup_name = format!(
        "{}.{timestamp}.bak",
        db_path.file_name().unwrap_or_default().to_string_lossy()
    );
    let backup_path = db_path.with_file_name(backup_name);
    std::fs::rename(db_path, &backup_path).map_err(|e| {
        format!(
            "failed to backup corrupt database to {}: {e}",
            backup_path.display()
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn data_directory_contains_tokki() {
        let dir = data_directory().expect("should resolve");
        assert!(dir.ends_with("Tokki"));
    }

    #[test]
    fn key_policy_allows_generation_when_payload_is_empty_or_plaintext() {
        assert_eq!(
            key_creation_policy(db::PersistedPayloadState::Empty),
            keystore::KeyCreationPolicy::AllowGenerate
        );
        assert_eq!(
            key_creation_policy(db::PersistedPayloadState::LegacyPlaintext),
            keystore::KeyCreationPolicy::AllowGenerate
        );
    }

    #[test]
    fn key_policy_requires_existing_key_for_protected_payloads() {
        assert_eq!(
            key_creation_policy(db::PersistedPayloadState::ProtectedOrUnknown),
            keystore::KeyCreationPolicy::RequireExisting
        );
    }

    #[test]
    fn key_policy_allows_generation_for_corrupted_file() {
        assert_eq!(
            key_creation_policy(db::PersistedPayloadState::CorruptedFile),
            keystore::KeyCreationPolicy::AllowGenerate
        );
    }

    #[test]
    fn backup_corrupt_db_renames_file() {
        let dir = std::env::temp_dir().join("tokki_test_backup");
        std::fs::create_dir_all(&dir).expect("create dir");
        let db_path = dir.join("memory.db");
        std::fs::write(&db_path, b"corrupt data").expect("write");

        backup_corrupt_db(&db_path).expect("backup should succeed");
        assert!(!db_path.exists(), "original file should be removed");

        let entries: Vec<_> = std::fs::read_dir(&dir)
            .expect("read dir")
            .filter_map(|e| e.ok())
            .collect();
        assert_eq!(entries.len(), 1);
        let backup_name = entries[0].file_name().to_string_lossy().to_string();
        assert!(backup_name.starts_with("memory.db."));
        assert!(backup_name.ends_with(".bak"));

        let content = std::fs::read(entries[0].path()).expect("read backup");
        assert_eq!(content, b"corrupt data");

        let _ = std::fs::remove_dir_all(dir);
    }
}
