use crate::persistence::crypto::EncryptionKey;

const SERVICE_NAME: &str = "tokki-desktop";
const ACCOUNT_NAME: &str = "memory-encryption-key";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyCreationPolicy {
    AllowGenerate,
    RequireExisting,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum KeyLifecycleError {
    MissingKeyForProtectedData,
    CorruptedKeyForProtectedData(String),
    KeyringUnavailable(String),
    KeyGenerationFailed(String),
    KeyringStoreFailed(String),
}

impl std::fmt::Display for KeyLifecycleError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MissingKeyForProtectedData => write!(
                f,
                "encryption key is missing while protected memory exists; refusing automatic key generation"
            ),
            Self::CorruptedKeyForProtectedData(reason) => write!(
                f,
                "stored encryption key is corrupted while protected memory exists ({reason}); refusing automatic key rotation"
            ),
            Self::KeyringUnavailable(reason) => {
                write!(f, "secure credential store unavailable: {reason}")
            }
            Self::KeyGenerationFailed(reason) => write!(f, "failed to generate encryption key: {reason}"),
            Self::KeyringStoreFailed(reason) => write!(f, "failed to store encryption key: {reason}"),
        }
    }
}

/// Retrieve the encryption key from the OS credential store.
/// Depending on `policy`, this may generate and store a new key when none exists.
pub fn get_or_create_key(policy: KeyCreationPolicy) -> Result<EncryptionKey, KeyLifecycleError> {
    let backend = KeyringBackend;
    get_or_create_key_with_backend(&backend, policy)
}

trait SecretBackend {
    fn load_secret(&self) -> Result<Option<Vec<u8>>, String>;
    fn store_secret(&self, secret: &[u8]) -> Result<(), String>;
}

struct KeyringBackend;

impl SecretBackend for KeyringBackend {
    fn load_secret(&self) -> Result<Option<Vec<u8>>, String> {
        let entry = keyring::Entry::new(SERVICE_NAME, ACCOUNT_NAME)
            .map_err(|e| format!("keyring entry error: {e}"))?;
        match entry.get_secret() {
            Ok(secret) => Ok(Some(secret)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(format!("keyring load error: {error}")),
        }
    }

    fn store_secret(&self, secret: &[u8]) -> Result<(), String> {
        let entry = keyring::Entry::new(SERVICE_NAME, ACCOUNT_NAME)
            .map_err(|e| format!("keyring entry error: {e}"))?;
        entry
            .set_secret(secret)
            .map_err(|e| format!("keyring store error: {e}"))
    }
}

fn get_or_create_key_with_backend(
    backend: &dyn SecretBackend,
    policy: KeyCreationPolicy,
) -> Result<EncryptionKey, KeyLifecycleError> {
    match backend.load_secret() {
        Ok(Some(secret)) => match EncryptionKey::from_bytes(&secret) {
            Ok(key) => Ok(key),
            Err(error) => match policy {
                KeyCreationPolicy::AllowGenerate => generate_and_store_key(backend),
                KeyCreationPolicy::RequireExisting => {
                    Err(KeyLifecycleError::CorruptedKeyForProtectedData(error))
                }
            },
        },
        Ok(None) => match policy {
            KeyCreationPolicy::AllowGenerate => generate_and_store_key(backend),
            KeyCreationPolicy::RequireExisting => {
                Err(KeyLifecycleError::MissingKeyForProtectedData)
            }
        },
        Err(error) => Err(KeyLifecycleError::KeyringUnavailable(error)),
    }
}

fn generate_and_store_key(backend: &dyn SecretBackend) -> Result<EncryptionKey, KeyLifecycleError> {
    let key = EncryptionKey::generate().map_err(KeyLifecycleError::KeyGenerationFailed)?;
    backend
        .store_secret(key.as_bytes())
        .map_err(KeyLifecycleError::KeyringStoreFailed)?;
    Ok(key)
}

// Note: keyring tests are skipped in CI because they need OS credential store access.
// They work when run locally on Windows.
#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    #[derive(Default)]
    struct FakeBackend {
        secret: RefCell<Option<Vec<u8>>>,
        load_error: RefCell<Option<String>>,
        store_error: RefCell<Option<String>>,
    }

    impl FakeBackend {
        fn with_secret(secret: Vec<u8>) -> Self {
            Self {
                secret: RefCell::new(Some(secret)),
                ..Self::default()
            }
        }
    }

    impl SecretBackend for FakeBackend {
        fn load_secret(&self) -> Result<Option<Vec<u8>>, String> {
            if let Some(error) = self.load_error.borrow().clone() {
                return Err(error);
            }
            Ok(self.secret.borrow().clone())
        }

        fn store_secret(&self, secret: &[u8]) -> Result<(), String> {
            if let Some(error) = self.store_error.borrow().clone() {
                return Err(error);
            }
            self.secret.replace(Some(secret.to_vec()));
            Ok(())
        }
    }

    #[test]
    fn constants_are_set() {
        assert!(!SERVICE_NAME.is_empty());
        assert!(!ACCOUNT_NAME.is_empty());
    }

    #[test]
    fn existing_key_is_loaded() {
        let backend = FakeBackend::with_secret(vec![9u8; 32]);
        let key = get_or_create_key_with_backend(&backend, KeyCreationPolicy::RequireExisting)
            .expect("should load existing key");
        assert_eq!(key.as_bytes(), &[9u8; 32]);
    }

    #[test]
    fn missing_key_creates_new_key_when_allowed() {
        let backend = FakeBackend::default();
        let key = get_or_create_key_with_backend(&backend, KeyCreationPolicy::AllowGenerate)
            .expect("should create key");
        let stored = backend
            .secret
            .borrow()
            .clone()
            .expect("generated key should be stored");
        assert_eq!(stored.as_slice(), key.as_bytes());
    }

    #[test]
    fn missing_key_for_protected_data_is_error() {
        let backend = FakeBackend::default();
        let error = get_or_create_key_with_backend(&backend, KeyCreationPolicy::RequireExisting);
        assert!(matches!(
            error,
            Err(KeyLifecycleError::MissingKeyForProtectedData)
        ));
    }

    #[test]
    fn corrupted_key_rotates_when_allowed() {
        let backend = FakeBackend::with_secret(vec![1u8; 7]);
        let key = get_or_create_key_with_backend(&backend, KeyCreationPolicy::AllowGenerate)
            .expect("should rotate corrupted key");
        let stored = backend
            .secret
            .borrow()
            .clone()
            .expect("rotated key should be stored");
        assert_eq!(stored.len(), 32);
        assert_eq!(stored.as_slice(), key.as_bytes());
    }

    #[test]
    fn corrupted_key_for_protected_data_is_error() {
        let backend = FakeBackend::with_secret(vec![1u8; 7]);
        let error = get_or_create_key_with_backend(&backend, KeyCreationPolicy::RequireExisting);
        assert!(matches!(
            error,
            Err(KeyLifecycleError::CorruptedKeyForProtectedData(_))
        ));
    }

    #[test]
    fn load_failure_is_explicit_error() {
        let backend = FakeBackend::default();
        backend
            .load_error
            .replace(Some("credential store locked".to_string()));
        let error = get_or_create_key_with_backend(&backend, KeyCreationPolicy::AllowGenerate);
        assert!(matches!(
            error,
            Err(KeyLifecycleError::KeyringUnavailable(_))
        ));
    }

    #[test]
    fn store_failure_is_explicit_error() {
        let backend = FakeBackend::default();
        backend
            .store_error
            .replace(Some("access denied".to_string()));
        let error = get_or_create_key_with_backend(&backend, KeyCreationPolicy::AllowGenerate);
        assert!(matches!(
            error,
            Err(KeyLifecycleError::KeyringStoreFailed(_))
        ));
    }
}
